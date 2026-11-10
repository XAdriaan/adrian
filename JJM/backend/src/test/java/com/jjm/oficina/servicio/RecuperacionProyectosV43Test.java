package com.jjm.oficina.servicio;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class RecuperacionProyectosV43Test {
    @Test void recuperaSinBorrarRelacionesYRegistraLaReparacion() {
        JdbcTemplate db=mock(JdbcTemplate.class);
        Map<String,Object> pendiente=new HashMap<>();pendiente.put("aplicada",null);
        when(db.queryForList(contains("FOR UPDATE"))).thenReturn(List.of(pendiente));
        new RecuperacionProyectosV43(db,mock(PlatformTransactionManager.class)).run(null);
        verify(db).update(contains("NOT IN ('333','3333','444','555','eee','work')"));
        verify(db).update(contains("SET p.eliminado_en=NULL"));
        verify(db).update(contains("SET aplicada=CURRENT_TIMESTAMP"));
        verify(db,never()).update(startsWith("DELETE"));
    }
    @Test void noReviveProyectosEliminadosDespuesDeLaRecuperacion() {
        JdbcTemplate db=mock(JdbcTemplate.class);
        when(db.queryForList(contains("FOR UPDATE"))).thenReturn(List.of(Map.of("aplicada","2026-11-10")));
        new RecuperacionProyectosV43(db,mock(PlatformTransactionManager.class)).run(null);
        verify(db,never()).update(contains("SET p.eliminado_en=NULL"));
        verify(db,never()).update(contains("INSERT IGNORE INTO pmo_proyectos_recuperados_v43"));
    }
}
