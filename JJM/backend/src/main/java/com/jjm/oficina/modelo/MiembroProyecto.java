package com.jjm.oficina.modelo;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "miembros_proyecto")
public class MiembroProyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_miembro_proyecto")
    private Integer id;

    @Column(name = "id_proyecto", nullable = false)
    private Integer idProyecto;

    @Column(name = "id_miembro", nullable = false)
    private Integer idMiembro;

    @Column(name = "rol_proyecto", length = 100)
    private String rolProyecto;

    @Column(name = "horas_asignadas", precision = 10, scale = 2)
    private BigDecimal horasAsignadas;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @Column(
            name = "fecha_asignacion",
            insertable = false,
            updatable = false
    )
    private LocalDateTime fechaAsignacion;

    public MiembroProyecto() {
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

    public LocalDateTime getFechaAsignacion() {
        return fechaAsignacion;
    }

    public void setFechaAsignacion(LocalDateTime fechaAsignacion) {
        this.fechaAsignacion = fechaAsignacion;
    }
}