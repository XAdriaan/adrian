package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Reconocimiento administrativo solicitado para un corte fijo; no genera conexiones pasadas. */
@Service
public class RegularizacionHorasService {
    public static final LocalDate DESDE=LocalDate.of(2026,9,1), HASTA=LocalDate.of(2026,10,12);
    public static final String ORIGEN="Regularización administrativa Septiembre-Diciembre 2026 (01/09/2026 a 12/10/2026).";
    private final UsuarioRepository usuarios;
    private final MiembroEquipoRepository miembros;
    private final RegistroHorasRepository registros;
    private final JornadaAutomaticaRepository jornadas;
    private final JdbcTemplate jdbc;
    private final PermisosService permisos;
    private final BitacoraService bitacora;
    private final Clock reloj;
    public RegularizacionHorasService(UsuarioRepository usuarios,MiembroEquipoRepository miembros,
            RegistroHorasRepository registros,JornadaAutomaticaRepository jornadas,JdbcTemplate jdbc,
            PermisosService permisos,BitacoraService bitacora,Clock reloj) {
        this.usuarios=usuarios;this.miembros=miembros;this.registros=registros;this.jornadas=jornadas;
        this.jdbc=jdbc;this.permisos=permisos;this.bitacora=bitacora;this.reloj=reloj;
    }
    public static List<LocalDate> dias() { return DESDE.datesUntil(HASTA.plusDays(1)).filter(d->d.getDayOfWeek().getValue()<=5).toList(); }
    private Usuario comprobar(Integer id) {
        Usuario u=id==null?null:usuarios.findById(id).orElse(null);
        if(u==null || !"Activo".equalsIgnoreCase(u.getEstado()) || !(permisos.esSuperadministrador(u)||permisos.esAdministradorBase(u)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Solo administración puede reconocer las horas del periodo.");
        if(reloj.instant().atZone(AsistenciaAutomaticaService.ZONA).toLocalDate().isBefore(HASTA))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"El corte autorizado corresponde al 12 de octubre de 2026.");
        return u;
    }
    private List<Integer> alumnos() {
        return jdbc.queryForList("""
            SELECT u.id_usuario AS id, r.nombre AS rol, d.periodo_estadia AS periodo, d.fecha_inicio AS inicio
            FROM usuarios u INNER JOIN roles r ON r.id_rol=u.id_rol
            INNER JOIN datos_academicos_usuario d ON d.id_usuario=u.id_usuario
            ORDER BY u.id_usuario
            """).stream().filter(RegularizacionHorasService::corresponde).map(f->((Number)f.get("id")).intValue()).distinct().toList();
    }
    static boolean corresponde(Map<String,Object> fila) {
        String rol=normalizar(Objects.toString(fila.get("rol"),"")),periodo=normalizar(Objects.toString(fila.get("periodo"),""));
        String inicio=Objects.toString(fila.get("inicio"),"");
        return Set.of("colaborador","alumno","alumna","estudiante","estudiante pmo").contains(rol)
                && periodo.startsWith("sep") && periodo.contains("dic")
                && (inicio.startsWith("2026-") || periodo.contains("2026"));
    }
    @Transactional(readOnly=true)
    public Map<String,Object> previsualizar(Integer id) {
        comprobar(id);List<Map<String,Object>> personas=new ArrayList<>();
        for(Integer alumno:alumnos()) {
            Usuario u=usuarios.findById(alumno).orElseThrow();MiembroEquipo m=miembros.findByUsuarioId(alumno).orElse(null);
            List<RegistroHoras> lista=m==null?List.of():registros.findByIdMiembroAndFechaBetweenOrderByFechaDescFechaCreacionDesc(m.getId(),DESDE,HASTA);
            BigDecimal faltante=BigDecimal.ZERO,existentes=BigDecimal.ZERO,porAprobar=BigDecimal.ZERO; int porIdentificar=0;
            for(LocalDate dia:dias()){
                BigDecimal horas=horasDia(lista,dia);existentes=existentes.add(horas);faltante=faltante.add(faltan(horas));
                List<RegistroHoras> validos=validosDia(lista,dia);
                porAprobar=porAprobar.add(validos.stream().filter(r->!"Aprobado".equalsIgnoreCase(r.getEstadoValidacion())).map(r->r.getHorasTrabajadas()==null?BigDecimal.ZERO:r.getHorasTrabajadas().max(BigDecimal.ZERO)).reduce(BigDecimal.ZERO,BigDecimal::add));
                if(!validos.isEmpty()&&validos.stream().noneMatch(RegularizacionHorasService::esRegularizado))porIdentificar++;
            }
            personas.add(Map.of("idUsuario",alumno,"nombre",nombre(u),"horasExistentes",existentes,"horasPorReconocer",faltante,"horasPorAprobar",porAprobar,"diasPorIdentificar",porIdentificar,"objetivoHoras",300));
        }
        return Map.of("estado","correcto","desde",DESDE.toString(),"hasta",HASTA.toString(),"diasHabiles",dias().size(),"horasPorAlumno",300,"alumnos",personas);
    }
    @Transactional
    public Map<String,Object> aplicar(Integer id) {
        Usuario actor=comprobar(id);int creados=0,aprobados=0,identificados=0;BigDecimal reconocidas=BigDecimal.ZERO,horasAprobadas=BigDecimal.ZERO;
        List<Integer> ids=alumnos();
        for(Integer alumno:ids) {
            Usuario u=usuarios.buscarParaAsistencia(alumno).orElseThrow();
            // Vuelve a comprobar el grupo bajo el bloqueo de cada cuenta.
            boolean sigueEnGrupo=jdbc.queryForList("""
                    SELECT u.id_usuario AS id,r.nombre AS rol,d.periodo_estadia AS periodo,d.fecha_inicio AS inicio
                    FROM usuarios u INNER JOIN roles r ON r.id_rol=u.id_rol
                    INNER JOIN datos_academicos_usuario d ON d.id_usuario=u.id_usuario WHERE u.id_usuario=? FOR UPDATE
                    """,alumno).stream().anyMatch(RegularizacionHorasService::corresponde);
            if(!sigueEnGrupo)throw new ResponseStatusException(HttpStatus.CONFLICT,"Cambió el periodo de un alumno. Actualiza la vista antes de aplicar el ajuste.");
            MiembroEquipo miembro=miembros.buscarParaRegularizacion(alumno).orElse(null);
            if(miembro==null) {
                miembro=new MiembroEquipo();miembro.setUsuario(u);miembro.setNombreCompleto(nombre(u));miembro.setCorreo(u.getCorreo());miembro.setTelefono(u.getTelefono());
                miembro.setRol(u.getRol().getNombre());miembro.setEstado(u.getEstado());miembro.setHorasDisponibles(BigDecimal.ZERO);
                miembro.setNotas("Vinculación creada para reconocer las horas autorizadas del periodo Septiembre-Diciembre 2026.");miembro=miembros.saveAndFlush(miembro);
            }
            List<RegistroHoras> lista=registros.buscarParaRegularizacion(miembro.getId(),DESDE,HASTA);
            for(LocalDate dia:dias()) {
                BigDecimal agregar=faltan(horasDia(lista,dia));
                List<RegistroHoras> validos=validosDia(lista,dia);
                // Aprueba las horas que ya se contaron en este corte, sin cambiar su duración ni sus conexiones.
                for(RegistroHoras existente:validos) {
                    if(!"Aprobado".equalsIgnoreCase(existente.getEstadoValidacion())) {
                        existente.setEstadoValidacion("Aprobado");existente.setIdUsuarioValidador(actor.getId());registros.save(existente);
                        aprobados++;horasAprobadas=horasAprobadas.add(existente.getHorasTrabajadas()==null?BigDecimal.ZERO:existente.getHorasTrabajadas().max(BigDecimal.ZERO));
                    }
                }
                if(agregar.signum()<=0) {
                    if(!validos.isEmpty()&&validos.stream().noneMatch(RegularizacionHorasService::esRegularizado)) {
                        RegistroHoras origen=validos.getFirst();
                        origen.setDescripcion(Objects.toString(origen.getDescripcion(),"")+"\n"+ORIGEN+" Horario reconocido: 07:00 a 17:00.");
                        registros.save(origen);identificados++;
                    }
                    continue;
                }
                RegistroHoras r=new RegistroHoras();r.setIdMiembro(miembro.getId());r.setFecha(dia);r.setHorasTrabajadas(agregar);
                r.setTipoRegistro("Manual");r.setIncidente("normal");r.setDescripcion(ORIGEN+" Jornada de 07:00 a 17:00 reconocida por administración.");
                r.setEstadoValidacion("Aprobado");r.setIdUsuarioValidador(actor.getId());
                registros.saveAndFlush(r);creados++;reconocidas=reconocidas.add(agregar);
            }
            // El día reconocido completo conserva los tiempos observados y deja de sumar nuevas horas.
            for(JornadaAutomatica j:jornadas.findByIdUsuarioAndFinalizadaFalse(alumno)) {
                if(j.getFecha().isBefore(DESDE)||j.getFecha().isAfter(HASTA))continue;
                j.setFinalizada(true);j.setConexiones("");jornadas.save(j);
                registros.findById(j.getIdRegistro()).ifPresent(r->{
                    if(r.getHoraSalida()!=null)return;
                    ZonedDateTime corte=j.getFecha().equals(reloj.instant().atZone(AsistenciaAutomaticaService.ZONA).toLocalDate())
                            ? reloj.instant().atZone(AsistenciaAutomaticaService.ZONA)
                            : Instant.ofEpochSecond(j.getLiquidado()).atZone(AsistenciaAutomaticaService.ZONA);
                    if(corte.toLocalDate().equals(j.getFecha())){r.setHoraSalida(corte.toLocalTime().withNano(0));registros.save(r);}
                });
            }
        }
        bitacora.registrar(actor.getId(),"HORAS","REGULARIZACION_SEP_DIC_2026","Usuarios",null,
                "Reconocimiento administrativo de 30 días hábiles (300 horas por alumno), del 01/09/2026 al 12/10/2026. "+ids.size()+" alumnos; "+creados+" registros nuevos; "+aprobados+" registros anteriores aprobados; "+identificados+" días identificados con horario reconocido.",null,reconocidas.add(horasAprobadas).toPlainString());
        return Map.of("estado","correcto","mensaje","Regularización aplicada. Se completaron las horas faltantes del periodo autorizado.","alumnos",ids.size(),"registrosCreados",creados,"horasReconocidas",reconocidas,"registrosAprobados",aprobados,"horasAprobadas",horasAprobadas,"diasIdentificados",identificados,"horasPorAlumno",300);
    }
    public static boolean esRegularizado(RegistroHoras r) {
        return r!=null && r.getFecha()!=null && !r.getFecha().isBefore(DESDE) && !r.getFecha().isAfter(ReconocimientoHoras2026Service.CORTE)
                && r.getFecha().getDayOfWeek().getValue()<=5 && !"Rechazado".equalsIgnoreCase(r.getEstadoValidacion())
                && (Objects.toString(r.getDescripcion(),"").contains(ORIGEN)||Objects.toString(r.getDescripcion(),"").contains(ReconocimientoHoras2026Service.ORIGEN));
    }
    private static List<RegistroHoras> validosDia(List<RegistroHoras> lista,LocalDate dia) {
        return lista.stream().filter(r->dia.equals(r.getFecha())&&!"Rechazado".equalsIgnoreCase(r.getEstadoValidacion())).toList();
    }
    static BigDecimal horasDia(List<RegistroHoras> lista,LocalDate dia) { return lista.stream().filter(r->dia.equals(r.getFecha())&&!"Rechazado".equalsIgnoreCase(r.getEstadoValidacion())).map(r->r.getHorasTrabajadas()==null?BigDecimal.ZERO:r.getHorasTrabajadas().max(BigDecimal.ZERO)).reduce(BigDecimal.ZERO,BigDecimal::add); }
    static BigDecimal faltan(BigDecimal existentes) { return BigDecimal.TEN.subtract(existentes).max(BigDecimal.ZERO); }
    private static String nombre(Usuario u) { return (Objects.toString(u.getNombre(),"")+" "+Objects.toString(u.getApellidoPaterno(),"")+" "+Objects.toString(u.getApellidoMaterno(),"")).trim().replaceAll("\\s+"," "); }
    private static String normalizar(String s) { return Normalizer.normalize(s,Normalizer.Form.NFD).replaceAll("\\p{M}","").trim().toLowerCase(Locale.ROOT); }
}
