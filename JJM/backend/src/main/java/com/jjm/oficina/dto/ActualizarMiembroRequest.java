package com.jjm.oficina.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class ActualizarMiembroRequest {

    @Size(max = 100, message = "El rol no puede superar 100 caracteres.")
    private String rol;

    @Size(max = 30, message = "El seniority no puede superar 30 caracteres.")
    private String seniority;

    @DecimalMin(value = "0.0", inclusive = true, message = "Las horas disponibles no pueden ser negativas.")
    private BigDecimal horasDisponibles;

    private String habilidades;

    private String notas;

    @Size(max = 20, message = "El estado no puede superar 20 caracteres.")
    private String estado;

    public ActualizarMiembroRequest() {
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public String getSeniority() {
        return seniority;
    }

    public void setSeniority(String seniority) {
        this.seniority = seniority;
    }

    public BigDecimal getHorasDisponibles() {
        return horasDisponibles;
    }

    public void setHorasDisponibles(BigDecimal horasDisponibles) {
        this.horasDisponibles = horasDisponibles;
    }

    public String getHabilidades() {
        return habilidades;
    }

    public void setHabilidades(String habilidades) {
        this.habilidades = habilidades;
    }

    public String getNotas() {
        return notas;
    }

    public void setNotas(String notas) {
        this.notas = notas;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}