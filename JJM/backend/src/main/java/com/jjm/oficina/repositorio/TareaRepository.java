package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.Tarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface TareaRepository extends JpaRepository<Tarea, Integer> {

    List<Tarea> findByIdProyectoOrderByFechaCreacionDesc(
            Integer idProyecto
    );

    List<Tarea> findByIdMiembroAsignadoOrderByFechaCreacionDesc(
            Integer idMiembroAsignado
    );

    long countByIdProyecto(Integer idProyecto);

    long countByIdProyectoAndEstado(
            Integer idProyecto,
            String estado
    );

    @Query("""
        SELECT COALESCE(SUM(r.horasTrabajadas), 0)
        FROM RegistroHoras r
        WHERE r.idTarea = :idTarea
          AND r.estadoValidacion = 'Aprobado'
    """)
    BigDecimal obtenerHorasAprobadasPorTarea(
            Integer idTarea
    );
}
