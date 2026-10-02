package com.jjm.oficina.controller;

import com.jjm.oficina.dto.AlertaRequest;
import com.jjm.oficina.modelo.Alerta;
import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.Proyecto;
import com.jjm.oficina.modelo.Tarea;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.AlertaRepository;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.ProyectoRepository;
import com.jjm.oficina.repositorio.TareaRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/alertas")
@CrossOrigin(origins = "*")
public class AlertaController {

    private final AlertaRepository alertaRepository;
    private final UsuarioRepository usuarioRepository;
    private final MiembroEquipoRepository miembroEquipoRepository;
    private final ProyectoRepository proyectoRepository;
    private final TareaRepository tareaRepository;

    public AlertaController(
            AlertaRepository alertaRepository,
            UsuarioRepository usuarioRepository,
            MiembroEquipoRepository miembroEquipoRepository,
            ProyectoRepository proyectoRepository,
            TareaRepository tareaRepository
    ) {
        this.alertaRepository = alertaRepository;
        this.usuarioRepository = usuarioRepository;
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.proyectoRepository = proyectoRepository;
        this.tareaRepository = tareaRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listarAlertas(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo
    ) {
        Usuario usuario = obtenerUsuario(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        if (esUsuarioConsulta(usuario)) {
            return respuestaError(
                    HttpStatus.FORBIDDEN,
                    "Los usuarios de consulta no pueden acceder al centro interno de alertas."
            );
        }

        List<Alerta> alertas;

        if (esAdministrador(usuario)) {
            alertas = alertaRepository.findAllByOrderByFechaCreacionDesc();
        } else {
            Optional<MiembroEquipo> miembroSesion =
                    miembroEquipoRepository.findByUsuarioId(usuario.getId());

            if (miembroSesion.isEmpty()) {
                Map<String, Object> respuestaVacia = new LinkedHashMap<>();
                respuestaVacia.put("estado", "correcto");
                respuestaVacia.put("alertas", List.of());

                return ResponseEntity.ok(respuestaVacia);
            }

            alertas = alertaRepository.buscarAlertasVisiblesParaUsuario(
                    miembroSesion.get().getId(),
                    usuario.getId()
            );
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put(
                "alertas",
                alertas.stream()
                        .map(this::convertirAlerta)
                        .toList()
        );

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerAlerta(
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

        if (esUsuarioConsulta(usuario)) {
            return respuestaError(
                    HttpStatus.FORBIDDEN,
                    "Los usuarios de consulta no pueden consultar alertas internas."
            );
        }

        Optional<Alerta> alertaEncontrada =
                alertaRepository.findById(id);

        if (alertaEncontrada.isEmpty()) {
            return respuestaError(
                    HttpStatus.NOT_FOUND,
                    "No se encontró la alerta solicitada."
            );
        }

        Alerta alerta = alertaEncontrada.get();

        if (!puedeVerAlerta(usuario, alerta)) {
            return respuestaError(
                    HttpStatus.FORBIDDEN,
                    "No tienes permiso para consultar esta alerta."
            );
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("alerta", convertirAlerta(alerta));

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crearAlerta(
            @Valid @RequestBody AlertaRequest datos,
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
                    "Solo un administrador puede crear alertas manuales."
            );
        }

        ResponseEntity<Map<String, Object>> validacion =
                validarRelaciones(datos);

        if (validacion != null) {
            return validacion;
        }

        Alerta alerta = new Alerta();

        llenarAlertaDesdeRequest(alerta, datos);
        alerta.setIdUsuarioCreador(usuario.getId());

        Alerta alertaGuardada =
                alertaRepository.save(alerta);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Alerta creada correctamente.");
        respuesta.put("alerta", convertirAlerta(alertaGuardada));

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> actualizarAlerta(
            @PathVariable Integer id,
            @Valid @RequestBody AlertaRequest datos,
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
                    "Solo un administrador puede editar alertas."
            );
        }

        Optional<Alerta> alertaEncontrada =
                alertaRepository.findById(id);

        if (alertaEncontrada.isEmpty()) {
            return respuestaError(
                    HttpStatus.NOT_FOUND,
                    "No se encontró la alerta solicitada."
            );
        }

        ResponseEntity<Map<String, Object>> validacion =
                validarRelaciones(datos);

        if (validacion != null) {
            return validacion;
        }

        Alerta alerta = alertaEncontrada.get();

        llenarAlertaDesdeRequest(alerta, datos);

        Alerta alertaActualizada =
                alertaRepository.save(alerta);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Alerta actualizada correctamente.");
        respuesta.put("alerta", convertirAlerta(alertaActualizada));

        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<Map<String, Object>> actualizarEstadoAlerta(
            @PathVariable Integer id,
            @RequestBody Map<String, String> datos,
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
                    "Solo un administrador puede actualizar el estado de las alertas."
            );
        }

        Optional<Alerta> alertaEncontrada =
                alertaRepository.findById(id);

        if (alertaEncontrada.isEmpty()) {
            return respuestaError(
                    HttpStatus.NOT_FOUND,
                    "No se encontró la alerta solicitada."
            );
        }

        String nuevoEstado = datos.get("estado");

        if (nuevoEstado == null || nuevoEstado.isBlank()) {
            return respuestaError(
                    HttpStatus.BAD_REQUEST,
                    "El estado de la alerta es obligatorio."
            );
        }

        Alerta alerta = alertaEncontrada.get();

        alerta.setEstado(nuevoEstado.trim());

        if (normalizarTexto(nuevoEstado).equals("resuelta")) {
            alerta.setFechaResolucion(LocalDateTime.now());
        } else {
            alerta.setFechaResolucion(null);
        }

        Alerta alertaActualizada =
                alertaRepository.save(alerta);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Estado de alerta actualizado correctamente.");
        respuesta.put("alerta", convertirAlerta(alertaActualizada));

        return ResponseEntity.ok(respuesta);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> eliminarAlerta(
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
                    "Solo un administrador puede eliminar alertas."
            );
        }

        if (!alertaRepository.existsById(id)) {
            return respuestaError(
                    HttpStatus.NOT_FOUND,
                    "No se encontró la alerta solicitada."
            );
        }

        alertaRepository.deleteById(id);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Alerta eliminada correctamente.");

        return ResponseEntity.ok(respuesta);
    }

    private void llenarAlertaDesdeRequest(
            Alerta alerta,
            AlertaRequest datos
    ) {
        alerta.setIdProyecto(datos.getIdProyecto());
        alerta.setIdTarea(datos.getIdTarea());
        alerta.setIdMiembroAsignado(datos.getIdMiembroAsignado());

        alerta.setTitulo(datos.getTitulo().trim());
        alerta.setDescripcion(limpiarTexto(datos.getDescripcion()));
        alerta.setTipo(datos.getTipo().trim());
        alerta.setSeveridad(datos.getSeveridad().trim());

        String estado = datos.getEstado();

        alerta.setEstado(
                estado == null || estado.isBlank()
                        ? "Abierta"
                        : estado.trim()
        );

        alerta.setFechaLimite(datos.getFechaLimite());

        if (normalizarTexto(alerta.getEstado()).equals("resuelta")) {
            alerta.setFechaResolucion(LocalDateTime.now());
        } else {
            alerta.setFechaResolucion(null);
        }
    }

    private ResponseEntity<Map<String, Object>> validarRelaciones(
            AlertaRequest datos
    ) {
        if (datos.getIdProyecto() != null) {
            Optional<Proyecto> proyecto =
                    proyectoRepository.findById(datos.getIdProyecto());

            if (proyecto.isEmpty()) {
                return respuestaError(
                        HttpStatus.BAD_REQUEST,
                        "El proyecto seleccionado no existe."
                );
            }
        }

        if (datos.getIdTarea() != null) {
            Optional<Tarea> tarea =
                    tareaRepository.findById(datos.getIdTarea());

            if (tarea.isEmpty()) {
                return respuestaError(
                        HttpStatus.BAD_REQUEST,
                        "La tarea seleccionada no existe."
                );
            }
        }

        if (datos.getIdMiembroAsignado() != null) {
            Optional<MiembroEquipo> miembro =
                    miembroEquipoRepository.findById(datos.getIdMiembroAsignado());

            if (miembro.isEmpty()) {
                return respuestaError(
                        HttpStatus.BAD_REQUEST,
                        "El integrante asignado no existe."
                );
            }

            if (!"Activo".equalsIgnoreCase(miembro.get().getEstado())) {
                return respuestaError(
                        HttpStatus.BAD_REQUEST,
                        "El integrante asignado no está activo."
                );
            }
        }

        return null;
    }

    private boolean puedeVerAlerta(
            Usuario usuario,
            Alerta alerta
    ) {
        if (esAdministrador(usuario)) {
            return true;
        }

        if (
                alerta.getIdUsuarioCreador() != null &&
                alerta.getIdUsuarioCreador().equals(usuario.getId())
        ) {
            return true;
        }

        Optional<MiembroEquipo> miembroSesion =
                miembroEquipoRepository.findByUsuarioId(usuario.getId());

        if (miembroSesion.isEmpty()) {
            return false;
        }

        return alerta.getIdMiembroAsignado() != null &&
                alerta.getIdMiembroAsignado().equals(miembroSesion.get().getId());
    }

    private Map<String, Object> convertirAlerta(Alerta alerta) {
        Map<String, Object> mapa = new LinkedHashMap<>();

        mapa.put("id", alerta.getId());
        mapa.put("origen", "manual");

        mapa.put("idProyecto", alerta.getIdProyecto());
        mapa.put("proyecto", obtenerNombreProyecto(alerta.getIdProyecto()));

        mapa.put("idTarea", alerta.getIdTarea());
        mapa.put("tarea", obtenerNombreTarea(alerta.getIdTarea()));

        mapa.put("idMiembro", alerta.getIdMiembroAsignado());
        mapa.put("idMiembroAsignado", alerta.getIdMiembroAsignado());
        mapa.put("asignado", obtenerNombreMiembro(alerta.getIdMiembroAsignado()));

        mapa.put("idUsuarioCreador", alerta.getIdUsuarioCreador());
        mapa.put("creador", obtenerNombreUsuario(alerta.getIdUsuarioCreador()));

        mapa.put("titulo", alerta.getTitulo());
        mapa.put("descripcion", alerta.getDescripcion());
        mapa.put("tipo", alerta.getTipo());
        mapa.put("severidad", alerta.getSeveridad());
        mapa.put("estado", alerta.getEstado());

        mapa.put("fechaLimite", alerta.getFechaLimite());
        mapa.put("fechaCreacion", alerta.getFechaCreacion());
        mapa.put("fechaResolucion", alerta.getFechaResolucion());
        mapa.put("fechaActualizacion", alerta.getFechaActualizacion());

        mapa.put("enlace", construirEnlace(alerta));

        return mapa;
    }

    private String construirEnlace(Alerta alerta) {
        if (alerta.getIdTarea() != null) {
            return "tablero-tareas.html";
        }

        if (alerta.getIdProyecto() != null) {
            return "detalle-proyecto.html?id=" + alerta.getIdProyecto();
        }

        return "alertas.html";
    }

    private String obtenerNombreProyecto(Integer idProyecto) {
        if (idProyecto == null) {
            return "";
        }

        return proyectoRepository.findById(idProyecto)
                .map(Proyecto::getNombre)
                .orElse("");
    }

    private String obtenerNombreTarea(Integer idTarea) {
        if (idTarea == null) {
            return "";
        }

        return tareaRepository.findById(idTarea)
                .map(Tarea::getTitulo)
                .orElse("");
    }

    private String obtenerNombreMiembro(Integer idMiembro) {
        if (idMiembro == null) {
            return "";
        }

        return miembroEquipoRepository.findById(idMiembro)
                .map(MiembroEquipo::getNombreCompleto)
                .orElse("");
    }

    private String obtenerNombreUsuario(Integer idUsuario) {
        if (idUsuario == null) {
            return "";
        }

        return usuarioRepository.findById(idUsuario)
                .map(usuario -> {
                    StringBuilder nombre = new StringBuilder();

                    agregarParteNombre(nombre, usuario.getNombre());
                    agregarParteNombre(nombre, usuario.getApellidoPaterno());
                    agregarParteNombre(nombre, usuario.getApellidoMaterno());

                    return nombre.toString().trim();
                })
                .orElse("");
    }

    private void agregarParteNombre(
            StringBuilder destino,
            String valor
    ) {
        if (valor == null || valor.isBlank()) {
            return;
        }

        if (!destino.isEmpty()) {
            destino.append(" ");
        }

        destino.append(valor.trim());
    }

    private Usuario obtenerUsuario(Integer idUsuario) {
        if (idUsuario == null) {
            return null;
        }

        return usuarioRepository.findById(idUsuario)
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


    private boolean esUsuarioConsulta(Usuario usuario) {
        if (
                usuario == null ||
                usuario.getRol() == null ||
                !"Activo".equalsIgnoreCase(usuario.getEstado())
        ) {
            return false;
        }

        String rol = normalizarTexto(usuario.getRol().getNombre());

        return rol.equals("cliente") ||
                rol.equals("consulta") ||
                rol.equals("usuario consulta") ||
                rol.equals("usuario de consulta") ||
                rol.equals("enlace universidad") ||
                rol.equals("enlace de universidad") ||
                rol.equals("enlace empresa") ||
                rol.equals("enlace de empresa");
    }

    private String normalizarTexto(String valor) {
        if (valor == null) {
            return "";
        }

        return Normalizer.normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim()
                .toLowerCase();
    }

    private String limpiarTexto(String valor) {
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