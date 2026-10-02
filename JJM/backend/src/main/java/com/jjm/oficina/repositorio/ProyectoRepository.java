package com.jjm.oficina.repositorio; 

import com.jjm.oficina.modelo.Proyecto; 
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional; 

public interface ProyectoRepository extends JpaRepository<Proyecto, Integer>{ 
    
    boolean existsByCodigo(String codigo);

    Optional<Proyecto> findByCodigo(String codigo); 

}