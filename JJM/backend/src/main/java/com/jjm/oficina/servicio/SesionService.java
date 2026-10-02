package com.jjm.oficina.servicio;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SesionService {

    private static final Duration DURACION_SESION = Duration.ofHours(12);
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, Sesion> sesiones = new ConcurrentHashMap<>();

    public String crearSesion(Integer idUsuario) {
        limpiarVencidas();
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        sesiones.put(token, new Sesion(idUsuario, Instant.now().plus(DURACION_SESION)));
        return token;
    }

    public Integer obtenerUsuario(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        Sesion sesion = sesiones.get(token);
        if (sesion == null) {
            return null;
        }

        if (sesion.expiraEn().isBefore(Instant.now())) {
            sesiones.remove(token);
            return null;
        }

        return sesion.idUsuario();
    }

    public void cerrarSesion(String token) {
        if (token != null) {
            sesiones.remove(token);
        }
    }

    private void limpiarVencidas() {
        Instant ahora = Instant.now();
        sesiones.entrySet().removeIf(entry -> entry.getValue().expiraEn().isBefore(ahora));
    }

    private record Sesion(Integer idUsuario, Instant expiraEn) {
    }
}
