package com.jjm.oficina.servicio;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RegularizacionHorasTest {
    final UsuarioRepository usuarios=mock(UsuarioRepository.class);
    final MiembroEquipoRepository miembros=mock(MiembroEquipoRepository.class);
    final RegistroHorasRepository registros=mock(RegistroHorasRepository.class);
    final JornadaAutomaticaRepository jornadas=mock(JornadaAutomaticaRepository.class);
    final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    final PermisosService permisos=mock(PermisosService.class);
    final BitacoraService bitacora=mock(BitacoraService.class);
    final List<RegistroHoras> historial=new ArrayList<>();
    final Usuario admin=new Usuario(),alumno=new Usuario();final MiembroEquipo miembro=new MiembroEquipo();
    RegularizacionHorasService servicio;
    final Map<String,Object> grupo=Map.of("id",10,"rol","Colaborador","periodo","SEP - DIC","inicio","2026-09-01");
    @BeforeEach void preparar(){
        admin.setId(1);admin.setEstado("Activo");alumno.setId(10);alumno.setEstado("Activo");alumno.setNombre("Alumno de prueba");Rol rol=new Rol();rol.setNombre("Colaborador");alumno.setRol(rol);miembro.setId(11);miembro.setUsuario(alumno);
        when(usuarios.findById(1)).thenReturn(Optional.of(admin));when(permisos.esSuperadministrador(admin)).thenReturn(true);
        when(usuarios.findById(10)).thenReturn(Optional.of(alumno));when(usuarios.buscarParaAsistencia(10)).thenReturn(Optional.of(alumno));
        when(miembros.findByUsuarioId(10)).thenReturn(Optional.of(miembro));when(miembros.buscarParaRegularizacion(10)).thenReturn(Optional.of(miembro));
        when(jdbc.queryForList(contains("ORDER BY u.id_usuario"))).thenReturn(List.of(grupo));
        when(jdbc.queryForList(contains("FOR UPDATE"),eq(10))).thenReturn(List.of(grupo));
        when(registros.findByIdMiembroAndFechaBetweenOrderByFechaDescFechaCreacionDesc(eq(11),any(),any())).thenAnswer(i->new ArrayList<>(historial));
        when(registros.buscarParaRegularizacion(eq(11),any(),any())).thenAnswer(i->new ArrayList<>(historial));
        when(registros.saveAndFlush(any())).thenAnswer(i->{RegistroHoras r=i.getArgument(0);r.setId(historial.size()+1);historial.add(r);return r;});
        when(jornadas.findByIdUsuarioAndFinalizadaFalse(10)).thenReturn(List.of());
        servicio=new RegularizacionHorasService(usuarios,miembros,registros,jornadas,jdbc,permisos,bitacora,Clock.fixed(Instant.parse("2026-10-12T16:00:00Z"),ZoneOffset.UTC));
    }
    @Test void sonTreintaDiasHabilesYTrescientasHorasIncluyendoTodoElDoceDeOctubre(){
        assertEquals(30,RegularizacionHorasService.dias().size());assertEquals(LocalDate.of(2026,9,1),RegularizacionHorasService.dias().getFirst());assertEquals(LocalDate.of(2026,10,12),RegularizacionHorasService.dias().getLast());assertTrue(RegularizacionHorasService.dias().stream().allMatch(d->d.getDayOfWeek().getValue()<=5));
        assertEquals(300,servicio.previsualizar(1).get("horasPorAlumno"));verify(registros,never()).saveAndFlush(any());
    }
    @Test void reconoceSoloLaDiferenciaConOrigenAdministrativoYNoLaRepite(){
        RegistroHoras anterior=new RegistroHoras();anterior.setFecha(LocalDate.of(2026,9,1));anterior.setHorasTrabajadas(new BigDecimal("4.50"));anterior.setEstadoValidacion("Pendiente");historial.add(anterior);
        Map<String,Object> resultado=servicio.aplicar(1);assertEquals(30,resultado.get("registrosCreados"));assertEquals(0,new BigDecimal("295.50").compareTo((BigDecimal)resultado.get("horasReconocidas")));
        assertEquals(0,new BigDecimal("300").compareTo(historial.stream().map(RegistroHoras::getHorasTrabajadas).reduce(BigDecimal.ZERO,BigDecimal::add)));
        assertTrue(historial.stream().skip(1).allMatch(r->r.getDescripcion().startsWith(RegularizacionHorasService.ORIGEN)&&r.getEstadoValidacion().equals("Aprobado")&&r.getTipoRegistro().equals("Manual")&&r.getIdUsuarioValidador().equals(1)&&r.getHoraEntrada()==null));
        assertEquals("Aprobado",anterior.getEstadoValidacion());assertEquals(1,resultado.get("registrosAprobados"));assertEquals(new BigDecimal("4.50"),resultado.get("horasAprobadas"));
        Map<String,Object> repetido=servicio.aplicar(1);assertEquals(0,repetido.get("registrosCreados"));assertEquals(0,repetido.get("registrosAprobados"));assertEquals(31,historial.size());
    }
    @Test void otrosPeriodosAniosYAsesoresNoEntranEnElGrupo(){
        assertFalse(RegularizacionHorasService.corresponde(Map.of("rol","Colaborador","periodo","MAY-AGO","inicio","2026-05-01")));
        assertFalse(RegularizacionHorasService.corresponde(Map.of("rol","Colaborador","periodo","SEP-DIC","inicio","2025-09-01")));
        assertFalse(RegularizacionHorasService.corresponde(Map.of("rol","Asesor Académico","periodo","Septiembre-Diciembre","inicio","2026-09-01")));
        assertTrue(RegularizacionHorasService.corresponde(Map.of("rol","Alumna","periodo","Septiembre - Diciembre 2026")));
    }
    @Test void profesoresDirectivosYAlumnosNoPuedenAplicarEsteReconocimiento(){
        when(permisos.esSuperadministrador(admin)).thenReturn(false);assertThrows(ResponseStatusException.class,()->servicio.aplicar(1));verifyNoInteractions(jdbc,registros);
    }
    @Test void lasJornadasObservadasSeCierranSinInflarSusSegundos(){
        RegistroHoras observado=new RegistroHoras();observado.setId(70);observado.setFecha(LocalDate.of(2026,10,12));observado.setHorasTrabajadas(BigDecimal.ONE);historial.add(observado);
        JornadaAutomatica j=new JornadaAutomatica();j.setFecha(LocalDate.of(2026,10,12));j.setIdRegistro(70);j.setTotalSegundos(3600);j.setConexiones("pagina_uno=1");
        when(jornadas.findByIdUsuarioAndFinalizadaFalse(10)).thenReturn(List.of(j));when(registros.findById(70)).thenReturn(Optional.of(observado));
        servicio.aplicar(1);assertTrue(j.isFinalizada());assertEquals(3600,j.getTotalSegundos());assertEquals("",j.getConexiones());assertEquals(LocalTime.of(10,0),observado.getHoraSalida());
    }
    @Test void lasHorasRechazadasNoReducenElReconocimientoYLasHorasExistentesMayoresSeConservan(){
        RegistroHoras rechazado=new RegistroHoras();rechazado.setFecha(LocalDate.of(2026,9,1));rechazado.setHorasTrabajadas(BigDecimal.TEN);rechazado.setEstadoValidacion("Rechazado");
        assertEquals(BigDecimal.ZERO,RegularizacionHorasService.horasDia(List.of(rechazado),rechazado.getFecha()));assertEquals(BigDecimal.ZERO,RegularizacionHorasService.faltan(new BigDecimal("12")));
    }
    @Test void reparaTrescientasHorasYaRegistradasSinAgregarHorasYConservaTiemposObservados(){
        for(LocalDate dia:RegularizacionHorasService.dias()) {
            RegistroHoras r=new RegistroHoras();r.setFecha(dia);r.setHorasTrabajadas(BigDecimal.TEN);r.setEstadoValidacion("Pendiente");
            r.setDescripcion("Registro previo");r.setHoraEntrada(LocalTime.of(9,11));r.setHoraSalida(LocalTime.of(16,45));historial.add(r);
        }
        Map<String,Object> vista=((List<Map<String,Object>>)servicio.previsualizar(1).get("alumnos")).getFirst();
        assertEquals(BigDecimal.ZERO,vista.get("horasPorReconocer"));assertEquals(new BigDecimal("300"),vista.get("horasPorAprobar"));assertEquals(30,vista.get("diasPorIdentificar"));
        Map<String,Object> resultado=servicio.aplicar(1);assertEquals(0,resultado.get("registrosCreados"));assertEquals(30,resultado.get("registrosAprobados"));assertEquals(new BigDecimal("300"),resultado.get("horasAprobadas"));
        assertTrue(historial.stream().allMatch(r->RegularizacionHorasService.esRegularizado(r)&&r.getDescripcion().startsWith("Registro previo")&&r.getHoraEntrada().equals(LocalTime.of(9,11))&&r.getHoraSalida().equals(LocalTime.of(16,45))));
        resultado=servicio.aplicar(1);assertEquals(0,resultado.get("registrosCreados"));assertEquals(0,resultado.get("registrosAprobados"));assertEquals(0,resultado.get("diasIdentificados"));assertEquals(30,historial.size());
    }
    @Test void aprobarElCorteNoApruebaRechazadosFinesDeSemanaNiFechasFueraDelCorte(){
        for(LocalDate dia:List.of(LocalDate.of(2026,8,31),LocalDate.of(2026,9,5),LocalDate.of(2026,10,13))) {
            RegistroHoras r=new RegistroHoras();r.setFecha(dia);r.setHorasTrabajadas(BigDecimal.TEN);r.setEstadoValidacion("Pendiente");historial.add(r);
        }
        RegistroHoras rechazado=new RegistroHoras();rechazado.setFecha(LocalDate.of(2026,9,1));rechazado.setHorasTrabajadas(BigDecimal.TEN);rechazado.setEstadoValidacion("Rechazado");historial.add(rechazado);
        servicio.aplicar(1);assertTrue(historial.subList(0,3).stream().allMatch(r->"Pendiente".equals(r.getEstadoValidacion())&&r.getDescripcion()==null));assertEquals("Rechazado",rechazado.getEstadoValidacion());
        assertEquals(new BigDecimal("300"),RegularizacionHorasService.dias().stream().map(d->RegularizacionHorasService.horasDia(historial,d)).reduce(BigDecimal.ZERO,BigDecimal::add));
    }
}
