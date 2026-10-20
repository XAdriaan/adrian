package com.jjm.oficina.controller;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.jjm.oficina.repositorio.ProyectoRepository;
import com.jjm.oficina.servicio.PlanIaLocalService;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class PlanIaLocalControllerTest {
 @Test void noLlamaAlModeloSinPermisoDelProyecto(){
  var canales=mock(CanalProyectoController.class);var proyectos=mock(ProyectoRepository.class);var ia=mock(PlanIaLocalService.class);
  when(canales.canal(2,7)).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
  var c=new PlanIaLocalController(canales,proyectos,ia);
  assertThrows(ResponseStatusException.class,()->c.generar(2,7,new PlanIaLocalController.Solicitud("Planear las tareas iniciales")));
  verifyNoInteractions(ia,proyectos);
 }
}
