package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import jakarta.annotation.PostConstruct;
import java.text.Normalizer;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PresenciaPlataformaService {
    private final UsuarioRepository usuarios;
    private final JdbcTemplate jdbc;
    private final AsistenciaAutomaticaService asistencia;
    private final PermisosService permisos;
    private final Clock reloj;
    public PresenciaPlataformaService(UsuarioRepository usuarios, JdbcTemplate jdbc,
            AsistenciaAutomaticaService asistencia, PermisosService permisos, Clock reloj) {
        this.usuarios=usuarios; this.jdbc=jdbc; this.asistencia=asistencia; this.permisos=permisos; this.reloj=reloj;
    }
    @PostConstruct
    public void preparar() {
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS presencias_plataforma (
                id_usuario INT NOT NULL PRIMARY KEY,
                ultima_senal_epoch BIGINT NOT NULL,
                ruta VARCHAR(80) NOT NULL DEFAULT '',
                conexiones TEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """);
    }
    @Transactional
    public Map<String,Object> pulso(Integer id, String pagina, String ruta, boolean salida) {
        Usuario usuario = usuarios.buscarParaAsistencia(id).orElse(null);
        if (usuario == null || !"Activo".equalsIgnoreCase(usuario.getEstado())) throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,"Se requiere una cuenta activa para registrar presencia.");
        long ahora = reloj.instant().getEpochSecond();
        List<Map<String,Object>> filas = jdbc.queryForList("SELECT conexiones FROM presencias_plataforma WHERE id_usuario=?",id);
        Map<String,Long> conexiones = conexiones(filas.isEmpty() ? "" : texto(filas.getFirst().get("conexiones")),ahora);
        if (salida) conexiones.remove(pagina);
        else if (conexiones.size() < 128 || conexiones.containsKey(pagina)) conexiones.put(pagina,ahora);
        String serializado = conexiones.entrySet().stream().map(e->e.getKey()+"="+e.getValue()).collect(java.util.stream.Collectors.joining("\n"));
        jdbc.update("""
                INSERT INTO presencias_plataforma (id_usuario,ultima_senal_epoch,ruta,conexiones) VALUES (?,?,?,?)
                ON DUPLICATE KEY UPDATE ultima_senal_epoch=VALUES(ultima_senal_epoch),ruta=VALUES(ruta),conexiones=VALUES(conexiones)
                """,id,ahora,ruta,serializado);
        Map<String,Object> jornada = asistencia.actualizar(id,!salida,pagina,salida);
        return Map.of("estado","correcto","conectado",!conexiones.isEmpty(),"servidorEpoch",ahora,
                "asistencia",jornada,"mensaje","La plataforma registra tu conexión y, si eres alumno, tu asistencia en el horario escolar.");
    }
    public Map<String,Object> monitor(Integer id, LocalDate fecha) {
        Usuario supervisor = id == null ? null : usuarios.findById(id).orElse(null);
        if (!puedeSupervisar(supervisor)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "La asistencia de otras cuentas está reservada a administración, dirección y asesores.");
        Instant ahora = reloj.instant();
        LocalDate hoy = ahora.atZone(AsistenciaAutomaticaService.ZONA).toLocalDate();
        LocalDate dia = fecha == null ? hoy : fecha;
        List<Map<String,Object>> filas = jdbc.queryForList("""
            SELECT u.id_usuario AS idUsuario, CONCAT_WS(' ',u.nombre,u.apellido_paterno,u.apellido_materno) AS nombre,
                   r.nombre AS rol, u.estado,
                   p.ultima_senal_epoch AS ultimaSenal, p.ruta, p.conexiones,
                   j.id_registro AS idRegistro, j.total_segundos AS segundos,
                   j.liquidado_epoch AS liquidado, j.ultima_senal_epoch AS senalJornada, j.finalizada,
                   resumen.entrada, COALESCE(resumen.horas,0) AS horasRegistradas,
                   COALESCE(observado.horas_trabajadas,0) AS horasAutomaticasRegistradas
            FROM usuarios u LEFT JOIN roles r ON r.id_rol=u.id_rol
            LEFT JOIN presencias_plataforma p ON p.id_usuario=u.id_usuario
            LEFT JOIN jornadas_automaticas j ON j.id_usuario=u.id_usuario AND j.fecha=?
            LEFT JOIN registros_horas observado ON observado.id_registro=j.id_registro
            LEFT JOIN (
                SELECT m.id_usuario,MIN(h.hora_entrada) AS entrada,SUM(h.horas_trabajadas) AS horas
                FROM registros_horas h INNER JOIN miembros_equipo m ON m.id_miembro=h.id_miembro
                WHERE h.fecha=? AND COALESCE(h.estado_validacion,'Pendiente')<>'Rechazado'
                GROUP BY m.id_usuario
            ) resumen ON resumen.id_usuario=u.id_usuario
            ORDER BY u.nombre,u.apellido_paterno,u.id_usuario
            """,dia,dia);
        List<Map<String,Object>> personas = filas.stream().map(fila -> {
            Map<String,Object> dato = new LinkedHashMap<>();
            String rol = texto(fila.get("rol"));
            boolean alumno = Set.of("colaborador","alumno","alumna","estudiante","estudiante pmo").contains(normalizar(rol));
            boolean activo = "Activo".equalsIgnoreCase(texto(fila.get("estado")));
            boolean conectado = activo && !conexiones(texto(fila.get("conexiones")),ahora.getEpochSecond()).isEmpty();
            boolean contando = activo && alumno && dia.equals(hoy) && AsistenciaAutomaticaService.esDiaHabil(dia)
                    && !ahora.isBefore(AsistenciaAutomaticaService.inicio(dia)) && ahora.isBefore(AsistenciaAutomaticaService.fin(dia))
                    && fila.get("idRegistro") != null && !Boolean.TRUE.equals(fila.get("finalizada")) && numero(fila.get("finalizada")) == 0
                    && numero(fila.get("senalJornada")) + AsistenciaAutomaticaService.VIGENCIA_SENAL > ahora.getEpochSecond();
            long segundos = numero(fila.get("segundos"));
            long otrosSegundos=Math.max(0,decimal(fila.get("horasRegistradas")).subtract(decimal(fila.get("horasAutomaticasRegistradas"))).multiply(java.math.BigDecimal.valueOf(3600)).longValue());
            if(segundos+otrosSegundos>=36000)contando=false;
            if (contando) segundos += Math.max(0, Math.min(ahora.getEpochSecond(),
                    numero(fila.get("senalJornada"))+AsistenciaAutomaticaService.VIGENCIA_SENAL)-numero(fila.get("liquidado")));
            dato.put("idUsuario",fila.get("idUsuario")); dato.put("nombre",fila.get("nombre")); dato.put("rol",rol);
            dato.put("estado",fila.get("estado")); dato.put("alumno",alumno); dato.put("conectado",conectado); dato.put("contando",contando);
            dato.put("segundos",Math.min(36000,Math.max(0,segundos+otrosSegundos))); dato.put("entrada",fila.get("entrada"));
            dato.put("asistenciaRegistrada",fila.get("idRegistro")!=null || otrosSegundos>0);
            dato.put("incluyeOtrosRegistros",otrosSegundos>0);
            dato.put("vigenciaSegundos",Math.max(0,numero(fila.get("senalJornada"))+AsistenciaAutomaticaService.VIGENCIA_SENAL-ahora.getEpochSecond()));
            dato.put("segundosHastaCierre",Math.max(0,Duration.between(ahora,AsistenciaAutomaticaService.fin(dia)).toSeconds()));
            long ultima = numero(fila.get("ultimaSenal"));
            dato.put("ultimaConexion", ultima > 0 ? Instant.ofEpochSecond(ultima).toString() : null);
            dato.put("ultimaConexionHoy", ultima > 0 && Instant.ofEpochSecond(ultima).atZone(AsistenciaAutomaticaService.ZONA).toLocalDate().equals(dia));
            dato.put("apartado",conectado ? texto(fila.get("ruta")) : "");
            dato.put("idRegistro",fila.get("idRegistro")); return dato;
        }).toList();
        return Map.of("estado","correcto","fecha",dia.toString(),"consultadoEn",ahora.toString(),"servidorEpoch",ahora.getEpochSecond(),
                "zonaHoraria",AsistenciaAutomaticaService.ZONA.getId(),"personas",personas);
    }
    public boolean puedeSupervisar(Usuario u) {
        if (u == null || !"Activo".equalsIgnoreCase(u.getEstado())) return false;
        String rol = normalizar(u.getRol()==null ? "" : u.getRol().getNombre());
        return permisos.esSuperadministrador(u) || permisos.esAdministradorBase(u) || PermisosService.esDirectivoEscolar(u)
                || permisos.tienePermiso(u,"horas.ver_todas") || Set.of("asesor academico","asesor empresarial","asesor de empresa").contains(rol);
    }
    static Map<String,Long> conexiones(String texto, long ahora) {
        Map<String,Long> resultado = new LinkedHashMap<>();
        for (String linea:texto.split("\n")) {
            String[] partes=linea.split("=",2);
            if(partes.length!=2 || !partes[0].matches("[A-Za-z0-9_-]{8,80}")) continue;
            try { long valor=Long.parseLong(partes[1]); if(valor+AsistenciaAutomaticaService.VIGENCIA_SENAL>ahora) resultado.put(partes[0],valor); }
            catch(NumberFormatException ignorado) {}
        }
        return resultado;
    }
    private static long numero(Object dato) { return dato instanceof Number n ? n.longValue() : 0; }
    private static java.math.BigDecimal decimal(Object dato) { return dato instanceof Number n ? new java.math.BigDecimal(n.toString()) : java.math.BigDecimal.ZERO; }
    private static String texto(Object dato) { return Objects.toString(dato,""); }
    private static String normalizar(String texto) { return Normalizer.normalize(texto,Normalizer.Form.NFD).replaceAll("\\p{M}","").trim().toLowerCase(Locale.ROOT); }
}
