package com.jjm.oficina.servicio;

import java.time.*;
import java.util.*;
import org.slf4j.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class SeguimientoDiarioService {
    private static final Logger LOG=LoggerFactory.getLogger(SeguimientoDiarioService.class);
    private final JdbcTemplate jdbc;
    private final Clock reloj;
    private final AutomatizacionesService acceso;
    private final AsistenciaAutomaticaService asistencia;
    private final ReportesDiariosService reportes;

    public SeguimientoDiarioService(JdbcTemplate jdbc,Clock reloj,AutomatizacionesService acceso,
            AsistenciaAutomaticaService asistencia,ReportesDiariosService reportes) {
        this.jdbc=jdbc;this.reloj=reloj.withZone(AsistenciaAutomaticaService.ZONA);
        this.acceso=acceso;this.asistencia=asistencia;this.reportes=reportes;
    }
    public Map<String,Object> consultar(Integer usuario,boolean global) {
        acceso.comprobar(usuario,false,global);
        List<Map<String,Object>> filas=filas(global?null:usuario);
        Map<String,Object> resumen=new LinkedHashMap<>();
        resumen.put("alumnos",filas.stream().map(f->f.get("idUsuario")).distinct().count());
        resumen.put("proyectos",filas.stream().map(f->f.get("idProyecto")).distinct().count());
        resumen.put("reportesPendientes",filas.stream().filter(f->Boolean.TRUE.equals(f.get("reporteExigible"))&&!Boolean.TRUE.equals(f.get("entregado"))).count());
        resumen.put("reportesEntregados",filas.stream().filter(f->Boolean.TRUE.equals(f.get("entregado"))).count());
        resumen.put("tareasVencidas",filas.stream().mapToLong(f->numero(f.get("tareasVencidas"))).sum());
        return Map.of("estado","correcto","fecha",LocalDate.now(reloj).toString(),"actualizado",LocalDateTime.now(reloj).toString(),"global",global,"resumen",resumen,"filas",filas);
    }
    private static long numero(Object valor) {return valor instanceof Number n?n.longValue():0;}
    private static boolean verdadero(Object valor) {return Boolean.TRUE.equals(valor)||numero(valor)>0;}
    private List<Map<String,Object>> filas(Integer propio) {
        LocalDate hoy=LocalDate.now(reloj);LocalDateTime ahora=LocalDateTime.now(reloj);
        LocalDate vencimiento=ahora.isAfter(hoy.atTime(17,0))?hoy.plusDays(1):hoy;
        List<Object> argumentos=new ArrayList<>(List.of(vencimiento,hoy,hoy.plusDays(2),hoy,hoy,ahora,hoy,hoy));
        if(propio!=null)argumentos.add(propio);
        List<Map<String,Object>> fuentes=jdbc.queryForList("""
            SELECT DISTINCT u.id_usuario AS idUsuario,CONCAT_WS(' ',u.nombre,u.apellido_paterno,u.apellido_materno) AS nombre,
                a.periodo_estadia AS periodo,YEAR(a.fecha_inicio) AS anio,p.id_proyecto AS idProyecto,p.nombre AS proyecto,
                COALESCE(j.total_segundos,0) AS segundos,j.finalizada,j.modo_continuo AS continuo,j.reposicion,
                d.estado AS estadoReporte,d.fuera_plazo AS fueraPlazo,
                (SELECT COUNT(*) FROM tareas t JOIN miembros_equipo dueno ON dueno.id_miembro=t.id_miembro_asignado
                  WHERE dueno.id_usuario=u.id_usuario AND t.id_proyecto=p.id_proyecto AND t.fecha_limite<?
                    AND LOWER(COALESCE(t.estado,'')) NOT IN ('completada','completado','terminada','terminado','finalizada','finalizado','cerrada','cerrado','cancelada','cancelado')) AS tareasVencidas,
                (SELECT COUNT(*) FROM tareas t JOIN miembros_equipo dueno ON dueno.id_miembro=t.id_miembro_asignado
                  WHERE dueno.id_usuario=u.id_usuario AND t.id_proyecto=p.id_proyecto AND t.fecha_limite BETWEEN ? AND ?
                    AND LOWER(COALESCE(t.estado,'')) NOT IN ('completada','completado','terminada','terminado','finalizada','finalizado','cerrada','cerrado','cancelada','cancelado')) AS proximasEntregas
            FROM usuarios u JOIN roles rol ON rol.id_rol=u.id_rol
            JOIN miembros_equipo m ON m.id_usuario=u.id_usuario AND m.estado='Activo'
            JOIN miembros_proyecto mp ON mp.id_miembro=m.id_miembro
            JOIN proyectos p ON p.id_proyecto=mp.id_proyecto
            LEFT JOIN datos_academicos_usuario a ON a.id_usuario=u.id_usuario
            LEFT JOIN jornadas_automaticas j ON j.id_usuario=u.id_usuario AND j.fecha=?
            LEFT JOIN pmo_reportes_actividad d ON d.id_usuario=u.id_usuario AND d.id_proyecto=p.id_proyecto AND d.fecha=?
            WHERE u.estado='Activo' AND LOWER(rol.nombre) IN ('colaborador','alumno','alumna','estudiante','estudiante pmo')
              AND mp.fecha_asignacion<=? AND p.estado NOT IN ('Cerrado','Cancelado')
              AND (a.fecha_inicio IS NULL OR a.fecha_inicio<=DATE(?))
              AND (a.fecha_fin IS NULL OR a.fecha_fin>=DATE(?))
              AND NOT (p.codigo IN ('JJM-SD26-02','JJM-SD26-03','JJM-SD26-04','JJM-SD26-05') AND
                (SELECT COUNT(*) FROM proyectos s WHERE s.codigo IN (CONCAT(p.codigo,'-A'),CONCAT(p.codigo,'-B'),CONCAT(p.codigo,'-C')))>=IF(p.codigo='JJM-SD26-03',2,3))
            """+(propio==null?"":" AND u.id_usuario=?")+" ORDER BY nombre,proyecto",
            argumentos.toArray());
        boolean exigible=hoy.getDayOfWeek().getValue()<=5&&!hoy.isBefore(LocalDate.parse(reportes.inicio()));
        Map<Integer,Map<String,Object>> habilitaciones=new HashMap<>();List<Map<String,Object>> salida=new ArrayList<>();
        for(Map<String,Object> fuente:fuentes) {
            Map<String,Object> f=new LinkedHashMap<>(fuente);int alumno=((Number)f.get("idUsuario")).intValue();
            boolean entregado=f.get("estadoReporte")!=null;
            Map<String,Object> h=exigible&&!entregado?habilitaciones.computeIfAbsent(alumno,id->asistencia.habilitacionReporte(id,hoy)):Map.of();
            f.put("segundos",Math.max(numero(f.get("segundos")),numero(h.get("segundos"))));
            f.put("entregado",entregado);f.put("reporteExigible",exigible);
            f.put("puedeReportar",exigible&&!entregado&&Boolean.TRUE.equals(h.get("habilitado")));
            boolean vencido=exigible&&!entregado&&ahora.isAfter(hoy.atTime(17,0));
            f.put("reporteVencido",vencido);
            f.put("fueraPlazo",verdadero(f.get("fueraPlazo")));
            f.put("jornada",f.get("finalizada")==null?"Sin iniciar":verdadero(f.get("finalizada"))?"Finalizada":verdadero(f.get("continuo"))?"En curso · tiempo en servidor":"Asistencia medida");
            f.put("periodo",AutomatizacionReglas.periodo(f.get("periodo")));
            f.put("estadoReporte",entregado?f.get("estadoReporte"):!exigible?"No exigible hoy":vencido?"Pendiente fuera del plazo":Boolean.TRUE.equals(f.get("puedeReportar"))?"Listo para entregar":"En preparación");
            salida.add(f);
        }
        return salida;
    }
    @Scheduled(fixedDelay=60_000,initialDelay=120_000)
    public void recordarReportes() {
        try {
            LocalDate hoy=LocalDate.now(reloj);LocalDateTime ahora=LocalDateTime.now(reloj);Set<String> vigentes=new HashSet<>();
            if(hoy.getDayOfWeek().getValue()<=5&&!ahora.isBefore(hoy.atTime(16,0))&&!ahora.isAfter(hoy.atTime(17,0))) {
                for(Map<String,Object> f:filas(null))if(Boolean.TRUE.equals(f.get("puedeReportar"))) {
                    String clave="seguimiento-reporte-"+f.get("idProyecto")+"-"+f.get("idUsuario")+"-"+hoy;vigentes.add(clave);
                    jdbc.update("""
                        INSERT INTO pmo_recordatorios(clave,id_usuario,titulo,descripcion,enlace,estado,actualizado_en)
                        VALUES(?,?,?,?,?,'Abierto',?) ON DUPLICATE KEY UPDATE
                          estado=IF(estado='Resuelto','Abierto',estado),actualizado_en=VALUES(actualizado_en)
                        """,clave,f.get("idUsuario"),"Reporte diario habilitado desde las 4:00 p. m.",
                        "El reporte de "+hoy+" para «"+f.get("proyecto")+"» está habilitado desde las 16:00. Registra tus actividades, avances, tareas completadas y evidencia; entrega antes de las 17:00.",
                        "canales-proyectos.html?id="+f.get("idProyecto")+"#diario",ahora);
                }
            }
            for(Map<String,Object> anterior:jdbc.queryForList("SELECT id,clave FROM pmo_recordatorios WHERE clave LIKE 'seguimiento-reporte-%' AND estado<>'Resuelto'"))
                if(!vigentes.contains(anterior.get("clave")))jdbc.update("UPDATE pmo_recordatorios SET estado='Resuelto',actualizado_en=? WHERE id=?",ahora,anterior.get("id"));
        } catch(RuntimeException e) {LOG.warn("No se pudieron actualizar los avisos previos al reporte; se reintentará.",e);}
    }
}
