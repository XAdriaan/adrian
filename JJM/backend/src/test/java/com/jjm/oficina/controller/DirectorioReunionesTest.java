package com.jjm.oficina.controller;

import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import com.jjm.oficina.servicio.SesionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DirectorioReunionesTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final MiembroEquipoRepository miembros = mock(MiembroEquipoRepository.class);
    private final MiembroProyectoRepository asignaciones = mock(MiembroProyectoRepository.class);
    private final ProyectoRepository proyectos = mock(ProyectoRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final SesionService sesiones = mock(SesionService.class);
    private MockMvc mvc;
    private Usuario usuario;

    @BeforeEach void preparar() {
        mvc = MockMvcBuilders.standaloneSetup(new ReunionController(jdbc, usuarios, proyectos, miembros, asignaciones))
                .addFilters(new AutenticacionTokenFilter(sesiones, new ObjectMapper())).build();
        usuario = new Usuario(); usuario.setId(7); usuario.setEstado("Activo");
        Rol rol = new Rol(); rol.setNombre("Colaborador"); usuario.setRol(rol);
        when(sesiones.obtenerUsuario("sesion-prueba")).thenReturn(7);
        when(sesiones.obtenerUsuario(null)).thenReturn(null);
        when(usuarios.findById(7)).thenReturn(Optional.of(usuario));
    }

    private Proyecto proyecto(int id, int responsable, String nombre) {
        Proyecto p = new Proyecto(); p.setId(id); p.setIdResponsable(responsable); p.setNombre(nombre); return p;
    }

    @Test void miembroVeSoloSalasAsignadasAunqueSeaResponsableDeOtra() throws Exception {
        MiembroEquipo miembro = new MiembroEquipo(); miembro.setId(42);
        when(miembros.findByUsuarioId(7)).thenReturn(Optional.of(miembro));
        MiembroProyecto asignado = new MiembroProyecto(); asignado.setIdProyecto(2);
        when(asignaciones.findByIdMiembroOrderByFechaAsignacionDesc(42)).thenReturn(List.of(asignado));
        when(proyectos.findAll()).thenReturn(List.of(proyecto(1,42,"A responsable"),
                proyecto(2,50,"B asignado"), proyecto(3,50,"Privado")));
        Map<String,Object> reunion = new HashMap<>(Map.of("id",9L,"idProyecto",2,"estado","Activa","idCreador",8));
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(reunion));
        mvc.perform(get("/api/reuniones").header("Authorization", "Bearer sesion-prueba").header("X-Usuario-Id", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.proyectos.length()").value(1))
                .andExpect(jsonPath("$.proyectos[0].id").value(2))
                .andExpect(jsonPath("$.proyectos[0].reunionActiva.id").value(9))
                .andExpect(jsonPath("$.proyectos[0].reunionActiva.puedeFinalizar").value(false));
        verify(usuarios, never()).findById(999);
    }

    @Test void administradorPuedeConsultarTodasLasSalas() throws Exception {
        usuario.getRol().setNombre("Administrador");
        when(proyectos.findAll()).thenReturn(List.of(proyecto(1,42,"A"),proyecto(3,50,"B")));
        mvc.perform(get("/api/reuniones").header("Authorization", "Bearer sesion-prueba"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.proyectos.length()").value(2));
    }

    @Test void sinMiembroNoListaProyectosAjenosNiConsultaReuniones() throws Exception {
        when(proyectos.findAll()).thenReturn(List.of(proyecto(3,50,"Privado")));
        mvc.perform(get("/api/reuniones").header("Authorization", "Bearer sesion-prueba"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.proyectos.length()").value(0));
        verifyNoInteractions(jdbc);
    }

    @Test void noExponeDirectorioSinSesionNiConUsuarioInactivo() throws Exception {
        mvc.perform(get("/api/reuniones").header("X-Usuario-Id","7")).andExpect(status().isUnauthorized());
        usuario.setEstado("Inactivo");
        mvc.perform(get("/api/reuniones").header("Authorization","Bearer sesion-prueba"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(proyectos, jdbc, miembros);
    }

    @Test void serResponsableSinAsignacionNoPermiteAbrirNiFinalizarNiConsultarSala() throws Exception {
        MiembroEquipo miembro=new MiembroEquipo();miembro.setId(42);
        when(miembros.findByUsuarioId(7)).thenReturn(Optional.of(miembro));
        when(proyectos.findById(2)).thenReturn(Optional.of(proyecto(2,42,"Proyecto")));
        when(jdbc.queryForList(anyString(),any(Object[].class))).thenReturn(List.of(Map.of("id",9L,"idProyecto",2,"estado","Activa","idCreador",7)));
        for(String ruta:List.of("/api/proyectos/2/reuniones","/api/proyectos/2/reuniones/activa","/api/reuniones/9","/api/reuniones/9/grabaciones"))
            mvc.perform(get(ruta).header("Authorization","Bearer sesion-prueba")).andExpect(status().isForbidden());
        for(String ruta:List.of("/api/proyectos/2/reuniones","/api/reuniones/9/unirse","/api/reuniones/9/finalizar"))
            mvc.perform(post(ruta).header("Authorization","Bearer sesion-prueba")).andExpect(status().isForbidden());
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }

    @Test void asignacionPermiteSalaYReunionFinalizadaRechazaEntrada() throws Exception {
        MiembroEquipo miembro=new MiembroEquipo();miembro.setId(42);
        when(miembros.findByUsuarioId(7)).thenReturn(Optional.of(miembro));
        when(asignaciones.existsByIdProyectoAndIdMiembro(2,42)).thenReturn(true);
        when(proyectos.findById(2)).thenReturn(Optional.of(proyecto(2,50,"Proyecto")));
        when(jdbc.queryForList(anyString(),any(Object[].class))).thenReturn(List.of(Map.of("id",9L,"idProyecto",2,"estado","Finalizada","idCreador",8)));
        mvc.perform(get("/api/reuniones/9").header("Authorization","Bearer sesion-prueba")).andExpect(status().isOk());
        mvc.perform(post("/api/reuniones/9/unirse").header("Authorization","Bearer sesion-prueba")).andExpect(status().isConflict());
    }
}
