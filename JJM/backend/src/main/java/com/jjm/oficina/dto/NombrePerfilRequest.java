package com.jjm.oficina.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NombrePerfilRequest(
        @NotBlank(message = "El nombre es obligatorio.")
        @Size(max = 100) String nombre,
        @Size(max = 100) String apellidoPaterno,
        @Size(max = 100) String apellidoMaterno) {
}
