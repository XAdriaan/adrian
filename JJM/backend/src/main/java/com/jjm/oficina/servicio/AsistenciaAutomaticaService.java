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
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** El servidor mide presencia; el navegador nunca proporciona horas ni fechas. */
@Service
public class AsistenciaAutomaticaService {
    public static final ZoneId ZONA = ZoneId.of("America/Mexico_City");
    public static final long VIGENCIA_SENAL = 90;
    private static final String DESCRIPCION = "Asistencia automática: presencia en la Oficina de Proyectos (07:00 a 17:00).";
    private static final String CONTINUA = "Jornada iniciada por el alumno: tiempo transcurrido en el servidor; incluye suspensión. Requiere revisión de actividades.";
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

    private void columna(String nombre, String tipo) {
        Integer existe=jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='jornadas_automaticas' AND column_name=?",Integer.class,nombre);
        if(existe==null||existe==0)jdbc.execute("ALTER TABLE jornadas_automaticas ADD COLUMN "+nombre+" "+tipo);
    }
    @PostConstruct public void prepararJornadaContinua() {
        prepararEstructura();
        columna("modo_continuo", "BOOLEAN NOT NULL DEFAULT FALSE");
        columna("reposicion", "BOOLEAN NOT NULL DEFAULT FALSE");
        columna("limite_segundos", "BIGINT NOT NULL DEFAULT 36000");
        columna("motivo_cierre", "VARCHAR(40) NOT NULL DEFAULT ''");
        jdbc.execute("CREATE TABLE IF NOT EXISTS pmo_jornada_config(id INT PRIMARY KEY,inicio DATE NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        jdbc.update("INSERT IGNORE INTO pmo_jornada_config(id,inicio) VALUES(1,?)", reloj.instant().atZone(ZONA).toLocalDate());
    }
    public static boolean esAlumno(Usuario u) {
        if (u == null || u.getRol() == null || u.getRol().getNombre() == null
                || !"Activo".equalsIgnoreCase(u.getEstado())) return false;
        return Set.of("colaborador", "alumno", "alumna", "estudiante", "estudiante pmo")
                .contains(u.getRol().getNombre().trim().toLowerCase(Locale.ROOT));
    }

    public static boolean esRegistroAutomatico(RegistroHoras registro) {
        return registro != null && (registro.getDescripcion()!=null&&registro.getDescripcion().startsWith(CONTINUA) || DESCRIPCION.equals(registro.getDescripcion()) || (registro.getDescripcion()!=null && registro.getDescripcion().startsWith(DESCRIPCION+"\n")));
    }

    public Map<String, Object> actualizar(Integer idUsuario, boolean senal) {
        return actualizar(idUsuario, senal, senal ? "sesion" : null, false);
    }

    public Map<String, Object> actualizar(Integer idUsuario, boolean senal, String pagina, boolean salida) {
        return transaccion.execute(estado -> actualizarBloqueado(idUsuario, senal, pagina, salida, false, false));
    }
    public Map<String,Object> iniciar(Integer idUsuario) { return transaccion.execute(e->actualizarBloqueado(idUsuario,false,null,false,true,false)); }
    public Map<String,Object> finalizar(Integer idUsuario) { return transaccion.execute(e->actualizarBloqueado(idUsuario,false,null,false,false,true)); }

    private Map<String, Object> actualizarBloqueado(Integer idUsuario, boolean senal, String pagina, boolean retirar, boolean iniciar, boolean finalizar) {
        Usuario alumno = usuarios.buscarParaAsistencia(idUsuario).orElse(null);
        Instant ahora = reloj.instant();
        LocalDate fecha = ahora.atZone(ZONA).toLocalDate();
        boolean aplicable = esAlumno(alumno);
        MiembroEquipo miembro = aplicable ? miembros.findByUsuarioId(idUsuario).orElse(null) : null;
        aplicable = aplicable && miembro != null && "Activo".equalsIgnoreCase(miembro.getEstado());
        for (JornadaAutomatica pendiente : jornadas.findByIdUsuarioAndFinalizadaFalse(idUsuario)) {
            liquidar(pendiente, ahora);
            if (!aplicable && !pendiente.isFinalizada()) {
                pendiente.setFinalizada(true); pendiente.setMotivoCierre("CAMBIO_PERFIL");
                cerrarRegistro(pendiente, ahora); jornadas.save(pendiente);
            }
        }
        JornadaAutomatica jornada = jornadas.findByIdUsuarioAndFecha(idUsuario, fecha).orElse(null);
        long otrosSegundos = miembro == null ? 0 : segundosOtros(miembro.getId(),fecha,jornada==null?null:jornada.getIdRegistro());
        boolean metaCumplida = otrosSegundos + (jornada==null?0:jornada.getTotalSegundos()) >= 36000;
        long reposicionPendiente=saldoReposicion(idUsuario);
        boolean finSemana=!esDiaHabil(fecha);
        boolean enHorario = (esDiaHabil(fecha) || reposicionPendiente>0 || jornada!=null&&jornada.isReposicion()) && !ahora.isBefore(inicio(fecha)) && ahora.isBefore(fin(fecha));
        if((iniciar||finalizar)&&!aplicable)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"La jornada corresponde a alumnos y miembros activos.");
        if(iniciar&&!enHorario)throw new ResponseStatusException(HttpStatus.CONFLICT,finSemana?"Solo puedes iniciar reposición si tienes horas pendientes, entre 07:00 y 17:00.":"Inicia tu jornada entre 07:00 y 17:00, hora de México.");
        boolean reanudable = aplicable && enHorario && !metaCumplida
                && puedeReanudar(jornada, miembro, fecha, otrosSegundos);
        if(iniciar&&jornada!=null&&jornada.isFinalizada()&&!reanudable)throw new ResponseStatusException(HttpStatus.CONFLICT,"La jornada de hoy no se puede continuar. Revisa el horario, la meta y la validación del registro.");
        String aviso = "";
        if (iniciar && reanudable) {
            // Reanudar es una acción explícita. Conserva el registro y evita acreditar el intervalo cerrado.
            RegistroHoras registro = registros.findById(jornada.getIdRegistro()).orElseThrow();
            if (!jornada.isModoContinuo()) registro.setDescripcion(CONTINUA);
            jornada.setFinalizada(false); jornada.setMotivoCierre(""); jornada.setModoContinuo(true);
            jornada.setLiquidado(ahora.getEpochSecond()); jornada.setUltimaSenal(ahora.getEpochSecond());
            jornada.setConexiones(""); registro.setHoraSalida(null);
            registros.save(registro); jornadas.save(jornada);
            aviso = "Tu jornada continúa desde ahora, conservando las horas de hoy que ya tenías registradas.";
        }
        if (iniciar && aplicable && enHorario && jornada == null && !metaCumplida) {
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
                registro.setHoraEntrada(ahora.atZone(ZONA).toLocalTime().withNano(0));
                registro.setHorasTrabajadas(BigDecimal.ZERO); registro.setTipoRegistro("Jornada");
                registro.setIncidente("normal"); registro.setDescripcion(CONTINUA+(finSemana?" Reposición de horas pendientes.":""));
                registro.setEstadoValidacion("Pendiente");
                registro = registros.saveAndFlush(registro);
                jornada = new JornadaAutomatica(); jornada.setIdUsuario(idUsuario); jornada.setFecha(fecha);
                jornada.setIdRegistro(registro.getId()); jornada.setUltimaSenal(ahora.getEpochSecond());
                jornada.setLiquidado(ahora.getEpochSecond()); jornadas.save(jornada);
                jornada.setModoContinuo(true); jornada.setReposicion(finSemana);
                jornada.setLimiteSegundos(finSemana?Math.min(36000,reposicionPendiente):36000);jornadas.save(jornada);
                alertarInicio(idUsuario,fecha,ahora,finSemana);
                if (continuarManual) aviso = "Tu jornada abierta continúa con asistencia automática desde esta conexión.";
            }
        } else if (iniciar && jornada!=null && !jornada.isFinalizada() && !jornada.isModoContinuo() && !metaCumplida) {
            RegistroHoras r=registros.findById(jornada.getIdRegistro()).orElseThrow();
            if(!"Pendiente".equalsIgnoreCase(r.getEstadoValidacion()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Administración debe revisar el registro existente antes de continuar.");
            jornada.setModoContinuo(true);jornada.setLiquidado(ahora.getEpochSecond());jornadas.save(jornada);
            r.setDescripcion(CONTINUA);registros.save(r);alertarInicio(idUsuario,fecha,ahora,false);
        } else if (senal && aplicable && enHorario && jornada != null && !jornada.isFinalizada() && !jornada.isModoContinuo() && !metaCumplida) {
            // Tras una suspensión larga se reanuda desde ahora; el hueco no se acredita.
            jornada.setUltimaSenal(Math.max(jornada.getUltimaSenal(), ahora.getEpochSecond()));
            jornada.setLiquidado(Math.max(jornada.getLiquidado(), ahora.getEpochSecond()));
            renovarConexion(jornada, pagina, ahora, false);
            jornadas.save(jornada);
        }
        if (retirar && jornada != null && !jornada.isFinalizada()) {
            renovarConexion(jornada, pagina, ahora, true); jornadas.save(jornada);
        }
        if(finalizar && jornada!=null && !jornada.isFinalizada()) {jornada.setFinalizada(true);jornada.setMotivoCierre("FINALIZACION_ALUMNO");cerrarRegistro(jornada,ahora.isAfter(fin(fecha))?fin(fecha):ahora);jornadas.save(jornada);alertarFaltante(jornada);}
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("estado", "correcto"); salida.put("aplicable", aplicable);
        salida.put("perfilAlumno", esAlumno(alumno));
        salida.put("fecha", fecha.toString()); salida.put("zonaHoraria", ZONA.getId());
        salida.put("horario", "Lunes a viernes, 07:00 a 17:00"); salida.put("metaHoras", 10);
        salida.put("servidorEpoch", ahora.getEpochSecond());
        long limiteHoy=jornada==null?finSemana?Math.min(36000,reposicionPendiente):36000:jornada.getLimiteSegundos();
        boolean continua=jornada!=null&&jornada.isModoContinuo();
        salida.put("modoContinuo",continua);salida.put("reposicion",jornada!=null&&jornada.isReposicion());
        salida.put("limiteSegundos",limiteHoy);salida.put("reposicionPendienteSegundos",saldoReposicion(idUsuario));
        salida.put("puedeIniciar",aplicable&&enHorario&&!metaCumplida&&(jornada==null||!jornada.isFinalizada()&&!continua));
        salida.put("puedeReanudar",aplicable&&enHorario&&!metaCumplida&&puedeReanudar(jornada,miembro,fecha,otrosSegundos));
        salida.put("puedeFinalizar",aplicable&&continua&&!jornada.isFinalizada());
        salida.put("finalizada",jornada!=null&&jornada.isFinalizada());
        salida.put("motivoCierre",jornada==null?"":Objects.toString(jornada.getMotivoCierre(),""));
        salida.put("segundosJornada",jornada==null?0:jornada.getTotalSegundos());
        salida.put("reporteHabilitado",!ahora.isBefore(fecha.atTime(16,0).atZone(ZONA).toInstant()));
        salida.put("segundosHastaReporte",Math.max(0,Duration.between(ahora,fecha.atTime(16,0).atZone(ZONA).toInstant()).getSeconds()));
        salida.put("vigenciaSegundos", continua?Math.max(0,Duration.between(ahora,fin(fecha)).toSeconds()):jornada == null ? 0 : Math.max(0, jornada.getUltimaSenal() + VIGENCIA_SENAL - ahora.getEpochSecond()));
        salida.put("enHorario", enHorario); salida.put("segundos", Math.min(36000,otrosSegundos+(jornada==null?0:jornada.getTotalSegundos())));
        salida.put("segundosConexion",jornada==null?0:jornada.getTotalSegundos());
        salida.put("segundosOtrosRegistros",otrosSegundos);
        BigDecimal acumuladas=miembro==null?BigDecimal.ZERO:jdbc.queryForObject("""
                SELECT COALESCE(SUM(horas_trabajadas),0) FROM registros_horas
                WHERE id_miembro=? AND COALESCE(estado_validacion,'Pendiente')<>'Rechazado'
                """,BigDecimal.class,miembro.getId());
        salida.put("horasAcumuladas",acumuladas==null?BigDecimal.ZERO:acumuladas);
        BigDecimal aprobadas=miembro==null?BigDecimal.ZERO:jdbc.queryForObject("SELECT COALESCE(SUM(horas_trabajadas),0) FROM registros_horas WHERE id_miembro=? AND estado_validacion='Aprobado'",BigDecimal.class,miembro.getId());
        salida.put("horasAprobadasAcumuladas",aprobadas==null?BigDecimal.ZERO:aprobadas);
        salida.put("segundosHastaCierre", Math.max(0,Duration.between(ahora,fin(fecha)).toSeconds()));
        salida.put("horas", horas(((Number)salida.get("segundos")).longValue()));
        salida.put("idRegistro", jornada == null ? null : jornada.getIdRegistro());
        salida.put("idMiembro", miembro == null ? null : miembro.getId());
        salida.put("contando", !metaCumplida && aplicable && enHorario && jornada != null && !jornada.isFinalizada()
                && (continua || ahora.getEpochSecond() < jornada.getUltimaSenal() + VIGENCIA_SENAL));
        salida.put("mensaje", metaCumplida ? "Las 10 horas de hoy ya están registradas. El total incluye las horas reconocidas por administración."
                : !aviso.isEmpty() ? aviso : !aplicable ? esAlumno(alumno)
                ? "Tu cuenta necesita un miembro de equipo activo para registrar horas. Solicita la revisión de administración."
                : "Tu conexión queda registrada. Las horas de estadía corresponden a alumnos activos."
                : !esDiaHabil(fecha) && (jornada==null||!jornada.isReposicion()) ? reposicionPendiente>0?"Puedes reponer tus horas pendientes el fin de semana, de 07:00 a 17:00.":"No tienes horas pendientes para iniciar una reposición."
                : !enHorario ? "El horario de asistencia es de 07:00 a 17:00."
                : jornada!=null&&jornada.isFinalizada()? reanudable
                ? "Puedes continuar tu jornada de hoy. Se conservarán las horas registradas y el conteo seguirá desde que pulses Continuar mi jornada."
                : "La jornada terminó. Revisa tus reportes y el saldo de reposición."
                : continua ? "El servidor cuenta tu jornada aunque cierres o suspendas la laptop. Finaliza al terminar; cierre automático a las 17:00. La conexión y las actividades se revisan por separado."
                : "Pulsa Iniciar mi jornada para trabajar en tus proyectos. El reporte diario se habilita a las 16:00, hora de Ciudad de México.");
        return salida;
    }

    private boolean puedeReanudar(JornadaAutomatica jornada, MiembroEquipo miembro, LocalDate fecha, long otrosSegundos) {
        if (jornada == null || miembro == null || !jornada.isFinalizada() || !fecha.equals(jornada.getFecha())) return false;
        String motivo = Objects.toString(jornada.getMotivoCierre(), "");
        if (!Set.of("", "CAMBIO_PERFIL", "FINALIZACION_ALUMNO").contains(motivo)) return false;
        long limite = Math.max(0, Math.min(jornada.getLimiteSegundos(), 36000 - otrosSegundos));
        if (jornada.getTotalSegundos() >= limite || jornada.isReposicion() && saldoReposicion(jornada.getIdUsuario()) == 0) return false;
        return registros.findById(jornada.getIdRegistro()).filter(r ->
                miembro.getId().equals(r.getIdMiembro()) && fecha.equals(r.getFecha())
                        && "Pendiente".equalsIgnoreCase(r.getEstadoValidacion())).isPresent();
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
        long hasta = Math.min(ahora.getEpochSecond(), fin(jornada.getFecha()).getEpochSecond());
        if(!jornada.isModoContinuo())hasta=Math.min(hasta,jornada.getUltimaSenal()+VIGENCIA_SENAL);
        long incremento = esDiaHabil(jornada.getFecha())||jornada.isReposicion() ? Math.max(0, hasta - desde) : 0;
        RegistroHoras registro = registros.findById(jornada.getIdRegistro()).orElseThrow(
                () -> new IllegalStateException("No se encontró el registro de la asistencia automática."));
        if(jornada.isModoContinuo()&&!"Pendiente".equalsIgnoreCase(registro.getEstadoValidacion())){jornada.setFinalizada(true);jornada.setMotivoCierre("REGISTRO_VALIDADO");jornadas.save(jornada);return;}
        long limite = Math.max(0,Math.min(jornada.getLimiteSegundos(),36000-segundosOtros(registro.getIdMiembro(),jornada.getFecha(),registro.getId())));
        if(jornada.isReposicion())limite=Math.min(limite,jornada.getTotalSegundos()+saldoReposicion(jornada.getIdUsuario()));
        incremento = Math.min(incremento,Math.max(0,limite-jornada.getTotalSegundos()));
        if (incremento == 0 && ahora.isBefore(fin(jornada.getFecha()))) return;
        jornada.setTotalSegundos(Math.min(36000, jornada.getTotalSegundos() + incremento));
        jornada.setLiquidado(Math.max(jornada.getLiquidado(), hasta));
        registro.setHorasTrabajadas(horas(jornada.getTotalSegundos()));
        if (!ahora.isBefore(fin(jornada.getFecha())) || jornada.isModoContinuo()&&jornada.getTotalSegundos()>=limite) {
            jornada.setFinalizada(true);
            jornada.setMotivoCierre(!ahora.isBefore(fin(jornada.getFecha())) ? "FIN_HORARIO" : "META_CUBIERTA");
            long cierre=jornada.isModoContinuo()?desde+incremento:Math.max(desde,hasta);
            registro.setHoraSalida(Instant.ofEpochSecond(Math.min(fin(jornada.getFecha()).getEpochSecond(),cierre)).atZone(ZONA).toLocalTime().withNano(0));
        }
        registros.save(registro); jornadas.save(jornada);
        if(jornada.isFinalizada())alertarFaltante(jornada);
        if(jornada.isReposicion()&&saldoReposicion(jornada.getIdUsuario())==0)jdbc.update("UPDATE pmo_recordatorios SET estado='Resuelto',actualizado_en=? WHERE clave LIKE ?",reloj.instant().atZone(ZONA).toLocalDateTime(),"jornada-falta-"+jornada.getIdUsuario()+"-%");
    }

    private List<Map<String,Object>> deficits(Integer usuario) {
        return jdbc.queryForList("""
            SELECT j.fecha,GREATEST(0,36000-COALESCE(h.segundos,0)
              +IF(COALESCE(r.estado_validacion,'Pendiente')<>'Rechazado',COALESCE(r.horas_trabajadas,0)*3600-j.total_segundos,0)) AS faltante
            FROM jornadas_automaticas j JOIN registros_horas r ON r.id_registro=j.id_registro
            LEFT JOIN (SELECT id_miembro,fecha,SUM(horas_trabajadas)*3600 AS segundos FROM registros_horas
                       WHERE COALESCE(estado_validacion,'Pendiente')<>'Rechazado' AND id_miembro IN(SELECT id_miembro FROM miembros_equipo WHERE id_usuario=?) GROUP BY id_miembro,fecha) h
              ON h.id_miembro=r.id_miembro AND h.fecha=j.fecha
            WHERE j.id_usuario=? AND j.modo_continuo=TRUE AND j.reposicion=FALSE AND j.finalizada=TRUE
              AND DAYOFWEEK(j.fecha) BETWEEN 2 AND 6 ORDER BY j.fecha
            """,usuario,usuario);
    }
    private long reposiciones(Integer usuario) {
        Long s=jdbc.queryForObject("SELECT COALESCE(SUM(j.total_segundos),0) FROM jornadas_automaticas j JOIN registros_horas r ON r.id_registro=j.id_registro WHERE j.id_usuario=? AND j.reposicion=TRUE AND COALESCE(r.estado_validacion,'Pendiente')<>'Rechazado'",Long.class,usuario);
        return s==null?0:Math.max(0,s);
    }
    private long saldoReposicion(Integer usuario) {return Math.max(0,deficits(usuario).stream().mapToLong(d->((Number)d.get("faltante")).longValue()).sum()-reposiciones(usuario));}
    private void alertarInicio(Integer usuario,LocalDate fecha,Instant ahora,boolean reposicion) {
        if(!reposicion&&ahora.isAfter(inicio(fecha))) {
            long faltan=Math.min(36000,Duration.between(inicio(fecha),ahora).toSeconds());
            alerta(usuario,fecha,"Inicio tardío de jornada","Inicio a las "+ahora.atZone(ZONA).toLocalTime().withNano(0)+". Faltarán hasta "+horas(faltan)+" horas de la meta diaria; revisa el saldo al cerrar y repón las horas el fin de semana.");
        }
    }
    private void alertarFaltante(JornadaAutomatica j) {
        if(j.isModoContinuo()&&!j.isReposicion()&&saldoReposicion(j.getIdUsuario())>0)alerta(j.getIdUsuario(),j.getFecha(),"Horas pendientes de reposición","Jornada cerrada. Saldo total por reponer: "+horas(saldoReposicion(j.getIdUsuario()))+" horas. Inicia reposición el sábado o domingo entre 07:00 y 17:00. Las horas quedan pendientes de revisión de actividades.");
    }
    private void alerta(Integer alumno,LocalDate fecha,String titulo,String mensaje) {
        Set<Integer> destinos=new HashSet<>();destinos.add(alumno);
        jdbc.queryForList("SELECT u.id_usuario AS id FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol WHERE u.estado='Activo' AND LOWER(r.nombre) IN ('superadministrador','administrador','admin pmo','admin_pmo','administrador pmo')").forEach(a->destinos.add(((Number)a.get("id")).intValue()));
        for(Integer id:destinos)jdbc.update("INSERT INTO pmo_recordatorios(clave,id_usuario,titulo,descripcion,enlace,estado,actualizado_en) VALUES(?,?,?,?,?,'Abierto',?) ON DUPLICATE KEY UPDATE titulo=VALUES(titulo),descripcion=VALUES(descripcion),estado='Abierto',actualizado_en=VALUES(actualizado_en)","jornada-falta-"+alumno+"-"+fecha+"-"+id,id,titulo,"Alumno #"+alumno+": "+mensaje,"control-horas.html",reloj.instant().atZone(ZONA).toLocalDateTime());
    }
    public Map<String,Object> habilitacionReporte(Integer usuario,LocalDate fecha) {
        actualizar(usuario,false);
        JornadaAutomatica j=jornadas.findByIdUsuarioAndFecha(usuario,fecha).orElse(null);
        Instant apertura=fecha.atTime(16,0).atZone(ZONA).toInstant(),ahora=reloj.instant();
        boolean habilitado=!ahora.isBefore(apertura);
        return Map.of("habilitado",habilitado,"segundos",j==null?0:j.getTotalSegundos(),
            "faltanSegundos",Math.max(0,Duration.between(ahora,apertura).getSeconds()),"horaApertura","16:00","zona","America/Mexico_City",
            "mensaje",habilitado?"El reporte diario está habilitado. Entrega las actividades y evidencias de cada proyecto; hora límite 17:00.":"El reporte diario se habilita a las 16:00 (4:00 p. m.), hora de Ciudad de México, independientemente de las horas acumuladas.");
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
