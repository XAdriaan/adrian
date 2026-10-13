package com.jjm.oficina.controller;
import com.jjm.oficina.config.AutenticacionTokenFilter;
import com.jjm.oficina.modelo.*;
import com.jjm.oficina.repositorio.*;
import com.jjm.oficina.servicio.*;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProyectosSeparadosAccesoTest {
    final ProyectoRepository proyectos=mock(ProyectoRepository.class);final UsuarioRepository usuarios=mock(UsuarioRepository.class);final MiembroEquipoRepository miembros=mock(MiembroEquipoRepository.class);final MiembroProyectoRepository asignaciones=mock(MiembroProyectoRepository.class);final CatalogoProyectosSepDic2026Service catalogo=mock(CatalogoProyectosSepDic2026Service.class);final SeparacionProyectosService separacion=mock(SeparacionProyectosService.class);final SesionService sesiones=mock(SesionService.class);MockMvc mvc;
    @BeforeEach void preparar(){Usuario u=new Usuario();u.setId(7);u.setEstado("Activo");Rol r=new Rol();r.setNombre("Colaborador");u.setRol(r);MiembroEquipo m=new MiembroEquipo();m.setId(42);m.setUsuario(u);when(usuarios.findById(7)).thenReturn(Optional.of(u));when(miembros.findByUsuarioId(7)).thenReturn(Optional.of(m));when(sesiones.obtenerUsuario("prueba")).thenReturn(7);when(catalogo.obtenerNombreVisual(any())).thenAnswer(i->((Proyecto)i.getArgument(0)).getNombre());mvc=MockMvcBuilders.standaloneSetup(new ProyectoController(proyectos,mock(OrganizacionRepository.class),miembros,asignaciones,mock(FaseProyectoRepository.class),usuarios,mock(BitacoraService.class),catalogo,separacion)).addFilters(new AutenticacionTokenFilter(sesiones,new ObjectMapper())).build();}
    void disponibles(int cantidad){List<MiembroProyecto> enlaces=new ArrayList<>();for(int i=0;i<=cantidad;i++){Proyecto p=new Proyecto();p.setId(i+10);p.setNombre(i==0?"Equipo integrado":"Proyecto "+i);p.setCodigo(i==0?"JJM-SD26-04":"JJM-SD26-04-"+(char)('A'+i-1));when(proyectos.findById(i+10)).thenReturn(Optional.of(p));MiembroProyecto a=new MiembroProyecto();a.setIdProyecto(i+10);a.setIdMiembro(42);enlaces.add(a);}when(asignaciones.findByIdMiembroOrderByFechaAsignacionDesc(42)).thenReturn(enlaces);}
    @Test void alumnoVeTresPartesSinCuartoEquipoIntegradoNiProyectosDeOtros()throws Exception{disponibles(3);mvc.perform(get("/api/proyectos").header("Authorization","Bearer prueba").header("X-Usuario-Id","99")).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(3)).andExpect(jsonPath("$.proyectos[0].codigo").value("JJM-SD26-04-A")).andExpect(jsonPath("$.proyectos[2].codigo").value("JJM-SD26-04-C"));verify(proyectos,never()).findAll(any(org.springframework.data.domain.Sort.class));verify(separacion).sincronizarParaUsuario(7);verify(usuarios,never()).findById(99);}
    @Test void separacionIncompletaConservaAccesoAlEquipoIntegrado()throws Exception{disponibles(1);mvc.perform(get("/api/proyectos").header("Authorization","Bearer prueba")).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(2)).andExpect(jsonPath("$.proyectos[0].codigo").value("JJM-SD26-04"));}
    @Test void noSincronizaDatosSinToken()throws Exception{mvc.perform(get("/api/proyectos").header("X-Usuario-Id","7")).andExpect(status().isUnauthorized());verifyNoInteractions(separacion,proyectos,asignaciones);}
}
