package com.jjm.oficina.servicio;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Sesiones persistentes de la Oficina de Proyectos.
 *
 * Antes las sesiones vivían únicamente en memoria. Cada redeploy de Docker
 * borraba el mapa de tokens y el navegador era enviado al login al abrir otro
 * módulo. Ahora el token se almacena como hash SHA-256 en MySQL y sobrevive a
 * los reinicios del contenedor.
 */
@Service
public class SesionService {

    private static final Duration DURACION_SESION = Duration.ofHours(12);

    private final SecureRandom secureRandom = new SecureRandom();
    private final JdbcTemplate jdbc;
    private volatile boolean estructuraLista = false;

    public SesionService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String crearSesion(Integer idUsuario) {
        asegurarEstructura();
        limpiarVencidas();

        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        jdbc.update(
                """
                INSERT INTO sesiones_usuario (token_hash, id_usuario, expira_en)
                VALUES (?, ?, ?)
                """,
                hash(token),
                idUsuario,
                Timestamp.from(Instant.now().plus(DURACION_SESION))
        );

        return token;
    }

    public Integer obtenerUsuario(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        asegurarEstructura();
        limpiarVencidas();

        try {
            return jdbc.queryForObject(
                    """
                    SELECT id_usuario
                    FROM sesiones_usuario
                    WHERE token_hash = ?
                      AND expira_en > CURRENT_TIMESTAMP
                    LIMIT 1
                    """,
                    Integer.class,
                    hash(token)
            );
        } catch (EmptyResultDataAccessException ex) {
            return null;
        }
    }

    public void cerrarSesion(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        asegurarEstructura();
        jdbc.update(
                "DELETE FROM sesiones_usuario WHERE token_hash = ?",
                hash(token)
        );
    }

    private void limpiarVencidas() {
        jdbc.update("DELETE FROM sesiones_usuario WHERE expira_en <= CURRENT_TIMESTAMP");
    }

    private void asegurarEstructura() {
        if (estructuraLista) {
            return;
        }

        synchronized (this) {
            if (estructuraLista) {
                return;
            }

            jdbc.execute(
                    """
                    CREATE TABLE IF NOT EXISTS sesiones_usuario (
                        id_sesion BIGINT NOT NULL AUTO_INCREMENT,
                        token_hash CHAR(64) NOT NULL,
                        id_usuario INT NOT NULL,
                        expira_en DATETIME NOT NULL,
                        creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (id_sesion),
                        UNIQUE KEY uk_sesion_token_hash (token_hash),
                        KEY idx_sesion_usuario (id_usuario),
                        KEY idx_sesion_expira (expira_en)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """
            );

            estructuraLista = true;
        }
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no está disponible en la JVM.", ex);
        }
    }
}
