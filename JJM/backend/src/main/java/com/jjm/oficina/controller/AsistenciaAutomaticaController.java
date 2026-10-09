package com.jjm.oficina.controller;

import com.jjm.oficina.servicio.AsistenciaAutomaticaService;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/asistencia-automatica")
public class AsistenciaAutomaticaController {
    private final AsistenciaAutomaticaService asistencia;
    public AsistenciaAutomaticaController(AsistenciaAutomaticaService asistencia) { this.asistencia = asistencia; }
    public record Pagina(@NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{8,80}") String pagina) {}
    @PostMapping("/presencia")
    public Map<String, Object> presencia(@RequestHeader("X-Usuario-Id") Integer usuario,
            @Valid @RequestBody Pagina pagina) {
        return asistencia.actualizar(usuario, true, pagina.pagina(), false);
    }
    @PostMapping("/salida")
    public Map<String, Object> salida(@RequestHeader("X-Usuario-Id") Integer usuario,
            @Valid @RequestBody Pagina pagina) {
        return asistencia.actualizar(usuario, false, pagina.pagina(), true);
    }
    @GetMapping
    public Map<String, Object> consultar(@RequestHeader("X-Usuario-Id") Integer usuario) {
        return asistencia.actualizar(usuario, false);
    }
}
