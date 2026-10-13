package com.jjm.oficina.servicio;
import com.jjm.oficina.controller.CanalProyectoController.Reporte;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ReportesDiariosTest {
    final JdbcTemplate jdbc=mock(JdbcTemplate.class);ReportesDiariosService s;
    static class Tx extends AbstractPlatformTransactionManager {protected Object doGetTransaction(){return new Object();}protected void doBegin(Object x,org.springframework.transaction.TransactionDefinition d){}protected void doCommit(DefaultTransactionStatus s){}protected void doRollback(DefaultTransactionStatus s){}}
    void reloj(String instant){s=new ReportesDiariosService(jdbc,Clock.fixed(Instant.parse(instant),ZoneOffset.UTC),new Tx());}
    @BeforeEach void preparar(){reloj("2026-10-13T22:59:00Z");when(jdbc.queryForList(contains("SELECT inicio"))).thenReturn(List.of(Map.of("inicio","2026-10-13")));}
    Reporte reporte(String fecha){return new Reporte(fecha,"Implementé el formulario de entregas","Formulario probado con evidencia","https://example.org/entrega",null,"Ejecución",4.0,"");}
    @Test void antesDelCorteLocalEntregaEnPlazoSinDuplicarHoras(){when(jdbc.queryForList(contains("SELECT id FROM pmo_reportes_actividad"),any(Object[].class))).thenReturn(List.of(Map.of("id",20L)));assertEquals(false,s.guardar(2,7,reporte("2026-10-13")).get("fueraPlazo"));verify(jdbc).update(contains("INSERT INTO pmo_reporte_diario_historial"),any(Object[].class));verify(jdbc,never()).update(contains("registros_horas"),any(Object[].class));verify(jdbc).update(contains("primera_entrega"),eq(2),eq(7),eq(LocalDate.of(2026,10,13)),anyString(),anyString(),anyString(),isNull(),anyString(),eq(4.0),anyString(),eq(LocalDateTime.of(2026,10,13,16,59)),eq(LocalDateTime.of(2026,10,13,16,59)),eq(false));}
    @Test void despuesDe17MarcaTardeYNoAprueba(){reloj("2026-10-13T23:01:00Z");assertEquals(true,s.guardar(2,7,reporte("2026-10-13")).get("fueraPlazo"));verify(jdbc,never()).update(contains("estado='Aprobado'"),any(Object[].class));}
    @Test void noAceptaFechaFuturaNiCreaPenalizacionRetroactiva(){for(String fecha:List.of("2026-10-14","2026-09-01"))assertThrows(ResponseStatusException.class,()->s.guardar(2,7,reporte(fecha)));verify(jdbc,never()).update(anyString(),any(Object[].class));}
    @Test void unReporteAprobadoQuedaProtegido(){when(jdbc.queryForList(contains("FOR UPDATE"),any(Object[].class))).thenReturn(List.of(Map.of("id",20L,"estado","Aprobado")));assertEquals(409,assertThrows(ResponseStatusException.class,()->s.guardar(2,7,reporte("2026-10-13"))).getStatusCode().value());verify(jdbc,never()).update(anyString(),any(Object[].class));}
    @Test void evidenciaDeOtroProyectoOEnlacePeligrosoNoSeGuarda(){Reporte r=reporte("2026-10-13");assertThrows(ResponseStatusException.class,()->s.guardar(2,7,new Reporte(r.fecha(),r.actividad(),r.resultado(),"",99L,r.fase(),r.horas(),"")));assertThrows(ResponseStatusException.class,()->s.guardar(2,7,new Reporte(r.fecha(),r.actividad(),r.resultado(),"javascript:alert(1)",null,r.fase(),r.horas(),"")));verify(jdbc).queryForList(contains("id=? AND id_proyecto=?"),eq(99L),eq(2));verify(jdbc,never()).update(anyString(),any(Object[].class));}
    @Test void listarAlumnoSeLimitaASuCuentaYMes(){s.listar(2,7,false,YearMonth.of(2026,10));verify(jdbc).queryForList(contains("AND r.id_usuario=?"),eq(2),eq(LocalDate.of(2026,10,1)),eq(LocalDate.of(2026,10,31)),eq(7));}
    @Test void calendarioNoLaboralNoInfluyeEnAlertasDelHorario(){reloj("2026-10-13T23:01:00Z");when(jdbc.queryForList(contains("SELECT DISTINCT u.id_usuario"),any(Object[].class))).thenReturn(List.of(Map.of("usuario",7,"proyecto",2,"nombre","Alumno","proyectoNombre","Proyecto")));s.revisarPlazos();verify(jdbc).queryForList(contains("u.fecha_registro<=?"),eq(LocalDateTime.of(2026,10,13,17,0)),eq(LocalDateTime.of(2026,10,13,17,0)),eq(LocalDate.of(2026,10,13)));verify(jdbc).update(contains("ON DUPLICATE KEY"),eq("diario-falta-2-7-2026-10-13-7"),eq(7),anyString(),anyString(),eq("canales-proyectos.html?id=2#diario"),any(LocalDateTime.class));verify(jdbc,never()).queryForList(contains("pmo_calendario_proyecto"),any(Object[].class));}
    @Test void noGeneraFaltaAntesDe17NiFinDeSemana(){for(String instant:List.of("2026-10-13T22:59:00Z","2026-10-17T23:01:00Z")){reset(jdbc);String fecha=instant.substring(0,10);when(jdbc.queryForList(contains("SELECT inicio"))).thenReturn(List.of(Map.of("inicio",fecha)));reloj(instant);s.revisarPlazos();verify(jdbc,never()).queryForList(contains("SELECT DISTINCT u.id_usuario"),any(Object[].class));}}
    @Test void revisionNecesitaMotivoSiSeObservaYReporteDebePertenecerAlProyecto(){assertThrows(ResponseStatusException.class,()->s.revisar(2,99L,1,"Observado",""));assertThrows(ResponseStatusException.class,()->s.revisar(2,99L,1,"Aprobado",""));verify(jdbc).update(contains("WHERE id=? AND id_proyecto=?"),eq("Aprobado"),eq(""),eq(1),any(LocalDateTime.class),eq(99L),eq(2));}
}
