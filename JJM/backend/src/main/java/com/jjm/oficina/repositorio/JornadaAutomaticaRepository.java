package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.JornadaAutomatica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JornadaAutomaticaRepository extends JpaRepository<JornadaAutomatica, Long> {
    Optional<JornadaAutomatica> findByIdUsuarioAndFecha(Integer idUsuario, LocalDate fecha);
    List<JornadaAutomatica> findByIdUsuarioAndFinalizadaFalse(Integer idUsuario);
    @Query("SELECT DISTINCT j.idUsuario FROM JornadaAutomatica j WHERE j.finalizada = false")
    List<Integer> buscarUsuariosPendientes();
}
