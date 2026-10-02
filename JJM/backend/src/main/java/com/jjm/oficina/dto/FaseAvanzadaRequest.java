
package com.jjm.oficina.dto;

import java.time.LocalDate;
import java.util.List;

public class FaseAvanzadaRequest {

    private String nombre;
    private String numeroOrden;
    private String estado;
    private LocalDate fechaProgramada;
    private LocalDate fechaReal;
    private String observaciones;
    private List<FaseAvanzadaRequest> subfases;

    public FaseAvanzadaRequest() {
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getNumeroOrden() {
        return numeroOrden;
    }

    public void setNumeroOrden(String numeroOrden) {
        this.numeroOrden = numeroOrden;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public LocalDate getFechaProgramada() {
        return fechaProgramada;
    }

    public void setFechaProgramada(LocalDate fechaProgramada) {
        this.fechaProgramada = fechaProgramada;
    }

    public LocalDate getFechaReal() {
        return fechaReal;
    }

    public void setFechaReal(LocalDate fechaReal) {
        this.fechaReal = fechaReal;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    public List<FaseAvanzadaRequest> getSubfases() {
        return subfases;
    }

    public void setSubfases(List<FaseAvanzadaRequest> subfases) {
        this.subfases = subfases;
    }
}

