package com.jjm.oficina.modelo;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "encuestas")
public class Encuesta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_encuesta")
    private Integer id;

    @Column(name = "id_proyecto")
    private Integer idProyecto;

    @Column(name = "id_usuario_cliente")
    private Integer idUsuarioCliente;

    @Column(nullable = false, length = 150)
    private String proyecto;

    @Column(nullable = false, length = 80)
    private String tipo;

    @Column(nullable = false)
    private Integer calificacion;

    @Column(name = "nombre_encuestado", length = 150)
    private String nombreEncuestado;

    @Column(name = "email_encuestado", length = 150)
    private String emailEncuestado;

    @Column(columnDefinition = "TEXT")
    private String comentario;

    @Column(name = "video_url", columnDefinition = "TEXT")
    private String videoUrl;

    @Column(name = "consentimiento_video", length = 40)
    private String consentimientoVideo;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    public Encuesta() {
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

    public Integer getIdUsuarioCliente() {
        return idUsuarioCliente;
    }

    public void setIdUsuarioCliente(Integer idUsuarioCliente) {
        this.idUsuarioCliente = idUsuarioCliente;
    }

    public String getProyecto() {
        return proyecto;
    }

    public void setProyecto(String proyecto) {
        this.proyecto = proyecto;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public Integer getCalificacion() {
        return calificacion;
    }

    public void setCalificacion(Integer calificacion) {
        this.calificacion = calificacion;
    }

    public String getNombreEncuestado() {
        return nombreEncuestado;
    }

    public void setNombreEncuestado(String nombreEncuestado) {
        this.nombreEncuestado = nombreEncuestado;
    }

    public String getEmailEncuestado() {
        return emailEncuestado;
    }

    public void setEmailEncuestado(String emailEncuestado) {
        this.emailEncuestado = emailEncuestado;
    }

    public String getComentario() {
        return comentario;
    }

    public void setComentario(String comentario) {
        this.comentario = comentario;
    }

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public String getConsentimientoVideo() {
        return consentimientoVideo;
    }

    public void setConsentimientoVideo(String consentimientoVideo) {
        this.consentimientoVideo = consentimientoVideo;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }
}