package com.jjm.oficina.servicio;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class EsquemaBajaProyecto {
    private final JdbcTemplate jdbc;
    public EsquemaBajaProyecto(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @PostConstruct
    void preparar() {
        Integer existe=jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='proyectos' AND column_name='eliminado_en'", Integer.class);
        if (existe == 0) {
            try { jdbc.execute("ALTER TABLE proyectos ADD COLUMN eliminado_en DATETIME NULL"); }
            catch (org.springframework.dao.DataAccessException e) {
                jdbc.queryForList("SELECT eliminado_en FROM proyectos LIMIT 0");
            }
        }
    }
}
