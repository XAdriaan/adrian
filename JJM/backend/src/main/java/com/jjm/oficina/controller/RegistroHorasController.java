package com.jjm.oficina.controller;

import com.jjm.oficina.dto.RegistroHorasRequest;
import com.jjm.oficina.dto.ValidacionHorasRequest;
import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.MiembroProyecto;
import com.jjm.oficina.modelo.Proyecto;
import com.jjm.oficina.modelo.RegistroHoras;
import com.jjm.oficina.modelo.Tarea;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.MiembroProyectoRepository;
import com.jjm.oficina.repositorio.ProyectoRepository;
import com.jjm.oficina.repositorio.RegistroHorasRepository;
import com.jjm.oficina.repositorio.TareaRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.BitacoraService;

import jakarta.transaction.Transactional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/registros-horas")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class RegistroHorasController {

    private final RegistroHorasRepository registroHorasRepository;
    private final MiembroEquipoRepository miembroEquipoRepository;
    private final MiembroProyectoRepository miembroProyectoRepository;
    private final ProyectoRepository proyectoRepository;
    private final TareaRepository tareaRepository;
    private final UsuarioRepository usuarioRepository;
    private final BitacoraService bitacoraService;

    private static final Set<String> INCIDENTES_VALIDOS = Set.of(
            "normal",
            "justificado",
            "no_justificado",
            "recuperacion",
            "festivo",
            "fin_semana"
    );

    private static final Set<String> ESTADOS_VALIDACION = Set.of(
            "Pendiente",
            "Aprobado",
            "Rechazado"
    );

    public RegistroHorasController(
            RegistroHorasRepository registroHorasRepository,
            MiembroEquipoRepository miembroEquipoRepository,
            MiembroProyectoRepository miembroProyectoRepository,
            ProyectoRepository proyectoRepository,
            TareaRepository tareaRepository,
            UsuarioRepository usuarioRepository,
            BitacoraService bitacoraService
    ) {
        this.registroHorasRepository = registroHorasRepository;
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.miembroProyectoRepository = miembroProyectoRepository;
        this.proyectoRepository = proyectoRepository;
        this.tareaRepository = tareaRepository;
        this.usuarioRepository = usuarioRepository;
        this.bitacoraService = bitacoraService;
    }

    /* =========================================================
       CONSULTAR REGISTROS
    ========================================================= */

    @GetMapping
    public ResponseEntity<Map<String, Object>> listarRegistros(
            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida."
            );
        }

        if (esUsuarioConsulta(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Los usuarios de consulta no pueden acceder al control de horas."
            );
        }

        List<RegistroHoras> registros;

        if (esAdministrador(usuario)) {
            registros = registroHorasRepository
                    .findAllByOrderByFechaDescFechaCreacionDesc();

            respuesta.put("tipoAcceso", "administrador");

        } else {
            MiembroEquipo miembro =
                    obtenerMiembroDesdeUsuario(usuario);

            if (miembro == null) {
                registros = List.of();
                respuesta.put("tipoAcceso", "sin_miembro_vinculado");

            } else {
                List<Integer> idsProyectosResponsable =
                        obtenerIdsProyectosDondeEsResponsable(miembro);

                if (idsProyectosResponsable.isEmpty()) {
                    registros = registroHorasRepository
                            .findByIdMiembroOrderByFechaDescFechaCreacionDesc(
                                    miembro.getId()
                            );

                    respuesta.put("tipoAcceso", "horas_propias");

                } else {
                    List<RegistroHoras> registrosPropios =
                            registroHorasRepository
                                    .findByIdMiembroOrderByFechaDescFechaCreacionDesc(
                                            miembro.getId()
                                    );

                    List<RegistroHoras> registrosProyectos =
                            registroHorasRepository
                                    .findByIdProyectoInOrderByFechaDescFechaCreacionDesc(
                                            idsProyectosResponsable
                                    );

                    registros = unirRegistrosSinDuplicados(
                            registrosPropios,
                            registrosProyectos
                    );

                    respuesta.put("tipoAcceso", "responsable_proyecto");
                }
            }
        }

        respuesta.put("estado", "correcto");
        respuesta.put("total", registros.size());

        respuesta.put(
                "registros",
                registros.stream()
                        .map(this::convertirRegistro)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/miembro/{idMiembro}")
    public ResponseEntity<Map<String, Object>> listarPorMiembro(
            @PathVariable Integer idMiembro,

            @RequestParam(required = false)
            Integer mes,

            @RequestParam(required = false)
            Integer anio,

            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida."
            );
        }

        if (esUsuarioConsulta(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Los usuarios de consulta no pueden consultar registros de horas."
            );
        }

        if (!puedeConsultarMiembro(usuario, idMiembro)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "No tienes permiso para consultar las horas de este integrante."
            );
        }

        MiembroEquipo miembro = miembroEquipoRepository
                .findById(idMiembro)
                .orElse(null);

        if (miembro == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.NOT_FOUND,
                    "No se encontró el integrante solicitado."
            );
        }

        List<RegistroHoras> registros;

        if (mes != null && anio != null) {
            if (mes < 1 || mes > 12 || anio < 2020) {
                return respuestaError(
                        respuesta,
                        HttpStatus.BAD_REQUEST,
                        "El mes o año seleccionado no es válido."
                );
            }

            YearMonth periodo = YearMonth.of(anio, mes);

            registros = registroHorasRepository
                    .findByIdMiembroAndFechaBetweenOrderByFechaDescFechaCreacionDesc(
                            idMiembro,
                            periodo.atDay(1),
                            periodo.atEndOfMonth()
                    );
        } else {
            registros = registroHorasRepository
                    .findByIdMiembroOrderByFechaDescFechaCreacionDesc(
                            idMiembro
                    );
        }

        respuesta.put("estado", "correcto");
        respuesta.put("miembro", convertirMiembro(miembro));
        respuesta.put("total", registros.size());

        respuesta.put(
                "registros",
                registros.stream()
                        .map(this::convertirRegistro)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/proyecto/{idProyecto}")
    public ResponseEntity<Map<String, Object>> listarPorProyecto(
            @PathVariable Integer idProyecto,

            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida."
            );
        }

        if (esUsuarioConsulta(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Los usuarios de consulta no pueden consultar control de horas."
            );
        }

        Proyecto proyecto = proyectoRepository
                .findById(idProyecto)
                .orElse(null);

        if (proyecto == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.NOT_FOUND,
                    "No se encontró el proyecto solicitado."
            );
        }

        if (!puedeConsultarHorasProyecto(usuario, idProyecto)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "No tienes permiso para consultar horas de este proyecto."
            );
        }

        List<RegistroHoras> registros =
                registroHorasRepository
                        .findByIdProyectoOrderByFechaDescFechaCreacionDesc(
                                idProyecto
                        );

        respuesta.put("estado", "correcto");
        respuesta.put("proyectoId", idProyecto);
        respuesta.put("proyectoNombre", proyecto.getNombre());
        respuesta.put("total", registros.size());

        respuesta.put(
                "registros",
                registros.stream()
                        .map(this::convertirRegistro)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    /* =========================================================
       CREAR REGISTRO MANUAL
    ========================================================= */

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> crearRegistro(
            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo,

            @RequestBody RegistroHorasRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida."
            );
        }

        if (esUsuarioConsulta(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Los usuarios de consulta no pueden registrar horas."
            );
        }

        MiembroEquipo miembro = resolverMiembroRegistro(
                usuario,
                datos.getIdMiembro()
        );

        if (miembro == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "No fue posible identificar al integrante para el registro."
            );
        }

        String validacion = validarDatosRegistro(
                usuario,
                miembro,
                datos
        );

        if (validacion != null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    validacion
            );
        }

        RegistroHoras registro = new RegistroHoras();

        asignarDatosRegistro(
                registro,
                miembro,
                datos
        );

        registro.setEstadoValidacion("Pendiente");
        registro.setIdUsuarioValidador(null);

        RegistroHoras guardado =
                registroHorasRepository.save(registro);

        recalcularHorasRegistradasTarea(
                guardado.getIdTarea()
        );

        bitacoraService.registrar(
                idUsuarioActivo,
                "HORAS",
                "CREAR_REGISTRO",
                "RegistroHoras",
                guardado.getId(),
                "Se creó un registro manual de horas para " +
                        miembro.getNombreCompleto() + ".",
                null,
                resumenRegistro(guardado)
        );

        respuesta.put("estado", "correcto");
        respuesta.put(
                "mensaje",
                "Registro de horas creado correctamente."
        );
        respuesta.put(
                "registro",
                convertirRegistro(guardado)
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    /* =========================================================
       EDITAR REGISTRO
       SOLO ADMINISTRADOR
    ========================================================= */

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> actualizarRegistro(
            @PathVariable Integer id,

            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo,

            @RequestBody RegistroHorasRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida."
            );
        }

        if (!esAdministrador(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Solo un administrador puede corregir registros de horas. " +
                    "Si el registro sigue pendiente, el colaborador debe eliminarlo " +
                    "y crear uno nuevo."
            );
        }

        RegistroHoras registro = registroHorasRepository
                .findById(id)
                .orElse(null);

        if (registro == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.NOT_FOUND,
                    "No se encontró el registro de horas."
            );
        }

        Integer idTareaAnterior = registro.getIdTarea();
        String datosAnteriores = resumenRegistro(registro);

        MiembroEquipo miembro = resolverMiembroRegistro(
                usuario,
                datos.getIdMiembro() != null
                        ? datos.getIdMiembro()
                        : registro.getIdMiembro()
        );

        if (miembro == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "No se encontró el integrante seleccionado."
            );
        }

        String validacion = validarDatosRegistro(
                usuario,
                miembro,
                datos
        );

        if (validacion != null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    validacion
            );
        }

        asignarDatosRegistro(
                registro,
                miembro,
                datos
        );

        RegistroHoras actualizado =
                registroHorasRepository.save(registro);

        recalcularHorasRegistradasTarea(idTareaAnterior);
        recalcularHorasRegistradasTarea(actualizado.getIdTarea());

        bitacoraService.registrar(
                idUsuarioActivo,
                "HORAS",
                "EDITAR_REGISTRO",
                "RegistroHoras",
                actualizado.getId(),
                "Un administrador corrigió un registro de horas.",
                datosAnteriores,
                resumenRegistro(actualizado)
        );

        respuesta.put("estado", "correcto");
        respuesta.put(
                "mensaje",
                "Registro de horas corregido correctamente."
        );
        respuesta.put(
                "registro",
                convertirRegistro(actualizado)
        );

        return ResponseEntity.ok(respuesta);
    }

    /* =========================================================
       APROBAR O RECHAZAR REGISTRO
       SOLO ADMINISTRADOR
    ========================================================= */

    @PutMapping("/{id}/validacion")
    @Transactional
    public ResponseEntity<Map<String, Object>> validarRegistro(
            @PathVariable Integer id,

            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo,

            @RequestBody ValidacionHorasRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida."
            );
        }

        if (!esAdministrador(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Solo un administrador puede aprobar o rechazar registros."
            );
        }

        RegistroHoras registro = registroHorasRepository
                .findById(id)
                .orElse(null);

        if (registro == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.NOT_FOUND,
                    "No se encontró el registro de horas."
            );
        }

        String estado = normalizarEstado(
                datos.getEstadoValidacion()
        );

        if (!ESTADOS_VALIDACION.contains(estado)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "El estado debe ser Pendiente, Aprobado o Rechazado."
            );
        }

        if (
                "Jornada".equalsIgnoreCase(
                        registro.getTipoRegistro()
                )
                && registro.getHoraSalida() == null
                && "Aprobado".equalsIgnoreCase(estado)
        ) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "No se puede aprobar una jornada que todavía no ha sido finalizada."
            );
        }

        String estadoAnterior = registro.getEstadoValidacion();

        registro.setEstadoValidacion(estado);
        registro.setIdUsuarioValidador(usuario.getId());

        RegistroHoras actualizado =
                registroHorasRepository.save(registro);

        recalcularHorasRegistradasTarea(
                actualizado.getIdTarea()
        );

        bitacoraService.registrar(
                idUsuarioActivo,
                "HORAS",
                "VALIDAR_REGISTRO",
                "RegistroHoras",
                actualizado.getId(),
                "Se cambió la validación del registro de horas de " +
                        estadoAnterior + " a " + estado + ".",
                "Estado de validación: " + estadoAnterior,
                "Estado de validación: " + estado
        );

        respuesta.put("estado", "correcto");
        respuesta.put(
                "mensaje",
                "Validación actualizada correctamente."
        );
        respuesta.put(
                "registro",
                convertirRegistro(actualizado)
        );

        return ResponseEntity.ok(respuesta);
    }

    /* =========================================================
       ELIMINAR REGISTRO
    ========================================================= */

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> eliminarRegistro(
            @PathVariable Integer id,

            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida."
            );
        }

        if (esUsuarioConsulta(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Los usuarios de consulta no pueden eliminar registros de horas."
            );
        }

        RegistroHoras registro = registroHorasRepository
                .findById(id)
                .orElse(null);

        if (registro == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.NOT_FOUND,
                    "No se encontró el registro de horas."
            );
        }

        if (!puedeEliminarRegistro(usuario, registro)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "No tienes permiso para eliminar este registro."
            );
        }

        Integer idTarea = registro.getIdTarea();
        String datosEliminados = resumenRegistro(registro);

        registroHorasRepository.delete(registro);

        recalcularHorasRegistradasTarea(idTarea);

        bitacoraService.registrar(
                idUsuarioActivo,
                "HORAS",
                "ELIMINAR_REGISTRO",
                "RegistroHoras",
                id,
                "Se eliminó un registro de horas.",
                datosEliminados,
                null
        );

        respuesta.put("estado", "correcto");
        respuesta.put(
                "mensaje",
                "Registro de horas eliminado correctamente."
        );

        return ResponseEntity.ok(respuesta);
    }

    /* =========================================================
       INICIAR JORNADA
    ========================================================= */

    @PostMapping("/check-in")
    @Transactional
    public ResponseEntity<Map<String, Object>> checkIn(
            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida."
            );
        }

        if (esUsuarioConsulta(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Los usuarios de consulta no pueden iniciar jornadas."
            );
        }

        MiembroEquipo miembro =
                obtenerMiembroDesdeUsuario(usuario);

        if (miembro == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "Tu usuario no tiene un perfil de integrante asociado."
            );
        }

        if (!"Activo".equalsIgnoreCase(miembro.getEstado())) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "No puedes registrar una jornada con un perfil inactivo."
            );
        }

        RegistroHoras jornadaAbierta =
                obtenerJornadaPendienteAbierta(
                        miembro.getId()
                );

        if (jornadaAbierta != null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "Ya existe una jornada pendiente sin finalizar. " +
                    "Debes presionar Finalizar jornada antes de iniciar otra."
            );
        }

        RegistroHoras registro = new RegistroHoras();

        registro.setIdMiembro(miembro.getId());
        registro.setIdProyecto(null);
        registro.setIdTarea(null);

        registro.setFecha(LocalDate.now());

        registro.setHoraEntrada(
                LocalTime.now()
                        .withSecond(0)
                        .withNano(0)
        );

        registro.setHoraSalida(null);
        registro.setHorasTrabajadas(BigDecimal.ZERO);

        registro.setTipoRegistro("Jornada");
        registro.setIncidente("normal");

        registro.setDescripcion(
                "Inicio de jornada registrado desde la plataforma."
        );

        registro.setEstadoValidacion("Pendiente");
        registro.setIdUsuarioValidador(null);

        RegistroHoras guardado =
                registroHorasRepository.save(registro);

        bitacoraService.registrar(
                idUsuarioActivo,
                "HORAS",
                "INICIAR_JORNADA",
                "RegistroHoras",
                guardado.getId(),
                "Se inició una jornada para " + miembro.getNombreCompleto() + ".",
                null,
                resumenRegistro(guardado)
        );

        respuesta.put("estado", "correcto");
        respuesta.put(
                "mensaje",
                "Jornada iniciada correctamente."
        );
        respuesta.put(
                "registro",
                convertirRegistro(guardado)
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    /* =========================================================
       FINALIZAR JORNADA
    ========================================================= */

    @PostMapping("/check-out")
    @Transactional
    public ResponseEntity<Map<String, Object>> checkOut(
            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión válida."
            );
        }

        if (esUsuarioConsulta(usuario)) {
            return respuestaError(
                    respuesta,
                    HttpStatus.FORBIDDEN,
                    "Los usuarios de consulta no pueden finalizar jornadas."
            );
        }

        MiembroEquipo miembro =
                obtenerMiembroDesdeUsuario(usuario);

        if (miembro == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "Tu usuario no tiene un perfil de integrante asociado."
            );
        }

        RegistroHoras jornada = obtenerJornadaPendienteAbierta(
                miembro.getId()
        );

        if (jornada == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "No existe una jornada pendiente para finalizar."
            );
        }

        if (jornada.getHoraEntrada() == null) {
            return respuestaError(
                    respuesta,
                    HttpStatus.BAD_REQUEST,
                    "La jornada encontrada no tiene una hora de entrada válida."
            );
        }

        LocalTime salida = LocalTime.now()
                .withSecond(0)
                .withNano(0);

        BigDecimal horas = calcularHoras(
                jornada.getHoraEntrada(),
                salida
        );

        if (horas.compareTo(BigDecimal.ZERO) <= 0) {
            horas = new BigDecimal("0.01");
        }

        jornada.setHoraSalida(salida);
        jornada.setHorasTrabajadas(horas);

        RegistroHoras actualizado =
                registroHorasRepository.save(jornada);

        bitacoraService.registrar(
                idUsuarioActivo,
                "HORAS",
                "FINALIZAR_JORNADA",
                "RegistroHoras",
                actualizado.getId(),
                "Se finalizó una jornada.",
                null,
                resumenRegistro(actualizado)
        );

        respuesta.put("estado", "correcto");
        respuesta.put(
                "mensaje",
                "Jornada finalizada correctamente."
        );
        respuesta.put(
                "registro",
                convertirRegistro(actualizado)
        );

        return ResponseEntity.ok(respuesta);
    }

    /* =========================================================
       VALIDACIONES
    ========================================================= */

    private String validarDatosRegistro(
            Usuario usuario,
            MiembroEquipo miembro,
            RegistroHorasRequest datos
    ) {
        if (datos.getFecha() == null) {
            return "La fecha del registro es obligatoria.";
        }

        if (
                (datos.getHoraEntrada() == null
                        && datos.getHoraSalida() != null)
                ||
                (datos.getHoraEntrada() != null
                        && datos.getHoraSalida() == null)
        ) {
            return "Debes indicar tanto la hora de entrada como la hora de salida.";
        }

        if (
                datos.getHoraEntrada() != null
                && datos.getHoraSalida() != null
                && !datos.getHoraSalida()
                        .isAfter(datos.getHoraEntrada())
        ) {
            return "La hora de salida debe ser posterior a la hora de entrada.";
        }

        String incidente = valorODefecto(
                datos.getIncidente(),
                "normal"
        );

        if (!INCIDENTES_VALIDOS.contains(incidente)) {
            return "El incidente seleccionado no es válido.";
        }

        if (
                datos.getHorasTrabajadas() != null
                && datos.getHorasTrabajadas()
                        .compareTo(BigDecimal.ZERO) < 0
        ) {
            return "Las horas trabajadas no pueden ser negativas.";
        }

        if (datos.getIdProyecto() != null) {
            Proyecto proyecto = proyectoRepository
                    .findById(datos.getIdProyecto())
                    .orElse(null);

            if (proyecto == null) {
                return "El proyecto seleccionado no existe.";
            }

            if (
                    !esAdministrador(usuario)
                    && !miembroProyectoRepository.existsByIdProyectoAndIdMiembro(
                            datos.getIdProyecto(),
                            miembro.getId()
                    )
            ) {
                return "Solo puedes registrar horas en proyectos donde estás asignado.";
            }
        }

        if (datos.getIdTarea() != null) {
            Tarea tarea = tareaRepository
                    .findById(datos.getIdTarea())
                    .orElse(null);

            if (tarea == null) {
                return "La tarea seleccionada no existe.";
            }

            if (
                    datos.getIdProyecto() != null
                    && !tarea.getIdProyecto()
                            .equals(datos.getIdProyecto())
            ) {
                return "La tarea seleccionada no pertenece al proyecto elegido.";
            }

            if (
                    !esAdministrador(usuario)
                    && !miembroProyectoRepository.existsByIdProyectoAndIdMiembro(
                            tarea.getIdProyecto(),
                            miembro.getId()
                    )
            ) {
                return "Solo puedes registrar horas en tareas de proyectos donde estás asignado.";
            }

            if (
                    !esAdministrador(usuario)
                    && !esResponsableDelProyecto(usuario, tarea.getIdProyecto())
                    && !miembro.getId()
                            .equals(tarea.getIdMiembroAsignado())
            ) {
                return "Solo puedes registrar horas en tareas asignadas directamente a ti.";
            }
        }

        return null;
    }

    private void asignarDatosRegistro(
            RegistroHoras registro,
            MiembroEquipo miembro,
            RegistroHorasRequest datos
    ) {
        registro.setIdMiembro(miembro.getId());
        registro.setFecha(datos.getFecha());

        registro.setHoraEntrada(datos.getHoraEntrada());
        registro.setHoraSalida(datos.getHoraSalida());

        Integer idProyecto = datos.getIdProyecto();

        if (datos.getIdTarea() != null) {
            Tarea tarea = tareaRepository
                    .findById(datos.getIdTarea())
                    .orElse(null);

            if (tarea != null) {
                idProyecto = tarea.getIdProyecto();
            }
        }

        registro.setIdProyecto(idProyecto);
        registro.setIdTarea(datos.getIdTarea());

        BigDecimal horas = datos.getHorasTrabajadas();

        if (
                datos.getHoraEntrada() != null
                && datos.getHoraSalida() != null
        ) {
            horas = calcularHoras(
                    datos.getHoraEntrada(),
                    datos.getHoraSalida()
            );
        }

        if (horas == null) {
            horas = BigDecimal.ZERO;
        }

        registro.setHorasTrabajadas(
                horas.setScale(2, RoundingMode.HALF_UP)
        );

        registro.setTipoRegistro(
                valorODefecto(
                        datos.getTipoRegistro(),
                        "Manual"
                )
        );

        registro.setIncidente(
                valorODefecto(
                        datos.getIncidente(),
                        "normal"
                )
        );

        registro.setDescripcion(
                limpiarTexto(datos.getDescripcion())
        );
    }

    /* =========================================================
       JORNADA ABIERTA
    ========================================================= */

    private RegistroHoras obtenerJornadaPendienteAbierta(
            Integer idMiembro
    ) {
        List<RegistroHoras> jornadas =
                registroHorasRepository
                        .buscarJornadasPendientesAbiertas(
                                idMiembro
                        );

        if (jornadas == null || jornadas.isEmpty()) {
            return null;
        }

        return jornadas.get(0);
    }

    /* =========================================================
       HORAS APROBADAS EN TAREA
    ========================================================= */

    private void recalcularHorasRegistradasTarea(
            Integer idTarea
    ) {
        if (idTarea == null) {
            return;
        }

        Tarea tarea = tareaRepository
                .findById(idTarea)
                .orElse(null);

        if (tarea == null) {
            return;
        }

        BigDecimal horasAprobadas = tareaRepository
                .obtenerHorasAprobadasPorTarea(idTarea);

        if (horasAprobadas == null) {
            horasAprobadas = BigDecimal.ZERO;
        }

        tarea.setHorasRegistradas(
                horasAprobadas.setScale(
                        2,
                        RoundingMode.HALF_UP
                )
        );

        tareaRepository.save(tarea);
    }

    /* =========================================================
       PERMISOS
    ========================================================= */

    private MiembroEquipo resolverMiembroRegistro(
            Usuario usuario,
            Integer idMiembroSolicitado
    ) {
        if (esAdministrador(usuario)) {
            if (idMiembroSolicitado == null) {
                return null;
            }

            return miembroEquipoRepository
                    .findById(idMiembroSolicitado)
                    .orElse(null);
        }

        return obtenerMiembroDesdeUsuario(usuario);
    }

    private boolean puedeConsultarMiembro(
            Usuario usuario,
            Integer idMiembro
    ) {
        if (esAdministrador(usuario)) {
            return true;
        }

        MiembroEquipo miembro =
                obtenerMiembroDesdeUsuario(usuario);

        if (miembro == null || idMiembro == null) {
            return false;
        }

        if (miembro.getId().equals(idMiembro)) {
            return true;
        }

        List<Integer> idsProyectosResponsable =
                obtenerIdsProyectosDondeEsResponsable(miembro);

        if (idsProyectosResponsable.isEmpty()) {
            return false;
        }

        List<MiembroProyecto> asignacionesMiembroConsultado =
                miembroProyectoRepository
                        .findByIdMiembroOrderByFechaAsignacionDesc(
                                idMiembro
                        );

        return asignacionesMiembroConsultado.stream()
                .anyMatch(asignacion ->
                        idsProyectosResponsable.contains(
                                asignacion.getIdProyecto()
                        )
                );
    }

    private boolean puedeConsultarHorasProyecto(
            Usuario usuario,
            Integer idProyecto
    ) {
        if (esAdministrador(usuario)) {
            return true;
        }

        if (idProyecto == null) {
            return false;
        }

        MiembroEquipo miembro =
                obtenerMiembroDesdeUsuario(usuario);

        if (miembro == null) {
            return false;
        }

        return esResponsableDelProyecto(usuario, idProyecto);
    }

    private boolean puedeEliminarRegistro(
            Usuario usuario,
            RegistroHoras registro
    ) {
        if (esAdministrador(usuario)) {
            return true;
        }

        MiembroEquipo miembro =
                obtenerMiembroDesdeUsuario(usuario);

        boolean esRegistroPropio = miembro != null
                && miembro.getId()
                        .equals(registro.getIdMiembro());

        boolean estaPendiente = "Pendiente"
                .equalsIgnoreCase(
                        registro.getEstadoValidacion()
                );

        return esRegistroPropio && estaPendiente;
    }

    private boolean esResponsableDelProyecto(
            Usuario usuario,
            Integer idProyecto
    ) {
        if (usuario == null || idProyecto == null) {
            return false;
        }

        MiembroEquipo miembro =
                obtenerMiembroDesdeUsuario(usuario);

        if (miembro == null) {
            return false;
        }

        Proyecto proyecto = proyectoRepository
                .findById(idProyecto)
                .orElse(null);

        if (proyecto == null || proyecto.getIdResponsable() == null) {
            return false;
        }

        return proyecto.getIdResponsable().equals(miembro.getId());
    }

    private List<Integer> obtenerIdsProyectosDondeEsResponsable(
            MiembroEquipo miembro
    ) {
        if (miembro == null) {
            return List.of();
        }

        return proyectoRepository.findAll()
                .stream()
                .filter(proyecto ->
                        proyecto.getIdResponsable() != null
                        && proyecto.getIdResponsable()
                                .equals(miembro.getId())
                )
                .map(Proyecto::getId)
                .toList();
    }

    private List<RegistroHoras> unirRegistrosSinDuplicados(
            List<RegistroHoras> registrosA,
            List<RegistroHoras> registrosB
    ) {
        Map<Integer, RegistroHoras> mapa = new LinkedHashMap<>();

        registrosA.forEach(registro ->
                mapa.put(registro.getId(), registro)
        );

        registrosB.forEach(registro ->
                mapa.put(registro.getId(), registro)
        );

        return mapa.values()
                .stream()
                .toList();
    }

    /* =========================================================
       CONVERTIR RESPUESTAS
    ========================================================= */

    private Map<String, Object> convertirRegistro(
            RegistroHoras registro
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put("id", registro.getId());
        respuesta.put("idMiembro", registro.getIdMiembro());
        respuesta.put("idProyecto", registro.getIdProyecto());
        respuesta.put("idTarea", registro.getIdTarea());

        respuesta.put("fecha", registro.getFecha());
        respuesta.put("horaEntrada", registro.getHoraEntrada());
        respuesta.put("horaSalida", registro.getHoraSalida());

        respuesta.put(
                "horasTrabajadas",
                registro.getHorasTrabajadas() != null
                        ? registro.getHorasTrabajadas()
                        : BigDecimal.ZERO
        );

        respuesta.put("tipoRegistro", registro.getTipoRegistro());
        respuesta.put("incidente", registro.getIncidente());
        respuesta.put("descripcion", registro.getDescripcion());

        respuesta.put(
                "estadoValidacion",
                registro.getEstadoValidacion()
        );

        respuesta.put(
                "idUsuarioValidador",
                registro.getIdUsuarioValidador()
        );

        respuesta.put(
                "fechaCreacion",
                registro.getFechaCreacion()
        );

        respuesta.put(
                "fechaActualizacion",
                registro.getFechaActualizacion()
        );

        MiembroEquipo miembro = miembroEquipoRepository
                .findById(registro.getIdMiembro())
                .orElse(null);

        respuesta.put(
                "miembroNombre",
                miembro != null
                        ? miembro.getNombreCompleto()
                        : "Miembro no disponible"
        );

        respuesta.put(
                "miembroCorreo",
                miembro != null
                        ? miembro.getCorreo()
                        : null
        );

        if (registro.getIdProyecto() != null) {
            Proyecto proyecto = proyectoRepository
                    .findById(registro.getIdProyecto())
                    .orElse(null);

            respuesta.put(
                    "proyectoNombre",
                    proyecto != null
                            ? proyecto.getNombre()
                            : "Proyecto no disponible"
            );
        } else {
            respuesta.put("proyectoNombre", null);
        }

        if (registro.getIdTarea() != null) {
            Tarea tarea = tareaRepository
                    .findById(registro.getIdTarea())
                    .orElse(null);

            respuesta.put(
                    "tareaTitulo",
                    tarea != null
                            ? tarea.getTitulo()
                            : "Tarea no disponible"
            );
        } else {
            respuesta.put("tareaTitulo", null);
        }

        return respuesta;
    }

    private Map<String, Object> convertirMiembro(
            MiembroEquipo miembro
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put("id", miembro.getId());
        respuesta.put(
                "nombreCompleto",
                miembro.getNombreCompleto()
        );
        respuesta.put("correo", miembro.getCorreo());
        respuesta.put("rol", miembro.getRol());
        respuesta.put("estado", miembro.getEstado());

        return respuesta;
    }

    private String resumenRegistro(
            RegistroHoras registro
    ) {
        if (registro == null) {
            return null;
        }

        return "Fecha: " + registro.getFecha() +
                " | Entrada: " + registro.getHoraEntrada() +
                " | Salida: " + registro.getHoraSalida() +
                " | Horas: " + registro.getHorasTrabajadas() +
                " | Tipo: " + registro.getTipoRegistro() +
                " | Incidente: " + registro.getIncidente() +
                " | Estado: " + registro.getEstadoValidacion() +
                " | Descripción: " +
                (registro.getDescripcion() == null
                        ? ""
                        : registro.getDescripcion());
    }

    /* =========================================================
       UTILIDADES
    ========================================================= */

    private Usuario obtenerUsuario(
            Integer idUsuarioActivo
    ) {
        if (idUsuarioActivo == null) {
            return null;
        }

        return usuarioRepository
                .findById(idUsuarioActivo)
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

    private BigDecimal calcularHoras(
            LocalTime entrada,
            LocalTime salida
    ) {
        long minutos = Duration
                .between(entrada, salida)
                .toMinutes();

        if (minutos <= 0) {
            return BigDecimal.ZERO;
        }

        return BigDecimal.valueOf(minutos)
                .divide(
                        BigDecimal.valueOf(60),
                        2,
                        RoundingMode.HALF_UP
                );
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

    private String normalizarEstado(String estado) {
        if (estado == null) {
            return "";
        }

        String texto = estado.trim().toLowerCase();

        if ("pendiente".equals(texto)) {
            return "Pendiente";
        }

        if ("aprobado".equals(texto)) {
            return "Aprobado";
        }

        if ("rechazado".equals(texto)) {
            return "Rechazado";
        }

        return estado.trim();
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