package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.PermisosService;
import jakarta.annotation.PostConstruct;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

/** Expedientes Dual independientes: nunca reemplazan asignaciones ni registros de asistencia. */
@RestController
@RequestMapping("/api/dual")
public class DualController {
    private final JdbcTemplate jdbc;
    private final UsuarioRepository usuarios;
    private final PermisosService permisos;
    public DualController(JdbcTemplate jdbc, UsuarioRepository usuarios, PermisosService permisos) {
        this.jdbc=jdbc; this.usuarios=usuarios; this.permisos=permisos;
    }
    @PostConstruct public void preparar() {
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS pmo_dual (
              id BIGINT AUTO_INCREMENT PRIMARY KEY, alumno INT NOT NULL, proyecto INT NOT NULL,
              cliente VARCHAR(200) NOT NULL, empresa VARCHAR(200) NOT NULL, convenio VARCHAR(200) NOT NULL,
              universidad VARCHAR(200) NOT NULL, carrera VARCHAR(200) NOT NULL, generacion VARCHAR(80) NOT NULL,
              cuatrimestre VARCHAR(40) NOT NULL, matricula VARCHAR(80) NOT NULL,
              inicio DATE NOT NULL, fin DATE NOT NULL, meta INT NOT NULL DEFAULT 600,
              entrada VARCHAR(5) NOT NULL DEFAULT '07:00', salida VARCHAR(5) NOT NULL DEFAULT '17:00',
              asesor_empresa INT NULL, asesor_universidad INT NULL, materias TEXT NOT NULL,
              estado VARCHAR(30) NOT NULL DEFAULT 'Activo', actualizado DATETIME NOT NULL,
              UNIQUE KEY uk_dual_periodo(alumno,proyecto,inicio), KEY idx_dual_alumno(alumno)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """);
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS pmo_dual_notas (
              id BIGINT AUTO_INCREMENT PRIMARY KEY, dual_id BIGINT NOT NULL, autor INT NOT NULL,
              tipo VARCHAR(40) NOT NULL, detalle TEXT NOT NULL, fecha DATETIME NOT NULL,
              KEY idx_dual_notas(dual_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """);
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS pmo_dual_documentos (
              id BIGINT AUTO_INCREMENT PRIMARY KEY, dual_id BIGINT NOT NULL, autor INT NOT NULL,
              nombre VARCHAR(180) NOT NULL, contenido MEDIUMBLOB NOT NULL, fecha DATETIME NOT NULL,
              KEY idx_dual_documentos(dual_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """);
    }
    Usuario usuario(Integer id) {
        Usuario u=usuarios.findById(id).orElseThrow(()->error(401,"Inicia sesión para abrir Dual."));
        if(!"Activo".equalsIgnoreCase(u.getEstado()))throw error(403,"La cuenta no está activa.");
        return u;
    }
    boolean admin(Usuario u) {return permisos.esSuperadministrador(u)||permisos.esAdministradorBase(u);}
    void gestionar(Usuario u) {if(!admin(u))throw error(403,"Solo la administración puede editar expedientes Dual.");}
    static ResponseStatusException error(int estado,String texto) {return new ResponseStatusException(HttpStatusCode.valueOf(estado),texto);}
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String,Object>> responderError(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("mensaje",Objects.toString(e.getReason(),"No se pudo completar la operación.")));
    }
    @ExceptionHandler(org.springframework.dao.DuplicateKeyException.class)
    public ResponseEntity<Map<String,Object>> duplicado() {
        return ResponseEntity.status(409).body(Map.of("mensaje","Ya existe un expediente para ese alumno, proyecto y fecha de inicio. Actualiza la lista."));
    }
    static boolean coincide(Object valor,Integer id) {return valor!=null&&valor.toString().equals(id.toString());}
    Map<String,Object> acceso(long id,Usuario u) {
        var filas=jdbc.queryForList("SELECT * FROM pmo_dual WHERE id=?",id);
        if(filas.isEmpty())throw error(404,"No se encontró el expediente Dual.");
        var f=filas.getFirst();
        if(!admin(u)&&!coincide(f.get("alumno"),u.getId())&&!coincide(f.get("asesor_empresa"),u.getId())&&!coincide(f.get("asesor_universidad"),u.getId()))throw error(403,"Este expediente no está asignado a tu cuenta.");
        return f;
    }
    @GetMapping public Map<String,Object> lista(@RequestHeader("X-Usuario-Id") Integer uid) {
        Usuario u=usuario(uid);
        String filtro=admin(u)?"":" WHERE d.alumno=? OR d.asesor_empresa=? OR d.asesor_universidad=?";
        var filas=jdbc.queryForList("""
            SELECT d.*, CONCAT_WS(' ',u.nombre,u.apellido_paterno,u.apellido_materno) nombre,
              p.nombre proyecto_nombre, p.codigo,
              (SELECT COALESCE(SUM(h.horas_trabajadas),0) FROM registros_horas h
                JOIN miembros_equipo m ON m.id_miembro=h.id_miembro
                WHERE m.id_usuario=d.alumno AND h.fecha BETWEEN d.inicio AND d.fin
                AND h.estado_validacion='Aprobado') horas
            FROM pmo_dual d JOIN usuarios u ON u.id_usuario=d.alumno
            JOIN proyectos p ON p.id_proyecto=d.proyecto
            """+filtro+" ORDER BY d.inicio DESC,u.nombre,d.id DESC",admin(u)?new Object[]{}:new Object[]{uid,uid,uid});
        return Map.of("expedientes",filas,"puedeGestionar",admin(u));
    }
    @GetMapping("/opciones") public Map<String,Object> opciones(@RequestHeader("X-Usuario-Id") Integer uid) {
        gestionar(usuario(uid));
        var alumnos=jdbc.queryForList("""
            SELECT DISTINCT u.id_usuario id,CONCAT_WS(' ',u.nombre,u.apellido_paterno,u.apellido_materno) nombre,
              a.matricula,a.universidad,a.carrera,a.cuatrimestre
            FROM usuarios u JOIN miembros_equipo m ON m.id_usuario=u.id_usuario
            LEFT JOIN datos_academicos_usuario a ON a.id_usuario=u.id_usuario
            WHERE u.estado='Activo' ORDER BY nombre
            """);
        var proyectos=jdbc.queryForList("""
            SELECT DISTINCT p.id_proyecto id,p.nombre,p.codigo,m.id_usuario alumno
            FROM proyectos p JOIN miembros_proyecto mp ON mp.id_proyecto=p.id_proyecto
            JOIN miembros_equipo m ON m.id_miembro=mp.id_miembro
            WHERE p.eliminado_en IS NULL ORDER BY p.nombre
            """);
        var asesores=jdbc.queryForList("SELECT id_usuario id,CONCAT_WS(' ',nombre,apellido_paterno,apellido_materno) nombre FROM usuarios WHERE estado='Activo' ORDER BY nombre");
        return Map.of("alumnos",alumnos,"proyectos",proyectos,"asesores",asesores);
    }
    public record Entrada(Integer alumno,Integer proyecto,String cliente,String empresa,String convenio,String universidad,
        String carrera,String generacion,String cuatrimestre,String matricula,String inicio,String fin,Integer meta,
        String entrada,String salida,Integer asesorEmpresa,Integer asesorUniversidad,String materias,String estado) {}
    static String texto(String s,int max,boolean requerido) {
        s=s==null?"":s.trim();
        if(s.length()>max||(requerido&&s.isEmpty()))throw error(400,"Revisa los campos obligatorios y su longitud.");
        return s;
    }
    static void validarPeriodo(Entrada e) {
        try {
            if(LocalDate.parse(e.fin()).isBefore(LocalDate.parse(e.inicio())))throw new IllegalArgumentException();
            if(!e.entrada().matches("\\d{2}:\\d{2}")||!e.salida().matches("\\d{2}:\\d{2}")||!LocalTime.parse(e.salida()).isAfter(LocalTime.parse(e.entrada())))throw new IllegalArgumentException();
        }catch(Exception ex){throw error(400,"Revisa las fechas y el horario: el final debe ser posterior al inicio.");}
        if(e.meta()==null||e.meta()<1||e.meta()>10000)throw error(400,"La meta debe estar entre 1 y 10000 horas.");
        if(e.estado()==null||!Set.of("Activo","Pausado","Concluido").contains(e.estado()))throw error(400,"Estado Dual no válido.");
    }
    @PostMapping @Transactional public Map<String,Object> crear(@RequestHeader("X-Usuario-Id") Integer uid,@RequestBody Entrada e) {return guardar(null,usuario(uid),e);}
    @PutMapping("/{id}") @Transactional public Map<String,Object> editar(@PathVariable long id,@RequestHeader("X-Usuario-Id") Integer uid,@RequestBody Entrada e) {return guardar(id,usuario(uid),e);}
    Map<String,Object> guardar(Long id,Usuario u,Entrada e) {
        gestionar(u); validarPeriodo(e);
        if(e.alumno()==null||e.proyecto()==null)throw error(400,"Selecciona un alumno y su proyecto.");
        if(id!=null){
            var anterior=acceso(id,u);
            if(!coincide(anterior.get("alumno"),e.alumno())||!coincide(anterior.get("proyecto"),e.proyecto()))
                throw error(400,"El alumno y proyecto de un expediente no se pueden sustituir. Crea otro expediente para conservar su historial.");
        }
        if(jdbc.queryForList("SELECT mp.id_miembro FROM miembros_proyecto mp JOIN miembros_equipo m ON m.id_miembro=mp.id_miembro JOIN proyectos p ON p.id_proyecto=mp.id_proyecto JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE m.id_usuario=? AND mp.id_proyecto=? AND p.eliminado_en IS NULL AND u.estado='Activo'",e.alumno(),e.proyecto()).isEmpty())throw error(400,"El alumno debe estar asignado a ese proyecto y activo.");
        for(Integer asesor:Arrays.asList(e.asesorEmpresa(),e.asesorUniversidad()))if(asesor!=null)usuario(asesor);
        if(!jdbc.queryForList("SELECT id FROM pmo_dual WHERE alumno=? AND proyecto=? AND inicio=? AND id<>?",e.alumno(),e.proyecto(),e.inicio(),id==null?0:id).isEmpty())throw error(409,"Ya existe un expediente para ese alumno, proyecto y fecha de inicio.");
        List<Object> valores=new ArrayList<>(Arrays.asList(e.alumno(),e.proyecto(),texto(e.cliente(),200,true),texto(e.empresa(),200,true),texto(e.convenio(),200,true),texto(e.universidad(),200,true),texto(e.carrera(),200,true),texto(e.generacion(),80,false),texto(e.cuatrimestre(),40,false),texto(e.matricula(),80,false),e.inicio(),e.fin(),e.meta(),e.entrada(),e.salida(),e.asesorEmpresa(),e.asesorUniversidad(),texto(e.materias(),6000,false),e.estado()));
        if(id==null){
            jdbc.update("INSERT INTO pmo_dual(alumno,proyecto,cliente,empresa,convenio,universidad,carrera,generacion,cuatrimestre,matricula,inicio,fin,meta,entrada,salida,asesor_empresa,asesor_universidad,materias,estado,actualizado) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())",valores.toArray());
            id=((Number)jdbc.queryForList("SELECT id FROM pmo_dual WHERE alumno=? AND proyecto=? AND inicio=?",e.alumno(),e.proyecto(),e.inicio()).getFirst().get("id")).longValue();
        }else{
            valores.add(id);
            jdbc.update("UPDATE pmo_dual SET alumno=?,proyecto=?,cliente=?,empresa=?,convenio=?,universidad=?,carrera=?,generacion=?,cuatrimestre=?,matricula=?,inicio=?,fin=?,meta=?,entrada=?,salida=?,asesor_empresa=?,asesor_universidad=?,materias=?,estado=?,actualizado=NOW() WHERE id=?",valores.toArray());
        }
        jdbc.update("INSERT INTO pmo_dual_notas(dual_id,autor,tipo,detalle,fecha) VALUES(?,?,'Expediente',?,NOW())",id,u.getId(),"Expediente guardado. Estado: "+e.estado()+". Meta: "+e.meta()+" horas. Periodo: "+e.inicio()+" a "+e.fin());
        return Map.of("id",id,"mensaje","Expediente Dual guardado.");
    }
    @GetMapping("/{id}") public Map<String,Object> detalle(@PathVariable long id,@RequestHeader("X-Usuario-Id") Integer uid,@RequestParam(required=false) String mes) {
        var f=acceso(id,usuario(uid));
        YearMonth periodo;try{periodo=mes==null?YearMonth.now():YearMonth.parse(mes);}catch(Exception e){throw error(400,"Mes no válido.");}
        LocalDate desde=periodo.atDay(1),hasta=periodo.atEndOfMonth();
        var horas=jdbc.queryForList("SELECT h.fecha,h.hora_entrada,h.hora_salida,h.horas_trabajadas,h.estado_validacion FROM registros_horas h JOIN miembros_equipo m ON m.id_miembro=h.id_miembro WHERE m.id_usuario=? AND h.fecha BETWEEN ? AND ? AND h.fecha BETWEEN ? AND ? ORDER BY h.fecha DESC,h.id_registro DESC",f.get("alumno"),desde,hasta,f.get("inicio"),f.get("fin"));
        var reportes=jdbc.queryForList("SELECT id,fecha,actividad,resultado,estado,horas FROM pmo_reportes_actividad WHERE id_usuario=? AND id_proyecto=? AND fecha BETWEEN ? AND ? AND fecha BETWEEN ? AND ? ORDER BY fecha DESC",f.get("alumno"),f.get("proyecto"),desde,hasta,f.get("inicio"),f.get("fin"));
        var notas=jdbc.queryForList("SELECT n.id,n.tipo,n.detalle,n.fecha,CONCAT_WS(' ',u.nombre,u.apellido_paterno,u.apellido_materno) autor FROM pmo_dual_notas n JOIN usuarios u ON u.id_usuario=n.autor WHERE n.dual_id=? ORDER BY n.id DESC LIMIT 100",id);
        var documentos=jdbc.queryForList("SELECT id,nombre,fecha FROM pmo_dual_documentos WHERE dual_id=? ORDER BY id DESC",id);
        var asesores=jdbc.queryForList("SELECT id_usuario id,CONCAT_WS(' ',nombre,apellido_paterno,apellido_materno) nombre FROM usuarios WHERE id_usuario=? OR id_usuario=?",f.get("asesor_empresa"),f.get("asesor_universidad"));
        return Map.of("expediente",f,"asistencia",horas,"reportes",reportes,"notas",notas,"documentos",documentos,"asesores",asesores);
    }
    public record Nota(String tipo,String detalle){}
    @PostMapping("/{id}/seguimiento") public Map<String,Object> nota(@PathVariable long id,@RequestHeader("X-Usuario-Id") Integer uid,@RequestBody Nota n) {
        acceso(id,usuario(uid));
        if(n.tipo()==null||!Set.of("Seguimiento","Materia","Acuerdo","Incidencia").contains(n.tipo()))throw error(400,"Selecciona un tipo de seguimiento.");
        jdbc.update("INSERT INTO pmo_dual_notas(dual_id,autor,tipo,detalle,fecha) VALUES(?,?,?,?,NOW())",id,uid,n.tipo(),texto(n.detalle(),4000,true));
        return Map.of("mensaje","Seguimiento registrado.");
    }
    public record Documento(String nombre,String base64){}
    @PostMapping("/{id}/documentos") public Map<String,Object> subir(@PathVariable long id,@RequestHeader("X-Usuario-Id") Integer uid,@RequestBody Documento d) {
        Usuario u=usuario(uid);gestionar(u);acceso(id,u);
        String nombre=texto(d.nombre(),180,true);
        if(d.base64()==null||d.base64().length()>5592410)throw error(400,"El PDF admite hasta 4 MB.");
        byte[] bytes;try{bytes=Base64.getDecoder().decode(d.base64());}catch(Exception e){throw error(400,"El archivo no se pudo leer.");}
        if(bytes.length<5||bytes.length>4194304||!new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")||!nombre.toLowerCase(Locale.ROOT).endsWith(".pdf"))throw error(400,"Selecciona un documento PDF de hasta 4 MB.");
        jdbc.update("INSERT INTO pmo_dual_documentos(dual_id,autor,nombre,contenido,fecha) VALUES(?,?,?,?,NOW())",id,uid,nombre,bytes);
        return Map.of("mensaje","Documento guardado en el expediente.");
    }
    @GetMapping("/{id}/documentos/{archivo}") public ResponseEntity<byte[]> descargar(@PathVariable long id,@PathVariable long archivo,@RequestHeader("X-Usuario-Id") Integer uid) {
        acceso(id,usuario(uid));
        var filas=jdbc.queryForList("SELECT contenido FROM pmo_dual_documentos WHERE id=? AND dual_id=?",archivo,id);
        if(filas.isEmpty())throw error(404,"Documento no encontrado.");
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header("Content-Disposition","attachment; filename=convenio-dual-"+archivo+".pdf").header("Cache-Control","no-store").body((byte[])filas.getFirst().get("contenido"));
    }
}
