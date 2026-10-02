
package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.Organizacion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizacionRepository
        extends JpaRepository<Organizacion, Integer> {
}
