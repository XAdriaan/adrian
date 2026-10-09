package com.jjm.oficina.controller;

import com.jjm.oficina.dto.OrganizacionRequest;
import com.jjm.oficina.modelo.Organizacion;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.OrganizacionRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;

import jakarta.validation.Valid;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/organizaciones")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class OrganizacionController {

    private final OrganizacionRepository organizacionRepository;
    private final UsuarioRepository usuarioRepository;

    private static final Set<String> TIPOS_VALIDOS = Set.of(
            "Empresa",
            "Universidad",
            "Proveedor",
            "Cliente",
            "Otro"
    );

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
            "Activo",
            "Pendiente",
            "Vencido",
            "Sin convenio"
    );

    public OrganizacionController(
            OrganizacionRepository organizacionRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.organizacionRepository = organizacionRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /*
     * Organizaciones globales:
     * - Solo Administrador puede consultar el catálogo completo.
     * - Responsable, colaborador, cliente y consulta no administran organizaciones.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listarOrganizaciones(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para consultar organizaciones."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo un administrador puede consultar el catálogo completo de organizaciones."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        List<Organizacion> organizaciones = organizacionRepository.findAll(
                Sort.by(Sort.Direction.ASC, "nombre")
        );

        respuesta.put("estado", "correcto");
        respuesta.put("total", organizaciones.size());
        respuesta.put("organizaciones", organizaciones);

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Consulta individual:
     * - Solo Administrador puede consultar una organización directamente.
     * - Los demás roles verán el nombre de organización únicamente
     *   desde los proyectos donde tengan acceso.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerOrganizacion(
            @PathVariable Integer id,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para consultar la organización."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo un administrador puede consultar organizaciones de forma directa."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        Organizacion organizacion = organizacionRepository.findById(id)
                .orElse(null);

        if (organizacion == null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "No se encontró la organización solicitada.");

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        respuesta.put("estado", "correcto");
        respuesta.put("organizacion", organizacion);

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Crear organización:
     * - Solo Administrador.
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> crearOrganizacion(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody OrganizacionRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para registrar organizaciones."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo un administrador puede registrar organizaciones."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        String validacion = validarDatos(datos);

        if (validacion != null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", validacion);

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(respuesta);
        }

        Organizacion organizacion = new Organizacion();

        asignarDatos(organizacion, datos);

        Organizacion organizacionGuardada =
                organizacionRepository.save(organizacion);

        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Organización registrada correctamente.");
        respuesta.put("organizacion", organizacionGuardada);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    /*
     * Editar organización:
     * - Solo Administrador.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> actualizarOrganizacion(
            @PathVariable Integer id,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody OrganizacionRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para editar organizaciones."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo un administrador puede editar organizaciones."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        Organizacion organizacion = organizacionRepository.findById(id)
                .orElse(null);

        if (organizacion == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró la organización que deseas editar."
            );

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        String validacion = validarDatos(datos);

        if (validacion != null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", validacion);

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(respuesta);
        }

        asignarDatos(organizacion, datos);

        Organizacion organizacionActualizada =
                organizacionRepository.save(organizacion);

        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Organización actualizada correctamente.");
        respuesta.put("organizacion", organizacionActualizada);

        return ResponseEntity.ok(respuesta);
    }

    private void asignarDatos(
            Organizacion organizacion,
            OrganizacionRequest datos
    ) {
        organizacion.setNombre(datos.getNombre().trim());
        organizacion.setTipo(valorODefecto(datos.getTipo(), "Empresa"));
        organizacion.setEstadoConvenio(
                valorODefecto(datos.getEstadoConvenio(), "Sin convenio")
        );

        organizacion.setContacto(limpiarTexto(datos.getContacto()));
        organizacion.setCorreo(limpiarTexto(datos.getCorreo()));
        organizacion.setTelefono(limpiarTexto(datos.getTelefono()));

        organizacion.setFechaInicioConvenio(
                datos.getFechaInicioConvenio()
        );

        organizacion.setFechaFinConvenio(
                datos.getFechaFinConvenio()
        );

        organizacion.setNotas(limpiarTexto(datos.getNotas()));
    }

    private String validarDatos(OrganizacionRequest datos) {
        String tipo = valorODefecto(datos.getTipo(), "Empresa");
        String estado = valorODefecto(
                datos.getEstadoConvenio(),
                "Sin convenio"
        );

        if (!TIPOS_VALIDOS.contains(tipo)) {
            return "El tipo debe ser Empresa, Universidad, Proveedor, Cliente u Otro.";
        }

        if (!ESTADOS_VALIDOS.contains(estado)) {
            return "El estado del convenio debe ser Activo, Pendiente, Vencido o Sin convenio.";
        }

        if (
                datos.getFechaInicioConvenio() != null
                && datos.getFechaFinConvenio() != null
                && datos.getFechaFinConvenio()
                        .isBefore(datos.getFechaInicioConvenio())
        ) {
            return "La fecha final del convenio no puede ser anterior a la fecha de inicio.";
        }

        return null;
    }

    private Usuario obtenerUsuario(Integer idUsuarioActivo) {
        if (idUsuarioActivo == null) {
            return null;
        }

        Optional<Usuario> usuarioEncontrado =
                usuarioRepository.findById(idUsuarioActivo);

        return usuarioEncontrado.orElse(null);
    }

    private boolean esAdministrador(Usuario usuario) {
        if (
                usuario == null ||
                usuario.getRol() == null ||
                !"Activo".equalsIgnoreCase(usuario.getEstado())
        ) {
            return false;
        }

        String rol = normalizarTexto(usuario.getRol().getNombre());

        return rol.equals("superadministrador") ||
                rol.equals("administrador") ||
                rol.equals("admin pmo") ||
                rol.equals("admin_pmo") ||
                rol.equals("administrador pmo");
    }

    private String valorODefecto(String valor, String valorDefecto) {
        if (valor == null || valor.isBlank()) {
            return valorDefecto;
        }

        return valor.trim();
    }

    private String limpiarTexto(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }

        return valor.trim();
    }

    private String normalizarTexto(String valor) {
        return String.valueOf(valor == null ? "" : valor)
                .trim()
                .toLowerCase()
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u");
    }
}