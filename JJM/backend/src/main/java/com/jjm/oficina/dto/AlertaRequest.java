package com.jjm.oficina.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class AlertaRequest {

    private Integer idProyecto;

    private Integer idTarea;

    private Integer idMiembroAsignado;

    @NotBlank(message = "El título de la alerta es obligatorio.")
    @Size(max = 150, message = "El título no puede superar 150 caracteres.")
    private String titulo;

    private String descripcion;

    @NotBlank(message = "El tipo de alerta es obligatorio.")
    @Size(max = 80, message = "El tipo no puede superar 80 caracteres.")
    private String tipo;

    @NotBlank(message = "La severidad es obligatoria.")
    @Size(max = 30, message = "La severidad no puede superar 30 caracteres.")
    private String severidad;

    @Size(max = 40, message = "El estado no puede superar 40 caracteres.")
    private String estado;

    private LocalDate fechaLimite;

    public AlertaRequest() {
    }

    public Integer getIdProyecto() {
        return idProyecto;
    }

    public void setIdProyecto(Integer idProyecto) {
        this.idProyecto = idProyecto;
    }

    public Integer getIdTarea() {
        return idTarea;
    }

    public void setIdTarea(Integer idTarea) {
        this.idTarea = idTarea;
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

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getSeveridad() {
        return severidad;
    }

    public void setSeveridad(String severidad) {
        this.severidad = severidad;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public LocalDate getFechaLimite() {
        return fechaLimite;
    }

    public void setFechaLimite(LocalDate fechaLimite) {
        this.fechaLimite = fechaLimite;
    }
}