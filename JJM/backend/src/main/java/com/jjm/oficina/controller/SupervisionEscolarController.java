package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.PermisosService;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.*;

/** Consulta escolar. No expone operaciones para cambiar expedientes o permisos. */
@RestController
@RequestMapping("/api/supervision-escolar")
public class SupervisionEscolarController {
    private final JdbcTemplate jdbc;
    private final UsuarioRepository usuarios;
    private final PermisosService permisos;
    private final ObjectMapper mapper;

    public SupervisionEscolarController(JdbcTemplate jdbc, UsuarioRepository usuarios,
                                       PermisosService permisos, ObjectMapper mapper) {
        this.jdbc = jdbc; this.usuarios = usuarios; this.permisos = permisos; this.mapper = mapper;
    }

    @GetMapping
    public ResponseEntity<?> listar(@RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        ResponseEntity<?> rechazo = comprobarAcceso(id);
        if (rechazo != null) return rechazo;
        List<Map<String,Object>> alumnos = jdbc.queryForList(consultaAlumnos()
                + " ORDER BY u.nombre, u.apellido_paterno, u.id_usuario").stream()
                .filter(this::esAlumno).toList();
        return ResponseEntity.ok(Map.of("estado", "correcto", "alumnos", alumnos));
    }

    @GetMapping("/alumnos/{idAlumno}")
    public ResponseEntity<?> expediente(@PathVariable Integer idAlumno,
                        @RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        ResponseEntity<?> rechazo = comprobarAcceso(id);
        if (rechazo != null) return rechazo;
        Map<String,Object> alumno = buscarAlumno(idAlumno);
        if (alumno == null) return error(HttpStatus.NOT_FOUND, "No se encontró el alumno.");
        List<Map<String,Object>> documentos = jdbc.queryForList("""
                SELECT id_documento AS id, tipo_documento AS tipoDocumento,
                       nombre_archivo AS nombreArchivo, estado, observaciones,
                       fecha_subida AS fechaSubida
                FROM documentos_usuario WHERE id_usuario=?
                ORDER BY fecha_subida DESC, id_documento DESC
                """, idAlumno);
        List<Map<String,Object>> cursos = jdbc.queryForList(
                "SELECT detalle_json AS detalleJson FROM progreso_cursos_usuario WHERE id_usuario=?", idAlumno);
        List<Map<String,Object>> certificados = cursos.isEmpty() ? List.of()
                : leerCertificados(cursos.getFirst().get("detalleJson"));
        return ResponseEntity.ok(Map.of("estado", "correcto", "alumno", alumno,
                "documentos", documentos, "certificados", certificados));
    }

    @GetMapping("/documentos/{idDocumento}")
    public ResponseEntity<?> descargar(@PathVariable Integer idDocumento,
                        @RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        ResponseEntity<?> rechazo = comprobarAcceso(id);
        if (rechazo != null) return rechazo;
        List<Map<String,Object>> filas = jdbc.queryForList("""
                SELECT id_usuario AS idUsuario, nombre_archivo AS nombreArchivo,
                       archivo_base64 AS archivoBase64
                FROM documentos_usuario WHERE id_documento=?
                """, idDocumento);
        if (filas.isEmpty()) return error(HttpStatus.NOT_FOUND, "No se encontró el documento.");
        Map<String,Object> fila = filas.getFirst();
        if (!(fila.get("idUsuario") instanceof Number usuario)
                || buscarAlumno(usuario.intValue()) == null)
            return error(HttpStatus.NOT_FOUND, "No se encontró el documento del alumno.");
        String archivo = Objects.toString(fila.get("archivoBase64"), "");
        if (archivo.startsWith("data:")) archivo = archivo.substring(archivo.indexOf(',') + 1);
        if (archivo.isBlank()) return error(HttpStatus.NOT_FOUND, "El documento no tiene un archivo disponible.");
        try {
            byte[] datos = Base64.getDecoder().decode(archivo);
            String nombre = Objects.toString(fila.get("nombreArchivo"), "documento.pdf")
                    .replaceAll("[\\r\\n]", "");
            return ResponseEntity.ok().contentType(nombre.toLowerCase(Locale.ROOT).endsWith(".pdf")
                            ? MediaType.APPLICATION_PDF : MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                            .filename(nombre, StandardCharsets.UTF_8).build().toString())
                    .header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .header("X-Content-Type-Options", "nosniff").body(datos);
        } catch (IllegalArgumentException ex) {
            return error(HttpStatus.UNPROCESSABLE_ENTITY, "El archivo guardado no se pudo leer.");
        }
    }

    private ResponseEntity<?> comprobarAcceso(Integer id) {
        Usuario usuario = id == null ? null : usuarios.findById(id).orElse(null);
        if (usuario == null) return error(HttpStatus.UNAUTHORIZED, "No se encontró una sesión activa.");
        if (!PermisosService.esDirectivoEscolar(usuario) && !permisos.esSuperadministrador(usuario)
                && !permisos.esAdministradorBase(usuario))
            return error(HttpStatus.FORBIDDEN, "Esta vista está reservada a la dirección escolar y la administración.");
        return null;
    }

    private Map<String,Object> buscarAlumno(Integer id) {
        return jdbc.queryForList(consultaAlumnos() + " WHERE u.id_usuario=?", id).stream()
                .filter(this::esAlumno).findFirst().orElse(null);
    }

    private String consultaAlumnos() {
        return """
                SELECT u.id_usuario AS idUsuario,
                       CONCAT_WS(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre,
                       u.correo, u.estado, r.nombre AS rol,
                       a.matricula, a.universidad, a.carrera, a.cuatrimestre,
                       a.periodo_estadia AS periodoEstadia, a.fecha_inicio AS fechaInicio,
                       a.fecha_fin AS fechaFin,
                       COALESCE(p.total_cursos, 26) AS totalCursos,
                       COALESCE(p.cursos_completados, 0) AS cursosCompletados,
                       COALESCE(p.porcentaje, 0) AS porcentajeCursos,
                       (SELECT COUNT(*) FROM documentos_usuario d WHERE d.id_usuario=u.id_usuario) AS totalDocumentos
                FROM usuarios u LEFT JOIN roles r ON r.id_rol=u.id_rol
                LEFT JOIN datos_academicos_usuario a ON a.id_usuario=u.id_usuario
                LEFT JOIN progreso_cursos_usuario p ON p.id_usuario=u.id_usuario
                """;
    }

    private boolean esAlumno(Map<String,Object> fila) {
        String rol = Normalizer.normalize(Objects.toString(fila.get("rol"), ""), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").trim().toLowerCase(Locale.ROOT);
        if (Set.of("superadministrador", "administrador", "admin pmo", "admin_pmo", "administrador pmo",
                "directivo escolar", "directivo", "director", "asesor academico", "asesor empresarial",
                "asesor de empresa", "cliente", "consulta", "usuario de consulta", "enlace universidad",
                "enlace de universidad", "enlace empresa", "enlace de empresa").contains(rol)) return false;
        return Set.of("colaborador", "alumno", "alumna", "estudiante", "estudiante pmo").contains(rol)
                || tieneTexto(fila.get("matricula")) || tieneTexto(fila.get("universidad"));
    }

    private boolean tieneTexto(Object valor) { return valor != null && !valor.toString().isBlank(); }

    private List<Map<String,Object>> leerCertificados(Object valor) {
        if (!tieneTexto(valor)) return List.of();
        List<Map<String,Object>> originales = mapper.readValue(valor.toString(), new TypeReference<>() {});
        return originales.stream().filter(Objects::nonNull).map(certificado -> {
            Map<String,Object> limpio = new LinkedHashMap<>();
            for (String clave : List.of("idCurso", "nombreCurso", "nombreArchivo", "fechaCompletado", "completado")) {
                if (certificado.containsKey(clave)) limpio.put(clave, certificado.get(clave));
            }
            return limpio;
        }).toList();
    }

    private ResponseEntity<?> error(HttpStatus estado, String mensaje) {
        return ResponseEntity.status(estado).body(Map.of("estado", "error", "mensaje", mensaje));
    }
}
