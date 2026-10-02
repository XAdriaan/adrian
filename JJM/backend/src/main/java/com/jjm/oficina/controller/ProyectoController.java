package com.jjm.oficina.controller;

import com.jjm.oficina.dto.ProyectoRequest;
import com.jjm.oficina.modelo.FaseProyecto;
import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.MiembroProyecto;
import com.jjm.oficina.modelo.Organizacion;
import com.jjm.oficina.modelo.Proyecto;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.FaseProyectoRepository;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.MiembroProyectoRepository;
import com.jjm.oficina.repositorio.OrganizacionRepository;
import com.jjm.oficina.repositorio.ProyectoRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.BitacoraService;
import com.jjm.oficina.servicio.CatalogoProyectosSepDic2026Service;

import jakarta.transaction.Transactional;
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
@RequestMapping("/api/proyectos")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ProyectoController {

    private final ProyectoRepository proyectoRepository;
    private final OrganizacionRepository organizacionRepository;
    private final MiembroEquipoRepository miembroEquipoRepository;
    private final MiembroProyectoRepository miembroProyectoRepository;
    private final FaseProyectoRepository faseProyectoRepository;
    private final UsuarioRepository usuarioRepository;
    private final BitacoraService bitacoraService;
    private final CatalogoProyectosSepDic2026Service catalogoProyectosSepDic2026Service;

    private static final Set<String> TIPOS_VALIDOS = Set.of(
            "Normal",
            "Avanzado"
    );

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
            "Propuesto",
            "Inicio",
            "Planificación",
            "Ejecución",
            "Monitoreo",
            "Cierre",
            "Cerrado",
            "Cancelado"
    );

    private static final Set<String> PRIORIDADES_VALIDAS = Set.of(
            "Baja",
            "Media",
            "Alta",
            "Crítica"
    );

    private static final List<String> FASES_BASE_PMO = List.of(
            "Levantamiento de requerimientos",
            "Identificación de los requerimientos e infraestructura",
            "Diseño",
            "Desarrollo",
            "Pruebas",
            "Validación por parte del Cliente",
            "Implementación",
            "Capacitación",
            "Documentación de la Solución Tecnológica",
            "Manual de Usuario",
            "Manual Técnico",
            "Manual de Administrador",
            "Código Integral",
            "Código Ejecutable",
            "Evaluación y liberación por parte del cliente",
            "Cierre",
            "Lista de Chequeo de Cumplimiento",
            "Liberación de Carta de Término / Contestación Cuestionarios",
            "F2",
            "F7",
            "F8"
    );

    public ProyectoController(
            ProyectoRepository proyectoRepository,
            OrganizacionRepository organizacionRepository,
            MiembroEquipoRepository miembroEquipoRepository,
            MiembroProyectoRepository miembroProyectoRepository,
            FaseProyectoRepository faseProyectoRepository,
            UsuarioRepository usuarioRepository,
            BitacoraService bitacoraService,
            CatalogoProyectosSepDic2026Service catalogoProyectosSepDic2026Service
    ) {
        this.proyectoRepository = proyectoRepository;
        this.organizacionRepository = organizacionRepository;
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.miembroProyectoRepository = miembroProyectoRepository;
        this.faseProyectoRepository = faseProyectoRepository;
        this.usuarioRepository = usuarioRepository;
        this.bitacoraService = bitacoraService;
        this.catalogoProyectosSepDic2026Service = catalogoProyectosSepDic2026Service;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listarProyectos(
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

        List<Proyecto> proyectos;

        if (esAdministrador(usuario)) {
            proyectos = proyectoRepository.findAll(
                    Sort.by(Sort.Direction.DESC, "fechaCreacion")
            );

            respuesta.put("tipoAcceso", "administrador");

        } else {
            MiembroEquipo miembro = obtenerMiembroDesdeUsuario(usuario);

            if (miembro == null) {
                proyectos = List.of();
            } else {
                List<MiembroProyecto> asignaciones =
                        miembroProyectoRepository
                                .findByIdMiembroOrderByFechaAsignacionDesc(
                                        miembro.getId()
                                );

                proyectos = asignaciones.stream()
                        .map(asignacion ->
                                proyectoRepository
                                        .findById(asignacion.getIdProyecto())
                                        .orElse(null)
                        )
                        .filter(proyecto -> proyecto != null)
                        .toList();
            }

            respuesta.put("tipoAcceso", "proyectos_asignados");
        }

        respuesta.put("estado", "correcto");
        respuesta.put("total", proyectos.size());

        respuesta.put(
                "proyectos",
                proyectos.stream()
                        .map(this::convertirProyecto)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerProyecto(
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
                    "No se encontró una sesión válida para consultar el proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        Proyecto proyecto = proyectoRepository.findById(id).orElse(null);

        if (proyecto == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró el proyecto solicitado."
            );

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        if (!tieneAccesoAlProyecto(usuario, id)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No tienes permiso para consultar este proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        respuesta.put("estado", "correcto");
        respuesta.put("proyecto", convertirProyecto(proyecto));

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/{id}/fases")
    @Transactional
    public ResponseEntity<Map<String, Object>> listarFasesProyecto(
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
                    "No se encontró una sesión válida para consultar fases."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        Proyecto proyecto = proyectoRepository.findById(id).orElse(null);

        if (proyecto == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "El proyecto seleccionado no existe."
            );

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        if (!tieneAccesoAlProyecto(usuario, id)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No tienes permiso para consultar las fases de este proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        if ("Normal".equalsIgnoreCase(proyecto.getTipoProyecto())) {
            crearFasesBaseProyecto(proyecto);
        }

        List<FaseProyecto> fases = faseProyectoRepository
                .findByIdProyectoOrderByNumeroOrdenAsc(id);

        respuesta.put("estado", "correcto");
        respuesta.put("proyectoId", id);
        respuesta.put("total", fases.size());

        respuesta.put(
                "fases",
                fases.stream()
                        .map(this::convertirFase)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> crearProyecto(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody ProyectoRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo un administrador puede crear proyectos."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        String validacion = validarDatos(datos, null);

        if (validacion != null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", validacion);

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(respuesta);
        }

        Proyecto proyecto = new Proyecto();

        asignarDatos(proyecto, datos);

        if (proyecto.getCodigo() == null || proyecto.getCodigo().isBlank()) {
            proyecto.setCodigo(generarCodigoProyecto());
        }

        proyecto.setPorcentajeAvance(BigDecimal.ZERO);

        Proyecto proyectoGuardado = proyectoRepository.save(proyecto);

        if ("Normal".equalsIgnoreCase(proyectoGuardado.getTipoProyecto())) {
            crearFasesBaseProyecto(proyectoGuardado);
        }

        asignarResponsableAlProyecto(proyectoGuardado);

        bitacoraService.registrar(
                idUsuarioActivo,
                "PROYECTOS",
                "CREAR_PROYECTO",
                "Proyecto",
                proyectoGuardado.getId(),
                "Se creó el proyecto " + proyectoGuardado.getNombre() + ".",
                null,
                resumenProyecto(proyectoGuardado)
        );

        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Proyecto creado correctamente.");
        respuesta.put("proyecto", convertirProyecto(proyectoGuardado));

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> actualizarProyecto(
            @PathVariable Integer id,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody ProyectoRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para editar el proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        Proyecto proyecto = proyectoRepository.findById(id).orElse(null);

        if (proyecto == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró el proyecto que deseas editar."
            );

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(respuesta);
        }

        boolean administrador = esAdministrador(usuario);
        boolean responsable = esResponsableDelProyecto(usuario, proyecto);

        if (!administrador && !responsable) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo el administrador o el responsable del proyecto puede editar este proyecto."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        if (esUsuarioConsulta(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Los usuarios de consulta no pueden editar proyectos."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        String datosAnteriores = resumenProyecto(proyecto);

        String validacion = validarDatos(datos, proyecto);

        if (validacion != null) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", validacion);

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(respuesta);
        }

        Integer responsableOriginal = proyecto.getIdResponsable();
        Integer organizacionOriginal = proyecto.getIdOrganizacion();
        String tipoOriginal = proyecto.getTipoProyecto();

        asignarDatos(proyecto, datos);

        /*
         * Si edita el responsable del proyecto y no es administrador,
         * se conservan campos administrativos.
         */
        if (!administrador) {
            proyecto.setIdResponsable(responsableOriginal);
            proyecto.setIdOrganizacion(organizacionOriginal);
            proyecto.setTipoProyecto(tipoOriginal);
        }

        if (proyecto.getCodigo() == null || proyecto.getCodigo().isBlank()) {
            proyecto.setCodigo(generarCodigoProyecto());
        }

        Proyecto proyectoActualizado = proyectoRepository.save(proyecto);

        if ("Normal".equalsIgnoreCase(proyectoActualizado.getTipoProyecto())) {
            crearFasesBaseProyecto(proyectoActualizado);
        }

        if (administrador) {
            asignarResponsableAlProyecto(proyectoActualizado);
        }

        bitacoraService.registrar(
                idUsuarioActivo,
                "PROYECTOS",
                "EDITAR_PROYECTO",
                "Proyecto",
                proyectoActualizado.getId(),
                "Se actualizó el proyecto " + proyectoActualizado.getNombre() + ".",
                datosAnteriores,
                resumenProyecto(proyectoActualizado)
        );

        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Proyecto actualizado correctamente.");
        respuesta.put("proyecto", convertirProyecto(proyectoActualizado));

        return ResponseEntity.ok(respuesta);
    }

    private String resumenProyecto(
            Proyecto proyecto
    ) {
        if (proyecto == null) {
            return null;
        }

        return "Nombre: " + proyecto.getNombre() +
                " | Código: " + proyecto.getCodigo() +
                " | Estado: " + proyecto.getEstado() +
                " | Prioridad: " + proyecto.getPrioridad() +
                " | Inicio: " + proyecto.getFechaInicio() +
                " | Fin: " + proyecto.getFechaFin() +
                " | Avance: " + proyecto.getPorcentajeAvance();
    }

    private void crearFasesBaseProyecto(Proyecto proyecto) {
        List<FaseProyecto> fasesExistentes = faseProyectoRepository
                .findByIdProyectoOrderByNumeroOrdenAsc(proyecto.getId());

        if (!fasesExistentes.isEmpty()) {
            return;
        }

        int orden = 1;

        for (String nombreFase : FASES_BASE_PMO) {
            FaseProyecto fase = new FaseProyecto();

            fase.setIdProyecto(proyecto.getId());
            fase.setIdFasePadre(null);
            fase.setNombre(nombreFase);
            fase.setNumeroOrden(String.valueOf(orden));
            fase.setEstado("No iniciado");
            fase.setPorcentajeAvance(BigDecimal.ZERO);
            fase.setFechaProgramada(null);
            fase.setFechaReal(null);
            fase.setObservaciones(null);

            faseProyectoRepository.save(fase);

            orden++;
        }
    }

    private void asignarResponsableAlProyecto(Proyecto proyecto) {
        if (
                proyecto.getId() == null ||
                proyecto.getIdResponsable() == null
        ) {
            return;
        }

        boolean yaAsignado =
                miembroProyectoRepository
                        .existsByIdProyectoAndIdMiembro(
                                proyecto.getId(),
                                proyecto.getIdResponsable()
                        );

        if (yaAsignado) {
            return;
        }

        MiembroProyecto asignacion = new MiembroProyecto();

        asignacion.setIdProyecto(proyecto.getId());
        asignacion.setIdMiembro(proyecto.getIdResponsable());
        asignacion.setRolProyecto("Responsable del proyecto");
        asignacion.setHorasAsignadas(BigDecimal.ZERO);
        asignacion.setNotas(
                "Asignación automática al establecerlo como responsable."
        );

        miembroProyectoRepository.save(asignacion);
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

    private boolean esResponsableDelProyecto(
            Usuario usuario,
            Proyecto proyecto
    ) {
        if (
                usuario == null ||
                proyecto == null ||
                proyecto.getIdResponsable() == null
        ) {
            return false;
        }

        MiembroEquipo miembro = obtenerMiembroDesdeUsuario(usuario);

        if (miembro == null) {
            return false;
        }

        return proyecto.getIdResponsable().equals(miembro.getId());
    }

    private void asignarDatos(
            Proyecto proyecto,
            ProyectoRequest datos
    ) {
        proyecto.setIdOrganizacion(datos.getIdOrganizacion());
        proyecto.setIdResponsable(datos.getIdResponsable());

        proyecto.setNombre(datos.getNombre().trim());
        proyecto.setCodigo(limpiarTexto(datos.getCodigo()));
        proyecto.setDescripcion(limpiarTexto(datos.getDescripcion()));
        proyecto.setClienteArea(limpiarTexto(datos.getClienteArea()));

        proyecto.setTipoProyecto(
                valorODefecto(datos.getTipoProyecto(), "Normal")
        );

        proyecto.setEstado(
                valorODefecto(datos.getEstado(), "Propuesto")
        );

        proyecto.setPrioridad(
                valorODefecto(datos.getPrioridad(), "Media")
        );

        proyecto.setFechaInicio(datos.getFechaInicio());
        proyecto.setFechaFin(datos.getFechaFin());

        if (proyecto.getPorcentajeAvance() == null) {
            proyecto.setPorcentajeAvance(BigDecimal.ZERO);
        }
    }

    private String validarDatos(
            ProyectoRequest datos,
            Proyecto proyectoActual
    ) {
        String tipo = valorODefecto(datos.getTipoProyecto(), "Normal");
        String estado = valorODefecto(datos.getEstado(), "Propuesto");
        String prioridad = valorODefecto(datos.getPrioridad(), "Media");

        if (!TIPOS_VALIDOS.contains(tipo)) {
            return "El tipo de proyecto debe ser Normal o Avanzado.";
        }

        if (!ESTADOS_VALIDOS.contains(estado)) {
            return "El estado del proyecto no es válido.";
        }

        if (!PRIORIDADES_VALIDAS.contains(prioridad)) {
            return "La prioridad debe ser Baja, Media, Alta o Crítica.";
        }

        if (
                datos.getFechaInicio() != null &&
                datos.getFechaFin() != null &&
                datos.getFechaFin().isBefore(datos.getFechaInicio())
        ) {
            return "La fecha final no puede ser anterior a la fecha de inicio.";
        }

        if (datos.getIdOrganizacion() != null) {
            boolean existeOrganizacion =
                    organizacionRepository.existsById(
                            datos.getIdOrganizacion()
                    );

            if (!existeOrganizacion) {
                return "La organización seleccionada no existe.";
            }
        }

        if (datos.getIdResponsable() != null) {
            boolean existeResponsable =
                    miembroEquipoRepository.existsById(
                            datos.getIdResponsable()
                    );

            if (!existeResponsable) {
                return "El responsable seleccionado no existe.";
            }
        }

        String codigo = limpiarTexto(datos.getCodigo());

        if (codigo != null) {
            boolean codigoYaExiste =
                    proyectoRepository.existsByCodigo(codigo);

            boolean mismoProyecto =
                    proyectoActual != null &&
                    codigo.equalsIgnoreCase(
                            proyectoActual.getCodigo()
                    );

            if (codigoYaExiste && !mismoProyecto) {
                return "El código de proyecto ya está registrado.";
            }
        }

        return null;
    }

    private String generarCodigoProyecto() {
        String codigo;

        do {
            long marcaTiempo = System.currentTimeMillis()
                    % 1_000_000_000L;

            codigo = "PRY-" + marcaTiempo;

        } while (proyectoRepository.existsByCodigo(codigo));

        return codigo;
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

    private MiembroEquipo obtenerMiembroDesdeUsuario(Usuario usuario) {
        if (usuario == null) {
            return null;
        }

        return miembroEquipoRepository
                .findByUsuarioId(usuario.getId())
                .orElse(null);
    }

    private Map<String, Object> convertirFase(FaseProyecto fase) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put("id", fase.getId());
        respuesta.put("idProyecto", fase.getIdProyecto());
        respuesta.put("idFasePadre", fase.getIdFasePadre());
        respuesta.put("nombre", fase.getNombre());
        respuesta.put("numeroOrden", fase.getNumeroOrden());
        respuesta.put("estado", fase.getEstado());

        respuesta.put(
                "porcentajeAvance",
                fase.getPorcentajeAvance() != null
                        ? fase.getPorcentajeAvance()
                        : BigDecimal.ZERO
        );

        respuesta.put("fechaProgramada", fase.getFechaProgramada());
        respuesta.put("fechaReal", fase.getFechaReal());
        respuesta.put("observaciones", fase.getObservaciones());

        return respuesta;
    }

    private Map<String, Object> convertirProyecto(Proyecto proyecto) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put("id", proyecto.getId());
        respuesta.put("idOrganizacion", proyecto.getIdOrganizacion());
        respuesta.put("idResponsable", proyecto.getIdResponsable());

        respuesta.put("nombre", catalogoProyectosSepDic2026Service.obtenerNombreVisual(proyecto));
        respuesta.put("nombreInterno", proyecto.getNombre());
        respuesta.put("codigo", proyecto.getCodigo());
        respuesta.put("descripcion", proyecto.getDescripcion());
        respuesta.put("clienteArea", proyecto.getClienteArea());
        respuesta.put("tipoProyecto", proyecto.getTipoProyecto());
        respuesta.put("estado", proyecto.getEstado());
        respuesta.put("prioridad", proyecto.getPrioridad());
        respuesta.put("fechaInicio", proyecto.getFechaInicio());
        respuesta.put("fechaFin", proyecto.getFechaFin());

        respuesta.put(
                "porcentajeAvance",
                proyecto.getPorcentajeAvance() != null
                        ? proyecto.getPorcentajeAvance()
                        : BigDecimal.ZERO
        );

        respuesta.put("fechaCreacion", proyecto.getFechaCreacion());
        respuesta.put(
                "fechaActualizacion",
                proyecto.getFechaActualizacion()
        );

        if (proyecto.getIdOrganizacion() != null) {
            Organizacion organizacion =
                    organizacionRepository
                            .findById(proyecto.getIdOrganizacion())
                            .orElse(null);

            respuesta.put(
                    "organizacionNombre",
                    organizacion != null
                            ? organizacion.getNombre()
                            : "Organización no disponible"
            );
        } else {
            respuesta.put("organizacionNombre", null);
        }

        if (proyecto.getIdResponsable() != null) {
            MiembroEquipo responsable =
                    miembroEquipoRepository
                            .findById(proyecto.getIdResponsable())
                            .orElse(null);

            respuesta.put(
                    "responsableNombre",
                    responsable != null
                            ? responsable.getNombreCompleto()
                            : "Responsable no disponible"
            );
        } else {
            respuesta.put("responsableNombre", null);
        }

        List<String> alumnosAsignados =
                catalogoProyectosSepDic2026Service
                        .obtenerNombresAsignados(proyecto.getId());

        respuesta.put("alumnosAsignados", alumnosAsignados);
        respuesta.put(
                "alumnosAsignadosTexto",
                alumnosAsignados.isEmpty()
                        ? null
                        : String.join(", ", alumnosAsignados)
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