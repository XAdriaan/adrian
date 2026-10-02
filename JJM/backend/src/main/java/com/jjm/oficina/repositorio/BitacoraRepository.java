package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.Bitacora;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface BitacoraRepository
        extends JpaRepository<Bitacora, Integer> {

    @Query(
            "SELECT b FROM Bitacora b " +
            "WHERE (:idUsuario IS NULL OR b.idUsuario = :idUsuario) " +
            "AND (:modulo IS NULL OR LOWER(b.modulo) = LOWER(:modulo)) " +
            "AND (:accion IS NULL OR LOWER(b.accion) = LOWER(:accion)) " +
            "AND (:fechaInicio IS NULL OR b.fechaCreacion >= :fechaInicio) " +
            "AND (:fechaFin IS NULL OR b.fechaCreacion <= :fechaFin) " +
            "ORDER BY b.fechaCreacion DESC"
    )
    List<Bitacora> buscarConFiltros(
            @Param("idUsuario") Integer idUsuario,
            @Param("modulo") String modulo,
            @Param("accion") String accion,
            @Param("fechaInicio") LocalDateTime fechaInicio,
            @Param("fechaFin") LocalDateTime fechaFin
    );
}
