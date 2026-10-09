package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AsistenciaAutomaticaTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final MiembroEquipoRepository miembros = mock(MiembroEquipoRepository.class);
    private final RegistroHorasRepository registros = mock(RegistroHorasRepository.class);
    private final JornadaAutomaticaRepository jornadas = mock(JornadaAutomaticaRepository.class);
    private final Map<LocalDate, JornadaAutomatica> almacen = new HashMap<>();
    private final Map<Integer, RegistroHoras> historial = new HashMap<>();
    private final RelojMutable reloj = new RelojMutable();
    private AsistenciaAutomaticaService servicio;
    private Usuario alumno;
    @BeforeEach void preparar() {
        alumno = new Usuario(); alumno.setId(10); alumno.setEstado("Activo");
        Rol rol = new Rol(); rol.setNombre("Colaborador"); alumno.setRol(rol);
        MiembroEquipo miembro = new MiembroEquipo(); miembro.setId(11); miembro.setEstado("Activo");
        when(usuarios.buscarParaAsistencia(10)).thenReturn(Optional.of(alumno));
        when(miembros.findByUsuarioId(10)).thenReturn(Optional.of(miembro));
        when(registros.buscarJornadasPendientesAbiertas(11)).thenReturn(List.of());
        when(jornadas.findByIdUsuarioAndFecha(eq(10), any())).thenAnswer(i -> Optional.ofNullable(almacen.get(i.getArgument(1))));
        when(jornadas.findByIdUsuarioAndFinalizadaFalse(10)).thenAnswer(i -> almacen.values().stream().filter(j -> !j.isFinalizada()).toList());
        when(jornadas.save(any())).thenAnswer(i -> { JornadaAutomatica j=i.getArgument(0); almacen.put(j.getFecha(),j); return j; });
        when(registros.saveAndFlush(any())).thenAnswer(i -> { RegistroHoras r=i.getArgument(0); r.setId(historial.size()+1); historial.put(r.getId(),r); return r; });
        when(registros.findById(any())).thenAnswer(i -> Optional.ofNullable(historial.get(i.getArgument(0))));
        when(registros.save(any())).thenAnswer(i -> i.getArgument(0));
        PlatformTransactionManager gestor = mock(PlatformTransactionManager.class);
        when(gestor.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        servicio = new AsistenciaAutomaticaService(usuarios,miembros,registros,jornadas,mock(JdbcTemplate.class),gestor,reloj);
    }
    void hora(String local) { reloj.actual = LocalDateTime.parse(local).atZone(AsistenciaAutomaticaService.ZONA).toInstant(); }
    Map<String,Object> senal(String pagina) { return servicio.actualizar(10,true,pagina,false); }
    long segundos() { return ((Number)servicio.actualizar(10,false).get("segundos")).longValue(); }
    @Test void horarioUsaMexicoIgnoraRelojDelNavegadorYNoAbonaAntesDeEntrar() {
        hora("2026-10-09T06:59:59"); assertNull(senal("pagina_1").get("idRegistro"));
        hora("2026-10-09T09:00:00"); senal("pagina_1");
        hora("2026-10-09T09:01:00"); assertEquals(60L,senal("pagina_1").get("segundos"));
        assertEquals(LocalTime.of(9,0),historial.get(1).getHoraEntrada());
    }
    @Test void dosPestanasNoDuplicanHorasYElCierreDeUnaNoCierraLaOtra() {
        hora("2026-10-09T07:00:00"); senal("pagina_1"); senal("pagina_2");
        hora("2026-10-09T07:01:00"); senal("pagina_2");
        servicio.actualizar(10,false,"pagina_1",true);
        hora("2026-10-09T07:02:00"); senal("pagina_2");
        assertEquals(120,segundos()); assertEquals(1,historial.size());
        servicio.actualizar(10,false,"pagina_2",true);
        hora("2026-10-09T08:00:00"); assertEquals(120,segundos());
    }
    @Test void desconexionNoAcreditaElHuecoYReinicioConservaAcumulado() {
        hora("2026-10-09T07:00:00"); senal("pagina_1");
        hora("2026-10-09T08:00:00"); senal("pagina_2"); assertEquals(90,segundos());
        hora("2026-10-09T08:01:00"); senal("pagina_2"); assertEquals(150,segundos());
        // Estado en repositorios, sin acumuladores en memoria del servicio.
        assertEquals(150,almacen.values().iterator().next().getTotalSegundos());
    }
    @Test void jornadaCompletaTerminaA17YNoPuedeSuperarDiezHoras() {
        hora("2026-10-09T07:00:00"); senal("pagina_1");
        for (int minuto=1;minuto<=600;minuto++) {
            hora(LocalDateTime.of(2026,10,9,7,0).plusMinutes(minuto).toString()); senal("pagina_1");
        }
        assertEquals(36000,segundos()); assertEquals(LocalTime.of(17,0),historial.get(1).getHoraSalida());
        hora("2026-10-09T22:00:00"); assertEquals(36000,segundos());
    }
    @Test void finDeSemanaNoCreaRegistrosYCadaDiaRequiereNuevaPresencia() {
        hora("2026-10-09T16:59:00"); senal("pagina_1");
        hora("2026-10-10T09:00:00"); assertNull(senal("pagina_1").get("idRegistro"));
        assertEquals(60,almacen.get(LocalDate.of(2026,10,9)).getTotalSegundos());
        hora("2026-10-12T07:00:00"); assertNull(servicio.actualizar(10,false).get("idRegistro"));
        senal("pagina_1"); assertEquals(2,historial.size()); assertEquals(0,segundos());
    }
    @Test void alumnoInactivoOProfesorNoGeneranAsistencia() {
        hora("2026-10-09T09:00:00"); alumno.setEstado("Inactivo");
        assertEquals(false,senal("pagina_1").get("aplicable")); alumno.setEstado("Activo");
        for(String rol:List.of("Administrador","Superadministrador","Directivo escolar","Asesor Académico","Asesor Empresarial")) {
            alumno.getRol().setNombre(rol); assertEquals(false,senal("pagina_1").get("aplicable"));
        }
        verify(registros,never()).saveAndFlush(any());
    }
    @Test void jornadaManualPreexistenteNoSeDuplica() {
        hora("2026-10-09T09:00:00");
        when(registros.buscarJornadasPendientesAbiertas(11)).thenReturn(List.of(new RegistroHoras()));
        Map<String,Object> resultado=senal("pagina_1");
        assertNull(resultado.get("idRegistro")); assertTrue(resultado.get("mensaje").toString().contains("manual"));
        verify(registros,never()).saveAndFlush(any());
    }
    static class RelojMutable extends Clock {
        Instant actual;
        public ZoneId getZone(){return ZoneOffset.UTC;}
        public Clock withZone(ZoneId zona){return this;}
        public Instant instant(){return actual;}
    }
}
