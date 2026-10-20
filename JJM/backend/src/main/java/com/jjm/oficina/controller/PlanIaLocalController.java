package com.jjm.oficina.controller;

import com.jjm.oficina.repositorio.ProyectoRepository;
import com.jjm.oficina.servicio.PlanIaLocalService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api/canales/proyectos/{proyecto}/plan-ia")
public class PlanIaLocalController {
    private final CanalProyectoController canales;private final ProyectoRepository proyectos;private final PlanIaLocalService ia;
    public PlanIaLocalController(CanalProyectoController canales,ProyectoRepository proyectos,PlanIaLocalService ia){this.canales=canales;this.proyectos=proyectos;this.ia=ia;}
    @GetMapping public Map<String,Object> estado(@PathVariable Integer proyecto,@RequestHeader(value="X-Usuario-Id",required=false) Integer id){canales.canal(proyecto,id);return ia.configuracion();}
    public record Solicitud(String objetivo){}
    @PostMapping public PlanIaLocalService.Plan generar(@PathVariable Integer proyecto,@RequestHeader(value="X-Usuario-Id",required=false) Integer id,@RequestBody Solicitud solicitud){
        canales.canal(proyecto,id); // Mismos permisos de acceso que reuniones y documentos del proyecto.
        var p=proyectos.findById(proyecto).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"El proyecto no existe."));
        return ia.proponer(p.getNombre(),p.getDescripcion(),solicitud.objetivo());
    }
    @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<Map<String,Object>> error(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("mensaje",Objects.toString(e.getReason(),"No se pudo completar la propuesta.")));}
}
