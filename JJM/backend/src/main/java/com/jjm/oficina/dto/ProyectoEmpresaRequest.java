package com.jjm.oficina.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record ProyectoEmpresaRequest(
        @NotBlank @Size(max = 180) String nombre,
        @NotBlank @Size(max = 8000) String objetivo,
        @NotBlank @Pattern(regexp = "planeacion|seguimiento|soluciones|formacion|cierre") String servicio,
        @NotNull LocalDate fechaInicio,
        @NotNull LocalDate fechaFin,
        @NotBlank @Pattern(regexp = "Baja|Media|Alta|Crítica") String prioridad) {}
