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
    @Test void segundaConexionConservaLaAnterior() {
        String primera=entrar("general",7),segunda=entrar("general",7);
        assertNotEquals(primera,segunda);assertDoesNotThrow(()->video.eventos("general",primera,0,7));
        assertEquals(2,((List<?>)video.eventos("general",segunda,0,7).get("participantes")).size());
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
    @Test void chatSeComparteSoloConMiembrosDeLaMismaSalaYUsaNombreDelServidor() {
        String a=entrar("10",7),b=entrar("10",8),otra=entrar("20",9);
        video.interaccion("10",new VideollamadaController.Interaccion(a,"chat",Map.of("texto","Hola", "nombre","Otra persona")),7);
        List<?> historial=(List<?>)video.eventos("10",b,0,8).get("chat");assertEquals(1,historial.size());
        assertEquals("Persona 7",((Map<?,?>)historial.getFirst()).get("nombre"));
        assertEquals(0,((List<?>)video.eventos("20",otra,0,9).get("chat")).size());
    }
    @Test void chatRechazaConexionAjenaTextoLargoYAbuso() {
        String a=entrar("general",7);entrar("general",8);
        assertThrows(ResponseStatusException.class,()->video.interaccion("general",new VideollamadaController.Interaccion(a,"chat",Map.of("texto","robar")),8));
        assertThrows(ResponseStatusException.class,()->video.interaccion("general",new VideollamadaController.Interaccion(a,"chat",Map.of("texto","x".repeat(2001))),7));
        for(int i=0;i<10;i++)video.interaccion("general",new VideollamadaController.Interaccion(a,"chat",Map.of("texto","hola")),7);
        assertEquals(429,assertThrows(ResponseStatusException.class,()->video.interaccion("general",new VideollamadaController.Interaccion(a,"chat",Map.of("texto","otra")),7)).getStatusCode().value());
    }
    @Test void manoYPantallaSeSincronizanYNoPermiteDosPresentadores() {
        String a=entrar("general",7),b=entrar("general",8);
        Map<String,Object> estado=Map.of("mano",true,"audio",true,"video",true,"pantalla",true);
        video.interaccion("general",new VideollamadaController.Interaccion(a,"estado",estado),7);
        List<?> participantes=(List<?>)video.eventos("general",b,0,8).get("participantes");
        assertEquals(true,((Map<?,?>)participantes.getFirst()).get("mano"));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->video.interaccion("general",new VideollamadaController.Interaccion(b,"estado",estado),8)).getStatusCode().value());
        video.salir("general",new VideollamadaController.Entrada(a),7);video.interaccion("general",new VideollamadaController.Interaccion(b,"estado",estado),8);
    }
    @Test void rechazaEstadosParcialesYReaccionesArbitrarias() {
        String a=entrar("general",7);
        assertThrows(ResponseStatusException.class,()->video.interaccion("general",new VideollamadaController.Interaccion(a,"estado",Map.of("pantalla",true)),7));
        assertThrows(ResponseStatusException.class,()->video.interaccion("general",new VideollamadaController.Interaccion(a,"reaccion",Map.of("emoji","<script>")),7));
    }
    @Test void reaccionYCapturaNotificanSinSubirImagenes() {
        String a=entrar("general",7),b=entrar("general",8);
        video.interaccion("general",new VideollamadaController.Interaccion(a,"reaccion",Map.of("emoji","👍")),7);
        video.interaccion("general",new VideollamadaController.Interaccion(b,"captura",Map.of()),8);
        List<?> eventos=(List<?>)video.eventos("general",a,0,7).get("eventos");assertEquals(2,eventos.size());
        assertEquals(Set.of("nombre"),((Map<?,?>)((Map<?,?>)eventos.get(1)).get("datos")).keySet());
    }
    @Test void reinicioDeConexionSeEnvíaSoloAlParAutorizado() {
        String a=entrar("10",7),b=entrar("10",8),otra=entrar("20",9);
        video.senal("10",new VideollamadaController.Senal(a,b,"reiniciar",Map.of()),7);
        assertEquals(1,((List<?>)video.eventos("10",b,0,8).get("eventos")).size());
        assertThrows(ResponseStatusException.class,()->video.senal("10",new VideollamadaController.Senal(a,otra,"reiniciar",Map.of()),7));
    }

    @Test void dosDispositivosConservanConexionesYElTerceroNoLasSustituye(){
        String a=entrar("general",7),b=entrar("general",7);
        assertNotEquals(a,b);
        assertEquals(2,((List<?>)video.eventos("general",a,0,7).get("participantes")).size());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->entrar("general",7)).getStatusCode().value());
        video.salir("general",new VideollamadaController.Entrada(b),7);
        assertEquals(1,((List<?>)video.eventos("general",a,0,7).get("participantes")).size());
    }
    @Test void tresAvisosEnCincoMinutosYExpulsionSinRecuperacionAutomatica(){
        java.util.concurrent.atomic.AtomicLong tiempo=new java.util.concurrent.atomic.AtomicLong(1_000_000);
        java.time.Clock reloj=new java.time.Clock(){public java.time.ZoneId getZone(){return java.time.ZoneOffset.UTC;}public java.time.Clock withZone(java.time.ZoneId z){return this;}public java.time.Instant instant(){return java.time.Instant.ofEpochMilli(tiempo.get());}};
        video=new VideollamadaController(usuarios,reuniones,entorno,reloj);
        com.jjm.oficina.modelo.Rol rol=new com.jjm.oficina.modelo.Rol();rol.setNombre("Colaborador");usuarios.findById(7).orElseThrow().setRol(rol);
        String a=entrar("general",7);
        for(int i=1;i<=3;i++){
            if(i>1)tiempo.addAndGet(120_000);
            Map<?,?> control=(Map<?,?>)video.eventos("general",a,0,7).get("camaraControl");assertEquals(i,control.get("aviso"));
        }
        tiempo.addAndGet(60_000);
        assertEquals(403,assertThrows(ResponseStatusException.class,()->video.eventos("general",a,0,7)).getStatusCode().value());
        assertEquals(403,assertThrows(ResponseStatusException.class,()->video.eventos("general",a,0,7)).getStatusCode().value());
    }
    @Test void camaraDeUnDispositivoCubreLosDosYNoObligaAlAsesor(){
        com.jjm.oficina.modelo.Rol rol=new com.jjm.oficina.modelo.Rol();rol.setNombre("Colaborador");usuarios.findById(7).orElseThrow().setRol(rol);
        String a=entrar("general",7),b=entrar("general",7),asesor=entrar("general",8);
        video.interaccion("general",new VideollamadaController.Interaccion(b,"estado",Map.of("video",true,"audio",false,"mano",false,"pantalla",false)),7);
        assertEquals(0,((Map<?,?>)video.eventos("general",a,0,7).get("camaraControl")).get("aviso"));
        assertEquals(false,((Map<?,?>)video.eventos("general",asesor,0,8).get("camaraControl")).get("obligatoria"));
    }
}
