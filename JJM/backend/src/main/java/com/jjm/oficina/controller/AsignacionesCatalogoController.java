package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.CatalogoProyectosSepDic2026Service;
import com.jjm.oficina.servicio.PermisosService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/asignaciones-catalogo")
public class AsignacionesCatalogoController {
    private final com.jjm.oficina.servicio.SeparacionProyectosService separacion;
    private final UsuarioRepository usuarios;
    private final PermisosService permisos;
    private final CatalogoProyectosSepDic2026Service catalogo;

    public AsignacionesCatalogoController(UsuarioRepository usuarios, PermisosService permisos,
            CatalogoProyectosSepDic2026Service catalogo, com.jjm.oficina.servicio.SeparacionProyectosService separacion) {
        this.separacion=separacion;this.usuarios = usuarios; this.permisos = permisos; this.catalogo = catalogo;
    }

    private Map<String,Object> respuesta(){Map<String,Object> r=new java.util.LinkedHashMap<>(catalogo.obtenerAsignaciones());r.put("proyectosSeparados",separacion.resumen());return r;}

    public record AlumnoRequest(@NotNull @Positive Integer idMiembro) {}

    private boolean administrador(Integer id) {
        Usuario usuario = id == null ? null : usuarios.findById(id).orElse(null);
        return permisos.esSuperadministrador(usuario) || permisos.esAdministradorBase(usuario);
    }

    private ResponseEntity<Map<String, Object>> denegado() {
        return ResponseEntity.status(403).body(Map.of("estado", "error", "mensaje", "Solo Administración puede revisar o confirmar las asignaciones del catálogo."));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> consultar(@RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        return administrador(id) ? ResponseEntity.ok(respuesta()) : denegado();
    }

    @PostMapping("/sincronizar")
    @Transactional
    public ResponseEntity<Map<String, Object>> sincronizar(@RequestHeader(value="X-Usuario-Id", required=false) Integer id) {
        if (!administrador(id)) return denegado();
        catalogo.sincronizarCatalogo();separacion.sincronizar();
        return ResponseEntity.ok(respuesta());
    }

    @PostMapping("/{codigo}/alumno")
    @Transactional
    public ResponseEntity<Map<String, Object>> confirmar(@RequestHeader(value="X-Usuario-Id", required=false) Integer id,
            @PathVariable String codigo, @Valid @RequestBody AlumnoRequest solicitud) {
        if (!administrador(id)) return denegado();
        try {
            catalogo.asignarAlumnoConfirmado(codigo, solicitud.idMiembro());separacion.sincronizar();
            return ResponseEntity.ok(respuesta());
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of("estado", "error", "mensaje", error.getMessage()));
        }
    }
}
