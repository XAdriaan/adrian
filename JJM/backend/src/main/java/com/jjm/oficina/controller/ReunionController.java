package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.Proyecto;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.MiembroProyectoRepository;
import com.jjm.oficina.repositorio.ProyectoRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Reuniones de proyecto persistentes.
 *
 * El acceso requiere administración o asignación al proyecto. El canal WebRTC
 * usa estas mismas reglas antes de intercambiar señales entre participantes.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ReunionController {

    private final JdbcTemplate jdbc;
    private final UsuarioRepository usuarioRepository;
    private final ProyectoRepository proyectoRepository;
    private final MiembroEquipoRepository miembroEquipoRepository;
    private final MiembroProyectoRepository miembroProyectoRepository;

    public ReunionController(
            JdbcTemplate jdbc,
            UsuarioRepository usuarioRepository,
            ProyectoRepository proyectoRepository,
            MiembroEquipoRepository miembroEquipoRepository,
            MiembroProyectoRepository miembroProyectoRepository
    ) {
        this.jdbc = jdbc;
        this.usuarioRepository = usuarioRepository;
        this.proyectoRepository = proyectoRepository;
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.miembroProyectoRepository = miembroProyectoRepository;
    }

    @PostConstruct
    public void prepararEstructura() {
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS reuniones_proyecto (
                    id_reunion BIGINT NOT NULL AUTO_INCREMENT,
                    id_proyecto INT NOT NULL,
                    sala VARCHAR(180) NOT NULL,
                    titulo VARCHAR(220) NOT NULL,
                    estado VARCHAR(30) NOT NULL DEFAULT 'Activa',
                    id_creador INT NOT NULL,
                    fecha_inicio DATETIME NOT NULL,
                    fecha_fin DATETIME NULL,
                    PRIMARY KEY (id_reunion),
                    UNIQUE KEY uk_reunion_sala (sala),
                    KEY idx_reunion_proyecto_estado (id_proyecto, estado)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS participantes_reunion (
                    id_participante BIGINT NOT NULL AUTO_INCREMENT,
                    id_reunion BIGINT NOT NULL,
                    id_usuario INT NOT NULL,
                    fecha_entrada DATETIME NOT NULL,
                    fecha_salida DATETIME NULL,
                    PRIMARY KEY (id_participante),
                    KEY idx_participante_reunion (id_reunion),
                    KEY idx_participante_usuario (id_usuario)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);
    }

    /** Directorio de salas limitado a proyectos a los que pertenece la sesión. */
    @GetMapping("/reuniones")
    public ResponseEntity<Map<String, Object>> misSalas(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario
    ) {
        Usuario usuario = obtenerUsuario(idUsuario);
        if (usuario == null || !"Activo".equalsIgnoreCase(usuario.getEstado())) {
            return error(HttpStatus.UNAUTHORIZED, "La sesión no existe o venció. Inicia sesión nuevamente.");
        }
        MiembroEquipo miembro = miembroEquipoRepository.findByUsuarioId(usuario.getId()).orElse(null);
        Set<Integer> asignados = new HashSet<>();
        if (miembro != null) {
            miembroProyectoRepository.findByIdMiembroOrderByFechaAsignacionDesc(miembro.getId())
                    .forEach(m -> asignados.add(m.getIdProyecto()));
        }
        boolean administrador = esAdministrador(usuario);
        List<Proyecto> proyectos = proyectoRepository.findAll().stream()
                .filter(p -> administrador || asignados.contains(p.getId()))
                .sorted(Comparator.comparing(p -> textoSeguro(p.getNombre(), "Proyecto")))
                .toList();
        List<Map<String, Object>> reuniones = proyectos.isEmpty() ? List.of() : jdbc.queryForList(
                "SELECT id_reunion AS id, id_proyecto AS idProyecto, sala, titulo, estado, "
                        + "id_creador AS idCreador, fecha_inicio AS fechaInicio, fecha_fin AS fechaFin "
                        + "FROM reuniones_proyecto WHERE id_proyecto IN ("
                        + String.join(",", Collections.nCopies(proyectos.size(), "?"))
                        + ") ORDER BY fecha_inicio DESC LIMIT 100",
                proyectos.stream().map(Proyecto::getId).toArray());
        List<Map<String, Object>> salas = new ArrayList<>();
        for (Proyecto proyecto : proyectos) {
            List<Map<String, Object>> historial = reuniones.stream()
                    .filter(r -> Objects.equals(numero(r.get("idProyecto")), proyecto.getId()))
                    .map(r -> convertirReunion(r, usuario, proyecto)).toList();
            Map<String, Object> sala = new LinkedHashMap<>();
            sala.put("id", proyecto.getId());
            sala.put("nombre", proyecto.getNombre());
            sala.put("puedeCrear", true);
            sala.put("reunionActiva", historial.stream().filter(r -> "Activa".equalsIgnoreCase(String.valueOf(r.get("estado"))))
                    .findFirst().orElse(null));
            sala.put("reuniones", historial);
            salas.add(sala);
        }
        return ResponseEntity.ok(Map.of("estado", "correcto", "proyectos", salas));
    }

    @GetMapping("/proyectos/{idProyecto}/reuniones")
    public ResponseEntity<Map<String,Object>> listar(
            @PathVariable Integer idProyecto,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer idUsuario
    ) {
        Usuario usuario = obtenerUsuario(idUsuario);
        if (usuario == null) return error(HttpStatus.UNAUTHORIZED, "La sesión no existe o venció. Inicia sesión nuevamente.");
        Proyecto proyecto = proyectoRepository.findById(idProyecto).orElse(null);
        if (proyecto == null) return error(HttpStatus.NOT_FOUND, "No se encontró el proyecto.");
        if (!tieneAcceso(usuario, proyecto)) return error(HttpStatus.FORBIDDEN, "No tienes acceso a las reuniones de este proyecto.");

        List<Map<String,Object>> reuniones = jdbc.queryForList("""
                SELECT id_reunion AS id, id_proyecto AS idProyecto, sala, titulo, estado,
                       id_creador AS idCreador, fecha_inicio AS fechaInicio, fecha_fin AS fechaFin
                FROM reuniones_proyecto
                WHERE id_proyecto=?
                ORDER BY fecha_inicio DESC
                LIMIT 30
                """, idProyecto);

        List<Map<String,Object>> normalizadas = reuniones.stream()
                .map(r -> convertirReunion(r, usuario, proyecto))
                .toList();

        Map<String,Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("reuniones", normalizadas);
        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/proyectos/{idProyecto}/reuniones")
    public synchronized ResponseEntity<Map<String,Object>> crear(
            @PathVariable Integer idProyecto,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer idUsuario
    ) {
        Usuario usuario = obtenerUsuario(idUsuario);
        if (usuario == null) return error(HttpStatus.UNAUTHORIZED, "La sesión no existe o venció. Inicia sesión nuevamente.");
        Proyecto proyecto = proyectoRepository.findById(idProyecto).orElse(null);
        if (proyecto == null) return error(HttpStatus.NOT_FOUND, "No se encontró el proyecto.");
        if (!puedeCrear(usuario, proyecto)) return error(HttpStatus.FORBIDDEN, "Solo la administración y los miembros asignados pueden iniciar una reunión.");

        Map<String,Object> activa = obtenerActiva(idProyecto);
        if (activa == null) {
            String sala = "JJM-PROJ-" + idProyecto + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            String titulo = "Reunión · " + textoSeguro(proyecto.getNombre(), "Proyecto");
            jdbc.update("""
                    INSERT INTO reuniones_proyecto
                        (id_proyecto, sala, titulo, estado, id_creador, fecha_inicio)
                    VALUES (?, ?, ?, 'Activa', ?, ?)
                    """, idProyecto, sala, titulo, usuario.getId(), LocalDateTime.now());
            activa = obtenerActiva(idProyecto);
        }

        Map<String,Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("reunion", convertirReunion(activa, usuario, proyecto));
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }

    @GetMapping("/proyectos/{idProyecto}/reuniones/activa")
    public ResponseEntity<Map<String,Object>> activa(
            @PathVariable Integer idProyecto,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer idUsuario
    ) {
        Usuario usuario = obtenerUsuario(idUsuario);
        if (usuario == null) return error(HttpStatus.UNAUTHORIZED, "La sesión no existe o venció. Inicia sesión nuevamente.");
        Proyecto proyecto = proyectoRepository.findById(idProyecto).orElse(null);
        if (proyecto == null) return error(HttpStatus.NOT_FOUND, "No se encontró el proyecto.");
        if (!tieneAcceso(usuario, proyecto)) return error(HttpStatus.FORBIDDEN, "No tienes acceso a esta reunión.");

        Map<String,Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        Map<String,Object> reunion = obtenerActiva(idProyecto);
        respuesta.put("reunionActiva", reunion == null ? null : convertirReunion(reunion, usuario, proyecto));
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/reuniones/{idReunion}")
    public ResponseEntity<Map<String,Object>> obtener(
            @PathVariable Long idReunion,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer idUsuario
    ) {
        Usuario usuario = obtenerUsuario(idUsuario);
        if (usuario == null) return error(HttpStatus.UNAUTHORIZED, "La sesión no existe o venció. Inicia sesión nuevamente.");
        Map<String,Object> reunion = obtenerReunion(idReunion);
        if (reunion == null) return error(HttpStatus.NOT_FOUND, "La reunión no existe.");
        Integer idProyecto = numero(reunion.get("idProyecto"));
        Proyecto proyecto = proyectoRepository.findById(idProyecto).orElse(null);
        if (proyecto == null || !tieneAcceso(usuario, proyecto)) return error(HttpStatus.FORBIDDEN, "No tienes acceso a esta reunión.");

        return ResponseEntity.ok(Map.of(
                "estado", "correcto",
                "reunion", convertirReunion(reunion, usuario, proyecto)
        ));
    }

    @PostMapping("/reuniones/{idReunion}/unirse")
    public ResponseEntity<Map<String,Object>> unirse(
            @PathVariable Long idReunion,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer idUsuario
    ) {
        Usuario usuario = obtenerUsuario(idUsuario);
        if (usuario == null) return error(HttpStatus.UNAUTHORIZED, "La sesión no existe o venció. Inicia sesión nuevamente.");
        Map<String,Object> reunion = obtenerReunion(idReunion);
        if (reunion == null) return error(HttpStatus.NOT_FOUND, "La reunión no existe.");

        Integer idProyecto = numero(reunion.get("idProyecto"));
        Proyecto proyecto = proyectoRepository.findById(idProyecto).orElse(null);
        if (proyecto == null || !tieneAcceso(usuario, proyecto)) return error(HttpStatus.FORBIDDEN, "No tienes acceso a esta reunión.");

        if (!"Activa".equalsIgnoreCase(String.valueOf(reunion.get("estado")))) {
            return error(HttpStatus.CONFLICT, "La reunión ya terminó.");
        }
        jdbc.update("""
                INSERT INTO participantes_reunion (id_reunion, id_usuario, fecha_entrada)
                VALUES (?, ?, ?)
                """, idReunion, usuario.getId(), LocalDateTime.now());

        return ResponseEntity.ok(Map.of("estado", "correcto", "mensaje", "Entrada registrada."));
    }

    @PostMapping("/reuniones/{idReunion}/salir")
    public ResponseEntity<Map<String,Object>> salir(
            @PathVariable Long idReunion,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer idUsuario
    ) {
        Usuario usuario = obtenerUsuario(idUsuario);
        if (usuario == null) return error(HttpStatus.UNAUTHORIZED, "La sesión no existe o venció. Inicia sesión nuevamente.");

        jdbc.update("""
                UPDATE participantes_reunion
                SET fecha_salida=?
                WHERE id_participante=(
                    SELECT id FROM (
                        SELECT id_participante AS id
                        FROM participantes_reunion
                        WHERE id_reunion=? AND id_usuario=? AND fecha_salida IS NULL
                        ORDER BY id_participante DESC
                        LIMIT 1
                    ) t
                )
                """, LocalDateTime.now(), idReunion, usuario.getId());

        return ResponseEntity.ok(Map.of("estado", "correcto", "mensaje", "Salida registrada."));
    }

    @PostMapping("/reuniones/{idReunion}/finalizar")
    public ResponseEntity<Map<String,Object>> finalizar(
            @PathVariable Long idReunion,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer idUsuario
    ) {
        Usuario usuario = obtenerUsuario(idUsuario);
        if (usuario == null) return error(HttpStatus.UNAUTHORIZED, "La sesión no existe o venció. Inicia sesión nuevamente.");
        Map<String,Object> reunion = obtenerReunion(idReunion);
        if (reunion == null) return error(HttpStatus.NOT_FOUND, "La reunión no existe.");
        Integer idProyecto = numero(reunion.get("idProyecto"));
        Proyecto proyecto = proyectoRepository.findById(idProyecto).orElse(null);
        if (proyecto == null || !tieneAcceso(usuario, proyecto) || !puedeFinalizar(usuario, proyecto, reunion)) {
            return error(HttpStatus.FORBIDDEN, "No tienes permiso para finalizar la reunión para todos.");
        }

        jdbc.update("""
                UPDATE reuniones_proyecto
                SET estado='Finalizada', fecha_fin=?
                WHERE id_reunion=?
                """, LocalDateTime.now(), idReunion);

        Map<String,Object> actualizada = obtenerReunion(idReunion);
        return ResponseEntity.ok(Map.of(
                "estado", "correcto",
                "mensaje", "Reunión finalizada correctamente.",
                "reunion", convertirReunion(actualizada, usuario, proyecto)
        ));
    }

    @GetMapping("/reuniones/{idReunion}/grabaciones")
    public ResponseEntity<Map<String,Object>> grabaciones(
            @PathVariable Long idReunion,
            @RequestHeader(value="X-Usuario-Id", required=false) Integer idUsuario
    ) {
        Usuario usuario = obtenerUsuario(idUsuario);
        if (usuario == null) return error(HttpStatus.UNAUTHORIZED, "La sesión no existe o venció. Inicia sesión nuevamente.");
        Map<String,Object> reunion = obtenerReunion(idReunion);
        if (reunion == null) return error(HttpStatus.NOT_FOUND, "La reunión no existe.");
        Proyecto proyecto = proyectoRepository.findById(numero(reunion.get("idProyecto"))).orElse(null);
        if (!tieneAcceso(usuario, proyecto)) return error(HttpStatus.FORBIDDEN, "No tienes acceso a esta reunión.");
        return ResponseEntity.ok(Map.of("estado", "correcto", "grabaciones", List.of()));
    }

    private Map<String,Object> obtenerActiva(Integer idProyecto) {
        List<Map<String,Object>> filas = jdbc.queryForList("""
                SELECT id_reunion AS id, id_proyecto AS idProyecto, sala, titulo, estado,
                       id_creador AS idCreador, fecha_inicio AS fechaInicio, fecha_fin AS fechaFin
                FROM reuniones_proyecto
                WHERE id_proyecto=? AND LOWER(estado)='activa'
                ORDER BY id_reunion DESC
                LIMIT 1
                """, idProyecto);
        return filas.isEmpty() ? null : filas.get(0);
    }

    private Map<String,Object> obtenerReunion(Long idReunion) {
        List<Map<String,Object>> filas = jdbc.queryForList("""
                SELECT id_reunion AS id, id_proyecto AS idProyecto, sala, titulo, estado,
                       id_creador AS idCreador, fecha_inicio AS fechaInicio, fecha_fin AS fechaFin
                FROM reuniones_proyecto
                WHERE id_reunion=?
                LIMIT 1
                """, idReunion);
        return filas.isEmpty() ? null : filas.get(0);
    }

    private Map<String,Object> convertirReunion(Map<String,Object> fila, Usuario usuario, Proyecto proyecto) {
        Map<String,Object> r = new LinkedHashMap<>(fila);
        r.put("puedeFinalizar", puedeFinalizar(usuario, proyecto, fila));
        r.put("grabaciones", List.of());
        return r;
    }

    private boolean tieneAcceso(Usuario usuario, Proyecto proyecto) {
        if (usuario == null || proyecto == null) return false;
        if (esAdministrador(usuario)) return true;
        MiembroEquipo miembro = miembroEquipoRepository.findByUsuarioId(usuario.getId()).orElse(null);
        if (miembro == null) return false;
        return miembroProyectoRepository.existsByIdProyectoAndIdMiembro(proyecto.getId(), miembro.getId());
    }

    private boolean puedeCrear(Usuario usuario, Proyecto proyecto) {
        return tieneAcceso(usuario, proyecto);
    }

    private boolean puedeFinalizar(Usuario usuario, Proyecto proyecto, Map<String,Object> reunion) {
        if (esAdministrador(usuario)) return true;
        if (Objects.equals(numero(reunion.get("idCreador")), usuario.getId())) return true;
        MiembroEquipo miembro = miembroEquipoRepository.findByUsuarioId(usuario.getId()).orElse(null);
        return miembro != null && Objects.equals(proyecto.getIdResponsable(), miembro.getId());
    }

    private boolean esAdministrador(Usuario usuario) {
        if (usuario == null || usuario.getRol() == null || usuario.getRol().getNombre() == null) return false;
        String rol = usuario.getRol().getNombre().trim().toLowerCase(Locale.ROOT)
                .replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u');
        return Set.of("superadministrador", "administrador", "admin pmo", "administrador pmo", "admin_pmo").contains(rol);
    }

    private Usuario obtenerUsuario(Integer id) {
        Usuario u = id == null ? null : usuarioRepository.findById(id).orElse(null);
        return u != null && "Activo".equalsIgnoreCase(u.getEstado()) ? u : null;
    }

    /** El canal de audio/video revalida la asignación en cada solicitud. */
    public boolean puedeAccederVideollamada(Integer idUsuario, long idReunion) {
        Usuario u = obtenerUsuario(idUsuario);
        if (u == null) return false;
        Map<String,Object> r = obtenerReunion(idReunion);
        if (r == null || !"Activa".equalsIgnoreCase(String.valueOf(r.get("estado")))) return false;
        return tieneAcceso(u, proyectoRepository.findById(numero(r.get("idProyecto"))).orElse(null));
    }

    private Integer numero(Object value) {
        if (value instanceof Number n) return n.intValue();
        try { return value == null ? null : Integer.valueOf(String.valueOf(value)); }
        catch (Exception e) { return null; }
    }

    private String textoSeguro(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private ResponseEntity<Map<String,Object>> error(HttpStatus status, String mensaje) {
        Map<String,Object> body = new LinkedHashMap<>();
        body.put("estado", "error");
        body.put("mensaje", mensaje);
        return ResponseEntity.status(status).body(body);
    }
}
