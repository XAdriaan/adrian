package com.jjm.oficina.dto;

public class ValidacionHorasRequest {

    private String estadoValidacion;

    public ValidacionHorasRequest() {
    }

    public String getEstadoValidacion() {
        return estadoValidacion;
    }

    public void setEstadoValidacion(
            String estadoValidacion
    ) {
        this.estadoValidacion = estadoValidacion;
    }
}