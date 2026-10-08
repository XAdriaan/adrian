package com.jjm.oficina.controller;

import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AsignacionesCatalogoTest {
    final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    final PermisosService permisos = mock(PermisosService.class);
    final SesionService sesiones = mock(SesionService.class);
    final CatalogoProyectosSepDic2026Service catalogo = mock(CatalogoProyectosSepDic2026Service.class);
    MockMvc mvc; Usuario admin = new Usuario(), alumno = new Usuario();
    @BeforeEach void preparar() {
        admin.setId(1); alumno.setId(2);
        when(usuarios.findById(1)).thenReturn(Optional.of(admin)); when(usuarios.findById(2)).thenReturn(Optional.of(alumno));
        when(permisos.esAdministradorBase(admin)).thenReturn(true);
        when(sesiones.obtenerUsuario("admin")).thenReturn(1); when(sesiones.obtenerUsuario("alumno")).thenReturn(2);
        when(sesiones.obtenerUsuario(null)).thenReturn(null);
        when(catalogo.obtenerAsignaciones()).thenReturn(Map.of("estado","correcto","proyectos",List.of()));
        mvc = MockMvcBuilders.standaloneSetup(new AsignacionesCatalogoController(usuarios, permisos, catalogo))
                .addFilters(new AutenticacionTokenFilter(sesiones, new ObjectMapper())).build();
    }
    @Test void consultarNoModificaDatos() throws Exception {
        mvc.perform(get("/api/asignaciones-catalogo").header("Authorization","Bearer admin")).andExpect(status().isOk());
        verify(catalogo, never()).sincronizarCatalogo();
    }
    @Test void soloAdminPuedeSincronizarOConfirmarYNoSirveFalsificarCabecera() throws Exception {
        mvc.perform(post("/api/asignaciones-catalogo/sincronizar").header("Authorization","Bearer alumno").header("X-Usuario-Id","1")).andExpect(status().isForbidden());
        mvc.perform(post("/api/asignaciones-catalogo/JJM-SD26-08/alumno").header("Authorization","Bearer alumno").contentType("application/json").content("{\"idMiembro\":8}")).andExpect(status().isForbidden());
        verify(catalogo, never()).sincronizarCatalogo(); verify(catalogo, never()).asignarAlumnoConfirmado(any(),any());
    }
    @Test void seExigeTokenAutentico() throws Exception {
        mvc.perform(get("/api/asignaciones-catalogo").header("X-Usuario-Id","1")).andExpect(status().isUnauthorized());
        verifyNoInteractions(catalogo);
    }
    @Test void confirmarRequiereIdValidoYVinculaLaCuentaSeleccionada() throws Exception {
        mvc.perform(post("/api/asignaciones-catalogo/JJM-SD26-08/alumno").header("Authorization","Bearer admin").contentType("application/json").content("{\"idMiembro\":0}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/asignaciones-catalogo/JJM-SD26-08/alumno").header("Authorization","Bearer admin").contentType("application/json").content("{\"idMiembro\":8}")).andExpect(status().isOk());
        verify(catalogo).asignarAlumnoConfirmado("JJM-SD26-08",8);
    }
    @Test void cuentaSinVinculoDevuelveErrorExplicativo() throws Exception {
        doThrow(new IllegalArgumentException("Cuenta no vinculada")).when(catalogo).asignarAlumnoConfirmado("JJM-SD26-08",8);
        mvc.perform(post("/api/asignaciones-catalogo/JJM-SD26-08/alumno").header("Authorization","Bearer admin").contentType("application/json").content("{\"idMiembro\":8}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.mensaje").value("Cuenta no vinculada"));
    }
}
