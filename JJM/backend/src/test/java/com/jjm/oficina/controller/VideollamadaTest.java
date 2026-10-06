package com.jjm.oficina.controller;

import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.SesionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class VideollamadaTest {
    private final UsuarioRepository usuarios=mock(UsuarioRepository.class);
    private final ReunionController reuniones=mock(ReunionController.class);
    private final SesionService sesiones=mock(SesionService.class);
    private final MockEnvironment entorno=new MockEnvironment();
    private VideollamadaController video; private MockMvc mvc;
    private final Map<String,Object> offer=Map.of("sdp","v=0\r\nprueba", "type","offer");
    @BeforeEach void preparar() {
        for(int id:List.of(7,8,9)) { Usuario u=new Usuario();u.setId(id);u.setEstado("Activo");u.setNombre("Persona "+id);when(usuarios.findById(id)).thenReturn(Optional.of(u)); }
        when(reuniones.puedeAccederVideollamada(7,10L)).thenReturn(true);
        when(reuniones.puedeAccederVideollamada(8,10L)).thenReturn(true);
        when(reuniones.puedeAccederVideollamada(9,20L)).thenReturn(true);
        when(sesiones.obtenerUsuario(null)).thenReturn(null);when(sesiones.obtenerUsuario("token7")).thenReturn(7);
        video=new VideollamadaController(usuarios,reuniones,entorno);
        mvc=MockMvcBuilders.standaloneSetup(video).addFilters(new AutenticacionTokenFilter(sesiones,new ObjectMapper())).build();
    }
    private String entrar(String sala,int usuario) {return (String)video.entrar(sala,usuario).get("conexion");}
    @Test void generalPermiteUsuariosActivosSinAsignacion() {
        String a=entrar("general",7),b=entrar("general",9);
        assertEquals(2,((List<?>)video.eventos("general",a,0,7).get("participantes")).size());
        verifyNoInteractions(reuniones);
    }
    @Test void requiereTokenYNoAceptaCabeceraFalsificada() throws Exception {
        mvc.perform(post("/api/videollamadas/general/entrar").header("X-Usuario-Id","7")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/videollamadas/general/entrar").header("Authorization","Bearer token7").header("X-Usuario-Id","999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.participantes[0].nombre").value("Persona 7"));
        verify(usuarios,never()).findById(999);
    }
    @Test void bloqueaSalaDeProyectoAUsuarioAjeno() {
        assertEquals(403,assertThrows(ResponseStatusException.class,()->entrar("10",9)).getStatusCode().value());
    }
    @Test void enviaSDPSoloAlDestinatarioDentroDeLaSala() {
        String a=entrar("10",7),b=entrar("10",8),c=entrar("20",9);
        video.senal("10",new VideollamadaController.Senal(a,b,"offer",offer),7);
        assertEquals(1,((List<?>)video.eventos("10",b,0,8).get("eventos")).size());
        assertEquals(0,((List<?>)video.eventos("10",a,0,7).get("eventos")).size());
        assertEquals(0,((List<?>)video.eventos("20",c,0,9).get("eventos")).size());
        assertThrows(ResponseStatusException.class,()->video.senal("10",new VideollamadaController.Senal(a,c,"offer",offer),7));
    }
    @Test void noPermiteRobarConexionNiSalirPorOtraPersona() {
        String a=entrar("general",7),b=entrar("general",8);
        assertThrows(ResponseStatusException.class,()->video.eventos("general",a,0,8));
        assertThrows(ResponseStatusException.class,()->video.senal("general",new VideollamadaController.Senal(a,b,"offer",offer),8));
        video.salir("general",new VideollamadaController.Entrada(a),8);
        assertEquals(2,((List<?>)video.eventos("general",a,0,7).get("participantes")).size());
    }
    @Test void retiraAccesoAlCambiarAsignacion() {
        String a=entrar("10",7),b=entrar("10",8);
        when(reuniones.puedeAccederVideollamada(8,10L)).thenReturn(false);
        assertEquals(403,assertThrows(ResponseStatusException.class,()->video.eventos("10",b,0,8)).getStatusCode().value());
        assertEquals(1,((List<?>)video.eventos("10",a,0,7).get("participantes")).size());
    }
    @Test void rechazaCuentaDesactivadaYSalaInvalida() {
        usuarios.findById(7).orElseThrow().setEstado("Inactivo");
        assertThrows(ResponseStatusException.class,()->entrar("general",7));
        assertThrows(ResponseStatusException.class,()->entrar("otro",8));
    }
    @Test void segundaPestanaSustituyeConexionAnterior() {
        String primera=entrar("general",7),segunda=entrar("general",7);
        assertNotEquals(primera,segunda);assertThrows(ResponseStatusException.class,()->video.eventos("general",primera,0,7));
        assertEquals(1,((List<?>)video.eventos("general",segunda,0,7).get("participantes")).size());
    }
    @Test void acuseNoRepiteSenalesYRechazaContenidoInvalido() {
        String a=entrar("general",7),b=entrar("general",8);
        video.senal("general",new VideollamadaController.Senal(a,b,"offer",offer),7);
        assertEquals(0,((List<?>)video.eventos("general",b,1,8).get("eventos")).size());
        assertThrows(ResponseStatusException.class,()->video.senal("general",new VideollamadaController.Senal(a,b,"otro",offer),7));
        assertThrows(ResponseStatusException.class,()->video.senal("general",new VideollamadaController.Senal(a,b,"offer",Map.of("sdp","x".repeat(100001))),7));
    }
    @Test void configuracionRelayEsAutenticadaYOpcional() throws Exception {
        mvc.perform(get("/api/videollamadas/configuracion")).andExpect(status().isUnauthorized());
        assertEquals(false,video.configuracion(7).get("relayDisponible"));
        entorno.setProperty("PMO_TURN_URLS","turn:relay.example.invalid:3478");
        entorno.setProperty("PMO_TURN_USERNAME","prueba"); entorno.setProperty("PMO_TURN_CREDENTIAL","solo-prueba");
        assertEquals(true,video.configuracion(7).get("relayDisponible"));
    }
}
