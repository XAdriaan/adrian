package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.PermisosService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class DualControllerTest {
    JdbcTemplate db; UsuarioRepository usuarios; PermisosService permisos; DualController controller; Usuario alumno,admin;
    @BeforeEach void preparar(){
        db=mock(JdbcTemplate.class);usuarios=mock(UsuarioRepository.class);permisos=mock(PermisosService.class);
        controller=new DualController(db,usuarios,permisos);
        alumno=new Usuario();alumno.setId(7);alumno.setEstado("Activo");admin=new Usuario();admin.setId(1);admin.setEstado("Activo");
        when(usuarios.findById(7)).thenReturn(Optional.of(alumno));when(usuarios.findById(1)).thenReturn(Optional.of(admin));when(permisos.esSuperadministrador(admin)).thenReturn(true);
    }
    DualController.Entrada entrada(String inicio,String fin,int meta,String entrada,String salida){return new DualController.Entrada(7,3,"Fundación","Empresa","REF-01","UPT","TI","2026","6","123",inicio,fin,meta,entrada,salida,null,null,"Materia","Activo");}
    @Test void rechazaFechasYHorariosInvertidos(){
        assertThrows(ResponseStatusException.class,()->DualController.validarPeriodo(entrada("2026-11-30","2026-10-01",600,"07:00","17:00")));
        assertThrows(ResponseStatusException.class,()->DualController.validarPeriodo(entrada("2026-10-01","2026-11-30",600,"17:00","07:00")));
        assertThrows(ResponseStatusException.class,()->DualController.validarPeriodo(entrada("2026-10-01","2026-11-30",0,"07:00","17:00")));
        assertDoesNotThrow(()->DualController.validarPeriodo(entrada("2026-10-01","2026-11-30",600,"07:00","17:00")));
    }
    @Test void alumnoNoPuedeVerOtroExpedienteNiDocumentos(){
        when(db.queryForList("SELECT * FROM pmo_dual WHERE id=?",9L)).thenReturn(List.of(Map.of("alumno",8)));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->controller.detalle(9,7,"2026-11")).getStatusCode().value());
        assertEquals(403,assertThrows(ResponseStatusException.class,()->controller.descargar(9,4,7)).getStatusCode().value());
        verify(db,never()).queryForList(contains("SELECT contenido"),any(Object[].class));
    }
    @Test void alumnoNoPuedeCrearNiAccederCatalogo(){
        assertThrows(ResponseStatusException.class,()->controller.opciones(7));
        assertThrows(ResponseStatusException.class,()->controller.crear(7,entrada("2026-10-01","2026-11-30",600,"07:00","17:00")));
        verifyNoInteractions(db);
    }
    @Test void noPermiteProyectoSinAsignacion(){
        var ex=assertThrows(ResponseStatusException.class,()->controller.crear(1,entrada("2026-10-01","2026-11-30",600,"07:00","17:00")));
        assertEquals(400,ex.getStatusCode().value());
        verify(db,never()).update(anyString(),any(Object[].class));
    }
    @Test void asesorAsignadoPuedeConsultarYAjenoNo(){
        when(db.queryForList("SELECT * FROM pmo_dual WHERE id=?",9L)).thenReturn(List.of(Map.of("alumno",8,"asesor_empresa",7)));
        assertDoesNotThrow(()->controller.acceso(9,alumno));
        when(db.queryForList("SELECT * FROM pmo_dual WHERE id=?",9L)).thenReturn(List.of(Map.of("alumno",8,"asesor_empresa",6)));
        assertThrows(ResponseStatusException.class,()->controller.acceso(9,alumno));
    }
    @Test void horasSoloAprobadasDelPeriodoYListaLimitada(){
        controller.lista(7);
        verify(db).queryForList(argThat(sql->sql.contains("h.estado_validacion='Aprobado'")&&sql.contains("h.fecha BETWEEN d.inicio AND d.fin")&&sql.contains("WHERE d.alumno=? OR d.asesor_empresa=? OR d.asesor_universidad=?")),eq(7),eq(7),eq(7));
    }
    @Test void pdfNoSeAceptaPorExtensionSolamente(){
        when(db.queryForList("SELECT * FROM pmo_dual WHERE id=?",9L)).thenReturn(List.of(Map.of("alumno",7)));
        assertThrows(ResponseStatusException.class,()->controller.subir(9,1,new DualController.Documento("convenio.pdf",Base64.getEncoder().encodeToString("<html>mal</html>".getBytes()))));
        verify(db,never()).update(anyString(),any(Object[].class));
    }
    @Test void alumnoPuedeGuardarSeguimientoPropio(){
        when(db.queryForList("SELECT * FROM pmo_dual WHERE id=?",9L)).thenReturn(List.of(Map.of("alumno",7)));
        controller.nota(9,7,new DualController.Nota("Materia","Entregué la actividad de bases de datos."));
        verify(db).update(contains("INSERT INTO pmo_dual_notas"),eq(9L),eq(7),eq("Materia"),eq("Entregué la actividad de bases de datos."));
    }
    @Test void editarNoTransfiereDocumentosDeOtroAlumno(){
        when(db.queryForList("SELECT * FROM pmo_dual WHERE id=?",9L)).thenReturn(List.of(Map.of("alumno",8,"proyecto",3)));
        assertEquals(400,assertThrows(ResponseStatusException.class,()->controller.editar(9,1,entrada("2026-10-01","2026-11-30",600,"07:00","17:00"))).getStatusCode().value());
        verify(db,never()).update(anyString(),any(Object[].class));
    }
}
