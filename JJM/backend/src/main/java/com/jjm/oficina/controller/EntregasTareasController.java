package com.jjm.oficina.controller;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/canales/proyectos/{proyecto}/entregas-tareas")
public class EntregasTareasController {
    private final JdbcTemplate db;
    private final CanalProyectoController canales;
    public EntregasTareasController(JdbcTemplate db, CanalProyectoController canales){this.db=db;this.canales=canales;}
    @PostConstruct public void preparar(){db.execute("CREATE TABLE IF NOT EXISTS pmo_entregas_tareas (id BIGINT AUTO_INCREMENT PRIMARY KEY,id_proyecto INT NOT NULL,id_tarea INT NOT NULL,id_usuario INT NOT NULL,comentario TEXT NOT NULL,nombre VARCHAR(180),contenido MEDIUMBLOB,estado VARCHAR(20) NOT NULL DEFAULT 'Entregada',observaciones TEXT,id_revisor INT,entregado DATETIME NOT NULL,revisado DATETIME,KEY idx_entregas_tarea(id_proyecto,id_tarea,id_usuario,id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");}
    private static ResponseStatusException fallo(int code,String m){return new ResponseStatusException(HttpStatus.valueOf(code),m);}
    @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<?> error(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("mensaje",Objects.toString(e.getReason(),"No se pudo completar la acción")));}
    @GetMapping public Map<String,Object> listar(@PathVariable Integer proyecto,@RequestHeader(value="X-Usuario-Id",required=false) Integer id){
        var u=canales.acceso(proyecto,id);boolean revisor=canales.admin(u);
        var rows=db.queryForList("SELECT e.id,e.id_tarea AS idTarea,e.id_usuario AS idUsuario,e.comentario,e.nombre,e.estado,e.observaciones,e.entregado,e.revisado,CONCAT_WS(' ',u.nombre,u.apellido_paterno,u.apellido_materno) AS alumno FROM pmo_entregas_tareas e JOIN usuarios u ON u.id_usuario=e.id_usuario WHERE e.id_proyecto=?"+(revisor?"":" AND e.id_usuario=?")+" ORDER BY e.id DESC",revisor?new Object[]{proyecto}:new Object[]{proyecto,id});
        return Map.of("entregas",rows,"puedeRevisar",revisor);
    }
    public record Entrada(Integer idTarea,String comentario,String nombre,String base64){}
    static byte[] archivo(Entrada e){
        if(e.base64()==null||e.base64().isBlank())return null;
        if(e.base64().length()>5592410)throw fallo(400,"El archivo admite hasta 4 MB.");
        String n=Objects.toString(e.nombre(),"");
        if(n.isBlank()||n.length()>180||n.contains("/")||n.contains("\\")||n.chars().anyMatch(c->c<32))throw fallo(400,"Nombre de archivo inválido.");
        String ext=n.substring(n.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
        if(!Set.of("pdf","docx","xlsx","pptx","png","jpg","jpeg","webp","txt","csv","zip").contains(ext))throw fallo(400,"Adjunta PDF, Office, imagen, texto o ZIP.");
        byte[] b;try{b=Base64.getDecoder().decode(e.base64());}catch(IllegalArgumentException ex){throw fallo(400,"Archivo inválido.");}
        if(b.length==0||b.length>4*1024*1024)throw fallo(400,"El archivo admite hasta 4 MB.");
        return b;
    }
    @PostMapping @Transactional public Map<String,Object> entregar(@PathVariable Integer proyecto,@RequestHeader(value="X-Usuario-Id",required=false) Integer id,@RequestBody Entrada e){
        canales.acceso(proyecto,id);
        if(e.idTarea()==null)throw fallo(400,"Selecciona una tarea.");
        var ts=db.queryForList("SELECT t.id_tarea,m.id_usuario FROM tareas t LEFT JOIN miembros_equipo m ON m.id_miembro=t.id_miembro_asignado WHERE t.id_tarea=? AND t.id_proyecto=? FOR UPDATE",e.idTarea(),proyecto);
        if(ts.isEmpty())throw fallo(404,"La tarea no existe en este proyecto.");
        if(!(ts.getFirst().get("id_usuario") instanceof Number n)||n.intValue()!=id)throw fallo(403,"Solo puedes entregar tareas asignadas a tu cuenta.");
        String comentario=Objects.toString(e.comentario(),"").trim();if(comentario.length()>4000)throw fallo(400,"El comentario admite hasta 4000 caracteres.");
        byte[] bytes=archivo(e);if(comentario.isBlank()&&bytes==null)throw fallo(400,"Agrega tu trabajo o un comentario antes de entregar.");
        var prev=db.queryForList("SELECT estado FROM pmo_entregas_tareas WHERE id_tarea=? AND id_usuario=? ORDER BY id DESC LIMIT 1",e.idTarea(),id);
        if(!prev.isEmpty()&&!"Devuelta".equals(prev.getFirst().get("estado")))throw fallo(409,"Ya entregaste esta tarea. Espera la revisión antes de volver a entregar.");
        db.update("INSERT INTO pmo_entregas_tareas(id_proyecto,id_tarea,id_usuario,comentario,nombre,contenido,entregado) VALUES(?,?,?,?,?,?,?)",proyecto,e.idTarea(),id,comentario,bytes==null?null:e.nombre(),bytes,LocalDateTime.now(ZoneId.of("America/Mexico_City")));
        return Map.of("mensaje","Trabajo entregado. Queda pendiente de revisión.");
    }
    public record Revision(String estado,String observaciones){}
    @PutMapping("/{entrega}") @Transactional public Map<String,Object> revisar(@PathVariable Integer proyecto,@PathVariable Long entrega,@RequestHeader(value="X-Usuario-Id",required=false) Integer id,@RequestBody Revision e){
        var u=canales.acceso(proyecto,id);if(!canales.admin(u))throw fallo(403,"Solo administración puede revisar las entregas.");
        if(!Set.of("Aprobada","Devuelta").contains(Objects.toString(e.estado(),"")))throw fallo(400,"Selecciona Aprobar o Devolver.");
        String nota=Objects.toString(e.observaciones(),"").trim();if(nota.length()>4000||("Devuelta".equals(e.estado())&&nota.length()<10))throw fallo(400,"Al devolver, explica qué corregir (10 a 4000 caracteres).");
        int n=db.update("UPDATE pmo_entregas_tareas SET estado=?,observaciones=?,id_revisor=?,revisado=? WHERE id=? AND id_proyecto=? AND estado='Entregada' AND id_usuario<>?",e.estado(),nota,id,LocalDateTime.now(ZoneId.of("America/Mexico_City")),entrega,proyecto,id);
        if(n!=1)throw fallo(409,"La entrega ya fue revisada, no existe o pertenece a tu cuenta.");
        return Map.of("mensaje","Revisión guardada.");
    }
    @GetMapping("/{entrega}/archivo") public ResponseEntity<byte[]> descargar(@PathVariable Integer proyecto,@PathVariable Long entrega,@RequestHeader(value="X-Usuario-Id",required=false) Integer id){
        var u=canales.acceso(proyecto,id);var rs=db.queryForList("SELECT id_usuario,nombre,contenido FROM pmo_entregas_tareas WHERE id=? AND id_proyecto=?",entrega,proyecto);
        if(rs.isEmpty())throw fallo(404,"Entrega no encontrada.");var r=rs.getFirst();if(!canales.admin(u)&&((Number)r.get("id_usuario")).intValue()!=id)throw fallo(403,"Este trabajo pertenece a otra cuenta.");if(r.get("contenido")==null)throw fallo(404,"La entrega no tiene archivo.");
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(String.valueOf(r.get("nombre")),StandardCharsets.UTF_8).build().toString()).header("X-Content-Type-Options","nosniff").header("Cache-Control","no-store").contentType(MediaType.APPLICATION_OCTET_STREAM).body((byte[])r.get("contenido"));
    }
}
