package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

/** Señalización WebRTC autenticada. No guarda audio, video ni señales en MySQL. */
@RestController
@RequestMapping("/api/videollamadas")
public class VideollamadaController {
    private static final long CADUCIDAD = 120_000;
    private final UsuarioRepository usuarios;
    private final ReunionController reuniones;
    private final Environment entorno;
    private final java.time.Clock reloj;
    @org.springframework.beans.factory.annotation.Autowired(required=false)
    private org.springframework.jdbc.core.JdbcTemplate jdbc;
    @org.springframework.beans.factory.annotation.Autowired(required=false)
    private com.jjm.oficina.servicio.CatalogoProyectosSepDic2026Service catalogo;
    private final Map<String, Sala> salas = new HashMap<>();
    private static class Sala {
        final Map<String, Conexion> conexiones = new LinkedHashMap<>();
        final Deque<Map<String,Object>> chat = new ArrayDeque<>();
        long mensaje = 0;
        final Map<Integer,Long> sinCamara=new HashMap<>();
        final Map<String,Long> expulsadas=new HashMap<>();
    }
    private static class Conexion {
        final String id = UUID.randomUUID().toString();
        final int usuario; final String nombre; final String proyectos; final boolean alumno;
        long actividad, secuencia = 0;
        long ventanaChat = 0, ultimaReaccion = 0;
        int mensajes = 0;
        boolean mano = false, audio = false, video = false, pantalla = false;
        final Deque<Map<String,Object>> eventos = new ArrayDeque<>();
        Conexion(Usuario u,String claves,long ahora) { usuario = u.getId(); nombre = u.getNombre() == null ? "Participante" : u.getNombre(); proyectos=claves; alumno=com.jjm.oficina.servicio.AsistenciaAutomaticaService.esAlumno(u);actividad=ahora; }
        Map<String,Object> resumen() { return Map.of("id", id, "usuario", usuario, "proyectos", proyectos, "nombre", nombre, "mano", mano, "audio", audio, "video", video, "pantalla", pantalla); }
    }
    public record Entrada(String conexion) {}
    public record Senal(String conexion, String destino, String tipo, Map<String,Object> datos) {}
    public record Interaccion(String conexion, String tipo, Map<String,Object> datos) {}
    private void emitir(Conexion destino, String origen, String tipo, Map<String,Object> datos) {
        destino.eventos.addLast(Map.of("secuencia", ++destino.secuencia, "origen", origen, "tipo", tipo, "datos", datos));
        while (destino.eventos.size() > 256) destino.eventos.removeFirst();
    }
    public VideollamadaController(UsuarioRepository usuarios, ReunionController reuniones, Environment entorno) {
        this(usuarios,reuniones,entorno,java.time.Clock.systemUTC());
    }
    @org.springframework.beans.factory.annotation.Autowired
    public VideollamadaController(UsuarioRepository usuarios,ReunionController reuniones,Environment entorno,java.time.Clock reloj){
        this.usuarios=usuarios;this.reuniones=reuniones;this.entorno=entorno;this.reloj=reloj;
    }
    private String clavesDe(Integer usuario){
        if(jdbc==null||catalogo==null)return "";
        try{return jdbc.queryForList("SELECT DISTINCT p.codigo,p.nombre FROM proyectos p JOIN miembros_proyecto mp ON mp.id_proyecto=p.id_proyecto JOIN miembros_equipo m ON m.id_miembro=mp.id_miembro WHERE m.id_usuario=?",usuario).stream().map(f->{
            com.jjm.oficina.modelo.Proyecto p=new com.jjm.oficina.modelo.Proyecto();p.setCodigo(Objects.toString(f.get("codigo"),""));p.setNombre(Objects.toString(f.get("nombre"),""));return catalogo.obtenerClaveAsignada(p);
        }).filter(v->!v.isBlank()).flatMap(v->Arrays.stream(v.split(" / "))).distinct().limit(6).collect(java.util.stream.Collectors.joining(" / "));}
        catch(RuntimeException e){return "";}
    }
    private Map<String,Object> controlCamara(Sala sala,Conexion c){
        if(!c.alumno)return Map.of("obligatoria",false);
        if(sala.conexiones.values().stream().anyMatch(p->p.usuario==c.usuario&&p.video)){
            sala.sinCamara.remove(c.usuario);return Map.of("obligatoria",true,"aviso",0,"segundosRestantes",300);
        }
        long inicio=sala.sinCamara.computeIfAbsent(c.usuario,k->reloj.millis());
        long segundos=Math.max(0,(reloj.millis()-inicio)/1000);
        return Map.of("obligatoria",true,"aviso",segundos<120?1:segundos<240?2:3,"segundosRestantes",Math.max(0,300-segundos));
    }
    private void revisarCamaras(Sala sala){
        for(Conexion c:List.copyOf(sala.conexiones.values())){
            Map<String,Object> regla=controlCamara(sala,c);
            if(c.alumno&&((Number)regla.get("segundosRestantes")).longValue()==0){
                sala.expulsadas.put(c.id,reloj.millis());sala.conexiones.remove(c.id);
            }
        }
    }
    private Usuario autorizar(String sala, Integer id) {
        Usuario u = id == null ? null : usuarios.findById(id).orElse(null);
        if (u == null || !"Activo".equalsIgnoreCase(u.getEstado()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicia sesión para entrar a la sala.");
        if (!"general".equals(sala)) {
            long reunion;
            try { reunion = Long.parseLong(sala); } catch (Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sala inválida."); }
            if (!reuniones.puedeAccederVideollamada(id, reunion))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La sala terminó o no estás asignado al proyecto.");
        }
        return u;
    }
    private void limpiar() {
        long ahora = reloj.millis();
        salas.values().forEach(s -> s.conexiones.values().removeIf(c -> ahora - c.actividad > CADUCIDAD));
        salas.values().forEach(s->s.expulsadas.entrySet().removeIf(e->ahora-e.getValue()>600_000));
        salas.values().removeIf(s -> s.conexiones.isEmpty()&&s.expulsadas.isEmpty());
    }
    private Conexion propia(Sala sala, String id, Usuario u) {
        Conexion c = sala == null ? null : sala.conexiones.get(id);
        if(sala!=null&&sala.expulsadas.containsKey(id))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Saliste de la llamada por mantener la cámara apagada durante cinco minutos. Revisa los permisos antes de volver a entrar.");
        if (c == null || c.usuario != u.getId())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vuelve a entrar a la sala.");
        c.actividad = reloj.millis(); return c;
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String,Object>> errorSala(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("estado", "error", "mensaje", Objects.toString(error.getReason(), "No se pudo conectar con la sala.")));
    }
    @GetMapping("/configuracion")
    public Map<String,Object> configuracion(@RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        autorizar("general", id);
        List<Map<String,Object>> ice = new ArrayList<>();
        ice.add(Map.of("urls", List.of("stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302")));
        String urls = entorno.getProperty("PMO_TURN_URLS", "").trim();
        String usuario = entorno.getProperty("PMO_TURN_USERNAME", "").trim();
        String clave = entorno.getProperty("PMO_TURN_CREDENTIAL", "");
        boolean relay = !urls.isBlank() && !usuario.isBlank() && !clave.isBlank();
        if (relay) ice.add(Map.of("urls", Arrays.stream(urls.split(",")).map(String::trim).toList(), "username", usuario, "credential", clave));
        return Map.of("estado", "correcto", "iceServers", ice, "relayDisponible", relay);
    }
    @PostMapping("/{sala}/entrar")
    public synchronized Map<String,Object> entrar(@PathVariable String sala,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        Usuario u = autorizar(sala, id); limpiar();
        Sala s = salas.computeIfAbsent(sala, k -> new Sala());
        if(s.conexiones.values().stream().filter(c->c.usuario==u.getId()).count()>=2)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Ya tienes dos dispositivos conectados. Sal de uno antes de abrir otro.");
        if(s.conexiones.values().stream().noneMatch(c->c.usuario==u.getId()))s.sinCamara.remove(u.getId());
        Conexion c = new Conexion(u,clavesDe(u.getId()),reloj.millis()); s.conexiones.put(c.id, c);
        controlCamara(s,c);
        return Map.of("estado", "correcto", "conexion", c.id, "participantes", s.conexiones.values().stream().map(Conexion::resumen).toList());
    }
    @GetMapping("/{sala}/eventos")
    public synchronized Map<String,Object> eventos(@PathVariable String sala, @RequestParam String conexion,
            @RequestParam(defaultValue="0") long desde,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        Usuario u = autorizar(sala, id); limpiar(); Sala s = salas.get(sala); if(s!=null)revisarCamaras(s); Conexion c = propia(s, conexion, u);
        // Expulsar asignaciones retiradas, incluso cuando el cliente no coopera.
        s.conexiones.values().removeIf(p -> {
            try { autorizar(sala, p.usuario); return false; } catch (ResponseStatusException e) { return true; }
        });
        if (desde < 0 || desde > c.secuencia) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Secuencia inválida.");
        if (!c.eventos.isEmpty() && desde < ((Number)c.eventos.peekFirst().get("secuencia")).longValue() - 1)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Las señales vencieron. Vuelve a conectar.");
        c.eventos.removeIf(e -> ((Number)e.get("secuencia")).longValue() <= desde);
        return Map.of("estado", "correcto", "participantes", s.conexiones.values().stream().map(Conexion::resumen).toList(),
                "eventos", List.copyOf(c.eventos), "secuencia", c.secuencia, "chat", List.copyOf(s.chat), "camaraControl", controlCamara(s,c));
    }
    @PostMapping("/{sala}/senal")
    public synchronized ResponseEntity<Map<String,Object>> senal(@PathVariable String sala, @RequestBody Senal entrada,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        Usuario u = autorizar(sala, id); limpiar(); Sala s = salas.get(sala); Conexion c = propia(s, entrada.conexion(), u);
        Conexion destino = s.conexiones.get(entrada.destino());
        if (destino == null || destino == c) throw new ResponseStatusException(HttpStatus.CONFLICT, "El participante salió.");
        autorizar(sala, destino.usuario);
        if (!Set.of("offer", "answer", "candidate", "reiniciar").contains(String.valueOf(entrada.tipo())) || entrada.datos() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Señal inválida.");
        Map<String,Object> datos = new HashMap<>();
        if ("candidate".equals(entrada.tipo())) {
            Object candidato = entrada.datos().get("candidate");
            if (!(candidato instanceof String texto) || texto.length() > 4096)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Candidato inválido.");
            datos.put("candidate", candidato);
            Object mid = entrada.datos().get("sdpMid"), indice = entrada.datos().get("sdpMLineIndex");
            if (mid instanceof String midTexto && midTexto.length() <= 100) datos.put("sdpMid", mid);
            if (indice instanceof Number n && n.intValue() >= 0 && n.intValue() <= 100) datos.put("sdpMLineIndex", n.intValue());
        } else if (!"reiniciar".equals(entrada.tipo())) {
            Object sdp = entrada.datos().get("sdp");
            if (!(sdp instanceof String texto) || texto.isBlank() || texto.length() > 100_000)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Descripción inválida.");
            datos.put("type", entrada.tipo()); datos.put("sdp", sdp);
        }
        emitir(destino, c.id, entrada.tipo(), datos);
        return ResponseEntity.ok(Map.of("estado", "correcto"));
    }
    @PostMapping("/{sala}/interaccion")
    public synchronized Map<String,Object> interaccion(@PathVariable String sala, @RequestBody Interaccion entrada,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        Usuario u = autorizar(sala, id); limpiar(); Sala s = salas.get(sala); Conexion c = propia(s, entrada.conexion(), u);
        if (entrada.datos() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Acción inválida.");
        Map<String,Object> datos = new HashMap<>(); long ahora = reloj.millis();
        switch (String.valueOf(entrada.tipo())) {
            case "estado" -> {
                for (String clave : List.of("mano", "audio", "video", "pantalla"))
                    if (!(entrada.datos().get(clave) instanceof Boolean)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado inválido.");
                boolean pantalla = (Boolean) entrada.datos().get("pantalla");
                if (pantalla && s.conexiones.values().stream().anyMatch(p -> p != c && p.pantalla))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Otra persona está presentando. Espera a que deje de compartir.");
                c.mano = (Boolean) entrada.datos().get("mano"); c.audio = (Boolean) entrada.datos().get("audio");
                c.video = (Boolean) entrada.datos().get("video"); c.pantalla = pantalla;
                controlCamara(s,c);
                return Map.of("estado", "correcto", "participante", c.resumen());
            }
            case "chat" -> {
                Object texto = entrada.datos().get("texto");
                if (!(texto instanceof String mensaje) || mensaje.isBlank() || mensaje.length() > 2000)
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escribe un mensaje de hasta 2000 caracteres.");
                if (ahora - c.ventanaChat >= 10_000) { c.ventanaChat = ahora; c.mensajes = 0; }
                if (c.mensajes >= 10) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Espera unos segundos antes de enviar otro mensaje.");
                c.mensajes++;
                datos.putAll(Map.of("id", ++s.mensaje, "nombre", c.nombre, "texto", mensaje.trim(), "fecha", ahora, "origen", c.id));
                s.chat.addLast(Map.copyOf(datos)); while (s.chat.size() > 100) s.chat.removeFirst();
            }
            case "reaccion" -> {
                Object emoji = entrada.datos().get("emoji");
                if (!(emoji instanceof String) || !Set.of("👍", "👏", "❤️", "😂", "🎉", "🤔").contains(emoji))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reacción inválida.");
                if (ahora - c.ultimaReaccion < 1000) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Espera un momento antes de reaccionar otra vez.");
                c.ultimaReaccion = ahora; datos.putAll(Map.of("emoji", emoji, "nombre", c.nombre));
            }
            case "captura" -> {
                if (ahora - c.ultimaReaccion < 1000) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Espera un momento antes de tomar otra captura.");
                c.ultimaReaccion = ahora; datos.put("nombre", c.nombre);
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Acción inválida.");
        }
        for (Conexion destino : s.conexiones.values()) {
            try { autorizar(sala, destino.usuario); emitir(destino, c.id, entrada.tipo(), Map.copyOf(datos)); }
            catch (ResponseStatusException ignorada) { /* El siguiente pulso retira el acceso revocado. */ }
        }
        return Map.of("estado", "correcto", "datos", datos);
    }
    @PostMapping("/{sala}/salir")
    public synchronized Map<String,Object> salir(@PathVariable String sala, @RequestBody Entrada entrada,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        Usuario u = autorizar("general", id); limpiar(); Sala s = salas.get(sala);
        if (s != null) { Conexion c = s.conexiones.get(entrada.conexion()); if (c != null && c.usuario == u.getId()) s.conexiones.remove(c.id); }
        return Map.of("estado", "correcto");
    }
}
