package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import org.springframework.boot.*;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import jakarta.annotation.PostConstruct;

/** Corte fijo autorizado: también alcanza a altas posteriores del mismo periodo. */
@Service @Order(30)
public class ReconocimientoHoras2026Service implements ApplicationRunner {
    public static final LocalDate CORTE=LocalDate.of(2026,10,13);
    public static final String ORIGEN="Reconocimiento administrativo autorizado Sep-Dic 2026 (01/09/2026 a 13/10/2026).";
    private final UsuarioRepository usuarios;private final MiembroEquipoRepository miembros;private final RegistroHorasRepository registros;
    private final JornadaAutomaticaRepository jornadas;private final JdbcTemplate jdbc;private final Clock reloj;private final TransactionTemplate tx;private final BitacoraService bitacora;
    public ReconocimientoHoras2026Service(UsuarioRepository usuarios,MiembroEquipoRepository miembros,RegistroHorasRepository registros,JornadaAutomaticaRepository jornadas,JdbcTemplate jdbc,Clock reloj,PlatformTransactionManager gestor,BitacoraService bitacora){this.usuarios=usuarios;this.miembros=miembros;this.registros=registros;this.jornadas=jornadas;this.jdbc=jdbc;this.reloj=reloj;this.tx=new TransactionTemplate(gestor);this.bitacora=bitacora;}
    public static List<LocalDate> dias(){return RegularizacionHorasService.DESDE.datesUntil(CORTE.plusDays(1)).filter(d->d.getDayOfWeek().getValue()<=5).toList();}
    @PostConstruct public void preparar(){jdbc.execute("CREATE TABLE IF NOT EXISTS pmo_reconocimiento2026(id_usuario INT PRIMARY KEY,corte DATE NOT NULL,aplicado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");}
    @Override public void run(ApplicationArguments args){sincronizar();}
    @Scheduled(fixedDelay=60000,initialDelay=15000) public void sincronizar(){
        if(reloj.instant().atZone(AsistenciaAutomaticaService.ZONA).toLocalDate().isBefore(CORTE))return;
        for(Map<String,Object> f:jdbc.queryForList("SELECT u.id_usuario AS id,r.nombre AS rol,d.periodo_estadia AS periodo,d.fecha_inicio AS inicio FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol JOIN datos_academicos_usuario d ON d.id_usuario=u.id_usuario WHERE u.estado='Activo' AND NOT EXISTS(SELECT 1 FROM pmo_reconocimiento2026 x WHERE x.id_usuario=u.id_usuario)"))if(RegularizacionHorasService.corresponde(f)){
            Integer id=((Number)f.get("id")).intValue();try{reconocer(id);}catch(RuntimeException e){java.util.logging.Logger.getLogger(getClass().getName()).warning("No se pudo reconocer el corte del alumno #"+id+". Se reintentará sin duplicar horas.");}
        }
    }
    public void reconocer(Integer id){tx.executeWithoutResult(t->{
        Usuario u=usuarios.buscarParaAsistencia(id).orElse(null);if(!AsistenciaAutomaticaService.esAlumno(u))return;
        if(!jdbc.queryForList("SELECT id_usuario FROM pmo_reconocimiento2026 WHERE id_usuario=?",id).isEmpty())return;
        if(jdbc.queryForList("SELECT r.nombre AS rol,d.periodo_estadia AS periodo,d.fecha_inicio AS inicio FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol JOIN datos_academicos_usuario d ON d.id_usuario=u.id_usuario WHERE u.id_usuario=?",id).stream().noneMatch(RegularizacionHorasService::corresponde))return;
        MiembroEquipo m=miembros.buscarParaRegularizacion(id).orElse(null);
        if(m==null){m=new MiembroEquipo();m.setUsuario(u);m.setNombreCompleto(String.join(" ",Objects.toString(u.getNombre(),""),Objects.toString(u.getApellidoPaterno(),""),Objects.toString(u.getApellidoMaterno(),"")).trim());m.setCorreo(u.getCorreo());m.setTelefono(u.getTelefono());m.setRol(u.getRol().getNombre());m.setEstado("Activo");m.setHorasDisponibles(BigDecimal.ZERO);m=miembros.saveAndFlush(m);}
        if(!"Activo".equalsIgnoreCase(m.getEstado()))return;
        List<RegistroHoras> lista=registros.buscarParaRegularizacion(m.getId(),RegularizacionHorasService.DESDE,CORTE);int cambios=0;BigDecimal nuevas=BigDecimal.ZERO;
        for(LocalDate dia:dias()){
            BigDecimal total=BigDecimal.ZERO;
            for(RegistroHoras r:lista)if(dia.equals(r.getFecha())&&!"Rechazado".equalsIgnoreCase(r.getEstadoValidacion())){
                BigDecimal horas=r.getHorasTrabajadas()==null?BigDecimal.ZERO:r.getHorasTrabajadas().max(BigDecimal.ZERO);total=total.add(horas);
                if(!"Aprobado".equalsIgnoreCase(r.getEstadoValidacion())){r.setEstadoValidacion("Aprobado");r.setIdUsuarioValidador(null);registros.save(r);cambios++;}
            }
            BigDecimal faltan=BigDecimal.TEN.subtract(total).max(BigDecimal.ZERO);if(faltan.signum()==0)continue;
            RegistroHoras r=new RegistroHoras();r.setIdMiembro(m.getId());r.setFecha(dia);r.setTipoRegistro("Manual");r.setIncidente("normal");r.setDescripcion(ORIGEN+" Horario reconocido: 07:00 a 17:00. No corresponde a conexión observada.");r.setHorasTrabajadas(faltan);r.setEstadoValidacion("Aprobado");registros.saveAndFlush(r);nuevas=nuevas.add(faltan);cambios++;
        }
        for(JornadaAutomatica j:jornadas.findByIdUsuarioAndFinalizadaFalse(id))if(!j.getFecha().isBefore(RegularizacionHorasService.DESDE)&&!j.getFecha().isAfter(CORTE)){j.setFinalizada(true);j.setConexiones("");jornadas.save(j);registros.findById(j.getIdRegistro()).ifPresent(r->{if(r.getHoraSalida()==null){r.setHoraSalida(Instant.ofEpochSecond(j.getLiquidado()).atZone(AsistenciaAutomaticaService.ZONA).toLocalTime().withNano(0));registros.save(r);}});}
        if(cambios>0)bitacora.registrar(null,"HORAS","RECONOCIMIENTO_310H_2026","Usuarios",id,"Reconocimiento autorizado de 31 días hábiles, 310 horas objetivo. Se conserva el tiempo previo y solo se completa el faltante del corte.",null,nuevas.toPlainString());
        jdbc.update("INSERT INTO pmo_reconocimiento2026(id_usuario,corte) VALUES(?,?)",id,CORTE);
    });}
}
