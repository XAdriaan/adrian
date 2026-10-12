package com.jjm.oficina.servicio;

import com.jjm.oficina.dto.*;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
public class EmpresaService {
    private final JdbcTemplate jdbc;
    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final OrganizacionRepository organizaciones;
    private final ProyectoRepository proyectos;
    private final TareaRepository tareas;
    private final PasswordEncoder encoder;
    private final BitacoraService bitacora;

    public EmpresaService(JdbcTemplate jdbc, UsuarioRepository usuarios, RolRepository roles,
            OrganizacionRepository organizaciones, ProyectoRepository proyectos,
            TareaRepository tareas, PasswordEncoder encoder, BitacoraService bitacora) {
        this.jdbc = jdbc; this.usuarios = usuarios; this.roles = roles;
        this.organizaciones = organizaciones; this.proyectos = proyectos;
        this.tareas = tareas; this.encoder = encoder; this.bitacora = bitacora;
    }

    @PostConstruct
    void preparar() {
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS empresa_cuentas (
                  id_usuario INT NOT NULL PRIMARY KEY,
                  id_organizacion INT NOT NULL UNIQUE,
                  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  CONSTRAINT fk_empresa_cuenta_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
                  CONSTRAINT fk_empresa_cuenta_organizacion FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id_organizacion)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);
        jdbc.update("INSERT IGNORE INTO roles (nombre, descripcion) VALUES (?, ?)",
                "Empresa", "Registro y seguimiento de los proyectos de su propia empresa.");
    }

    public static boolean esEmpresa(Usuario usuario) {
        return usuario != null && usuario.getRol() != null
                && "Empresa".equalsIgnoreCase(usuario.getRol().getNombre());
    }

    @Transactional
    public Map<String, Object> registrar(RegistroEmpresaRequest datos) {
        String correo = datos.correo().trim().toLowerCase(Locale.ROOT);
        if (usuarios.existsByCorreoIgnoreCase(correo)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya existe una cuenta con ese correo. Utiliza otro correo para la empresa.");
        }
        if (datos.contrasena().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña no puede superar 72 bytes.");
        }
        Rol rol = roles.findByNombre("Empresa").orElseThrow(() ->
                new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El acceso empresarial está iniciando."));
        Usuario usuario = new Usuario();
        usuario.setRol(rol); usuario.setNombre(datos.nombre().trim());
        usuario.setApellidoPaterno(datos.apellido().trim()); usuario.setApellidoMaterno("");
        usuario.setCorreo(correo); usuario.setTelefono(limpiar(datos.telefono()));
        usuario.setContrasena(encoder.encode(datos.contrasena()));
        usuario.setEstado("Activo"); usuario.setIdioma("es"); usuario.setAutenticacionActiva(false);
        usuario = usuarios.saveAndFlush(usuario);
        Organizacion empresa = new Organizacion();
        empresa.setNombre(datos.empresa().trim()); empresa.setTipo("Empresa");
        empresa.setEstadoConvenio("Pendiente");
        empresa.setContacto(datos.nombre().trim() + " " + datos.apellido().trim());
        empresa.setCorreo(correo); empresa.setTelefono(limpiar(datos.telefono()));
        empresa.setNotas("Empresa registrada desde el portal público de la Oficina de Proyectos.");
        empresa = organizaciones.saveAndFlush(empresa);
        jdbc.update("INSERT INTO empresa_cuentas (id_usuario, id_organizacion) VALUES (?, ?)",
                usuario.getId(), empresa.getId());
        bitacora.registrar(usuario.getId(), "Empresas", "Registro", "Organización", empresa.getId(),
                "Registro empresarial solicitado desde el portal público.", null, null);
        return Map.of("estado", "correcto", "mensaje", "Empresa registrada. Ya puedes iniciar sesión.");
    }

    private Organizacion empresaDe(Integer idUsuario) {
        Usuario usuario = idUsuario == null ? null : usuarios.findById(idUsuario).orElse(null);
        if (!esEmpresa(usuario) || !"Activo".equalsIgnoreCase(usuario.getEstado())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere una cuenta empresarial activa.");
        }
        List<Integer> ids = jdbc.queryForList(
                "SELECT id_organizacion FROM empresa_cuentas WHERE id_usuario = ?", Integer.class, idUsuario);
        if (ids.size() != 1) throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Tu cuenta no tiene una empresa vinculada. Solicita la revisión de administración.");
        return organizaciones.findById(ids.get(0)).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró la empresa de la cuenta."));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> consultar(Integer idUsuario) {
        Organizacion empresa = empresaDe(idUsuario);
        List<Map<String, Object>> lista = proyectos.findByIdOrganizacionOrderByFechaCreacionDesc(empresa.getId())
                .stream().map(this::resumen).toList();
        return Map.of("estado", "correcto", "empresa", Map.of("id", empresa.getId(), "nombre", empresa.getNombre()),
                "proyectos", lista, "consultadoEn", Instant.now().toString());
    }

    @Transactional
    public Map<String, Object> registrarProyecto(Integer idUsuario, ProyectoEmpresaRequest datos) {
        Organizacion empresa = empresaDe(idUsuario);
        if (datos.fechaFin().isBefore(datos.fechaInicio())) throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "La fecha final debe ser igual o posterior al inicio.");
        Proyecto proyecto = new Proyecto();
        proyecto.setIdOrganizacion(empresa.getId());
        proyecto.setNombre(datos.nombre().trim());
        proyecto.setCodigo("EMP-" + idUsuario + "-" + UUID.randomUUID().toString().replace("-", ""));
        proyecto.setDescripcion("Servicio solicitado: " + datos.servicio() + ".\n" + datos.objetivo().trim());
        proyecto.setClienteArea(empresa.getNombre()); proyecto.setClasificacionProyecto("Externo");
        proyecto.setTipoProyecto("Normal"); proyecto.setEstado("Propuesto");
        proyecto.setPrioridad(datos.prioridad()); proyecto.setFechaInicio(datos.fechaInicio());
        proyecto.setFechaFin(datos.fechaFin()); proyecto.setPorcentajeAvance(BigDecimal.ZERO);
        proyecto = proyectos.saveAndFlush(proyecto);
        bitacora.registrar(idUsuario, "Proyectos", "Solicitud empresarial", "Proyecto", proyecto.getId(),
                "Proyecto propuesto por " + empresa.getNombre(), null, null);
        return Map.of("estado", "correcto", "mensaje", "Proyecto registrado para revisión de la Oficina de Proyectos.",
                "proyecto", resumen(proyecto));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detalle(Integer idUsuario, Integer idProyecto) {
        Organizacion empresa = empresaDe(idUsuario);
        Proyecto proyecto = proyectos.findById(idProyecto).filter(p -> empresa.getId().equals(p.getIdOrganizacion()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no disponible para tu empresa."));
        List<Map<String, Object>> avances = tareas.findByIdProyectoOrderByFechaCreacionDesc(idProyecto)
                .stream().map(t -> {
                    Map<String, Object> dato = new LinkedHashMap<>();
                    dato.put("titulo", t.getTitulo()); dato.put("estado", t.getEstado());
                    dato.put("fechaLimite", t.getFechaLimite()); dato.put("actualizadoEn", t.getFechaActualizacion());
                    return dato;
                }).toList();
        return Map.of("estado", "correcto", "proyecto", resumen(proyecto), "tareas", avances,
                "consultadoEn", Instant.now().toString());
    }

    private Map<String, Object> resumen(Proyecto p) {
        Map<String, Object> dato = new LinkedHashMap<>();
        dato.put("id", p.getId()); dato.put("nombre", p.getNombre()); dato.put("codigo", p.getCodigo());
        dato.put("descripcion", p.getDescripcion()); dato.put("estado", p.getEstado());
        dato.put("prioridad", p.getPrioridad()); dato.put("fechaInicio", p.getFechaInicio());
        dato.put("fechaFin", p.getFechaFin()); dato.put("avance", p.getPorcentajeAvance());
        dato.put("actualizadoEn", p.getFechaActualizacion());
        return dato;
    }

    private String limpiar(String texto) { return texto == null ? "" : texto.trim(); }
}
