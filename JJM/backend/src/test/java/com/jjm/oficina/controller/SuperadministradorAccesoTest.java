package com.jjm.oficina.controller;

import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.Rol;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.*;
import com.jjm.oficina.servicio.BitacoraService;
import com.jjm.oficina.servicio.CatalogoProyectosSepDic2026Service;
import com.jjm.oficina.servicio.CorreoService;
import com.jjm.oficina.servicio.SesionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SuperadministradorAccesoTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final MiembroEquipoRepository miembros = mock(MiembroEquipoRepository.class);
    private final ProyectoRepository proyectos = mock(ProyectoRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final SesionService sesiones = mock(SesionService.class);

    private MockMvc mvc(Object controller, String nombreRol) {
        Rol rol = new Rol(); rol.setNombre(nombreRol);
        Usuario usuario = new Usuario(); usuario.setId(7); usuario.setEstado("Activo"); usuario.setRol(rol);
        when(sesiones.obtenerUsuario("sesion-roles")).thenReturn(7);
        when(sesiones.obtenerUsuario(null)).thenReturn(null);
        when(usuarios.findById(7)).thenReturn(Optional.of(usuario));
        return MockMvcBuilders.standaloneSetup(controller)
                .addFilters(new AutenticacionTokenFilter(sesiones, new ObjectMapper())).build();
    }

    private ProyectoController proyectosController() {
        return new ProyectoController(proyectos, mock(OrganizacionRepository.class), miembros,
                mock(MiembroProyectoRepository.class), mock(FaseProyectoRepository.class), usuarios,
                mock(BitacoraService.class), mock(CatalogoProyectosSepDic2026Service.class));
    }

    private MiembroEquipoController equipoController() {
        return new MiembroEquipoController(miembros, usuarios, mock(BitacoraService.class));
    }

    private DocumentoUsuarioController documentosController() {
        return new DocumentoUsuarioController(jdbc, usuarios, new ObjectMapper(), mock(CorreoService.class));
    }

    private ProgresoCursosController cursosController() {
        return new ProgresoCursosController(jdbc, usuarios, new ObjectMapper());
    }

    @ParameterizedTest
    @ValueSource(strings = {"Superadministrador", "Administrador"})
    void ambosRolesAdministrativosConsultanProyectosEquipoDocumentosYCursos(String rol) throws Exception {
        mvc(proyectosController(), rol).perform(get("/api/proyectos")
                        .header("Authorization", "Bearer sesion-roles"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tipoAcceso").value("administrador"));
        verify(proyectos).findAll(any(Sort.class));
        verify(miembros, never()).findByUsuarioId(anyInt());

        mvc(equipoController(), rol).perform(get("/api/miembros")
                        .header("Authorization", "Bearer sesion-roles"))
                .andExpect(status().isOk());
        verify(miembros).findAll(any(Sort.class));

        mvc(documentosController(), rol).perform(get("/api/documentos")
                        .header("Authorization", "Bearer sesion-roles"))
                .andExpect(status().isOk());
        verify(jdbc).queryForList(argThat((String sql) -> !sql.contains("WHERE d.id_usuario=?")));

        mvc(cursosController(), rol).perform(get("/api/cursos/progreso")
                        .header("Authorization", "Bearer sesion-roles"))
                .andExpect(status().isOk());
        verify(jdbc).queryForList(contains("FROM progreso_cursos_usuario"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Colaborador", "Asesor Empresarial", "Asesor Académico"})
    void asesoresYColaboradoresConservanSuAlcanceSinAccesoAdministrativo(String rol) throws Exception {
        mvc(proyectosController(), rol).perform(get("/api/proyectos")
                        .header("Authorization", "Bearer sesion-roles"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tipoAcceso").value("proyectos_asignados"));
        verify(proyectos, never()).findAll(any(Sort.class));

        mvc(equipoController(), rol).perform(get("/api/miembros")
                        .header("Authorization", "Bearer sesion-roles"))
                .andExpect(status().isForbidden());
        verify(miembros, never()).findAll(any(Sort.class));

        mvc(documentosController(), rol).perform(get("/api/documentos")
                        .header("Authorization", "Bearer sesion-roles"))
                .andExpect(status().isOk());
        verify(jdbc).queryForList(contains("WHERE d.id_usuario=?"), eq(7));

        mvc(cursosController(), rol).perform(get("/api/cursos/progreso")
                        .header("Authorization", "Bearer sesion-roles"))
                .andExpect(status().isForbidden());
        verify(jdbc, never()).queryForList(contains("FROM progreso_cursos_usuario"));
    }

    @Test
    void unaCabeceraSinTokenNoPermiteConsultasAdministrativas() throws Exception {
        Object[][] consultas = {{proyectosController(), "/api/proyectos"},
                {equipoController(), "/api/miembros"}, {documentosController(), "/api/documentos"},
                {cursosController(), "/api/cursos/progreso"}};
        for (Object[] consulta : consultas) {
            mvc(consulta[0], "Superadministrador").perform(get((String) consulta[1]).header("X-Usuario-Id", "7"))
                    .andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(usuarios, miembros, proyectos, jdbc);
    }
}
