package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.Encuesta;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EncuestaRepository extends JpaRepository<Encuesta, Integer> {

    List<Encuesta> findAllByOrderByFechaCreacionDesc();

    List<Encuesta> findByIdUsuarioClienteOrderByFechaCreacionDesc(Integer idUsuarioCliente);

    List<Encuesta> findByIdProyectoOrderByFechaCreacionDesc(Integer idProyecto);
}