package com.jjm.oficina.modelo;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "registros_horas")
public class RegistroHoras {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_registro")
    private Integer id;

    @Column(name = "id_miembro", nullable = false)
    private Integer idMiembro;

    @Column(name = "id_proyecto")
    private Integer idProyecto;

    @Column(name = "id_tarea")
    private Integer idTarea;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_entrada")
    private LocalTime horaEntrada;

    @Column(name = "hora_salida")
    private LocalTime horaSalida;

    @Column(
            name = "horas_trabajadas",
            nullable = false,
            precision = 10,
            scale = 2
    )
    private BigDecimal horasTrabajadas;

    @Column(name = "tipo_registro", length = 30)
    private String tipoRegistro;

    @Column(name = "incidente", length = 30)
    private String incidente;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "estado_validacion", length = 20)
    private String estadoValidacion;

    @Column(name = "id_usuario_validador")
    private Integer idUsuarioValidador;

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

    public RegistroHoras() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
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

    public String getEstadoValidacion() {
        return estadoValidacion;
    }

    public void setEstadoValidacion(
            String estadoValidacion
    ) {
        this.estadoValidacion = estadoValidacion;
    }

    public Integer getIdUsuarioValidador() {
        return idUsuarioValidador;
    }

    public void setIdUsuarioValidador(
            Integer idUsuarioValidador
    ) {
        this.idUsuarioValidador = idUsuarioValidador;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(
            LocalDateTime fechaCreacion
    ) {
        this.fechaCreacion = fechaCreacion;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    public void setFechaActualizacion(
            LocalDateTime fechaActualizacion
    ) {
        this.fechaActualizacion = fechaActualizacion;
    }
}