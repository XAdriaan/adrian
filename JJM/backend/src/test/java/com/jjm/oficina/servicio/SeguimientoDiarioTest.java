package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.UsuarioRepository;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class SeguimientoDiarioTest {
    final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    final UsuarioRepository usuarios=mock(UsuarioRepository.class);
    final PermisosService permisos=mock(PermisosService.class);
    final AsistenciaAutomaticaService asistencia=mock(AsistenciaAutomaticaService.class);
    final ReportesDiariosService reportes=mock(ReportesDiariosService.class);
    SeguimientoDiarioService servicio;
    static class Tx extends AbstractPlatformTransactionManager {
        protected Object doGetTransaction(){return new Object();}
        protected void doBegin(Object x,org.springframework.transaction.TransactionDefinition d){}
        protected void doCommit(DefaultTransactionStatus s){}
        protected void doRollback(DefaultTransactionStatus s){}
    }
    void reloj(String instante) {
        Clock clock=Clock.fixed(Instant.parse(instante),ZoneOffset.UTC);
        AutomatizacionesService acceso=new AutomatizacionesService(jdbc,usuarios,permisos,clock,new ObjectMapper(),new Tx(),mock(BitacoraService.class));
        servicio=new SeguimientoDiarioService(jdbc,clock,acceso,asistencia,reportes);
    }
    Usuario cuenta(int id,String rol) {Usuario u=new Usuario();u.setId(id);u.setEstado("Activo");Rol r=new Rol();r.setNombre(rol);u.setRol(r);when(usuarios.findById(id)).thenReturn(Optional.of(u));return u;}
    @BeforeEach void preparar() {reloj("2026-10-14T22:00:00Z");cuenta(7,"Colaborador");cuenta(15,"Directivo escolar");when(reportes.inicio()).thenReturn("2026-10-13");when(asistencia.habilitacionReporte(anyInt(),any(LocalDate.class))).thenReturn(Map.of("habilitado",false,"segundos",28_800));}
    Map<String,Object> fila(int alumno,int proyecto,String reporte) {
        Map<String,Object> f=new HashMap<>();f.put("idUsuario",alumno);f.put("idProyecto",proyecto);f.put("nombre","Alumno "+alumno);f.put("proyecto","Proyecto "+proyecto);f.put("periodo","SEP - DIC");f.put("anio",2026);f.put("segundos",28_800);f.put("finalizada",false);f.put("continuo",true);f.put("tareasVencidas",2);f.put("proximasEntregas",1);if(reporte!=null)f.put("estadoReporte",reporte);return f;
    }
    void filas(Map<String,Object>... filas) {when(jdbc.queryForList(contains("SELECT DISTINCT u.id_usuario AS idUsuario"),any(Object[].class))).thenReturn(Arrays.asList(filas));}
    @Test void alumnoNoPuedeSolicitarElPanelDeOtrosAlumnos() {
        assertEquals(403,assertThrows(ResponseStatusException.class,()->servicio.consultar(7,true)).getStatusCode().value());verifyNoInteractions(jdbc,asistencia,reportes);
    }
    @Test void consultaPropiaQuedaFiltradaPorElUsuarioAutenticado() {
        filas(fila(7,2,null));Map<String,Object> d=servicio.consultar(7,false);
        verify(jdbc).queryForList(contains(" AND u.id_usuario=?"),eq(LocalDate.of(2026,10,14)),eq(LocalDate.of(2026,10,14)),eq(LocalDate.of(2026,10,16)),eq(LocalDate.of(2026,10,14)),eq(LocalDate.of(2026,10,14)),eq(LocalDateTime.of(2026,10,14,16,0)),eq(LocalDate.of(2026,10,14)),eq(LocalDate.of(2026,10,14)),eq(7));
        Map<?,?> f=((List<Map<?,?>>)d.get("filas")).getFirst();assertEquals("En preparación",f.get("estadoReporte"));assertEquals("En curso · tiempo en servidor",f.get("jornada"));assertEquals(false,f.get("puedeReportar"));
    }
    @Test void directivoVeProyectosSeparadosYNoDuplicaElNumeroDeAlumnos() {
        filas(fila(7,2,null),fila(7,3,"Pendiente"),fila(7,4,"Aprobado"));Map<?,?> resumen=(Map<?,?>)servicio.consultar(15,true).get("resumen");
        assertEquals(1L,resumen.get("alumnos"));assertEquals(3L,resumen.get("proyectos"));assertEquals(1L,resumen.get("reportesPendientes"));assertEquals(2L,resumen.get("reportesEntregados"));
        verify(asistencia,times(1)).habilitacionReporte(7,LocalDate.of(2026,10,14));
    }
    @Test void antesDe16NoEnviaElAvisoAunqueExistanMuchasHorasAcumuladas() {
        reloj("2026-10-14T21:59:59Z");filas(fila(7,2,null));when(asistencia.habilitacionReporte(anyInt(),any(LocalDate.class))).thenReturn(Map.of("habilitado",true,"segundos",36_000));servicio.recordarReportes();verify(jdbc,never()).update(contains("INSERT INTO pmo_recordatorios"),any(Object[].class));
    }
    @Test void alHabilitarseSeAvisaPorProyectoSinReabrirAvisosLeidos() {
        filas(fila(7,2,null),fila(7,3,null));when(asistencia.habilitacionReporte(7,LocalDate.of(2026,10,14))).thenReturn(Map.of("habilitado",true,"segundos",3_600));servicio.recordarReportes();
        verify(jdbc).update(contains("estado=IF(estado='Resuelto','Abierto',estado)"),eq("seguimiento-reporte-2-7-2026-10-14"),eq(7),anyString(),anyString(),eq("canales-proyectos.html?id=2#diario"),eq(LocalDateTime.of(2026,10,14,16,0)));
        verify(jdbc).update(contains("INSERT INTO pmo_recordatorios"),eq("seguimiento-reporte-3-7-2026-10-14"),eq(7),anyString(),anyString(),eq("canales-proyectos.html?id=3#diario"),any(LocalDateTime.class));verify(asistencia,times(1)).habilitacionReporte(anyInt(),any(LocalDate.class));
    }
    @Test void entregarElReporteResuelveSuAvisoYNoTocaElDelOtroProyecto() {
        filas(fila(7,2,"Pendiente"),fila(7,3,null));when(asistencia.habilitacionReporte(anyInt(),any(LocalDate.class))).thenReturn(Map.of("habilitado",true,"segundos",32_400));
        when(jdbc.queryForList(contains("clave LIKE 'seguimiento-reporte-%'"))).thenReturn(List.of(Map.of("id",20L,"clave","seguimiento-reporte-2-7-2026-10-14"),Map.of("id",21L,"clave","seguimiento-reporte-3-7-2026-10-14")));
        servicio.recordarReportes();verify(jdbc).update(contains("WHERE id=?"),any(LocalDateTime.class),eq(20L));verify(jdbc,never()).update(contains("WHERE id=?"),any(LocalDateTime.class),eq(21L));
    }
    @Test void despuesDelCorteYEnFinDeSemanaNoGeneraAvisosDeEntregaEnPlazo() {
        for(String instante:List.of("2026-10-14T23:01:00Z","2026-10-17T22:00:00Z")) {reset(jdbc);reloj(instante);servicio.recordarReportes();verify(jdbc,never()).update(contains("INSERT INTO pmo_recordatorios"),any(Object[].class));verify(jdbc,never()).queryForList(contains("SELECT DISTINCT u.id_usuario"),any(Object[].class));}
    }
    @Test void falloDeLecturaNoResuelveAvisosComoSiSeHubieranEntregado() {
        when(jdbc.queryForList(contains("SELECT DISTINCT u.id_usuario"),any(Object[].class))).thenThrow(new IllegalStateException("Consulta no disponible"));servicio.recordarReportes();verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
    @Test void unaCuentaInactivaOEmpresarialNoLeeElSeguimiento() {
        cuenta(8,"Empresa");cuenta(9,"Colaborador").setEstado("Inactivo");for(int id:List.of(8,9))assertThrows(ResponseStatusException.class,()->servicio.consultar(id,false));verifyNoInteractions(jdbc);
    }
    @Test void unReporteSinEntregarDespuesDe17SeMuestraVencidoAunqueEsteHabilitado() {
        reloj("2026-10-14T23:01:00Z");filas(fila(7,2,null));when(asistencia.habilitacionReporte(anyInt(),any(LocalDate.class))).thenReturn(Map.of("habilitado",true,"segundos",32_400));
        Map<?,?> f=((List<Map<?,?>>)servicio.consultar(7,false).get("filas")).getFirst();assertEquals("Pendiente fuera del plazo",f.get("estadoReporte"));assertEquals(true,f.get("reporteVencido"));assertEquals(true,f.get("puedeReportar"));
    }
}
