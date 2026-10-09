package com.jjm.oficina.controller;

import com.jjm.oficina.dto.MiembroProyectoRequest;
import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.MiembroProyecto;
import com.jjm.oficina.modelo.Proyecto;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.MiembroProyectoRepository;
import com.jjm.oficina.repositorio.ProyectoRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.CatalogoProyectosSepDic2026Service;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/miembros-proyecto")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class MiembroProyectoController {

    private final MiembroProyectoRepository miembroProyectoRepository;
    private final MiembroEquipoRepository miembroEquipoRepository;
    private final ProyectoRepository proyectoRepository;
    private final UsuarioRepository usuarioRepository;
    private final CatalogoProyectosSepDic2026Service catalogoProyectosSepDic2026Service;

    public MiembroProyectoController(
            MiembroProyectoRepository miembroProyectoRepository,
            MiembroEquipoRepository miembroEquipoRepository,
            ProyectoRepository proyectoRepository,
            UsuarioRepository usuarioRepository,
            CatalogoProyectosSepDic2026Service catalogoProyectosSepDic2026Service
    ) {
        this.miembroProyectoRepository = miembroProyectoRepository;
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.proyectoRepository = proyectoRepository;
        this.usuarioRepository = usuarioRepository;
        this.catalogoProyectosSepDic2026Service = catalogoProyectosSepDic2026Service;
    }

    /*
     * Lista los miembros asignados a un proyecto.
     *
     * Administrador:
     * - Puede ver integrantes de cualquier proyecto.
     *
     * Responsable / colaborador / consulta:
     * - Solo puede ver integrantes de proyectos donde pertenece.
     */
    @GetMapping("/proyecto/{idProyecto}")
    public ResponseEntity<Map<String, Object>> listarMiembrosProyecto(
            @PathVariable Integer idProyecto,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para consultar los integrantes del proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        Proyecto proyecto = proyectoRepository.findById(idProyecto)
                .orElse(null);

        if (proyecto == null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "El proyecto seleccionado no existe.");

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        if (!tieneAccesoAlProyecto(usuario, idProyecto)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No tienes permiso para consultar los integrantes de este proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        List<MiembroProyecto> asignaciones =
                miembroProyectoRepository
                        .findByIdProyectoOrderByFechaAsignacionDesc(idProyecto);

        respuesta.put("estado", "correcto");
        respuesta.put("proyectoId", idProyecto);
        respuesta.put("proyectoNombre", catalogoProyectosSepDic2026Service.obtenerNombreVisual(proyecto));
        respuesta.put("total", asignaciones.size());

        respuesta.put(
                "miembros",
                asignaciones.stream()
                        .map(this::convertirAsignacion)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Devuelve los proyectos a los que pertenece el usuario activo.
     *
     * Administrador:
     * - Devuelve todos los proyectos.
     *
     * Otros roles:
     * - Devuelve únicamente los proyectos asignados al miembro vinculado.
     */
    @GetMapping("/mis-proyectos")
    public ResponseEntity<Map<String, Object>> listarMisProyectos(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para consultar proyectos."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (esAdministrador(usuario)) {
            List<Proyecto> proyectos = proyectoRepository.findAll();

            respuesta.put("estado", "correcto");
            respuesta.put("tipoAcceso", "administrador");
            respuesta.put("total", proyectos.size());

            respuesta.put(
                    "proyectos",
                    proyectos.stream()
                            .map(this::convertirProyectoSimple)
                            .toList()
            );

            return ResponseEntity.ok(respuesta);
        }

        MiembroEquipo miembro = obtenerMiembroDesdeUsuario(usuario);

        if (miembro == null) {
            respuesta.put("estado", "correcto");
            respuesta.put("tipoAcceso", "sin_miembro_vinculado");
            respuesta.put("total", 0);
            respuesta.put("proyectos", List.of());

            return ResponseEntity.ok(respuesta);
        }

        List<MiembroProyecto> asignaciones =
                miembroProyectoRepository
                        .findByIdMiembroOrderByFechaAsignacionDesc(
                                miembro.getId()
                        );

        respuesta.put("estado", "correcto");
        respuesta.put("tipoAcceso", "proyectos_asignados");
        respuesta.put("total", asignaciones.size());

        respuesta.put(
                "proyectos",
                asignaciones.stream()
                        .map(this::convertirProyectoDesdeAsignacion)
                        .filter(proyecto -> proyecto != null)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Solo el administrador puede asignar integrantes a proyectos.
     */
    @PostMapping("/proyecto/{idProyecto}")
    @Transactional
    public ResponseEntity<Map<String, Object>> asignarMiembroProyecto(
            @PathVariable Integer idProyecto,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody MiembroProyectoRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para asignar integrantes."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo un administrador puede asignar miembros a un proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        Proyecto proyecto = proyectoRepository.findById(idProyecto)
                .orElse(null);

        if (proyecto == null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "El proyecto seleccionado no existe.");

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        MiembroEquipo miembro = miembroEquipoRepository
                .findById(datos.getIdMiembro())
                .orElse(null);

        if (miembro == null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "El miembro seleccionado no existe.");

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        if (!"Activo".equalsIgnoreCase(miembro.getEstado())) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No puedes asignar un miembro que se encuentra inactivo."
            );

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(respuesta);
        }

        if (
                miembroProyectoRepository.existsByIdProyectoAndIdMiembro(
                        idProyecto,
                        datos.getIdMiembro()
                )
        ) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Este miembro ya está asignado al proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(respuesta);
        }

        String validacion = validarDatosAsignacion(datos);

        if (validacion != null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", validacion);

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(respuesta);
        }

        MiembroProyecto asignacion = new MiembroProyecto();

        asignarDatos(asignacion, idProyecto, datos);

        MiembroProyecto asignacionGuardada =
                miembroProyectoRepository.save(asignacion);

        respuesta.put("estado", "correcto");
        respuesta.put(
                "mensaje",
                "Miembro asignado al proyecto correctamente."
        );
        respuesta.put("asignacion", convertirAsignacion(asignacionGuardada));

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    /*
     * Solo el administrador puede modificar información
     * de asignación: rol, horas y notas.
     */
    @PutMapping("/proyecto/{idProyecto}/miembro/{idMiembro}")
    @Transactional
    public ResponseEntity<Map<String, Object>> actualizarAsignacion(
            @PathVariable Integer idProyecto,
            @PathVariable Integer idMiembro,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody MiembroProyectoRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para modificar la asignación."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo un administrador puede modificar asignaciones de proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        MiembroProyecto asignacion =
                miembroProyectoRepository
                        .findByIdProyectoAndIdMiembro(
                                idProyecto,
                                idMiembro
                        )
                        .orElse(null);

        if (asignacion == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró la asignación del miembro en este proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        String validacion = validarDatosAsignacion(datos);

        if (validacion != null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", validacion);

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(respuesta);
        }

        asignacion.setRolProyecto(
                valorODefecto(
                        datos.getRolProyecto(),
                        "Colaborador"
                )
        );

        asignacion.setHorasAsignadas(
                datos.getHorasAsignadas() != null
                        ? datos.getHorasAsignadas()
                        : BigDecimal.ZERO
        );

        asignacion.setNotas(limpiarTexto(datos.getNotas()));

        MiembroProyecto asignacionActualizada =
                miembroProyectoRepository.save(asignacion);

        respuesta.put("estado", "correcto");
        respuesta.put(
                "mensaje",
                "Asignación actualizada correctamente."
        );
        respuesta.put("asignacion", convertirAsignacion(asignacionActualizada));

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Solo el administrador puede retirar integrantes.
     * No borra al usuario ni su perfil de equipo.
     */
    @DeleteMapping("/proyecto/{idProyecto}/miembro/{idMiembro}")
    @Transactional
    public ResponseEntity<Map<String, Object>> retirarMiembroProyecto(
            @PathVariable Integer idProyecto,
            @PathVariable Integer idMiembro,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para retirar integrantes."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo un administrador puede retirar miembros de un proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        boolean existeProyecto = proyectoRepository.existsById(idProyecto);

        if (!existeProyecto) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "El proyecto seleccionado no existe.");

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        boolean existeAsignacion =
                miembroProyectoRepository.existsByIdProyectoAndIdMiembro(
                        idProyecto,
                        idMiembro
                );

        if (!existeAsignacion) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "El miembro indicado no está asignado a este proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        miembroProyectoRepository.deleteByIdProyectoAndIdMiembro(
                idProyecto,
                idMiembro
        );

        respuesta.put("estado", "correcto");
        respuesta.put(
                "mensaje",
                "Miembro retirado del proyecto correctamente."
        );

        return ResponseEntity.ok(respuesta);
    }

    private void asignarDatos(
            MiembroProyecto asignacion,
            Integer idProyecto,
            MiembroProyectoRequest datos
    ) {
        asignacion.setIdProyecto(idProyecto);
        asignacion.setIdMiembro(datos.getIdMiembro());

        asignacion.setRolProyecto(
                valorODefecto(
                        datos.getRolProyecto(),
                        "Colaborador"
                )
        );

        asignacion.setHorasAsignadas(
                datos.getHorasAsignadas() != null
                        ? datos.getHorasAsignadas()
                        : BigDecimal.ZERO
        );

        asignacion.setNotas(limpiarTexto(datos.getNotas()));
    }

    private String validarDatosAsignacion(
            MiembroProyectoRequest datos
    ) {
        if (
                datos.getHorasAsignadas() != null
                && datos.getHorasAsignadas()
                        .compareTo(BigDecimal.ZERO) < 0
        ) {
            return "Las horas asignadas no pueden ser negativas.";
        }

        return null;
    }

    private boolean tieneAccesoAlProyecto(
            Usuario usuario,
            Integer idProyecto
    ) {
        if (usuario == null || idProyecto == null) {
            return false;
        }

        if (esAdministrador(usuario)) {
            return true;
        }

        MiembroEquipo miembro = obtenerMiembroDesdeUsuario(usuario);

        if (miembro == null) {
            return false;
        }

        return miembroProyectoRepository
                .existsByIdProyectoAndIdMiembro(
                        idProyecto,
                        miembro.getId()
                );
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

    private Usuario obtenerUsuario(Integer idUsuarioActivo) {
        if (idUsuarioActivo == null) {
            return null;
        }

        return usuarioRepository.findById(idUsuarioActivo)
                .orElse(null);
    }

    private MiembroEquipo obtenerMiembroDesdeUsuario(
            Usuario usuario
    ) {
        if (usuario == null) {
            return null;
        }

        return miembroEquipoRepository
                .findByUsuarioId(usuario.getId())
                .orElse(null);
    }

    private Map<String, Object> convertirAsignacion(
            MiembroProyecto asignacion
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put("id", asignacion.getId());
        respuesta.put("idProyecto", asignacion.getIdProyecto());
        respuesta.put("idMiembro", asignacion.getIdMiembro());

        respuesta.put("rolProyecto", asignacion.getRolProyecto());

        respuesta.put(
                "horasAsignadas",
                asignacion.getHorasAsignadas() != null
                        ? asignacion.getHorasAsignadas()
                        : BigDecimal.ZERO
        );

        respuesta.put("notas", asignacion.getNotas());
        respuesta.put("fechaAsignacion", asignacion.getFechaAsignacion());

        Proyecto proyecto = proyectoRepository
                .findById(asignacion.getIdProyecto())
                .orElse(null);

        respuesta.put(
                "proyectoNombre",
                proyecto != null
                        ? catalogoProyectosSepDic2026Service.obtenerNombreVisual(proyecto)
                        : "Proyecto no disponible"
        );

        MiembroEquipo miembro = miembroEquipoRepository
                .findById(asignacion.getIdMiembro())
                .orElse(null);

        if (miembro != null) {
            respuesta.put("miembroNombre", miembro.getNombreCompleto());
            respuesta.put("miembroCorreo", miembro.getCorreo());
            respuesta.put("miembroRolOperativo", miembro.getRol());
            respuesta.put("miembroEstado", miembro.getEstado());
        } else {
            respuesta.put("miembroNombre", "Miembro no disponible");
            respuesta.put("miembroCorreo", null);
            respuesta.put("miembroRolOperativo", null);
            respuesta.put("miembroEstado", null);
        }

        return respuesta;
    }

    private Map<String, Object> convertirProyectoDesdeAsignacion(
            MiembroProyecto asignacion
    ) {
        Proyecto proyecto = proyectoRepository
                .findById(asignacion.getIdProyecto())
                .orElse(null);

        if (proyecto == null) {
            return null;
        }

        Map<String, Object> respuesta = convertirProyectoSimple(proyecto);

        respuesta.put("rolProyecto", asignacion.getRolProyecto());
        respuesta.put(
                "horasAsignadas",
                asignacion.getHorasAsignadas() != null
                        ? asignacion.getHorasAsignadas()
                        : BigDecimal.ZERO
        );

        return respuesta;
    }

    private Map<String, Object> convertirProyectoSimple(
            Proyecto proyecto
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put("id", proyecto.getId());
        respuesta.put("nombre", catalogoProyectosSepDic2026Service.obtenerNombreVisual(proyecto));
        respuesta.put("nombreInterno", proyecto.getNombre());
        respuesta.put("codigo", proyecto.getCodigo());
        respuesta.put("tipoProyecto", proyecto.getTipoProyecto());
        respuesta.put("estado", proyecto.getEstado());
        respuesta.put("prioridad", proyecto.getPrioridad());
        respuesta.put("porcentajeAvance", proyecto.getPorcentajeAvance());

        List<String> alumnosAsignados =
                catalogoProyectosSepDic2026Service
                        .obtenerNombresAsignados(proyecto.getId());
        respuesta.put("alumnosAsignados", alumnosAsignados);
        respuesta.put(
                "alumnosAsignadosTexto",
                alumnosAsignados.isEmpty() ? null : String.join(", ", alumnosAsignados)
        );

        catalogoProyectosSepDic2026Service
                .obtenerPorCodigo(proyecto.getCodigo())
                .ifPresent(item -> {
                    respuesta.put("catalogoOficial", true);
                    respuesta.put("equipoSepDic2026", item.equipo());
                    respuesta.put("clavesFuente", item.clavesFuente());
                });

        if (!respuesta.containsKey("catalogoOficial")) {
            respuesta.put("catalogoOficial", false);
        }

        return respuesta;
    }

    private String valorODefecto(
            String valor,
            String valorDefecto
    ) {
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