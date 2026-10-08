package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CatalogoAsignacionesTest {
    final ProyectoRepository proyectos = mock(ProyectoRepository.class);
    final MiembroEquipoRepository miembros = mock(MiembroEquipoRepository.class);
    final MiembroProyectoRepository asignaciones = mock(MiembroProyectoRepository.class);
    final TareaRepository tareas = mock(TareaRepository.class);
    final CatalogoProyectosSepDic2026Service servicio = new CatalogoProyectosSepDic2026Service(proyectos, miembros, asignaciones, tareas);
    final Map<String, Proyecto> catalogo = new HashMap<>();
    final List<MiembroEquipo> alumnos = new ArrayList<>();
    final List<MiembroProyecto> enlaces = new ArrayList<>();
    final Map<Integer, List<Tarea>> actividades = new HashMap<>();

    @BeforeEach void preparar() {
        int n = 0;
        for (var item : servicio.getCatalogo()) {
            Proyecto p = new Proyecto(); p.setId(++n); p.setCodigo(item.codigo()); p.setNombre("Nombre editado");
            p.setDescripcion("Alcance editado"); p.setPorcentajeAvance(BigDecimal.valueOf(38)); catalogo.put(item.codigo(), p);
            Tarea t = new Tarea(); t.setId(n); t.setIdProyecto(n); t.setTitulo("Actividad capturada");
            t.setEstado("En progreso"); t.setHorasRegistradas(BigDecimal.valueOf(5));
            actividades.put(n, new ArrayList<>(List.of(t)));
        }
        when(proyectos.findByCodigo(anyString())).thenAnswer(i -> Optional.ofNullable(catalogo.get(i.getArgument(0))));
        when(miembros.findAll()).thenReturn(alumnos);
        when(miembros.findById(anyInt())).thenAnswer(i -> alumnos.stream().filter(a -> a.getId().equals(i.getArgument(0))).findFirst());
        when(asignaciones.findByIdProyectoOrderByFechaAsignacionDesc(anyInt())).thenAnswer(i -> enlaces.stream().filter(a -> a.getIdProyecto().equals(i.getArgument(0))).toList());
        when(asignaciones.existsByIdProyectoAndIdMiembro(anyInt(), anyInt())).thenAnswer(i -> enlaces.stream().anyMatch(a -> a.getIdProyecto().equals(i.getArgument(0)) && a.getIdMiembro().equals(i.getArgument(1))));
        when(asignaciones.findByIdProyectoAndIdMiembro(anyInt(), anyInt())).thenAnswer(i -> enlaces.stream().filter(a -> a.getIdProyecto().equals(i.getArgument(0)) && a.getIdMiembro().equals(i.getArgument(1))).findFirst());
        when(asignaciones.save(any())).thenAnswer(i -> { MiembroProyecto a = i.getArgument(0); if (!enlaces.contains(a)) enlaces.add(a); return a; });
        when(tareas.findByIdProyectoOrderByFechaCreacionDesc(anyInt())).thenAnswer(i -> actividades.get(i.getArgument(0)));
        when(tareas.save(any())).thenAnswer(i -> { Tarea t = i.getArgument(0); if (t.getId() == null) { t.setId(1000 + actividades.values().stream().mapToInt(List::size).sum()); actividades.get(t.getIdProyecto()).add(t); } return t; });
    }
    MiembroEquipo alumno(int id, String nombre) {
        Usuario u = new Usuario(); u.setId(id + 100); u.setEstado("Activo");
        MiembroEquipo m = new MiembroEquipo(); m.setId(id); m.setNombreCompleto(nombre); m.setEstado("Activo"); m.setUsuario(u); alumnos.add(m); return m;
    }
    void enlace(int proyecto, int miembro) {
        MiembroProyecto a = new MiembroProyecto(); a.setIdProyecto(proyecto); a.setIdMiembro(miembro); a.setRolProyecto("Estudiante"); enlaces.add(a);
    }

    @Test void vinculaNombreCompletoConAcentosYOrdenDiferenteYReparaTareaExistente() {
        alumno(40, "Jonathan Adrián Flores Morales"); alumno(2, "Karla Guadalupe Jiménez Villegas");
        servicio.sincronizarCatalogo();
        assertTrue(enlaces.stream().anyMatch(a -> a.getIdProyecto() == 4 && a.getIdMiembro() == 40));
        assertEquals(40, actividades.get(4).getFirst().getIdMiembroAsignado());
        assertEquals(2, actividades.get(2).getFirst().getIdMiembroAsignado());
        assertEquals("En progreso", actividades.get(4).getFirst().getEstado());
        assertEquals(BigDecimal.valueOf(5), actividades.get(4).getFirst().getHorasRegistradas());
        assertEquals("Nombre editado", catalogo.get("JJM-SD26-04").getNombre());
        verify(proyectos, never()).save(any());
    }
    @Test void sincronizarDeNuevoNoDuplicaNiReescribeTareasOAsignaciones() {
        alumno(1, "Rodrigo Pérez Tapia"); servicio.sincronizarCatalogo();
        clearInvocations(tareas, asignaciones, proyectos); servicio.sincronizarCatalogo();
        assertEquals(1, enlaces.size()); verify(asignaciones, never()).save(any()); verify(tareas, never()).save(any());
    }
    @Test void noUsaNombresParcialesVaciosNiCuentasDuplicadas() {
        alumno(1, "Emily Hernández López"); alumno(2, "Martell García López"); alumno(3, "");
        alumno(4, "Rodrigo Pérez Tapia"); alumno(5, "Rodrigo Pérez Tapia");
        servicio.sincronizarCatalogo(); assertTrue(enlaces.isEmpty());
        assertTrue(servicio.obtenerPorAlumno("Flores").isEmpty()); assertTrue(servicio.obtenerPorAlumno("---").isEmpty());
    }
    @Test void noAsignaMiembrosInactivosNiSinCuentaVinculada() {
        alumno(1, "Rodrigo Pérez Tapia").setEstado("Inactivo");
        alumno(2, "Jonathan Adrian Flores Morales").setUsuario(null);
        alumno(3, "Dana Erandi Hernández Franco").getUsuario().setEstado("Inactivo");
        servicio.sincronizarCatalogo(); assertTrue(enlaces.isEmpty());
    }
    @Test void conservaAlumnoConfirmadoManualmenteYTareaDeOtroResponsable() {
        alumno(1, "Rodrigo Pérez Tapia"); alumno(2, "Alumno confirmado distinto"); enlace(1, 2);
        actividades.get(1).getFirst().setIdMiembroAsignado(77); servicio.sincronizarCatalogo();
        assertEquals(1, enlaces.size()); assertEquals(2, enlaces.getFirst().getIdMiembro());
        assertEquals(77, actividades.get(1).getFirst().getIdMiembroAsignado());
    }
    @Test void variosAlumnosDeUnEquipoNoRecibenAutomaticamenteLasTareasDeOtro() {
        alumno(1, "Rodrigo Pérez Tapia"); alumno(2, "Alumno Dos Apellidos"); enlace(1, 1); enlace(1, 2);
        servicio.sincronizarCatalogo(); assertNull(actividades.get(1).getFirst().getIdMiembroAsignado());
    }
    @Test void creaPlanEditableSoloSiNoHayTareasYNoLoDuplica() {
        alumno(1, "Rodrigo Pérez Tapia"); actividades.get(1).clear(); servicio.sincronizarCatalogo(); servicio.sincronizarCatalogo();
        assertEquals(10, actividades.get(1).size());
        assertTrue(actividades.get(1).stream().allMatch(t -> t.getIdMiembroAsignado() == 1 && t.getDescripcion().contains("Plan inicial editable")));
        assertEquals(BigDecimal.valueOf(600), actividades.get(1).stream().map(Tarea::getHorasEstimadas).reduce(BigDecimal.ZERO, BigDecimal::add));
    }
    @Test void administradorConfirmaEmilyYTareasYARespetaAsignacionEnSiguienteArranque() {
        alumno(8, "Emily Hernández López"); servicio.asignarAlumnoConfirmado("JJM-SD26-08", 8);
        assertEquals(8, actividades.get(8).getFirst().getIdMiembroAsignado());
        servicio.sincronizarCatalogo(); assertEquals(1, enlaces.size());
        assertThrows(IllegalArgumentException.class, () -> servicio.asignarAlumnoConfirmado("OTRO-PERIODO", 8));
    }
    @Test void reporteConservaQuinceEquiposYMuestraCriptoSinAlumno() {
        alumno(1, "Rodrigo Pérez Tapia"); servicio.sincronizarCatalogo();
        var filas = (List<Map<String,Object>>) servicio.obtenerAsignaciones().get("proyectos");
        assertEquals(15, filas.size()); assertEquals("Asignado", filas.getFirst().get("estado"));
        assertNull(filas.get(11).get("alumnoPDF")); assertEquals("Pendiente de confirmar", filas.get(11).get("estado"));
    }
    @Test void confirmarMiembroYaVinculadoConservaSuRolYNoCreaOtraRelacion() {
        alumno(8, "Emily Hernández López"); enlace(8, 8);
        enlaces.getFirst().setRolProyecto("Desarrollador"); enlaces.getFirst().setNotas("Nota del equipo");
        servicio.asignarAlumnoConfirmado("JJM-SD26-08", 8);
        assertEquals(1, enlaces.size()); assertEquals("Desarrollador", enlaces.getFirst().getRolProyecto());
        assertTrue(enlaces.getFirst().getNotas().startsWith("Nota del equipo"));
        servicio.sincronizarCatalogo(); assertEquals(1, enlaces.size());
        var filas = (List<Map<String,Object>>) servicio.obtenerAsignaciones().get("proyectos");
        assertEquals("Asignado", filas.get(7).get("estado"));
    }
}
