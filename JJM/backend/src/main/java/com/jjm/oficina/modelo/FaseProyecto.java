package com.jjm.oficina.modelo;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "fases_proyecto")
public class FaseProyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_fase")
    private Integer id;

    @Column(name = "id_proyecto", nullable = false)
    private Integer idProyecto;

    /*
     * NULL = fase principal.
     * Un valor existente = subfase cuyo padre es otra fase.
     */
    @Column(name = "id_fase_padre")
    private Integer idFasePadre;

    @Column(name = "nombre", nullable = false, length = 200)
    private String nombre;

    /*
     * En la tabla es VARCHAR porque permite valores como:
     * 1, 2, 3, 3.1, 3.2, 4, etc.
     */
    @Column(name = "numero_orden", length = 20)
    private String numeroOrden;

    @Column(name = "estado", length = 30)
    private String estado;

    @Column(name = "porcentaje_avance", precision = 5, scale = 2)
    private BigDecimal porcentajeAvance;

    @Column(name = "fecha_programada")
    private LocalDate fechaProgramada;

    @Column(name = "fecha_real")
    private LocalDate fechaReal;

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    @Column(
            name = "fecha_creacion",
            insertable = false,
            updatable = false
    )
    private LocalDateTime fechaCreacion;

    public FaseProyecto() {
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

    public Integer getIdFasePadre() {
        return idFasePadre;
    }

    public void setIdFasePadre(Integer idFasePadre) {
        this.idFasePadre = idFasePadre;
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

    public BigDecimal getPorcentajeAvance() {
        return porcentajeAvance;
    }

    public void setPorcentajeAvance(BigDecimal porcentajeAvance) {
        this.porcentajeAvance = porcentajeAvance;
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

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }
}

