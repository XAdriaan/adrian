package com.jjm.oficina.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class TareaRequest {

    @NotNull(message = "Debes seleccionar un proyecto.")
    private Integer idProyecto;

    /*
     * Puede quedar vacío para tareas de proyectos normales
     * sin fases registradas.
     */
    private Integer idFase;

    @NotNull(message = "Debes seleccionar un miembro del equipo.")
    private Integer idMiembroAsignado;

    @NotBlank(message = "El título de la tarea es obligatorio.")
    @Size(max = 200, message = "El título no puede superar 200 caracteres.")
    private String titulo;

    private String descripcion;

    private String estado;

    private String prioridad;

    private BigDecimal horasEstimadas;

    private BigDecimal horasRegistradas;

    private LocalDate fechaInicio;

    private LocalDate fechaLimite;

    public TareaRequest() {
    }

    public Integer getIdProyecto() {
        return idProyecto;
    }

    public void setIdProyecto(Integer idProyecto) {
        this.idProyecto = idProyecto;
    }

    public Integer getIdFase() {
        return idFase;
    }

    public void setIdFase(Integer idFase) {
        this.idFase = idFase;
    }

    public Integer getIdMiembroAsignado() {
        return idMiembroAsignado;
    }

    public void setIdMiembroAsignado(Integer idMiembroAsignado) {
        this.idMiembroAsignado = idMiembroAsignado;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
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

    public BigDecimal getHorasEstimadas() {
        return horasEstimadas;
    }

    public void setHorasEstimadas(BigDecimal horasEstimadas) {
        this.horasEstimadas = horasEstimadas;
    }

    public BigDecimal getHorasRegistradas() {
        return horasRegistradas;
    }

    public void setHorasRegistradas(BigDecimal horasRegistradas) {
        this.horasRegistradas = horasRegistradas;
    }

    public LocalDate getFechaInicio() {
        return fechaInicio;
    }

    public void setFechaInicio(LocalDate fechaInicio) {
        this.fechaInicio = fechaInicio;
    }

    public LocalDate getFechaLimite() {
        return fechaLimite;
    }

    public void setFechaLimite(LocalDate fechaLimite) {
        this.fechaLimite = fechaLimite;
    }
}