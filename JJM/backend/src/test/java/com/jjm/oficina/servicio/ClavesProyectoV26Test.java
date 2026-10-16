package com.jjm.oficina.servicio;
import com.jjm.oficina.modelo.Proyecto;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class ClavesProyectoV26Test {
 @Test void clavesSeparadasNoSonNumerosDeEquipo(){
  CatalogoProyectosSepDic2026Service s=org.mockito.Mockito.mock(CatalogoProyectosSepDic2026Service.class,org.mockito.Mockito.CALLS_REAL_METHODS);
  Proyecto p=new Proyecto();p.setCodigo("JJM-SD26-02-B");p.setNombre("04 PWEB · Herramienta para páginas web");
  assertEquals("PWEB",s.obtenerClaveAsignada(p));
  p.setCodigo("JJM-SD26-04-B");assertEquals("Proyectos",s.obtenerClaveAsignada(p));
  p.setCodigo("JJM-SD26-13");assertTrue(s.obtenerClaveAsignada(p).contains("EXAMINA"));
  p.setCodigo("PERSONAL");p.setNombre("Mi proyecto");assertEquals("Mi proyecto",s.obtenerClaveAsignada(p));
 }
}
