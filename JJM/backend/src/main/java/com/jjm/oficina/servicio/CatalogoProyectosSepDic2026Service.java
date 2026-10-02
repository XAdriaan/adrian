package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.MiembroEquipo;
import com.jjm.oficina.modelo.MiembroProyecto;
import com.jjm.oficina.modelo.Proyecto;
import com.jjm.oficina.repositorio.MiembroEquipoRepository;
import com.jjm.oficina.repositorio.MiembroProyectoRepository;
import com.jjm.oficina.repositorio.ProyectoRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Catálogo oficial de proyectos del periodo Septiembre - Diciembre 2026.
 *
 * Los títulos largos provienen del documento oficial de asignación entregado
 * por JJM. En los equipos donde el documento incluye un título en azul, ese
 * título es el que se considera nombre oficial para mostrar en la plataforma.
 *
 * La tabla proyectos conserva una etiqueta corta en la columna nombre para no
 * romper el esquema existente (VARCHAR(180)); el título completo se guarda en
 * descripcion y se expone desde los controladores como nombre visual.
 *
 * La sincronización es idempotente: usa códigos JJM-SD26-XX, no borra proyectos
 * existentes y no elimina asignaciones creadas manualmente.
 */
@Service
public class CatalogoProyectosSepDic2026Service implements ApplicationRunner {

    private static final Logger LOGGER = Logger.getLogger(
            CatalogoProyectosSepDic2026Service.class.getName()
    );

    public record ProyectoCatalogo(
            String equipo,
            String codigo,
            String etiquetaCorta,
            String nombreOficial,
            String alumnoFuente,
            String clavesFuente
    ) {
    }

    private static final List<ProyectoCatalogo> CATALOGO = List.of(
            new ProyectoCatalogo(
                    "01",
                    "JJM-SD26-01",
                    "Equipo 01 · E-Commerce",
                    "Propuesta Innovadora de solución Web y aplicación móvil para realizar la comercialización de Productos y Servicios con causa (E-commerce) con Chatbot e Inteligencia Artificial (IA) para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026.",
                    "Rodrigo Pérez Tapia",
                    "E-Commerce"
            ),
            new ProyectoCatalogo(
                    "02",
                    "JJM-SD26-02",
                    "Equipo 02 · E-Learning / PWEB / PPCV",
                    "Mejora e Innovación de 3 Soluciones Tecnológicas (Administración Integral): Plataforma E-learning (de 5,000 a 50,000 usuarios), Herramientas web en minutos (PWEB) y Proyección Profesional (PPCV) para la empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026. (Integración de los 3 proyectos asignados)",
                    "Jimenez Villegas Karla Guadalupe",
                    "E-Learning / PWEB / PPCV"
            ),
            new ProyectoCatalogo(
                    "03",
                    "JJM-SD26-03",
                    "Equipo 03 · JJM / PCP",
                    "Mejora e Innovación de 2 Soluciones Tecnológicas (Administración Integral): Solución Web y Aplicación móvil para la empresa JJM Tecnologías Innovadoras, S.A de C.V. y la 2da. Empresa es la Administración Integral de los Especialistas en Psicología y Áreas Afines en el 2026. (Integración de los 3 proyectos asignados)",
                    "Metzli Citlalli Gamero Gaytan",
                    "JJM / PCP"
            ),
            new ProyectoCatalogo(
                    "04",
                    "JJM-SD26-04",
                    "Equipo 04 · Compranet / Proyectos / Publicidad",
                    "Mejora e Innovación de 3 Soluciones Tecnológicas (Administración Integral): Compranet, Oficina de Proyectos y Publicidad para la empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026. (Integración de los 3 proyectos asignados)",
                    "Jonathan Adrian Flores Morales",
                    "Compranet / Proyectos / Publicidad"
            ),
            new ProyectoCatalogo(
                    "05",
                    "JJM-SD26-05",
                    "Equipo 05 · OTO / COMPITE / Brocas",
                    "Mejora e Innovación de 3 Soluciones Tecnológicas (Administración Integral): Pacientes en Consultorio (OTO), Concursos por Materia de Competencias Multidisciplinarias (COMPITE) y Productos Chinos (Brocas) en el Sector Ferretero para la empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026. (Integración de los 3 proyectos asignados)",
                    "Carmona García Leonardo Maximiliano",
                    "Otorrino (OTO) / Compite / Brocas"
            ),
            new ProyectoCatalogo(
                    "06",
                    "JJM-SD26-06",
                    "Equipo 06 · Credenciales",
                    "Propuesta innovadora de Credenciales Digitales que sean administradas mediante un Sistema de Gestión Web y aplicación móvil con Chatbot e Inteligencia Artificial (IA) con el que se conozca la trazabilidad de los afiliados administración integral tanto internos (Colaboradores) como externos para cualquier tipo de organización en el 2026.",
                    "Angel Zamora Joshua Misael",
                    "Credenciales"
            ),
            new ProyectoCatalogo(
                    "07",
                    "JJM-SD26-07",
                    "Equipo 07 · Servidores Windows / Linux",
                    "Propuesta innovadora de un autómata que opere con inteligencia artificial (IA), cuente con mecanismos de auto aprendizaje, ejecute soluciones en tiempo real de forma local y remota, administre de forma integral todos los proyectos contenidos en el servidor web (Linux) para la empresa JJM Tecnologías Innovadoras, S.A. DE C.V. en el 2026",
                    "Martell",
                    "Servidores (Windows y Linux)"
            ),
            new ProyectoCatalogo(
                    "08",
                    "JJM-SD26-08",
                    "Equipo 08 · Punto de Venta (PV)",
                    "Propuesta Innovadora de solución Web y aplicación móvil para optimizar la administración integral (desde los proveedores hasta el consumidor final) de un negocio que comercializa Productos y Servicios con Chatbot e Inteligencia Artificial (IA) para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026.",
                    "Emily",
                    "Punto de Venta (PV)"
            ),
            new ProyectoCatalogo(
                    "09",
                    "JJM-SD26-09",
                    "Equipo 09 · KOVA",
                    "Propuesta Innovadora de solución Web y aplicación móvil para realizar la administración integral del expediente clínico de los chihuahuas, Geolocalización en tiempo real (NFC), comercialización de productos (NFC) y servicios mediante en línea mediante el uso del Chatbot e Inteligencia Artificial (IA) para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026.",
                    "Remigio Elizalde Kevin Uriel",
                    "KOVA"
            ),
            new ProyectoCatalogo(
                    "10",
                    "JJM-SD26-10",
                    "Equipo 10 · QUANTUM TV",
                    "Propuesta Innovadora (solución Web y aplicación móvil) de una Plataforma Universal (libre y de paga) Inclusiva de Streaming que incluya navegación por voz inteligente, Chatbot e Inteligencia Artificial (IA) conversacional Multilenguaje accesible para cualquier tipo de televisor (con y sin Smart TV) y que se pueda ver y ejecutar desde la laptop, móvil, tablet y/o algún dispositivo similar para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026.",
                    "Edgr Ivan Castañeda Juarez",
                    "QUANTUM TV"
            ),
            new ProyectoCatalogo(
                    "11",
                    "JJM-SD26-11",
                    "Equipo 11 · Huella Verso / Hulla Digital",
                    "Propuesta Innovadora (solución Web y aplicación móvil) que considera el Expediente Clínico Veterinario Digital + Red Social Familiar para Mascotas + Marketplace + Telemedicina Veterinaria + Chatbot + Inteligencia Artificial (IA) + Agenda Digital + Geolocalización en tiempo real (NFC) Sistema de Alertas y Trazabilidad de Vida del Animal para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026.",
                    "Dana Erandi Hernández Franco",
                    "Huella Verso (HV) / Hulla Digital (HD)"
            ),
            new ProyectoCatalogo(
                    "12",
                    "JJM-SD26-12",
                    "Equipo 12 · CRIPTO / INNOCRYP / CRYPFULL",
                    "Propuesta Innovadora (solución Web y aplicación móvil) que realice la compresión extrema de información, preservación total de calidad, encriptación y cifrado avanzado, formato propietario, interoperabilidad universal, seguridad anti piratería y acceso controlado dentro de una organización mediante el uso del Chatbot + Inteligencia Artificial (IA) para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026.",
                    null,
                    "CRIPTO (CR) / INNOCRYP (IQ) / CRYPFULL (CF)"
            ),
            new ProyectoCatalogo(
                    "13",
                    "JJM-SD26-13",
                    "Equipo 13 · EXAMINA (EX)",
                    "Propuesta Innovadora (solución Web y aplicación móvil) que realice Solución inteligente de evaluación digital que crea exámenes personalizados, bloquea entornos externos, supervisa comportamiento, identifica patrones de copia, mide tiempos de resolución y genera alertas académicas automáticas. mediante el uso del Chatbot + Inteligencia Artificial (IA) para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026.",
                    "Diana Paola Cesar Hernández",
                    "EXAMINA (EX)"
            ),
            new ProyectoCatalogo(
                    "14",
                    "JJM-SD26-14",
                    "Equipo 14 · BTP MEXICO / TECHTRACE 360 GLOBAL",
                    "Propuesta Innovadora de una Solución tecnológica integral (Web y aplicación móvil) con Inteligencia Artificial, ChatBot que realice el diagnóstico avanzado para monitoreo en tiempo real la realización del mantenimiento de cualquier tipo de equipo electrónico y que haga uso de software, soporte remoto, gestión comercial, e-Commerce, eLearning y atención global multilingüe para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026.",
                    "David Mondragón Cardoso",
                    "BTP MEXICO / TECHTRACE 360 GLOBAL"
            ),
            new ProyectoCatalogo(
                    "15",
                    "JJM-SD26-15",
                    "Equipo 15 · AION JULIUS",
                    "Autómata Inteligente de Operaciones Neurales que sea una Superinteligencia Artificial (ASI), capaz de crear diversas Inteligencias artificiales generales (AGIS) y que cada AGIS cree y administre las IA´s independientes y especializadas, autoaprendientes y especializadas, operando como sistema operativo independiente para soluciones universales en la empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026",
                    "Vilegas Sierra Adrián",
                    "AION JULIUS"
            )
    );

    private final ProyectoRepository proyectoRepository;
    private final MiembroEquipoRepository miembroEquipoRepository;
    private final MiembroProyectoRepository miembroProyectoRepository;

    @Value("${jjm.catalogo.sep-dic-2026.enabled:true}")
    private boolean habilitado;

    public CatalogoProyectosSepDic2026Service(
            ProyectoRepository proyectoRepository,
            MiembroEquipoRepository miembroEquipoRepository,
            MiembroProyectoRepository miembroProyectoRepository
    ) {
        this.proyectoRepository = proyectoRepository;
        this.miembroEquipoRepository = miembroEquipoRepository;
        this.miembroProyectoRepository = miembroProyectoRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!habilitado) {
            LOGGER.info("Catálogo Sep-Dic 2026 deshabilitado por configuración.");
            return;
        }

        try {
            sincronizarCatalogo();
        } catch (Exception ex) {
            // No impedir que el backend arranque si la BD de producción no permite
            // alguna operación. Se deja rastro claro en el log para corregirlo.
            LOGGER.warning(
                    "No fue posible sincronizar por completo el catálogo Sep-Dic 2026: "
                            + ex.getMessage()
            );
        }
    }

    public synchronized void sincronizarCatalogo() {
        for (ProyectoCatalogo item : CATALOGO) {
            Proyecto proyecto = proyectoRepository.findByCodigo(item.codigo())
                    .orElseGet(Proyecto::new);

            boolean nuevo = proyecto.getId() == null;

            proyecto.setCodigo(item.codigo());
            proyecto.setNombre(item.etiquetaCorta());
            proyecto.setDescripcion(item.nombreOficial());
            proyecto.setClienteArea(item.clavesFuente());
            proyecto.setClasificacionProyecto("Interno");
            proyecto.setTipoProyecto("Normal");

            if (nuevo) {
                proyecto.setEstado("Ejecución");
                proyecto.setPrioridad("Media");
                proyecto.setFechaInicio(LocalDate.of(2026, 9, 1));
                proyecto.setFechaFin(LocalDate.of(2026, 12, 14));
                proyecto.setPorcentajeAvance(BigDecimal.ZERO);
                proyecto.setObservacionesGenerales(
                        "Catálogo oficial Septiembre - Diciembre 2026 · Equipo "
                                + item.equipo()
                );
            }

            Proyecto guardado = proyectoRepository.save(proyecto);
            sincronizarAlumno(guardado, item);
        }
    }

    private void sincronizarAlumno(
            Proyecto proyecto,
            ProyectoCatalogo item
    ) {
        if (item.alumnoFuente() == null || item.alumnoFuente().isBlank()) {
            LOGGER.info(
                    "Equipo " + item.equipo()
                            + ": el documento fuente no muestra un alumno para asignar."
            );
            return;
        }

        List<MiembroEquipo> coincidencias = buscarMiembros(item.alumnoFuente());

        if (coincidencias.size() != 1) {
            LOGGER.info(
                    "Equipo " + item.equipo()
                            + ": se esperó una coincidencia para '"
                            + item.alumnoFuente()
                            + "' y se encontraron "
                            + coincidencias.size()
                            + ". La asignación automática se omitió."
            );
            return;
        }

        MiembroEquipo alumno = coincidencias.get(0);

        if (!"Activo".equalsIgnoreCase(alumno.getEstado())) {
            LOGGER.info(
                    "Equipo " + item.equipo()
                            + ": el alumno localizado está inactivo; no se asignó."
            );
            return;
        }

        if (miembroProyectoRepository.existsByIdProyectoAndIdMiembro(
                proyecto.getId(),
                alumno.getId()
        )) {
            return;
        }

        MiembroProyecto asignacion = new MiembroProyecto();
        asignacion.setIdProyecto(proyecto.getId());
        asignacion.setIdMiembro(alumno.getId());
        asignacion.setRolProyecto("Estudiante");
        asignacion.setHorasAsignadas(BigDecimal.ZERO);
        asignacion.setNotas(
                "Asignación automática según catálogo oficial Septiembre - Diciembre 2026."
        );

        miembroProyectoRepository.save(asignacion);
    }

    private List<MiembroEquipo> buscarMiembros(String nombreFuente) {
        String normalizadoFuente = normalizar(nombreFuente);
        Set<String> tokensFuente = tokens(normalizadoFuente);
        List<MiembroEquipo> miembros = miembroEquipoRepository.findAll();
        List<MiembroEquipo> exactos = new ArrayList<>();

        for (MiembroEquipo miembro : miembros) {
            String normalizadoMiembro = normalizar(miembro.getNombreCompleto());
            if (normalizadoMiembro.equals(normalizadoFuente)) {
                exactos.add(miembro);
            }
        }

        if (!exactos.isEmpty()) {
            return exactos;
        }

        List<MiembroEquipo> porTokens = new ArrayList<>();

        for (MiembroEquipo miembro : miembros) {
            Set<String> tokensMiembro = tokens(normalizar(miembro.getNombreCompleto()));

            boolean coincide;
            if (tokensFuente.size() == 1) {
                coincide = tokensMiembro.containsAll(tokensFuente);
            } else {
                coincide = tokensMiembro.containsAll(tokensFuente)
                        || tokensFuente.containsAll(tokensMiembro);
            }

            if (coincide) {
                porTokens.add(miembro);
            }
        }

        return porTokens;
    }

    public String obtenerNombreVisual(Proyecto proyecto) {
        if (proyecto == null) {
            return null;
        }

        return obtenerPorCodigo(proyecto.getCodigo())
                .map(ProyectoCatalogo::nombreOficial)
                .orElse(proyecto.getNombre());
    }

    public String obtenerEtiquetaCorta(Proyecto proyecto) {
        if (proyecto == null) {
            return null;
        }

        return obtenerPorCodigo(proyecto.getCodigo())
                .map(ProyectoCatalogo::etiquetaCorta)
                .orElse(proyecto.getNombre());
    }

    public Optional<ProyectoCatalogo> obtenerPorCodigo(String codigo) {
        String codigoNormalizado = String.valueOf(codigo == null ? "" : codigo)
                .trim();

        return CATALOGO.stream()
                .filter(item -> item.codigo().equalsIgnoreCase(codigoNormalizado))
                .findFirst();
    }

    public Optional<ProyectoCatalogo> obtenerPorAlumno(String nombreAlumno) {
        if (nombreAlumno == null || nombreAlumno.isBlank()) {
            return Optional.empty();
        }

        String nombreNormalizado = normalizar(nombreAlumno);
        Set<String> tokensNombre = tokens(nombreNormalizado);

        return CATALOGO.stream()
                .filter(item -> item.alumnoFuente() != null)
                .filter(item -> {
                    Set<String> tokensCatalogo = tokens(normalizar(item.alumnoFuente()));
                    if (tokensCatalogo.size() == 1) {
                        return tokensNombre.containsAll(tokensCatalogo);
                    }
                    return tokensNombre.containsAll(tokensCatalogo)
                            || tokensCatalogo.containsAll(tokensNombre);
                })
                .findFirst();
    }

    public List<String> obtenerNombresAsignados(Integer idProyecto) {
        if (idProyecto == null) {
            return List.of();
        }

        LinkedHashSet<String> nombres = new LinkedHashSet<>();

        miembroProyectoRepository
                .findByIdProyectoOrderByFechaAsignacionDesc(idProyecto)
                .forEach(asignacion -> miembroEquipoRepository
                        .findById(asignacion.getIdMiembro())
                        .map(MiembroEquipo::getNombreCompleto)
                        .filter(nombre -> nombre != null && !nombre.isBlank())
                        .ifPresent(nombres::add));

        return List.copyOf(nombres);
    }

    public Map<String, Object> obtenerResumenCatalogo() {
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("periodo", "Septiembre - Diciembre 2026");
        resumen.put("total", CATALOGO.size());
        resumen.put("proyectos", CATALOGO);
        return resumen;
    }

    public List<ProyectoCatalogo> getCatalogo() {
        return CATALOGO;
    }

    private Set<String> tokens(String normalizado) {
        return Arrays.stream(normalizado.split("\\s+"))
                .filter(token -> !token.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String normalizar(String valor) {
        String base = String.valueOf(valor == null ? "" : valor)
                .trim()
                .toLowerCase(Locale.ROOT);

        String sinAcentos = Normalizer.normalize(base, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");

        return sinAcentos
                .replaceAll("[^a-z0-9ñ]+", " ")
                .trim()
                .replaceAll("\\s+", " ");
    }
}
