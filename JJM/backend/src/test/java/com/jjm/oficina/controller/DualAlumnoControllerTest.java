package com.jjm.oficina.controller;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.servicio.AsistenciaAutomaticaService;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

class DualAlumnoControllerTest {
    JdbcTemplate db;DualController dual;CanalProyectoController canales;AsistenciaAutomaticaService asistencia;DualAlumnoController c;Usuario u;
    @BeforeEach void setup(){db=mock(JdbcTemplate.class);dual=mock(DualController.class);canales=mock(CanalProyectoController.class);asistencia=mock(AsistenciaAutomaticaService.class);c=new DualAlumnoController(db,dual,canales,asistencia,Clock.fixed(Instant.parse("2026-11-24T16:00:00Z"),ZoneOffset.UTC));u=new Usuario();u.setId(7);u.setEstado("Activo");Rol r=new Rol();r.setNombre("Alumno");u.setRol(r);when(dual.usuario(7)).thenReturn(u);when(dual.acceso(1,u)).thenReturn(expediente(7));}
    Map<String,Object> expediente(int alumno){return Map.of("alumno",alumno,"proyecto",3,"inicio","2026-09-01","fin","2026-12-31","estado","Activo");}
    DualAlumnoController.Inscripcion inscripcion(Integer proyecto){return new DualAlumnoController.Inscripcion("UPT","Cuatrimestral",2026,3,"Software","2024–2027","6.º","ABC123","Programación","Fundación Ai-Koi","JJM","","Asesor propuesto","Asesora propuesta",proyecto);}
    @Test void periodosCorrectosIncluyendoBisiesto(){assertEquals(LocalDate.of(2026,11,1),DualAlumnoController.inicioPeriodo("Bimestral",2026,6));assertEquals(LocalDate.of(2026,10,1),DualAlumnoController.inicioPeriodo("Trimestral",2026,4));assertEquals(LocalDate.of(2026,9,1),DualAlumnoController.inicioPeriodo("Cuatrimestral",2026,3));assertEquals(LocalDate.of(2026,7,1),DualAlumnoController.inicioPeriodo("Semestral",2026,2));assertEquals(LocalDate.of(2028,2,29),DualAlumnoController.inicioPeriodo("Bimestral",2028,1).plusMonths(2).minusDays(1));}
    @Test void rechazaPeriodoInexistente(){assertThrows(ResponseStatusException.class,()->DualAlumnoController.inicioPeriodo("Semestral",2026,3));assertThrows(ResponseStatusException.class,()->DualAlumnoController.inicioPeriodo("Mensual",2026,1));assertThrows(ResponseStatusException.class,()->DualAlumnoController.universidad("XXX"));}
    @Test void registroSinProyectoNoInventaAsignacion(){when(db.queryForList(startsWith("SELECT id FROM pmo_dual WHERE alumno=? AND inicio=? AND fin=? AND universidad_clave=?"),eq(7),eq(LocalDate.of(2026,9,1)),eq(LocalDate.of(2026,12,31)),eq("UPT"))).thenReturn(List.of(Map.of("id",1L)));assertEquals(1L,c.inscribir(7,inscripcion(null)).get("id"));verify(db,never()).update(startsWith("INSERT INTO miembros_proyecto"),any(Object[].class));}
    @Test void noPermiteInscripcionDuplicada(){when(db.queryForList(contains("AND (universidad_clave=? OR universidad=?)"),any(Object[].class))).thenReturn(List.of(Map.of("id",1)));assertEquals(409,assertThrows(ResponseStatusException.class,()->c.inscribir(7,inscripcion(null))).getStatusCode().value());verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void noPuedeElegirProyectoAjeno(){assertEquals(400,assertThrows(ResponseStatusException.class,()->c.inscribir(7,inscripcion(99))).getStatusCode().value());verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void opcionesSoloIncluyenDatosDelAlumno(){c.opciones(7);verify(db).queryForList(contains("WHERE id_usuario=?"),eq(7));verify(db).queryForList(contains("WHERE m.id_usuario=?"),eq(7));}
    @Test void diarioReutilizaPermisosYReglasExistentes(){var r=new CanalProyectoController.Reporte("2026-11-24","Actividad suficiente","Resultado suficiente","https://example.com",null,"Materia",2.0,"");c.diario(1,7,r);verify(canales).enviarReporte(3,r,7);}
    @Test void noEntregaEnNombreDeOtroAlumno(){when(dual.acceso(1,u)).thenReturn(expediente(8));assertEquals(403,assertThrows(ResponseStatusException.class,()->c.jornada(1,"iniciar",7)).getStatusCode().value());verifyNoInteractions(asistencia);}
    @Test void rechazaDiarioFueraDelPeriodo(){var r=new CanalProyectoController.Reporte("2026-08-24","Actividad suficiente","Resultado suficiente","https://example.com",null,"Materia",2.0,"");assertThrows(ResponseStatusException.class,()->c.diario(1,7,r));verifyNoInteractions(canales);}
    @Test void entradaUsaLaJornadaExistente(){c.jornada(1,"iniciar",7);verify(asistencia).iniciar(7);verify(db,never()).update(contains("registros_horas"),any(Object[].class));}
    @Test void mensualNoModificaHorasNiPermiteAutoAprobacion(){c.mensual(1,7,new DualAlumnoController.Mensual("2026-11","Actividades","Resultados","Aprendizajes","",""));verify(db,never()).update(contains("registros_horas"),any(Object[].class));assertThrows(ResponseStatusException.class,()->c.revisar(1,7,new DualAlumnoController.Revision("2026-11","Aprobado","")));}
    @Test void mensualAprobadoQuedaProtegido(){when(db.queryForList(contains("AND estado='Aprobado'"),eq(1L),eq("2026-11"))).thenReturn(List.of(Map.of("id",4)));assertEquals(409,assertThrows(ResponseStatusException.class,()->c.mensual(1,7,new DualAlumnoController.Mensual("2026-11","a","b","c","",""))).getStatusCode().value());verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void rechazaMesFuturoYFueraDelPeriodo(){assertThrows(ResponseStatusException.class,()->c.mensual(1,7,new DualAlumnoController.Mensual("2026-12","a","b","c","","")));assertThrows(ResponseStatusException.class,()->c.mes(1,7,"2026-08"));}
}
