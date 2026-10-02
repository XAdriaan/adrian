package com.jjm.oficina.modelo;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tareas")
public class Tarea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tarea")
    private Integer id;

    @Column(name = "id_proyecto", nullable = false)
    private Integer idProyecto;

    /*
     * Puede quedar vacío cuando una tarea pertenece a un proyecto
     * normal que todavía no tiene fases registradas.
     */
    @Column(name = "id_fase")
    private Integer idFase;

    @Column(name = "id_miembro_asignado")
    private Integer idMiembroAsignado;

    @Column(name = "titulo", nullable = false, length = 200)
    private String titulo;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "estado", length = 30)
    private String estado;

    @Column(name = "prioridad", length = 20)
    private String prioridad;

    @Column(name = "horas_estimadas", precision = 10, scale = 2)
    private BigDecimal horasEstimadas;

    @Column(name = "horas_registradas", precision = 10, scale = 2)
    private BigDecimal horasRegistradas;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;

    @Column(
            name = "fecha_creacion",
            insertable = false,
            updatable = false
    )
    private LocalDateTime fechaCreacion;

    @Column(
            name = "fecha_actualizacion",
            insertable = false,
            updatable = false
    )
    private LocalDateTime fechaActualizacion;

    public Tarea() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
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

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    public void setFechaActualizacion(LocalDateTime fechaActualizacion) {
        this.fechaActualizacion = fechaActualizacion;
    }
}