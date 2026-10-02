package com.jjm.oficina.controller;

import com.jjm.oficina.dto.ActualizarMiembroRequest;
import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.BitacoraService;

import jakarta.validation.Valid;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/miembros")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class MiembroEquipoController {

    private final MiembroEquipoRepository miembroEquipoRepository;
    private final UsuarioRepository usuarioRepository;
    private final BitacoraService bitacoraService;

    private static final Set<String> SENIORITIES_VALIDOS = Set.of(
            "Junior",
            "Semi Senior",
            "Senior",
            "Líder"
    );

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
            "Activo",
            "Inactivo"
    );

    public MiembroEquipoController(
            MiembroEquipoRepository miembroEquipoRepository,
            UsuarioRepository usuarioRepository,
            BitacoraService bitacoraService
    ) {
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.usuarioRepository = usuarioRepository;
        this.bitacoraService = bitacoraService;
    }

    /*
     * Equipo global:
     * - Solo Administrador puede consultar todo el equipo.
     * - Responsable y colaborador deben consultar integrantes desde
     *   /api/miembros-proyecto/proyecto/{idProyecto}.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listarMiembros(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para consultar el equipo."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo un administrador puede consultar el equipo completo."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        List<MiembroEquipo> miembros = miembroEquipoRepository.findAll(
                Sort.by(Sort.Direction.ASC, "nombreCompleto")
        );

        respuesta.put("estado", "correcto");
        respuesta.put("total", miembros.size());
        respuesta.put(
                "miembros",
                miembros.stream()
                        .map(this::convertirMiembro)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Mi sesión:
     * - Devuelve únicamente el registro de miembro vinculado
     *   al usuario activo.
     * - No expone el equipo completo.
     *
     * Importante:
     * Este endpoint debe estar antes de @GetMapping("/{id}")
     * para que Spring no interprete "mi-sesion" como si fuera un id.
     */
    @GetMapping("/mi-sesion")
    public ResponseEntity<Map<String, Object>> obtenerMiembroDeMiSesion(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para consultar el miembro activo."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        MiembroEquipo miembro = miembroEquipoRepository
                .findByUsuarioId(usuario.getId())
                .orElse(null);

        if (miembro == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "El usuario activo no tiene un registro de miembro vinculado."
            );

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        respuesta.put("estado", "correcto");
        respuesta.put("miembro", convertirMiembro(miembro));

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Consulta individual:
     * - Administrador puede consultar cualquier miembro.
     * - Un usuario puede consultar su propio registro de miembro.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerMiembro(
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
                    "No se encontró una sesión válida para consultar el miembro."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        MiembroEquipo miembro = miembroEquipoRepository.findById(id)
                .orElse(null);

        if (miembro == null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "No se encontró el miembro solicitado.");

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario) && !esMiembroPropio(usuario, miembro)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No tienes permiso para consultar este integrante."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        respuesta.put("estado", "correcto");
        respuesta.put("miembro", convertirMiembro(miembro));

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Edición administrativa:
     * - Solo Administrador puede editar datos del equipo global.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> actualizarMiembro(
            @PathVariable Integer id,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody ActualizarMiembroRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para editar miembros del equipo."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No tienes permisos para editar miembros del equipo."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        MiembroEquipo miembro = miembroEquipoRepository.findById(id)
                .orElse(null);

        if (miembro == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró el miembro que deseas actualizar."
            );

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        String datosAnteriores = resumenMiembro(miembro);

        if (tieneTexto(datos.getRol())) {
            miembro.setRol(datos.getRol().trim());
        }

        if (tieneTexto(datos.getSeniority())) {
            String seniority = datos.getSeniority().trim();

            if (!SENIORITIES_VALIDOS.contains(seniority)) {
                respuesta.put("estado", "error");
                respuesta.put(
                        "mensaje",
                        "El seniority debe ser: Junior, Semi Senior, Senior o Líder."
                );

                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(respuesta);
            }

            miembro.setSeniority(seniority);
        }

        if (datos.getHorasDisponibles() != null) {
            BigDecimal horas = datos.getHorasDisponibles();

            if (horas.compareTo(BigDecimal.ZERO) < 0) {
                respuesta.put("estado", "error");
                respuesta.put(
                        "mensaje",
                        "Las horas disponibles no pueden ser negativas."
                );

                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(respuesta);
            }

            miembro.setHorasDisponibles(horas);
        }

        if (datos.getHabilidades() != null) {
            miembro.setHabilidades(datos.getHabilidades().trim());
        }

        if (datos.getNotas() != null) {
            miembro.setNotas(datos.getNotas().trim());
        }

        if (tieneTexto(datos.getEstado())) {
            String estado = datos.getEstado().trim();

            if (!ESTADOS_VALIDOS.contains(estado)) {
                respuesta.put("estado", "error");
                respuesta.put(
                        "mensaje",
                        "El estado debe ser Activo o Inactivo."
                );

                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(respuesta);
            }

            miembro.setEstado(estado);
        }

        MiembroEquipo miembroActualizado =
                miembroEquipoRepository.save(miembro);

        bitacoraService.registrar(
                idUsuarioActivo,
                "EQUIPO",
                "EDITAR_MIEMBRO",
                "MiembroEquipo",
                miembroActualizado.getId(),
                "Se actualizaron datos administrativos del integrante " +
                        miembroActualizado.getNombreCompleto() + ".",
                datosAnteriores,
                resumenMiembro(miembroActualizado)
        );

        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Miembro actualizado correctamente.");
        respuesta.put("miembro", convertirMiembro(miembroActualizado));

        return ResponseEntity.ok(respuesta);
    }

    private String resumenMiembro(
            MiembroEquipo miembro
    ) {
        if (miembro == null) {
            return null;
        }

        return "Nombre: " + miembro.getNombreCompleto() +
                " | Rol: " + miembro.getRol() +
                " | Seniority: " + miembro.getSeniority() +
                " | Estado: " + miembro.getEstado() +
                " | Horas disponibles: " +
                miembro.getHorasDisponibles();
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

        return rol.equals("administrador") ||
                rol.equals("admin pmo") ||
                rol.equals("admin_pmo") ||
                rol.equals("administrador pmo");
    }

    private boolean esMiembroPropio(
            Usuario usuario,
            MiembroEquipo miembro
    ) {
        if (
                usuario == null ||
                miembro == null ||
                miembro.getUsuario() == null
        ) {
            return false;
        }

        return usuario.getId().equals(
                miembro.getUsuario().getId()
        );
    }

    private Usuario obtenerUsuario(Integer idUsuarioActivo) {
        if (idUsuarioActivo == null) {
            return null;
        }

        Optional<Usuario> usuarioEncontrado =
                usuarioRepository.findById(idUsuarioActivo);

        return usuarioEncontrado.orElse(null);
    }

    private boolean tieneTexto(String valor) {
        return valor != null && !valor.isBlank();
    }

    private Map<String, Object> convertirMiembro(MiembroEquipo miembro) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put("id", miembro.getId());

        respuesta.put(
                "idUsuario",
                miembro.getUsuario() != null
                        ? miembro.getUsuario().getId()
                        : null
        );

        respuesta.put("nombreCompleto", miembro.getNombreCompleto());
        respuesta.put("correo", miembro.getCorreo());
        respuesta.put("telefono", miembro.getTelefono());

        respuesta.put("rol", miembro.getRol());
        respuesta.put("seniority", miembro.getSeniority());

        respuesta.put(
                "horasDisponibles",
                miembro.getHorasDisponibles() != null
                        ? miembro.getHorasDisponibles()
                        : BigDecimal.ZERO
        );

        respuesta.put("habilidades", miembro.getHabilidades());
        respuesta.put("notas", miembro.getNotas());
        respuesta.put("estado", miembro.getEstado());
        respuesta.put("fechaCreacion", miembro.getFechaCreacion());

        return respuesta;
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