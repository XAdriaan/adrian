package com.jjm.oficina.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/salud")
public class SaludController {

    private final JdbcTemplate jdbc;

    public SaludController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> salud() {
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("aplicacion", "oficina-proyectos-backend");

        try {
            Integer valor = jdbc.queryForObject("SELECT 1", Integer.class);
            respuesta.put("baseDatos", valor != null && valor == 1 ? "conectada" : "sin_respuesta");
            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            respuesta.put("estado", "error");
            respuesta.put("baseDatos", "sin_conexion");
            return ResponseEntity.status(503).body(respuesta);
        }
    }
}
