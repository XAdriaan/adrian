package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/seguimiento-estadia")
@CrossOrigin(origins = "*")
public class SeguimientoEstadiaController {

    private final JdbcTemplate jdbc;
    private final UsuarioRepository usuarioRepository;

    public SeguimientoEstadiaController(JdbcTemplate jdbc, UsuarioRepository usuarioRepository) {
        this.jdbc = jdbc;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String,Object>> listar(
            @RequestHeader(value="X-Usuario-Id",required=false) Integer idUsuario
    ) {
        Usuario activo=obtenerUsuario(idUsuario);
        if(activo==null)return error(HttpStatus.UNAUTHORIZED,"No se encontró una sesión activa.");
        if(!esAdministrador(activo))return error(HttpStatus.FORBIDDEN,"Solo un administrador puede consultar el seguimiento de estadía.");

        List<Map<String,Object>> filas=jdbc.queryForList("""
                SELECT id_usuario AS idUsuario,
                       empresa_contestado AS empresa, empresa_fecha AS fechaEmpresa,
                       satisfaccion_contestado AS satisfaccion, satisfaccion_fecha AS fechaSatisfaccion,
                       actualizado_en AS fechaActualizacion
                FROM seguimiento_formularios_estadia
                """);
        Map<String,Object> estados=new LinkedHashMap<>();
        for(Map<String,Object> fila:filas){ estados.put(String.valueOf(fila.get("idUsuario")), normalizar(fila)); }
        return ResponseEntity.ok(Map.of("estado","correcto","seguimientos",estados));
    }

    @PutMapping("/usuario/{idObjetivo}")
    @Transactional
    public ResponseEntity<Map<String,Object>> guardar(
            @PathVariable Integer idObjetivo,
            @RequestHeader(value="X-Usuario-Id",required=false) Integer idUsuario,
            @RequestBody Map<String,Object> datos
    ) {
        Usuario activo=obtenerUsuario(idUsuario);
        if(activo==null)return error(HttpStatus.UNAUTHORIZED,"No se encontró una sesión activa.");
        if(!esAdministrador(activo))return error(HttpStatus.FORBIDDEN,"Solo un administrador puede actualizar el seguimiento de estadía.");
        if(!usuarioRepository.existsById(idObjetivo))return error(HttpStatus.NOT_FOUND,"No se encontró el colaborador.");

        boolean empresa=booleano(datos.get("empresa"));
        boolean satisfaccion=booleano(datos.get("satisfaccion"));
        Timestamp fechaEmpresa=empresa ? fecha(datos.get("fechaEmpresa")) : null;
        Timestamp fechaSatisfaccion=satisfaccion ? fecha(datos.get("fechaSatisfaccion")) : null;
        if(empresa && fechaEmpresa==null)fechaEmpresa=Timestamp.valueOf(LocalDateTime.now());
        if(satisfaccion && fechaSatisfaccion==null)fechaSatisfaccion=Timestamp.valueOf(LocalDateTime.now());

        jdbc.update("""
                INSERT INTO seguimiento_formularios_estadia
                    (id_usuario,empresa_contestado,empresa_fecha,empresa_por,satisfaccion_contestado,satisfaccion_fecha,satisfaccion_por)
                VALUES (?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE
                    empresa_contestado=VALUES(empresa_contestado), empresa_fecha=VALUES(empresa_fecha), empresa_por=VALUES(empresa_por),
                    satisfaccion_contestado=VALUES(satisfaccion_contestado), satisfaccion_fecha=VALUES(satisfaccion_fecha), satisfaccion_por=VALUES(satisfaccion_por)
                """,idObjetivo,empresa,fechaEmpresa,empresa?activo.getId():null,satisfaccion,fechaSatisfaccion,satisfaccion?activo.getId():null);

        return ResponseEntity.ok(Map.of("estado","correcto","mensaje","Seguimiento actualizado correctamente."));
    }

    private Map<String,Object> normalizar(Map<String,Object> fila){Map<String,Object> r=new LinkedHashMap<>(fila);r.put("empresa",booleano(r.get("empresa")));r.put("satisfaccion",booleano(r.get("satisfaccion")));return r;}
    private boolean booleano(Object v){if(v instanceof Boolean b)return b;if(v instanceof Number n)return n.intValue()!=0;return v!=null&&Boolean.parseBoolean(String.valueOf(v));}
    private Timestamp fecha(Object v){if(v==null||String.valueOf(v).isBlank())return null;try{return Timestamp.from(java.time.Instant.parse(String.valueOf(v)));}catch(Exception e){try{return Timestamp.valueOf(String.valueOf(v).replace("T"," ").replace("Z",""));}catch(Exception ignored){return null;}}}
    private Usuario obtenerUsuario(Integer id){return id==null?null:usuarioRepository.findById(id).orElse(null);}
    private boolean esAdministrador(Usuario u){if(u==null||u.getRol()==null||u.getRol().getNombre()==null)return false;String r=u.getRol().getNombre().trim().toLowerCase(Locale.ROOT);return Set.of("administrador","admin pmo","administrador pmo","admin_pmo").contains(r);}
    private ResponseEntity<Map<String,Object>> error(HttpStatus s,String m){Map<String,Object> r=new LinkedHashMap<>();r.put("estado","error");r.put("mensaje",m);return ResponseEntity.status(s).body(r);}
}
