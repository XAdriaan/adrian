package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.*;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Estructura del checklist de tareas.pdf, adaptada a las asignaciones actuales. */
@Service @Order(40)
public class PlanTareasAsignadasService implements ApplicationRunner {
    public record Paso(String clave,String titulo,String entregable){}
    public static final List<Paso> PASOS=List.of(
        new Paso("1","Levantamiento de requerimientos","Necesidades, alcance, interesados y criterios de aceptación."),
        new Paso("2","Requerimientos e infraestructura","Matriz de requerimientos, dependencias, recursos y riesgos."),
        new Paso("3","Diseño","Diseño funcional, UX/UI, arquitectura y modelo de datos."),
        new Paso("4.1","Desarrollo","Código de los módulos acordados y registro de cambios."),
        new Paso("4.2","Pruebas (QA)","Casos de prueba, resultados, incidencias y correcciones."),
        new Paso("4.3","Validación del cliente","Demostración y evidencia de aceptación de los entregables."),
        new Paso("5","Implementación","Versión desplegada, configuración y procedimiento de recuperación."),
        new Paso("5.1","Capacitación","Guía, sesión de capacitación y registro de participantes."),
        new Paso("6","Documentación de la solución","Expediente técnico con versiones y trazabilidad."),
        new Paso("6.1","Manual de usuario","Instrucciones y ejemplos de los flujos del usuario."),
        new Paso("6.2","Manual técnico","Arquitectura, API, instalación, base de datos y mantenimiento."),
        new Paso("6.3","Manual de administrador","Roles, configuración, operación y atención de incidencias."),
        new Paso("6.4","Código integral","Repositorio y versión del código fuente entregado."),
        new Paso("6.5","Código ejecutable","Paquete ejecutable y verificación en el ambiente objetivo."),
        new Paso("7","Evaluación y liberación del cliente","Revisión final y aceptación documentada por el responsable."),
        new Paso("8","Cierre","Pendientes, lecciones aprendidas y transferencia de la solución."),
        new Paso("8.1","Lista de chequeo de cumplimiento","Checklist con evidencia y observaciones de cada etapa."),
        new Paso("9","Carta de término","Completar requisitos; la emisión la autoriza administración."),
        new Paso("9.1","Formato F2","Completar y entregar el formato institucional aplicable."),
        new Paso("9.2","Formato F7","Completar y entregar el formato institucional aplicable."),
        new Paso("9.3","Formato F8","Completar y entregar el formato institucional aplicable.")
    );
    private final JdbcTemplate jdbc;private final TareaRepository tareas;private final FaseProyectoRepository fases;private final Clock reloj;private final TransactionTemplate tx;
    public PlanTareasAsignadasService(JdbcTemplate jdbc,TareaRepository tareas,FaseProyectoRepository fases,Clock reloj,PlatformTransactionManager gestor){this.jdbc=jdbc;this.tareas=tareas;this.fases=fases;this.reloj=reloj;this.tx=new TransactionTemplate(gestor);}
    @PostConstruct public void preparar(){jdbc.execute("CREATE TABLE IF NOT EXISTS pmo_tareas_plan2026(id_proyecto INT NOT NULL,id_miembro INT NOT NULL,paso VARCHAR(10) NOT NULL,id_tarea INT NOT NULL,PRIMARY KEY(id_proyecto,id_miembro,paso)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");}
    @Override public void run(ApplicationArguments args){sincronizar();}
    @Scheduled(fixedDelay=60000,initialDelay=20000) public void sincronizar(){
        for(Map<String,Object> a:jdbc.queryForList("""
            SELECT DISTINCT p.id_proyecto AS proyecto,p.nombre,mp.id_miembro AS miembro
            FROM proyectos p JOIN miembros_proyecto mp ON mp.id_proyecto=p.id_proyecto
            JOIN miembros_equipo m ON m.id_miembro=mp.id_miembro JOIN usuarios u ON u.id_usuario=m.id_usuario JOIN roles r ON r.id_rol=u.id_rol
            WHERE p.codigo LIKE 'JJM-SD26-%' AND p.estado NOT IN ('Cerrado','Cancelado') AND m.estado='Activo' AND u.estado='Activo'
              AND LOWER(r.nombre) IN ('colaborador','alumno','alumna','estudiante','estudiante pmo')
              AND NOT (p.codigo IN ('JJM-SD26-02','JJM-SD26-03','JJM-SD26-04','JJM-SD26-05') AND EXISTS(SELECT 1 FROM proyectos s WHERE s.codigo=CONCAT(p.codigo,'-A')))
              AND (SELECT COUNT(*) FROM pmo_tareas_plan2026 x WHERE x.id_proyecto=p.id_proyecto AND x.id_miembro=mp.id_miembro)<21
            """))try{crear(((Number)a.get("proyecto")).intValue(),((Number)a.get("miembro")).intValue(),String.valueOf(a.get("nombre")));}catch(RuntimeException e){java.util.logging.Logger.getLogger(getClass().getName()).warning("No se pudo preparar el plan de tareas; se reintentará conservando los avances.");}
    }
    public void crear(Integer proyecto,Integer miembro,String nombre){tx.executeWithoutResult(t->{
        // El bloqueo del proyecto serializa el alta de tareas y fases entre instancias.
        if(jdbc.queryForList("SELECT id_proyecto FROM proyectos WHERE id_proyecto=? FOR UPDATE",proyecto).isEmpty())return;
        List<FaseProyecto> existentes=new ArrayList<>(fases.findByIdProyectoOrderByNumeroOrdenAsc(proyecto));
        LocalDate inicio=reloj.instant().atZone(AsistenciaAutomaticaService.ZONA).toLocalDate().plusDays(1),fin=LocalDate.of(2026,12,14);if(fin.isBefore(inicio))fin=inicio.plusDays(60);
        long plazo=Math.max(1,java.time.temporal.ChronoUnit.DAYS.between(inicio,fin));
        for(int i=0;i<PASOS.size();i++){
            Paso paso=PASOS.get(i);if(!jdbc.queryForList("SELECT id_tarea FROM pmo_tareas_plan2026 WHERE id_proyecto=? AND id_miembro=? AND paso=?",proyecto,miembro,paso.clave()).isEmpty())continue;
            FaseProyecto fase=existentes.stream().filter(f->paso.clave().equals(f.getNumeroOrden())&&paso.titulo().equalsIgnoreCase(f.getNombre())).findFirst().orElse(null);
            LocalDate limite=inicio.plusDays(Math.min(plazo,Math.max(1,plazo*(i+1)/PASOS.size())));while(limite.getDayOfWeek().getValue()>5)limite=limite.minusDays(1);
            if(fase==null){fase=new FaseProyecto();fase.setIdProyecto(proyecto);fase.setNumeroOrden(paso.clave());fase.setNombre(paso.titulo());fase.setEstado("Pendiente");fase.setPorcentajeAvance(BigDecimal.ZERO);fase.setFechaProgramada(limite);fase.setObservaciones("Estructura de tareas.pdf. Fechas propuestas para revisión del asesor, sin copiar avances ni fechas de mayo.");fase=fases.saveAndFlush(fase);existentes.add(fase);}
            Tarea tarea=new Tarea();tarea.setIdProyecto(proyecto);tarea.setIdMiembroAsignado(miembro);tarea.setIdFase(fase.getId());tarea.setTitulo(String.format(Locale.ROOT,"%02d · %s · %s",i+1,paso.clave(),paso.titulo()));tarea.setDescripcion("Plan por etapas para "+nombre+". Entregable: "+paso.entregable()+" Fecha propuesta: confirmar con el asesor. Las horas y avances se registran con evidencia; no se importan los resultados del ejemplo de mayo.");tarea.setEstado("Pendiente");tarea.setPrioridad("Media");tarea.setHorasEstimadas(BigDecimal.ZERO);tarea.setHorasRegistradas(BigDecimal.ZERO);tarea.setFechaInicio(inicio);tarea.setFechaLimite(limite);tarea=tareas.saveAndFlush(tarea);
            jdbc.update("INSERT INTO pmo_tareas_plan2026(id_proyecto,id_miembro,paso,id_tarea) VALUES(?,?,?,?)",proyecto,miembro,paso.clave(),tarea.getId());
        }
    });}
}
