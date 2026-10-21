package com.jjm.oficina.controller;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.PlanIaLocalService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*;
import java.util.*;
@RestController
@RequestMapping("/api/ia-local")
public class AsistenteLocalController {
    private final UsuarioRepository usuarios;private final VideollamadaController llamadas;private final PlanIaLocalService ia;
    public AsistenteLocalController(UsuarioRepository usuarios,VideollamadaController llamadas,PlanIaLocalService ia){this.usuarios=usuarios;this.llamadas=llamadas;this.ia=ia;}
    private void comprobar(Integer id){if(id==null||usuarios.findById(id).filter(u->"Activo".equalsIgnoreCase(u.getEstado())).isEmpty())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Inicia sesión para usar la IA.");}
    public record Solicitud(String tipo,String texto,String sala,String conexion){}
    @PostMapping public Map<String,String> responder(@RequestHeader(value="X-Usuario-Id",required=false) Integer id,@RequestBody Solicitud s){
        comprobar(id);String tipo=Objects.toString(s.tipo(),"asistente");
        String contexto="reunion".equals(tipo)?llamadas.contextoChat(s.sala(),s.conexion(),id):"";
        var respuesta=ia.asistir(tipo,s.texto(),contexto);
        comprobar(id);if("reunion".equals(tipo))llamadas.contextoChat(s.sala(),s.conexion(),id);
        return respuesta;
    }
    @ExceptionHandler(ResponseStatusException.class)public ResponseEntity<Map<String,Object>> error(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("mensaje",Objects.toString(e.getReason(),"No se pudo completar la consulta.")));}
}
