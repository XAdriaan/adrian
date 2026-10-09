package com.jjm.oficina.controller;

import com.jjm.oficina.dto.TareaRequest;
import com.jjm.oficina.modelo.FaseProyecto;
import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.Proyecto;
import com.jjm.oficina.modelo.Tarea;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.FaseProyectoRepository;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.MiembroProyectoRepository;
import com.jjm.oficina.repositorio.ProyectoRepository;
import com.jjm.oficina.repositorio.TareaRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.BitacoraService;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/tareas")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class TareaController {

    private final TareaRepository tareaRepository;
    private final ProyectoRepository proyectoRepository;
    private final FaseProyectoRepository faseProyectoRepository;
    private final MiembroEquipoRepository miembroEquipoRepository;
    private final MiembroProyectoRepository miembroProyectoRepository;
    private final UsuarioRepository usuarioRepository;
    private final BitacoraService bitacoraService;

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
            "Pendiente",
            "En progreso",
            "Bloqueada",
            "Completada"
    );

    private static final Set<String> PRIORIDADES_VALIDAS = Set.of(
            "Baja",
            "Media",
            "Alta",
            "Crítica"
    );

    public TareaController(
            TareaRepository tareaRepository,
            ProyectoRepository proyectoRepository,
            FaseProyectoRepository faseProyectoRepository,
            MiembroEquipoRepository miembroEquipoRepository,
            MiembroProyectoRepository miembroProyectoRepository,
            UsuarioRepository usuarioRepository,
            BitacoraService bitacoraService
    ) {
        this.tareaRepository = tareaRepository;
        this.proyectoRepository = proyectoRepository;
        this.faseProyectoRepository = faseProyectoRepository;
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.miembroProyectoRepository = miembroProyectoRepository;
        this.usuarioRepository = usuarioRepository;
        this.bitacoraService = bitacoraService;
    }

    /*
     * Administrador:
     * - ve todas las tareas.
     *
     * Responsable o colaborador de proyecto:
     * - ve las tareas de los proyectos donde participa.
     *
     * Cliente / consulta:
     * - puede consultar tareas si pertenece al proyecto,
     *   pero no puede crear ni editar.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listarTareas(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para consultar tareas."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        List<Tarea> tareas;

        if (esAdministrador(usuario)) {
            tareas = tareaRepository.findAll(
                    Sort.by(Sort.Direction.DESC, "fechaCreacion")
            );

            respuesta.put("tipoAcceso", "administrador");
        } else {
            MiembroEquipo miembro = obtenerMiembroDesdeUsuario(usuario);

            if (miembro == null) {
                tareas = List.of();
            } else {
                List<Integer> idsProyectosPermitidos =
                        miembroProyectoRepository
                                .findByIdMiembroOrderByFechaAsignacionDesc(
                                        miembro.getId()
                                )
                                .stream()
                                .map(asignacion -> asignacion.getIdProyecto())
                                .distinct()
                                .toList();

                tareas = idsProyectosPermitidos
                        .stream()
                        .flatMap(idProyecto ->
                                tareaRepository
                                        .findByIdProyectoOrderByFechaCreacionDesc(
                                                idProyecto
                                        )
                                        .stream()
                        )
                        .toList();
            }

            respuesta.put("tipoAcceso", "proyectos_asignados");
        }

        respuesta.put("estado", "correcto");
        respuesta.put("total", tareas.size());

        respuesta.put(
                "tareas",
                tareas.stream()
                        .map(this::convertirTarea)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Administrador:
     * - puede consultar cualquier tarea.
     *
     * Responsable, colaborador o usuario de consulta:
     * - puede consultar tareas de proyectos donde participa.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerTarea(
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
                    "No se encontró una sesión válida para consultar la tarea."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        Tarea tarea = tareaRepository.findById(id).orElse(null);

        if (tarea == null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "No se encontró la tarea solicitada.");

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        if (!tieneAccesoAlProyecto(usuario, tarea.getIdProyecto())) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No tienes permiso para consultar esta tarea."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        respuesta.put("estado", "correcto");
        respuesta.put("tarea", convertirTarea(tarea));

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Detalle del proyecto:
     * - administrador ve todas las tareas del proyecto;
     * - responsable, colaborador o consulta asignado al proyecto
     *   puede consultar las tareas del proyecto.
     */
    @GetMapping("/proyecto/{idProyecto}")
    public ResponseEntity<Map<String, Object>> listarTareasPorProyecto(
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
                    "No se encontró una sesión válida para consultar tareas."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!proyectoRepository.existsById(idProyecto)) {
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
                    "No tienes permiso para consultar tareas de este proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        List<Tarea> tareas = tareaRepository
                .findByIdProyectoOrderByFechaCreacionDesc(idProyecto);

        respuesta.put("estado", "correcto");
        respuesta.put("proyectoId", idProyecto);
        respuesta.put("total", tareas.size());

        respuesta.put(
                "tareas",
                tareas.stream()
                        .map(this::convertirTarea)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Crear tarea:
     * - administrador puede crear en cualquier proyecto;
     * - responsable o colaborador puede crear en proyectos donde participa;
     * - cliente / consulta no puede crear tareas.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> crearTarea(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody TareaRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para crear la tarea."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (esUsuarioConsulta(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Los usuarios de consulta no pueden crear tareas."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        if (!tieneAccesoAlProyecto(usuario, datos.getIdProyecto())) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo puedes crear tareas en proyectos donde estás asignado."
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

        Tarea tarea = new Tarea();

        asignarDatosTarea(tarea, datos);

        tarea.setHorasRegistradas(BigDecimal.ZERO);

        Tarea tareaGuardada = tareaRepository.save(tarea);

        recalcularAvanceProyecto(tareaGuardada.getIdProyecto());

        bitacoraService.registrar(
                idUsuarioActivo,
                "TAREAS",
                "CREAR_TAREA",
                "Tarea",
                tareaGuardada.getId(),
                "Se creó la tarea " + tareaGuardada.getTitulo() + ".",
                null,
                resumenTarea(tareaGuardada)
        );

        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Tarea creada correctamente.");
        respuesta.put("tarea", convertirTarea(tareaGuardada));

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    /*
     * Editar tarea:
     * - administrador puede editar cualquier tarea;
     * - responsable o colaborador puede editar tareas de proyectos donde participa;
     * - cliente / consulta no puede editar;
     * - no administrador no puede mover tareas a otro proyecto.
     */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> actualizarTarea(
            @PathVariable Integer id,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody TareaRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para editar la tarea."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (esUsuarioConsulta(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Los usuarios de consulta no pueden editar tareas."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        Tarea tarea = tareaRepository.findById(id).orElse(null);

        if (tarea == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró la tarea que deseas editar."
            );

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        Integer idProyectoAnterior = tarea.getIdProyecto();
        String datosAnteriores = resumenTarea(tarea);

        if (!tieneAccesoAlProyecto(usuario, idProyectoAnterior)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No tienes permiso para editar tareas de este proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        if (
                !esAdministrador(usuario)
                && !idProyectoAnterior.equals(datos.getIdProyecto())
        ) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Un colaborador no puede mover tareas a otro proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        if (
                esAdministrador(usuario)
                && !idProyectoAnterior.equals(datos.getIdProyecto())
                && !proyectoRepository.existsById(datos.getIdProyecto())
        ) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "El nuevo proyecto seleccionado no existe."
            );

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
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

        asignarDatosTarea(tarea, datos);

        if (tarea.getHorasRegistradas() == null) {
            tarea.setHorasRegistradas(BigDecimal.ZERO);
        }

        Tarea tareaActualizada = tareaRepository.save(tarea);

        recalcularAvanceProyecto(idProyectoAnterior);

        if (!idProyectoAnterior.equals(tareaActualizada.getIdProyecto())) {
            recalcularAvanceProyecto(
                    tareaActualizada.getIdProyecto()
            );
        }

        bitacoraService.registrar(
                idUsuarioActivo,
                "TAREAS",
                "EDITAR_TAREA",
                "Tarea",
                tareaActualizada.getId(),
                "Se actualizó la tarea " + tareaActualizada.getTitulo() + ".",
                datosAnteriores,
                resumenTarea(tareaActualizada)
        );

        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Tarea actualizada correctamente.");
        respuesta.put("tarea", convertirTarea(tareaActualizada));

        return ResponseEntity.ok(respuesta);
    }

    private String resumenTarea(
            Tarea tarea
    ) {
        if (tarea == null) {
            return null;
        }

        return "Título: " + tarea.getTitulo() +
                " | Proyecto: " + tarea.getIdProyecto() +
                " | Asignado: " + tarea.getIdMiembroAsignado() +
                " | Estado: " + tarea.getEstado() +
                " | Prioridad: " + tarea.getPrioridad() +
                " | Horas estimadas: " + tarea.getHorasEstimadas() +
                " | Fecha límite: " + tarea.getFechaLimite();
    }

    private void asignarDatosTarea(
            Tarea tarea,
            TareaRequest datos
    ) {
        tarea.setIdProyecto(datos.getIdProyecto());
        tarea.setIdFase(datos.getIdFase());
        tarea.setIdMiembroAsignado(datos.getIdMiembroAsignado());

        tarea.setTitulo(datos.getTitulo().trim());
        tarea.setDescripcion(limpiarTexto(datos.getDescripcion()));

        tarea.setEstado(
                valorODefecto(datos.getEstado(), "Pendiente")
        );

        tarea.setPrioridad(
                valorODefecto(datos.getPrioridad(), "Media")
        );

        BigDecimal horasEstimadas = datos.getHorasEstimadas();

        if (horasEstimadas == null) {
            horasEstimadas = BigDecimal.ZERO;
        }

        tarea.setHorasEstimadas(horasEstimadas);
        tarea.setFechaInicio(datos.getFechaInicio());
        tarea.setFechaLimite(datos.getFechaLimite());
    }

    private String validarDatos(TareaRequest datos) {
        String estado = valorODefecto(datos.getEstado(), "Pendiente");
        String prioridad = valorODefecto(datos.getPrioridad(), "Media");

        if (!ESTADOS_VALIDOS.contains(estado)) {
            return "El estado de la tarea no es válido.";
        }

        if (!PRIORIDADES_VALIDAS.contains(prioridad)) {
            return "La prioridad debe ser Baja, Media, Alta o Crítica.";
        }

        if (
                datos.getFechaInicio() != null
                && datos.getFechaLimite() != null
                && datos.getFechaLimite().isBefore(datos.getFechaInicio())
        ) {
            return "La fecha límite no puede ser anterior a la fecha de inicio.";
        }

        if (
                datos.getHorasEstimadas() != null
                && datos.getHorasEstimadas()
                        .compareTo(BigDecimal.ZERO) < 0
        ) {
            return "Las horas estimadas no pueden ser negativas.";
        }

        Proyecto proyecto = proyectoRepository
                .findById(datos.getIdProyecto())
                .orElse(null);

        if (proyecto == null) {
            return "El proyecto seleccionado no existe.";
        }

        MiembroEquipo miembroAsignado = miembroEquipoRepository
                .findById(datos.getIdMiembroAsignado())
                .orElse(null);

        if (miembroAsignado == null) {
            return "El miembro seleccionado no existe.";
        }

        if (!"Activo".equalsIgnoreCase(miembroAsignado.getEstado())) {
            return "No puedes asignar una tarea a un miembro inactivo.";
        }

        boolean miembroPerteneceAlProyecto =
                miembroProyectoRepository
                        .existsByIdProyectoAndIdMiembro(
                                datos.getIdProyecto(),
                                datos.getIdMiembroAsignado()
                        );

        if (!miembroPerteneceAlProyecto) {
            return "Solo puedes asignar tareas a integrantes que pertenezcan al proyecto seleccionado.";
        }

        if (datos.getIdFase() != null) {
            FaseProyecto fase = faseProyectoRepository
                    .findById(datos.getIdFase())
                    .orElse(null);

            if (fase == null) {
                return "La fase seleccionada no existe.";
            }

            if (!fase.getIdProyecto().equals(datos.getIdProyecto())) {
                return "La fase seleccionada no pertenece al proyecto elegido.";
            }
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

    private void recalcularAvanceProyecto(Integer idProyecto) {
        if (idProyecto == null) {
            return;
        }

        Proyecto proyecto = proyectoRepository.findById(idProyecto)
                .orElse(null);

        if (proyecto == null) {
            return;
        }

        long totalTareas = tareaRepository.countByIdProyecto(idProyecto);

        if (totalTareas == 0) {
            return;
        }

        long tareasCompletadas = tareaRepository
                .countByIdProyectoAndEstado(
                        idProyecto,
                        "Completada"
                );

        BigDecimal avance = BigDecimal.valueOf(tareasCompletadas)
                .multiply(BigDecimal.valueOf(100))
                .divide(
                        BigDecimal.valueOf(totalTareas),
                        2,
                        RoundingMode.HALF_UP
                );

        proyecto.setPorcentajeAvance(avance);

        proyectoRepository.save(proyecto);
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

    private Map<String, Object> convertirTarea(Tarea tarea) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put("id", tarea.getId());
        respuesta.put("idProyecto", tarea.getIdProyecto());
        respuesta.put("idFase", tarea.getIdFase());
        respuesta.put("idMiembroAsignado", tarea.getIdMiembroAsignado());

        respuesta.put("titulo", tarea.getTitulo());
        respuesta.put("descripcion", tarea.getDescripcion());
        respuesta.put("estado", tarea.getEstado());
        respuesta.put("prioridad", tarea.getPrioridad());

        respuesta.put(
                "horasEstimadas",
                tarea.getHorasEstimadas() != null
                        ? tarea.getHorasEstimadas()
                        : BigDecimal.ZERO
        );

        respuesta.put(
                "horasRegistradas",
                tarea.getHorasRegistradas() != null
                        ? tarea.getHorasRegistradas()
                        : BigDecimal.ZERO
        );

        respuesta.put("fechaInicio", tarea.getFechaInicio());
        respuesta.put("fechaLimite", tarea.getFechaLimite());
        respuesta.put("fechaCreacion", tarea.getFechaCreacion());
        respuesta.put(
                "fechaActualizacion",
                tarea.getFechaActualizacion()
        );

        Proyecto proyecto = proyectoRepository
                .findById(tarea.getIdProyecto())
                .orElse(null);

        respuesta.put(
                "proyectoNombre",
                proyecto != null
                        ? proyecto.getNombre()
                        : "Proyecto no disponible"
        );

        if (tarea.getIdFase() != null) {
            FaseProyecto fase = faseProyectoRepository
                    .findById(tarea.getIdFase())
                    .orElse(null);

            respuesta.put(
                    "faseNombre",
                    fase != null
                            ? fase.getNombre()
                            : "Fase no disponible"
            );
        } else {
            respuesta.put("faseNombre", null);
        }

        if (tarea.getIdMiembroAsignado() != null) {
            MiembroEquipo miembro = miembroEquipoRepository
                    .findById(tarea.getIdMiembroAsignado())
                    .orElse(null);

            respuesta.put(
                    "miembroNombre",
                    miembro != null
                            ? miembro.getNombreCompleto()
                            : "Miembro no disponible"
            );

            respuesta.put(
                    "miembroRol",
                    miembro != null
                            ? miembro.getRol()
                            : null
            );

            respuesta.put(
                    "miembroCorreo",
                    miembro != null
                            ? miembro.getCorreo()
                            : null
            );
        } else {
            respuesta.put("miembroNombre", null);
            respuesta.put("miembroRol", null);
            respuesta.put("miembroCorreo", null);
        }

        return respuesta;
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

    private boolean esUsuarioConsulta(Usuario usuario) {
        if (
                usuario == null ||
                usuario.getRol() == null ||
                !"Activo".equalsIgnoreCase(usuario.getEstado())
        ) {
            return false;
        }

        String rol = normalizarTexto(usuario.getRol().getNombre());

        return rol.equals("cliente") ||
                rol.equals("consulta") ||
                rol.equals("usuario de consulta") ||
                rol.equals("enlace universidad") ||
                rol.equals("enlace de universidad") ||
                rol.equals("enlace empresa") ||
                rol.equals("enlace de empresa");
    }

    private Usuario obtenerUsuario(Integer idUsuarioActivo) {
        if (idUsuarioActivo == null) {
            return null;
        }

        Optional<Usuario> usuarioEncontrado =
                usuarioRepository.findById(idUsuarioActivo);

        return usuarioEncontrado.orElse(null);
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