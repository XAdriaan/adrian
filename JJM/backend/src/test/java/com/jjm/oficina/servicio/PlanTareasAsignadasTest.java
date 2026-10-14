package com.jjm.oficina.servicio;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import java.time.*;import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import static org.mockito.Mockito.*;import static org.junit.jupiter.api.Assertions.*;
class PlanTareasAsignadasTest {
    @Test void cadaAlumnoRecibe21TareasOrdenadasSinDuplicarNiTocarLasAnteriores(){
        JdbcTemplate jdbc=mock(JdbcTemplate.class);TareaRepository tareas=mock(TareaRepository.class);FaseProyectoRepository fases=mock(FaseProyectoRepository.class);PlatformTransactionManager tx=mock(PlatformTransactionManager.class);when(tx.getTransaction(any())).thenReturn(new SimpleTransactionStatus());Set<String> marcadores=new HashSet<>();List<Tarea> creadas=new ArrayList<>();List<FaseProyecto> etapas=new ArrayList<>();
        when(jdbc.queryForList(anyString(),any(Object[].class))).thenAnswer(i->{Object[] a=i.getArguments();String sql=(String)a[0];if(sql.contains("FOR UPDATE"))return List.of(Map.of("id_proyecto",2));String k=a[1]+":"+a[2]+":"+a[3];return marcadores.contains(k)?List.of(Map.of("id_tarea",1)):List.of();});
        when(jdbc.update(contains("INSERT INTO pmo_tareas_plan2026"),any(Object[].class))).thenAnswer(i->{Object[] a=i.getArguments();marcadores.add(a[1]+":"+a[2]+":"+a[3]);return 1;});
        when(fases.findByIdProyectoOrderByNumeroOrdenAsc(2)).thenAnswer(i->new ArrayList<>(etapas));when(fases.saveAndFlush(any())).thenAnswer(i->{FaseProyecto f=i.getArgument(0);f.setId(etapas.size()+1);etapas.add(f);return f;});when(tareas.saveAndFlush(any())).thenAnswer(i->{Tarea t=i.getArgument(0);t.setId(creadas.size()+1);creadas.add(t);return t;});
        PlanTareasAsignadasService s=new PlanTareasAsignadasService(jdbc,tareas,fases,Clock.fixed(Instant.parse("2026-10-13T18:00:00Z"),ZoneOffset.UTC),tx);s.crear(2,42,"Oficina de Proyectos");s.crear(2,42,"Oficina de Proyectos");s.crear(2,43,"Oficina de Proyectos");
        assertEquals(42,creadas.size());assertEquals(21,etapas.size());assertEquals(21,creadas.stream().filter(t->t.getIdMiembroAsignado()==42).count());assertEquals("Pendiente",creadas.getFirst().getEstado());assertTrue(creadas.getFirst().getTitulo().startsWith("01 ·"));assertTrue(creadas.get(20).getTitulo().contains("F8"));assertEquals(0,creadas.getFirst().getHorasRegistradas().signum());verify(tareas,never()).save(any());
    }
    @Test void noCreaPlanCuandoLaCuentaYaNoEsAlumnoONoTieneAsignacion(){
        JdbcTemplate jdbc=mock(JdbcTemplate.class);TareaRepository tareas=mock(TareaRepository.class);FaseProyectoRepository fases=mock(FaseProyectoRepository.class);PlatformTransactionManager tx=mock(PlatformTransactionManager.class);
        when(tx.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(jdbc.queryForList(contains("FOR UPDATE"),any(Object[].class))).thenReturn(List.of());
        PlanTareasAsignadasService s=new PlanTareasAsignadasService(jdbc,tareas,fases,Clock.fixed(Instant.parse("2026-10-13T18:00:00Z"),ZoneOffset.UTC),tx);
        s.crear(2,42,"Oficina de Proyectos");
        verify(jdbc).queryForList(argThat(sql->sql.contains("mp.id_miembro=?")&&sql.contains("LOWER(TRIM(r.nombre))")&&sql.contains("NOT LIKE 'asesor%'")),eq(2),eq(42));
        verifyNoInteractions(tareas,fases);verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
}
