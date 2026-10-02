package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.RegistroHoras;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface RegistroHorasRepository
        extends JpaRepository<RegistroHoras, Integer> {

    List<RegistroHoras>
    findAllByOrderByFechaDescFechaCreacionDesc();

    List<RegistroHoras>
    findByIdMiembroOrderByFechaDescFechaCreacionDesc(
            Integer idMiembro
    );

    List<RegistroHoras>
    findByIdMiembroAndFechaBetweenOrderByFechaDescFechaCreacionDesc(
            Integer idMiembro,
            LocalDate fechaInicio,
            LocalDate fechaFin
    );

    List<RegistroHoras>
    findByIdProyectoOrderByFechaDescFechaCreacionDesc(
            Integer idProyecto
    );

    List<RegistroHoras>
    findByIdProyectoInOrderByFechaDescFechaCreacionDesc(
            List<Integer> idsProyectos
    );

    @Query(
            "SELECT r " +
            "FROM RegistroHoras r " +
            "WHERE r.idMiembro = :idMiembro " +
            "AND LOWER(TRIM(COALESCE(r.tipoRegistro, ''))) = 'jornada' " +
            "AND LOWER(TRIM(COALESCE(r.estadoValidacion, ''))) = 'pendiente' " +
            "AND r.horaSalida IS NULL " +
            "ORDER BY r.fecha DESC, r.fechaCreacion DESC"
    )
    List<RegistroHoras> buscarJornadasPendientesAbiertas(
            @Param("idMiembro") Integer idMiembro
    );
}