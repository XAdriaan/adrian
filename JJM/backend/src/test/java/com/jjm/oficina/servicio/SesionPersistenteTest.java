package com.jjm.oficina.servicio;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.EmptyResultDataAccessException;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class SesionPersistenteTest {
    @Test void doceHorasUsanRelojDeBaseSinDesfaseDeJava(){JdbcTemplate jdbc=mock(JdbcTemplate.class);SesionService s=new SesionService(jdbc);String token=s.crearSesion(7);assertTrue(token.length()>30);verify(jdbc).update(contains("DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 12 HOUR)"),anyString(),eq(7));}
    @Test void noReviveSesionesVencidasYGuardaSoloHash(){JdbcTemplate jdbc=mock(JdbcTemplate.class);SesionService s=new SesionService(jdbc);assertFalse(s.renovar("vencida"));verify(jdbc).update(contains("expira_en>CURRENT_TIMESTAMP"),argThat((Object v)->v instanceof String&&((String)v).length()==64&&!v.equals("vencida")));}
    @Test void vencidaTieneCeroSegundos(){JdbcTemplate jdbc=mock(JdbcTemplate.class);when(jdbc.queryForObject(anyString(),eq(Long.class),any(Object[].class))).thenThrow(new EmptyResultDataAccessException(1));assertEquals(0,new SesionService(jdbc).segundosRestantes("token"));}
}
