package com.jjm.oficina.modelo;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_rol", nullable = false)
    private Rol rol;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(name = "apellido_paterno", length = 100)
    private String apellidoPaterno;

    @Column(name = "apellido_materno", length = 100)
    private String apellidoMaterno;

    @Column(nullable = false, unique = true, length = 150)
    private String correo;

    @Column(length = 25)
    private String telefono;

    @Column(name = "contrasena", nullable = false, length = 255)
    private String contrasena;

    @Column(name = "foto_perfil", length = 255)
    private String fotoPerfil;

    @Column(length = 20)
    private String idioma = "es";

    @Column(length = 20)
    private String estado = "Activo";

    @Column(name = "autenticacion_activa")
    private Boolean autenticacionActiva = false;

    @Column(name = "metodo_autenticacion", length = 30)
    private String metodoAutenticacion;

    @Column(name = "fecha_autenticacion")
    private LocalDateTime fechaAutenticacion;

    @Column(name = "fecha_registro", insertable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @Column(name = "fecha_actualizacion", insertable = false, updatable = false)
    private LocalDateTime fechaActualizacion;

    public Usuario() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellidoPaterno() {
        return apellidoPaterno;
    }

    public void setApellidoPaterno(String apellidoPaterno) {
        this.apellidoPaterno = apellidoPaterno;
    }

    public String getApellidoMaterno() {
        return apellidoMaterno;
    }

    public void setApellidoMaterno(String apellidoMaterno) {
        this.apellidoMaterno = apellidoMaterno;
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

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }

    public String getFotoPerfil() {
        return fotoPerfil;
    }

    public void setFotoPerfil(String fotoPerfil) {
        this.fotoPerfil = fotoPerfil;
    }

    public String getIdioma() {
        return idioma;
    }

    public void setIdioma(String idioma) {
        this.idioma = idioma;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Boolean getAutenticacionActiva() {
        return autenticacionActiva;
    }

    public void setAutenticacionActiva(Boolean autenticacionActiva) {
        this.autenticacionActiva = autenticacionActiva;
    }

    public String getMetodoAutenticacion() {
        return metodoAutenticacion;
    }

    public void setMetodoAutenticacion(String metodoAutenticacion) {
        this.metodoAutenticacion = metodoAutenticacion;
    }

    public LocalDateTime getFechaAutenticacion() {
        return fechaAutenticacion;
    }

    public void setFechaAutenticacion(LocalDateTime fechaAutenticacion) {
        this.fechaAutenticacion = fechaAutenticacion;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }
}