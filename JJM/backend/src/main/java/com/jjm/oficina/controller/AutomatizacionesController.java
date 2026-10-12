package com.jjm.oficina.controller;

import com.jjm.oficina.servicio.AutomatizacionesService;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/automatizaciones")
public class AutomatizacionesController {
    private final AutomatizacionesService servicio;
    public AutomatizacionesController(AutomatizacionesService servicio){this.servicio=servicio;}
    @GetMapping public Map<String,Object> panel(@RequestHeader("X-Usuario-Id")Integer id){return servicio.panel(id,true);}
    @GetMapping("/mi-seguimiento") public Map<String,Object> propio(@RequestHeader("X-Usuario-Id")Integer id){return servicio.panel(id,false);}
    @GetMapping("/mis-recordatorios") public Map<String,Object> avisos(@RequestHeader("X-Usuario-Id")Integer id){return Map.of("estado","correcto","recordatorios",servicio.misRecordatorios(id));}
    @PostMapping("/revisar") public Map<String,Object> revisar(@RequestHeader("X-Usuario-Id")Integer id){return servicio.ejecutar(id,true);}
    @PutMapping("/configuracion") public Map<String,Object> configurar(@RequestHeader("X-Usuario-Id")Integer id,@RequestBody Map<String,Object> datos){return servicio.configurar(id,datos);}
    @PostMapping("/recordatorios/{aviso}/leido") public Map<String,Object> leido(@RequestHeader("X-Usuario-Id")Integer id,@PathVariable Long aviso){servicio.marcarLeido(id,aviso);return Map.of("estado","correcto");}
    @GetMapping("/reportes/{reporte}") public Map<String,Object> reporte(@RequestHeader("X-Usuario-Id")Integer id,@PathVariable Long reporte){return servicio.obtenerReporte(id,reporte);}
    @GetMapping("/borradores/{borrador}") public Map<String,Object> borrador(@RequestHeader("X-Usuario-Id")Integer id,@PathVariable Long borrador){return servicio.obtenerBorrador(id,borrador);}
    @PostMapping("/certificados/{curso}") public Map<String,Object> certificado(@RequestHeader("X-Usuario-Id")Integer id,@PathVariable Integer curso,@RequestBody Map<String,Object> datos){return servicio.subirCertificado(id,curso,datos);}
    @GetMapping("/certificados/{curso}") public Map<String,Object> obtenerCertificado(@RequestHeader("X-Usuario-Id")Integer id,@PathVariable Integer curso){return servicio.obtenerCertificado(id,curso);}
}
