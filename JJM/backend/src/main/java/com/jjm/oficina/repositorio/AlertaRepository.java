package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.Alerta;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AlertaRepository extends JpaRepository<Alerta, Integer> {

    List<Alerta> findAllByOrderByFechaCreacionDesc();

    List<Alerta> findByIdMiembroAsignadoOrderByFechaCreacionDesc(Integer idMiembroAsignado);

    List<Alerta> findByIdUsuarioCreadorOrderByFechaCreacionDesc(Integer idUsuarioCreador);

    @Query("""
            SELECT a
            FROM Alerta a
            WHERE a.idMiembroAsignado = :idMiembro
               OR a.idUsuarioCreador = :idUsuario
            ORDER BY a.fechaCreacion DESC
            """)
    List<Alerta> buscarAlertasVisiblesParaUsuario(
            @Param("idMiembro") Integer idMiembro,
            @Param("idUsuario") Integer idUsuario
    );
}