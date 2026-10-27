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
    private final java.util.concurrent.ExecutorService motor=new java.util.concurrent.ThreadPoolExecutor(1,1,0,java.util.concurrent.TimeUnit.SECONDS,new java.util.concurrent.SynchronousQueue<>(),r->{Thread t=new Thread(r,"ia-local");t.setDaemon(true);return t;});
    private static class Trabajo {final Integer usuario;final Solicitud solicitud;final long creado=System.currentTimeMillis();volatile Map<String,String> resultado;volatile String error;Trabajo(Integer u,Solicitud s){usuario=u;solicitud=s;}}
    private final Map<String,Trabajo> trabajos=new java.util.concurrent.ConcurrentHashMap<>();
    @jakarta.annotation.PreDestroy public void cerrar(){motor.shutdownNow();}
    @PostMapping("/trabajos") public Map<String,String> iniciar(@RequestHeader(value="X-Usuario-Id",required=false) Integer id,@RequestBody Solicitud s){
        comprobar(id);
        if(s.texto()==null||s.texto().isBlank()||s.texto().length()>4000||!Set.of("asistente","reporte","reunion").contains(Objects.toString(s.tipo(),"asistente")))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Escribe una solicitud válida de hasta 4000 caracteres.");
        if("reunion".equals(s.tipo()))llamadas.contextoChat(s.sala(),s.conexion(),id);
        trabajos.entrySet().removeIf(e->System.currentTimeMillis()-e.getValue().creado>600000);
        if(trabajos.size()>=64)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Espera unos minutos para otra consulta.");
        String clave=UUID.randomUUID().toString();Trabajo t=new Trabajo(id,s);trabajos.put(clave,t);
        try{motor.execute(()->{try{t.resultado=responder(id,s);}catch(ResponseStatusException e){t.error=Objects.toString(e.getReason(),"No se pudo preparar el borrador.");}catch(Exception e){t.error="No se pudo preparar el borrador. Reintenta.";}});}catch(java.util.concurrent.RejectedExecutionException e){trabajos.remove(clave);throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"La IA está ocupada. Reintenta cuando termine la consulta actual.");}
        return Map.of("id",clave,"estado","preparando");
    }
    @GetMapping("/trabajos/{clave}") public Map<String,Object> estado(@RequestHeader(value="X-Usuario-Id",required=false) Integer id,@PathVariable String clave){
        comprobar(id);Trabajo t=trabajos.get(clave);
        if(t==null||!t.usuario.equals(id)||System.currentTimeMillis()-t.creado>600000)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"La consulta expiró o no pertenece a tu sesión. Vuelve a generar.");
        if("reunion".equals(t.solicitud.tipo()))llamadas.contextoChat(t.solicitud.sala(),t.solicitud.conexion(),id);
        if(t.error!=null)return Map.of("estado","error","mensaje",t.error);
        if(t.resultado!=null)return Map.of("estado","listo","respuesta",t.resultado.get("respuesta"),"aviso",t.resultado.get("aviso"));
        return Map.of("estado","preparando");
    }
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
