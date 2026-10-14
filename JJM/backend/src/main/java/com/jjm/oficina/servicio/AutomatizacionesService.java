package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.slf4j.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import static com.jjm.oficina.servicio.AutomatizacionReglas.*;

@Service
public class AutomatizacionesService {
    private static final Logger LOG=LoggerFactory.getLogger(AutomatizacionesService.class);
    private static final Set<String> OPCIONES=Set.of("aprobarHoras","revisarExpedientes","reportesSemanales","prepararCartas","recordatorios");
    private final JdbcTemplate jdbc; private final UsuarioRepository usuarios; private final PermisosService permisos;
    private final Clock reloj; private final ObjectMapper mapper; private final TransactionTemplate tx; private final BitacoraService bitacora;
    public AutomatizacionesService(JdbcTemplate jdbc,UsuarioRepository usuarios,PermisosService permisos,Clock reloj,ObjectMapper mapper,PlatformTransactionManager gestor,BitacoraService bitacora) {
        this.jdbc=jdbc;this.usuarios=usuarios;this.permisos=permisos;this.reloj=reloj;this.mapper=mapper;this.tx=new TransactionTemplate(gestor);this.bitacora=bitacora;
    }
    @PostConstruct public void preparar() {
        for(String ddl:List.of(
            "CREATE TABLE IF NOT EXISTS pmo_automatizacion_config (id INT PRIMARY KEY, opciones_json TEXT NOT NULL, ultima_revision_epoch BIGINT NOT NULL DEFAULT 0)",
            "CREATE TABLE IF NOT EXISTS pmo_automatizacion_estado (clave VARCHAR(80) PRIMARY KEY, estado VARCHAR(30) NOT NULL, detalle TEXT, actualizado_en DATETIME NOT NULL)",
            "CREATE TABLE IF NOT EXISTS pmo_documento_revision (id_documento INT PRIMARY KEY, firma_fuente CHAR(64) NOT NULL, sha256 CHAR(64), estado VARCHAR(30) NOT NULL, detalle VARCHAR(500), revisado_en DATETIME NOT NULL)",
            "CREATE TABLE IF NOT EXISTS pmo_certificados_curso (id_usuario INT NOT NULL,id_curso INT NOT NULL,id_documento INT NOT NULL, PRIMARY KEY(id_usuario,id_curso), UNIQUE KEY uk_certificado_documento(id_documento))",
            "CREATE TABLE IF NOT EXISTS pmo_recordatorios (id BIGINT AUTO_INCREMENT PRIMARY KEY, clave VARCHAR(190) NOT NULL UNIQUE,id_usuario INT NOT NULL,titulo VARCHAR(200) NOT NULL,descripcion TEXT NOT NULL,enlace VARCHAR(200) NOT NULL,estado VARCHAR(20) NOT NULL DEFAULT 'Abierto',actualizado_en DATETIME NOT NULL, KEY idx_recordatorio_usuario(id_usuario,estado))",
            "CREATE TABLE IF NOT EXISTS pmo_reportes_semanales (id BIGINT AUTO_INCREMENT PRIMARY KEY,desde DATE NOT NULL,hasta DATE NOT NULL,datos_json LONGTEXT NOT NULL,creado_en DATETIME NOT NULL, UNIQUE KEY uk_reporte_semana(desde,hasta))",
            "CREATE TABLE IF NOT EXISTS pmo_borradores_cartas (id BIGINT AUTO_INCREMENT PRIMARY KEY,id_usuario INT NOT NULL,periodo_clave VARCHAR(100) NOT NULL,datos_json TEXT NOT NULL,creado_en DATETIME NOT NULL, UNIQUE KEY uk_borrador_usuario_periodo(id_usuario,periodo_clave))",
            "CREATE TABLE IF NOT EXISTS pmo_respaldos (id VARCHAR(64) PRIMARY KEY,archivo VARCHAR(150),sha256 CHAR(64),bytes BIGINT,estado VARCHAR(30) NOT NULL,detalle TEXT,creado_en DATETIME NOT NULL,verificado_en DATETIME NULL)")) jdbc.execute(ddl+" ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        jdbc.update("INSERT IGNORE INTO pmo_automatizacion_config(id,opciones_json) VALUES(1,?)",json(Map.of("aprobarHoras",true,"revisarExpedientes",true,"reportesSemanales",true,"prepararCartas",true,"recordatorios",true)));
    }
    public Usuario comprobar(Integer id,boolean escritura,boolean global) {
        Usuario u=id==null?null:usuarios.findById(id).orElse(null);
        if(u==null||!"Activo".equalsIgnoreCase(u.getEstado())||u.getRol()==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Inicia sesión con una cuenta activa.");
        boolean admin=permisos.esSuperadministrador(u)||permisos.esAdministradorBase(u);
        boolean consulta=admin||PermisosService.esDirectivoEscolar(u)||Set.of("asesor academico","asesor empresarial").contains(normalizar(u.getRol().getNombre()));
        if(escritura&&!admin || global&&!consulta || !global&&!consulta&&!alumno(u.getRol().getNombre()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Tu rol no tiene acceso a esta operación.");
        return u;
    }
    public Map<String,Object> configuracion() { return leer(jdbc.queryForObject("SELECT opciones_json FROM pmo_automatizacion_config WHERE id=1",String.class)); }
    public Map<String,Object> configurar(Integer id,Map<String,Object> datos) {
        comprobar(id,true,true);
        if(!OPCIONES.containsAll(datos.keySet())||datos.values().stream().anyMatch(v->!(v instanceof Boolean)))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Usa únicamente las opciones de automatización y valores verdadero/falso.");
        return tx.execute(s->{Map<String,Object> actual=leer(jdbc.queryForObject("SELECT opciones_json FROM pmo_automatizacion_config WHERE id=1 FOR UPDATE",String.class));actual.putAll(datos);
            jdbc.update("UPDATE pmo_automatizacion_config SET opciones_json=?,ultima_revision_epoch=0 WHERE id=1",json(actual));
            bitacora.registrar(id,"AUTOMATIZACIONES","CONFIGURACION","Configuracion",1,"Se actualizaron las automatizaciones.",null,json(actual));return Map.of("estado","correcto","configuracion",actual);});
    }
    public Map<String,Object> subirCertificado(Integer usuario,Integer curso,Map<String,Object> datos) {
        Usuario u=comprobar(usuario,false,false);
        if(!alumno(u.getRol().getNombre()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Los certificados de estadía corresponden a alumnos.");
        if(curso==null||curso<1||curso>26)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Selecciona un curso del catálogo.");
        String nombre=texto(datos.get("nombreArchivo")).replace('\\','/');nombre=nombre.substring(nombre.lastIndexOf('/')+1);
        if(nombre.length()>150||!normalizar(nombre).endsWith(".pdf"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Adjunta un certificado PDF con nombre de hasta 150 caracteres.");
        final String archivo=nombre;
        byte[] bytes;try{bytes=pdf(texto(datos.get("archivoBase64")));}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,e.getMessage());}
        String firma=sha(bytes),contenido=Base64.getEncoder().encodeToString(bytes);
        return tx.execute(s->{jdbc.queryForObject("SELECT id_usuario FROM usuarios WHERE id_usuario=? FOR UPDATE",Integer.class,usuario);
            List<Map<String,Object>> previos=jdbc.queryForList("SELECT c.id_documento AS id,v.sha256,d.estado FROM pmo_certificados_curso c JOIN documentos_usuario d ON d.id_documento=c.id_documento JOIN pmo_documento_revision v ON v.id_documento=d.id_documento WHERE c.id_usuario=? AND c.id_curso=?",usuario,curso);
            if(!previos.isEmpty()&&firma.equals(previos.getFirst().get("sha256"))&&!"rechazado".equals(normalizar(previos.getFirst().get("estado"))))return Map.of("estado","correcto","idDocumento",previos.getFirst().get("id"),"yaExistente",true);
            jdbc.update("INSERT INTO documentos_usuario(id_usuario,tipo_documento,nombre_archivo,archivo_base64,mime_type,estado,observaciones,generado_automaticamente) VALUES(?,?,?,?,?,'Pendiente',?,FALSE)",usuario,"Certificado de curso #"+curso,archivo,contenido,"application/pdf","Certificado almacenado; pendiente de revisión académica.");
            Long id=jdbc.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
            jdbc.update("INSERT INTO pmo_certificados_curso(id_usuario,id_curso,id_documento) VALUES(?,?,?) ON DUPLICATE KEY UPDATE id_documento=VALUES(id_documento)",usuario,curso,id);
            jdbc.update("INSERT INTO pmo_documento_revision(id_documento,firma_fuente,sha256,estado,detalle,revisado_en) VALUES(?,SHA2(?,256),?,'Legible',?,?)",id,contenido,firma,"Estructura básica PDF válida. Contenido pendiente de revisión académica.",ahora());
            return Map.of("estado","correcto","idDocumento",id,"yaExistente",false);});
    }
    public Map<String,Object> obtenerCertificado(Integer usuario,Integer curso) {
        comprobar(usuario,false,false);
        List<Map<String,Object>> filas=jdbc.queryForList("SELECT d.nombre_archivo AS nombreArchivo,d.archivo_base64 AS archivoBase64 FROM pmo_certificados_curso c JOIN documentos_usuario d ON d.id_documento=c.id_documento AND d.id_usuario=c.id_usuario WHERE c.id_usuario=? AND c.id_curso=?",usuario,curso);
        if(filas.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Adjunta el PDF del certificado para poder descargarlo.");
        return Map.of("estado","correcto","documento",filas.getFirst());
    }
    @Scheduled(fixedDelay=60000,initialDelay=30000) public void programadas() {
        try { ejecutar(null,false); } catch(RuntimeException e) { LOG.error("No se completó la revisión automática",e);estado("revision","Error","La revisión no terminó. Consulta los registros del servidor."); }
    }
    public Map<String,Object> ejecutar(Integer id,boolean manual) {
        if(manual)comprobar(id,true,true);
        return tx.execute(s->{Map<String,Object> fila=jdbc.queryForMap("SELECT opciones_json,ultima_revision_epoch FROM pmo_automatizacion_config WHERE id=1 FOR UPDATE");
            long ahora=reloj.instant().getEpochSecond();
            if(!manual && ahora-numero(fila.get("ultima_revision_epoch")).longValue()<300)return Map.of("estado","correcto","omitida",true);
            Map<String,Object> opciones=leer(fila.get("opciones_json"));
            int aprobadas=Boolean.TRUE.equals(opciones.get("aprobarHoras"))?aprobarJornadas():0;
            if(Boolean.TRUE.equals(opciones.get("revisarExpedientes")))revisarArchivos();
            List<Map<String,Object>> alumnos=alumnos();
            if(Boolean.TRUE.equals(opciones.get("prepararCartas")))prepararCartas(alumnos);
            if(Boolean.TRUE.equals(opciones.get("recordatorios")))recordatorios(alumnos);
            if(Boolean.TRUE.equals(opciones.get("reportesSemanales")))reporte(alumnos);
            jdbc.update("UPDATE pmo_automatizacion_config SET ultima_revision_epoch=? WHERE id=1",ahora);
            estado("revision","Completada",alumnos.size()+" expedientes revisados; "+aprobadas+" jornadas aprobadas.");
            if(manual)bitacora.registrar(id,"AUTOMATIZACIONES","REVISION_MANUAL","Usuarios",null,"Se ejecutó la revisión de automatizaciones.",null,String.valueOf(aprobadas));
            return Map.of("estado","correcto","alumnos",alumnos.size(),"jornadasAprobadas",aprobadas);});
    }
    private LocalDate hoy() { return reloj.instant().atZone(AsistenciaAutomaticaService.ZONA).toLocalDate(); }
    private LocalDateTime ahora() { return reloj.instant().atZone(AsistenciaAutomaticaService.ZONA).toLocalDateTime(); }
    private int aprobarJornadas() {
        List<Map<String,Object>> lista=jdbc.queryForList("""
            SELECT h.id_registro AS id,h.fecha,h.hora_entrada AS horaEntrada,h.hora_salida AS horaSalida,
                h.horas_trabajadas AS horas,h.estado_validacion AS estadoValidacion,h.incidente,h.tipo_registro AS tipoRegistro,
                j.total_segundos AS segundos,j.finalizada,r.nombre AS rol,u.estado AS estadoUsuario,
                (SELECT COALESCE(SUM(x.horas_trabajadas),0) FROM registros_horas x WHERE x.id_miembro=h.id_miembro
                  AND x.fecha=h.fecha AND COALESCE(x.estado_validacion,'Pendiente')<>'Rechazado') AS totalDia
            FROM jornadas_automaticas j JOIN registros_horas h ON h.id_registro=j.id_registro
            JOIN usuarios u ON u.id_usuario=j.id_usuario JOIN roles r ON r.id_rol=u.id_rol
            JOIN miembros_equipo m ON m.id_miembro=h.id_miembro AND m.id_usuario=u.id_usuario
            WHERE j.finalizada=TRUE AND j.modo_continuo=FALSE AND m.estado='Activo' AND h.tipo_registro='Jornada' AND h.estado_validacion='Pendiente' ORDER BY h.id_registro FOR UPDATE
            """);
        int total=0;
        for(Map<String,Object> j:lista)if(jornadaValida(j,hoy())) {
            int cambio=jdbc.update("UPDATE registros_horas SET estado_validacion='Aprobado',id_usuario_validador=NULL WHERE id_registro=? AND estado_validacion='Pendiente'",j.get("id"));
            if(cambio>0) { total++;estado("hora-"+j.get("id"),"Aprobada","Asistencia medida por el servidor y validada al cerrar la jornada."); }
        }
        estado("aprobacionHoras","Completada",total+" jornadas aprobadas; los casos con incidencias conservan su estado.");return total;
    }
    private void revisarArchivos() {
        List<Map<String,Object>> archivos=jdbc.queryForList("""
            SELECT d.id_documento AS id,d.nombre_archivo AS nombre,
                   SHA2(COALESCE(d.archivo_base64,''),256) AS firma
            FROM documentos_usuario d LEFT JOIN pmo_documento_revision v ON v.id_documento=d.id_documento
            WHERE v.id_documento IS NULL OR v.firma_fuente<>SHA2(COALESCE(d.archivo_base64,''),256)
            ORDER BY d.id_documento LIMIT 200
            """);
        for(Map<String,Object> a:archivos) {
            String estado="Pendiente",detalle="Este formato requiere revisión manual.",sha=null;
            if(normalizar(a.get("nombre")).endsWith(".pdf"))try {String contenido=jdbc.queryForObject("SELECT archivo_base64 FROM documentos_usuario WHERE id_documento=?",String.class,a.get("id"));sha=sha(pdf(contenido));estado="Legible";detalle="Estructura básica PDF válida. Contenido pendiente de revisión académica.";}
                catch(IllegalArgumentException e){estado="Ilegible";detalle=e.getMessage();}
            jdbc.update("INSERT INTO pmo_documento_revision(id_documento,firma_fuente,sha256,estado,detalle,revisado_en) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE firma_fuente=VALUES(firma_fuente),sha256=VALUES(sha256),estado=VALUES(estado),detalle=VALUES(detalle),revisado_en=VALUES(revisado_en)",a.get("id"),a.get("firma"),sha,estado,detalle,ahora());
        }
        estado("expedientes","Completada",archivos.size()+" archivos nuevos o modificados comprobados.");
    }
    public List<Map<String,Object>> alumnos() {
        List<Map<String,Object>> perfiles=jdbc.queryForList("""
            SELECT u.id_usuario AS idUsuario,CONCAT_WS(' ',u.nombre,u.apellido_paterno,u.apellido_materno) AS nombre,
                u.estado,r.nombre AS rol,a.matricula,a.universidad,a.carrera,a.periodo_estadia AS periodo,
                a.fecha_inicio AS fechaInicio,a.fecha_fin AS fechaFin,a.horas_comprometidas AS metaHoras,
                a.asesor_academico AS asesorAcademico,a.asesor_empresarial AS asesorEmpresarial,
                26 AS totalCursos,COALESCE(c.cursos_completados,0) AS cursosDeclarados,
                COALESCE(s.empresa_contestado,0) AS empresa,COALESCE(s.satisfaccion_contestado,0) AS satisfaccion,
                COALESCE(s.fo_est_03_contestado,0) AS foEst03,
                COALESCE((SELECT SUM(h.horas_trabajadas) FROM miembros_equipo m JOIN registros_horas h ON h.id_miembro=m.id_miembro
                  WHERE m.id_usuario=u.id_usuario AND h.estado_validacion='Aprobado' AND h.fecha<=?
                    AND (a.fecha_inicio IS NULL OR h.fecha>=a.fecha_inicio) AND (a.fecha_fin IS NULL OR h.fecha<=a.fecha_fin)),0) AS horasAprobadas
            FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol
            LEFT JOIN datos_academicos_usuario a ON a.id_usuario=u.id_usuario
            LEFT JOIN progreso_cursos_usuario c ON c.id_usuario=u.id_usuario
            LEFT JOIN seguimiento_formularios_estadia s ON s.id_usuario=u.id_usuario ORDER BY u.id_usuario
            """,hoy()).stream().filter(a->alumno(a.get("rol"))).toList();
        Map<Integer,List<Map<String,Object>>> documentos=new HashMap<>();
        for(Map<String,Object> d:jdbc.queryForList("""
            SELECT d.id_usuario AS idUsuario,d.id_documento AS id,d.tipo_documento AS tipo,d.nombre_archivo AS nombre,
                d.estado,v.estado AS estadoTecnico,v.sha256,
                (SELECT COUNT(*) FROM documentos_usuario otro JOIN pmo_documento_revision vo ON vo.id_documento=otro.id_documento
                  WHERE otro.id_usuario=d.id_usuario AND otro.id_documento<>d.id_documento AND vo.sha256=v.sha256
                    AND otro.estado<>'Rechazado' AND otro.id_documento=(SELECT MAX(ultimo.id_documento) FROM documentos_usuario ultimo WHERE ultimo.id_usuario=otro.id_usuario AND ultimo.tipo_documento=otro.tipo_documento)) AS duplicados
            FROM documentos_usuario d LEFT JOIN pmo_documento_revision v ON v.id_documento=d.id_documento
            WHERE d.id_documento=(SELECT MAX(ultimo.id_documento) FROM documentos_usuario ultimo WHERE ultimo.id_usuario=d.id_usuario AND ultimo.tipo_documento=d.tipo_documento)
            """))documentos.computeIfAbsent(((Number)d.get("idUsuario")).intValue(),k->new ArrayList<>()).add(d);
        Map<Integer,Integer> certificados=new HashMap<>();
        for(Map<String,Object> f:jdbc.queryForList("""
            SELECT c.id_usuario AS idUsuario,COUNT(DISTINCT c.id_curso) AS total FROM pmo_certificados_curso c
            JOIN documentos_usuario d ON d.id_documento=c.id_documento AND d.id_usuario=c.id_usuario
            JOIN pmo_documento_revision v ON v.id_documento=d.id_documento
            WHERE v.estado='Legible' AND d.estado IN ('Aprobado','Aceptado','Liberada') GROUP BY c.id_usuario
            """))certificados.put(((Number)f.get("idUsuario")).intValue(),((Number)f.get("total")).intValue());
        List<Map<String,Object>> salida=new ArrayList<>();
        for(Map<String,Object> original:perfiles) {
            Map<String,Object> a=new LinkedHashMap<>(original);int id=((Number)a.get("idUsuario")).intValue();
            for(String campo:List.of("fechaInicio","fechaFin"))a.put(campo,texto(a.get(campo)));
            List<Map<String,Object>> docs=documentos.getOrDefault(id,List.of());List<String> faltantes=new ArrayList<>();
            for(String campo:List.of("matricula","universidad","carrera","fechaInicio","fechaFin","periodo"))if(texto(a.get(campo)).isBlank())faltantes.add("Datos académicos: "+campo);
            LocalDate inicio=fecha(a.get("fechaInicio")),fin=fecha(a.get("fechaFin"));if(inicio!=null&&fin!=null&&fin.isBefore(inicio))faltantes.add("Corregir las fechas de estadía");
            if(numero(a.get("metaHoras")).signum()<=0)faltantes.add("Definir la meta de horas de estadía");
            for(String tipo:List.of("presentacion","aceptacion"))if(docs.stream().noneMatch(d->normalizar(d.get("tipo")).contains(tipo)&&aprobado(d.get("estado"))&&"Legible".equals(d.get("estadoTecnico"))))faltantes.add("Carta de "+(tipo.equals("presentacion")?"presentación":"aceptación")+" aprobada y con PDF legible");
            int cursos=certificados.getOrDefault(id,0),objetivo=numero(a.get("totalCursos")).intValue();
            if(objetivo<=0||cursos<objetivo)faltantes.add("Certificados de cursos revisados: "+cursos+"/"+Math.max(0,objetivo));
            for(String campo:List.of("empresa","satisfaccion","foEst03"))if(!cierto(a.get(campo)))faltantes.add("Seguimiento pendiente: "+campo);
            long problemas=docs.stream().filter(d->!"rechazado".equals(normalizar(d.get("estado")))&&("Ilegible".equals(d.get("estadoTecnico"))||numero(d.get("duplicados")).signum()>0)).count();
            if(problemas>0)faltantes.add(problemas+" archivos ilegibles o duplicados para revisar");
            a.put("periodoGrupo",periodo(a.get("periodo")));a.put("anio",inicio==null?null:inicio.getYear());a.put("porcentajeHoras",porcentaje(numero(a.get("horasAprobadas")),numero(a.get("metaHoras"))));
            a.put("cursosDocumentados",cursos);a.put("faltantes",faltantes);a.put("documentos",docs);a.put("expedienteCompleto",faltantes.isEmpty());
            a.put("listoCarta",faltantes.isEmpty()&&numero(a.get("horasAprobadas")).compareTo(numero(a.get("metaHoras")))>=0);salida.add(a);
        }
        return salida;
    }
    private void prepararCartas(List<Map<String,Object>> alumnos) {
        int total=0;
        for(Map<String,Object> a:alumnos)if(Boolean.TRUE.equals(a.get("listoCarta"))&&"activo".equals(normalizar(a.get("estado")))) {
            String clave=texto(a.get("fechaInicio"))+"_"+texto(a.get("fechaFin"));
            Map<String,Object> carta=new LinkedHashMap<>();for(String campo:List.of("idUsuario","nombre","matricula","universidad","carrera","fechaInicio","fechaFin","horasAprobadas","metaHoras","asesorAcademico","asesorEmpresarial","periodoGrupo"))carta.put(campo,a.get(campo));
            total+=jdbc.update("INSERT INTO pmo_borradores_cartas(id_usuario,periodo_clave,datos_json,creado_en) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE datos_json=VALUES(datos_json)",a.get("idUsuario"),clave,json(carta),ahora())>0?1:0;
        }
        estado("cartas","Completada",total+" borradores preparados para revisión. La liberación requiere aprobación administrativa.");
    }
    private void recordatorios(List<Map<String,Object>> alumnos) {
        Set<String> vigentes=new HashSet<>();
        for(Map<String,Object> a:alumnos)if("activo".equals(normalizar(a.get("estado")))) {
            List<?> faltantes=(List<?>)a.get("faltantes");
            if(!faltantes.isEmpty())recordatorio(vigentes,"expediente-"+a.get("idUsuario"),a.get("idUsuario"),"Completa tu expediente",String.join("; ",faltantes.stream().map(Object::toString).toList()),"automatizaciones.html");
        }
        for(Map<String,Object> t:jdbc.queryForList("""
            SELECT t.id_tarea AS id,t.titulo,t.fecha_limite AS limite,u.id_usuario AS idUsuario,u.estado,r.nombre AS rol
            FROM tareas t JOIN miembros_equipo m ON m.id_miembro=t.id_miembro_asignado
            JOIN usuarios u ON u.id_usuario=m.id_usuario JOIN roles r ON r.id_rol=u.id_rol
            WHERE t.fecha_limite<=? AND LOWER(COALESCE(t.estado,'')) NOT IN ('completada','completado','terminada','terminado','finalizada','finalizado','cerrada','cerrado','cancelada','cancelado')
            """,hoy().plusDays(2)))if(alumno(t.get("rol"))&&"activo".equals(normalizar(t.get("estado"))))recordatorio(vigentes,"tarea-"+t.get("id"),t.get("idUsuario"),"Entrega de tarea",texto(t.get("titulo"))+". Fecha límite: "+texto(t.get("limite")),"tablero-tareas.html");
        for(Map<String,Object> h:jdbc.queryForList("""
            SELECT u.id_usuario AS idUsuario,COUNT(*) AS pendientes,u.estado,r.nombre AS rol
            FROM registros_horas h JOIN miembros_equipo m ON m.id_miembro=h.id_miembro
            JOIN usuarios u ON u.id_usuario=m.id_usuario JOIN roles r ON r.id_rol=u.id_rol
            WHERE h.estado_validacion='Pendiente' AND h.fecha<? GROUP BY u.id_usuario,u.estado,r.nombre
            """,hoy()))if(alumno(h.get("rol"))&&"activo".equals(normalizar(h.get("estado"))))recordatorio(vigentes,"horas-"+h.get("idUsuario"),h.get("idUsuario"),"Registros de horas pendientes",h.get("pendientes")+" registros anteriores necesitan revisión o justificación.","control-horas.html");
        LocalDate dia=hoy().minusDays(1);while(dia.getDayOfWeek().getValue()>5)dia=dia.minusDays(1);
        Set<Integer> registrados=new HashSet<>();
        for(Map<String,Object> h:jdbc.queryForList("SELECT DISTINCT m.id_usuario AS idUsuario FROM miembros_equipo m JOIN registros_horas h ON h.id_miembro=m.id_miembro WHERE h.fecha=? AND COALESCE(h.estado_validacion,'Pendiente')<>'Rechazado' AND h.horas_trabajadas>0",dia))registrados.add(((Number)h.get("idUsuario")).intValue());
        for(Map<String,Object> a:alumnos){LocalDate inicio=fecha(a.get("fechaInicio")),fin=fecha(a.get("fechaFin"));int id=numero(a.get("idUsuario")).intValue();
            if("activo".equals(normalizar(a.get("estado")))&&inicio!=null&&fin!=null&&!dia.isBefore(inicio)&&!dia.isAfter(fin)&&!registrados.contains(id))
                recordatorio(vigentes,"sin-registro-"+id,a.get("idUsuario"),"Día sin horas registradas","No hay horas registradas el "+dia+". Revisa tu asistencia o solicita registrar una justificación.","control-horas.html");}
        // Cada revisión resuelve solamente los avisos que ella misma administra.
        for(Map<String,Object> r:jdbc.queryForList("SELECT id,clave FROM pmo_recordatorios WHERE estado<>'Resuelto' AND (clave LIKE 'expediente-%' OR clave LIKE 'tarea-%' OR clave LIKE 'horas-%' OR clave LIKE 'sin-registro-%')"))if(!vigentes.contains(texto(r.get("clave"))))jdbc.update("UPDATE pmo_recordatorios SET estado='Resuelto',actualizado_en=? WHERE id=?",ahora(),r.get("id"));
        estado("recordatorios","Completada",vigentes.size()+" recordatorios vigentes dentro de la plataforma.");
    }
    private void recordatorio(Set<String> claves,String clave,Object usuario,String titulo,String detalle,String enlace) {
        claves.add(clave);jdbc.update("""
            INSERT INTO pmo_recordatorios(clave,id_usuario,titulo,descripcion,enlace,estado,actualizado_en) VALUES(?,?,?,?,?,'Abierto',?)
            ON DUPLICATE KEY UPDATE estado=IF(estado='Resuelto' OR descripcion<>VALUES(descripcion),'Abierto',estado),
                titulo=VALUES(titulo),descripcion=VALUES(descripcion),enlace=VALUES(enlace),actualizado_en=VALUES(actualizado_en)
            """,clave,usuario,titulo,detalle,enlace,ahora());
    }
    public List<Map<String,Object>> misRecordatorios(Integer id) { comprobar(id,false,false);return jdbc.queryForList("SELECT id,clave,titulo,descripcion,enlace,estado FROM pmo_recordatorios WHERE id_usuario=? AND estado<>'Resuelto' ORDER BY actualizado_en DESC",id); }
    public void marcarLeido(Integer id,Long recordatorio) { comprobar(id,false,false);if(jdbc.update("UPDATE pmo_recordatorios SET estado='Visto' WHERE id=? AND id_usuario=? AND estado='Abierto'",recordatorio,id)==0&&jdbc.queryForList("SELECT id FROM pmo_recordatorios WHERE id=? AND id_usuario=?",recordatorio,id).isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"No se encontró tu recordatorio."); }
    private void reporte(List<Map<String,Object>> alumnos) {
        ZonedDateTime fecha=reloj.instant().atZone(AsistenciaAutomaticaService.ZONA);
        LocalDate lunes=fecha.toLocalDate().with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        if(fecha.toLocalDate().equals(lunes)&&fecha.toLocalTime().isBefore(LocalTime.of(8,0)))return;
        LocalDate desde=lunes.minusWeeks(1),hasta=lunes.minusDays(1);
        if(!jdbc.queryForList("SELECT id FROM pmo_reportes_semanales WHERE desde=? AND hasta=?",desde,hasta).isEmpty())return;
        Map<Integer,Map<String,Object>> horas=new HashMap<>();
        for(Map<String,Object> h:jdbc.queryForList("""
            SELECT m.id_usuario AS idUsuario,SUM(h.horas_trabajadas) AS horasSemana FROM miembros_equipo m JOIN registros_horas h ON h.id_miembro=m.id_miembro
            WHERE h.estado_validacion='Aprobado' AND h.fecha BETWEEN ? AND ? GROUP BY m.id_usuario
            """,desde,hasta))horas.put(((Number)h.get("idUsuario")).intValue(),h);
        Map<Integer,Integer> tareas=new HashMap<>();
        for(Map<String,Object> t:jdbc.queryForList("""
            SELECT m.id_usuario AS idUsuario,COUNT(*) AS total FROM tareas t JOIN miembros_equipo m ON m.id_miembro=t.id_miembro_asignado
            WHERE LOWER(t.estado) IN ('completada','completado','terminada','terminado','finalizada','finalizado')
              AND t.fecha_actualizacion>=? AND t.fecha_actualizacion<? GROUP BY m.id_usuario
            """,desde.atStartOfDay(),hasta.plusDays(1).atStartOfDay()))tareas.put(((Number)t.get("idUsuario")).intValue(),((Number)t.get("total")).intValue());
        List<Map<String,Object>> filas=new ArrayList<>();for(Map<String,Object> a:alumnos){int id=((Number)a.get("idUsuario")).intValue();Map<String,Object> f=new LinkedHashMap<>();
            for(String campo:List.of("idUsuario","nombre","periodoGrupo","anio","horasAprobadas","metaHoras","porcentajeHoras","cursosDocumentados","totalCursos","faltantes"))f.put(campo,a.get(campo));
            f.put("horasSemana",horas.containsKey(id)?horas.get(id).get("horasSemana"):BigDecimal.ZERO);f.put("tareasTerminadas",tareas.getOrDefault(id,0));filas.add(f);}
        jdbc.update("INSERT IGNORE INTO pmo_reportes_semanales(desde,hasta,datos_json,creado_en) VALUES(?,?,?,?)",desde,hasta,json(Map.of("desde",desde.toString(),"hasta",hasta.toString(),"alumnos",filas)),ahora());
        estado("reportes","Completada","Reporte guardado del "+desde+" al "+hasta+".");
    }
    public Map<String,Object> panel(Integer id,boolean global) {
        Usuario u=comprobar(id,false,global);List<Map<String,Object>> lista=alumnos();if(!global)lista=lista.stream().filter(a->u.getId().equals(((Number)a.get("idUsuario")).intValue())).toList();
        Map<String,Object> r=new LinkedHashMap<>();r.put("estado","correcto");r.put("alumnos",lista);r.put("puedeGestionar",permisos.esSuperadministrador(u)||permisos.esAdministradorBase(u));r.put("recordatorios",misRecordatorios(id));
        if(global){r.put("configuracion",configuracion());r.put("ejecuciones",jdbc.queryForList("SELECT clave,estado,detalle,actualizado_en AS actualizado FROM pmo_automatizacion_estado WHERE clave NOT LIKE 'hora-%' ORDER BY clave"));
            r.put("reportes",jdbc.queryForList("SELECT id,desde,hasta,creado_en AS creado FROM pmo_reportes_semanales ORDER BY desde DESC LIMIT 20"));
            r.put("borradores",jdbc.queryForList("SELECT id,id_usuario AS idUsuario,periodo_clave AS periodo FROM pmo_borradores_cartas ORDER BY creado_en DESC"));}
        return r;
    }
    public Map<String,Object> obtenerReporte(Integer actor,Long id) { comprobar(actor,false,true);List<Map<String,Object>> filas=jdbc.queryForList("SELECT datos_json FROM pmo_reportes_semanales WHERE id=?",id);if(filas.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Reporte no encontrado.");return leer(filas.getFirst().get("datos_json")); }
    public Map<String,Object> obtenerBorrador(Integer actor,Long id) { comprobar(actor,true,true);List<Map<String,Object>> filas=jdbc.queryForList("SELECT id_usuario,datos_json FROM pmo_borradores_cartas WHERE id=?",id);if(filas.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Borrador no encontrado.");int alumno=((Number)filas.getFirst().get("id_usuario")).intValue();
        if(alumnos().stream().noneMatch(a->numero(a.get("idUsuario")).intValue()==alumno&&Boolean.TRUE.equals(a.get("listoCarta"))))throw new ResponseStatusException(HttpStatus.CONFLICT,"El expediente cambió o tiene requisitos pendientes. Actualiza la revisión.");return leer(filas.getFirst().get("datos_json")); }
    private void estado(String clave,String estado,String detalle) { jdbc.update("INSERT INTO pmo_automatizacion_estado(clave,estado,detalle,actualizado_en) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE estado=VALUES(estado),detalle=VALUES(detalle),actualizado_en=VALUES(actualizado_en)",clave,estado,detalle,ahora()); }
    private Map<String,Object> leer(Object valor) { if(texto(valor).isEmpty())return new LinkedHashMap<>();return mapper.readValue(texto(valor),new TypeReference<LinkedHashMap<String,Object>>(){}); }
    private String json(Object valor) { return mapper.writeValueAsString(valor); }
}
