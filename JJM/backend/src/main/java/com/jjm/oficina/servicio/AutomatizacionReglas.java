package com.jjm.oficina.servicio;

import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.*;
import java.util.*;

/** Reglas compartidas: archivos legibles no equivalen a documentos académicos aprobados. */
public final class AutomatizacionReglas {
    private AutomatizacionReglas() {}
    public static String texto(Object v) { return Objects.toString(v, "").trim(); }
    public static String normalizar(Object v) { return Normalizer.normalize(texto(v),Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT); }
    public static BigDecimal numero(Object v) { try { return new BigDecimal(texto(v)); } catch (NumberFormatException e) { return BigDecimal.ZERO; } }
    public static LocalDate fecha(Object v) { try { return LocalDate.parse(texto(v).substring(0,10)); } catch (RuntimeException e) { return null; } }
    public static boolean alumno(Object rol) { return Set.of("colaborador","alumno","alumna","estudiante","estudiante pmo").contains(normalizar(rol)); }
    public static boolean aprobado(Object estado) { return Set.of("aprobado","aceptado","aceptada","liberada","liberado").contains(normalizar(estado)); }
    public static boolean cierto(Object v) { return Boolean.TRUE.equals(v) || numero(v).compareTo(BigDecimal.ONE)==0; }
    public static String periodo(Object v) {
        String p=normalizar(v);
        if(p.startsWith("sep")&&p.contains("dic"))return "Septiembre–Diciembre";
        if(p.startsWith("may")&&p.contains("ago"))return "Mayo–Agosto";
        if(p.startsWith("ene")&&p.contains("abr"))return "Enero–Abril";
        return p.isBlank()?"Periodo pendiente":texto(v);
    }
    public static LocalDate lunesAnterior(LocalDate hoy) { return hoy.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(1); }
    public static int porcentaje(BigDecimal aprobadas,BigDecimal meta) { return meta.signum()<=0?0:aprobadas.multiply(BigDecimal.valueOf(100)).divide(meta,0,RoundingMode.DOWN).min(BigDecimal.valueOf(100)).max(BigDecimal.ZERO).intValue(); }
    public static byte[] pdf(String base64) {
        if(base64==null||base64.length()>5_650_000)throw new IllegalArgumentException("El PDF debe ocupar como máximo 4 MB.");
        String contenido=base64.startsWith("data:")?base64.substring(base64.indexOf(',')+1):base64;
        byte[] bytes;
        try { bytes=Base64.getDecoder().decode(contenido.replaceAll("\\s", "")); }
        catch(IllegalArgumentException e) { throw new IllegalArgumentException("El archivo no contiene un PDF legible."); }
        if(bytes.length<20||bytes.length>4*1024*1024||!new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-")
                ||!new String(bytes,Math.max(0,bytes.length-2048),Math.min(2048,bytes.length),StandardCharsets.ISO_8859_1).contains("%%EOF"))
            throw new IllegalArgumentException("El PDF está incompleto o no tiene una estructura básica válida.");
        return bytes;
    }
    public static String sha(byte[] bytes) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); } catch(Exception e) { throw new IllegalStateException(e); } }
    public static String html(Object v) { return texto(v).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;"); }
    public static boolean jornadaValida(Map<String,Object> j,LocalDate hoy) {
        LocalDate dia=fecha(j.get("fecha"));
        if(dia==null||dia.isAfter(hoy)||dia.getDayOfWeek().getValue()>5||!cierto(j.get("finalizada"))||!alumno(j.get("rol"))
                ||!"activo".equals(normalizar(j.get("estadoUsuario")))||!"normal".equals(normalizar(j.get("incidente")))
                ||!"pendiente".equals(normalizar(j.get("estadoValidacion")))||!"jornada".equals(normalizar(j.get("tipoRegistro"))))return false;
        try {
            LocalTime entrada=LocalTime.parse(texto(j.get("horaEntrada"))),salida=LocalTime.parse(texto(j.get("horaSalida")));
            long segundos=numero(j.get("segundos")).longValueExact();
            BigDecimal horas=numero(j.get("horas"));
            return !entrada.isBefore(LocalTime.of(7,0))&&!salida.isAfter(LocalTime.of(17,0))&&!salida.isBefore(entrada)
                    &&segundos>0&&segundos<=36000&&segundos<=Duration.between(entrada,salida).getSeconds()
                    &&horas.signum()>0&&horas.compareTo(BigDecimal.TEN)<=0
                    &&horas.compareTo(BigDecimal.valueOf(segundos).divide(BigDecimal.valueOf(3600),2,RoundingMode.DOWN))==0
                    &&numero(j.get("totalDia")).compareTo(BigDecimal.TEN)<=0;
        }catch(RuntimeException e){return false;}
    }
}
