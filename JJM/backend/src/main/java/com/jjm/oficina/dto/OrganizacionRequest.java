
package com.jjm.oficina.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class OrganizacionRequest {

    @NotBlank(message = "El nombre de la organización es obligatorio.")
    @Size(max = 150, message = "El nombre no puede superar 150 caracteres.")
    private String nombre;

    @Size(max = 30, message = "El tipo de organización no es válido.")
    private String tipo;

    @Size(max = 30, message = "El estado del convenio no es válido.")
    private String estadoConvenio;

    @Size(max = 150, message = "El contacto no puede superar 150 caracteres.")
    private String contacto;

    @Email(message = "El correo de contacto no tiene un formato válido.")
    @Size(max = 150, message = "El correo no puede superar 150 caracteres.")
    private String correo;

    @Size(max = 25, message = "El teléfono no puede superar 25 caracteres.")
    private String telefono;

    private LocalDate fechaInicioConvenio;

    private LocalDate fechaFinConvenio;

    private String notas;

    public OrganizacionRequest() {
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
}

