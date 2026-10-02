package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/datos-registro")
@CrossOrigin(origins = "*")
public class DatosAcademicosController {

    private final JdbcTemplate jdbc;
    private final UsuarioRepository usuarioRepository;

    public DatosAcademicosController(
            JdbcTemplate jdbc,
            UsuarioRepository usuarioRepository
    ) {
        this.jdbc = jdbc;
        this.usuarioRepository = usuarioRepository;
    }

    // =========================================================
    // OBTENER LOS DATOS DEL USUARIO ACTUAL
    // =========================================================
    @GetMapping("/mi-sesion")
    public ResponseEntity<Map<String, Object>> obtenerPropios(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario
    ) {

        if (idUsuario == null || !usuarioRepository.existsById(idUsuario)) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        return ResponseEntity.ok(respuestaDatos(idUsuario));
    }


    // =========================================================
    // OBTENER LOS DATOS DE UN USUARIO ESPECÍFICO
    // =========================================================
    @GetMapping("/usuario/{idUsuarioObjetivo}")
    public ResponseEntity<Map<String, Object>> obtenerPorUsuario(
            @PathVariable Integer idUsuarioObjetivo,
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo
    ) {

        Usuario activo = obtenerUsuario(idUsuarioActivo);

        if (activo == null) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        // El usuario puede consultar sus propios datos.
        // Un administrador puede consultar los datos de cualquier usuario.
        if (
                !activo.getId().equals(idUsuarioObjetivo)
                && !esAdministrador(activo)
        ) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "No tienes permiso para consultar esos datos."
            );
        }

        if (!usuarioRepository.existsById(idUsuarioObjetivo)) {
            return error(
                    HttpStatus.NOT_FOUND,
                    "No se encontró el usuario solicitado."
            );
        }

        return ResponseEntity.ok(respuestaDatos(idUsuarioObjetivo));
    }


    // =========================================================
    // GUARDAR LOS DATOS DEL USUARIO ESPECÍFICO
    // =========================================================
    @PutMapping("/usuario/{idUsuarioObjetivo}")
    @Transactional
    public ResponseEntity<Map<String, Object>> guardarPorUsuario(
            @PathVariable Integer idUsuarioObjetivo,
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo,
            @RequestBody Map<String, Object> datos
    ) {

        Usuario activo = obtenerUsuario(idUsuarioActivo);

        if (activo == null) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        // El usuario puede guardar sus propios datos.
        // El administrador puede guardar los datos de cualquier usuario.
        if (
                !activo.getId().equals(idUsuarioObjetivo)
                && !esAdministrador(activo)
        ) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "No tienes permiso para modificar esos datos."
            );
        }

        if (!usuarioRepository.existsById(idUsuarioObjetivo)) {
            return error(
                    HttpStatus.NOT_FOUND,
                    "No se encontró el usuario solicitado."
            );
        }

        // =====================================================
        // DATOS OBLIGATORIOS
        // =====================================================

        String nombreCompleto = texto(datos, "nombreCompleto");
        String matricula = texto(datos, "matricula");
        String universidad = texto(datos, "universidad");
        String carrera = texto(datos, "carrera");
        String cuatrimestre = texto(datos, "cuatrimestre");

        if (
                vacio(nombreCompleto)
                || vacio(matricula)
                || vacio(universidad)
                || vacio(carrera)
                || vacio(cuatrimestre)
        ) {

            return error(
                    HttpStatus.BAD_REQUEST,
                    "Nombre, matrícula, universidad, carrera y cuatrimestre son obligatorios."
            );
        }


        // =====================================================
        // TELÉFONO
        // =====================================================

        String telefono = texto(datos, "telefono");


        // =====================================================
        // FECHAS
        // =====================================================

        Date fechaInicio = fecha(datos.get("fechaInicio"));
        Date fechaFin = fecha(datos.get("fechaFin"));

        if (
                fechaInicio != null
                && fechaFin != null
                && fechaFin.before(fechaInicio)
        ) {

            return error(
                    HttpStatus.BAD_REQUEST,
                    "La fecha de término no puede ser anterior a la fecha de inicio."
            );
        }


        // =====================================================
        // GUARDAR EN BASE DE DATOS
        // =====================================================

        jdbc.update(
                """
                INSERT INTO datos_academicos_usuario (
                    id_usuario,
                    matricula,
                    nombre_completo,
                    universidad,
                    carrera,
                    cuatrimestre,
                    grupo,
                    correo_institucional,
                    telefono,
                    area,
                    periodo_estadia,
                    fecha_inicio,
                    fecha_fin,
                    asesor_academico,
                    asesor_empresarial,
                    responsable_empresa,
                    horas_comprometidas
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
                ON DUPLICATE KEY UPDATE
                    matricula = VALUES(matricula),
                    nombre_completo = VALUES(nombre_completo),
                    universidad = VALUES(universidad),
                    carrera = VALUES(carrera),
                    cuatrimestre = VALUES(cuatrimestre),
                    grupo = VALUES(grupo),
                    correo_institucional = VALUES(correo_institucional),
                    telefono = VALUES(telefono),
                    area = VALUES(area),
                    periodo_estadia = VALUES(periodo_estadia),
                    fecha_inicio = VALUES(fecha_inicio),
                    fecha_fin = VALUES(fecha_fin),
                    asesor_academico = VALUES(asesor_academico),
                    asesor_empresarial = VALUES(asesor_empresarial),
                    responsable_empresa = VALUES(responsable_empresa),
                    horas_comprometidas = VALUES(horas_comprometidas)
                """,

                idUsuarioObjetivo,

                matricula,
                nombreCompleto,
                universidad,
                carrera,
                cuatrimestre,

                texto(datos, "grupo"),
                texto(datos, "correoInstitucional"),

                // TELÉFONO
                telefono,

                texto(datos, "area"),
                texto(datos, "periodoEstadia"),

                // FECHA DE INICIO
                fechaInicio,

                // FECHA DE TÉRMINO
                fechaFin,

                texto(datos, "asesorAcademico"),
                texto(datos, "asesorEmpresarial"),
                texto(datos, "responsableEmpresa"),

                entero(datos.get("horas"), 600)
        );


        // =====================================================
        // DEVOLVER LOS DATOS YA GUARDADOS
        // =====================================================

        Map<String, Object> respuesta =
                respuestaDatos(idUsuarioObjetivo);

        respuesta.put(
                "mensaje",
                "Datos de registro guardados correctamente."
        );

        return ResponseEntity.ok(respuesta);
    }


    // =========================================================
    // GUARDAR LOS DATOS DEL USUARIO DE LA SESIÓN
    // =========================================================
    @PutMapping("/mi-sesion")
    @Transactional
    public ResponseEntity<Map<String, Object>> guardarPropios(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario,
            @RequestBody Map<String, Object> datos
    ) {

        if (idUsuario == null || !usuarioRepository.existsById(idUsuario)) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró una sesión activa."
            );
        }

        return guardarDatosInternos(
                idUsuario,
                datos
        );
    }


    // =========================================================
    // MÉTODO INTERNO PARA GUARDAR
    // =========================================================
    private ResponseEntity<Map<String, Object>> guardarDatosInternos(
            Integer idUsuario,
            Map<String, Object> datos
    ) {

        String nombreCompleto = texto(datos, "nombreCompleto");
        String matricula = texto(datos, "matricula");
        String universidad = texto(datos, "universidad");
        String carrera = texto(datos, "carrera");
        String cuatrimestre = texto(datos, "cuatrimestre");

        if (
                vacio(nombreCompleto)
                || vacio(matricula)
                || vacio(universidad)
                || vacio(carrera)
                || vacio(cuatrimestre)
        ) {

            return error(
                    HttpStatus.BAD_REQUEST,
                    "Nombre, matrícula, universidad, carrera y cuatrimestre son obligatorios."
            );
        }


        // =====================================================
        // TELÉFONO
        // =====================================================

        String telefono = texto(datos, "telefono");


        // =====================================================
        // FECHAS
        // =====================================================

        Date fechaInicio = fecha(datos.get("fechaInicio"));
        Date fechaFin = fecha(datos.get("fechaFin"));

        if (
                fechaInicio != null
                && fechaFin != null
                && fechaFin.before(fechaInicio)
        ) {

            return error(
                    HttpStatus.BAD_REQUEST,
                    "La fecha de término no puede ser anterior a la fecha de inicio."
            );
        }


        // =====================================================
        // INSERTAR / ACTUALIZAR
        // =====================================================

        jdbc.update(
                """
                INSERT INTO datos_academicos_usuario (
                    id_usuario,
                    matricula,
                    nombre_completo,
                    universidad,
                    carrera,
                    cuatrimestre,
                    grupo,
                    correo_institucional,
                    telefono,
                    area,
                    periodo_estadia,
                    fecha_inicio,
                    fecha_fin,
                    asesor_academico,
                    asesor_empresarial,
                    responsable_empresa,
                    horas_comprometidas
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
                ON DUPLICATE KEY UPDATE
                    matricula = VALUES(matricula),
                    nombre_completo = VALUES(nombre_completo),
                    universidad = VALUES(universidad),
                    carrera = VALUES(carrera),
                    cuatrimestre = VALUES(cuatrimestre),
                    grupo = VALUES(grupo),
                    correo_institucional = VALUES(correo_institucional),
                    telefono = VALUES(telefono),
                    area = VALUES(area),
                    periodo_estadia = VALUES(periodo_estadia),
                    fecha_inicio = VALUES(fecha_inicio),
                    fecha_fin = VALUES(fecha_fin),
                    asesor_academico = VALUES(asesor_academico),
                    asesor_empresarial = VALUES(asesor_empresarial),
                    responsable_empresa = VALUES(responsable_empresa),
                    horas_comprometidas = VALUES(horas_comprometidas)
                """,

                idUsuario,
                matricula,
                nombreCompleto,
                universidad,
                carrera,
                cuatrimestre,

                texto(datos, "grupo"),
                texto(datos, "correoInstitucional"),

                telefono,

                texto(datos, "area"),
                texto(datos, "periodoEstadia"),

                fechaInicio,
                fechaFin,

                texto(datos, "asesorAcademico"),
                texto(datos, "asesorEmpresarial"),
                texto(datos, "responsableEmpresa"),

                entero(datos.get("horas"), 600)
        );


        Map<String, Object> respuesta =
                respuestaDatos(idUsuario);

        respuesta.put(
                "mensaje",
                "Datos académicos guardados correctamente."
        );

        return ResponseEntity.ok(respuesta);
    }


    // =========================================================
    // OBTENER DATOS GUARDADOS
    // =========================================================
    private Map<String, Object> respuestaDatos(
            Integer idUsuario
    ) {

        Map<String, Object> respuesta =
                new LinkedHashMap<>();

        respuesta.put(
                "estado",
                "correcto"
        );

        try {

            Map<String, Object> datos =
                    jdbc.queryForMap(
                            """
                            SELECT
                                id_usuario AS idUsuario,
                                matricula,
                                nombre_completo AS nombreCompleto,
                                universidad,
                                carrera,
                                cuatrimestre,
                                grupo,
                                correo_institucional AS correoInstitucional,
                                telefono,
                                area,
                                periodo_estadia AS periodoEstadia,
                                fecha_inicio AS fechaInicio,
                                fecha_fin AS fechaFin,
                                asesor_academico AS asesorAcademico,
                                asesor_empresarial AS asesorEmpresarial,
                                responsable_empresa AS responsableEmpresa,
                                horas_comprometidas AS horas,
                                fecha_actualizacion AS fechaActualizacion
                            FROM datos_academicos_usuario
                            WHERE id_usuario = ?
                            """,
                            idUsuario
                    );

            datos.put(
                    "completo",
                    true
            );

            respuesta.put(
                    "datos",
                    datos
            );

            respuesta.put(
                    "completo",
                    true
            );

        } catch (EmptyResultDataAccessException e) {

            respuesta.put(
                    "datos",
                    null
            );

            respuesta.put(
                    "completo",
                    false
            );
        }

        return respuesta;
    }


    // =========================================================
    // BUSCAR USUARIO
    // =========================================================
    private Usuario obtenerUsuario(Integer id) {

        return id == null
                ? null
                : usuarioRepository
                    .findById(id)
                    .orElse(null);
    }


    // =========================================================
    // COMPROBAR ADMINISTRADOR
    // =========================================================
    private boolean esAdministrador(
            Usuario usuario
    ) {

        if (
                usuario == null
                || usuario.getRol() == null
                || usuario.getRol().getNombre() == null
        ) {
            return false;
        }

        String rol =
                usuario.getRol()
                        .getNombre()
                        .trim()
                        .toLowerCase(Locale.ROOT);

        return rol.equals("administrador")
                || rol.equals("admin pmo")
                || rol.equals("administrador pmo")
                || rol.equals("admin_pmo")
                || rol.equals("superadministrador");
    }


    // =========================================================
    // OBTENER TEXTO
    // =========================================================
    private String texto(
            Map<String, Object> datos,
            String clave
    ) {

        Object valor =
                datos.get(clave);

        return valor == null
                ? null
                : String.valueOf(valor).trim();
    }


    // =========================================================
    // COMPROBAR VACÍO
    // =========================================================
    private boolean vacio(
            String valor
    ) {

        return valor == null
                || valor.isBlank();
    }


    // =========================================================
    // CONVERTIR FECHA
    // =========================================================
    private Date fecha(
            Object valor
    ) {

        if (
                valor == null
                || String.valueOf(valor).isBlank()
        ) {
            return null;
        }

        try {

            return Date.valueOf(
                    String.valueOf(valor).trim()
            );

        } catch (IllegalArgumentException e) {

            return null;
        }
    }


    // =========================================================
    // CONVERTIR ENTERO
    // =========================================================
    private int entero(
            Object valor,
            int defecto
    ) {

        try {

            return valor == null
                    ? defecto
                    : Integer.parseInt(
                            String.valueOf(valor)
                    );

        } catch (NumberFormatException e) {

            return defecto;
        }
    }


    // =========================================================
    // RESPUESTA DE ERROR
    // =========================================================
    private ResponseEntity<Map<String, Object>> error(
            HttpStatus status,
            String mensaje
    ) {

        Map<String, Object> respuesta =
                new LinkedHashMap<>();

        respuesta.put(
                "estado",
                "error"
        );

        respuesta.put(
                "mensaje",
                mensaje
        );

        return ResponseEntity
                .status(status)
                .body(respuesta);
    }
}