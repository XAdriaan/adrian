package com.jjm.oficina.controller;
import com.jjm.oficina.servicio.AutomatizacionesService;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
class RespaldosSeguridadTest {
    @TempDir Path carpeta;
    @Test void rutasFueraDeLaCarpetaYArchivosNoVerificadosNoSeDescargan()throws Exception{
        AutomatizacionesService acceso=mock(AutomatizacionesService.class);JdbcTemplate jdbc=mock(JdbcTemplate.class);RespaldosController c=new RespaldosController(acceso,jdbc,carpeta.toString());
        assertThrows(ResponseStatusException.class,()->c.descargar(1,"../secretos"));verifyNoInteractions(jdbc);
        when(jdbc.queryForList(anyString(),anyString())).thenReturn(List.of(Map.of("archivo","../secretos")));
        assertThrows(ResponseStatusException.class,()->c.descargar(1,"20261012T030000_0123abcd"));
    }
    @Test void archivoVerificadoSeDescargaConAutorizacionAdministrativa()throws Exception{
        AutomatizacionesService acceso=mock(AutomatizacionesService.class);JdbcTemplate jdbc=mock(JdbcTemplate.class);String id="20261012T030000_0123abcd",nombre="jjm_"+id+".sql.gz";Files.write(carpeta.resolve(nombre),new byte[]{1,2,3});when(jdbc.queryForList(anyString(),eq(id))).thenReturn(List.of(Map.of("archivo",nombre)));
        RespaldosController c=new RespaldosController(acceso,jdbc,carpeta.toString());assertEquals(3,c.descargar(1,id).getHeaders().getContentLength());verify(acceso).comprobar(1,true,true);verify(jdbc).queryForList(contains("estado='Verificado'"),eq(id));
    }
}
