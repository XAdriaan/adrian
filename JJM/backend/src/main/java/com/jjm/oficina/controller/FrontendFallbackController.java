package com.jjm.oficina.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Respaldo para las páginas críticas del frontend.
 *
 * Producción usa Nginx para servir la web. Si por una actualización del proxy
 * una petición HTML llega temporalmente al contenedor Spring Boot, estas rutas
 * evitan terminar en Whitelabel 404 y entregan la copia estática incluida en
 * el JAR.
 */
@RestController
public class FrontendFallbackController {

    @GetMapping(value = "/detalle-proyecto.html", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> detalleProyecto() {
        return pagina("detalle-proyecto.html");
    }

    @GetMapping(value = "/proyectos.html", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> proyectos() {
        return pagina("proyectos.html");
    }

    @GetMapping(value = "/reunion.html", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> reunion() {
        return pagina("reunion.html");
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
