package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GrabacionTest {
    static class TempLocal implements org.junit.jupiter.api.io.TempDirFactory {
        public Path createTempDirectory(org.junit.jupiter.api.extension.AnnotatedElementContext a,org.junit.jupiter.api.extension.ExtensionContext e) throws java.io.IOException {
            Path raiz=Path.of("target","pruebas-grabaciones").toAbsolutePath().normalize();Files.createDirectories(raiz);
            return Files.createTempDirectory(raiz,"caso-");
        }
    }
    @TempDir(factory=TempLocal.class) Path carpeta;
    UsuarioRepository usuarios;ReunionController reuniones;GrabacionController api;MockEnvironment entorno;
    final byte[] webm={0x1a,0x45,(byte)0xdf,(byte)0xa3,3,4,5};
    @BeforeEach void preparar() throws Exception {
        usuarios=mock(UsuarioRepository.class);reuniones=mock(ReunionController.class);
        for(int id:List.of(7,8)){Usuario u=new Usuario();u.setId(id);u.setEstado("Activo");when(usuarios.findById(id)).thenReturn(Optional.of(u));}
        entorno=new MockEnvironment().withProperty("PMO_RECORDINGS_DIR",carpeta.toString());api=new GrabacionController(usuarios,reuniones,entorno);
    }
    String inicio(String sala) throws Exception{return (String)api.iniciar(new GrabacionController.Inicio(sala,"Reunión de prueba"),7).get("id");}
    String guardar(String sala) throws Exception{String id=inicio(sala);api.parte(id,0,webm,7);api.finalizar(id,new GrabacionController.Fin(72),7);return id;}
    void estado(int esperado,org.junit.jupiter.api.function.Executable f){assertEquals(esperado,assertThrows(ResponseStatusException.class,f).getStatusCode().value());}
    @Test void requiereSesionYNoPermiteSalaAjena() {
        estado(401,()->api.listar(null,null));estado(403,()->api.iniciar(new GrabacionController.Inicio("9","Privada"),7));
    }
    @Test void guardaYRecuperaTrasReinicioSinBaseDeDatos() throws Exception {
        String id=guardar("general");api=new GrabacionController(usuarios,reuniones,entorno);
        List<?> lista=(List<?>)api.listar(null,8).get("grabaciones");assertEquals(1,lista.size());
        assertArrayEquals(webm,api.video(id,8).getBody().getInputStream().readAllBytes());
        assertEquals("no-store",api.video(id,8).getHeaders().getCacheControl());verifyNoInteractions(reuniones);
    }
    @Test void partesReintentadasNoDuplicanVideoYRechazaOrdenIncorrecto() throws Exception {
        String id=inicio("general");estado(409,()->api.parte(id,1,webm,7));api.parte(id,0,webm,7);api.parte(id,0,webm,7);
        api.finalizar(id,new GrabacionController.Fin(1),7);assertEquals(webm.length,Files.size(carpeta.resolve(id+".webm")));
        assertEquals(id,((Map<?,?>)api.finalizar(id,new GrabacionController.Fin(1),7).get("grabacion")).get("id"));
    }
    @Test void protegeCargaDeOtraCuentaYFormato() throws Exception {
        String id=inicio("general");estado(404,()->api.parte(id,0,webm,8));estado(400,()->api.parte(id,0,new byte[]{1,2,3,4},7));
        estado(400,()->api.finalizar(id,new GrabacionController.Fin(1),7));estado(413,()->api.parte(id,0,new byte[4*1024*1024+1],7));
    }
    @Test void asignacionRetiradaOcultaYBloqueaArchivoAunqueConozcaSuId() throws Exception {
        when(reuniones.puedeAccederGrabacion(7,9)).thenReturn(true);String id=guardar("9");
        estado(403,()->api.video(id,8));when(reuniones.puedeAccederGrabacion(7,9)).thenReturn(false);
        estado(403,()->api.video(id,7));assertTrue(((List<?>)api.listar(null,7).get("grabaciones")).isEmpty());
    }
    @Test void impideTraversalYCuentaDesactivada() throws Exception {
        estado(400,()->api.video("../secreto",7));Usuario u=usuarios.findById(7).orElseThrow();u.setEstado("Inactivo");
        estado(401,()->api.listar(null,7));assertEquals(0,Files.list(carpeta).count());
    }
    @Test void listaFechaDescendenteYFiltraLaSala() throws Exception {
        when(reuniones.puedeAccederGrabacion(7,9)).thenReturn(true);String primero=guardar("general"),segundo=guardar("9");
        List<?> todos=(List<?>)api.listar(null,7).get("grabaciones");assertEquals(segundo,((Map<?,?>)todos.get(0)).get("id"));
        assertEquals(1,((List<?>)api.listar("general",7).get("grabaciones")).size());assertNotEquals(primero,segundo);
    }
}
