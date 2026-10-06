package com.jjm.oficina.controller;

import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import com.jjm.oficina.servicio.BitacoraService;
import com.jjm.oficina.servicio.SesionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AsistenciaPropiaTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final MiembroEquipoRepository miembros = mock(MiembroEquipoRepository.class);
    private final RegistroHorasRepository registros = mock(RegistroHorasRepository.class);
    private final ProyectoRepository proyectos = mock(ProyectoRepository.class);
    private final SesionService sesiones = mock(SesionService.class);
    private MockMvc mvc;

    @BeforeEach void preparar() {
        mvc = MockMvcBuilders.standaloneSetup(new RegistroHorasController(registros, miembros,
                mock(MiembroProyectoRepository.class), proyectos, mock(TareaRepository.class), usuarios,
                mock(BitacoraService.class)))
                .addFilters(new AutenticacionTokenFilter(sesiones, new ObjectMapper())).build();
        Usuario usuario = new Usuario(); usuario.setId(7); usuario.setEstado("Activo");
        Rol rol = new Rol(); rol.setNombre("Colaborador"); usuario.setRol(rol);
        when(sesiones.obtenerUsuario("sesion-prueba")).thenReturn(7);
        when(sesiones.obtenerUsuario(null)).thenReturn(null);
        when(usuarios.findById(7)).thenReturn(Optional.of(usuario));
    }

    @Test void consultaSoloSuMiembroAunqueSeaResponsableYAlguienFalsifiqueCabecera() throws Exception {
        MiembroEquipo miembro = new MiembroEquipo(); miembro.setId(42);
        when(miembros.findByUsuarioId(7)).thenReturn(Optional.of(miembro));
        when(miembros.findById(42)).thenReturn(Optional.of(miembro));
        RegistroHoras octubre = new RegistroHoras(); octubre.setId(1); octubre.setIdMiembro(42);
        octubre.setFecha(LocalDate.of(2026, 10, 5));
        RegistroHoras septiembre = new RegistroHoras(); septiembre.setId(2); septiembre.setIdMiembro(42);
        septiembre.setFecha(LocalDate.of(2026, 9, 30));
        when(registros.findByIdMiembroOrderByFechaDescFechaCreacionDesc(42)).thenReturn(List.of(octubre, septiembre));
        mvc.perform(get("/api/registros-horas/mi-asistencia?mes=10&anio=2026")
                .header("Authorization", "Bearer sesion-prueba").header("X-Usuario-Id", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.registros.length()").value(1))
                .andExpect(jsonPath("$.registros[0].idMiembro").value(42))
                .andExpect(jsonPath("$.registros[0].fecha").value("2026-10-05"));
        verify(usuarios, never()).findById(999);
        verify(registros, never()).findAllByOrderByFechaDescFechaCreacionDesc();
        verify(proyectos, never()).findAll();
    }

    @Test void usuarioSinMiembroRecibeListaVaciaSinConsultarEquipo() throws Exception {
        mvc.perform(get("/api/registros-horas/mi-asistencia").header("Authorization", "Bearer sesion-prueba"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.registros.length()").value(0));
        verifyNoInteractions(registros);
    }

    @Test void rechazaMesInvalidoYPeriodoIncompleto() throws Exception {
        for (String consulta : List.of("mes=13&anio=2026", "mes=10", "anio=2026", "mes=10&anio=0")) {
            mvc.perform(get("/api/registros-horas/mi-asistencia?" + consulta)
                    .header("Authorization", "Bearer sesion-prueba")).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(registros, miembros);
    }

    @Test void noAdmiteIdentidadSinToken() throws Exception {
        mvc.perform(get("/api/registros-horas/mi-asistencia").header("X-Usuario-Id", "7"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(registros, miembros, usuarios);
    }

    @Test void usuarioInactivoNoConsultaAsistencia() throws Exception {
        Usuario u = new Usuario(); u.setId(7); u.setEstado("Inactivo");
        when(usuarios.findById(7)).thenReturn(Optional.of(u));
        mvc.perform(get("/api/registros-horas/mi-asistencia").header("Authorization", "Bearer sesion-prueba"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(registros, miembros);
    }
}
