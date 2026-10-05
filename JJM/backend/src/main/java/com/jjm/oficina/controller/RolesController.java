package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.PermisosService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/roles")
public class RolesController {
    private final UsuarioRepository usuarios;
    private final PermisosService permisos;

    public RolesController(UsuarioRepository usuarios, PermisosService permisos) {
        this.usuarios = usuarios;
        this.permisos = permisos;
    }

    @GetMapping("/mi-permisos")
    public ResponseEntity<Map<String, Object>> misPermisos(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario) {
        // The token filter supplies the identity from the validated Bearer token.
        Usuario usuario = idUsuario == null ? null : usuarios.findById(idUsuario).orElse(null);
        if (usuario == null || !"Activo".equalsIgnoreCase(usuario.getEstado())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "estado", "error",
                    "mensaje", "La sesión no existe o venció. Inicia sesión nuevamente."));
        }
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("rol", usuario.getRol() == null ? "" : usuario.getRol().getNombre());
        respuesta.put("idRol", usuario.getRol() == null ? null : usuario.getRol().getId());
        respuesta.put("permisos", permisos.listarClaves(usuario));
        respuesta.put("superadministrador", permisos.esSuperadministrador(usuario));
        return ResponseEntity.ok(respuesta);
    }
}
