package com.jjm.oficina.servicio;

import com.jjm.oficina.modelo.Bitacora;
import com.jjm.oficina.repositorio.BitacoraRepository;

import org.springframework.stereotype.Service;

@Service
public class BitacoraService {

    private final BitacoraRepository bitacoraRepository;

    public BitacoraService(
            BitacoraRepository bitacoraRepository
    ) {
        this.bitacoraRepository = bitacoraRepository;
    }

    public void registrar(
            Integer idUsuario,
            String modulo,
            String accion,
            String tipoEntidad,
            Integer idEntidad,
            String descripcion,
            String datosAnteriores,
            String datosNuevos
    ) {
        Bitacora evento = new Bitacora();

        evento.setIdUsuario(idUsuario);
        evento.setModulo(limitar(modulo, 60));
        evento.setAccion(limitar(accion, 80));
        evento.setTipoEntidad(limitar(tipoEntidad, 80));
        evento.setIdEntidad(idEntidad);
        evento.setDescripcion(
                limpiar(descripcion, "Sin descripción.")
        );
        evento.setDatosAnteriores(limpiar(datosAnteriores, null));
        evento.setDatosNuevos(limpiar(datosNuevos, null));

        bitacoraRepository.save(evento);
    }

    private String limitar(
            String texto,
            int longitudMaxima
    ) {
        String limpio = limpiar(texto, "");

        return limpio.length() <= longitudMaxima
                ? limpio
                : limpio.substring(0, longitudMaxima);
    }

    private String limpiar(
            String texto,
            String valorDefecto
    ) {
        if (texto == null || texto.isBlank()) {
            return valorDefecto;
        }

        return texto.trim();
    }
}
