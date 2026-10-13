package com.jjm.oficina.controller;

import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.VozArdiaService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api/ardia/voz")
public class VozArdiaController {
    private final VozArdiaService servicio;private final UsuarioRepository usuarios;
    public VozArdiaController(VozArdiaService servicio,UsuarioRepository usuarios){this.servicio=servicio;this.usuarios=usuarios;}
    private void acceso(Integer id){if(id==null||usuarios.findById(id).filter(u->"Activo".equalsIgnoreCase(u.getEstado())).isEmpty())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Inicia sesión para usar Ard.IA.");}
    @GetMapping("/configuracion") public Map<String,Object> configuracion(@RequestHeader(value="X-Usuario-Id",required=false) Integer id){acceso(id);return servicio.configuracion();}
    public record Texto(String texto){}
    @PostMapping("/hablar") public ResponseEntity<byte[]> hablar(@RequestBody Texto texto,@RequestHeader(value="X-Usuario-Id",required=false) Integer id){acceso(id);return ResponseEntity.ok().contentType(MediaType.parseMediaType("audio/wav")).header(HttpHeaders.CACHE_CONTROL,"no-store").header("X-Content-Type-Options","nosniff").body(servicio.hablar(id,texto.texto()));}
    public record Audio(String base64,String mime){}
    @PostMapping("/transcribir") public Map<String,Object> transcribir(@RequestBody Audio audio,@RequestHeader(value="X-Usuario-Id",required=false) Integer id){acceso(id);return Map.of("texto",servicio.transcribir(id,audio.base64(),audio.mime()));}
    @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<Map<String,Object>> error(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("mensaje",Objects.toString(e.getReason(),"No se pudo completar la voz.")));}
}
