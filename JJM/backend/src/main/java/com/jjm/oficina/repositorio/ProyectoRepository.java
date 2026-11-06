package com.jjm.oficina.repositorio; 

import com.jjm.oficina.modelo.Proyecto; 
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional; 
import java.util.List;

public interface ProyectoRepository extends JpaRepository<Proyecto, Integer>{ 
    
    boolean existsByCodigo(String codigo);

    // El catálogo conserva su clave incluso cuando administración ha retirado el proyecto.
    @org.springframework.data.jpa.repository.Query(value="SELECT * FROM proyectos WHERE codigo=:codigo",nativeQuery=true)
    Optional<Proyecto> findByCodigo(String codigo); 

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value="UPDATE proyectos SET eliminado_en=CURRENT_TIMESTAMP WHERE id_proyecto=:id AND eliminado_en IS NULL",nativeQuery=true)
    int retirar(Integer id);

    List<Proyecto> findByIdOrganizacionOrderByFechaCreacionDesc(Integer idOrganizacion);

}
