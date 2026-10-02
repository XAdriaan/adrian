package com.jjm.oficina.servicio;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class CorreoService {

    private final JavaMailSender mailSender;
    private final String remitente;

    public CorreoService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String remitente
    ) {
        this.mailSender = mailSender;
        this.remitente = remitente;
    }

    public void enviarCodigoVerificacion(String destinatario, String nombre, String codigo) {
        String nombreSeguro =
                (nombre == null || nombre.isBlank()) ? "usuario" : nombre.trim();

        String cuerpo =
                "Hola " + nombreSeguro + ",\n\n" +
                "Tu código de verificación para Oficina de Proyectos es:\n\n" +
                codigo + "\n\n" +
                "El código vence en 10 minutos.\n\n" +
                "Si no solicitaste este código, ignora este mensaje.\n\n" +
                "Oficina de Proyectos - JJM Tecnologías Innovadoras";

        enviar(
                destinatario,
                "Código de verificación - Oficina de Proyectos",
                cuerpo
        );
    }

    public void enviarCodigoRecuperacion(String destinatario, String nombre, String codigo) {
        String nombreSeguro =
                (nombre == null || nombre.isBlank()) ? "usuario" : nombre.trim();

        String cuerpo =
                "Hola " + nombreSeguro + ",\n\n" +
                "Se solicitó recuperar la contraseña de tu cuenta.\n\n" +
                "Tu código de recuperación es:\n\n" +
                codigo + "\n\n" +
                "El código vence en 10 minutos.\n\n" +
                "Si no solicitaste este cambio, ignora este mensaje.\n\n" +
                "Oficina de Proyectos - JJM Tecnologías Innovadoras";

        enviar(
                destinatario,
                "Recuperación de contraseña - Oficina de Proyectos",
                cuerpo
        );
    }

    /**
     * Envía la carta de aceptación generada al alumno
     * como archivo HTML adjunto.
     */
    public void enviarCartaAceptacion(
            String destinatario,
            String nombre,
            String nombreArchivo,
            String contenidoCarta
    ) {
        if (remitente == null || remitente.isBlank()) {
            throw new IllegalStateException(
                    "No se configuró spring.mail.username."
            );
        }

        if (destinatario == null || destinatario.isBlank()) {
            throw new IllegalArgumentException(
                    "El correo del alumno está vacío."
            );
        }

        if (contenidoCarta == null || contenidoCarta.isBlank()) {
            throw new IllegalArgumentException(
                    "El contenido de la carta de aceptación está vacío."
            );
        }

        String nombreSeguro =
                (nombre == null || nombre.isBlank())
                        ? "usuario"
                        : nombre.trim();

        String archivoSeguro =
                (nombreArchivo == null || nombreArchivo.isBlank())
                        ? "Carta_de_aceptacion.html"
                        : nombreArchivo;

        try {
            MimeMessage mensaje = mailSender.createMimeMessage();

            MimeMessageHelper helper = new MimeMessageHelper(
                    mensaje,
                    true,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(remitente);
            helper.setTo(destinatario);
            helper.setSubject(
                    "Carta de aceptación - Oficina de Proyectos JJM"
            );

            String cuerpo =
                    "<html>" +
                    "<body>" +
                    "<p>Hola <strong>" + nombreSeguro + "</strong>,</p>" +
                    "<p>Te hacemos llegar tu <strong>carta de aceptación</strong> " +
                    "correspondiente a tu estancia profesional.</p>" +
                    "<p>La carta se encuentra adjunta en este correo.</p>" +
                    "<br>" +
                    "<p>Oficina de Proyectos<br>" +
                    "JJM Tecnologías Innovadoras</p>" +
                    "</body>" +
                    "</html>";

            helper.setText(cuerpo, true);

            helper.addAttachment(
                    archivoSeguro,
                    new org.springframework.core.io.ByteArrayResource(
                            contenidoCarta.getBytes(StandardCharsets.UTF_8)
                    ),
                    "text/html"
            );

            mailSender.send(mensaje);

        } catch (MessagingException | MailException ex) {
            throw new IllegalStateException(
                    "No fue posible enviar la carta de aceptación mediante Gmail.",
                    ex
            );
        }
    }

    private void enviar(
            String destinatario,
            String asunto,
            String cuerpo
    ) {
        if (remitente == null || remitente.isBlank()) {
            throw new IllegalStateException(
                    "No se configuró spring.mail.username."
            );
        }

        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();

            mensaje.setFrom(remitente);
            mensaje.setTo(destinatario);
            mensaje.setSubject(asunto);
            mensaje.setText(cuerpo);

            mailSender.send(mensaje);

        } catch (MailException ex) {
            throw new IllegalStateException(
                    "No fue posible enviar el correo mediante Gmail.",
                    ex
            );
        }
    }
}