package com.jjm.oficina.servicio;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.*;
import java.time.*;import java.math.BigDecimal;import java.util.*;
import static org.junit.jupiter.api.Assertions.*;import static org.mockito.Mockito.*;import static org.mockito.ArgumentMatchers.*;
class AjustePersonalOctubreTest {
 static class Tx extends AbstractPlatformTransactionManager {protected Object doGetTransaction(){return new Object();}protected void doBegin(Object x,org.springframework.transaction.TransactionDefinition d){}protected void doCommit(DefaultTransactionStatus s){}protected void doRollback(DefaultTransactionStatus s){}}
 JdbcTemplate jdbc=mock(JdbcTemplate.class);BitacoraService bitacora=mock(BitacoraService.class);
 AjustePersonalOctubreService servicio(boolean activo){return new AjustePersonalOctubreService(jdbc,new Tx(),Clock.fixed(Instant.parse("2026-10-26T23:00:00Z"),ZoneOffset.UTC),bitacora,activo);}
 @BeforeEach void base(){when(jdbc.queryForList(contains("FROM usuarios"),eq(AjustePersonalOctubreService.CORREO))).thenReturn(List.of(Map.of("id_usuario",7)));when(jdbc.queryForList(contains("FROM miembros_equipo"),eq(7))).thenReturn(List.of(Map.of("id_miembro",12)));when(jdbc.queryForObject(anyString(),eq(BigDecimal.class),eq(12),any(LocalDate.class))).thenReturn(new BigDecimal("3.25"));}
 @Test void corteFijoSoloCuarentaDiasHabiles(){var dias=AjustePersonalOctubreService.dias();assertEquals(44,dias.size());assertEquals(LocalDate.of(2026,10,30),dias.getLast());assertTrue(dias.stream().allMatch(d->d.getDayOfWeek().getValue()<6));}
 @Test void completaSoloFaltanteCuentaObjetivo(){servicio(true).run(null);verify(jdbc,times(44)).update(contains("INSERT INTO registros_horas"),eq(12),any(LocalDate.class),eq(new BigDecimal("6.75")),anyString());verify(jdbc).update(contains("UPDATE jornadas_automaticas"),eq(7),eq(LocalDate.of(2026,9,1)),eq(LocalDate.of(2026,10,30)));verify(jdbc,never()).update(contains("UPDATE usuarios"),any(Object[].class));verify(jdbc).update(contains("INSERT INTO pmo_ajustes_personales"),eq(7),eq(LocalDate.of(2026,10,30)),eq(new BigDecimal("297.00")));}
 @Test void reinicioNoDuplica(){when(jdbc.queryForList(contains("FROM pmo_ajustes_personales"),eq(7),any(LocalDate.class))).thenReturn(List.of(Map.of("id_usuario",7)));servicio(true).run(null);verify(jdbc,never()).update(anyString(),any(Object[].class));}
 @Test void deshabilitadoNoTocaBase(){servicio(false).run(null);verifyNoInteractions(jdbc,bitacora);}
 @Test void duplicadosNoSeAjustan(){when(jdbc.queryForList(contains("FROM usuarios"),anyString())).thenReturn(List.of(Map.of("id_usuario",7),Map.of("id_usuario",8)));assertThrows(IllegalStateException.class,()->servicio(true).run(null));verify(jdbc,never()).update(anyString(),any(Object[].class));}
}
