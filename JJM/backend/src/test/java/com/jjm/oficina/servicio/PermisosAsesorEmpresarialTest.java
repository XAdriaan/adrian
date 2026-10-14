package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.Rol;
import com.jjm.oficina.modelo.Usuario;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PermisosAsesorEmpresarialTest {
    private Usuario usuario(String nombre) {
        Rol rol=new Rol();rol.setId(6);rol.setNombre(nombre);
        Usuario u=new Usuario();u.setId(7);u.setEstado("Activo");u.setRol(rol);return u;
    }

    @ParameterizedTest
    @ValueSource(strings={"Asesor Empresarial"," ASESOR EMPRESARIAL ","Asesór   Empresariál","Asesor de Empresa"})
    void normalizaAsesorActivoSinAsignarleAdministracion(String nombre) {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);PermisosService permisos=new PermisosService(jdbc);Usuario u=usuario(nombre);
        assertTrue(PermisosService.esAsesorEmpresarial(u));
        assertTrue(permisos.tienePermiso(u,"proyectos.ver_todos"));
        assertFalse(permisos.esAdministradorBase(u));assertFalse(permisos.esSuperadministrador(u));
        verifyNoInteractions(jdbc);
    }

    @Test void listadoConservaPermisosDeRolYAgregaSoloLecturaGlobal() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);PermisosService permisos=new PermisosService(jdbc);Usuario u=usuario("Asesor Empresarial");
        when(jdbc.queryForList(anyString(),eq(String.class),eq(6))).thenReturn(List.of("dashboard.ver"));
        assertEquals(List.of("dashboard.ver","proyectos.ver_todos"),permisos.listarClaves(u));
        assertFalse(permisos.tienePermiso(u,"roles.gestionar"));
        assertFalse(permisos.tienePermiso(u,"documentos.liberar"));
    }

    @Test void asesorInactivoAcademicoYCuentaSinRolNoTienenAccesoGlobal() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);PermisosService permisos=new PermisosService(jdbc);
        Usuario u=usuario("Asesor Empresarial");u.setEstado("Inactivo");
        assertFalse(PermisosService.esAsesorEmpresarial(u));assertFalse(permisos.tienePermiso(u,"proyectos.ver_todos"));
        assertTrue(permisos.listarClaves(u).isEmpty());
        assertFalse(PermisosService.esAsesorEmpresarial(usuario("Asesor Académico")));
        u.setEstado("Activo");u.setRol(null);assertFalse(PermisosService.esAsesorEmpresarial(u));assertFalse(PermisosService.esAsesorEmpresarial(null));
        verifyNoInteractions(jdbc);
    }
}
