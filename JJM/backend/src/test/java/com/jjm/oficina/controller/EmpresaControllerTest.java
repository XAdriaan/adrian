package com.jjm.oficina.controller;

import com.jjm.oficina.config.*;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import com.jjm.oficina.servicio.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class EmpresaControllerTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final RolRepository roles = mock(RolRepository.class);
    private final OrganizacionRepository organizaciones = mock(OrganizacionRepository.class);
    private final ProyectoRepository proyectos = mock(ProyectoRepository.class);
    private final TareaRepository tareas = mock(TareaRepository.class);
    private final SesionService sesiones = mock(SesionService.class);
    private final BitacoraService bitacora = mock(BitacoraService.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private MockMvc mvc;
    private Usuario usuario;
    private Organizacion empresa;
    private static final String PROYECTO = """
            {"nombre":"Proyecto solicitado","objetivo":"Mejorar la operación","servicio":"soluciones",
             "fechaInicio":"2026-10-10","fechaFin":"2026-12-01","prioridad":"Media"}
            """;

    @BeforeEach
    void preparar() {
        Rol rol = new Rol(); rol.setId(8); rol.setNombre("Empresa");
        usuario = new Usuario(); usuario.setId(7); usuario.setRol(rol); usuario.setEstado("Activo");
        empresa = new Organizacion(); empresa.setId(3); empresa.setNombre("Empresa de prueba");
        when(roles.findByNombre("Empresa")).thenReturn(Optional.of(rol));
        when(usuarios.findById(7)).thenReturn(Optional.of(usuario));
        when(sesiones.obtenerUsuario(null)).thenReturn(null);
        when(sesiones.obtenerUsuario("empresa-token")).thenReturn(7);
        when(organizaciones.findById(3)).thenReturn(Optional.of(empresa));
        when(jdbc.queryForList("SELECT id_organizacion FROM empresa_cuentas WHERE id_usuario = ?",Integer.class,7))
                .thenReturn(List.of(3));
        when(usuarios.saveAndFlush(any())).thenAnswer(inv -> { Usuario u = inv.getArgument(0); u.setId(7); return u; });
        when(organizaciones.saveAndFlush(any())).thenAnswer(inv -> { Organizacion o = inv.getArgument(0); o.setId(3); return o; });
        when(proyectos.saveAndFlush(any())).thenAnswer(inv -> { Proyecto p = inv.getArgument(0); p.setId(5); return p; });
        EmpresaService servicio = new EmpresaService(jdbc,usuarios,roles,organizaciones,proyectos,tareas,encoder,bitacora);
        mvc = MockMvcBuilders.standaloneSetup(new EmpresaController(servicio))
                .addFilters(new AutenticacionTokenFilter(sesiones,new ObjectMapper()),new AccesoEmpresaFilter(usuarios)).build();
    }

    @Test
    void cuentaPublicaSiempreEsEmpresaYLaContrasenaSeAlmacenaCifrada() throws Exception {
        mvc.perform(post("/api/auth/registro-empresa").contentType("application/json").content("""
                {"empresa":"Empresa de prueba","nombre":"Ana","apellido":"López","correo":"ANA@example.invalid",
                 "telefono":"","contrasena":"Clave-prueba-15","rol":"Superadministrador","idOrganizacion":999}
                """)).andExpect(status().isCreated());
        var captor = org.mockito.ArgumentCaptor.forClass(Usuario.class); verify(usuarios).saveAndFlush(captor.capture());
        assertEquals("Empresa",captor.getValue().getRol().getNombre());
        assertEquals("ana@example.invalid",captor.getValue().getCorreo());
        assertTrue(encoder.matches("Clave-prueba-15",captor.getValue().getContrasena()));
        verify(jdbc).update("INSERT INTO empresa_cuentas (id_usuario, id_organizacion) VALUES (?, ?)",7,3);
    }

    @Test
    void correoExistenteNoSeConvierteNiModifica() throws Exception {
        when(usuarios.existsByCorreoIgnoreCase("ana@example.invalid")).thenReturn(true);
        mvc.perform(post("/api/auth/registro-empresa").contentType("application/json").content("""
                {"empresa":"Empresa de prueba","nombre":"Ana","apellido":"López","correo":"ana@example.invalid","contrasena":"Clave-prueba-15"}
                """)).andExpect(status().isConflict());
        verify(usuarios,never()).saveAndFlush(any()); verify(organizaciones,never()).saveAndFlush(any());
    }

    @Test
    void listaSoloLosProyectosDeLaOrganizacionVinculada() throws Exception {
        when(proyectos.findByIdOrganizacionOrderByFechaCreacionDesc(3)).thenReturn(List.of());
        mvc.perform(get("/api/empresas/proyectos").header("Authorization","Bearer empresa-token").header("X-Usuario-Id","999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.empresa.id").value(3));
        verify(usuarios,never()).findById(999);
        verify(proyectos).findByIdOrganizacionOrderByFechaCreacionDesc(3); verify(proyectos,never()).findAll();
    }

    @Test
    void proyectoAjenoNoExponeTareasNiSuExistencia() throws Exception {
        Proyecto ajeno = new Proyecto(); ajeno.setId(99); ajeno.setIdOrganizacion(900);
        when(proyectos.findById(99)).thenReturn(Optional.of(ajeno));
        mvc.perform(get("/api/empresas/proyectos/99").header("Authorization","Bearer empresa-token"))
                .andExpect(status().isNotFound());
        verifyNoInteractions(tareas);
    }

    @Test
    void altaDeProyectoUsaEmpresaDelTokenYNoPermiteAcreditarAvance() throws Exception {
        mvc.perform(post("/api/empresas/proyectos").header("Authorization","Bearer empresa-token")
                .contentType("application/json").content(PROYECTO.replace("\"prioridad\":\"Media\"","\"prioridad\":\"Media\",\"idOrganizacion\":900,\"avance\":100")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.proyecto.estado").value("Propuesto"))
                .andExpect(jsonPath("$.proyecto.avance").value(0));
        var captor = org.mockito.ArgumentCaptor.forClass(Proyecto.class); verify(proyectos).saveAndFlush(captor.capture());
        assertEquals(3,captor.getValue().getIdOrganizacion()); assertNull(captor.getValue().getIdResponsable());
    }

    @Test
    void fechasInvertidasNoGuardanProyecto() throws Exception {
        mvc.perform(post("/api/empresas/proyectos").header("Authorization","Bearer empresa-token")
                .contentType("application/json").content(PROYECTO.replace("2026-12-01","2026-09-01")))
                .andExpect(status().isBadRequest()); verify(proyectos,never()).saveAndFlush(any());
    }

    @Test
    void alumnoNoObtieneAccesoEmpresarialYEmpresaNoObtieneExpedientes() throws Exception {
        mvc.perform(get("/api/documentos-usuario").header("Authorization","Bearer empresa-token"))
                .andExpect(status().isForbidden());
        usuario.getRol().setNombre("Colaborador");
        mvc.perform(get("/api/empresas/proyectos").header("Authorization","Bearer empresa-token"))
                .andExpect(status().isForbidden()); verifyNoInteractions(proyectos);
    }

    @Test
    void cuentaInactivaOTokenAusenteNoPermitenConsultas() throws Exception {
        mvc.perform(get("/api/empresas/proyectos").header("X-Usuario-Id","7"))
                .andExpect(status().isUnauthorized());
        usuario.setEstado("Inactivo");
        mvc.perform(get("/api/empresas/proyectos").header("Authorization","Bearer empresa-token"))
                .andExpect(status().isForbidden()); verifyNoInteractions(proyectos);
    }

    @Test
    void registroIncompletoNoCreaCuentas() throws Exception {
        mvc.perform(post("/api/auth/registro-empresa").contentType("application/json")
                .content("{\"empresa\":\"\",\"correo\":\"no-correo\",\"contrasena\":\"corta\"}"))
                .andExpect(status().isBadRequest()); verify(usuarios,never()).saveAndFlush(any());
    }
}
