package com.jjm.oficina.servicio;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

@Service
public class VozArdiaService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final Clock reloj;
    private final RestClient cliente;
    private final String clave,modeloVoz,modeloTexto,voz;
    private final int limite;
    private final Set<Integer> ocupados=ConcurrentHashMap.newKeySet();
    private final Semaphore capacidad=new Semaphore(4);
    @Autowired public VozArdiaService(Environment env,JdbcTemplate jdbc,ObjectMapper mapper,Clock reloj){
        this(env,jdbc,mapper,reloj,constructorHttp());
    }
    public VozArdiaService(Environment env,JdbcTemplate jdbc,ObjectMapper mapper,Clock reloj,RestClient.Builder builder){
        this.jdbc=jdbc;this.mapper=mapper;this.reloj=reloj.withZone(ZoneId.of("America/Mexico_City"));
        clave=env.getProperty("PMO_OPENAI_API_KEY","").trim();
        modeloVoz=env.getProperty("PMO_VOICE_MODEL","gpt-audio-1.5");
        modeloTexto=env.getProperty("PMO_TRANSCRIBE_MODEL","gpt-transcribe");
        voz=env.getProperty("PMO_VOICE_NAME","alloy");
        limite=Math.max(1,Math.min(200,env.getProperty("PMO_VOICE_DAILY_LIMIT",Integer.class,60)));
        cliente=builder.baseUrl("https://api.openai.com/v1").defaultHeader(HttpHeaders.AUTHORIZATION,"Bearer "+clave).build();
    }
    private static RestClient.Builder constructorHttp(){
        JdkClientHttpRequestFactory f=new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build());
        f.setReadTimeout(Duration.ofSeconds(40));return RestClient.builder().requestFactory(f);
    }
    @PostConstruct public void preparar(){jdbc.execute("CREATE TABLE IF NOT EXISTS pmo_ardia_uso(id_usuario INT NOT NULL,fecha DATE NOT NULL,solicitudes INT NOT NULL DEFAULT 0,PRIMARY KEY(id_usuario,fecha)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");}
    public Map<String,Object> configuracion(){return Map.of("disponible",!clave.isBlank(),"limiteDiario",limite,"mensaje",clave.isBlank()?"Administración debe configurar PMO_OPENAI_API_KEY en Coolify.":"Voz generada por IA. Al usar Hablar se envía ese audio a OpenAI; al escuchar una respuesta se envía su texto.");}
    private static ResponseStatusException error(int codigo,String texto){return new ResponseStatusException(HttpStatus.valueOf(codigo),texto);}
    private void reservar(Integer usuario){
        if(clave.isBlank())throw error(503,"Falta configurar la clave de voz de Ard.IA en Coolify.");
        if(!ocupados.add(usuario))throw error(409,"Ard.IA ya está procesando tu audio. Espera unos segundos.");
        if(!capacidad.tryAcquire()){ocupados.remove(usuario);throw error(429,"Hay varias consultas de voz en curso. Reintenta en unos segundos.");}
        try{
            LocalDate dia=LocalDate.now(reloj);
            jdbc.update("INSERT IGNORE INTO pmo_ardia_uso(id_usuario,fecha,solicitudes) VALUES(?,?,0)",usuario,dia);
            if(jdbc.update("UPDATE pmo_ardia_uso SET solicitudes=solicitudes+1 WHERE id_usuario=? AND fecha=? AND solicitudes<?",usuario,dia,limite)==0)throw error(429,"Llegaste al límite diario de voz. Puedes seguir usando Ard.IA por texto.");
        }catch(RuntimeException e){liberar(usuario);throw e;}
    }
    private void liberar(Integer usuario){ocupados.remove(usuario);capacidad.release();}
    private String recibir(RestClient.RequestBodySpec peticion,Object cuerpo){
        return peticion.body(cuerpo).retrieve().onStatus(s->!s.is2xxSuccessful(),(req,res)->{
            int codigo=res.getStatusCode().value();
            throw error(codigo==429?429:502,codigo==429?"El servicio de voz está ocupado o requiere saldo. Puedes seguir por texto.":"No se pudo completar la voz. Revisa la configuración de OpenAI en Coolify o reintenta.");
        }).body(String.class);
    }
    public byte[] hablar(Integer usuario,String texto){
        String limpio=Objects.toString(texto,"").trim();if(limpio.isEmpty()||limpio.length()>1200)throw error(400,"La respuesta de voz admite de 1 a 1200 caracteres.");
        reservar(usuario);
        try{
            Map<String,Object> cuerpo=Map.of("model",modeloVoz,"modalities",List.of("text","audio"),"audio",Map.of("voice",voz,"format","wav"),"max_completion_tokens",3000,"messages",List.of(
                Map.of("role","system","content","Lee únicamente el texto del usuario, sin agregar frases ni instrucciones. Habla en español de México, con voz natural, clara, cálida y pausas normales. No cambies números, nombres, fechas ni datos."),Map.of("role","user","content",limpio)));
            String json=recibir(cliente.post().uri("/chat/completions").contentType(MediaType.APPLICATION_JSON),mapper.writeValueAsString(cuerpo));
            String data=mapper.readTree(json).path("choices").path(0).path("message").path("audio").path("data").asText();
            byte[] audio=Base64.getDecoder().decode(data);
            if(audio.length<12||audio.length>8*1024*1024||!new String(audio,0,4,StandardCharsets.US_ASCII).equals("RIFF")||!new String(audio,8,4,StandardCharsets.US_ASCII).equals("WAVE"))throw error(502,"La voz no devolvió un audio válido. Puedes reintentar.");return audio;
        }catch(ResponseStatusException e){throw e;}catch(Exception e){throw error(502,"No se pudo obtener el audio de Ard.IA. Puedes seguir por texto.");}finally{liberar(usuario);}
    }
    public String transcribir(Integer usuario,String base64,String mime){
        Map<String,String> extensiones=Map.of("audio/webm","webm","audio/ogg","ogg","audio/mp4","mp4","audio/wav","wav");
        String tipo=Objects.toString(mime,"").split(";")[0].toLowerCase(Locale.ROOT);
        if(!extensiones.containsKey(tipo)||base64==null||base64.length()>2_796_208)throw error(400,"Graba hasta 30 segundos de audio, máximo 2 MB.");
        byte[] audio;try{audio=Base64.getDecoder().decode(base64);}catch(Exception e){throw error(400,"No se pudo leer tu audio.");}
        if(audio.length==0||audio.length>2*1024*1024)throw error(400,"Graba hasta 30 segundos de audio, máximo 2 MB.");
        reservar(usuario);
        try{
            String frontera="jjm-"+UUID.randomUUID();ByteArrayOutputStream b=new ByteArrayOutputStream();
            b.write(("--"+frontera+"\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n"+modeloTexto+"\r\n--"+frontera+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\"pregunta."+extensiones.get(tipo)+"\"\r\nContent-Type: "+tipo+"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
            b.write(audio);b.write(("\r\n--"+frontera+"--\r\n").getBytes(StandardCharsets.UTF_8));
            String json=recibir(cliente.post().uri("/audio/transcriptions").contentType(MediaType.parseMediaType("multipart/form-data; boundary="+frontera)),b.toByteArray());
            String texto=mapper.readTree(json).path("text").asText().trim();if(texto.isEmpty()||texto.length()>500)throw error(422,"No pude reconocer una pregunta breve. Habla con claridad o escríbela.");return texto;
        }catch(ResponseStatusException e){throw e;}catch(Exception e){throw error(502,"No se pudo transcribir tu audio. Puedes escribir tu pregunta.");}finally{liberar(usuario);}
    }
}
