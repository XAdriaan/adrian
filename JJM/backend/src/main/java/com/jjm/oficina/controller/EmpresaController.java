package com.jjm.oficina.controller;

import com.jjm.oficina.dto.*;
import com.jjm.oficina.servicio.EmpresaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class EmpresaController {
    private final EmpresaService empresas;
    public EmpresaController(EmpresaService empresas) { this.empresas = empresas; }

    @PostMapping("/api/auth/registro-empresa")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> registrar(@Valid @RequestBody RegistroEmpresaRequest datos) {
        return empresas.registrar(datos);
    }

    @GetMapping("/api/empresas/proyectos")
    public Map<String, Object> consultar(@RequestHeader("X-Usuario-Id") Integer usuario) {
        return empresas.consultar(usuario);
    }

    @PostMapping("/api/empresas/proyectos")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> proyecto(@RequestHeader("X-Usuario-Id") Integer usuario,
            @Valid @RequestBody ProyectoEmpresaRequest datos) {
        return empresas.registrarProyecto(usuario, datos);
    }

    @GetMapping("/api/empresas/proyectos/{id}")
    public Map<String, Object> detalle(@RequestHeader("X-Usuario-Id") Integer usuario,
            @PathVariable Integer id) {
        return empresas.detalle(usuario, id);
    }
}
