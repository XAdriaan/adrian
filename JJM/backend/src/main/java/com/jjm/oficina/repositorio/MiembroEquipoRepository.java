package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.MiembroEquipo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface MiembroEquipoRepository extends JpaRepository<MiembroEquipo, Integer> {

    Optional<MiembroEquipo> findByUsuarioId(Integer idUsuario);

    boolean existsByUsuarioId(Integer idUsuario);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MiembroEquipo m WHERE m.usuario.id=:id")
    Optional<MiembroEquipo> buscarParaRegularizacion(@Param("id")Integer id);
}
