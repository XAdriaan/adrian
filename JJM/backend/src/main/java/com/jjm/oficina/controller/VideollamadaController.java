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
    private final Map<String, Sala> salas = new HashMap<>();
    private static class Sala { final Map<String, Conexion> conexiones = new LinkedHashMap<>(); }
    private static class Conexion {
        final String id = UUID.randomUUID().toString();
        final int usuario; final String nombre;
        long actividad = System.currentTimeMillis(), secuencia = 0;
        final Deque<Map<String,Object>> eventos = new ArrayDeque<>();
        Conexion(Usuario u) { usuario = u.getId(); nombre = u.getNombre() == null ? "Participante" : u.getNombre(); }
        Map<String,Object> resumen() { return Map.of("id", id, "nombre", nombre); }
    }
    public record Entrada(String conexion) {}
    public record Senal(String conexion, String destino, String tipo, Map<String,Object> datos) {}
    public VideollamadaController(UsuarioRepository usuarios, ReunionController reuniones, Environment entorno) {
        this.usuarios = usuarios; this.reuniones = reuniones; this.entorno = entorno;
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
        long ahora = System.currentTimeMillis();
        salas.values().forEach(s -> s.conexiones.values().removeIf(c -> ahora - c.actividad > CADUCIDAD));
        salas.values().removeIf(s -> s.conexiones.isEmpty());
    }
    private Conexion propia(Sala sala, String id, Usuario u) {
        Conexion c = sala == null ? null : sala.conexiones.get(id);
        if (c == null || c.usuario != u.getId())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vuelve a entrar a la sala.");
        c.actividad = System.currentTimeMillis(); return c;
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
        // Una conexión por cuenta y sala; una pestaña nueva sustituye la anterior.
        s.conexiones.values().removeIf(c -> c.usuario == u.getId());
        Conexion c = new Conexion(u); s.conexiones.put(c.id, c);
        return Map.of("estado", "correcto", "conexion", c.id, "participantes", s.conexiones.values().stream().map(Conexion::resumen).toList());
    }
    @GetMapping("/{sala}/eventos")
    public synchronized Map<String,Object> eventos(@PathVariable String sala, @RequestParam String conexion,
            @RequestParam(defaultValue="0") long desde,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        Usuario u = autorizar(sala, id); limpiar(); Sala s = salas.get(sala); Conexion c = propia(s, conexion, u);
        // Expulsar asignaciones retiradas, incluso cuando el cliente no coopera.
        s.conexiones.values().removeIf(p -> {
            try { autorizar(sala, p.usuario); return false; } catch (ResponseStatusException e) { return true; }
        });
        if (desde < 0 || desde > c.secuencia) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Secuencia inválida.");
        if (!c.eventos.isEmpty() && desde < ((Number)c.eventos.peekFirst().get("secuencia")).longValue() - 1)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Las señales vencieron. Vuelve a conectar.");
        c.eventos.removeIf(e -> ((Number)e.get("secuencia")).longValue() <= desde);
        return Map.of("estado", "correcto", "participantes", s.conexiones.values().stream().map(Conexion::resumen).toList(),
                "eventos", List.copyOf(c.eventos), "secuencia", c.secuencia);
    }
    @PostMapping("/{sala}/senal")
    public synchronized ResponseEntity<Map<String,Object>> senal(@PathVariable String sala, @RequestBody Senal entrada,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        Usuario u = autorizar(sala, id); limpiar(); Sala s = salas.get(sala); Conexion c = propia(s, entrada.conexion(), u);
        Conexion destino = s.conexiones.get(entrada.destino());
        if (destino == null || destino == c) throw new ResponseStatusException(HttpStatus.CONFLICT, "El participante salió.");
        autorizar(sala, destino.usuario);
        if (!Set.of("offer", "answer", "candidate").contains(String.valueOf(entrada.tipo())) || entrada.datos() == null)
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
        } else {
            Object sdp = entrada.datos().get("sdp");
            if (!(sdp instanceof String texto) || texto.isBlank() || texto.length() > 100_000)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Descripción inválida.");
            datos.put("type", entrada.tipo()); datos.put("sdp", sdp);
        }
        destino.eventos.addLast(Map.of("secuencia", ++destino.secuencia, "origen", c.id, "tipo", entrada.tipo(), "datos", datos));
        while (destino.eventos.size() > 256) destino.eventos.removeFirst();
        return ResponseEntity.ok(Map.of("estado", "correcto"));
    }
    @PostMapping("/{sala}/salir")
    public synchronized Map<String,Object> salir(@PathVariable String sala, @RequestBody Entrada entrada,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        Usuario u = autorizar("general", id); limpiar(); Sala s = salas.get(sala);
        if (s != null) { Conexion c = s.conexiones.get(entrada.conexion()); if (c != null && c.usuario == u.getId()) s.conexiones.remove(c.id); }
        return Map.of("estado", "correcto");
    }
}
