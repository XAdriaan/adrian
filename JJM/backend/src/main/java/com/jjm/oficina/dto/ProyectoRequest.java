
package com.jjm.oficina.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ProyectoRequest {

    private Integer idOrganizacion;

    private Integer idResponsable;

    @NotBlank(message = "El nombre del proyecto es obligatorio.")
    @Size(max = 180, message = "El nombre no puede superar 180 caracteres.")
    private String nombre;

    @Size(max = 50, message = "El código no puede superar 50 caracteres.")
    private String codigo;

    private String descripcion;

    @Size(max = 150, message = "El cliente o área no puede superar 150 caracteres.")
    private String clienteArea;

    private String tipoProyecto;

    private String estado;

    private String prioridad;

    private LocalDate fechaInicio;

    private LocalDate fechaFin;

    private BigDecimal porcentajeAvance;

    public ProyectoRequest() {
    }

    public Integer getIdOrganizacion() {
        return idOrganizacion;
    }

    public void setIdOrganizacion(Integer idOrganizacion) {
        this.idOrganizacion = idOrganizacion;
    }

    public Integer getIdResponsable() {
        return idResponsable;
    }

    public void setIdResponsable(Integer idResponsable) {
        this.idResponsable = idResponsable;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getClienteArea() {
        return clienteArea;
    }

    public void setClienteArea(String clienteArea) {
        this.clienteArea = clienteArea;
    }

    public String getTipoProyecto() {
        return tipoProyecto;
    }

    public void setTipoProyecto(String tipoProyecto) {
        this.tipoProyecto = tipoProyecto;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getPrioridad() {
        return prioridad;
    }

    public void setPrioridad(String prioridad) {
        this.prioridad = prioridad;
    }

    public LocalDate getFechaInicio() {
        return fechaInicio;
    }

    public void setFechaInicio(LocalDate fechaInicio) {
        this.fechaInicio = fechaInicio;
    }

    public LocalDate getFechaFin() {
        return fechaFin;
    }

    public void setFechaFin(LocalDate fechaFin) {
        this.fechaFin = fechaFin;
    }

    public BigDecimal getPorcentajeAvance() {
        return porcentajeAvance;
    }

    public void setPorcentajeAvance(BigDecimal porcentajeAvance) {
        this.porcentajeAvance = porcentajeAvance;
    }
}

