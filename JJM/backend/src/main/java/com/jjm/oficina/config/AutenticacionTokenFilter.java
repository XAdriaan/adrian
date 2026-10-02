package com.jjm.oficina.config;

import tools.jackson.databind.ObjectMapper;
import com.jjm.oficina.servicio.SesionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class AutenticacionTokenFilter extends OncePerRequestFilter {

    private final SesionService sesionService;
    private final ObjectMapper objectMapper;

    public AutenticacionTokenFilter(SesionService sesionService, ObjectMapper objectMapper) {
        this.sesionService = sesionService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }

        if (!path.startsWith("/api/")) {
            return true;
        }

        return path.equals("/api/salud")
                || path.equals("/api/auth/login")
                || path.equals("/api/auth/registro")
                || path.startsWith("/api/auth/recuperacion/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authorization = request.getHeader("Authorization");
        String token = extraerBearer(authorization);
        Integer idUsuario = sesionService.obtenerUsuario(token);

        if (idUsuario == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            Map<String, Object> cuerpo = new LinkedHashMap<>();
            cuerpo.put("estado", "error");
            cuerpo.put("mensaje", "La sesión no existe o venció. Inicia sesión nuevamente.");
            objectMapper.writeValue(response.getWriter(), cuerpo);
            return;
        }

        HttpServletRequest requestSeguro = new UsuarioRequestWrapper(request, idUsuario);
        filterChain.doFilter(requestSeguro, response);
    }

    private String extraerBearer(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }

        if (!authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }

        return authorization.substring(7).trim();
    }

    private static class UsuarioRequestWrapper extends HttpServletRequestWrapper {
        private final String idUsuario;

        UsuarioRequestWrapper(HttpServletRequest request, Integer idUsuario) {
            super(request);
            this.idUsuario = String.valueOf(idUsuario);
        }

        @Override
        public String getHeader(String name) {
            if ("X-Usuario-Id".equalsIgnoreCase(name)) {
                return idUsuario;
            }
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if ("X-Usuario-Id".equalsIgnoreCase(name)) {
                return Collections.enumeration(List.of(idUsuario));
            }
            return super.getHeaders(name);
        }
    }
}
