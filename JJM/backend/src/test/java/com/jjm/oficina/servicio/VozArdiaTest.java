package com.jjm.oficina.servicio;
import org.junit.jupiter.api.*;
import org.springframework.http.*;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class VozArdiaTest {
    final JdbcTemplate jdbc=mock(JdbcTemplate.class);VozArdiaService s;MockRestServiceServer remoto;
    void preparar(String clave){RestClient.Builder b=RestClient.builder();remoto=MockRestServiceServer.bindTo(b).build();s=new VozArdiaService(new MockEnvironment().withProperty("PMO_OPENAI_API_KEY",clave),jdbc,new ObjectMapper(),Clock.fixed(Instant.parse("2026-10-14T02:00:00Z"),ZoneOffset.UTC),b);when(jdbc.update(contains("SET solicitudes=solicitudes+1"),any(Object[].class))).thenReturn(1);}
    @Test void sinClaveInformaConfiguracionSinHacerLlamadas(){preparar("");assertEquals(false,s.configuracion().get("disponible"));assertEquals(503,assertThrows(ResponseStatusException.class,()->s.hablar(7,"Hola")).getStatusCode().value());verifyNoInteractions(jdbc);remoto.verify();}
    @Test void vozUsaHostOficialDevuelveWavYLimitaPorDiaEnMexico(){preparar("clave-de-prueba");String data=Base64.getEncoder().encodeToString("RIFF0000WAVEdatos".getBytes());remoto.expect(requestTo("https://api.openai.com/v1/chat/completions")).andExpect(method(HttpMethod.POST)).andExpect(header("Authorization","Bearer clave-de-prueba")).andExpect(content().string(org.hamcrest.Matchers.containsString("gpt-audio-1.5"))).andRespond(withSuccess("{\"choices\":[{\"message\":{\"audio\":{\"data\":\""+data+"\"}}}]}",MediaType.APPLICATION_JSON));assertEquals("RIFF0000WAVEdatos",new String(s.hablar(7,"Hola, bienvenido.")));verify(jdbc).update(contains("solicitudes<?"),eq(7),eq(LocalDate.of(2026,10,13)),eq(60));remoto.verify();}
    @Test void rechazaAudioInvalidoYNoExponeRespuestaDelProveedor(){preparar("clave-de-prueba");remoto.expect(requestTo("https://api.openai.com/v1/chat/completions")).andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("secret-provider-error clave-de-prueba"));ResponseStatusException e=assertThrows(ResponseStatusException.class,()->s.hablar(7,"Hola"));assertEquals(502,e.getStatusCode().value());assertFalse(e.getReason().contains("clave-de-prueba"));assertFalse(e.getReason().contains("secret-provider"));remoto.verify();}
    @Test void presupuestoAgotadoNoGeneraCostoAdicional(){preparar("clave-de-prueba");when(jdbc.update(contains("SET solicitudes=solicitudes+1"),any(Object[].class))).thenReturn(0);assertEquals(429,assertThrows(ResponseStatusException.class,()->s.hablar(7,"Hola")).getStatusCode().value());remoto.verify();}
    @Test void transcripcionEnviaArchivoConExtensionYDevuelveTexto(){preparar("clave-de-prueba");remoto.expect(requestTo("https://api.openai.com/v1/audio/transcriptions")).andExpect(method(HttpMethod.POST)).andExpect(content().string(org.hamcrest.Matchers.containsString("filename=\"pregunta.webm\""))).andExpect(content().string(org.hamcrest.Matchers.containsString("gpt-transcribe"))).andRespond(withSuccess("{\"text\":\"Cuántas horas tengo\"}",MediaType.APPLICATION_JSON));assertEquals("Cuántas horas tengo",s.transcribir(7,Base64.getEncoder().encodeToString(new byte[]{1,2,3}),"audio/webm;codecs=opus"));remoto.verify();}
    @Test void entradaInvalidaSeRechazaSinProveedor(){preparar("clave-de-prueba");assertThrows(ResponseStatusException.class,()->s.hablar(7,"A".repeat(1201)));assertThrows(ResponseStatusException.class,()->s.transcribir(7,"AAA","text/html"));assertThrows(ResponseStatusException.class,()->s.transcribir(7,"*","audio/webm"));verifyNoInteractions(jdbc);remoto.verify();}
    @Test void falloDeProveedorLiberaConsultaParaReintentar(){preparar("clave-de-prueba");remoto.expect(requestTo("https://api.openai.com/v1/audio/transcriptions")).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));remoto.expect(requestTo("https://api.openai.com/v1/audio/transcriptions")).andRespond(withSuccess("{\"text\":\"Hola\"}",MediaType.APPLICATION_JSON));assertThrows(ResponseStatusException.class,()->s.transcribir(7,"AQID","audio/webm"));assertEquals("Hola",s.transcribir(7,"AQID","audio/webm"));remoto.verify();}
}
