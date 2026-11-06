package com.jjm.oficina.controller;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.UUID;

@Component
class SalasPrivadas {
    private final JdbcTemplate jdbc;
    SalasPrivadas(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @PostConstruct
    void preparar() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS sala_privada_miembros (sala VARCHAR(44) NOT NULL, usuario INT NOT NULL, PRIMARY KEY(sala, usuario))");
    }

    static boolean valida(String sala) {
        if (sala == null || !sala.startsWith("privada-") || sala.length() != 44) return false;
        try {
            UUID clave = UUID.fromString(sala.substring(8));
            return clave.version() == 4 && sala.equals("privada-" + clave);
        } catch (IllegalArgumentException e) { return false; }
    }

    void registrar(String sala, int usuario) {
        jdbc.update("INSERT INTO sala_privada_miembros (sala, usuario) VALUES (?, ?) ON DUPLICATE KEY UPDATE usuario=VALUES(usuario)", sala, usuario);
    }

    boolean integrante(String sala, int usuario) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM sala_privada_miembros WHERE sala=? AND usuario=?", Integer.class, sala, usuario) > 0;
    }
}