package com.jjm.oficina.controller;

import com.jjm.oficina.servicio.PresenciaPlataformaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/presencia")
public class PresenciaPlataformaController {
    private final PresenciaPlataformaService presencia;
    public PresenciaPlataformaController(PresenciaPlataformaService presencia) { this.presencia=presencia; }
    public record Pulso(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,80}") String pagina,
            @NotNull @Pattern(regexp="[A-Za-z0-9-]{1,60}\\.html|/") String ruta) {}
    @PostMapping("/pulso")
    public Map<String,Object> pulso(@RequestHeader("X-Usuario-Id") Integer id,@Valid @RequestBody Pulso pulso) {
        return presencia.pulso(id,pulso.pagina(),pulso.ruta(),false);
    }
    @PostMapping("/salida")
    public Map<String,Object> salir(@RequestHeader("X-Usuario-Id") Integer id,@Valid @RequestBody Pulso pulso) {
        return presencia.pulso(id,pulso.pagina(),pulso.ruta(),true);
    }
    @GetMapping("/monitor")
    public Map<String,Object> monitor(@RequestHeader("X-Usuario-Id") Integer id,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return presencia.monitor(id,fecha);
    }
}
