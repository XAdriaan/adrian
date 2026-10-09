package com.jjm.oficina.controller;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.CorreoService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/documentos")
@CrossOrigin(origins = "*")
public class DocumentoUsuarioController {

    private final JdbcTemplate jdbc;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;
    private final CorreoService correoService;

    public DocumentoUsuarioController(
            JdbcTemplate jdbc,
            UsuarioRepository usuarioRepository,
            ObjectMapper objectMapper,
            CorreoService correoService
    ) {
        this.jdbc = jdbc;
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = objectMapper;
        this.correoService = correoService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo
    ) {
        Usuario activo = obtenerUsuario(idUsuarioActivo);

        if (activo == null) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        /*
         * Los documentos se ordenan primero por la fecha
         * de registro del alumno y después por la fecha
         * de subida del documento.
         */
        String sql = consultaBase()
                + (
                    esAdministrador(activo)
                        ? " ORDER BY u.fecha_registro DESC, d.fecha_subida DESC"
                        : " WHERE d.id_usuario=? ORDER BY u.fecha_registro DESC, d.fecha_subida DESC"
                );

        List<Map<String, Object>> filas = esAdministrador(activo)
                ? jdbc.queryForList(sql)
                : jdbc.queryForList(sql, activo.getId());

        List<Map<String, Object>> documentos =
                filas.stream()
                        .map(this::convertirDocumento)
                        .toList();

        Map<String, Object> respuesta =
                new LinkedHashMap<>();

        respuesta.put(
                "estado",
                "correcto"
        );

        respuesta.put(
                "documentos",
                documentos
        );

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> crear(
            @RequestHeader(value = "X-Usuario-Id", required = false)
            Integer idUsuarioActivo,

            @RequestBody Map<String, Object> datos
    ) {
        Usuario activo = obtenerUsuario(idUsuarioActivo);

        if (activo == null) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        Integer idObjetivo =
                entero(datos.get("idUsuario"));

        if (idObjetivo == null) {
            idObjetivo = activo.getId();
        }

        if (!idObjetivo.equals(activo.getId())
                && !esAdministrador(activo)) {

            return error(
                    HttpStatus.FORBIDDEN,
                    "No tienes permiso para cargar documentos de otro usuario."
            );
        }

        if (!usuarioRepository.existsById(idObjetivo)) {
            return error(
                    HttpStatus.NOT_FOUND,
                    "No se encontró el usuario del documento."
            );
        }

        String tipo =
                texto(datos, "tipoDocumento");

        String nombreArchivo =
                texto(datos, "nombreArchivo");

        String archivoBase64 =
                texto(datos, "archivoBase64");

        if (vacio(tipo)
                || vacio(nombreArchivo)
                || vacio(archivoBase64)) {

            return error(
                    HttpStatus.BAD_REQUEST,
                    "Tipo, nombre y contenido del documento son obligatorios."
            );
        }

        if (archivoBase64.length() > 8_000_000) {
            return error(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "El documento es demasiado grande. El máximo recomendado es 4 MB."
            );
        }

        boolean generado =
                booleano(datos.get("generadoAutomaticamente"));

        String estado =
                generado && esAdministrador(activo)
                        ? "Liberada"
                        : "Pendiente";

        if (esAdministrador(activo)
                && texto(datos, "estado") != null) {

            estado = texto(datos, "estado");
        }

        if (generado && esAdministrador(activo)) {
            // Dos administradores o un reintento no deben generar la misma carta dos veces.
            jdbc.queryForObject("SELECT id_usuario FROM usuarios WHERE id_usuario=? FOR UPDATE", Integer.class, idObjetivo);
            Map<?,?> academicos = datos.get("datosAcademicos") instanceof Map<?,?> m ? m : Map.of();
            String inicio = fechaClaveCarta(academicos.get("fechaInicio"));
            String fin = fechaClaveCarta(academicos.get("fechaFin"));
            List<Map<String,Object>> anteriores = jdbc.queryForList("""
                    SELECT id_documento AS id FROM documentos_usuario
                    WHERE id_usuario=? AND tipo_documento=? AND generado_automaticamente=TRUE
                      AND estado='Liberada'
                      AND COALESCE(LEFT(JSON_UNQUOTE(JSON_EXTRACT(
                          CASE WHEN JSON_VALID(datos_academicos_json) THEN datos_academicos_json ELSE '{}' END,
                          '$.fechaInicio')),10),'')=?
                      AND COALESCE(LEFT(JSON_UNQUOTE(JSON_EXTRACT(
                          CASE WHEN JSON_VALID(datos_academicos_json) THEN datos_academicos_json ELSE '{}' END,
                          '$.fechaFin')),10),'')=?
                    ORDER BY id_documento DESC LIMIT 1
                    """, idObjetivo,tipo,inicio,fin);
            if (!anteriores.isEmpty()) {
                int existente = ((Number)anteriores.getFirst().get("id")).intValue();
                return ResponseEntity.ok(Map.of("estado","correcto","yaExistente",true,
                        "mensaje","La carta ya estaba liberada para este periodo.","documento",obtenerDocumento(existente)));
            }
        }

        jdbc.update("""
                INSERT INTO documentos_usuario (
                    id_usuario,
                    tipo_documento,
                    nombre_archivo,
                    archivo_base64,
                    mime_type,
                    estado,
                    observaciones,
                    generado_automaticamente,
                    id_usuario_revisor,
                    datos_academicos_json,
                    datos_generados_json,
                    fecha_revision
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,

                idObjetivo,
                tipo,
                nombreArchivo,
                archivoBase64,
                texto(datos, "mimeType"),
                estado,
                texto(datos, "observaciones"),
                generado,
                generado && esAdministrador(activo)
                        ? activo.getId()
                        : null,
                json(datos.get("datosAcademicos")),
                json(datos.get("datosGenerados")),
                generado && esAdministrador(activo)
                        ? Timestamp.valueOf(LocalDateTime.now())
                        : null
        );

        Integer id =
                jdbc.queryForObject(
                        "SELECT LAST_INSERT_ID()",
                        Integer.class
                );

        Map<String, Object> respuesta =
                new LinkedHashMap<>();

        respuesta.put(
                "estado",
                "correcto"
        );

        respuesta.put(
                "mensaje",
                "Documento guardado correctamente."
        );

        respuesta.put(
                "documento",
                obtenerDocumento(id)
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    @PutMapping("/{id}/revision")
    @Transactional
    public ResponseEntity<Map<String, Object>> revisar(
            @PathVariable Integer id,

            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo,

            @RequestBody Map<String, Object> datos
    ) {
        Usuario activo =
                obtenerUsuario(idUsuarioActivo);

        if (activo == null) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        if (!esAdministrador(activo)) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "Solo un administrador puede revisar documentos."
            );
        }

        String estado =
                texto(datos, "estado");

        if (!Set.of(
                "Pendiente",
                "Aceptado",
                "Rechazado",
                "Liberada"
        ).contains(estado)) {

            return error(
                    HttpStatus.BAD_REQUEST,
                    "Estado de documento no válido."
            );
        }

        /*
         * Obtenemos el documento actual antes de modificarlo.
         */
        Map<String, Object> documentoActual;

        try {

            documentoActual =
                    obtenerDocumento(id);

        } catch (Exception ex) {

            return error(
                    HttpStatus.NOT_FOUND,
                    "No se encontró el documento."
            );
        }

        /*
         * Guardamos el estado anterior para evitar
         * enviar nuevamente el correo si la carta
         * ya estaba liberada.
         */
        String estadoAnterior =
                String.valueOf(
                        documentoActual.getOrDefault(
                                "estado",
                                ""
                        )
                );

        String tipoDocumento =
                String.valueOf(
                        documentoActual.getOrDefault(
                                "tipoDocumento",
                                ""
                        )
                );

        String correoAlumno =
                String.valueOf(
                        documentoActual.getOrDefault(
                                "colaboradorCorreo",
                                ""
                        )
                );

        String nombreAlumno =
                String.valueOf(
                        documentoActual.getOrDefault(
                                "colaboradorNombre",
                                "Alumno"
                        )
                );

        String nombreArchivo =
                String.valueOf(
                        documentoActual.getOrDefault(
                                "nombreArchivo",
                                "Carta_de_aceptacion.html"
                        )
                );

        String archivoBase64 =
                String.valueOf(
                        documentoActual.getOrDefault(
                                "archivoBase64",
                                ""
                        )
                );

        /*
         * Actualizamos primero el documento.
         *
         * Esto garantiza que la carta quede liberada
         * y disponible para el alumno en Documentos.
         */
        int filas = jdbc.update("""
                UPDATE documentos_usuario
                SET estado=?,
                    observaciones=?,
                    id_usuario_revisor=?,
                    fecha_revision=NOW()
                WHERE id_documento=?
                """,

                estado,
                texto(datos, "observaciones"),
                activo.getId(),
                id
        );

        if (filas == 0) {
            return error(
                    HttpStatus.NOT_FOUND,
                    "No se encontró el documento."
            );
        }

        /*
         * Verificamos si se trata de una Carta de aceptación.
         */
        boolean esCartaAceptacion =
                "Carta de aceptación"
                        .equalsIgnoreCase(tipoDocumento);

        boolean correoEnviado = false;

        /*
         * El correo solamente se envía cuando:
         *
         * 1. El nuevo estado es Liberada.
         * 2. Antes NO estaba Liberada.
         * 3. Es una Carta de aceptación.
         *
         * De esta forma evitamos correos duplicados.
         */
        boolean debeEnviarCorreo =
                "Liberada".equalsIgnoreCase(estado)
                        && !"Liberada".equalsIgnoreCase(estadoAnterior)
                        && esCartaAceptacion;

        if (debeEnviarCorreo) {

            /*
             * Si el alumno no tiene correo, la carta
             * permanece liberada en Documentos.
             */
            if (correoAlumno == null
                    || correoAlumno.isBlank()
                    || "null".equalsIgnoreCase(correoAlumno)) {

                Map<String, Object> respuesta =
                        new LinkedHashMap<>();

                respuesta.put(
                        "estado",
                        "advertencia"
                );

                respuesta.put(
                        "mensaje",
                        "La carta fue liberada y aparece en Documentos, pero el alumno no tiene un correo registrado."
                );

                respuesta.put(
                        "correoEnviado",
                        false
                );

                respuesta.put(
                        "documento",
                        obtenerDocumento(id)
                );

                return ResponseEntity.ok(respuesta);
            }

            /*
             * Verificamos que exista el archivo almacenado.
             */
            if (archivoBase64 == null
                    || archivoBase64.isBlank()
                    || "null".equalsIgnoreCase(archivoBase64)) {

                Map<String, Object> respuesta =
                        new LinkedHashMap<>();

                respuesta.put(
                        "estado",
                        "advertencia"
                );

                respuesta.put(
                        "mensaje",
                        "La carta fue liberada y aparece en Documentos, pero no contiene un archivo para enviar por correo."
                );

                respuesta.put(
                        "correoEnviado",
                        false
                );

                respuesta.put(
                        "documento",
                        obtenerDocumento(id)
                );

                return ResponseEntity.ok(respuesta);
            }

            try {

                /*
                 * La carta normalmente está almacenada como:
                 *
                 * data:text/html;base64,XXXXX
                 *
                 * Eliminamos la parte anterior al Base64.
                 */
                String contenidoBase64 =
                        archivoBase64;

                int posicionBase64 =
                        contenidoBase64.indexOf(";base64,");

                if (posicionBase64 >= 0) {

                    contenidoBase64 =
                            contenidoBase64.substring(
                                    posicionBase64 + 8
                            );
                }

                /*
                 * Convertimos el Base64 a bytes.
                 */
                byte[] contenidoBytes =
                        Base64.getDecoder()
                                .decode(contenidoBase64);

                /*
                 * Convertimos los bytes a HTML.
                 */
                String contenidoHTML =
                        new String(
                                contenidoBytes,
                                StandardCharsets.UTF_8
                        );

                /*
                 * Enviamos EXACTAMENTE la misma carta
                 * que está almacenada en documentos_usuario.
                 */
                correoService.enviarCartaAceptacion(
                        correoAlumno,
                        nombreAlumno,
                        nombreArchivo,
                        contenidoHTML
                );

                correoEnviado = true;

            } catch (Exception ex) {

                System.err.println(
                        "La carta fue liberada, pero no pudo enviarse por correo."
                );

                ex.printStackTrace();

                Map<String, Object> respuesta =
                        new LinkedHashMap<>();

                respuesta.put(
                        "estado",
                        "advertencia"
                );

                respuesta.put(
                        "mensaje",
                        "La carta fue liberada y aparece en Documentos, pero no fue posible enviarla por correo."
                );

                respuesta.put(
                        "correoEnviado",
                        false
                );

                respuesta.put(
                        "documento",
                        obtenerDocumento(id)
                );

                /*
                 * IMPORTANTE:
                 *
                 * Regresamos 200 porque la liberación
                 * sí fue exitosa.
                 *
                 * El problema únicamente fue el envío
                 * adicional por correo.
                 */
                return ResponseEntity
                        .ok(respuesta);
            }
        }

        Map<String, Object> respuesta =
                new LinkedHashMap<>();

        respuesta.put(
                "estado",
                "correcto"
        );

        if (correoEnviado) {

            respuesta.put(
                    "mensaje",
                    "Carta de aceptación liberada y enviada correctamente al alumno."
            );

        } else if ("Liberada".equalsIgnoreCase(estado)
                && esCartaAceptacion) {

            respuesta.put(
                    "mensaje",
                    "Carta de aceptación liberada correctamente y disponible en Documentos."
            );

        } else {

            respuesta.put(
                    "mensaje",
                    "Revisión guardada correctamente."
            );
        }

        respuesta.put(
                "correoEnviado",
                correoEnviado
        );

        respuesta.put(
                "documento",
                obtenerDocumento(id)
        );

        return ResponseEntity.ok(respuesta);
    }

    private String fechaClaveCarta(Object valor) {
        String fecha = Objects.toString(valor, "").trim();
        return fecha.length() > 10 ? fecha.substring(0,10) : fecha;
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> eliminar(
            @PathVariable Integer id,

            @RequestHeader(
                    value = "X-Usuario-Id",
                    required = false
            )
            Integer idUsuarioActivo
    ) {
        Usuario activo =
                obtenerUsuario(idUsuarioActivo);

        if (activo == null) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        if (!esAdministrador(activo)) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "Solo un administrador puede eliminar documentos."
            );
        }

        int filas =
                jdbc.update(
                        "DELETE FROM documentos_usuario WHERE id_documento=?",
                        id
                );

        if (filas == 0) {
            return error(
                    HttpStatus.NOT_FOUND,
                    "No se encontró el documento."
            );
        }

        return ResponseEntity.ok(
                Map.of(
                        "estado",
                        "correcto",
                        "mensaje",
                        "Documento eliminado correctamente."
                )
        );
    }

    private String consultaBase() {
        return """
                SELECT
                    d.id_documento AS id,
                    d.id_usuario AS idUsuario,
                    m.id_miembro AS idMiembro,

                    CONCAT_WS(
                        ' ',
                        u.nombre,
                        u.apellido_paterno,
                        u.apellido_materno
                    ) AS colaboradorNombre,

                    u.correo AS colaboradorCorreo,

                    /*
                     * Fecha real de registro del usuario.
                     */
                    u.fecha_registro AS fechaRegistro,

                    d.tipo_documento AS tipoDocumento,
                    d.nombre_archivo AS nombreArchivo,
                    d.archivo_base64 AS archivoBase64,
                    d.mime_type AS mimeType,
                    d.estado,
                    d.observaciones,

                    d.generado_automaticamente
                        AS generadoAutomaticamente,

                    d.id_usuario_revisor
                        AS idUsuarioRevisor,

                    d.fecha_subida
                        AS fechaSubida,

                    d.fecha_revision
                        AS fechaRevision,

                    d.datos_academicos_json
                        AS datosAcademicosJson,

                    d.datos_generados_json
                        AS datosGeneradosJson

                FROM documentos_usuario d

                JOIN usuarios u
                    ON u.id_usuario = d.id_usuario

                LEFT JOIN miembros_equipo m
                    ON m.id_usuario = u.id_usuario
                """;
    }

    private Map<String, Object> obtenerDocumento(
            Integer id
    ) {
        Map<String, Object> fila =
                jdbc.queryForMap(
                        consultaBase()
                                + " WHERE d.id_documento=?",
                        id
                );

        return convertirDocumento(fila);
    }

    private Map<String, Object> convertirDocumento(
            Map<String, Object> fila
    ) {
        Map<String, Object> d =
                new LinkedHashMap<>(fila);

        Object academicos =
                d.remove("datosAcademicosJson");

        Object generados =
                d.remove("datosGeneradosJson");

        d.put(
                "datosAcademicos",
                leerJson(academicos)
        );

        d.put(
                "datosGenerados",
                leerJson(generados)
        );

        return d;
    }

    private Object leerJson(
            Object valor
    ) {
        if (valor == null
                || String.valueOf(valor).isBlank()) {

            return Map.of();
        }

        try {

            return objectMapper.readValue(
                    String.valueOf(valor),
                    new TypeReference<Map<String, Object>>() {}
            );

        } catch (JacksonException e) {

            return Map.of();
        }
    }

    private String json(
            Object valor
    ) {
        if (valor == null) {
            return null;
        }

        try {

            return objectMapper.writeValueAsString(
                    valor
            );

        } catch (JacksonException e) {

            return null;
        }
    }

    private Usuario obtenerUsuario(
            Integer id
    ) {
        return id == null
                ? null
                : usuarioRepository
                        .findById(id)
                        .orElse(null);
    }

    private boolean esAdministrador(
            Usuario u
    ) {
        if (u == null
                || u.getRol() == null
                || u.getRol().getNombre() == null) {

            return false;
        }

        String r =
                u.getRol()
                        .getNombre()
                        .trim()
                        .toLowerCase(Locale.ROOT);

        return Set.of(
                "superadministrador",
                "administrador",
                "admin pmo",
                "administrador pmo",
                "admin_pmo"
        ).contains(r);
    }

    private String texto(
            Map<String, Object> d,
            String k
    ) {
        Object v = d.get(k);

        return v == null
                ? null
                : String.valueOf(v).trim();
    }

    private boolean vacio(
            String v
    ) {
        return v == null
                || v.isBlank();
    }

    private Integer entero(
            Object v
    ) {
        try {

            return v == null
                    ? null
                    : Integer.valueOf(
                            String.valueOf(v)
                    );

        } catch (Exception e) {

            return null;
        }
    }

    private boolean booleano(
            Object v
    ) {
        return v != null
                && (
                    v instanceof Boolean b
                            ? b
                            : Boolean.parseBoolean(
                                    String.valueOf(v)
                            )
                );
    }

    private ResponseEntity<Map<String, Object>> error(
            HttpStatus s,
            String m
    ) {
        Map<String, Object> r =
                new LinkedHashMap<>();

        r.put(
                "estado",
                "error"
        );

        r.put(
                "mensaje",
                m
        );

        return ResponseEntity
                .status(s)
                .body(r);
    }
}
