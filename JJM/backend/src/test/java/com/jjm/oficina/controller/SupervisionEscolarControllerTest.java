package com.jjm.oficina.controller;

import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import com.jjm.oficina.servicio.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SupervisionEscolarControllerTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final SesionService sesiones = mock(SesionService.class);
    private final PermisosService permisos = new PermisosService(jdbc);
    private final ObjectMapper mapper = new ObjectMapper();

    private Usuario usuario(String nombreRol) {
        Rol rol = new Rol(); rol.setId(21); rol.setNombre(nombreRol);
        Usuario usuario = new Usuario(); usuario.setId(7); usuario.setRol(rol); usuario.setEstado("Activo");
        return usuario;
    }
    private MockMvc mvc(String rol) {
        when(usuarios.findById(7)).thenReturn(Optional.of(usuario(rol)));
        when(sesiones.obtenerUsuario("token-escolar")).thenReturn(7);
        return montar(new SupervisionEscolarController(jdbc, usuarios, permisos, mapper));
    }
    private MockMvc montar(Object controlador) {
        return MockMvcBuilders.standaloneSetup(controlador)
                .addFilters(new AutenticacionTokenFilter(sesiones, mapper)).build();
    }
    private Map<String,Object> alumno(int id, String rol) {
        return Map.of("idUsuario", id, "nombre", "Alumno " + id, "rol", rol);
    }

    @ParameterizedTest
    @ValueSource(strings={"Directivo escolar", "Directivo", "Administrador", "Superadministrador"})
    void consultaAlumnosIncluyePendientesYExcluyePersonalAunqueTengaMatricula(String rol) throws Exception {
        when(jdbc.queryForList(anyString())).thenReturn(List.of(alumno(10,"Colaborador"),
                alumno(11,"Alumno"), Map.of("idUsuario",12,"rol","Asesor Académico","matricula","ABC"),
                alumno(13,"Superadministrador"), alumno(14,"Directivo escolar")));
        mvc(rol).perform(get("/api/supervision-escolar").header("Authorization","Bearer token-escolar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.alumnos.length()").value(2))
                .andExpect(jsonPath("$.alumnos[0].idUsuario").value(10));
    }

    @ParameterizedTest
    @ValueSource(strings={"Colaborador","Asesor Académico","Asesor Empresarial","Cliente","Director","Supervisor"})
    void otrosRolesNoObtienenLosExpedientesEscolares(String rol) throws Exception {
        MockMvc mvc = mvc(rol);
        for (String ruta : List.of("", "/alumnos/10", "/documentos/20")) {
            mvc.perform(get("/api/supervision-escolar" + ruta).header("Authorization","Bearer token-escolar"))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(jdbc);
    }

    @Test
    void noAceptaIdentidadFabricadaSinTokenNiCuentaInactiva() throws Exception {
        MockMvc mvc = mvc("Directivo escolar");
        mvc.perform(get("/api/supervision-escolar").header("X-Usuario-Id","7"))
                .andExpect(status().isUnauthorized());
        Usuario inactivo = usuario("Directivo escolar"); inactivo.setEstado("Inactivo");
        when(usuarios.findById(7)).thenReturn(Optional.of(inactivo));
        mvc.perform(get("/api/supervision-escolar").header("Authorization","Bearer token-escolar"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(jdbc);
    }

    @Test
    void detalleEntregaMetadatosYCertificadosSinContenidoPrivadoDeArchivos() throws Exception {
        when(jdbc.queryForList(contains("WHERE u.id_usuario=?"),eq(10))).thenReturn(List.of(alumno(10,"Colaborador")));
        when(jdbc.queryForList(contains("FROM documentos_usuario WHERE id_usuario=?"),eq(10)))
                .thenReturn(List.of(Map.of("id",20,"nombreArchivo","carta.pdf")));
        when(jdbc.queryForList(contains("SELECT detalle_json AS detalleJson"),eq(10)))
                .thenReturn(List.of(Map.of("detalleJson","[{\"nombreCurso\":\"Curso\",\"nombreArchivo\":\"curso.pdf\",\"completado\":true,\"archivoBase64\":\"privado\"}]")));
        mvc("Directivo escolar").perform(get("/api/supervision-escolar/alumnos/10")
                        .header("Authorization","Bearer token-escolar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.documentos[0].nombreArchivo").value("carta.pdf"))
                .andExpect(jsonPath("$.certificados[0].completado").value(true))
                .andExpect(jsonPath("$.certificados[0].archivoBase64").doesNotExist());
    }

    @Test
    void descargaPdfDelAlumnoConTokenYNoDescargaDocumentosDelPersonal() throws Exception {
        when(jdbc.queryForList(contains("FROM documentos_usuario WHERE id_documento=?"),eq(20)))
                .thenReturn(List.of(Map.of("idUsuario",10,"nombreArchivo","carta.pdf","archivoBase64","data:application/pdf;base64,JVBERi0xLjc=")));
        when(jdbc.queryForList(contains("WHERE u.id_usuario=?"),eq(10))).thenReturn(List.of(alumno(10,"Colaborador")));
        MockMvc mvc = mvc("Directivo escolar");
        mvc.perform(get("/api/supervision-escolar/documentos/20").header("Authorization","Bearer token-escolar")
                        .header("X-Usuario-Id","999"))
                .andExpect(status().isOk()).andExpect(content().contentType("application/pdf"))
                .andExpect(content().bytes("%PDF-1.7".getBytes()))
                .andExpect(header().string("Cache-Control","no-store"));
        when(jdbc.queryForList(contains("WHERE u.id_usuario=?"),eq(10))).thenReturn(List.of(alumno(10,"Administrador")));
        mvc.perform(get("/api/supervision-escolar/documentos/20").header("Authorization","Bearer token-escolar"))
                .andExpect(status().isNotFound());
    }

    @Test
    void datosInexistentesYArchivoInvalidoNoSeAnuncianComoExito() throws Exception {
        MockMvc mvc = mvc("Directivo escolar");
        mvc.perform(get("/api/supervision-escolar/alumnos/404").header("Authorization","Bearer token-escolar"))
                .andExpect(status().isNotFound());
        when(jdbc.queryForList(contains("FROM documentos_usuario WHERE id_documento=?"),eq(20)))
                .thenReturn(List.of(Map.of("idUsuario",10,"nombreArchivo","carta.pdf","archivoBase64","invalido!")));
        when(jdbc.queryForList(contains("WHERE u.id_usuario=?"),eq(10))).thenReturn(List.of(alumno(10,"Colaborador")));
        mvc.perform(get("/api/supervision-escolar/documentos/20").header("Authorization","Bearer token-escolar"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void directivoConservaLecturaSinPermisosParaCambiarRolesOValidarDocumentos() throws Exception {
        Usuario directivo = usuario("Directivo escolar");
        assertEquals(List.of("dashboard.ver","supervision.ver"), permisos.listarClaves(directivo));
        assertTrue(permisos.tienePermiso(directivo,"supervision.ver"));
        assertFalse(permisos.tienePermiso(directivo,"roles.gestionar"));
        assertFalse(permisos.tienePermiso(directivo,"documentos.validar"));
        mvc("Directivo escolar").perform(post("/api/supervision-escolar")
                        .header("Authorization","Bearer token-escolar").contentType("application/json").content("{}"))
                .andExpect(status().isMethodNotAllowed());
        MiembroEquipoRepository miembros = mock(MiembroEquipoRepository.class);
        montar(new MiembroEquipoController(miembros, usuarios, mock(BitacoraService.class)))
                .perform(put("/api/miembros/10").header("Authorization","Bearer token-escolar")
                        .contentType("application/json").content("{\"rol\":\"Superadministrador\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(miembros);
    }
}
