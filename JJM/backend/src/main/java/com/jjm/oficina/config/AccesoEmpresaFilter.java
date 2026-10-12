package com.jjm.oficina.config;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import com.jjm.oficina.servicio.EmpresaService;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** Una cuenta empresarial utiliza exclusivamente el portal de su organización. */
@Component
public class AccesoEmpresaFilter extends OncePerRequestFilter {
    private final UsuarioRepository usuarios;
    public AccesoEmpresaFilter(UsuarioRepository usuarios) { this.usuarios = usuarios; }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equals(request.getMethod()) || !path.startsWith("/api/")
                || path.equals("/api/salud") || path.equals("/api/auth/login")
                || path.equals("/api/auth/registro") || path.equals("/api/auth/registro-empresa")
                || path.startsWith("/api/auth/recuperacion/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String id = request.getHeader("X-Usuario-Id");
        if (path.startsWith("/api/") && id != null && id.matches("[0-9]{1,10}")) {
            Usuario usuario = usuarios.findById(Integer.valueOf(id)).orElse(null);
            if (EmpresaService.esEmpresa(usuario) && (!"Activo".equalsIgnoreCase(usuario.getEstado())
                    || !(path.startsWith("/api/empresas/") || path.startsWith("/api/auth/")))) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setCharacterEncoding("UTF-8"); response.setContentType("application/json");
                response.getWriter().write("{\"estado\":\"error\",\"mensaje\":\"Utiliza el portal empresarial para consultar tus proyectos.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
