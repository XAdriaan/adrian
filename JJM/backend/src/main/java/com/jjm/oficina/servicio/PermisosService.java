package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.Rol;
import com.jjm.oficina.modelo.Usuario;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Service
public class PermisosService {

    public static final String ROL_SUPERADMIN = "Superadministrador";
    public static final String ROL_ADMIN = "Administrador";
    public static final String ROL_SUPERVISOR = "Supervisor";
    private static final List<String> PERMISOS_DIRECTIVO = List.of("dashboard.ver", "supervision.ver");

    private final JdbcTemplate jdbcTemplate;

    public PermisosService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean esSuperadministrador(Usuario usuario) {
        return usuarioActivo(usuario)
                && "superadministrador".equals(normalizar(usuario.getRol().getNombre()));
    }

    public static boolean esDirectivoEscolar(Usuario usuario) {
        if (usuario == null || usuario.getRol() == null || usuario.getRol().getNombre() == null
                || !"Activo".equalsIgnoreCase(usuario.getEstado())) return false;
        String nombre = usuario.getRol().getNombre().trim().toLowerCase(Locale.ROOT);
        return nombre.equals("directivo escolar") || nombre.equals("directivo");
    }

    public boolean esAdministradorBase(Usuario usuario) {
        if (!usuarioActivo(usuario)) {
            return false;
        }
        String rol = normalizar(usuario.getRol().getNombre());
        return rol.equals("administrador")
                || rol.equals("admin pmo")
                || rol.equals("admin_pmo")
                || rol.equals("administrador pmo");
    }

    public boolean tienePermiso(Usuario usuario, String clave) {
        if (!usuarioActivo(usuario) || clave == null || clave.isBlank()) {
            return false;
        }
        if (esSuperadministrador(usuario)) {
            return true;
        }
        if (esDirectivoEscolar(usuario)) return PERMISOS_DIRECTIVO.contains(clave.trim());
        Integer idRol = usuario.getRol().getId();
        if (idRol == null) {
            return false;
        }
        Integer total = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM rol_permisos rp
                INNER JOIN permisos p ON p.id_permiso = rp.id_permiso
                WHERE rp.id_rol = ? AND p.clave = ?
                """,
                Integer.class,
                idRol,
                clave.trim()
        );
        return total != null && total > 0;
    }

    public boolean tieneAlguno(Usuario usuario, String... claves) {
        if (claves == null) {
            return false;
        }
        for (String clave : claves) {
            if (tienePermiso(usuario, clave)) {
                return true;
            }
        }
        return false;
    }

    public List<String> listarClaves(Rol rol) {
        if (rol == null || rol.getId() == null) {
            return Collections.emptyList();
        }
        return jdbcTemplate.queryForList(
                """
                SELECT p.clave
                FROM permisos p
                INNER JOIN rol_permisos rp ON rp.id_permiso = p.id_permiso
                WHERE rp.id_rol = ?
                ORDER BY p.clave
                """,
                String.class,
                rol.getId()
        );
    }

    public List<String> listarClaves(Usuario usuario) {
        if (!usuarioActivo(usuario)) {
            return Collections.emptyList();
        }
        if (esSuperadministrador(usuario)) {
            return jdbcTemplate.queryForList(
                    "SELECT clave FROM permisos ORDER BY clave",
                    String.class
            );
        }
        if (esDirectivoEscolar(usuario)) return PERMISOS_DIRECTIVO;
        return listarClaves(usuario.getRol());
    }

    private boolean usuarioActivo(Usuario usuario) {
        return usuario != null
                && usuario.getRol() != null
                && "Activo".equalsIgnoreCase(usuario.getEstado());
    }

    public String normalizar(String valor) {
        if (valor == null) {
            return "";
        }
        String sinAcentos = Normalizer.normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return sinAcentos.trim().toLowerCase(Locale.ROOT);
    }
}
