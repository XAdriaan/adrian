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
}
