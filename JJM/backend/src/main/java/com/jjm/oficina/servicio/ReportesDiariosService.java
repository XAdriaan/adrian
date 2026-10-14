package com.jjm.oficina.servicio;

import com.jjm.oficina.controller.CanalProyectoController.Reporte;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.time.*;
import java.util.*;

@Service
public class ReportesDiariosService {
    private final JdbcTemplate jdbc;private final Clock reloj;private final TransactionTemplate tx;
    public ReportesDiariosService(JdbcTemplate jdbc,Clock reloj,PlatformTransactionManager gestor){this.jdbc=jdbc;this.reloj=reloj.withZone(ZoneId.of("America/Mexico_City"));this.tx=new TransactionTemplate(gestor);}
    private LocalDateTime ahora(){return LocalDateTime.now(reloj);}
    @PostConstruct public void preparar(){
        jdbc.execute("CREATE TABLE IF NOT EXISTS pmo_reportes_diarios_config(id INT PRIMARY KEY,inicio DATE NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        jdbc.update("INSERT IGNORE INTO pmo_reportes_diarios_config(id,inicio) VALUES(1,?)",LocalDate.now(reloj));
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS pmo_reportes_actividad (
                  id BIGINT AUTO_INCREMENT PRIMARY KEY,id_proyecto INT NOT NULL,id_usuario INT NOT NULL,fecha DATE NOT NULL,
                  actividad TEXT NOT NULL,resultado TEXT NOT NULL,evidencia VARCHAR(2000) NOT NULL,id_archivo BIGINT NULL,
                  fase VARCHAR(120) NOT NULL,horas DECIMAL(5,2) NOT NULL,bloqueos TEXT NOT NULL,
                  entregado_en DATETIME NOT NULL,primera_entrega DATETIME NOT NULL,fuera_plazo BOOLEAN NOT NULL,
                  estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente',observaciones TEXT NULL,id_revisor INT NULL,revisado_en DATETIME NULL,
                  UNIQUE KEY uk_reporte_diario(id_proyecto,id_usuario,fecha),KEY idx_reporte_fecha(fecha,estado)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS pmo_reporte_diario_historial(
                  id BIGINT AUTO_INCREMENT PRIMARY KEY,id_reporte BIGINT NOT NULL,id_usuario INT NOT NULL,
                  accion VARCHAR(40) NOT NULL,detalle MEDIUMTEXT NOT NULL,fecha DATETIME NOT NULL,KEY idx_historial_reporte(id_reporte)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);
    }
    public String inicio(){List<Map<String,Object>> rs=jdbc.queryForList("SELECT inicio FROM pmo_reportes_diarios_config WHERE id=1");return rs.isEmpty()?LocalDate.now(reloj).toString():rs.getFirst().get("inicio").toString();}
    public static boolean tarde(LocalDate fecha,LocalDateTime momento){return momento.isAfter(fecha.atTime(17,0));}
    private static ResponseStatusException error(String s){return new ResponseStatusException(HttpStatus.BAD_REQUEST,s);}
    private static String texto(String s,int min,int max){String r=Objects.toString(s,"").trim();if(r.length()<min||r.length()>max)throw error("Completa la actividad, el resultado y la evidencia con información suficiente.");return r;}
    public Map<String,Object> guardar(Integer proyecto,Integer usuario,Reporte r){
        LocalDate fecha;try{fecha=LocalDate.parse(r.fecha());}catch(Exception e){throw error("Selecciona la fecha de tu reporte.");}
        if(fecha.isAfter(LocalDate.now(reloj))||fecha.isBefore(LocalDate.parse(inicio())))throw error("La fecha debe corresponder a un día desde la activación de los reportes hasta hoy.");
        String actividad=texto(r.actividad(),15,4000),resultado=texto(r.resultado(),10,4000),evidencia=Objects.toString(r.evidencia(),"").trim(),fase=texto(r.fase(),1,120),bloqueos=texto(r.bloqueos(),0,2000);
        if(r.horas()==null||!Double.isFinite(r.horas())||r.horas()<0||r.horas()>10)throw error("Las horas declaradas deben estar entre 0 y 10.");
        if(!evidencia.isEmpty()){try{URI uri=URI.create(evidencia);if(!Set.of("http","https").contains(uri.getScheme())||uri.getHost()==null||evidencia.length()>2000)throw new IllegalArgumentException();}catch(Exception e){throw error("La evidencia debe ser un enlace HTTP o HTTPS válido.");}}
        if(evidencia.isEmpty()&&r.idArchivo()==null)throw error("Adjunta un archivo compartido o agrega el enlace del entregable.");
        if(r.idArchivo()!=null && jdbc.queryForList("SELECT id FROM pmo_proyecto_archivos WHERE id=? AND id_proyecto=? AND eliminado=FALSE",r.idArchivo(),proyecto).isEmpty())throw error("El archivo de evidencia no pertenece a este proyecto.");
        LocalDateTime momento=ahora();
        return tx.execute(estado->{
            List<Map<String,Object>> anterior=jdbc.queryForList("SELECT id,estado,primera_entrega FROM pmo_reportes_actividad WHERE id_proyecto=? AND id_usuario=? AND fecha=? FOR UPDATE",proyecto,usuario,fecha);
            if(!anterior.isEmpty()&&"Aprobado".equals(anterior.getFirst().get("estado")))throw new ResponseStatusException(HttpStatus.CONFLICT,"El reporte aprobado queda protegido. Solicita a administración su revisión.");
            Object primera=anterior.isEmpty()?null:anterior.getFirst().get("primera_entrega");
            LocalDateTime primeraEntrega=primera instanceof java.sql.Timestamp t?t.toLocalDateTime():primera instanceof LocalDateTime t?t:momento;
            boolean fuera=tarde(fecha,primeraEntrega);
            jdbc.update("""
                    INSERT INTO pmo_reportes_actividad(id_proyecto,id_usuario,fecha,actividad,resultado,evidencia,id_archivo,fase,horas,bloqueos,entregado_en,primera_entrega,fuera_plazo)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE actividad=VALUES(actividad),resultado=VALUES(resultado),evidencia=VALUES(evidencia),id_archivo=VALUES(id_archivo),fase=VALUES(fase),horas=VALUES(horas),bloqueos=VALUES(bloqueos),entregado_en=VALUES(entregado_en),fuera_plazo=(primera_entrega>TIMESTAMP(fecha,'17:00:00')),estado='Pendiente',id_revisor=NULL,revisado_en=NULL
                    """,proyecto,usuario,fecha,actividad,resultado,evidencia,r.idArchivo(),fase,r.horas(),bloqueos,momento,momento,fuera);
            List<Map<String,Object>> guardado=jdbc.queryForList("SELECT id FROM pmo_reportes_actividad WHERE id_proyecto=? AND id_usuario=? AND fecha=?",proyecto,usuario,fecha);
            if(!guardado.isEmpty())jdbc.update("INSERT INTO pmo_reporte_diario_historial(id_reporte,id_usuario,accion,detalle,fecha) VALUES(?,?,?,?,?)",guardado.getFirst().get("id"),usuario,"Entrega",actividad+"\nResultado: "+resultado+"\nEvidencia: "+evidencia+"\nArchivo: "+r.idArchivo()+"\nFase: "+fase+"\nHoras declaradas: "+r.horas()+"\nBloqueos: "+bloqueos,momento);
            jdbc.update("UPDATE pmo_recordatorios SET estado='Resuelto',actualizado_en=? WHERE clave LIKE ?",momento,"diario-falta-"+proyecto+"-"+usuario+"-"+fecha+"-%");
            return Map.of("estado","correcto","fueraPlazo",fuera,"mensaje",fuera?"Reporte recibido fuera del horario. Queda pendiente de revisión.":"Reporte entregado. Queda pendiente de revisión; no duplica tus horas de asistencia.");
        });
    }
    public List<Map<String,Object>> listar(Integer proyecto,Integer usuario,boolean todos,YearMonth mes){String condicion=todos?"":" AND r.id_usuario=?";List<Object> args=new ArrayList<>(List.of(proyecto,mes.atDay(1),mes.atEndOfMonth()));if(!todos)args.add(usuario);return jdbc.queryForList("SELECT r.*,u.nombre,CONCAT_WS(' ',u.nombre,u.apellido_paterno,u.apellido_materno) AS nombreCompleto FROM pmo_reportes_actividad r JOIN usuarios u ON u.id_usuario=r.id_usuario WHERE r.id_proyecto=? AND r.fecha BETWEEN ? AND ?"+condicion+" ORDER BY r.fecha DESC,u.nombre",args.toArray());}
    public void revisar(Integer proyecto,Long id,Integer revisor,String estado,String observaciones){
        if(!Set.of("Aprobado","Observado").contains(Objects.toString(estado,"")))throw error("Selecciona Aprobado u Observado.");String nota=texto(observaciones,"Observado".equals(estado)?10:0,2000);
        tx.executeWithoutResult(t->{int cambios=jdbc.update("UPDATE pmo_reportes_actividad SET estado=?,observaciones=?,id_revisor=?,revisado_en=? WHERE id=? AND id_proyecto=?",estado,nota,revisor,ahora(),id,proyecto);if(cambios==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"El reporte no pertenece a este proyecto.");jdbc.update("INSERT INTO pmo_reporte_diario_historial(id_reporte,id_usuario,accion,detalle,fecha) VALUES(?,?,?,?,?)",id,revisor,estado,nota,ahora());});
    }
    @Scheduled(fixedDelay=300_000,initialDelay=180_000)
    public void revisarPlazos(){
        try{
            LocalDate desde=LocalDate.parse(inicio()),hoy=LocalDate.now(reloj);LocalDateTime momento=ahora();Set<String> vigentes=new HashSet<>();
            List<Map<String,Object>> admins=jdbc.queryForList("SELECT id_usuario AS id FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol WHERE u.estado='Activo' AND LOWER(r.nombre) IN ('superadministrador','administrador','admin pmo','admin_pmo','administrador pmo')");
            for(LocalDate dia=desde.isBefore(hoy.minusDays(370))?hoy.minusDays(370):desde;!dia.isAfter(hoy);dia=dia.plusDays(1)){
                if(dia.getDayOfWeek().getValue()>5||!tarde(dia,momento))continue;
                List<Map<String,Object>> faltan=jdbc.queryForList("""
                        SELECT DISTINCT u.id_usuario AS usuario,u.nombre,mp.id_proyecto AS proyecto,p.nombre AS proyectoNombre
                        FROM usuarios u JOIN roles rol ON rol.id_rol=u.id_rol JOIN miembros_equipo m ON m.id_usuario=u.id_usuario
                        JOIN miembros_proyecto mp ON mp.id_miembro=m.id_miembro JOIN proyectos p ON p.id_proyecto=mp.id_proyecto
                        WHERE u.estado='Activo' AND LOWER(rol.nombre) IN ('colaborador','alumno','alumna','estudiante','estudiante pmo')
                          AND NOT (p.codigo IN ('JJM-SD26-02','JJM-SD26-03','JJM-SD26-04','JJM-SD26-05') AND (SELECT COUNT(*) FROM proyectos s WHERE s.codigo IN(CONCAT(p.codigo,'-A'),CONCAT(p.codigo,'-B'),CONCAT(p.codigo,'-C')))>=IF(p.codigo='JJM-SD26-03',2,3))
                          AND mp.fecha_asignacion<=? AND u.fecha_registro<=? AND p.estado NOT IN ('Cerrado','Cancelado')
                          AND NOT EXISTS(SELECT 1 FROM pmo_reportes_actividad d WHERE d.id_usuario=u.id_usuario AND d.id_proyecto=mp.id_proyecto AND d.fecha=?)
                        """,dia.atTime(17,0),dia.atTime(17,0),dia);
                for(Map<String,Object> f:faltan)alertar(vigentes,admins,"falta",f,dia,"Reporte diario pendiente",f.get("nombre")+" no tiene reporte registrado del "+dia+" en "+f.get("proyectoNombre")+". Hora límite 17:00; revisar la causa o justificación.");
            }
            for(Map<String,Object> f:jdbc.queryForList("SELECT d.id_usuario AS usuario,d.id_proyecto AS proyecto,u.nombre,p.nombre AS proyectoNombre,d.fecha FROM pmo_reportes_actividad d JOIN usuarios u ON u.id_usuario=d.id_usuario JOIN proyectos p ON p.id_proyecto=d.id_proyecto WHERE d.estado<>'Aprobado' AND (d.fuera_plazo=TRUE OR d.estado='Observado')"))alertar(vigentes,admins,"revision",f,LocalDate.parse(f.get("fecha").toString()),"Reporte diario requiere revisión",f.get("nombre")+": entrega fuera del plazo u observada en "+f.get("proyectoNombre")+". La administración debe revisar evidencia y justificaciones.");
            for(Map<String,Object> f:jdbc.queryForList("""
                    SELECT t.id_tarea AS tarea,t.id_proyecto AS proyecto,m.id_usuario AS usuario,u.nombre,p.nombre AS proyectoNombre,t.fecha_limite AS fecha,t.titulo
                    FROM tareas t JOIN miembros_equipo m ON m.id_miembro=t.id_miembro_asignado JOIN usuarios u ON u.id_usuario=m.id_usuario JOIN proyectos p ON p.id_proyecto=t.id_proyecto
                    WHERE u.estado='Activo' AND t.fecha_limite>=? AND t.fecha_limite<? AND LOWER(COALESCE(t.estado,'')) NOT IN ('completada','completado','cerrada','cerrado','cancelada','cancelado','terminada','terminado')
                    """,desde,momento.isAfter(hoy.atTime(17,0))?hoy.plusDays(1):hoy))alertar(vigentes,admins,"tarea-"+f.get("tarea"),f,LocalDate.parse(f.get("fecha").toString()),"Entrega de tarea vencida",f.get("nombre")+": la tarea «"+f.get("titulo")+"» sigue pendiente después de su fecha límite. Revisar el entregable y ajustar el seguimiento.");
            for(Map<String,Object> viejo:jdbc.queryForList("SELECT id,clave FROM pmo_recordatorios WHERE clave LIKE 'diario-%' AND estado<>'Resuelto'"))if(!vigentes.contains(viejo.get("clave")))jdbc.update("UPDATE pmo_recordatorios SET estado='Resuelto',actualizado_en=? WHERE id=?",momento,viejo.get("id"));
        }catch(Exception e){java.util.logging.Logger.getLogger(getClass().getName()).warning("No se pudo actualizar el seguimiento de entregas. Se reintentará automáticamente.");}
    }
    private void alertar(Set<String> vigentes,List<Map<String,Object>> admins,String tipo,Map<String,Object> f,LocalDate dia,String titulo,String descripcion){Set<Integer> destinatarios=new HashSet<>();destinatarios.add(((Number)f.get("usuario")).intValue());admins.forEach(a->destinatarios.add(((Number)a.get("id")).intValue()));for(Integer usuario:destinatarios){String clave="diario-"+tipo+"-"+f.get("proyecto")+"-"+f.get("usuario")+"-"+dia+"-"+usuario;vigentes.add(clave);jdbc.update("INSERT INTO pmo_recordatorios(clave,id_usuario,titulo,descripcion,enlace,estado,actualizado_en) VALUES(?,?,?,?,?,'Abierto',?) ON DUPLICATE KEY UPDATE estado=IF(estado='Resuelto' OR descripcion<>VALUES(descripcion),'Abierto',estado),descripcion=VALUES(descripcion),actualizado_en=VALUES(actualizado_en)",clave,usuario,titulo,descripcion,"canales-proyectos.html?id="+f.get("proyecto")+"#diario",ahora());}}
}
