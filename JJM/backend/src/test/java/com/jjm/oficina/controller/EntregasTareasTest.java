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
}
