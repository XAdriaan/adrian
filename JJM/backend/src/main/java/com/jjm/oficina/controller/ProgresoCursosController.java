package com.jjm.oficina.controller;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/cursos/progreso")
@CrossOrigin(origins = "*")
public class ProgresoCursosController {

    private final JdbcTemplate jdbc;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;

    public ProgresoCursosController(JdbcTemplate jdbc, UsuarioRepository usuarioRepository, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/mi-sesion")
    public ResponseEntity<Map<String, Object>> obtenerPropio(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario
    ) {
        Usuario u = obtenerUsuario(idUsuario);
        if (u == null) return error(HttpStatus.UNAUTHORIZED, "No se encontró una sesión activa.");
        Map<String,Object> progreso = buscarProgreso(idUsuario);
        Map<String,Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("progreso", progreso);
        respuesta.put("certificados", progreso == null ? List.of() : progreso.get("completados"));
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario
    ) {
        Usuario u = obtenerUsuario(idUsuario);
        if (u == null) return error(HttpStatus.UNAUTHORIZED, "No se encontró una sesión activa.");
        if (!esAdministrador(u)) return error(HttpStatus.FORBIDDEN, "Solo un administrador puede consultar el monitoreo global de cursos.");

        List<Map<String,Object>> filas = jdbc.queryForList("""
                SELECT p.id_usuario AS idUsuario,
                       CONCAT_WS(' ',u.nombre,u.apellido_paterno,u.apellido_materno) AS nombre,
                       u.correo, p.total_cursos AS total, p.cursos_completados AS cursosCompletados,
                       p.porcentaje, p.detalle_json AS detalleJson, p.fecha_actualizacion AS fechaActualizacion
                FROM progreso_cursos_usuario p
                JOIN usuarios u ON u.id_usuario=p.id_usuario
                ORDER BY p.porcentaje DESC, nombre ASC
                """);

        List<Map<String,Object>> lista = filas.stream().map(this::convertirFila).toList();
        return ResponseEntity.ok(Map.of("estado","correcto","progresos",lista));
    }

    @PutMapping("/mi-sesion")
    @Transactional
    public ResponseEntity<Map<String, Object>> guardarPropio(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario,
            @RequestBody Map<String, Object> datos
    ) {
        Usuario u = obtenerUsuario(idUsuario);
        if (u == null) return error(HttpStatus.UNAUTHORIZED, "No se encontró una sesión activa.");

        List<?> certificados = datos.get("certificados") instanceof List<?> l ? l : List.of();
        int total = entero(datos.get("total"), 26);
        int completados = (int) certificados.stream().filter(this::estaCompletado).count();
        double porcentaje = total <= 0 ? 0 : Math.round((completados * 10000.0 / total)) / 100.0;

        jdbc.update("""
                INSERT INTO progreso_cursos_usuario (id_usuario,total_cursos,cursos_completados,porcentaje,detalle_json)
                VALUES (?,?,?,?,?)
                ON DUPLICATE KEY UPDATE total_cursos=VALUES(total_cursos),
                    cursos_completados=VALUES(cursos_completados), porcentaje=VALUES(porcentaje),
                    detalle_json=VALUES(detalle_json)
                """, idUsuario, total, completados, porcentaje, json(certificados));

        return ResponseEntity.ok(Map.of("estado","correcto","mensaje","Progreso de cursos guardado correctamente.","progreso",buscarProgreso(idUsuario)));
    }

    private boolean estaCompletado(Object item) {
        return item instanceof Map<?,?> m && Boolean.TRUE.equals(m.get("completado"));
    }

    private Map<String,Object> buscarProgreso(Integer idUsuario) {
        List<Map<String,Object>> filas = jdbc.queryForList("""
                SELECT p.id_usuario AS idUsuario,
                       CONCAT_WS(' ',u.nombre,u.apellido_paterno,u.apellido_materno) AS nombre,
                       u.correo, p.total_cursos AS total, p.cursos_completados AS cursosCompletados,
                       p.porcentaje, p.detalle_json AS detalleJson, p.fecha_actualizacion AS fechaActualizacion
                FROM progreso_cursos_usuario p JOIN usuarios u ON u.id_usuario=p.id_usuario
                WHERE p.id_usuario=?
                """, idUsuario);
        return filas.isEmpty() ? null : convertirFila(filas.get(0));
    }

    private Map<String,Object> convertirFila(Map<String,Object> fila) {
        Map<String,Object> r=new LinkedHashMap<>(fila);
        Object json=r.remove("detalleJson");
        List<Object> certificados=leerLista(json);
        r.put("completados", certificados);
        return r;
    }

    private List<Object> leerLista(Object valor) {
        if (valor == null || String.valueOf(valor).isBlank()) return new ArrayList<>();
        try { return objectMapper.readValue(String.valueOf(valor), new TypeReference<List<Object>>() {}); }
        catch (JacksonException e) { return new ArrayList<>(); }
    }
    private String json(Object v) { try { return objectMapper.writeValueAsString(v); } catch(JacksonException e){ return "[]"; } }
    private int entero(Object v,int d){ try{return v==null?d:Integer.parseInt(String.valueOf(v));}catch(Exception e){return d;} }
    private Usuario obtenerUsuario(Integer id){ return id==null?null:usuarioRepository.findById(id).orElse(null); }
    private boolean esAdministrador(Usuario u){
        if(u==null||u.getRol()==null||u.getRol().getNombre()==null)return false;
        String r=u.getRol().getNombre().trim().toLowerCase(Locale.ROOT);
        return Set.of("superadministrador","administrador","admin pmo","administrador pmo","admin_pmo").contains(r);
    }
    private ResponseEntity<Map<String,Object>> error(HttpStatus s,String m){Map<String,Object> r=new LinkedHashMap<>();r.put("estado","error");r.put("mensaje",m);return ResponseEntity.status(s).body(r);}
}
