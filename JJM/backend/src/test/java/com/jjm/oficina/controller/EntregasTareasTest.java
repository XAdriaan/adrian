package com.jjm.oficina.controller;
import com.jjm.oficina.modelo.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class EntregasTareasTest {
 final JdbcTemplate db=mock(JdbcTemplate.class); final CanalProyectoController canales=mock(CanalProyectoController.class);
 final EntregasTareasController c=new EntregasTareasController(db,canales);
 @Test void rechazaEjecutablesYArchivosGrandes(){assertThrows(ResponseStatusException.class,()->EntregasTareasController.archivo(new EntregasTareasController.Entrada(1,"","x.exe","aG9sYQ==")));assertThrows(ResponseStatusException.class,()->EntregasTareasController.archivo(new EntregasTareasController.Entrada(1,"","x.txt","a".repeat(5592411))));}
 @Test void noEntregaLaTareaDeOtraPersona(){when(db.queryForList(contains("FROM tareas"),eq(3),eq(2))).thenReturn(List.of(Map.of("id_usuario",9)));assertThrows(ResponseStatusException.class,()->c.entregar(2,7,new EntregasTareasController.Entrada(3,"Trabajo",null,null)));verify(db,never()).update(anyString(),any(Object[].class));}
 @Test void evitaEntregaDuplicada(){when(db.queryForList(contains("FROM tareas"),eq(3),eq(2))).thenReturn(List.of(Map.of("id_usuario",7)));when(db.queryForList(contains("SELECT estado"),eq(3),eq(7))).thenReturn(List.of(Map.of("estado","Entregada")));assertThrows(ResponseStatusException.class,()->c.entregar(2,7,new EntregasTareasController.Entrada(3,"Trabajo",null,null)));verify(db,never()).update(anyString(),any(Object[].class));}
 @Test void admiteCorregirDevuelta(){when(db.queryForList(contains("FROM tareas"),eq(3),eq(2))).thenReturn(List.of(Map.of("id_usuario",7)));when(db.queryForList(contains("SELECT estado"),eq(3),eq(7))).thenReturn(List.of(Map.of("estado","Devuelta")));assertEquals("Trabajo entregado. Queda pendiente de revisión.",c.entregar(2,7,new EntregasTareasController.Entrada(3,"Corrección",null,null)).get("mensaje"));verify(db).update(startsWith("INSERT INTO"),eq(2),eq(3),eq(7),eq("Corrección"),isNull(),isNull(),any());}
 @Test void noRevisaColaborador(){when(canales.acceso(2,7)).thenReturn(new Usuario());assertThrows(ResponseStatusException.class,()->c.revisar(2,1L,7,new EntregasTareasController.Revision("Aprobada","")));verifyNoInteractions(db);}
 @Test void noDescargaArchivoAjeno(){when(canales.acceso(2,7)).thenReturn(new Usuario());when(db.queryForList(contains("SELECT id_usuario"),eq(1L),eq(2))).thenReturn(List.of(Map.of("id_usuario",9,"nombre","x.txt","contenido",new byte[]{1})));assertThrows(ResponseStatusException.class,()->c.descargar(2,1L,7));}

 @Test void noAnulaEntregaAjenaORevisada() {
  assertThrows(ResponseStatusException.class,()->c.anular(2,1L,7));
  verify(db).update(contains("AND id_usuario=? AND estado='Entregada'"),eq(1L),eq(2),eq(7));
 }
 @Test void noRevierteAprobacionColaborador() {
  when(canales.acceso(2,7)).thenReturn(new Usuario());
  assertThrows(ResponseStatusException.class,()->c.anularAprobacion(2,1L,7));
  verifyNoInteractions(db);
 }
 @Test void permiteEntregarOtraVersionTrasAnular() {
  when(db.queryForList(contains("FROM tareas"),eq(3),eq(2))).thenReturn(List.of(Map.of("id_usuario",7)));
  when(db.queryForList(contains("SELECT estado"),eq(3),eq(7))).thenReturn(List.of(Map.of("estado","Anulada")));
  assertEquals("Trabajo entregado. Queda pendiente de revisión.",c.entregar(2,7,new EntregasTareasController.Entrada(3,"Trabajo corregido",null,null)).get("mensaje"));
 }
 @Test void aprobarCompletaTareaYRecalculaProyecto() {
  Usuario admin=new Usuario();when(canales.acceso(2,7)).thenReturn(admin);when(canales.admin(admin)).thenReturn(true);
  when(db.update(startsWith("UPDATE pmo_entregas_tareas SET estado=?"),any(Object[].class))).thenReturn(1);
  c.revisar(2,1L,7,new EntregasTareasController.Revision("Aprobada","Correcto"));
  verify(db).update(startsWith("UPDATE tareas SET estado=?"),eq("Completada"),eq(2),eq(1L),eq(2));
  verify(db).update(contains("UPDATE proyectos SET porcentaje_avance="),eq(2),eq(2));
 }
 @Test void anularAprobacionReabreTareaYRecalculaProyecto() {
  Usuario admin=new Usuario();when(canales.acceso(2,7)).thenReturn(admin);when(canales.admin(admin)).thenReturn(true);
  when(db.update(startsWith("UPDATE pmo_entregas_tareas SET estado='Entregada'"),eq(1L),eq(2),eq(7))).thenReturn(1);
  c.anularAprobacion(2,1L,7);
  verify(db).update(startsWith("UPDATE tareas SET estado=?"),eq("En progreso"),eq(2),eq(1L),eq(2));
  verify(db).update(contains("UPDATE proyectos SET porcentaje_avance="),eq(2),eq(2));
 }
}