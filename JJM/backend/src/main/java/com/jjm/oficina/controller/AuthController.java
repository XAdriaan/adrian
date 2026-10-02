package com.jjm.oficina.controller;

import com.jjm.oficina.dto.LoginRequest;
import com.jjm.oficina.dto.RegistroRequest;
import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.Rol;
import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.RolRepository;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.SesionService;
import com.jjm.oficina.servicio.CorreoService;
import com.jjm.oficina.servicio.PermisosService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final MiembroEquipoRepository miembroEquipoRepository;
    private final PasswordEncoder passwordEncoder;
    private final SesionService sesionService;
    private final CorreoService correoService;
    private final PermisosService permisosService;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Map<String, CodigoTemporal> CODIGOS_VERIFICACION = new ConcurrentHashMap<>();
    private static final Map<String, CodigoTemporal> CODIGOS_RECUPERACION = new ConcurrentHashMap<>();

    public AuthController(
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository,
            MiembroEquipoRepository miembroEquipoRepository,
            PasswordEncoder passwordEncoder,
            SesionService sesionService,
            CorreoService correoService,
            PermisosService permisosService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.passwordEncoder = passwordEncoder;
        this.sesionService = sesionService;
        this.correoService = correoService;
        this.permisosService = permisosService;
    }

    @PostMapping("/registro")
    @Transactional
    public ResponseEntity<Map<String, Object>> registrar(
            @Valid @RequestBody RegistroRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        String correoNormalizado = datos.getCorreo()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (usuarioRepository.existsByCorreoIgnoreCase(correoNormalizado)) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "Ya existe una cuenta registrada con ese correo.");

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(respuesta);
        }

        Optional<Rol> rolEncontrado = rolRepository.findByNombre("Colaborador");

        if (rolEncontrado.isEmpty()) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "No se encontró el rol Colaborador en la base de datos.");

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(respuesta);
        }

        Usuario usuario = new Usuario();

        usuario.setRol(rolEncontrado.get());
        usuario.setNombre(datos.getNombre().trim());
        usuario.setApellidoPaterno(limpiarTexto(datos.getApellidoPaterno()));
        usuario.setApellidoMaterno(limpiarTexto(datos.getApellidoMaterno()));
        usuario.setCorreo(correoNormalizado);
        usuario.setTelefono(limpiarTexto(datos.getTelefono()));
        usuario.setContrasena(passwordEncoder.encode(datos.getContrasena()));
        usuario.setIdioma("es");
        usuario.setEstado("Activo");
        usuario.setAutenticacionActiva(false);
        usuario.setMetodoAutenticacion(null);
        usuario.setFechaAutenticacion(null);

        Usuario usuarioGuardado = usuarioRepository.save(usuario);

        MiembroEquipo miembroCreado = crearPerfilMiembroAutomatico(usuarioGuardado);

        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Usuario registrado correctamente.");
        respuesta.put("usuario", convertirUsuario(usuarioGuardado, miembroCreado));

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(respuesta);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> iniciarSesion(
            @Valid @RequestBody LoginRequest datos
    ) {
        Map<String, Object> respuesta = new LinkedHashMap<>();

        String correoNormalizado = datos.getCorreo()
                .trim()
                .toLowerCase(Locale.ROOT);

        Optional<Usuario> usuarioEncontrado =
                usuarioRepository.findByCorreoIgnoreCase(correoNormalizado);

        if (usuarioEncontrado.isEmpty()) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "Correo o contraseña incorrectos.");

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        Usuario usuario = usuarioEncontrado.get();

        if (!"Activo".equalsIgnoreCase(usuario.getEstado())) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "La cuenta no está activa.");

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(respuesta);
        }

        boolean contrasenaCorrecta =
                passwordEncoder.matches(
                        datos.getContrasena(),
                        usuario.getContrasena()
                );

        if (!contrasenaCorrecta) {
            respuesta.put("estado", "error");
            respuesta.put("mensaje", "Correo o contraseña incorrectos.");

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(respuesta);
        }

        Optional<MiembroEquipo> miembroEncontrado =
                miembroEquipoRepository.findByUsuarioId(usuario.getId());

        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Inicio de sesión correcto.");
        respuesta.put(
                "usuario",
                convertirUsuario(
                        usuario,
                        miembroEncontrado.orElse(null)
                )
        );
        respuesta.put("token", sesionService.crearSesion(usuario.getId()));
        respuesta.put("expiraEnHoras", 12);

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> cerrarSesion(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        if (authorization != null && authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            sesionService.cerrarSesion(authorization.substring(7).trim());
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Sesión cerrada correctamente.");
        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/verificacion/solicitar")
    public ResponseEntity<Map<String, Object>> solicitarVerificacion(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo,
            @RequestBody Map<String, String> datos
    ) {
        Usuario usuario = obtenerUsuarioActivo(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(HttpStatus.UNAUTHORIZED, "No se encontró una sesión activa.");
        }

        String metodo = normalizarMetodo(datos.get("metodo"));

        if (metodo == null) {
            return respuestaError(HttpStatus.BAD_REQUEST, "Selecciona un método válido.");
        }

        if (!"correo".equals(metodo)) {
            return respuestaError(
                    HttpStatus.BAD_REQUEST,
                    "Por ahora la verificación real está disponible únicamente por correo electrónico."
            );
        }

        String codigo = generarCodigo();
        String claveCodigo = String.valueOf(usuario.getId());
        CODIGOS_VERIFICACION.put(
                claveCodigo,
                new CodigoTemporal(codigo, metodo, LocalDateTime.now().plusMinutes(10))
        );

        try {
            correoService.enviarCodigoVerificacion(
                    usuario.getCorreo(),
                    usuario.getNombre(),
                    codigo
            );
        } catch (Exception ex) {
            CODIGOS_VERIFICACION.remove(claveCodigo);
            return respuestaError(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No fue posible enviar el código al correo. Revisa la configuración de Gmail del servidor."
            );
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Código enviado al correo electrónico registrado.");
        respuesta.put("metodo", metodo);

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/verificacion/validar")
    @Transactional
    public ResponseEntity<Map<String, Object>> validarVerificacion(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo,
            @RequestBody Map<String, String> datos
    ) {
        Usuario usuario = obtenerUsuarioActivo(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(HttpStatus.UNAUTHORIZED, "No se encontró una sesión activa.");
        }

        String codigo = limpiarTexto(datos.get("codigo"));

        if (codigo == null) {
            return respuestaError(HttpStatus.BAD_REQUEST, "El código es obligatorio.");
        }

        CodigoTemporal codigoTemporal = CODIGOS_VERIFICACION.get(String.valueOf(usuario.getId()));

        if (codigoTemporal == null || codigoTemporal.estaVencido()) {
            return respuestaError(HttpStatus.BAD_REQUEST, "El código venció o no existe. Solicita uno nuevo.");
        }

        if (!codigoTemporal.getCodigo().equals(codigo)) {
            return respuestaError(HttpStatus.BAD_REQUEST, "El código ingresado no es correcto.");
        }

        usuario.setAutenticacionActiva(true);
        usuario.setMetodoAutenticacion(codigoTemporal.getMetodo());
        usuario.setFechaAutenticacion(LocalDateTime.now());

        Usuario usuarioGuardado = usuarioRepository.save(usuario);

        CODIGOS_VERIFICACION.remove(String.valueOf(usuario.getId()));

        Optional<MiembroEquipo> miembroEncontrado =
                miembroEquipoRepository.findByUsuarioId(usuarioGuardado.getId());

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Verificación activada correctamente.");
        respuesta.put("usuario", convertirUsuario(usuarioGuardado, miembroEncontrado.orElse(null)));

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/recuperacion/solicitar")
    public ResponseEntity<Map<String, Object>> solicitarRecuperacion(
            @RequestBody Map<String, String> datos
    ) {
        String correo = limpiarTexto(datos.get("correo"));

        if (correo == null) {
            return respuestaError(HttpStatus.BAD_REQUEST, "El correo electrónico es obligatorio.");
        }

        String correoNormalizado = correo.trim().toLowerCase(Locale.ROOT);

        Optional<Usuario> usuarioEncontrado =
                usuarioRepository.findByCorreoIgnoreCase(correoNormalizado);

        if (usuarioEncontrado.isEmpty()) {
            return respuestaError(HttpStatus.NOT_FOUND, "No existe una cuenta activa con ese correo.");
        }

        Usuario usuario = usuarioEncontrado.get();

        if (!"Activo".equalsIgnoreCase(usuario.getEstado())) {
            return respuestaError(HttpStatus.FORBIDDEN, "La cuenta no está activa.");
        }

        String codigo = generarCodigo();

        CODIGOS_RECUPERACION.put(
                correoNormalizado,
                new CodigoTemporal(codigo, "recuperacion", LocalDateTime.now().plusMinutes(10))
        );

        try {
            correoService.enviarCodigoRecuperacion(
                    correoNormalizado,
                    usuario.getNombre(),
                    codigo
            );
        } catch (Exception ex) {
            CODIGOS_RECUPERACION.remove(correoNormalizado);
            return respuestaError(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No fue posible enviar el código de recuperación. Revisa la configuración de Gmail del servidor."
            );
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Código de recuperación enviado al correo electrónico.");
        respuesta.put("correo", correoNormalizado);

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/recuperacion/validar-codigo")
    public ResponseEntity<Map<String, Object>> validarCodigoRecuperacion(
            @RequestBody Map<String, String> datos
    ) {
        String correo = limpiarTexto(datos.get("correo"));
        String codigo = limpiarTexto(datos.get("codigo"));

        if (correo == null || codigo == null) {
            return respuestaError(HttpStatus.BAD_REQUEST, "Correo y código son obligatorios.");
        }

        String correoNormalizado = correo.trim().toLowerCase(Locale.ROOT);

        CodigoTemporal codigoTemporal = CODIGOS_RECUPERACION.get(correoNormalizado);

        if (codigoTemporal == null || codigoTemporal.estaVencido()) {
            return respuestaError(HttpStatus.BAD_REQUEST, "El código venció o no existe. Solicita uno nuevo.");
        }

        if (!codigoTemporal.getCodigo().equals(codigo)) {
            return respuestaError(HttpStatus.BAD_REQUEST, "El código ingresado no es correcto.");
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Código validado correctamente.");

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/recuperacion/cambiar-password")
    @Transactional
    public ResponseEntity<Map<String, Object>> cambiarPasswordRecuperacion(
            @RequestBody Map<String, String> datos
    ) {
        String correo = limpiarTexto(datos.get("correo"));
        String codigo = limpiarTexto(datos.get("codigo"));
        String nuevaContrasena = datos.get("nuevaContrasena");

        if (correo == null || codigo == null || nuevaContrasena == null || nuevaContrasena.isBlank()) {
            return respuestaError(HttpStatus.BAD_REQUEST, "Correo, código y nueva contraseña son obligatorios.");
        }

        if (nuevaContrasena.length() < 6) {
            return respuestaError(HttpStatus.BAD_REQUEST, "La nueva contraseña debe tener al menos 6 caracteres.");
        }

        String correoNormalizado = correo.trim().toLowerCase(Locale.ROOT);

        CodigoTemporal codigoTemporal = CODIGOS_RECUPERACION.get(correoNormalizado);

        if (codigoTemporal == null || codigoTemporal.estaVencido()) {
            return respuestaError(HttpStatus.BAD_REQUEST, "El código venció o no existe. Solicita uno nuevo.");
        }

        if (!codigoTemporal.getCodigo().equals(codigo)) {
            return respuestaError(HttpStatus.BAD_REQUEST, "El código ingresado no es correcto.");
        }

        Optional<Usuario> usuarioEncontrado =
                usuarioRepository.findByCorreoIgnoreCase(correoNormalizado);

        if (usuarioEncontrado.isEmpty()) {
            return respuestaError(HttpStatus.NOT_FOUND, "No existe una cuenta con ese correo.");
        }

        Usuario usuario = usuarioEncontrado.get();

        usuario.setContrasena(passwordEncoder.encode(nuevaContrasena));

        usuarioRepository.save(usuario);
        CODIGOS_RECUPERACION.remove(correoNormalizado);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Contraseña actualizada correctamente. Ahora puedes iniciar sesión.");

        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/perfil/correo")
    @Transactional
    public ResponseEntity<Map<String, Object>> actualizarCorreo(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo,
            @RequestBody Map<String, String> datos
    ) {
        Usuario usuario = obtenerUsuarioSesion(authorization, idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(HttpStatus.UNAUTHORIZED, "La sesión no es válida o ya venció. Inicia sesión nuevamente.");
        }

        String correo = limpiarTexto(datos.get("correo"));
        String contrasenaActual = datos.get("contrasenaActual");

        if (correo == null) {
            return respuestaError(HttpStatus.BAD_REQUEST, "El nuevo correo electrónico es obligatorio.");
        }

        if (contrasenaActual == null || contrasenaActual.isBlank()) {
            return respuestaError(HttpStatus.BAD_REQUEST, "Ingresa tu contraseña actual para autorizar el cambio.");
        }

        String correoNormalizado = correo.trim().toLowerCase(Locale.ROOT);

        if (!correoNormalizado.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return respuestaError(HttpStatus.BAD_REQUEST, "Ingresa un correo electrónico válido.");
        }

        if (correoNormalizado.equalsIgnoreCase(usuario.getCorreo())) {
            return respuestaError(HttpStatus.BAD_REQUEST, "Ese correo ya está asociado a tu cuenta.");
        }

        if (!passwordEncoder.matches(contrasenaActual, usuario.getContrasena())) {
            return respuestaError(HttpStatus.UNAUTHORIZED, "La contraseña actual no es correcta.");
        }

        Optional<Usuario> usuarioConCorreo = usuarioRepository.findByCorreoIgnoreCase(correoNormalizado);
        if (usuarioConCorreo.isPresent() && !usuarioConCorreo.get().getId().equals(usuario.getId())) {
            return respuestaError(HttpStatus.CONFLICT, "Ese correo ya está registrado en otra cuenta.");
        }

        usuario.setCorreo(correoNormalizado);
        usuario.setAutenticacionActiva(false);
        usuario.setMetodoAutenticacion(null);
        usuario.setFechaAutenticacion(null);

        Usuario usuarioGuardado = usuarioRepository.save(usuario);

        Optional<MiembroEquipo> miembroEncontrado =
                miembroEquipoRepository.findByUsuarioId(usuarioGuardado.getId());

        if (miembroEncontrado.isPresent()) {
            MiembroEquipo miembro = miembroEncontrado.get();
            miembro.setCorreo(correoNormalizado);
            miembroEquipoRepository.save(miembro);
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Correo actualizado correctamente.");
        respuesta.put("usuario", convertirUsuario(usuarioGuardado, miembroEncontrado.orElse(null)));

        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/perfil/idioma")
    @Transactional
    public ResponseEntity<Map<String, Object>> actualizarIdioma(
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuarioActivo,
            @RequestBody Map<String, String> datos
    ) {
        Usuario usuario = obtenerUsuarioActivo(idUsuarioActivo);

        if (usuario == null) {
            return respuestaError(HttpStatus.UNAUTHORIZED, "No se encontró una sesión activa.");
        }

        String idioma = limpiarTexto(datos.get("idioma"));

        if (idioma == null) {
            return respuestaError(HttpStatus.BAD_REQUEST, "El idioma es obligatorio.");
        }

        usuario.setIdioma(idioma);

        Usuario usuarioGuardado = usuarioRepository.save(usuario);

        Optional<MiembroEquipo> miembroEncontrado =
                miembroEquipoRepository.findByUsuarioId(usuarioGuardado.getId());

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "correcto");
        respuesta.put("mensaje", "Idioma actualizado correctamente.");
        respuesta.put("usuario", convertirUsuario(usuarioGuardado, miembroEncontrado.orElse(null)));

        return ResponseEntity.ok(respuesta);
    }

    private MiembroEquipo crearPerfilMiembroAutomatico(Usuario usuario) {
        Optional<MiembroEquipo> miembroExistente =
                miembroEquipoRepository.findByUsuarioId(usuario.getId());

        if (miembroExistente.isPresent()) {
            return miembroExistente.get();
        }

        MiembroEquipo miembro = new MiembroEquipo();

        miembro.setUsuario(usuario);

        miembro.setNombreCompleto(construirNombreCompleto(usuario));
        miembro.setCorreo(usuario.getCorreo());
        miembro.setTelefono(usuario.getTelefono());

        miembro.setRol("Colaborador");
        miembro.setSeniority("Junior");
        miembro.setHorasDisponibles(BigDecimal.ZERO);

        miembro.setHabilidades("");
        miembro.setNotas("");
        miembro.setEstado("Activo");

        return miembroEquipoRepository.save(miembro);
    }

    private Usuario obtenerUsuarioActivo(Integer idUsuarioActivo) {
        if (idUsuarioActivo == null) {
            return null;
        }

        return usuarioRepository.findById(idUsuarioActivo)
                .orElse(null);
    }

    private Usuario obtenerUsuarioSesion(String authorization, Integer idUsuarioActivo) {
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }

        String token = authorization.substring(7).trim();
        Integer idUsuarioSesion = sesionService.obtenerUsuario(token);

        if (idUsuarioSesion == null) {
            return null;
        }

        if (idUsuarioActivo != null && !idUsuarioSesion.equals(idUsuarioActivo)) {
            return null;
        }

        return usuarioRepository.findById(idUsuarioSesion).orElse(null);
    }

    private String construirNombreCompleto(Usuario usuario) {
        StringBuilder nombreCompleto = new StringBuilder();

        agregarParteNombre(nombreCompleto, usuario.getNombre());
        agregarParteNombre(nombreCompleto, usuario.getApellidoPaterno());
        agregarParteNombre(nombreCompleto, usuario.getApellidoMaterno());

        return nombreCompleto.toString().trim();
    }

    private void agregarParteNombre(StringBuilder destino, String valor) {
        if (valor == null || valor.isBlank()) {
            return;
        }

        if (!destino.isEmpty()) {
            destino.append(" ");
        }

        destino.append(valor.trim());
    }

    private String limpiarTexto(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }

        return valor.trim();
    }

    private String normalizarMetodo(String metodo) {
        if (metodo == null || metodo.isBlank()) {
            return null;
        }

        String texto = metodo.trim().toLowerCase(Locale.ROOT);

        if (texto.equals("correo") || texto.equals("email")) {
            return "correo";
        }

        return null;
    }

    private String generarCodigo() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
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

    private Map<String, Object> convertirUsuario(
            Usuario usuario,
            MiembroEquipo miembro
    ) {
        Map<String, Object> usuarioRespuesta = new LinkedHashMap<>();

        usuarioRespuesta.put("id", usuario.getId());
        usuarioRespuesta.put("idUsuario", usuario.getId());

        usuarioRespuesta.put("nombre", usuario.getNombre());
        usuarioRespuesta.put("apellidoPaterno", usuario.getApellidoPaterno());
        usuarioRespuesta.put("apellidoMaterno", usuario.getApellidoMaterno());
        usuarioRespuesta.put("nombreCompleto", construirNombreCompleto(usuario));

        usuarioRespuesta.put("correo", usuario.getCorreo());
        usuarioRespuesta.put("telefono", usuario.getTelefono());

        if (usuario.getRol() != null) {
            usuarioRespuesta.put("rol", usuario.getRol().getNombre());
            usuarioRespuesta.put("idRol", usuario.getRol().getId());
            usuarioRespuesta.put("permisos", permisosService.listarClaves(usuario));
            usuarioRespuesta.put("superadministrador", permisosService.esSuperadministrador(usuario));
        } else {
            usuarioRespuesta.put("rol", "");
            usuarioRespuesta.put("idRol", null);
            usuarioRespuesta.put("permisos", java.util.List.of());
            usuarioRespuesta.put("superadministrador", false);
        }

        usuarioRespuesta.put("estado", usuario.getEstado());
        usuarioRespuesta.put("idioma", usuario.getIdioma());

        usuarioRespuesta.put(
                "autenticacionActiva",
                Boolean.TRUE.equals(usuario.getAutenticacionActiva())
        );
        usuarioRespuesta.put("metodoAutenticacion", usuario.getMetodoAutenticacion());
        usuarioRespuesta.put("fechaAutenticacion", usuario.getFechaAutenticacion());

        if (miembro != null) {
            usuarioRespuesta.put("idMiembro", miembro.getId());
            usuarioRespuesta.put("idMiembroEquipo", miembro.getId());
            usuarioRespuesta.put("rolMiembro", miembro.getRol());
            usuarioRespuesta.put("estadoMiembro", miembro.getEstado());
        } else {
            usuarioRespuesta.put("idMiembro", null);
            usuarioRespuesta.put("idMiembroEquipo", null);
            usuarioRespuesta.put("rolMiembro", null);
            usuarioRespuesta.put("estadoMiembro", null);
        }

        return usuarioRespuesta;
    }

    private static class CodigoTemporal {
        private final String codigo;
        private final String metodo;
        private final LocalDateTime venceEn;

        CodigoTemporal(String codigo, String metodo, LocalDateTime venceEn) {
            this.codigo = codigo;
            this.metodo = metodo;
            this.venceEn = venceEn;
        }

        String getCodigo() {
            return codigo;
        }

        String getMetodo() {
            return metodo;
        }

        boolean estaVencido() {
            return LocalDateTime.now().isAfter(venceEn);
        }
    }
}