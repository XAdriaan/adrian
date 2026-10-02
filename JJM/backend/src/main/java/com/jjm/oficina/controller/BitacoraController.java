package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Bitacora;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.BitacoraRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bitacora")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class BitacoraController {

    private final BitacoraRepository bitacoraRepository;
    private final UsuarioRepository usuarioRepository;

    public BitacoraController(
            BitacoraRepository bitacoraRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.bitacoraRepository = bitacoraRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /*
     * Bitácora global:
     * - Solo Administrador puede consultar registros del sistema.
     * - Responsable, colaborador, cliente y consulta no pueden acceder.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listarBitacora(
            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo,

            @RequestParam(required = false)
            Integer idUsuario,

            @RequestParam(required = false)
            String modulo,

            @RequestParam(required = false)
            String accion,

            @RequestParam(required = false)
            LocalDate fechaInicio,

            @RequestParam(required = false)
            LocalDate fechaFin
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "No se encontró una sesión válida para consultar la bitácora."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        if (!esAdministrador(usuario)) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "Solo un administrador puede consultar la bitácora."
            );

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        if (
                fechaInicio != null &&
                fechaFin != null &&
                fechaFin.isBefore(fechaInicio)
        ) {
            respuesta.put("estado", "error");
            respuesta.put(
                    "mensaje",
                    "La fecha final no puede ser anterior a la fecha inicial."
            );

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(respuesta);
        }

        List<Bitacora> registros =
                bitacoraRepository.buscarConFiltros(
                        idUsuario,
                        limpiarParametro(modulo),
                        limpiarParametro(accion),
                        fechaInicio != null
                                ? fechaInicio.atStartOfDay()
                                : null,
                        fechaFin != null
                                ? fechaFin.atTime(LocalTime.MAX)
                                : null
                );

        respuesta.put("estado", "correcto");
        respuesta.put("total", registros.size());
        respuesta.put(
                "registros",
                registros.stream()
                        .map(this::convertirRegistro)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    private Map<String, Object> convertirRegistro(
            Bitacora registro
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put("id", registro.getId());
        respuesta.put("idUsuario", registro.getIdUsuario());
        respuesta.put("modulo", registro.getModulo());
        respuesta.put("accion", registro.getAccion());
        respuesta.put("tipoEntidad", registro.getTipoEntidad());
        respuesta.put("idEntidad", registro.getIdEntidad());
        respuesta.put("descripcion", registro.getDescripcion());
        respuesta.put("datosAnteriores", registro.getDatosAnteriores());
        respuesta.put("datosNuevos", registro.getDatosNuevos());
        respuesta.put("fechaCreacion", registro.getFechaCreacion());

        Usuario usuario = registro.getIdUsuario() == null
                ? null
                : obtenerUsuario(registro.getIdUsuario());

        respuesta.put(
                "usuarioNombre",
                usuario != null
                        ? nombreCompleto(usuario)
                        : "Sistema"
        );

        respuesta.put(
                "usuarioCorreo",
                usuario != null
                        ? usuario.getCorreo()
                        : null
        );

        return respuesta;
    }

    private Usuario obtenerUsuario(Integer idUsuario) {
        if (idUsuario == null) {
            return null;
        }

        return usuarioRepository
                .findById(idUsuario)
                .orElse(null);
    }

    private boolean esAdministrador(Usuario usuario) {
        if (
                usuario == null ||
                usuario.getRol() == null ||
                !"Activo".equalsIgnoreCase(usuario.getEstado())
        ) {
            return false;
        }

        String rol = normalizarTexto(usuario.getRol().getNombre());

        return rol.equals("administrador") ||
                rol.equals("admin pmo") ||
                rol.equals("admin_pmo") ||
                rol.equals("administrador pmo");
    }

    private String nombreCompleto(Usuario usuario) {
        StringBuilder nombre = new StringBuilder();

        agregarParte(nombre, usuario.getNombre());
        agregarParte(nombre, usuario.getApellidoPaterno());
        agregarParte(nombre, usuario.getApellidoMaterno());

        return nombre.isEmpty()
                ? "Usuario #" + usuario.getId()
                : nombre.toString();
    }

    private void agregarParte(
            StringBuilder destino,
            String texto
    ) {
        if (texto == null || texto.isBlank()) {
            return;
        }

        if (!destino.isEmpty()) {
            destino.append(" ");
        }

        destino.append(texto.trim());
    }

    private String limpiarParametro(String valor) {
        return valor == null || valor.isBlank()
                ? null
                : valor.trim();
    }

    private String normalizarTexto(String valor) {
        return String.valueOf(valor == null ? "" : valor)
                .trim()
                .toLowerCase()
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u");
    }
}