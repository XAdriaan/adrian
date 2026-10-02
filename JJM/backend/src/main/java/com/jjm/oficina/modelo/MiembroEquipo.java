package com.jjm.oficina.modelo;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "miembros_equipo",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_miembro_usuario",
            columnNames = "id_usuario"
        )
    }
)
public class MiembroEquipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_miembro")
    private Integer id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario", unique = true)
    private Usuario usuario;

    @Column(name = "nombre_completo", nullable = false, length = 180)
    private String nombreCompleto;

    @Column(length = 150)
    private String correo;

    @Column(length = 25)
    private String telefono;

    @Column(nullable = false, length = 100)
    private String rol;

    @Column(length = 30)
    private String seniority;

    @Column(name = "horas_disponibles", precision = 10, scale = 2)
    private BigDecimal horasDisponibles;

    @Column(columnDefinition = "TEXT")
    private String habilidades;

    @Column(columnDefinition = "TEXT")
    private String notas;

    @Column(length = 20)
    private String estado;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    public MiembroEquipo() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public String getNombreCompleto() {
        return nombreCompleto;
    }

    public void setNombreCompleto(String nombreCompleto) {
        this.nombreCompleto = nombreCompleto;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public String getSeniority() {
        return seniority;
    }

    public void setSeniority(String seniority) {
        this.seniority = seniority;
    }

    public BigDecimal getHorasDisponibles() {
        return horasDisponibles;
    }

    public void setHorasDisponibles(BigDecimal horasDisponibles) {
        this.horasDisponibles = horasDisponibles;
    }

    public String getHabilidades() {
        return habilidades;
    }

    public void setHabilidades(String habilidades) {
        this.habilidades = habilidades;
    }

    public String getNotas() {
        return notas;
    }

    public void setNotas(String notas) {
        this.notas = notas;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }
}