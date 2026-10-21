package com.jjm.oficina.servicio;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
class PlanIaLocalTest {
 final ObjectMapper json=new ObjectMapper();
 final String plan="""
 {"objetivo":"Preparar inventario","tareas":[{"titulo":"Diseñar inventario","descripcion":"Definir entradas y salidas","entregable":"Modelo","criterioAceptacion":"Validado con responsable","horasEstimadas":8}],"riesgos":["Confirmar reglas"]}
 """;
 @Test void usaSoloServidorLocalYValidaPropuesta(){
  var b=RestClient.builder();var remoto=MockRestServiceServer.bindTo(b).build();
  var s=new PlanIaLocalService(new MockEnvironment().withProperty("PMO_IA_LOCAL_URL","http://ollama:11434"),json,b);
  remoto.expect(requestTo("http://ollama:11434/api/chat")).andExpect(content().string(org.hamcrest.Matchers.containsString("qwen2.5:7b")))
    .andRespond(withSuccess(json.writeValueAsString(Map.of("done",true,"done_reason","stop","message",Map.of("content",plan))),MediaType.APPLICATION_JSON));
  assertEquals(8,s.proponer("Inventario","Proyecto local","Planear el inventario inicial").tareas().getFirst().horasEstimadas());remoto.verify();
 }
 @Test void rechazaHorasInvalidasYRespuestaIncompleta(){
  var b=RestClient.builder();MockRestServiceServer.bindTo(b).build();var s=new PlanIaLocalService(new MockEnvironment(),json,b);
  assertThrows(ResponseStatusException.class,()->s.validar(plan.replace("\"horasEstimadas\":8","\"horasEstimadas\":-4")));
  assertThrows(ResponseStatusException.class,()->s.validar("{\"tareas\":[]}"));
  assertThrows(ResponseStatusException.class,()->s.proponer("Proyecto","","Quiero preparar un proyecto"));
 }
 @Test void falloDelMotorLiberaCapacidadParaReintentar(){
  var b=RestClient.builder();var remoto=MockRestServiceServer.bindTo(b).build();var s=new PlanIaLocalService(new MockEnvironment().withProperty("PMO_IA_LOCAL_URL","http://ollama:11434"),json,b);
  remoto.expect(requestTo("http://ollama:11434/api/chat")).andRespond(withServerError());
  remoto.expect(requestTo("http://ollama:11434/api/chat")).andRespond(withSuccess(json.writeValueAsString(Map.of("done",true,"message",Map.of("content",plan))),MediaType.APPLICATION_JSON));
  assertEquals(502,assertThrows(ResponseStatusException.class,()->s.proponer("Proyecto","","Planear las tareas iniciales")).getStatusCode().value());
  assertEquals(1,s.proponer("Proyecto","","Planear las tareas iniciales").tareas().size());remoto.verify();
 }

 @Test void ayudaLibreUsaOllamaYRechazaTextoIncompleto(){
  var b=RestClient.builder();var remoto=MockRestServiceServer.bindTo(b).build();var s=new PlanIaLocalService(new MockEnvironment().withProperty("PMO_IA_LOCAL_URL","http://ollama:11434"),json,b);
  remoto.expect(requestTo("http://ollama:11434/api/chat")).andExpect(content().string(org.hamcrest.Matchers.containsString("no el audio"))).andRespond(withSuccess(json.writeValueAsString(Map.of("done",true,"message",Map.of("content","Resumen de acuerdos"))),MediaType.APPLICATION_JSON));
  remoto.expect(requestTo("http://ollama:11434/api/chat")).andRespond(withSuccess(json.writeValueAsString(Map.of("done",false,"message",Map.of("content","Parcial"))),MediaType.APPLICATION_JSON));
  assertEquals("Resumen de acuerdos",s.asistir("reunion","Resume el chat","Alumno: presentar diseño").get("respuesta"));
  assertThrows(ResponseStatusException.class,()->s.asistir("reporte","Redacta mi actividad",""));remoto.verify();
 }
}
