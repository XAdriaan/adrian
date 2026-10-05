package com.jjm.oficina.controller;

import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.Rol;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.*;
import com.jjm.oficina.servicio.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

class AuthControllerTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final RolRepository roles = mock(RolRepository.class);
    private final MiembroEquipoRepository miembros = mock(MiembroEquipoRepository.class);
    private final SesionService sesiones = mock(SesionService.class);
    private final CorreoService correo = mock(CorreoService.class);
    private final PermisosService permisos = mock(PermisosService.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private MockMvc mvc;
    private Usuario usuario;

    @BeforeEach
    void preparar() {
        usuario = new Usuario();
        usuario.setId(7);
        usuario.setNombre("Ana");
        usuario.setEstado("Activo");
        usuario.setCorreo("prueba@example.invalid");
        usuario.setContrasena(encoder.encode("clave-de-prueba"));
        Rol rol = new Rol(); rol.setId(3); rol.setNombre("Colaborador"); usuario.setRol(rol);
        when(usuarios.findByCorreoIgnoreCase(usuario.getCorreo())).thenReturn(Optional.of(usuario));
        when(usuarios.findById(7)).thenReturn(Optional.of(usuario));
        when(usuarios.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(sesiones.obtenerUsuario("token-valido")).thenReturn(7);
        when(sesiones.crearSesion(7)).thenReturn("token-valido");
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(
                usuarios, roles, miembros, encoder, sesiones, correo, permisos))
                .addFilters(new AutenticacionTokenFilter(sesiones, new ObjectMapper())).build();
    }

    @Test
    void loginPublicoNormalizaCorreoYDevuelveSesionSinContrasena() throws Exception {
        mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"correo\":\"PRUEBA@example.invalid\",\"contrasena\":\"clave-de-prueba\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.token").value("token-valido"))
                .andExpect(jsonPath("$.usuario.id").value(7))
                .andExpect(jsonPath("$.usuario.contrasena").doesNotExist());
    }

    @Test
    void claveIncorrectaNoCreaSesion() throws Exception {
        mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"correo\":\"prueba@example.invalid\",\"contrasena\":\"incorrecta\"}"))
                .andExpect(status().isUnauthorized());
        verify(sesiones, never()).crearSesion(any());
    }

    @Test
    void perfilActualizaSoloIdentidadDelTokenYSinDividirApellidosCompuestos() throws Exception {
        MiembroEquipo miembro = new MiembroEquipo();
        when(miembros.findByUsuarioId(7)).thenReturn(Optional.of(miembro));
        mvc.perform(put("/api/auth/perfil/nombre").header("Authorization", "Bearer token-valido")
                .header("X-Usuario-Id", "999").contentType("application/json")
                .content("{\"nombre\":\"Ana María\",\"apellidoPaterno\":\"De la Cruz\",\"apellidoMaterno\":\"García\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario.nombreCompleto").value("Ana María De la Cruz García"));
        assertEquals("De la Cruz", usuario.getApellidoPaterno());
        assertEquals("Ana María De la Cruz García", miembro.getNombreCompleto());
        verify(usuarios, never()).findById(999);
        verify(miembros).save(miembro);
    }

    @Test
    void perfilRechazaIdentidadSinTokenYNombreVacio() throws Exception {
        mvc.perform(put("/api/auth/perfil/nombre").header("X-Usuario-Id", "7")
                .contentType("application/json").content("{\"nombre\":\"Ana\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/auth/perfil/nombre").header("Authorization", "Bearer token-valido")
                .contentType("application/json").content("{\"nombre\":\"  \"}"))
                .andExpect(status().isBadRequest());
        verify(usuarios, never()).save(any());
    }

    @Test
    void nombreDemasiadoLargoNoModificaLaEntidad() throws Exception {
        String largo = "a".repeat(100);
        mvc.perform(put("/api/auth/perfil/nombre").header("Authorization", "Bearer token-valido")
                .contentType("application/json")
                .content("{\"nombre\":\"" + largo + "\",\"apellidoPaterno\":\"" + largo + "\"}"))
                .andExpect(status().isBadRequest());
        assertEquals("Ana", usuario.getNombre());
        verify(usuarios, never()).save(any());
    }
}
