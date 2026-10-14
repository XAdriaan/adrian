package com.jjm.oficina.controller;

import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import com.jjm.oficina.servicio.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AsesorProyectosAccesoTest {
    private final ProyectoRepository proyectos = mock(ProyectoRepository.class);
    private final TareaRepository tareas = mock(TareaRepository.class);
    private final FaseProyectoRepository fases = mock(FaseProyectoRepository.class);
    private final MiembroEquipoRepository miembros = mock(MiembroEquipoRepository.class);
    private final MiembroProyectoRepository asignaciones = mock(MiembroProyectoRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final OrganizacionRepository organizaciones = mock(OrganizacionRepository.class);
    private final BitacoraService bitacora = mock(BitacoraService.class);
    private final CatalogoProyectosSepDic2026Service catalogo = mock(CatalogoProyectosSepDic2026Service.class);
    private final SeparacionProyectosService separacion = mock(SeparacionProyectosService.class);
    private final SesionService sesiones = mock(SesionService.class);
    private final String token = "sesion-asesor";
    private Usuario asesor;
    private Proyecto proyecto;
    private Tarea tarea;
    private MiembroEquipo integrante;
    private Object[] controladores;
    private MockMvc mvc;

    @BeforeEach
    void preparar() {
        Rol rol = new Rol(); rol.setNombre("Asesor Empresarial");
        asesor = new Usuario(); asesor.setId(7); asesor.setEstado("Activo"); asesor.setRol(rol);
        when(usuarios.findById(7)).thenReturn(Optional.of(asesor));
        when(sesiones.obtenerUsuario(token)).thenReturn(7);
        when(sesiones.obtenerUsuario(isNull())).thenReturn(null);

        proyecto = new Proyecto(); proyecto.setId(10); proyecto.setNombre("Proyecto externo");
        proyecto.setCodigo("CONSULTA-10"); proyecto.setTipoProyecto("Normal");
        Proyecto avanzado = new Proyecto(); avanzado.setId(20); avanzado.setNombre("Proyecto avanzado");
        avanzado.setCodigo("CONSULTA-20"); avanzado.setTipoProyecto("Avanzado");
        when(proyectos.findById(10)).thenReturn(Optional.of(proyecto));
        when(proyectos.findById(20)).thenReturn(Optional.of(avanzado));
        when(proyectos.existsById(10)).thenReturn(true);
        when(proyectos.existsById(20)).thenReturn(true);
        when(proyectos.findAll(any(Sort.class))).thenReturn(List.of(proyecto, avanzado));
        when(proyectos.findAll()).thenReturn(List.of(proyecto, avanzado));
        when(catalogo.obtenerNombreVisual(any(Proyecto.class)))
                .thenAnswer(invocacion -> ((Proyecto) invocacion.getArgument(0)).getNombre());

        tarea = new Tarea(); tarea.setId(30); tarea.setIdProyecto(10); tarea.setTitulo("Tarea externa");
        tarea.setIdMiembroAsignado(42);
        when(tareas.findById(30)).thenReturn(Optional.of(tarea));
        when(tareas.findAll(any(Sort.class))).thenReturn(List.of(tarea));
        when(tareas.findByIdProyectoOrderByFechaCreacionDesc(10)).thenReturn(List.of(tarea));

        integrante = new MiembroEquipo(); integrante.setId(42); integrante.setNombreCompleto("Integrante externo");
        integrante.setEstado("Activo"); integrante.setRol("Colaborador");
        when(miembros.findById(42)).thenReturn(Optional.of(integrante));
        when(miembros.findAll(any(Sort.class))).thenReturn(List.of(integrante));
        MiembroProyecto asignacion = new MiembroProyecto(); asignacion.setId(80);
        asignacion.setIdProyecto(10); asignacion.setIdMiembro(42);
        when(asignaciones.findByIdProyectoOrderByFechaAsignacionDesc(10)).thenReturn(List.of(asignacion));
        FaseProyecto fase = new FaseProyecto(); fase.setId(50); fase.setIdProyecto(10);
        fase.setNombre("Fase registrada"); fase.setNumeroOrden("1");
        when(fases.findByIdProyectoOrderByNumeroOrdenAsc(10)).thenReturn(List.of(fase));

        controladores = new Object[] {
                new ProyectoController(proyectos, organizaciones, miembros, asignaciones, fases, usuarios,
                        bitacora, catalogo, separacion),
                new ProyectoAvanzadoController(proyectos, fases, organizaciones, miembros, usuarios),
                new TareaController(tareas, proyectos, fases, miembros, asignaciones, usuarios, bitacora),
                new MiembroProyectoController(asignaciones, miembros, proyectos, usuarios, catalogo),
                new MiembroEquipoController(miembros, usuarios, bitacora)
        };
        mvc = MockMvcBuilders.standaloneSetup(controladores)
                .addFilters(new AutenticacionTokenFilter(sesiones, new ObjectMapper())).build();
    }

    private MockHttpServletRequestBuilder autenticado(MockHttpServletRequestBuilder peticion) {
        return peticion.header("Authorization", "Bearer " + token);
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder peticion, String contenido) {
        return autenticado(peticion).contentType(MediaType.APPLICATION_JSON).content(contenido);
    }

    @Test
    void asesorSinAsignacionesConsultaTodosLosListadosSinConvertirseEnAdministrador() throws Exception {
        mvc.perform(autenticado(get("/api/proyectos"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoAcceso").value("asesor_empresarial"))
                .andExpect(jsonPath("$.total").value(2));
        mvc.perform(autenticado(get("/api/tareas"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoAcceso").value("asesor_empresarial"))
                .andExpect(jsonPath("$.tareas[0].id").value(30));
        mvc.perform(autenticado(get("/api/miembros-proyecto/mis-proyectos"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoAcceso").value("asesor_empresarial"))
                .andExpect(jsonPath("$.total").value(2));
        mvc.perform(autenticado(get("/api/miembros"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.miembros[0].id").value(42));
        verify(miembros, never()).findByUsuarioId(anyInt());
        verify(asignaciones, never()).findByIdMiembroOrderByFechaAsignacionDesc(anyInt());
        verify(separacion, never()).sincronizarParaUsuario(anyInt());
    }

    @Test
    void asesorConsultaDetallesFasesTareasEIntegrantesDeUnProyectoAjenoSinEscribir() throws Exception {
        mvc.perform(autenticado(get("/api/proyectos/10"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.proyecto.id").value(10));
        mvc.perform(autenticado(get("/api/proyectos/10/fases"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.fases[0].id").value(50));
        mvc.perform(autenticado(get("/api/proyectos/avanzados/20"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.proyecto.id").value(20));
        mvc.perform(autenticado(get("/api/tareas/30"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.tarea.id").value(30));
        mvc.perform(autenticado(get("/api/tareas/proyecto/10"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.tareas[0].id").value(30));
        mvc.perform(autenticado(get("/api/miembros-proyecto/proyecto/10"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.miembros[0].idMiembro").value(42));
        mvc.perform(autenticado(get("/api/miembros/42"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.miembro.id").value(42));
        verify(miembros, never()).findByUsuarioId(anyInt());
        verify(asignaciones, never()).existsByIdProyectoAndIdMiembro(anyInt(), anyInt());
        verify(fases, never()).save(any(FaseProyecto.class));
        verify(fases, never()).saveAll(any());
        verify(proyectos, never()).save(any(Proyecto.class));
    }

    @Test
    void lecturaGlobalNoAutorizaEditarProyectosTareasRolesNiAsignacionesAjenas() throws Exception {
        String datosProyecto = "{\"nombre\":\"Cambio ajeno\"}";
        String datosTarea = "{\"idProyecto\":10,\"idMiembroAsignado\":42,\"titulo\":\"Cambio ajeno\"}";
        mvc.perform(json(post("/api/proyectos"), datosProyecto)).andExpect(status().isForbidden());
        mvc.perform(json(put("/api/proyectos/10"), datosProyecto)).andExpect(status().isForbidden());
        mvc.perform(json(post("/api/proyectos/avanzados"), datosProyecto)).andExpect(status().isForbidden());
        mvc.perform(json(put("/api/proyectos/avanzados/20"), datosProyecto)).andExpect(status().isForbidden());
        mvc.perform(json(post("/api/tareas"), datosTarea)).andExpect(status().isForbidden());
        mvc.perform(json(put("/api/tareas/30"), datosTarea)).andExpect(status().isForbidden());
        mvc.perform(json(post("/api/miembros-proyecto/proyecto/10"), "{\"idMiembro\":42}"))
                .andExpect(status().isForbidden());
        mvc.perform(json(put("/api/miembros-proyecto/proyecto/10/miembro/42"), "{\"idMiembro\":42}"))
                .andExpect(status().isForbidden());
        mvc.perform(autenticado(delete("/api/miembros-proyecto/proyecto/10/miembro/42")))
                .andExpect(status().isForbidden());
        mvc.perform(json(put("/api/miembros/42"), "{\"rol\":\"Administrador\"}"))
                .andExpect(status().isForbidden());
        verify(proyectos, never()).save(any(Proyecto.class));
        verify(tareas, never()).save(any(Tarea.class));
        verify(miembros, never()).save(any(MiembroEquipo.class));
        verify(asignaciones, never()).save(any(MiembroProyecto.class));
        verify(asignaciones, never()).deleteByIdProyectoAndIdMiembro(anyInt(), anyInt());
        verifyNoInteractions(bitacora);
    }

    @Test
    void asesorAsignadoConservaLaEdicionPreviaDeTareasDelProyectoPropio() throws Exception {
        integrante.setUsuario(asesor);
        when(miembros.findByUsuarioId(7)).thenReturn(Optional.of(integrante));
        when(asignaciones.existsByIdProyectoAndIdMiembro(10, 42)).thenReturn(true);
        when(tareas.save(any(Tarea.class))).thenAnswer(invocacion -> {
            Tarea guardada = invocacion.getArgument(0);
            if (guardada.getId() == null) guardada.setId(31);
            return guardada;
        });
        String contenido = "{\"idProyecto\":10,\"idMiembroAsignado\":42,\"titulo\":\"Tarea propia\"}";
        mvc.perform(json(post("/api/tareas"), contenido)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.tarea.id").value(31));
        mvc.perform(json(put("/api/tareas/30"), contenido)).andExpect(status().isOk())
                .andExpect(jsonPath("$.tarea.titulo").value("Tarea propia"));
        verify(tareas, times(2)).save(any(Tarea.class));
    }

    @Test
    void asesorResponsableConservaLaEdicionPreviaSinCambiarCamposAdministrativos() throws Exception {
        integrante.setUsuario(asesor);
        proyecto.setIdResponsable(42);
        when(miembros.findByUsuarioId(7)).thenReturn(Optional.of(integrante));
        when(proyectos.save(any(Proyecto.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
        mvc.perform(json(put("/api/proyectos/10"),
                        "{\"nombre\":\"Proyecto propio\",\"codigo\":\"CONSULTA-10\",\"tipoProyecto\":\"Avanzado\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proyecto.nombre").value("Proyecto propio"))
                .andExpect(jsonPath("$.proyecto.tipoProyecto").value("Normal"))
                .andExpect(jsonPath("$.proyecto.idResponsable").value(42));
        verify(proyectos).save(proyecto);
        verify(asignaciones, never()).save(any(MiembroProyecto.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Colaborador", "Asesor Académico", "Consulta"})
    void otrosRolesSinAsignacionNoObtienenConsultaGlobal(String nombreRol) throws Exception {
        asesor.getRol().setNombre(nombreRol);
        mvc.perform(autenticado(get("/api/proyectos"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoAcceso").value("proyectos_asignados"))
                .andExpect(jsonPath("$.total").value(0));
        mvc.perform(autenticado(get("/api/proyectos/10"))).andExpect(status().isForbidden());
        mvc.perform(autenticado(get("/api/tareas/30"))).andExpect(status().isForbidden());
        mvc.perform(autenticado(get("/api/miembros/42"))).andExpect(status().isForbidden());
        mvc.perform(autenticado(get("/api/proyectos/avanzados/20"))).andExpect(status().isForbidden());
        verify(proyectos, never()).findAll(any(Sort.class));
    }

    @Test
    void usuarioInactivoEsRechazadoInclusoSinFiltroYConMembresia() throws Exception {
        asesor.setEstado("Inactivo");
        integrante.setUsuario(asesor);
        when(miembros.findByUsuarioId(7)).thenReturn(Optional.of(integrante));
        when(asignaciones.existsByIdProyectoAndIdMiembro(10, 42)).thenReturn(true);
        MockMvc directo = MockMvcBuilders.standaloneSetup(controladores).build();
        for (String ruta : List.of("/api/proyectos", "/api/proyectos/10", "/api/proyectos/10/fases",
                "/api/proyectos/avanzados/20", "/api/tareas", "/api/tareas/30",
                "/api/tareas/proyecto/10", "/api/miembros-proyecto/proyecto/10",
                "/api/miembros-proyecto/mis-proyectos", "/api/miembros", "/api/miembros/42")) {
            directo.perform(get(ruta).header("X-Usuario-Id", "7")).andExpect(status().isUnauthorized());
        }
        directo.perform(put("/api/tareas/30").header("X-Usuario-Id", "7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProyecto\":10,\"idMiembroAsignado\":42,\"titulo\":\"No permitido\"}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(proyectos, tareas, miembros, asignaciones, fases, separacion);
    }

    @Test
    void cabeceraDeUsuarioSinTokenNoAbreConsultaGlobal() throws Exception {
        mvc.perform(get("/api/proyectos").header("X-Usuario-Id", "7"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(usuarios, proyectos, separacion);
    }
}
