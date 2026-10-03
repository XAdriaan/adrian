package com.jjm.oficina.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Respaldo universal del frontend.
 *
 * La ruta normal de producción es Nginx -> archivos estáticos y /api -> Spring.
 * Si Coolify/Traefik envía accidentalmente una URL .html al backend, este
 * controlador entrega la misma página incluida dentro del JAR y evita la
 * pantalla Whitelabel 404.
 */
@RestController
public class FrontendFallbackController {

    @GetMapping(value = "/{pagina}.html", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> paginaHtml(@PathVariable String pagina) {
        if (pagina == null || !pagina.matches("[A-Za-z0-9_-]+")) {
            return ResponseEntity.notFound().build();
        }
        return pagina(pagina + ".html");
    }

    private ResponseEntity<Resource> pagina(String nombre) {
        Resource recurso = new ClassPathResource("static/" + nombre);
        if (!recurso.exists()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.TEXT_HTML)
                .body(recurso);
    }
}
