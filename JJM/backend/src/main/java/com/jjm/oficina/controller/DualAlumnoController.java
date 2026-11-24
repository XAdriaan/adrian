package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.servicio.AsistenciaAutomaticaService;
import jakarta.annotation.PostConstruct;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import static com.jjm.oficina.controller.DualController.*;

/** Inscripción del alumno y entregas académicas; reutiliza reportes y asistencia de PMO. */
@RestController
@RequestMapping("/api/dual-alumno")
public class DualAlumnoController {
    private final JdbcTemplate db; private final DualController dual;
    private final CanalProyectoController canales; private final AsistenciaAutomaticaService asistencia;
    private final Clock clock;
    public DualAlumnoController(JdbcTemplate db,DualController dual,CanalProyectoController canales,AsistenciaAutomaticaService asistencia,Clock clock){this.db=db;this.dual=dual;this.canales=canales;this.asistencia=asistencia;this.clock=clock.withZone(ZoneId.of("America/Mexico_City"));}
    @PostConstruct public void esquema(){
        columna("tipo_periodo","VARCHAR(30) NOT NULL DEFAULT 'Personalizado'");
        columna("universidad_clave","VARCHAR(10) NOT NULL DEFAULT ''");
        columna("asesor_empresa_texto","VARCHAR(200) NOT NULL DEFAULT ''");
        columna("asesor_universidad_texto","VARCHAR(200) NOT NULL DEFAULT ''");
        var columnas=db.queryForList("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pmo_dual' AND COLUMN_NAME='proyecto'");
        if(!columnas.isEmpty()&&"NO".equals(columnas.getFirst().get("IS_NULLABLE")))db.execute("ALTER TABLE pmo_dual MODIFY proyecto INT NULL");
        db.execute("""
            CREATE TABLE IF NOT EXISTS pmo_dual_mensuales (
              id BIGINT AUTO_INCREMENT PRIMARY KEY, dual_id BIGINT NOT NULL, mes CHAR(7) NOT NULL,
              actividades TEXT NOT NULL, resultados TEXT NOT NULL, aprendizajes TEXT NOT NULL,
              dificultades TEXT NOT NULL, siguiente_mes TEXT NOT NULL, estado VARCHAR(20) NOT NULL,
              observaciones TEXT NOT NULL, actualizado DATETIME NOT NULL,
              UNIQUE KEY uk_dual_mes(dual_id,mes)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """);
    }
    private void columna(String nombre,String tipo){
        if(db.queryForList("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pmo_dual' AND COLUMN_NAME=?",nombre).isEmpty())db.execute("ALTER TABLE pmo_dual ADD COLUMN "+nombre+" "+tipo);
    }
    @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<Map<String,Object>> fallo(ResponseStatusException e){return dual.responderError(e);}
    @ExceptionHandler(org.springframework.dao.DuplicateKeyException.class) public ResponseEntity<Map<String,Object>> duplicado(){return dual.duplicado();}
    public static int duracion(String tipo){return switch(Objects.toString(tipo,"")){case "Bimestral"->2;case "Trimestral"->3;case "Cuatrimestral"->4;case "Semestral"->6;default->throw error(400,"Selecciona el tipo de periodo.");};}
    public static LocalDate inicioPeriodo(String tipo,Integer anio,Integer numero){
        int meses=duracion(tipo);
        if(anio==null||anio<2000||anio>2100||numero==null||numero<1||numero>12/meses)throw error(400,"Selecciona un año y periodo válidos.");
        return LocalDate.of(anio,1+(numero-1)*meses,1);
    }
    static String universidad(String clave){return switch(Objects.toString(clave,"")){
        case "UAM"->"Universidad Autónoma Metropolitana";case "UPT"->"Universidad Politécnica de Tecámac";
        case "UTT"->"Universidad Tecnológica de Tecámac";case "IPN"->"Instituto Politécnico Nacional";
        case "UNAM"->"Universidad Nacional Autónoma de México";default->throw error(400,"Selecciona UAM, UPT, UTT, IPN o UNAM.");};}
    private Usuario alumno(Integer uid){Usuario u=dual.usuario(uid);if(!AsistenciaAutomaticaService.esAlumno(u))throw error(403,"El registro personal corresponde a una cuenta de alumno.");return u;}
    private Map<String,Object> propio(long id,Integer uid){var f=dual.acceso(id,dual.usuario(uid));if(!coincide(f.get("alumno"),uid))throw error(403,"Solo el alumno titular puede entregar su trabajo o registrar asistencia.");return f;}
    private void activo(Map<String,Object> f){if(!"Activo".equals(f.get("estado")))throw error(409,"El expediente no está activo.");}
    static void enPeriodo(Map<String,Object> f,LocalDate fecha){if(fecha.isBefore(LocalDate.parse(f.get("inicio").toString()))||fecha.isAfter(LocalDate.parse(f.get("fin").toString())))throw error(400,"La fecha no pertenece al periodo del expediente.");}
    static YearMonth mesValido(Map<String,Object> f,String mes){try{var m=YearMonth.parse(mes);if(m.atEndOfMonth().isBefore(LocalDate.parse(f.get("inicio").toString()))||m.atDay(1).isAfter(LocalDate.parse(f.get("fin").toString())))throw new IllegalArgumentException();return m;}catch(Exception e){throw error(400,"Selecciona uno de los meses del periodo.");}}
    @GetMapping("/registro") public Map<String,Object> opciones(@RequestHeader("X-Usuario-Id") Integer uid){
        Usuario u=alumno(uid);
        var datos=db.queryForList("SELECT matricula,universidad,carrera,cuatrimestre FROM datos_academicos_usuario WHERE id_usuario=?",uid);
        var proyectos=db.queryForList("SELECT DISTINCT p.id_proyecto id,p.nombre,p.codigo FROM proyectos p JOIN miembros_proyecto mp ON mp.id_proyecto=p.id_proyecto JOIN miembros_equipo m ON m.id_miembro=mp.id_miembro WHERE m.id_usuario=? AND p.eliminado_en IS NULL ORDER BY p.nombre",uid);
        return Map.of("alumno",Map.of("id",uid,"nombre",String.join(" ",Objects.toString(u.getNombre(),""),Objects.toString(u.getApellidoPaterno(),""),Objects.toString(u.getApellidoMaterno(),""))),"datos",datos.isEmpty()?Map.of():datos.getFirst(),"proyectos",proyectos);
    }
    public record Inscripcion(String universidad,String tipoPeriodo,Integer anio,Integer numeroPeriodo,String carrera,String generacion,String grado,String matricula,String materias,String cliente,String empresa,String convenio,String asesorEmpresa,String asesorUniversidad,Integer proyecto){}
    @PostMapping("/inscripcion") @Transactional public Map<String,Object> inscribir(@RequestHeader("X-Usuario-Id") Integer uid,@RequestBody Inscripcion e){
        alumno(uid);String uni=universidad(e.universidad());LocalDate inicio=inicioPeriodo(e.tipoPeriodo(),e.anio(),e.numeroPeriodo()),fin=inicio.plusMonths(duracion(e.tipoPeriodo())).minusDays(1);
        // Serializa inscripciones del mismo alumno incluso cuando aún no tiene proyecto.
        db.queryForList("SELECT id_usuario FROM usuarios WHERE id_usuario=? FOR UPDATE",uid);
        if(!db.queryForList("SELECT id FROM pmo_dual WHERE alumno=? AND inicio=? AND fin=? AND (universidad_clave=? OR universidad=?)",uid,inicio,fin,e.universidad(),uni).isEmpty())throw error(409,"Ya estás registrado en esa universidad y periodo. Abre tu expediente para completar tus datos.");
        if(e.proyecto()!=null)validarAsignacion(uid,e.proyecto());
        db.update("""
            INSERT INTO pmo_dual(alumno,proyecto,cliente,empresa,convenio,universidad,carrera,generacion,cuatrimestre,matricula,inicio,fin,meta,entrada,salida,materias,estado,actualizado,tipo_periodo,universidad_clave,asesor_empresa_texto,asesor_universidad_texto)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,600,'07:00','17:00',?,'Activo',NOW(),?,?,?,?)
            """,uid,e.proyecto(),texto(e.cliente(),200,true),texto(e.empresa(),200,true),texto(e.convenio(),200,false),uni,texto(e.carrera(),200,true),texto(e.generacion(),80,true),texto(e.grado(),40,true),texto(e.matricula(),80,true),inicio,fin,texto(e.materias(),6000,true),e.tipoPeriodo(),e.universidad(),texto(e.asesorEmpresa(),200,false),texto(e.asesorUniversidad(),200,false));
        var filas=db.queryForList("SELECT id FROM pmo_dual WHERE alumno=? AND inicio=? AND fin=? AND universidad_clave=? ORDER BY id DESC LIMIT 1",uid,inicio,fin,e.universidad());
        long id=((Number)filas.getFirst().get("id")).longValue();bitacora(id,uid,"Inscripción",e.universidad()+" · "+e.tipoPeriodo()+" · "+inicio+" a "+fin);
        return Map.of("id",id,"mensaje","Tu inscripción Dual quedó guardada.");
    }
    private void validarAsignacion(Integer uid,Integer proyecto){if(db.queryForList("SELECT mp.id_miembro FROM miembros_proyecto mp JOIN miembros_equipo m ON m.id_miembro=mp.id_miembro JOIN proyectos p ON p.id_proyecto=mp.id_proyecto WHERE m.id_usuario=? AND mp.id_proyecto=? AND p.eliminado_en IS NULL",uid,proyecto).isEmpty())throw error(400,"Ese proyecto no está asignado a tu cuenta.");}
    public record Perfil(String carrera,String generacion,String grado,String matricula,String materias,String asesorEmpresa,String asesorUniversidad,Integer proyecto){}
    @PutMapping("/{id}/perfil") @Transactional public Map<String,Object> perfil(@PathVariable long id,@RequestHeader("X-Usuario-Id") Integer uid,@RequestBody Perfil e){
        propio(id,uid);
        db.queryForList("SELECT id FROM pmo_dual WHERE id=? FOR UPDATE",id);
        var f=propio(id,uid);activo(f);
        if(f.get("proyecto")==null&&e.proyecto()!=null){validarAsignacion(uid,e.proyecto());db.update("UPDATE pmo_dual SET proyecto=? WHERE id=? AND proyecto IS NULL",e.proyecto(),id);}
        else if(e.proyecto()!=null&&!coincide(f.get("proyecto"),e.proyecto()))throw error(400,"El proyecto ya vinculado conserva su historial. Solicita revisión a administración.");
        db.update("UPDATE pmo_dual SET carrera=?,generacion=?,cuatrimestre=?,matricula=?,materias=?,asesor_empresa_texto=?,asesor_universidad_texto=?,actualizado=NOW() WHERE id=?",texto(e.carrera(),200,true),texto(e.generacion(),80,true),texto(e.grado(),40,true),texto(e.matricula(),80,true),texto(e.materias(),6000,true),texto(e.asesorEmpresa(),200,false),texto(e.asesorUniversidad(),200,false),id);
        bitacora(id,uid,"Expediente","El alumno actualizó sus datos académicos.");return Map.of("mensaje","Datos guardados.");
    }
    @PostMapping("/{id}/diario") public Map<String,Object> diario(@PathVariable long id,@RequestHeader("X-Usuario-Id") Integer uid,@RequestBody CanalProyectoController.Reporte r){
        var f=propio(id,uid);activo(f);LocalDate fecha;try{fecha=LocalDate.parse(r.fecha());}catch(Exception e){throw error(400,"Selecciona una fecha válida.");}enPeriodo(f,fecha);
        if(f.get("proyecto")==null)throw error(409,"Primero vincula tu proyecto asignado en Mi registro.");
        return canales.enviarReporte(((Number)f.get("proyecto")).intValue(),r,uid);
    }
    @GetMapping("/{id}/asistencia") public Map<String,Object> asistencia(@PathVariable long id,@RequestHeader("X-Usuario-Id") Integer uid){propio(id,uid);return asistencia.actualizar(uid,false);}
    @PostMapping("/{id}/asistencia/{accion}") public Map<String,Object> jornada(@PathVariable long id,@PathVariable String accion,@RequestHeader("X-Usuario-Id") Integer uid){
        var f=propio(id,uid);activo(f);enPeriodo(f,LocalDate.now(clock));
        return switch(accion){case "iniciar"->asistencia.iniciar(uid);case "finalizar"->asistencia.finalizar(uid);default->throw error(400,"Acción no válida.");};
    }
    @GetMapping("/{id}/mes") public Map<String,Object> mes(@PathVariable long id,@RequestHeader("X-Usuario-Id") Integer uid,@RequestParam String mes){
        Usuario u=dual.usuario(uid);var f=dual.acceso(id,u);var periodo=mesValido(f,mes);
        var informes=db.queryForList("SELECT * FROM pmo_dual_mensuales WHERE dual_id=? AND mes=?",id,mes);
        var totales=db.queryForList("SELECT COALESCE(SUM(CASE WHEN h.estado_validacion='Aprobado' THEN h.horas_trabajadas ELSE 0 END),0) horas_aprobadas,COUNT(DISTINCT h.fecha) dias FROM registros_horas h JOIN miembros_equipo m ON m.id_miembro=h.id_miembro WHERE m.id_usuario=? AND h.fecha BETWEEN ? AND ? AND h.fecha BETWEEN ? AND ?",f.get("alumno"),periodo.atDay(1),periodo.atEndOfMonth(),f.get("inicio"),f.get("fin"));
        return Map.of("mensual",informes.isEmpty()?Map.of():informes.getFirst(),"resumen",totales.isEmpty()?Map.of():totales.getFirst(),"puedeRevisar",!coincide(f.get("alumno"),uid)&&(dual.admin(u)||coincide(f.get("asesor_empresa"),uid)||coincide(f.get("asesor_universidad"),uid)));
    }
    public record Mensual(String mes,String actividades,String resultados,String aprendizajes,String dificultades,String siguienteMes){}
    @PostMapping("/{id}/mensual") @Transactional public Map<String,Object> mensual(@PathVariable long id,@RequestHeader("X-Usuario-Id") Integer uid,@RequestBody Mensual r){
        var f=propio(id,uid);activo(f);var m=mesValido(f,r.mes());if(m.isAfter(YearMonth.now(clock)))throw error(400,"No puedes entregar un reporte de un mes futuro.");
        db.queryForList("SELECT id FROM pmo_dual WHERE id=? FOR UPDATE",id);
        if(!db.queryForList("SELECT id FROM pmo_dual_mensuales WHERE dual_id=? AND mes=? AND estado='Aprobado'",id,r.mes()).isEmpty())throw error(409,"El reporte mensual está aprobado. Solicita al asesor que lo devuelva para corrección.");
        db.update("""
            INSERT INTO pmo_dual_mensuales(dual_id,mes,actividades,resultados,aprendizajes,dificultades,siguiente_mes,estado,observaciones,actualizado)
            VALUES(?,?,?,?,?,?,?,'Pendiente','',NOW()) ON DUPLICATE KEY UPDATE actividades=VALUES(actividades),resultados=VALUES(resultados),aprendizajes=VALUES(aprendizajes),dificultades=VALUES(dificultades),siguiente_mes=VALUES(siguiente_mes),estado='Pendiente',observaciones='',actualizado=NOW()
            """,id,r.mes(),texto(r.actividades(),6000,true),texto(r.resultados(),6000,true),texto(r.aprendizajes(),6000,true),texto(r.dificultades(),4000,false),texto(r.siguienteMes(),4000,false));
        bitacora(id,uid,"Reporte mensual","Entrega de "+r.mes()+". Actividades: "+r.actividades()+"\nResultados: "+r.resultados()+"\nAprendizajes: "+r.aprendizajes()+"\nDificultades: "+Objects.toString(r.dificultades(),"")+"\nSiguiente mes: "+Objects.toString(r.siguienteMes(),""));
        return Map.of("mensaje","Reporte mensual enviado a revisión.");
    }
    public record Revision(String mes,String estado,String observaciones){}
    @PutMapping("/{id}/mensual") @Transactional public Map<String,Object> revisar(@PathVariable long id,@RequestHeader("X-Usuario-Id") Integer uid,@RequestBody Revision r){
        var u=dual.usuario(uid);var f=dual.acceso(id,u);if(coincide(f.get("alumno"),uid)||!(dual.admin(u)||coincide(f.get("asesor_empresa"),uid)||coincide(f.get("asesor_universidad"),uid)))throw error(403,"No puedes aprobar tu propio reporte.");
        mesValido(f,r.mes());if(!Set.of("Aprobado","Observado").contains(Objects.toString(r.estado(),"")))throw error(400,"Selecciona aprobado o por corregir.");
        db.queryForList("SELECT id FROM pmo_dual WHERE id=? FOR UPDATE",id);
        int cambios=db.update("UPDATE pmo_dual_mensuales SET estado=?,observaciones=?,actualizado=NOW() WHERE dual_id=? AND mes=?",r.estado(),texto(r.observaciones(),2000,"Observado".equals(r.estado())),id,r.mes());
        if(cambios==0)throw error(404,"Todavía no se ha entregado ese reporte mensual.");bitacora(id,uid,"Revisión mensual",r.mes()+": "+r.estado()+". "+Objects.toString(r.observaciones(),""));return Map.of("mensaje","Revisión guardada.");
    }
    private void bitacora(long id,int uid,String tipo,String detalle){db.update("INSERT INTO pmo_dual_notas(dual_id,autor,tipo,detalle,fecha) VALUES(?,?,?,?,NOW())",id,uid,tipo,detalle);}
}
