package com.jjm.oficina.modelo;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "organizaciones")
public class Organizacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_organizacion")
    private Integer id;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "tipo", length = 30)
    private String tipo;

    @Column(name = "estado_convenio", length = 30)
    private String estadoConvenio;

    @Column(name = "contacto", length = 150)
    private String contacto;

    @Column(name = "correo", length = 150)
    private String correo;

    @Column(name = "telefono", length = 25)
    private String telefono;

    @Column(name = "fecha_inicio_convenio")
    private LocalDate fechaInicioConvenio;

    @Column(name = "fecha_fin_convenio")
    private LocalDate fechaFinConvenio;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @Column(
            name = "fecha_creacion",
            insertable = false,
            updatable = false
    )
    private LocalDateTime fechaCreacion;

    public Organizacion() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getEstadoConvenio() {
        return estadoConvenio;
    }

    public void setEstadoConvenio(String estadoConvenio) {
        this.estadoConvenio = estadoConvenio;
    }

    public String getContacto() {
        return contacto;
    }

    public void setContacto(String contacto) {
        this.contacto = contacto;
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

    public LocalDate getFechaInicioConvenio() {
        return fechaInicioConvenio;
    }

    public void setFechaInicioConvenio(LocalDate fechaInicioConvenio) {
        this.fechaInicioConvenio = fechaInicioConvenio;
    }

    public LocalDate getFechaFinConvenio() {
        return fechaFinConvenio;
    }

    public void setFechaFinConvenio(LocalDate fechaFinConvenio) {
        this.fechaFinConvenio = fechaFinConvenio;
    }

    public String getNotas() {
        return notas;
    }

    public void setNotas(String notas) {
        this.notas = notas;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }
}

