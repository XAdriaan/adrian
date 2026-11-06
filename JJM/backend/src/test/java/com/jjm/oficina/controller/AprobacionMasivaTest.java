package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import com.jjm.oficina.servicio.BitacoraService;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AprobacionMasivaTest {
    final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    final RegistroHorasRepository registros = mock(RegistroHorasRepository.class);
    final BitacoraService bitacora = mock(BitacoraService.class);
    final RegistroHorasController api = new RegistroHorasController(registros,null,null,null,null,usuarios,bitacora);

    Usuario usuario(String rol) {
        Usuario usuario=new Usuario(); usuario.setId(4); usuario.setEstado("Activo");
        Rol r=new Rol(); r.setNombre(rol); usuario.setRol(r);
        when(usuarios.findById(4)).thenReturn(Optional.of(usuario)); return usuario;
    }

    @Test void colaboradorNoPuedeAprobarPorLote() {
        usuario("Colaborador");
        assertEquals(403,api.aprobarPendientes(4,List.of(1)).getStatusCode().value());
        verifyNoInteractions(registros,bitacora);
    }

    @Test void apruebaUnaVezYContabilizaSoloLosPendientesConfirmados() {
        usuario("Administrador");
        RegistroHoras r=new RegistroHoras(); r.setId(7); r.setEstadoValidacion("Pendiente"); r.setHorasTrabajadas(new BigDecimal("3.25"));
        when(registros.pendientesParaAprobar(List.of(7,8))).thenReturn(List.of(r)).thenReturn(List.of());
        when(registros.save(r)).thenReturn(r);
        var resultado=api.aprobarPendientes(4,List.of(8,7,7)).getBody();
        assertEquals(1,resultado.get("aprobados")); assertEquals(1,resultado.get("omitidos"));
        assertEquals(new BigDecimal("3.25"),resultado.get("horas"));
        assertEquals("Aprobado",r.getEstadoValidacion()); assertEquals(4,r.getIdUsuarioValidador());
        assertEquals(0,api.aprobarPendientes(4,List.of(7,8)).getBody().get("aprobados"));
        verify(registros,times(1)).save(r);
    }
}