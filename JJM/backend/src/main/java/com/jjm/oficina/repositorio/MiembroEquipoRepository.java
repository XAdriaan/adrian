package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.MiembroEquipo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MiembroEquipoRepository extends JpaRepository<MiembroEquipo, Integer> {

    Optional<MiembroEquipo> findByUsuarioId(Integer idUsuario);

    boolean existsByUsuarioId(Integer idUsuario);
}