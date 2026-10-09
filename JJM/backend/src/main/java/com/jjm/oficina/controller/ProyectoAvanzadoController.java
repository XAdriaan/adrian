package com.jjm.oficina.controller;

import com.jjm.oficina.dto.FaseAvanzadaRequest;
import com.jjm.oficina.dto.ProyectoAvanzadoRequest;
import com.jjm.oficina.modelo.FaseProyecto;
import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.Organizacion;
import com.jjm.oficina.modelo.Proyecto;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.FaseProyectoRepository;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.OrganizacionRepository;
import com.jjm.oficina.repositorio.ProyectoRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/proyectos/avanzados")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ProyectoAvanzadoController {

    private final ProyectoRepository proyectoRepository;
    private final FaseProyectoRepository faseProyectoRepository;
    private final OrganizacionRepository organizacionRepository;
    private final MiembroEquipoRepository miembroEquipoRepository;
    private final UsuarioRepository usuarioRepository;

    private static final Set<String> ESTADOS_PROYECTO_VALIDOS = Set.of(
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

    private static final Set<String> CLASIFICACIONES_VALIDAS = Set.of(
            "Interno",
            "Externo"
    );

    private static final Set<String> ESTADOS_FASE_VALIDOS = Set.of(
            "No iniciado",
            "Pendiente",
            "En proceso",
            "Completado",
            "No entregado"
    );

    public ProyectoAvanzadoController(
            ProyectoRepository proyectoRepository,
            FaseProyectoRepository faseProyectoRepository,
            OrganizacionRepository organizacionRepository,
            MiembroEquipoRepository miembroEquipoRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.proyectoRepository = proyectoRepository;
        this.faseProyectoRepository = faseProyectoRepository;
        this.organizacionRepository = organizacionRepository;
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /*
     * Crear proyecto avanzado:
     * - Solo Administrador.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> crearProyectoAvanzado(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody ProyectoAvanzadoRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida para crear el proyecto avanzado."
            );
        }

        if (!esAdministrador(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Solo un administrador puede crear proyectos avanzados."
            );
        }

        String validacion = validarDatos(datos, null);

        if (validacion != null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    validacion
            );
        }

        Proyecto proyecto = new Proyecto();

        asignarDatosProyecto(proyecto, datos);

        proyecto.setTipoProyecto("Avanzado");
        proyecto.setPorcentajeAvance(
                calcularAvanceGeneral(datos.getFases())
        );

        if (proyecto.getCodigo() == null || proyecto.getCodigo().isBlank()) {
            proyecto.setCodigo(generarCodigoProyecto());
        }

        Proyecto proyectoGuardado = proyectoRepository.save(proyecto);

        guardarFasesProyecto(
                proyectoGuardado.getId(),
                datos.getFases()
        );

        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Proyecto avanzado guardado correctamente.");
        respuesta.put(
                "proyecto",
                convertirProyectoAvanzado(proyectoGuardado)
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    /*
     * Consultar proyecto avanzado:
     * - Solo Administrador.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerProyectoAvanzado(
            @PathVariable Integer id,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida para consultar el proyecto avanzado."
            );
        }

        if (!esAdministrador(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Solo un administrador puede consultar proyectos avanzados."
            );
        }

        Proyecto proyecto = proyectoRepository.findById(id).orElse(null);

        if (proyecto == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.NOT_FOUND,
                    "No se encontró el proyecto solicitado."
            );
        }

        if (!"Avanzado".equalsIgnoreCase(proyecto.getTipoProyecto())) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "El proyecto solicitado no es de tipo avanzado."
            );
        }

        respuesta.put("estado", "correcto");
        respuesta.put("proyecto", convertirProyectoAvanzado(proyecto));

        return ResponseEntity.ok(respuesta);
    }

    /*
     * Editar proyecto avanzado:
     * - Solo Administrador.
     */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> actualizarProyectoAvanzado(
            @PathVariable Integer id,

            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @Valid @RequestBody ProyectoAvanzadoRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida para editar el proyecto avanzado."
            );
        }

        if (!esAdministrador(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Solo un administrador puede editar proyectos avanzados."
            );
        }

        Proyecto proyecto = proyectoRepository.findById(id).orElse(null);

        if (proyecto == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.NOT_FOUND,
                    "No se encontró el proyecto avanzado solicitado."
            );
        }

        if (!"Avanzado".equalsIgnoreCase(proyecto.getTipoProyecto())) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "El proyecto indicado no es de tipo avanzado."
            );
        }

        String validacion = validarDatos(datos, proyecto);

        if (validacion != null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    validacion
            );
        }

        asignarDatosProyecto(proyecto, datos);

        proyecto.setTipoProyecto("Avanzado");
        proyecto.setPorcentajeAvance(
                calcularAvanceGeneral(datos.getFases())
        );

        if (proyecto.getCodigo() == null || proyecto.getCodigo().isBlank()) {
            proyecto.setCodigo(generarCodigoProyecto());
        }

        Proyecto proyectoActualizado = proyectoRepository.save(proyecto);

        faseProyectoRepository.deleteByIdProyecto(id);

        guardarFasesProyecto(
                proyectoActualizado.getId(),
                datos.getFases()
        );

        respuesta.put("estado", "correcto");
        respuesta.put(
                "mensaje",
                "Proyecto avanzado actualizado correctamente."
        );
        respuesta.put(
                "proyecto",
                convertirProyectoAvanzado(proyectoActualizado)
        );

        return ResponseEntity.ok(respuesta);
    }

    private void asignarDatosProyecto(
            Proyecto proyecto,
            ProyectoAvanzadoRequest datos
    ) {
        proyecto.setIdOrganizacion(datos.getIdOrganizacion());
        proyecto.setIdResponsable(datos.getIdResponsable());

        proyecto.setNombre(datos.getNombre().trim());
        proyecto.setCodigo(limpiarTexto(datos.getCodigo()));
        proyecto.setDescripcion(limpiarTexto(datos.getDescripcion()));
        proyecto.setClienteArea(limpiarTexto(datos.getClienteArea()));

        proyecto.setClasificacionProyecto(
                valorODefecto(
                        datos.getClasificacionProyecto(),
                        "Externo"
                )
        );

        proyecto.setEstado(
                valorODefecto(datos.getEstado(), "Ejecución")
        );

        proyecto.setPrioridad(
                valorODefecto(datos.getPrioridad(), "Media")
        );

        proyecto.setFechaInicio(datos.getFechaInicio());
        proyecto.setFechaFin(datos.getFechaFin());

        proyecto.setObservacionesGenerales(
                limpiarTexto(datos.getObservacionesGenerales())
        );
    }

    private void guardarFasesProyecto(
            Integer idProyecto,
            List<FaseAvanzadaRequest> fases
    ) {
        if (fases == null || fases.isEmpty()) {
            return;
        }

        for (FaseAvanzadaRequest faseRequest : fases) {
            FaseProyecto fase = crearEntidadFase(
                    idProyecto,
                    null,
                    faseRequest
            );

            FaseProyecto faseGuardada =
                    faseProyectoRepository.save(fase);

            if (
                    faseRequest.getSubfases() != null
                    && !faseRequest.getSubfases().isEmpty()
            ) {
                for (FaseAvanzadaRequest subfaseRequest
                        : faseRequest.getSubfases()) {

                    FaseProyecto subfase = crearEntidadFase(
                            idProyecto,
                            faseGuardada.getId(),
                            subfaseRequest
                    );

                    faseProyectoRepository.save(subfase);
                }
            }
        }
    }

    private FaseProyecto crearEntidadFase(
            Integer idProyecto,
            Integer idFasePadre,
            FaseAvanzadaRequest datos
    ) {
        FaseProyecto fase = new FaseProyecto();

        fase.setIdProyecto(idProyecto);
        fase.setIdFasePadre(idFasePadre);

        fase.setNombre(datos.getNombre().trim());
        fase.setNumeroOrden(limpiarTexto(datos.getNumeroOrden()));

        fase.setEstado(
                valorODefecto(datos.getEstado(), "No iniciado")
        );

        fase.setPorcentajeAvance(
                calcularPorcentajePorEstado(datos.getEstado())
        );

        fase.setFechaProgramada(datos.getFechaProgramada());
        fase.setFechaReal(datos.getFechaReal());

        fase.setObservaciones(
                limpiarTexto(datos.getObservaciones())
        );

        return fase;
    }

    private String validarDatos(
            ProyectoAvanzadoRequest datos,
            Proyecto proyectoActual
    ) {
        String estado = valorODefecto(datos.getEstado(), "Ejecución");
        String prioridad = valorODefecto(datos.getPrioridad(), "Media");
        String clasificacion = valorODefecto(
                datos.getClasificacionProyecto(),
                "Externo"
        );

        if (!ESTADOS_PROYECTO_VALIDOS.contains(estado)) {
            return "El estado del proyecto no es válido.";
        }

        if (!PRIORIDADES_VALIDAS.contains(prioridad)) {
            return "La prioridad debe ser Baja, Media, Alta o Crítica.";
        }

        if (!CLASIFICACIONES_VALIDAS.contains(clasificacion)) {
            return "La clasificación del proyecto debe ser Interno o Externo.";
        }

        if (
                datos.getFechaInicio() != null
                && datos.getFechaFin() != null
                && datos.getFechaFin().isBefore(datos.getFechaInicio())
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

            boolean esCodigoDelMismoProyecto =
                    proyectoActual != null
                    && proyectoActual.getCodigo() != null
                    && codigo.equalsIgnoreCase(
                            proyectoActual.getCodigo()
                    );

            if (codigoYaExiste && !esCodigoDelMismoProyecto) {
                return "El código de proyecto ya está registrado. Usa otro código o deja el campo vacío para generarlo automáticamente.";
            }
        }

        if (datos.getFases() != null) {
            for (FaseAvanzadaRequest fase : datos.getFases()) {
                String errorFase = validarFase(fase);

                if (errorFase != null) {
                    return errorFase;
                }
            }
        }

        return null;
    }

    private String validarFase(FaseAvanzadaRequest fase) {
        if (
                fase.getNombre() == null
                || fase.getNombre().isBlank()
        ) {
            return "Todas las fases deben tener nombre.";
        }

        String estado = valorODefecto(
                fase.getEstado(),
                "No iniciado"
        );

        if (!ESTADOS_FASE_VALIDOS.contains(estado)) {
            return "El estado de una fase no es válido.";
        }

        if (
                fase.getFechaProgramada() != null
                && fase.getFechaReal() != null
                && fase.getFechaReal()
                        .isBefore(fase.getFechaProgramada())
        ) {
            return "La fecha real de una fase no puede ser anterior a la fecha programada.";
        }

        if (fase.getSubfases() != null) {
            for (FaseAvanzadaRequest subfase : fase.getSubfases()) {
                String errorSubfase = validarFase(subfase);

                if (errorSubfase != null) {
                    return errorSubfase;
                }
            }
        }

        return null;
    }

    private BigDecimal calcularAvanceGeneral(
            List<FaseAvanzadaRequest> fases
    ) {
        if (fases == null || fases.isEmpty()) {
            return BigDecimal.ZERO;
        }

        List<BigDecimal> avances = new ArrayList<>();

        for (FaseAvanzadaRequest fase : fases) {
            avances.add(
                    calcularPorcentajePorEstado(fase.getEstado())
            );

            if (fase.getSubfases() != null) {
                for (FaseAvanzadaRequest subfase
                        : fase.getSubfases()) {

                    avances.add(
                            calcularPorcentajePorEstado(
                                    subfase.getEstado()
                            )
                    );
                }
            }
        }

        if (avances.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal suma = avances.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return suma.divide(
                BigDecimal.valueOf(avances.size()),
                2,
                RoundingMode.HALF_UP
        );
    }

    private BigDecimal calcularPorcentajePorEstado(String estado) {
        String estadoFinal = valorODefecto(
                estado,
                "No iniciado"
        );

        return switch (estadoFinal) {
            case "Completado" -> BigDecimal.valueOf(100);
            case "En proceso" -> BigDecimal.valueOf(50);
            case "Pendiente" -> BigDecimal.valueOf(25);
            case "No entregado" -> BigDecimal.ZERO;
            default -> BigDecimal.ZERO;
        };
    }

    private Map<String, Object> convertirProyectoAvanzado(
            Proyecto proyecto
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put("id", proyecto.getId());
        respuesta.put("idOrganizacion", proyecto.getIdOrganizacion());
        respuesta.put("idResponsable", proyecto.getIdResponsable());

        respuesta.put("nombre", proyecto.getNombre());
        respuesta.put("codigo", proyecto.getCodigo());
        respuesta.put("descripcion", proyecto.getDescripcion());
        respuesta.put("clienteArea", proyecto.getClienteArea());

        respuesta.put(
                "clasificacionProyecto",
                proyecto.getClasificacionProyecto()
        );

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

        respuesta.put(
                "observacionesGenerales",
                proyecto.getObservacionesGenerales()
        );

        respuesta.put(
                "fases",
                convertirFasesProyecto(proyecto.getId())
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
                            : null
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
                            : null
            );
        } else {
            respuesta.put("responsableNombre", null);
        }

        return respuesta;
    }

    private List<Map<String, Object>> convertirFasesProyecto(
            Integer idProyecto
    ) {
        List<FaseProyecto> fases =
                faseProyectoRepository
                        .findByIdProyectoOrderByNumeroOrdenAsc(idProyecto);

        Map<Integer, Map<String, Object>> mapaFases =
                new LinkedHashMap<>();

        List<Map<String, Object>> fasesPrincipales =
                new ArrayList<>();

        for (FaseProyecto fase : fases) {
            Map<String, Object> faseMap = new LinkedHashMap<>();

            faseMap.put("id", fase.getId());
            faseMap.put("nombre", fase.getNombre());
            faseMap.put("numeroOrden", fase.getNumeroOrden());
            faseMap.put("estado", fase.getEstado());

            faseMap.put(
                    "porcentajeAvance",
                    fase.getPorcentajeAvance() != null
                            ? fase.getPorcentajeAvance()
                            : BigDecimal.ZERO
            );

            faseMap.put(
                    "fechaProgramada",
                    fase.getFechaProgramada()
            );

            faseMap.put("fechaReal", fase.getFechaReal());
            faseMap.put("observaciones", fase.getObservaciones());

            faseMap.put("subfases", new ArrayList<Map<String, Object>>());

            mapaFases.put(fase.getId(), faseMap);

            if (fase.getIdFasePadre() == null) {
                fasesPrincipales.add(faseMap);
            }
        }

        for (FaseProyecto fase : fases) {
            if (fase.getIdFasePadre() != null) {
                Map<String, Object> padre =
                        mapaFases.get(fase.getIdFasePadre());

                Map<String, Object> subfase =
                        mapaFases.get(fase.getId());

                if (padre != null && subfase != null) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> subfases =
                            (List<Map<String, Object>>) padre.get(
                                    "subfases"
                            );

                    subfases.add(subfase);
                }
            }
        }

        return fasesPrincipales;
    }

    private Usuario obtenerUsuario(Integer idUsuarioActivo) {
        if (idUsuarioActivo == null) {
            return null;
        }

        return usuarioRepository
                .findById(idUsuarioActivo)
                .orElse(null);
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

    private String generarCodigoProyecto() {
        String codigo;

        do {
            long marcaTiempo =
                    System.currentTimeMillis() % 1_000_000_000L;

            codigo = "PAV-" + marcaTiempo;
        } while (proyectoRepository.existsByCodigo(codigo));

        return codigo;
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

    private ResponseEntity<Map<String, Object>> respuestaError(
            Map<String, Object> respuesta,
            HttpStatus estadoHttp,
            String mensaje
    ) {
        respuesta.put("estado", "error");
        respuesta.put("mensaje", mensaje);

        return ResponseEntity
                .status(estadoHttp)
                .body(respuesta);
    }
}