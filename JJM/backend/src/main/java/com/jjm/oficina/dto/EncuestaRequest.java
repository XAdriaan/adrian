package com.jjm.oficina.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class EncuestaRequest {

    private Integer idProyecto;

    @NotBlank(message = "El proyecto es obligatorio.")
    @Size(max = 150, message = "El proyecto no puede superar 150 caracteres.")
    private String proyecto;

    @NotBlank(message = "El tipo de encuesta es obligatorio.")
    @Size(max = 80, message = "El tipo no puede superar 80 caracteres.")
    private String tipo;

    @NotNull(message = "La calificación es obligatoria.")
    @Min(value = 1, message = "La calificación mínima es 1.")
    @Max(value = 5, message = "La calificación máxima es 5.")
    private Integer calificacion;

    @Size(max = 150, message = "El nombre no puede superar 150 caracteres.")
    private String nombreEncuestado;

    @Email(message = "El correo electrónico no tiene un formato válido.")
    @Size(max = 150, message = "El correo no puede superar 150 caracteres.")
    private String emailEncuestado;

    private String comentario;

    private String videoUrl;

    @Size(max = 40, message = "El consentimiento no puede superar 40 caracteres.")
    private String consentimientoVideo;

    public EncuestaRequest() {
    }

    public Integer getIdProyecto() {
        return idProyecto;
    }

    public void setIdProyecto(Integer idProyecto) {
        this.idProyecto = idProyecto;
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
}
 








        