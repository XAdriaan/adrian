package com.jjm.oficina.controller;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.PlanIaLocalService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class AsistenteLocalTest {
 @Test void rechazaCuentaInactiva(){var u=mock(UsuarioRepository.class);var v=mock(VideollamadaController.class);var ia=mock(PlanIaLocalService.class);when(u.findById(7)).thenReturn(Optional.empty());var c=new AsistenteLocalController(u,v,ia);assertThrows(ResponseStatusException.class,()->c.responder(7,new AsistenteLocalController.Solicitud("asistente","hola",null,null)));verifyNoInteractions(v,ia);}
 @Test void noEntregaChatAjenoAlModelo(){var u=mock(UsuarioRepository.class);var v=mock(VideollamadaController.class);var ia=mock(PlanIaLocalService.class);Usuario persona=new Usuario();persona.setEstado("Activo");when(u.findById(7)).thenReturn(Optional.of(persona));when(v.contextoChat("8","ajena",7)).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));var c=new AsistenteLocalController(u,v,ia);assertThrows(ResponseStatusException.class,()->c.responder(7,new AsistenteLocalController.Solicitud("reunion","resume","8","ajena")));verifyNoInteractions(ia);}
 @Test void revalidaAccesoAntesDeEntregarElResumen(){var u=mock(UsuarioRepository.class);var v=mock(VideollamadaController.class);var ia=mock(PlanIaLocalService.class);Usuario persona=new Usuario();persona.setEstado("Activo");when(u.findById(7)).thenReturn(Optional.of(persona));when(v.contextoChat("8","propia",7)).thenReturn("Chat autorizado").thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));when(ia.asistir("reunion","resume","Chat autorizado")).thenReturn(Map.of("respuesta","Resumen"));var c=new AsistenteLocalController(u,v,ia);assertThrows(ResponseStatusException.class,()->c.responder(7,new AsistenteLocalController.Solicitud("reunion","resume","8","propia")));}
 @Test void consultaAsincronaNoSeComparteEntreUsuarios() throws Exception {
 var u=mock(UsuarioRepository.class);var v=mock(VideollamadaController.class);var ia=mock(PlanIaLocalService.class);Usuario persona=new Usuario();persona.setEstado("Activo");when(u.findById(7)).thenReturn(Optional.of(persona));when(u.findById(8)).thenReturn(Optional.of(persona));when(ia.asistir("asistente","hola","")).thenReturn(Map.of("respuesta","Borrador","aviso","Revisar"));var c=new AsistenteLocalController(u,v,ia);
 try{String id=c.iniciar(7,new AsistenteLocalController.Solicitud("asistente","hola",null,null)).get("id");assertEquals(404,assertThrows(ResponseStatusException.class,()->c.estado(8,id)).getStatusCode().value());verify(ia,timeout(2000)).asistir("asistente","hola","");assertTimeoutPreemptively(java.time.Duration.ofSeconds(2),()->{while(!"listo".equals(c.estado(7,id).get("estado")))Thread.sleep(1);});assertEquals("Borrador",c.estado(7,id).get("respuesta"));}finally{c.cerrar();}
 }
}
