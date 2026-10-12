package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.UsuarioRepository;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PresenciaPlataformaTest {
    private final UsuarioRepository usuarios=mock(UsuarioRepository.class);
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private final AsistenciaAutomaticaService asistencia=mock(AsistenciaAutomaticaService.class);
    private final PermisosService permisos=mock(PermisosService.class);
    private final Instant ahora=LocalDateTime.of(2026,10,12,9,0).atZone(AsistenciaAutomaticaService.ZONA).toInstant();
    private PresenciaPlataformaService servicio;
    private Usuario alumno,admin;
    @BeforeEach void preparar() {
        servicio=new PresenciaPlataformaService(usuarios,jdbc,asistencia,permisos,Clock.fixed(ahora,ZoneOffset.UTC));
        alumno=persona(10,"Colaborador");admin=persona(1,"Superadministrador");
        when(usuarios.buscarParaAsistencia(10)).thenReturn(Optional.of(alumno));
        when(usuarios.findById(10)).thenReturn(Optional.of(alumno));when(usuarios.findById(1)).thenReturn(Optional.of(admin));
        when(permisos.esSuperadministrador(admin)).thenReturn(true);
        when(jdbc.queryForList("SELECT conexiones FROM presencias_plataforma WHERE id_usuario=?",10)).thenReturn(List.of());
        when(asistencia.actualizar(eq(10),anyBoolean(),anyString(),anyBoolean())).thenReturn(Map.of("aplicable",true,"segundos",0));
    }
    private Usuario persona(int id,String nombreRol) { Usuario u=new Usuario();u.setId(id);u.setEstado("Activo");Rol r=new Rol();r.setNombre(nombreRol);u.setRol(r);return u; }
    private Map<String,Object> fila() {
        Map<String,Object> f=new HashMap<>();f.put("idUsuario",10);f.put("nombre","Alumno de prueba");f.put("rol","Colaborador");f.put("estado","Activo");
        f.put("ultimaSenal",ahora.getEpochSecond()-10);f.put("conexiones","pagina_uno="+(ahora.getEpochSecond()-10));f.put("ruta","dashboard.html");
        f.put("idRegistro",9);f.put("segundos",3590L);f.put("liquidado",ahora.getEpochSecond()-20);f.put("senalJornada",ahora.getEpochSecond()-10);f.put("finalizada",0);f.put("entrada",LocalTime.of(8,0));return f;
    }
    @SuppressWarnings("unchecked") private Map<String,Object> primerAlumno(Map<String,Object> resultado) { return ((List<Map<String,Object>>)resultado.get("personas")).getFirst(); }
    @Test void pulsoConservaIdentidadDelServidorYSoloRemiteLaSenalDeAsistencia() {
        Map<String,Object> r=servicio.pulso(10,"pagina_uno","dashboard.html",false);
        assertEquals(true,r.get("conectado"));verify(asistencia).actualizar(10,true,"pagina_uno",false);
        verify(jdbc).update(contains("INSERT INTO presencias_plataforma"),eq(10),eq(ahora.getEpochSecond()),eq("dashboard.html"),eq("pagina_uno="+ahora.getEpochSecond()));
    }
    @Test void cerrarUnaPestanaNoDesconectaLaOtra() {
        when(jdbc.queryForList("SELECT conexiones FROM presencias_plataforma WHERE id_usuario=?",10)).thenReturn(List.of(Map.of("conexiones","pagina_uno="+ahora.getEpochSecond()+"\npagina_dos="+ahora.getEpochSecond())));
        assertEquals(true,servicio.pulso(10,"pagina_uno","dashboard.html",true).get("conectado"));
        verify(jdbc).update(anyString(),eq(10),anyLong(),anyString(),eq("pagina_dos="+ahora.getEpochSecond()));
        verify(asistencia).actualizar(10,false,"pagina_uno",true);
    }
    @Test void unaCuentaInactivaNoPuedeGenerarPresenciaNiHoras() {
        alumno.setEstado("Inactivo");assertThrows(ResponseStatusException.class,()->servicio.pulso(10,"pagina_uno","dashboard.html",false));
        verifyNoInteractions(jdbc,asistencia);
    }
    @Test void alumnosYEmpresasNoPuedenConsultarOtrasCuentas() {
        for(String rol:List.of("Colaborador","Empresa")) { alumno.getRol().setNombre(rol);ResponseStatusException e=assertThrows(ResponseStatusException.class,()->servicio.monitor(10,null));assertEquals(403,e.getStatusCode().value()); }
        verifyNoInteractions(jdbc);
    }
    @Test void monitorCalculaSegundosConRelojServidorSinModificarLosRegistros() {
        LocalDate fecha=LocalDate.of(2026,10,12);when(jdbc.queryForList(contains("FROM usuarios u"),eq(fecha),eq(fecha))).thenReturn(List.of(fila()));
        Map<String,Object> dato=primerAlumno(servicio.monitor(1,null));
        assertEquals(true,dato.get("contando"));assertEquals(true,dato.get("conectado"));assertEquals(3610L,dato.get("segundos"));assertEquals("dashboard.html",dato.get("apartado"));
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
    @Test void unaConexionVencidaOUnaFechaHistoricaNoAvanzanElReloj() {
        LocalDate fecha=LocalDate.of(2026,10,9);Map<String,Object> fila=fila();fila.put("conexiones","pagina_uno="+(ahora.getEpochSecond()-100));
        when(jdbc.queryForList(contains("FROM usuarios u"),eq(fecha),eq(fecha))).thenReturn(List.of(fila));
        Map<String,Object> dato=primerAlumno(servicio.monitor(1,fecha));assertEquals(false,dato.get("contando"));assertEquals(false,dato.get("conectado"));assertEquals(3590L,dato.get("segundos"));
    }
    @Test void asesoresYDirectivosTienenConsultaPeroNoUnaCuentaEmpresarial() {
        for(String rol:List.of("Asesor Académico","Asesor Empresarial","Directivo escolar")) { alumno.getRol().setNombre(rol);assertTrue(servicio.puedeSupervisar(alumno)); }
        alumno.getRol().setNombre("Empresa");assertFalse(servicio.puedeSupervisar(alumno));
    }
    @Test void conexionesInvalidasNoImpidenConsultarLaAsistencia() {
        assertEquals(Map.of("pagina_dos",ahora.getEpochSecond()),PresenciaPlataformaService.conexiones("pagina_uno=no-es-numero\npagina_dos="+ahora.getEpochSecond()+"\nincorrecto",ahora.getEpochSecond()));
    }
    @Test void elMonitorLimitaLaAnimacionAlFinDelHorarioYAlVencimientoDeLaSenal() {
        Instant cierre=LocalDateTime.of(2026,10,12,16,59,59).atZone(AsistenciaAutomaticaService.ZONA).toInstant();
        servicio=new PresenciaPlataformaService(usuarios,jdbc,asistencia,permisos,Clock.fixed(cierre,ZoneOffset.UTC));
        LocalDate fecha=LocalDate.of(2026,10,12);Map<String,Object> fila=fila();fila.put("senalJornada",cierre.getEpochSecond()-85);fila.put("liquidado",cierre.getEpochSecond());
        when(jdbc.queryForList(contains("FROM usuarios u"),eq(fecha),eq(fecha))).thenReturn(List.of(fila));
        Map<String,Object> dato=primerAlumno(servicio.monitor(1,fecha));assertEquals(true,dato.get("contando"));assertEquals(1L,dato.get("segundosHastaCierre"));assertEquals(5L,dato.get("vigenciaSegundos"));
    }
}
