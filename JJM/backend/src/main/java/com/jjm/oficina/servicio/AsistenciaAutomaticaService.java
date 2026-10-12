package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** El servidor mide presencia; el navegador nunca proporciona horas ni fechas. */
@Service
public class AsistenciaAutomaticaService {
    public static final ZoneId ZONA = ZoneId.of("America/Mexico_City");
    public static final long VIGENCIA_SENAL = 90;
    private static final String DESCRIPCION = "Asistencia automática: presencia en la Oficina de Proyectos (07:00 a 17:00).";
    private static final Logger LOG = LoggerFactory.getLogger(AsistenciaAutomaticaService.class);
    private final UsuarioRepository usuarios;
    private final MiembroEquipoRepository miembros;
    private final RegistroHorasRepository registros;
    private final JornadaAutomaticaRepository jornadas;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaccion;
    private final Clock reloj;

    public AsistenciaAutomaticaService(UsuarioRepository usuarios, MiembroEquipoRepository miembros,
            RegistroHorasRepository registros, JornadaAutomaticaRepository jornadas, JdbcTemplate jdbc,
            PlatformTransactionManager gestor, Clock reloj) {
        this.usuarios = usuarios; this.miembros = miembros; this.registros = registros;
        this.jornadas = jornadas; this.jdbc = jdbc; this.reloj = reloj;
        this.transaccion = new TransactionTemplate(gestor);
    }

    @PostConstruct
    public void prepararEstructura() {
        // Tabla adicional: conserva intactos los registros y las cuentas existentes.
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS jornadas_automaticas (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    id_usuario INT NOT NULL, fecha DATE NOT NULL, id_registro INT NOT NULL,
                    total_segundos BIGINT NOT NULL DEFAULT 0,
                    ultima_senal_epoch BIGINT NOT NULL, liquidado_epoch BIGINT NOT NULL,
                    finalizada BOOLEAN NOT NULL DEFAULT FALSE,
                    conexiones TEXT NOT NULL,
                    PRIMARY KEY (id), UNIQUE KEY uk_jornada_usuario_fecha (id_usuario, fecha),
                    UNIQUE KEY uk_jornada_registro (id_registro)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);
    }

    public static boolean esAlumno(Usuario u) {
        if (u == null || u.getRol() == null || u.getRol().getNombre() == null
                || !"Activo".equalsIgnoreCase(u.getEstado())) return false;
        return Set.of("colaborador", "alumno", "alumna", "estudiante", "estudiante pmo")
                .contains(u.getRol().getNombre().trim().toLowerCase(Locale.ROOT));
    }

    public static boolean esRegistroAutomatico(RegistroHoras registro) {
        return registro != null && DESCRIPCION.equals(registro.getDescripcion());
    }

    public Map<String, Object> actualizar(Integer idUsuario, boolean senal) {
        return actualizar(idUsuario, senal, senal ? "sesion" : null, false);
    }

    public Map<String, Object> actualizar(Integer idUsuario, boolean senal, String pagina, boolean salida) {
        return transaccion.execute(estado -> actualizarBloqueado(idUsuario, senal, pagina, salida));
    }

    private Map<String, Object> actualizarBloqueado(Integer idUsuario, boolean senal, String pagina, boolean retirar) {
        Usuario alumno = usuarios.buscarParaAsistencia(idUsuario).orElse(null);
        Instant ahora = reloj.instant();
        LocalDate fecha = ahora.atZone(ZONA).toLocalDate();
        boolean aplicable = esAlumno(alumno);
        MiembroEquipo miembro = aplicable ? miembros.findByUsuarioId(idUsuario).orElse(null) : null;
        aplicable = aplicable && miembro != null && "Activo".equalsIgnoreCase(miembro.getEstado());
        for (JornadaAutomatica pendiente : jornadas.findByIdUsuarioAndFinalizadaFalse(idUsuario)) {
            liquidar(pendiente, ahora);
            if (!aplicable && !pendiente.isFinalizada()) { pendiente.setFinalizada(true); cerrarRegistro(pendiente, ahora); jornadas.save(pendiente); }
        }
        JornadaAutomatica jornada = jornadas.findByIdUsuarioAndFecha(idUsuario, fecha).orElse(null);
        long otrosSegundos = miembro == null ? 0 : segundosOtros(miembro.getId(),fecha,jornada==null?null:jornada.getIdRegistro());
        boolean metaCumplida = otrosSegundos + (jornada==null?0:jornada.getTotalSegundos()) >= 36000;
        boolean enHorario = esDiaHabil(fecha) && !ahora.isBefore(inicio(fecha)) && ahora.isBefore(fin(fecha));
        String aviso = "";
        if (senal && aplicable && enHorario && jornada == null && !metaCumplida) {
            // Una jornada manual abierta debe resolverse antes de empezar otra: no se duplican tiempos.
            List<RegistroHoras> abiertas = registros.buscarJornadasPendientesAbiertas(miembro.getId()).stream()
                    .filter(r -> r.getFecha() == null || !r.getFecha().isBefore(fecha)).toList();
            RegistroHoras reutilizable = abiertas.size() == 1 ? abiertas.getFirst() : null;
            boolean continuarManual = reutilizable != null && fecha.equals(reutilizable.getFecha())
                    && "Jornada".equalsIgnoreCase(reutilizable.getTipoRegistro())
                    && reutilizable.getIdProyecto() == null && reutilizable.getIdTarea() == null
                    && (reutilizable.getHorasTrabajadas() == null || reutilizable.getHorasTrabajadas().signum() == 0)
                    && "Pendiente".equalsIgnoreCase(reutilizable.getEstadoValidacion());
            if (!abiertas.isEmpty() && !continuarManual) {
                aviso = "Tienes una jornada manual abierta. Pide al administrador que la revise para activar el registro automático.";
            } else {
                RegistroHoras registro = continuarManual ? reutilizable : new RegistroHoras();
                registro.setIdMiembro(miembro.getId()); registro.setFecha(fecha);
                if (!continuarManual) registro.setHoraEntrada(ahora.atZone(ZONA).toLocalTime().withNano(0));
                registro.setHorasTrabajadas(BigDecimal.ZERO); registro.setTipoRegistro("Jornada");
                registro.setIncidente("normal"); registro.setDescripcion(DESCRIPCION);
                registro.setEstadoValidacion("Pendiente");
                registro = registros.saveAndFlush(registro);
                jornada = new JornadaAutomatica(); jornada.setIdUsuario(idUsuario); jornada.setFecha(fecha);
                jornada.setIdRegistro(registro.getId()); jornada.setUltimaSenal(ahora.getEpochSecond());
                jornada.setLiquidado(ahora.getEpochSecond()); jornadas.save(jornada);
                renovarConexion(jornada, pagina, ahora, false);
                if (continuarManual) aviso = "Tu jornada abierta continúa con asistencia automática desde esta conexión.";
            }
        } else if (senal && aplicable && enHorario && jornada != null && !jornada.isFinalizada() && !metaCumplida) {
            // Tras una suspensión larga se reanuda desde ahora; el hueco no se acredita.
            jornada.setUltimaSenal(Math.max(jornada.getUltimaSenal(), ahora.getEpochSecond()));
            jornada.setLiquidado(Math.max(jornada.getLiquidado(), ahora.getEpochSecond()));
            renovarConexion(jornada, pagina, ahora, false);
            jornadas.save(jornada);
        }
        if (retirar && jornada != null && !jornada.isFinalizada()) {
            renovarConexion(jornada, pagina, ahora, true); jornadas.save(jornada);
        }
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("estado", "correcto"); salida.put("aplicable", aplicable);
        salida.put("fecha", fecha.toString()); salida.put("zonaHoraria", ZONA.getId());
        salida.put("horario", "Lunes a viernes, 07:00 a 17:00"); salida.put("metaHoras", 10);
        salida.put("servidorEpoch", ahora.getEpochSecond());
        salida.put("vigenciaSegundos", jornada == null ? 0 : Math.max(0, jornada.getUltimaSenal() + VIGENCIA_SENAL - ahora.getEpochSecond()));
        salida.put("enHorario", enHorario); salida.put("segundos", Math.min(36000,otrosSegundos+(jornada==null?0:jornada.getTotalSegundos())));
        salida.put("segundosConexion",jornada==null?0:jornada.getTotalSegundos());
        salida.put("segundosOtrosRegistros",otrosSegundos);
        BigDecimal acumuladas=miembro==null?BigDecimal.ZERO:jdbc.queryForObject("""
                SELECT COALESCE(SUM(horas_trabajadas),0) FROM registros_horas
                WHERE id_miembro=? AND COALESCE(estado_validacion,'Pendiente')<>'Rechazado'
                """,BigDecimal.class,miembro.getId());
        salida.put("horasAcumuladas",acumuladas==null?BigDecimal.ZERO:acumuladas);
        salida.put("segundosHastaCierre", Math.max(0,Duration.between(ahora,fin(fecha)).toSeconds()));
        salida.put("horas", horas(((Number)salida.get("segundos")).longValue()));
        salida.put("idRegistro", jornada == null ? null : jornada.getIdRegistro());
        salida.put("idMiembro", miembro == null ? null : miembro.getId());
        salida.put("contando", !metaCumplida && aplicable && enHorario && jornada != null && !jornada.isFinalizada()
                && ahora.getEpochSecond() < jornada.getUltimaSenal() + VIGENCIA_SENAL);
        salida.put("mensaje", metaCumplida ? "Las 10 horas de hoy ya están registradas. El total incluye las horas reconocidas por administración."
                : !aviso.isEmpty() ? aviso : !aplicable ? esAlumno(alumno)
                ? "Tu cuenta necesita un miembro de equipo activo para registrar horas. Solicita la revisión de administración."
                : "Tu conexión queda registrada. Las horas de estadía corresponden a alumnos activos."
                : !esDiaHabil(fecha) ? "La asistencia se registra de lunes a viernes."
                : !enHorario ? "El horario de asistencia es de 07:00 a 17:00."
                : "Las horas avanzan mientras tengas abierta la plataforma.");
        return salida;
    }

    private void renovarConexion(JornadaAutomatica jornada, String pagina, Instant ahora, boolean retirar) {
        Map<String, Long> conexiones = new LinkedHashMap<>();
        for (String linea : jornada.getConexiones().split("\n")) {
            String[] partes = linea.split("=", 2);
            if (partes.length == 2) {
                long ultimo = Long.parseLong(partes[1]);
                if (ultimo + VIGENCIA_SENAL > ahora.getEpochSecond()) conexiones.put(partes[0], ultimo);
            }
        }
        if (retirar) conexiones.remove(pagina);
        else if (conexiones.size() < 128 || conexiones.containsKey(pagina)) conexiones.put(pagina, ahora.getEpochSecond());
        jornada.setUltimaSenal(conexiones.values().stream().mapToLong(Long::longValue).max()
                .orElse(ahora.getEpochSecond() - VIGENCIA_SENAL));
        jornada.setConexiones(conexiones.entrySet().stream().map(e -> e.getKey() + "=" + e.getValue())
                .collect(java.util.stream.Collectors.joining("\n")));
    }

    private void liquidar(JornadaAutomatica jornada, Instant ahora) {
        if (jornada.isFinalizada()) return;
        long desde = Math.max(jornada.getLiquidado(), inicio(jornada.getFecha()).getEpochSecond());
        long hasta = Math.min(Math.min(ahora.getEpochSecond(), fin(jornada.getFecha()).getEpochSecond()),
                jornada.getUltimaSenal() + VIGENCIA_SENAL);
        long incremento = esDiaHabil(jornada.getFecha()) ? Math.max(0, hasta - desde) : 0;
        RegistroHoras registro = registros.findById(jornada.getIdRegistro()).orElseThrow(
                () -> new IllegalStateException("No se encontró el registro de la asistencia automática."));
        long limite = Math.max(0,36000-segundosOtros(registro.getIdMiembro(),jornada.getFecha(),registro.getId()));
        incremento = Math.min(incremento,Math.max(0,limite-jornada.getTotalSegundos()));
        if (incremento == 0 && ahora.isBefore(fin(jornada.getFecha()))) return;
        jornada.setTotalSegundos(Math.min(36000, jornada.getTotalSegundos() + incremento));
        jornada.setLiquidado(Math.max(jornada.getLiquidado(), hasta));
        registro.setHorasTrabajadas(horas(jornada.getTotalSegundos()));
        if (!ahora.isBefore(fin(jornada.getFecha()))) {
            jornada.setFinalizada(true);
            registro.setHoraSalida(Instant.ofEpochSecond(Math.max(desde, hasta)).atZone(ZONA).toLocalTime().withNano(0));
        }
        registros.save(registro); jornadas.save(jornada);
    }

    private void cerrarRegistro(JornadaAutomatica jornada, Instant ahora) {
        registros.findById(jornada.getIdRegistro()).ifPresent(r -> {
            r.setHoraSalida(ahora.atZone(ZONA).toLocalTime().withNano(0)); registros.save(r);
        });
    }
    private long segundosOtros(Integer miembro,LocalDate fecha,Integer automatico) {
        BigDecimal suma=jdbc.queryForObject("""
            SELECT COALESCE(SUM(horas_trabajadas),0) FROM registros_horas
            WHERE id_miembro=? AND fecha=? AND COALESCE(estado_validacion,'Pendiente')<>'Rechazado'
              AND (? IS NULL OR id_registro<>?)
            """,BigDecimal.class,miembro,fecha,automatico,automatico);
        return suma==null?0:Math.max(0,suma.multiply(BigDecimal.valueOf(3600)).longValue());
    }

    @Scheduled(fixedDelay = 30000)
    public void guardarAvance() {
        for (Integer id : jornadas.buscarUsuariosPendientes()) {
            try { actualizar(id, false); }
            catch (RuntimeException error) { LOG.error("No se pudo guardar la asistencia del usuario {}", id, error); }
        }
    }

    static boolean esDiaHabil(LocalDate fecha) { return fecha.getDayOfWeek().getValue() <= 5; }
    static Instant inicio(LocalDate fecha) { return fecha.atTime(7, 0).atZone(ZONA).toInstant(); }
    static Instant fin(LocalDate fecha) { return fecha.atTime(17, 0).atZone(ZONA).toInstant(); }
    static BigDecimal horas(long segundos) {
        return BigDecimal.valueOf(segundos).divide(BigDecimal.valueOf(3600), 2, RoundingMode.DOWN);
    }
}
