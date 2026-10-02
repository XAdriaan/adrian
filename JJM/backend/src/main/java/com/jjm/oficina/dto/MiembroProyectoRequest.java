package com.jjm.oficina.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class MiembroProyectoRequest {

    @NotNull(message = "Debes seleccionar un miembro del equipo.")
    private Integer idMiembro;

    @Size(
            max = 100,
            message = "El rol dentro del proyecto no puede superar 100 caracteres."
    )
    private String rolProyecto;

    private BigDecimal horasAsignadas;

    private String notas;

    public MiembroProyectoRequest() {
    }

    public Integer getIdMiembro() {
        return idMiembro;
    }

    public void setIdMiembro(Integer idMiembro) {
        this.idMiembro = idMiembro;
    }

    public String getRolProyecto() {
        return rolProyecto;
    }

    public void setRolProyecto(String rolProyecto) {
        this.rolProyecto = rolProyecto;
    }

    public BigDecimal getHorasAsignadas() {
        return horasAsignadas;
    }

    public void setHorasAsignadas(BigDecimal horasAsignadas) {
        this.horasAsignadas = horasAsignadas;
    }

    public String getNotas() {
        return notas;
    }

    public void setNotas(String notas) {
        this.notas = notas;
    }
}