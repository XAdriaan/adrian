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
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
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
        when(jdbc.queryForList(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);if(!sql.contains("AS faltante"))return List.of();return almacen.values().stream().filter(j->j.isModoContinuo()&&!j.isReposicion()&&j.isFinalizada()&&j.getFecha().getDayOfWeek().getValue()<=5).map(j->Map.<String,Object>of("fecha",j.getFecha(),"faltante",36000-j.getTotalSegundos())).toList();});
        when(jdbc.queryForObject(anyString(),eq(Long.class),any(Object[].class))).thenAnswer(i->almacen.values().stream().filter(JornadaAutomatica::isReposicion).mapToLong(JornadaAutomatica::getTotalSegundos).sum());
        PlatformTransactionManager gestor = mock(PlatformTransactionManager.class);
        when(gestor.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        servicio = new AsistenciaAutomaticaService(usuarios,miembros,registros,jornadas,jdbc,gestor,reloj);
    }
    void hora(String local) { reloj.actual = LocalDateTime.parse(local).atZone(AsistenciaAutomaticaService.ZONA).toInstant(); }
    Map<String,Object> senal(String pagina) { Map<String,Object> estado=servicio.actualizar(10,true,pagina,false);if(Boolean.TRUE.equals(estado.get("puedeIniciar")))return servicio.iniciar(10);return estado; }
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
        servicio.finalizar(10);
        hora("2026-10-09T08:00:00"); assertEquals(120,segundos());
    }
    @Test void suspensionAcreditaTiempoTranscurridoSinPulsos() {
        hora("2026-10-09T07:00:00"); senal("pagina_1");
        hora("2026-10-09T08:00:00"); senal("pagina_2"); assertEquals(3600,segundos());
        hora("2026-10-09T08:01:00"); senal("pagina_2"); assertEquals(3660,segundos());
        // Estado en repositorios, sin acumuladores en memoria del servicio.
        assertEquals(3660,almacen.values().iterator().next().getTotalSegundos());
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
        hora("2026-10-10T09:00:00"); assertNull(servicio.actualizar(10,true,"pagina_1",false).get("idRegistro"));
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
    @Test void unaJornadaManualVaciaDeHoyContinuaAutomaticaSinDuplicarseNiAbonarAntes() {
        hora("2026-10-12T09:00:00");RegistroHoras r=new RegistroHoras();r.setId(7);r.setFecha(LocalDate.of(2026,10,12));r.setTipoRegistro("Jornada");r.setEstadoValidacion("Pendiente");r.setHorasTrabajadas(java.math.BigDecimal.ZERO);r.setHoraEntrada(LocalTime.of(7,0));historial.put(7,r);
        when(registros.buscarJornadasPendientesAbiertas(11)).thenReturn(List.of(r));doReturn(r).when(registros).saveAndFlush(r);
        assertEquals(7,senal("pagina_1").get("idRegistro"));assertEquals(0,segundos());
        hora("2026-10-12T09:01:01");assertEquals(61L,senal("pagina_1").get("segundos"));assertEquals(1,historial.size());assertEquals(LocalTime.of(9,0),r.getHoraEntrada());
    }
    @Test void pendientesDeOtroDiaNoBloqueanLaAsistenciaActual() {
        hora("2026-10-12T09:00:00");RegistroHoras r=new RegistroHoras();r.setFecha(LocalDate.of(2026,10,9));when(registros.buscarJornadasPendientesAbiertas(11)).thenReturn(List.of(r));
        assertNotNull(senal("pagina_1").get("idRegistro"));
    }
    @Test void unaJornadaManualConHorasGuardadasNoSeReescribeAutomaticamente() {
        hora("2026-10-12T09:00:00");RegistroHoras r=new RegistroHoras();r.setFecha(LocalDate.of(2026,10,12));r.setTipoRegistro("Jornada");r.setEstadoValidacion("Pendiente");r.setHorasTrabajadas(java.math.BigDecimal.ONE);
        when(registros.buscarJornadasPendientesAbiertas(11)).thenReturn(List.of(r));assertNull(senal("pagina_1").get("idRegistro"));assertEquals(java.math.BigDecimal.ONE,r.getHorasTrabajadas());verify(registros,never()).saveAndFlush(any());
    }
    static class RelojMutable extends Clock {
        Instant actual;
        public ZoneId getZone(){return ZoneOffset.UTC;}
        public Clock withZone(ZoneId zona){return this;}
        public Instant instant(){return actual;}
    }
    @Test void lasDiezHorasReconocidasHoySeMuestranSinCrearOtraJornada() {
        hora("2026-10-12T10:00:00");when(jdbc.queryForObject(anyString(),eq(java.math.BigDecimal.class),any(Object[].class))).thenReturn(java.math.BigDecimal.TEN);
        Map<String,Object> resultado=senal("pagina_1");assertEquals(36000L,resultado.get("segundos"));assertEquals(false,resultado.get("contando"));assertNull(resultado.get("idRegistro"));verify(registros,never()).saveAndFlush(any());
    }
    @Test void elSaldoAcumuladoDelServidorIncluyeElReconocimientoHistorico() {
        hora("2026-10-12T10:00:00");when(jdbc.queryForObject(anyString(),eq(java.math.BigDecimal.class),eq(11))).thenReturn(new java.math.BigDecimal("300.00"));
        assertEquals(new java.math.BigDecimal("300.00"),senal("pagina_1").get("horasAcumuladas"));
    }
    @Test void entrarALaPaginaNoIniciaJornada(){hora("2026-10-14T07:00:00");assertNull(servicio.actualizar(10,true,"pagina_1",false).get("idRegistro"));assertTrue(historial.isEmpty());}
    @Test void iniciarDosVecesNoReiniciaRelojNiDuplicaRegistro(){hora("2026-10-14T07:00:00");servicio.iniciar(10);hora("2026-10-14T08:00:00");servicio.iniciar(10);assertEquals(3600,segundos());assertEquals(1,historial.size());}
    @Test void suspensionDeDiezHorasCierraA17SinNecesitarPulsos(){hora("2026-10-14T07:00:00");servicio.iniciar(10);hora("2026-10-15T06:00:00");servicio.actualizar(10,false);JornadaAutomatica j=almacen.get(LocalDate.of(2026,10,14));assertEquals(36000,j.getTotalSegundos());assertTrue(j.isFinalizada());assertEquals(LocalTime.of(17,0),historial.get(1).getHoraSalida());assertEquals(1,historial.size());}
    @Test void reporteSeHabilitaExactamenteA7SinHorasAcumuladas(){hora("2026-10-14T06:59:59");assertEquals(false,servicio.habilitacionReporte(10,LocalDate.of(2026,10,14)).get("habilitado"));hora("2026-10-14T07:00:00");assertEquals(true,servicio.habilitacionReporte(10,LocalDate.of(2026,10,14)).get("habilitado"));servicio.iniciar(10);assertEquals(0,segundos());}
    @Test void entradaA8AvisaFaltaUnaHoraYReposicionSeDetieneAlCubrirla(){hora("2026-10-16T08:00:00");servicio.iniciar(10);verify(jdbc,atLeastOnce()).update(contains("pmo_recordatorios"),any(Object[].class));hora("2026-10-16T17:00:00");assertEquals(32400,segundos());assertEquals(3600L,servicio.actualizar(10,false).get("reposicionPendienteSegundos"));hora("2026-10-17T07:00:00");servicio.iniciar(10);hora("2026-10-17T10:00:00");assertEquals(3600,segundos());assertEquals(LocalTime.of(8,0),historial.get(2).getHoraSalida());assertEquals(0L,servicio.actualizar(10,false).get("reposicionPendienteSegundos"));}
    @Test void noIniciaFinDeSemanaSinSaldoNiReabreJornadaDespuesDelHorario(){hora("2026-10-17T07:00:00");assertThrows(org.springframework.web.server.ResponseStatusException.class,()->servicio.iniciar(10));hora("2026-10-19T07:00:00");servicio.iniciar(10);hora("2026-10-19T17:00:00");assertThrows(org.springframework.web.server.ResponseStatusException.class,()->servicio.iniciar(10));}
    @Test void reporteDeDiaIncompletoPermaneceDisponibleDespuesDe17YSinReponerPrimero(){hora("2026-10-16T10:00:00");servicio.iniciar(10);hora("2026-10-16T17:30:00");assertEquals(true,servicio.habilitacionReporte(10,LocalDate.of(2026,10,16)).get("habilitado"));assertEquals(25200,almacen.get(LocalDate.of(2026,10,16)).getTotalSegundos());hora("2026-10-17T08:00:00");assertEquals(true,servicio.habilitacionReporte(10,LocalDate.of(2026,10,16)).get("habilitado"));}
    @Test void elHorarioDeReporteNoDependeDeHaberAcumuladoHoras(){hora("2026-10-14T06:59:59");assertEquals(false,servicio.actualizar(10,false).get("reporteHabilitado"));assertEquals(1L,servicio.habilitacionReporte(10,LocalDate.of(2026,10,14)).get("faltanSegundos"));hora("2026-10-14T07:00:00");assertEquals(true,servicio.actualizar(10,false).get("reporteHabilitado"));assertEquals(true,servicio.habilitacionReporte(10,LocalDate.of(2026,10,14)).get("habilitado"));assertTrue(historial.isEmpty());}
    @Test void profesorNoPuedeIniciarNiFinalizarJornadaAlumno(){hora("2026-10-14T07:00:00");alumno.getRol().setNombre("Superadministrador");assertThrows(org.springframework.web.server.ResponseStatusException.class,()->servicio.iniciar(10));assertTrue(historial.isEmpty());}

    @Test void regresarDeAsesorAColaboradorPermiteContinuarHoyConElMismoRegistro() {
        alumno.setContrasena("hash-conservado");
        RegistroHoras anterior = new RegistroHoras(); anterior.setId(99); anterior.setIdMiembro(11);
        anterior.setFecha(LocalDate.of(2026,10,13)); anterior.setHorasTrabajadas(new java.math.BigDecimal("7.25"));
        anterior.setEstadoValidacion("Aprobado"); historial.put(99,anterior);
        hora("2026-10-14T07:00:00"); servicio.iniciar(10);
        JornadaAutomatica jornada = almacen.get(LocalDate.of(2026,10,14));
        RegistroHoras registro = historial.get(jornada.getIdRegistro());
        Integer idRegistro = registro.getId();
        hora("2026-10-14T08:00:00"); alumno.getRol().setNombre("Asesor Empresarial");
        assertEquals(false,servicio.actualizar(10,false).get("perfilAlumno"));
        assertEquals("CAMBIO_PERFIL",jornada.getMotivoCierre()); assertTrue(jornada.isFinalizada());
        assertEquals(3600,jornada.getTotalSegundos());
        hora("2026-10-14T10:00:00"); alumno.getRol().setNombre("Colaborador");
        Map<String,Object> estado = servicio.actualizar(10,false);
        assertEquals(true,estado.get("puedeReanudar")); assertEquals(true,estado.get("perfilAlumno"));
        assertEquals(false,estado.get("contando")); assertEquals(3600L,estado.get("segundos"));
        assertTrue(jornada.isFinalizada(),"Consultar no reinicia el reloj por sí solo");
        servicio.iniciar(10);
        assertEquals(idRegistro,jornada.getIdRegistro()); assertEquals(3600,jornada.getTotalSegundos());
        assertNull(registro.getHoraSalida()); assertEquals(LocalTime.of(7,0),registro.getHoraEntrada());
        hora("2026-10-14T11:00:00"); assertEquals(7200,segundos());
        assertEquals(new java.math.BigDecimal("2.00"),registro.getHorasTrabajadas());
        assertEquals(new java.math.BigDecimal("7.25"),anterior.getHorasTrabajadas());
        assertEquals("hash-conservado",alumno.getContrasena()); assertEquals(2,historial.size());
        verify(usuarios,never()).save(any());
    }

    @Test void jornadaCerradaAntesDeV25PuedeContinuarseSinAcreditarElIntervaloCerrado() {
        hora("2026-10-14T07:00:00"); servicio.iniciar(10);
        hora("2026-10-14T08:00:00"); servicio.finalizar(10);
        JornadaAutomatica jornada = almacen.get(LocalDate.of(2026,10,14));
        jornada.setMotivoCierre(""); // V24 no guardaba la causa del cierre por cambio de rol.
        hora("2026-10-14T11:00:00");
        assertEquals(true,servicio.actualizar(10,false).get("puedeReanudar"));
        assertEquals(3600L,servicio.iniciar(10).get("segundos"));
        servicio.iniciar(10); assertEquals(1,historial.size());
        hora("2026-10-14T11:01:00"); assertEquals(3660,segundos());
    }

    @Test void continuarTrasFinalizarVoluntariamenteNoBorraLasHorasNiDuplicaJornada() {
        hora("2026-10-14T07:00:00"); servicio.iniciar(10);
        hora("2026-10-14T09:00:00"); servicio.finalizar(10);
        assertEquals("FINALIZACION_ALUMNO",almacen.get(LocalDate.of(2026,10,14)).getMotivoCierre());
        hora("2026-10-14T10:00:00"); assertEquals(7200L,servicio.iniciar(10).get("segundos"));
        hora("2026-10-14T10:01:00"); assertEquals(7260,segundos()); assertEquals(1,historial.size());
    }

    @Test void asesorNoPuedeReanudarLaJornadaAunqueSuRegistroSigaPendiente() {
        hora("2026-10-14T07:00:00"); servicio.iniciar(10);
        hora("2026-10-14T08:00:00"); alumno.getRol().setNombre("Asesor Empresarial"); servicio.actualizar(10,false);
        hora("2026-10-14T09:00:00");
        assertEquals(false,servicio.actualizar(10,false).get("puedeReanudar"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->servicio.iniciar(10));
        assertEquals(3600,almacen.get(LocalDate.of(2026,10,14)).getTotalSegundos());
    }

    @Test void noReabreRegistroAprobadoRechazadoAjenoONoCorrespondienteAlDia() {
        hora("2026-10-14T07:00:00"); servicio.iniciar(10);
        hora("2026-10-14T08:00:00"); servicio.finalizar(10);
        RegistroHoras registro = historial.get(1);
        for (String validacion : List.of("Aprobado","Rechazado")) {
            registro.setEstadoValidacion(validacion);
            assertEquals(false,servicio.actualizar(10,false).get("puedeReanudar"));
            assertThrows(org.springframework.web.server.ResponseStatusException.class,()->servicio.iniciar(10));
        }
        registro.setEstadoValidacion("Pendiente"); registro.setIdMiembro(12);
        assertEquals(false,servicio.actualizar(10,false).get("puedeReanudar"));
        registro.setIdMiembro(11); registro.setFecha(LocalDate.of(2026,10,13));
        assertEquals(false,servicio.actualizar(10,false).get("puedeReanudar"));
        assertEquals(new java.math.BigDecimal("1.00"),registro.getHorasTrabajadas());
        assertEquals(1,historial.size());
    }

    @Test void cierresDefinitivosNoSeReabrenNiSuperanLaMetaDiaria() {
        hora("2026-10-14T07:00:00"); servicio.iniciar(10);
        hora("2026-10-14T08:00:00"); servicio.finalizar(10);
        JornadaAutomatica jornada = almacen.get(LocalDate.of(2026,10,14));
        for (String motivo : List.of("FIN_HORARIO","META_CUBIERTA","REGISTRO_VALIDADO")) {
            jornada.setMotivoCierre(motivo);
            assertEquals(false,servicio.actualizar(10,false).get("puedeReanudar"));
            assertThrows(org.springframework.web.server.ResponseStatusException.class,()->servicio.iniciar(10));
        }
        jornada.setMotivoCierre(""); jornada.setTotalSegundos(36000);
        assertEquals(false,servicio.actualizar(10,false).get("puedeReanudar"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->servicio.iniciar(10));
        hora("2026-10-15T07:00:00");
        assertEquals(false,servicio.actualizar(10,false).get("puedeReanudar"));
        assertEquals(36000,jornada.getTotalSegundos());
    }

    @Test void jornadaReanudadaSigueRespetandoElCierreDe17YLasDiezHorasTotales() {
        hora("2026-10-14T07:00:00"); servicio.iniciar(10);
        hora("2026-10-14T09:00:00"); servicio.finalizar(10);
        hora("2026-10-14T10:00:00"); servicio.iniciar(10);
        hora("2026-10-14T18:00:00"); assertEquals(32400,segundos());
        JornadaAutomatica jornada = almacen.get(LocalDate.of(2026,10,14));
        assertEquals("FIN_HORARIO",jornada.getMotivoCierre());
        assertEquals(LocalTime.of(17,0),historial.get(1).getHoraSalida());
        assertEquals(false,servicio.actualizar(10,false).get("puedeReanudar"));
    }
}
