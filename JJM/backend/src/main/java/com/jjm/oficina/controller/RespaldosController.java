package com.jjm.oficina.controller;

import com.jjm.oficina.servicio.AutomatizacionesService;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/automatizaciones/respaldos")
public class RespaldosController {
    private final AutomatizacionesService acceso;private final JdbcTemplate jdbc;private final Path carpeta;
    public RespaldosController(AutomatizacionesService acceso,JdbcTemplate jdbc,@Value("${pmo.backup.dir:/app/respaldos}")String carpeta){this.acceso=acceso;this.jdbc=jdbc;this.carpeta=Path.of(carpeta).toAbsolutePath().normalize();}
    @GetMapping public Map<String,Object> listar(@RequestHeader("X-Usuario-Id")Integer id){acceso.comprobar(id,true,true);return Map.of("estado","correcto","respaldos",jdbc.queryForList("SELECT id,archivo,sha256,bytes,estado,detalle,creado_en AS creado,verificado_en AS verificado FROM pmo_respaldos ORDER BY creado_en DESC LIMIT 30"));}
    @GetMapping("/{respaldo}/archivo") public ResponseEntity<Resource> descargar(@RequestHeader("X-Usuario-Id")Integer id,@PathVariable String respaldo)throws java.io.IOException{
        acceso.comprobar(id,true,true);
        if(!respaldo.matches("[0-9]{8}T[0-9]{6}_[0-9a-f]{8}"))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Respaldo no encontrado.");
        List<Map<String,Object>> datos=jdbc.queryForList("SELECT archivo FROM pmo_respaldos WHERE id=? AND estado='Verificado'",respaldo);
        if(datos.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"No hay una copia verificada disponible.");
        String nombre=Objects.toString(datos.getFirst().get("archivo"),"");
        if(!nombre.equals("jjm_"+respaldo+".sql.gz"))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Archivo no disponible.");
        Path archivo=carpeta.resolve(nombre).normalize();
        if(!Files.isRegularFile(archivo,LinkOption.NOFOLLOW_LINKS)||!archivo.toRealPath().getParent().equals(carpeta.toRealPath()))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"La copia ya no está almacenada en el servidor.");
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(nombre).build().toString()).contentType(MediaType.parseMediaType("application/gzip")).contentLength(Files.size(archivo)).body(new FileSystemResource(archivo));
    }
}
