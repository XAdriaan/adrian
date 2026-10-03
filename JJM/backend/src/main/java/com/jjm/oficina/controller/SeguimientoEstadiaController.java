package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/seguimiento-estadia")
@CrossOrigin(origins = "*")
public class SeguimientoEstadiaController {

    private final JdbcTemplate jdbc;
    private final UsuarioRepository usuarioRepository;

    public SeguimientoEstadiaController(JdbcTemplate jdbc, UsuarioRepository usuarioRepository) {
        this.jdbc = jdbc;
        this.usuarioRepository = usuarioRepository;
    }

    @PostConstruct
    public void prepararEstructura() {
        try {
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS seguimiento_formularios_estadia (
                        id_seguimiento INT NOT NULL AUTO_INCREMENT,
                        id_usuario INT NOT NULL,
                        id_asesor_empresarial INT NULL,
                        url_empresa VARCHAR(1000) NULL,
                        url_satisfaccion VARCHAR(1000) NULL,
                        empresa_contestado TINYINT(1) NOT NULL DEFAULT 0,
                        empresa_fecha DATETIME NULL,
                        empresa_por INT NULL,
                        satisfaccion_contestado TINYINT(1) NOT NULL DEFAULT 0,
                        satisfaccion_fecha DATETIME NULL,
                        satisfaccion_por INT NULL,
                        fo_est_03_contestado TINYINT(1) NOT NULL DEFAULT 0,
                        fo_est_03_fecha DATETIME NULL,
                        fo_est_03_por INT NULL,
                        actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (id_seguimiento),
                        UNIQUE KEY uk_seguimiento_usuario (id_usuario)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """);

            agregarColumnaSiFalta("id_asesor_empresarial", "INT NULL");
            agregarColumnaSiFalta("url_empresa", "VARCHAR(1000) NULL");
            agregarColumnaSiFalta("url_satisfaccion", "VARCHAR(1000) NULL");
            agregarColumnaSiFalta("fo_est_03_contestado", "TINYINT(1) NOT NULL DEFAULT 0");
            agregarColumnaSiFalta("fo_est_03_fecha", "DATETIME NULL");
            agregarColumnaSiFalta("fo_est_03_por", "INT NULL");
        } catch (Exception ex) {
            // El módulo puede seguir consultando documentos aunque la cuenta de BD
            // no tenga privilegios ALTER. Se registra en stderr para diagnóstico.
            System.err.println("Seguimiento de estadía: no fue posible preparar columnas opcionales: " + ex.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<Map<String,Object>> listar(
            @RequestHeader(value="X-Usuario-Id",required=false) Integer idUsuario
    ) {
        Usuario activo = obtenerUsuario(idUsuario);
        if (activo == null) return error(HttpStatus.UNAUTHORIZED,"No se encontró una sesión activa.");
        if (!esAdministrador(activo)) return error(HttpStatus.FORBIDDEN,"Solo un administrador puede consultar el seguimiento de estadía.");

        List<Map<String,Object>> filas = jdbc.queryForList("""
                SELECT id_usuario AS idUsuario,
                       id_asesor_empresarial AS idAsesorEmpresarial,
                       url_empresa AS urlEmpresa,
                       url_satisfaccion AS urlSatisfaccion,
                       empresa_contestado AS empresa, empresa_fecha AS fechaEmpresa,
                       satisfaccion_contestado AS satisfaccion, satisfaccion_fecha AS fechaSatisfaccion,
                       fo_est_03_contestado AS foEst03, fo_est_03_fecha AS fechaFoEst03,
                       actualizado_en AS fechaActualizacion
                FROM seguimiento_formularios_estadia
                """);

        Map<String,Object> estados = new LinkedHashMap<>();
        for (Map<String,Object> fila : filas) {
            estados.put(String.valueOf(fila.get("idUsuario")), normalizar(fila));
        }

        Map<String,Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("seguimientos", estados);
        respuesta.put("asesores", listarAsesores());
        return ResponseEntity.ok(respuesta);
    }

    /** Vista del colaborador. El id se obtiene del token y no del navegador. */
    @GetMapping("/mi-seguimiento")
    public ResponseEntity<Map<String,Object>> miSeguimiento(
            @RequestHeader(value="X-Usuario-Id",required=false) Integer idUsuario
    ) {
        Usuario activo = obtenerUsuario(idUsuario);
        if (activo == null) return error(HttpStatus.UNAUTHORIZED,"La sesión no existe o venció. Inicia sesión nuevamente.");
        return ResponseEntity.ok(construirDetalle(activo.getId()));
    }

    @GetMapping("/usuario/{idObjetivo}")
    public ResponseEntity<Map<String,Object>> detalleUsuario(
            @PathVariable Integer idObjetivo,
            @RequestHeader(value="X-Usuario-Id",required=false) Integer idUsuario
    ) {
        Usuario activo = obtenerUsuario(idUsuario);
        if (activo == null) return error(HttpStatus.UNAUTHORIZED,"No se encontró una sesión activa.");
        if (!esAdministrador(activo)) return error(HttpStatus.FORBIDDEN,"Solo un administrador puede consultar otro expediente de estadía.");
        if (!usuarioRepository.existsById(idObjetivo)) return error(HttpStatus.NOT_FOUND,"No se encontró el colaborador.");
        return ResponseEntity.ok(construirDetalle(idObjetivo));
    }

    @PutMapping("/usuario/{idObjetivo}")
    @Transactional
    public ResponseEntity<Map<String,Object>> guardar(
            @PathVariable Integer idObjetivo,
            @RequestHeader(value="X-Usuario-Id",required=false) Integer idUsuario,
            @RequestBody Map<String,Object> datos
    ) {
        Usuario activo = obtenerUsuario(idUsuario);
        if (activo == null) return error(HttpStatus.UNAUTHORIZED,"No se encontró una sesión activa.");
        if (!esAdministrador(activo)) return error(HttpStatus.FORBIDDEN,"Solo un administrador puede actualizar el seguimiento de estadía.");
        if (!usuarioRepository.existsById(idObjetivo)) return error(HttpStatus.NOT_FOUND,"No se encontró el colaborador.");

        boolean empresa = booleano(datos.get("empresa"));
        boolean satisfaccion = booleano(datos.get("satisfaccion"));
        boolean foEst03 = booleano(datos.get("foEst03"));
        Timestamp fechaEmpresa = empresa ? fecha(datos.get("fechaEmpresa")) : null;
        Timestamp fechaSatisfaccion = satisfaccion ? fecha(datos.get("fechaSatisfaccion")) : null;
        Timestamp fechaFoEst03 = foEst03 ? fecha(datos.get("fechaFoEst03")) : null;
        if (empresa && fechaEmpresa == null) fechaEmpresa = Timestamp.valueOf(LocalDateTime.now());
        if (satisfaccion && fechaSatisfaccion == null) fechaSatisfaccion = Timestamp.valueOf(LocalDateTime.now());
        if (foEst03 && fechaFoEst03 == null) fechaFoEst03 = Timestamp.valueOf(LocalDateTime.now());

        Integer idAsesor = entero(datos.get("idAsesorEmpresarial"));
        String urlEmpresa = texto(datos.get("urlEmpresa"));
        String urlSatisfaccion = texto(datos.get("urlSatisfaccion"));

        jdbc.update("""
                INSERT INTO seguimiento_formularios_estadia
                    (id_usuario,id_asesor_empresarial,url_empresa,url_satisfaccion,
                     empresa_contestado,empresa_fecha,empresa_por,
                     satisfaccion_contestado,satisfaccion_fecha,satisfaccion_por,
                     fo_est_03_contestado,fo_est_03_fecha,fo_est_03_por)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE
                    id_asesor_empresarial=VALUES(id_asesor_empresarial),
                    url_empresa=VALUES(url_empresa),
                    url_satisfaccion=VALUES(url_satisfaccion),
                    empresa_contestado=VALUES(empresa_contestado),
                    empresa_fecha=VALUES(empresa_fecha),
                    empresa_por=VALUES(empresa_por),
                    satisfaccion_contestado=VALUES(satisfaccion_contestado),
                    satisfaccion_fecha=VALUES(satisfaccion_fecha),
                    satisfaccion_por=VALUES(satisfaccion_por),
                    fo_est_03_contestado=VALUES(fo_est_03_contestado),
                    fo_est_03_fecha=VALUES(fo_est_03_fecha),
                    fo_est_03_por=VALUES(fo_est_03_por)
                """,
                idObjetivo, idAsesor, urlEmpresa, urlSatisfaccion,
                empresa, fechaEmpresa, empresa ? activo.getId() : null,
                satisfaccion, fechaSatisfaccion, satisfaccion ? activo.getId() : null,
                foEst03, fechaFoEst03, foEst03 ? activo.getId() : null
        );

        Map<String,Object> respuesta = construirDetalle(idObjetivo);
        respuesta.put("mensaje", "Seguimiento actualizado correctamente.");
        return ResponseEntity.ok(respuesta);
    }

    private Map<String,Object> construirDetalle(Integer idUsuario) {
        Map<String,Object> seguimiento = obtenerSeguimiento(idUsuario);
        Map<String,Object> documentos = obtenerEstadoDocumental(idUsuario);

        Map<String,Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("seguimiento", seguimiento);
        respuesta.put("documentos", documentos);
        return respuesta;
    }

    private Map<String,Object> obtenerSeguimiento(Integer idUsuario) {
        Map<String,Object> resultado = new LinkedHashMap<>();
        resultado.put("idUsuario", idUsuario);
        resultado.put("idAsesorEmpresarial", null);
        resultado.put("urlEmpresa", null);
        resultado.put("urlSatisfaccion", null);
        resultado.put("empresa", false);
        resultado.put("fechaEmpresa", null);
        resultado.put("satisfaccion", false);
        resultado.put("fechaSatisfaccion", null);
        resultado.put("foEst03", false);
        resultado.put("fechaFoEst03", null);

        List<Map<String,Object>> filas = jdbc.queryForList("""
                SELECT id_usuario AS idUsuario,
                       id_asesor_empresarial AS idAsesorEmpresarial,
                       url_empresa AS urlEmpresa,
                       url_satisfaccion AS urlSatisfaccion,
                       empresa_contestado AS empresa,
                       empresa_fecha AS fechaEmpresa,
                       satisfaccion_contestado AS satisfaccion,
                       satisfaccion_fecha AS fechaSatisfaccion,
                       fo_est_03_contestado AS foEst03,
                       fo_est_03_fecha AS fechaFoEst03,
                       actualizado_en AS fechaActualizacion
                FROM seguimiento_formularios_estadia
                WHERE id_usuario=?
                LIMIT 1
                """, idUsuario);

        if (!filas.isEmpty()) {
            resultado.putAll(normalizar(filas.get(0)));
        }

        Integer idAsesor = entero(resultado.get("idAsesorEmpresarial"));
        if (idAsesor != null) {
            List<Map<String,Object>> asesor = jdbc.queryForList("""
                    SELECT CONCAT_WS(' ', nombre, apellido_paterno, apellido_materno) AS nombre,
                           correo
                    FROM usuarios
                    WHERE id_usuario=?
                    LIMIT 1
                    """, idAsesor);
            if (!asesor.isEmpty()) {
                resultado.put("asesorNombre", asesor.get(0).get("nombre"));
                resultado.put("asesorCorreo", asesor.get(0).get("correo"));
            }
        }

        // Compatibilidad con expedientes anteriores que guardaban el asesor como texto.
        if (!resultado.containsKey("asesorNombre") || resultado.get("asesorNombre") == null) {
            List<Map<String,Object>> academicos = jdbc.queryForList("""
                    SELECT asesor_empresarial AS asesorEmpresarial
                    FROM datos_academicos_usuario
                    WHERE id_usuario=?
                    LIMIT 1
                    """, idUsuario);
            if (!academicos.isEmpty()) {
                Object nombre = academicos.get(0).get("asesorEmpresarial");
                if (nombre != null && !String.valueOf(nombre).isBlank()) {
                    resultado.put("asesorNombre", nombre);
                }
            }
        }

        return resultado;
    }

    private Map<String,Object> obtenerEstadoDocumental(Integer idUsuario) {
        List<Map<String,Object>> filas = jdbc.queryForList("""
                SELECT tipo_documento AS tipo, estado
                FROM documentos_usuario
                WHERE id_usuario=?
                """, idUsuario);

        boolean presentacion = false;
        boolean aceptacion = false;
        boolean termino = false;

        for (Map<String,Object> fila : filas) {
            String tipo = normalizarTexto(fila.get("tipo"));
            String estado = normalizarTexto(fila.get("estado"));
            boolean aprobado = estado.contains("acept") || estado.contains("liberad") || estado.contains("aprobad");
            if (!aprobado) continue;

            if (tipo.contains("presentacion")) presentacion = true;
            if (tipo.contains("aceptacion")) aceptacion = true;
            if (tipo.contains("termin") || tipo.contains("liberacion")) termino = true;
        }

        Map<String,Object> documentos = new LinkedHashMap<>();
        documentos.put("cartaPresentacion", presentacion);
        documentos.put("cartaAceptacion", aceptacion);
        documentos.put("cartaTermino", termino);
        documentos.put("completos", presentacion && aceptacion && termino);
        return documentos;
    }

    private List<Map<String,Object>> listarAsesores() {
        List<Map<String,Object>> salida = new ArrayList<>();
        try {
            List<Map<String,Object>> filas = jdbc.queryForList("""
                    SELECT DISTINCT u.id_usuario AS id,
                           CONCAT_WS(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre,
                           u.correo
                    FROM usuarios u
                    LEFT JOIN roles r ON r.id_rol=u.id_rol
                    LEFT JOIN miembros_equipo m ON m.id_usuario=u.id_usuario
                    WHERE LOWER(COALESCE(r.nombre,'')) LIKE '%asesor%'
                       OR LOWER(COALESCE(m.rol,'')) LIKE '%asesor%'
                    ORDER BY nombre
                    """);
            salida.addAll(filas);
        } catch (Exception ignored) {
            // Si una instalación antigua no tiene una de las columnas, el selector queda vacío.
        }
        return salida;
    }

    private void agregarColumnaSiFalta(String columna, String definicion) {
        Integer existe = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'seguimiento_formularios_estadia'
                  AND COLUMN_NAME = ?
                """, Integer.class, columna);

        if (existe != null && existe == 0) {
            jdbc.execute("ALTER TABLE seguimiento_formularios_estadia ADD COLUMN " + columna + " " + definicion);
        }
    }

    private Map<String,Object> normalizar(Map<String,Object> fila) {
        Map<String,Object> r = new LinkedHashMap<>(fila);
        r.put("empresa", booleano(r.get("empresa")));
        r.put("satisfaccion", booleano(r.get("satisfaccion")));
        r.put("foEst03", booleano(r.get("foEst03")));
        return r;
    }

    private boolean booleano(Object v) {
        if (v instanceof Boolean b) return b;
        if (v instanceof Number n) return n.intValue() != 0;
        return v != null && Boolean.parseBoolean(String.valueOf(v));
    }

    private Timestamp fecha(Object v) {
        if (v == null || String.valueOf(v).isBlank()) return null;
        try {
            return Timestamp.from(java.time.Instant.parse(String.valueOf(v)));
        } catch (Exception e) {
            try {
                String valor = String.valueOf(v).replace("T", " ").replace("Z", "");
                if (valor.length() > 19) valor = valor.substring(0, 19);
                return Timestamp.valueOf(valor);
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    private Integer entero(Object v) {
        if (v == null || String.valueOf(v).isBlank()) return null;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.valueOf(String.valueOf(v)); }
        catch (Exception ignored) { return null; }
    }

    private String texto(Object v) {
        if (v == null) return null;
        String s = String.valueOf(v).trim();
        return s.isEmpty() ? null : s;
    }

    private String normalizarTexto(Object v) {
        String s = String.valueOf(v == null ? "" : v).trim().toLowerCase(Locale.ROOT);
        return java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
    }

    private Usuario obtenerUsuario(Integer id) {
        return id == null ? null : usuarioRepository.findById(id).orElse(null);
    }

    private boolean esAdministrador(Usuario u) {
        if (u == null || u.getRol() == null || u.getRol().getNombre() == null) return false;
        String r = normalizarTexto(u.getRol().getNombre());
        return Set.of("superadministrador", "administrador", "admin pmo", "administrador pmo", "admin_pmo").contains(r);
    }

    private ResponseEntity<Map<String,Object>> error(HttpStatus s,String m) {
        Map<String,Object> r = new LinkedHashMap<>();
        r.put("estado","error");
        r.put("mensaje",m);
        return ResponseEntity.status(s).body(r);
    }
}
