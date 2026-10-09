package com.jjm.oficina.modelo;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "jornadas_automaticas", uniqueConstraints =
        @UniqueConstraint(name = "uk_jornada_usuario_fecha", columnNames = {"id_usuario", "fecha"}))
public class JornadaAutomatica {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "id_usuario", nullable = false) private Integer idUsuario;
    @Column(nullable = false) private LocalDate fecha;
    @Column(name = "id_registro", nullable = false) private Integer idRegistro;
    @Column(name = "total_segundos", nullable = false) private long totalSegundos;
    @Column(name = "ultima_senal_epoch", nullable = false) private long ultimaSenal;
    @Column(name = "liquidado_epoch", nullable = false) private long liquidado;
    @Column(nullable = false) private boolean finalizada;
    @Column(nullable = false, columnDefinition = "TEXT") private String conexiones = "";
    public Long getId() { return id; }
    public void setId(Long value) { id = value; }
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer value) { idUsuario = value; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate value) { fecha = value; }
    public Integer getIdRegistro() { return idRegistro; }
    public void setIdRegistro(Integer value) { idRegistro = value; }
    public long getTotalSegundos() { return totalSegundos; }
    public void setTotalSegundos(long value) { totalSegundos = value; }
    public long getUltimaSenal() { return ultimaSenal; }
    public void setUltimaSenal(long value) { ultimaSenal = value; }
    public long getLiquidado() { return liquidado; }
    public void setLiquidado(long value) { liquidado = value; }
    public boolean isFinalizada() { return finalizada; }
    public void setFinalizada(boolean value) { finalizada = value; }
    public String getConexiones() { return conexiones; }
    public void setConexiones(String value) { conexiones = value; }
}
