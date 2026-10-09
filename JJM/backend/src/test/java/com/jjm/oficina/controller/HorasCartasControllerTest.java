package com.jjm.oficina.controller;

import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import com.jjm.oficina.servicio.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class HorasCartasControllerTest {
    private final UsuarioRepository usuarios=mock(UsuarioRepository.class);
    private final SesionService sesiones=mock(SesionService.class);
    private final AsistenciaAutomaticaService asistencia=mock(AsistenciaAutomaticaService.class);
    private final RegistroHorasRepository registros=mock(RegistroHorasRepository.class);
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private Usuario usuario;
    private MockMvc mvc;
    @BeforeEach void preparar(){
        usuario=new Usuario();usuario.setId(7);usuario.setEstado("Activo");
        Rol rol=new Rol();rol.setNombre("Colaborador");usuario.setRol(rol);
        when(usuarios.findById(7)).thenReturn(Optional.of(usuario));
        when(sesiones.obtenerUsuario("token")).thenReturn(7);
        when(sesiones.obtenerUsuario(null)).thenReturn(null);
        mvc=MockMvcBuilders.standaloneSetup(new AsistenciaAutomaticaController(asistencia),
            new RegistroHorasController(registros,mock(MiembroEquipoRepository.class),mock(MiembroProyectoRepository.class),
                mock(ProyectoRepository.class),mock(TareaRepository.class),usuarios,mock(BitacoraService.class)),
            new DocumentoUsuarioController(jdbc,usuarios,new ObjectMapper(),mock(CorreoService.class)))
            .addFilters(new AutenticacionTokenFilter(sesiones,new ObjectMapper())).build();
    }
    @Test void presenciaIgnoraCabeceraFalsaYRequiereTokenYPaginaValida() throws Exception{
        when(asistencia.actualizar(7,true,"pagina-prueba",false)).thenReturn(Map.of("segundos",10));
        mvc.perform(post("/api/asistencia-automatica/presencia").header("Authorization","Bearer token")
            .header("X-Usuario-Id","999").contentType("application/json").content("{\"pagina\":\"pagina-prueba\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.segundos").value(10));
        verify(asistencia).actualizar(7,true,"pagina-prueba",false);
        mvc.perform(post("/api/asistencia-automatica/presencia").header("X-Usuario-Id","999")
            .contentType("application/json").content("{\"pagina\":\"pagina-prueba\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/asistencia-automatica/presencia").header("Authorization","Bearer token")
            .contentType("application/json").content("{\"pagina\":\"invalida=999\"}")).andExpect(status().isBadRequest());
    }
    @Test void alumnoNoPuedeCrearHorasManualesNiCambiarLaAsistenciaAutomatica() throws Exception{
        for(String ruta:List.of("/api/registros-horas","/api/registros-horas/check-in","/api/registros-horas/check-out")){
            mvc.perform(post(ruta).header("Authorization","Bearer token").contentType("application/json").content("{}"))
                .andExpect(status().isConflict());
        }
        verify(registros,never()).save(any());
    }
    @Test void reintentoDeCartaDelMismoPeriodoDevuelveDocumentoSinInsertarOtro() throws Exception{
        usuario.getRol().setNombre("Superadministrador");when(usuarios.existsById(10)).thenReturn(true);
        when(jdbc.queryForList(contains("SELECT id_documento AS id"),eq(10),eq("Carta de término"),eq("2026-05-01"),eq("2026-08-31")))
            .thenReturn(List.of(Map.of("id",99)));
        when(jdbc.queryForMap(anyString(),eq(99))).thenReturn(Map.of("id",99,"estado","Liberada"));
        mvc.perform(post("/api/documentos").header("Authorization","Bearer token").contentType("application/json")
            .content("{\"idUsuario\":10,\"tipoDocumento\":\"Carta de término\",\"nombreArchivo\":\"carta.pdf\",\"archivoBase64\":\"pdf\",\"generadoAutomaticamente\":true,\"datosAcademicos\":{\"fechaInicio\":\"2026-05-01\",\"fechaFin\":\"2026-08-31\"}}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.yaExistente").value(true)).andExpect(jsonPath("$.documento.id").value(99));
        verify(jdbc,never()).update(contains("INSERT INTO documentos_usuario"),any(Object[].class));
    }
    @Test void profesorSinRolAdministrativoNoPuedeLiberarCartasAOtros() throws Exception{
        usuario.getRol().setNombre("Directivo escolar");
        mvc.perform(post("/api/documentos").header("Authorization","Bearer token").contentType("application/json")
            .content("{\"idUsuario\":10,\"generadoAutomaticamente\":true}"))
            .andExpect(status().isForbidden());verifyNoInteractions(jdbc);
    }
}
