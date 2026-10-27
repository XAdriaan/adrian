package com.jjm.oficina.controller;
import com.jjm.oficina.servicio.AvisosMovilesService;
import com.jjm.oficina.repositorio.UsuarioRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*;
import java.util.*;
@RestController @RequestMapping("/api/avisos-moviles")
public class AvisosMovilesController {
 private final AvisosMovilesService servicio;private final UsuarioRepository usuarios;
 public AvisosMovilesController(AvisosMovilesService s,UsuarioRepository u){servicio=s;usuarios=u;}
 private void acceso(Integer id){if(id==null||usuarios.findById(id).filter(u->"Activo".equalsIgnoreCase(u.getEstado())).isEmpty())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Inicia sesión.");}
 @GetMapping public Map<String,Object> config(@RequestHeader(value="X-Usuario-Id",required=false) Integer id){acceso(id);return Map.of("clavePublica",servicio.publica(),"horario","Lunes a viernes · 07:00 · Ciudad de México · Sala general");}
 public record Dispositivo(String endpoint,Map<String,String> keys){}
 @PostMapping public Map<String,String> registrar(@RequestHeader(value="X-Usuario-Id",required=false) Integer id,@RequestBody Dispositivo d){acceso(id);if(d.keys()==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Suscripción incompleta.");servicio.suscribir(id,d.endpoint(),d.keys().get("p256dh"),d.keys().get("auth"));return Map.of("mensaje","Avisos activados en este dispositivo.");}
 @DeleteMapping public void retirar(@RequestHeader(value="X-Usuario-Id",required=false) Integer id,@RequestBody Dispositivo d){acceso(id);servicio.retirar(id,d.endpoint());}
 @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<Map<String,String>> error(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("mensaje",Objects.toString(e.getReason(),"No se pudo activar el aviso.")));}
}
