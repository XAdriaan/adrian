package com.jjm.oficina.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public class RegistroHorasRequest {

    private Integer idMiembro;
    private Integer idProyecto;
    private Integer idTarea;

    private LocalDate fecha;

    private LocalTime horaEntrada;
    private LocalTime horaSalida;

    private BigDecimal horasTrabajadas;

    private String tipoRegistro;
    private String incidente;
    private String descripcion;

    public RegistroHorasRequest() {
    }

    public Integer getIdMiembro() {
        return idMiembro;
    }

    public void setIdMiembro(Integer idMiembro) {
        this.idMiembro = idMiembro;
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

    public LocalDate getFecha() {
        return fecha;
    }

    public void setFecha(LocalDate fecha) {
        this.fecha = fecha;
    }

    public LocalTime getHoraEntrada() {
        return horaEntrada;
    }

    public void setHoraEntrada(LocalTime horaEntrada) {
        this.horaEntrada = horaEntrada;
    }

    public LocalTime getHoraSalida() {
        return horaSalida;
    }

    public void setHoraSalida(LocalTime horaSalida) {
        this.horaSalida = horaSalida;
    }

    public BigDecimal getHorasTrabajadas() {
        return horasTrabajadas;
    }

    public void setHorasTrabajadas(
            BigDecimal horasTrabajadas
    ) {
        this.horasTrabajadas = horasTrabajadas;
    }

    public String getTipoRegistro() {
        return tipoRegistro;
    }

    public void setTipoRegistro(String tipoRegistro) {
        this.tipoRegistro = tipoRegistro;
    }

    public String getIncidente() {
        return incidente;
    }

    public void setIncidente(String incidente) {
        this.incidente = incidente;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }
}