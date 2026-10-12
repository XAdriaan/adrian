package com.jjm.oficina.controller;
import com.jjm.oficina.servicio.RegularizacionHorasService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/regularizacion-horas")
public class RegularizacionHorasController {
    private final RegularizacionHorasService servicio;
    public RegularizacionHorasController(RegularizacionHorasService servicio){this.servicio=servicio;}
    @GetMapping public Map<String,Object> previsualizar(@RequestHeader("X-Usuario-Id")Integer id){return servicio.previsualizar(id);}
    @PostMapping("/aplicar") public Map<String,Object> aplicar(@RequestHeader("X-Usuario-Id")Integer id){return servicio.aplicar(id);}
}
