package com.jjm.oficina.controller;

import com.jjm.oficina.dto.EncuestaRequest;
import com.jjm.oficina.modelo.Encuesta;
import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.MiembroProyecto;
import com.jjm.oficina.modelo.Proyecto;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.EncuestaRepository;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.MiembroProyectoRepository;
import com.jjm.oficina.repositorio.ProyectoRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/encuestas")
@CrossOrigin(origins = "*")
public class EncuestaController {

    private final EncuestaRepository encuestaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProyectoRepository proyectoRepository;
    private final MiembroEquipoRepository miembroEquipoRepository;
    private final MiembroProyectoRepository miembroProyectoRepository;

    public EncuestaController(
            EncuestaRepository encuestaRepository,
            UsuarioRepository usuarioRepository,
            ProyectoRepository proyectoRepository,
            MiembroEquipoRepository miembroEquipoRepository,
            MiembroProyectoRepository miembroProyectoRepository
    ) {
        this.encuestaRepository = encuestaRepository;
        this.usuarioRepository = usuarioRepository;
        this.proyectoRepository = proyectoRepository;
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.miembroProyectoRepository = miembroProyectoRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listarEncuestas(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo
    ) {
        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        List<Encuesta> encuestas;

        if (esAdministrador(usuario)) {
            encuestas = encuestaRepository.findAllByOrderByFechaCreacionDesc();

        } else if (esClienteOConsulta(usuario)) {
            encuestas = encuestaRepository.findByIdUsuarioClienteOrderByFechaCreacionDesc(
                    usuario.getId()
            );

        } else {
            List<Integer> idsProyectosResponsable =
                    obtenerIdsProyectosDondeEsResponsable(usuario);

            if (idsProyectosResponsable.isEmpty()) {
                encuestas = encuestaRepository.findByIdUsuarioClienteOrderByFechaCreacionDesc(
                        usuario.getId()
                );
            } else {
                encuestas = idsProyectosResponsable.stream()
                        .flatMap(idProyecto ->
                                encuestaRepository
                                        .findByIdProyectoOrderByFechaCreacionDesc(idProyecto)
                                        .stream()
                        )
                        .toList();
            }
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put(
                "encuestas",
                encuestas.stream()
                        .map(this::convertirEncuesta)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/proyectos-disponibles")
    public ResponseEntity<Map<String, Object>> listarProyectosDisponibles(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo
    ) {
        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        List<Proyecto> proyectos;

        if (esAdministrador(usuario) || esClienteOConsulta(usuario)) {
            proyectos = proyectoRepository.findAll();

        } else {
            MiembroEquipo miembro = obtenerMiembroDesdeUsuario(usuario);

            if (miembro == null) {
                proyectos = List.of();
            } else {
                List<Integer> idsProyectosAsignados =
                        miembroProyectoRepository
                                .findByIdMiembroOrderByFechaAsignacionDesc(
                                        miembro.getId()
                                )
                                .stream()
                                .map(MiembroProyecto::getIdProyecto)
                                .distinct()
                                .toList();

                proyectos = idsProyectosAsignados.stream()
                        .map(idProyecto ->
                                proyectoRepository
                                        .findById(idProyecto)
                                        .orElse(null)
                        )
                        .filter(proyecto -> proyecto != null)
                        .toList();
            }
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put(
                "proyectos",
                proyectos.stream()
                        .map(this::convertirProyectoBasico)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerEncuesta(
            @PathVariable Integer id,
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo
    ) {
        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        Optional<Encuesta> encuestaEncontrada =
                encuestaRepository.findById(id);

        if (encuestaEncontrada.isEmpty()) {
            return respuestaError(
                    HttpStatus.NOT_FOUND,
                    "No se encontró la encuesta solicitada."
            );
        }

        Encuesta encuesta = encuestaEncontrada.get();

        if (!puedeVerEncuesta(usuario, encuesta)) {
            return respuestaError(
                    HttpStatus.FORBIDDEN,
                    "No tienes permiso para consultar esta encuesta."
            );
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("encuesta", convertirEncuesta(encuesta));

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crearEncuesta(
            @Valid @RequestBody EncuestaRequest datos,
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo
    ) {
        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        ResponseEntity<Map<String, Object>> validacion =
                validarProyecto(datos);

        if (validacion != null) {
            return validacion;
        }

        Encuesta encuesta = new Encuesta();

        encuesta.setIdProyecto(datos.getIdProyecto());
        encuesta.setIdUsuarioCliente(usuario.getId());
        encuesta.setProyecto(datos.getProyecto().trim());
        encuesta.setTipo(datos.getTipo().trim());
        encuesta.setCalificacion(datos.getCalificacion());
        encuesta.setNombreEncuestado(limpiarTexto(datos.getNombreEncuestado()));
        encuesta.setEmailEncuestado(limpiarTexto(datos.getEmailEncuestado()));
        encuesta.setComentario(limpiarTexto(datos.getComentario()));
        encuesta.setVideoUrl(limpiarTexto(datos.getVideoUrl()));
        encuesta.setConsentimientoVideo(limpiarTexto(datos.getConsentimientoVideo()));

        Encuesta encuestaGuardada =
                encuestaRepository.save(encuesta);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Encuesta registrada correctamente.");
        respuesta.put("encuesta", convertirEncuesta(encuestaGuardada));

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> eliminarEncuesta(
            @PathVariable Integer id,
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo
    ) {
        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        if (!esAdministrador(usuario)) {
            return respuestaError(
                    HttpStatus.FORBIDDEN,
                    "Solo un administrador puede eliminar encuestas."
            );
        }

        if (!encuestaRepository.existsById(id)) {
            return respuestaError(
                    HttpStatus.NOT_FOUND,
                    "No se encontró la encuesta solicitada."
            );
        }

        encuestaRepository.deleteById(id);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Encuesta eliminada correctamente.");

        return ResponseEntity.ok(respuesta);
    }

    private ResponseEntity<Map<String, Object>> validarProyecto(
            EncuestaRequest datos
    ) {
        if (datos.getIdProyecto() == null) {
            return null;
        }

        Optional<Proyecto> proyecto =
                proyectoRepository.findById(datos.getIdProyecto());

        if (proyecto.isEmpty()) {
            return respuestaError(
                    HttpStatus.BAD_REQUEST,
                    "El proyecto seleccionado no existe."
            );
        }

        return null;
    }

    private boolean puedeVerEncuesta(
            Usuario usuario,
            Encuesta encuesta
    ) {
        if (esAdministrador(usuario)) {
            return true;
        }

        if (
                encuesta.getIdUsuarioCliente() != null &&
                encuesta.getIdUsuarioCliente().equals(usuario.getId())
        ) {
            return true;
        }

        if (esClienteOConsulta(usuario)) {
            return false;
        }

        return encuesta.getIdProyecto() != null &&
                obtenerIdsProyectosDondeEsResponsable(usuario)
                        .contains(encuesta.getIdProyecto());
    }

    private List<Integer> obtenerIdsProyectosDondeEsResponsable(
            Usuario usuario
    ) {
        MiembroEquipo miembro = obtenerMiembroDesdeUsuario(usuario);

        if (miembro == null) {
            return List.of();
        }

        return proyectoRepository.findAll()
                .stream()
                .filter(proyecto ->
                        proyecto.getIdResponsable() != null &&
                                proyecto.getIdResponsable().equals(miembro.getId())
                )
                .map(Proyecto::getId)
                .toList();
    }

    private MiembroEquipo obtenerMiembroDesdeUsuario(
            Usuario usuario
    ) {
        if (usuario == null) {
            return null;
        }

        return miembroEquipoRepository
                .findByUsuarioId(usuario.getId())
                .orElse(null);
    }

    private Map<String, Object> convertirEncuesta(
            Encuesta encuesta
    ) {
        Map<String, Object> mapa = new LinkedHashMap<>();

        mapa.put("id", encuesta.getId());
        mapa.put("idEncuesta", encuesta.getId());

        mapa.put("idProyecto", encuesta.getIdProyecto());
        mapa.put("idUsuarioCliente", encuesta.getIdUsuarioCliente());

        mapa.put("proyecto", encuesta.getProyecto());
        mapa.put("tipo", encuesta.getTipo());
        mapa.put("calificacion", encuesta.getCalificacion());

        mapa.put("nombre", encuesta.getNombreEncuestado());
        mapa.put("nombreEncuestado", encuesta.getNombreEncuestado());

        mapa.put("email", encuesta.getEmailEncuestado());
        mapa.put("emailEncuestado", encuesta.getEmailEncuestado());

        mapa.put("comentario", encuesta.getComentario());

        mapa.put("video", encuesta.getVideoUrl());
        mapa.put("videoUrl", encuesta.getVideoUrl());

        mapa.put("consentimiento", encuesta.getConsentimientoVideo());
        mapa.put("consentimientoVideo", encuesta.getConsentimientoVideo());

        mapa.put("fechaCreacion", encuesta.getFechaCreacion());

        return mapa;
    }

    private Map<String, Object> convertirProyectoBasico(
            Proyecto proyecto
    ) {
        Map<String, Object> mapa = new LinkedHashMap<>();

        mapa.put("id", proyecto.getId());
        mapa.put("idProyecto", proyecto.getId());
        mapa.put("nombre", proyecto.getNombre());
        mapa.put("estado", proyecto.getEstado());

        return mapa;
    }

    private Usuario obtenerUsuario(
            Integer idUsuario
    ) {
        if (idUsuario == null) {
            return null;
        }

        return usuarioRepository.findById(idUsuario)
                .orElse(null);
    }

    private boolean esAdministrador(
            Usuario usuario
    ) {
        if (
                usuario == null ||
                usuario.getRol() == null ||
                !"Activo".equalsIgnoreCase(usuario.getEstado())
        ) {
            return false;
        }

        String rol = normalizarTexto(
                usuario.getRol().getNombre()
        );

        return rol.equals("administrador") ||
                rol.equals("admin pmo") ||
                rol.equals("admin_pmo") ||
                rol.equals("administrador pmo");
    }

    private boolean esClienteOConsulta(
            Usuario usuario
    ) {
        if (
                usuario == null ||
                usuario.getRol() == null ||
                !"Activo".equalsIgnoreCase(usuario.getEstado())
        ) {
            return false;
        }

        String rol = normalizarTexto(
                usuario.getRol().getNombre()
        );

        return rol.equals("cliente") ||
                rol.equals("consulta") ||
                rol.equals("usuario consulta") ||
                rol.equals("usuario de consulta") ||
                rol.equals("enlace universidad") ||
                rol.equals("enlace de universidad") ||
                rol.equals("enlace empresa") ||
                rol.equals("enlace de empresa");
    }

    private String normalizarTexto(
            String valor
    ) {
        if (valor == null) {
            return "";
        }

        return Normalizer.normalize(
                        valor,
                        Normalizer.Form.NFD
                )
                .replaceAll("\\p{M}", "")
                .trim()
                .toLowerCase();
    }

    private String limpiarTexto(
            String valor
    ) {
        if (valor == null || valor.isBlank()) {
            return "";
        }

        return valor.trim();
    }

    private ResponseEntity<Map<String, Object>> respuestaError(
            HttpStatus estado,
            String mensaje
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "error");
        respuesta.put("mensaje", mensaje);

        return ResponseEntity
                .status(estado)
                .body(respuesta);
    }
}
