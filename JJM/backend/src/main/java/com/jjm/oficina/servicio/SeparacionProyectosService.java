package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import org.springframework.boot.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/** Una fila del PDF es un proyecto; los nombres alternativos dentro de la misma fila se conservan juntos. */
@Service
@Order(20)
public class SeparacionProyectosService implements ApplicationRunner {
    public record Parte(String origen,String sufijo,String nombre,String alcance) {public String codigo(){return origen+"-"+sufijo;}}
    public static final List<Parte> PARTES=List.of(
        new Parte("JJM-SD26-02","A","02 E-Learning","Plataforma web y móvil para conferencias, cursos, certificaciones, evaluaciones y talleres con chatbot e inteligencia artificial."),
        new Parte("JJM-SD26-02","B","04 PWEB · Herramienta para páginas web","Herramienta web y móvil para desarrollar páginas y aplicaciones en minutos, con chatbot e inteligencia artificial para asociaciones civiles."),
        new Parte("JJM-SD26-02","C","06 PPCV · Proyección profesional","Administración de empresarios y alumnos, elaboración profesional de CV, capacitación y certificación con chatbot e inteligencia artificial."),
        new Parte("JJM-SD26-03","A","03 JJM · Página web empresarial","Solución web y móvil para operaciones nacionales e internacionales de JJM, con chatbot e inteligencia artificial."),
        new Parte("JJM-SD26-03","B","05 PCP · Psicología","Administración de especialistas en psicología, pruebas psicométricas y pacientes, mediante web y aplicación móvil."),
        new Parte("JJM-SD26-04","A","07 Compranet","Administración de convocatorias de adquisiciones, productos y servicios nacionales e internacionales, mediante web y aplicación móvil."),
        new Parte("JJM-SD26-04","B","08 Oficina de Proyectos","Administración integral de la Oficina de Proyectos y sus soluciones tecnológicas, con chatbot e inteligencia artificial."),
        new Parte("JJM-SD26-04","C","09 Publicidad","Herramienta web y móvil para publicidad y administración de diseños y versiones finales, con chatbot e inteligencia artificial."),
        new Parte("JJM-SD26-05","A","10 Otorrino (OTO)","Administración de pacientes atendidos en consultorio mediante web y aplicación móvil, con chatbot e inteligencia artificial."),
        new Parte("JJM-SD26-05","B","11 Compite","Administración de concursos nacionales e internacionales de competencias multidisciplinarias, mediante web y aplicación móvil."),
        new Parte("JJM-SD26-05","C","12 Brocas","Administración de productos chinos del sector ferretero y comparaciones con la competencia, mediante web y aplicación móvil.")
    );
    private final ProyectoRepository proyectos;private final MiembroProyectoRepository asignaciones;private final MiembroEquipoRepository miembros;private final CatalogoProyectosSepDic2026Service catalogo;
    public SeparacionProyectosService(ProyectoRepository proyectos,MiembroProyectoRepository asignaciones,MiembroEquipoRepository miembros,CatalogoProyectosSepDic2026Service catalogo){this.proyectos=proyectos;this.asignaciones=asignaciones;this.miembros=miembros;this.catalogo=catalogo;}
    @Override public void run(ApplicationArguments args){sincronizar();}
    public synchronized void sincronizar(){
        for(Parte parte:PARTES){Proyecto padre=proyectos.findByCodigo(parte.origen()).orElse(null);if(padre==null)continue;Proyecto hijo=crear(parte,padre);for(MiembroProyecto a:asignaciones.findByIdProyectoOrderByFechaAsignacionDesc(padre.getId()))vincular(hijo,a);}
        if(proyectos.findByCodigo("JJM-SD26-AIKOI").isEmpty()){
            Proyecto p=new Proyecto();p.setCodigo("JJM-SD26-AIKOI");p.setNombre("14 Ai-Koi · Fundación");p.setDescripcion("Página web y aplicación móvil para ampliar las operaciones de la Fundación Ai-Koi, A.C., con chatbot e inteligencia artificial. El PDF no indica alumno ni equipo de septiembre: pendiente de asignación por Administración.");valoresIniciales(p);proyectos.save(p);
        }
    }
    public synchronized void sincronizarParaUsuario(Integer usuario){
        catalogo.sincronizarCuenta(usuario);
        MiembroEquipo m=miembros.findByUsuarioId(usuario).orElse(null);if(!activo(m))return;
        for(MiembroProyecto a:asignaciones.findByIdMiembroOrderByFechaAsignacionDesc(m.getId())){
            Proyecto p=proyectos.findById(a.getIdProyecto()).orElse(null);if(p==null)continue;
            for(Parte parte:PARTES)if(parte.origen().equals(p.getCodigo()))vincular(crear(parte,p),a);
        }
    }
    private static boolean activo(MiembroEquipo m){return m!=null&&m.getUsuario()!=null&&"Activo".equalsIgnoreCase(m.getEstado())&&"Activo".equalsIgnoreCase(m.getUsuario().getEstado());}
    private void vincular(Proyecto hijo,MiembroProyecto fuente){MiembroEquipo m=miembros.findById(fuente.getIdMiembro()).orElse(null);if(!activo(m)||asignaciones.existsByIdProyectoAndIdMiembro(hijo.getId(),m.getId()))return;MiembroProyecto a=new MiembroProyecto();a.setIdProyecto(hijo.getId());a.setIdMiembro(m.getId());a.setRolProyecto(fuente.getRolProyecto());a.setHorasAsignadas(BigDecimal.ZERO);a.setNotas("Proyecto separado según una fila del PDF Sep-Dic 2026. Asignación heredada del equipo integrado #"+fuente.getIdProyecto()+". Sin duplicar horas ni tareas.");asignaciones.save(a);}
    private Proyecto crear(Parte parte,Proyecto padre){return proyectos.findByCodigo(parte.codigo()).orElseGet(()->{Proyecto p=new Proyecto();p.setCodigo(parte.codigo());p.setNombre(parte.nombre());p.setDescripcion(parte.alcance()+" Fuente: JJM Proyectos Septiembre - Diciembre 2026 v06. Historial del equipo integrado #"+padre.getId()+" conservado.");valoresIniciales(p);p.setIdOrganizacion(padre.getIdOrganizacion());p.setFechaInicio(padre.getFechaInicio());p.setFechaFin(padre.getFechaFin());p.setClienteArea(parte.nombre());return proyectos.save(p);});}
    private static void valoresIniciales(Proyecto p){p.setClasificacionProyecto("Interno");p.setTipoProyecto("Normal");p.setEstado("Planificación");p.setPrioridad("Media");p.setPorcentajeAvance(BigDecimal.ZERO);p.setFechaInicio(LocalDate.of(2026,9,1));p.setFechaFin(LocalDate.of(2026,12,14));p.setObservacionesGenerales("Registro separado del catálogo; avance pendiente de medición. Se conserva el historial anterior.");}
    public static List<Proyecto> visibles(List<Proyecto> disponibles){Set<String> codigos=new HashSet<>();disponibles.forEach(p->codigos.add(p.getCodigo()));return disponibles.stream().filter(p->{List<Parte> hijos=PARTES.stream().filter(s->s.origen().equals(p.getCodigo())).toList();return hijos.isEmpty()||!hijos.stream().allMatch(h->codigos.contains(h.codigo()));}).toList();}
    public Integer origenDe(Proyecto hijo){return PARTES.stream().filter(p->p.codigo().equals(hijo.getCodigo())).findFirst().flatMap(p->proyectos.findByCodigo(p.origen())).map(Proyecto::getId).orElse(null);}
    public Map<String,List<Map<String,Object>>> resumen(){Map<String,List<Map<String,Object>>> r=new LinkedHashMap<>();for(Parte parte:PARTES){Proyecto p=proyectos.findByCodigo(parte.codigo()).orElse(null);if(p!=null)r.computeIfAbsent(parte.origen(),k->new ArrayList<>()).add(Map.of("id",p.getId(),"nombre",p.getNombre()));}return r;}
}
