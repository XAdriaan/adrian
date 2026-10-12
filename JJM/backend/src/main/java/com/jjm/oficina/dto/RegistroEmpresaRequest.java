package com.jjm.oficina.dto;

import jakarta.validation.constraints.*;

public record RegistroEmpresaRequest(
        @NotBlank @Size(max = 150) String empresa,
        @NotBlank @Size(max = 70) String nombre,
        @NotBlank @Size(max = 70) String apellido,
        @NotBlank @Email @Size(max = 150) String correo,
        @Size(max = 25) String telefono,
        @NotBlank @Size(min = 8, max = 72) String contrasena) {}
