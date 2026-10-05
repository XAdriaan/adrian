package com.jjm.oficina.controller;

import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.Rol;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.PermisosService;
import com.jjm.oficina.servicio.SesionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RolesControllerTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final PermisosService permisos = mock(PermisosService.class);
    private final SesionService sesiones = mock(SesionService.class);
    private MockMvc mvc;

    @BeforeEach
    void preparar() {
        when(sesiones.obtenerUsuario(null)).thenReturn(null);
        mvc = MockMvcBuilders.standaloneSetup(new RolesController(usuarios, permisos))
                .addFilters(new AutenticacionTokenFilter(sesiones, new ObjectMapper())).build();
    }

    @Test
    void devuelveContratoDelFrontendConIdentidadDelToken() throws Exception {
        Rol rol = new Rol();
        rol.setId(3);
        rol.setNombre("Colaborador");
        Usuario usuario = new Usuario();
        usuario.setEstado("Activo");
        usuario.setRol(rol);
        when(sesiones.obtenerUsuario("valid-token")).thenReturn(7);
        when(usuarios.findById(7)).thenReturn(Optional.of(usuario));
        when(permisos.listarClaves(usuario)).thenReturn(List.of("proyectos.ver"));
        mvc.perform(get("/api/roles/mi-permisos")
                        .header("Authorization", "Bearer valid-token").header("X-Usuario-Id", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("Colaborador"))
                .andExpect(jsonPath("$.idRol").value(3))
                .andExpect(jsonPath("$.permisos[0]").value("proyectos.ver"))
                .andExpect(jsonPath("$.superadministrador").value(false));
        verify(usuarios, never()).findById(999);
    }

    @Test
    void rechazaIdentidadSinToken() throws Exception {
        mvc.perform(get("/api/roles/mi-permisos").header("X-Usuario-Id", "7"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(usuarios, permisos);
    }

    @Test
    void rechazaUsuarioInactivo() throws Exception {
        Usuario usuario = new Usuario();
        usuario.setEstado("Inactivo");
        when(sesiones.obtenerUsuario("valid-token")).thenReturn(7);
        when(usuarios.findById(7)).thenReturn(Optional.of(usuario));
        mvc.perform(get("/api/roles/mi-permisos").header("Authorization", "Bearer valid-token"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(permisos);
    }
}
