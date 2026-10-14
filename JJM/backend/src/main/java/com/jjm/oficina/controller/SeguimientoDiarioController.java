package com.jjm.oficina.controller;

import com.jjm.oficina.servicio.SeguimientoDiarioService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/automatizaciones/seguimiento-diario")
public class SeguimientoDiarioController {
    private final SeguimientoDiarioService servicio;
    public SeguimientoDiarioController(SeguimientoDiarioService servicio) {this.servicio=servicio;}
    @GetMapping public Map<String,Object> consultar(@RequestHeader("X-Usuario-Id") Integer usuario,
            @RequestParam(defaultValue="false") boolean global) {return servicio.consultar(usuario,global);}
}
