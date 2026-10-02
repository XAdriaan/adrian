package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.MiembroProyecto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MiembroProyectoRepository
        extends JpaRepository<MiembroProyecto, Integer> {

    List<MiembroProyecto> findByIdProyectoOrderByFechaAsignacionDesc(
            Integer idProyecto
    );

    List<MiembroProyecto> findByIdMiembroOrderByFechaAsignacionDesc(
            Integer idMiembro
    );

    Optional<MiembroProyecto> findByIdProyectoAndIdMiembro(
            Integer idProyecto,
            Integer idMiembro
    );

    boolean existsByIdProyectoAndIdMiembro(
            Integer idProyecto,
            Integer idMiembro
    );

    void deleteByIdProyectoAndIdMiembro(
            Integer idProyecto,
            Integer idMiembro
    );
}