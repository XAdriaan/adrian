package com.jjm.oficina.controller;

import com.jjm.oficina.modelo.Usuario;
import com.jjm.oficina.repositorio.UsuarioRepository;
import org.springframework.core.env.Environment;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;

/** Videos y metadatos en el volumen de la aplicación; no modifica MySQL. */
@RestController
@RequestMapping("/api/grabaciones")
public class GrabacionController {
    private static final long MAX_VIDEO = 512L * 1024 * 1024;
    private static final long MAX_TOTAL = 10L * 1024 * 1024 * 1024;
    private static final int MAX_PARTE = 4 * 1024 * 1024;
    private final Path raiz;
    private final UsuarioRepository usuarios;
    private final ReunionController reuniones;
    private final Map<String,Carga> cargas = new HashMap<>();
    private static class Carga {
        final String id, sala, titulo, fecha; final int usuario;
        int siguiente; byte[] ultima; long bytes, actividad = System.currentTimeMillis();
        Carga(String id,String sala,String titulo,int usuario){this.id=id;this.sala=sala;this.titulo=titulo;this.usuario=usuario;fecha=Instant.now().toString();}
    }
    public record Inicio(String sala,String titulo) {}
    public record Fin(long duracionSegundos) {}
    public GrabacionController(UsuarioRepository usuarios,ReunionController reuniones,Environment env) throws IOException {
        this.usuarios=usuarios;this.reuniones=reuniones;
        raiz=Path.of(env.getProperty("PMO_RECORDINGS_DIR","./grabaciones")).toAbsolutePath().normalize();
        Files.createDirectories(raiz);
    }
    private Usuario usuario(Integer id) {
        Usuario u=id==null?null:usuarios.findById(id).orElse(null);
        if(u==null||!"Activo".equalsIgnoreCase(u.getEstado()))throw fallo(HttpStatus.UNAUTHORIZED,"Inicia sesión para consultar las grabaciones.");
        return u;
    }
    private boolean acceso(String sala,int id) {
        if("general".equals(sala))return true;
        try{return Long.parseLong(sala)>0&&reuniones.puedeAccederGrabacion(id,Long.parseLong(sala));}catch(NumberFormatException e){return false;}
    }
    private Path archivo(String id,String extension) {
        try{if(!UUID.fromString(id).toString().equals(id))throw new IllegalArgumentException();}
        catch(Exception e){throw fallo(HttpStatus.BAD_REQUEST,"Identificador de grabación inválido.");}
        return raiz.resolve(id+extension);
    }
    private ResponseStatusException fallo(HttpStatus s,String m){return new ResponseStatusException(s,m);}
    private long espacioUsado() throws IOException {
        try(var archivos=Files.list(raiz)){return archivos.filter(p->p.toString().endsWith(".webm")||p.toString().endsWith(".part"))
            .mapToLong(p->{try{return Files.size(p);}catch(IOException e){return 0;}}).sum();}
    }
    @PostMapping("/cargas")
    public synchronized Map<String,Object> iniciar(@RequestBody Inicio entrada,@RequestHeader(value="X-Usuario-Id",required=false) Integer id) throws IOException {
        Usuario u=usuario(id);
        if(entrada.sala()==null||!acceso(entrada.sala(),u.getId()))throw fallo(HttpStatus.FORBIDDEN,"No tienes acceso a esta sala.");
        // Solo se limpian cargas temporales abandonadas, nunca videos publicados.
        var it=cargas.values().iterator();while(it.hasNext()){Carga c=it.next();if(System.currentTimeMillis()-c.actividad>86_400_000){Files.deleteIfExists(archivo(c.id,".part"));it.remove();}}
        if(cargas.values().stream().filter(c->c.usuario==u.getId()).count()>=3)throw fallo(HttpStatus.CONFLICT,"Ya tienes tres videos pendientes de guardar.");
        if(espacioUsado()>=MAX_TOTAL)throw fallo(HttpStatus.INSUFFICIENT_STORAGE,"El almacenamiento de grabaciones está lleno.");
        String uuid=UUID.randomUUID().toString();String titulo=entrada.titulo()==null?"Videollamada":entrada.titulo().strip();
        if(titulo.length()>220)throw fallo(HttpStatus.BAD_REQUEST,"El título es demasiado largo.");
        Carga c=new Carga(uuid,entrada.sala(),titulo,u.getId());Files.createFile(archivo(uuid,".part"));cargas.put(uuid,c);
        return Map.of("estado","correcto","id",uuid,"maxParte",MAX_PARTE,"maxVideo",MAX_VIDEO);
    }
    private Carga carga(String id,Integer usuario) {
        Usuario u=usuario(usuario);archivo(id,".part");Carga c=cargas.get(id);
        if(c==null||c.usuario!=u.getId())throw fallo(HttpStatus.NOT_FOUND,"La carga no está disponible. Vuelve a guardar el video.");
        if(!acceso(c.sala,u.getId()))throw fallo(HttpStatus.FORBIDDEN,"Ya no tienes acceso a la sala.");
        c.actividad=System.currentTimeMillis();return c;
    }
    @PutMapping(value="/cargas/{id}",consumes="application/octet-stream")
    public synchronized Map<String,Object> parte(@PathVariable String id,@RequestParam int parte,@RequestBody byte[] contenido,
            @RequestHeader(value="X-Usuario-Id",required=false) Integer usuario) throws IOException {
        Carga c=carga(id,usuario);
        if(contenido.length==0||contenido.length>MAX_PARTE)throw fallo(HttpStatus.PAYLOAD_TOO_LARGE,"Cada parte admite hasta 4 MB.");
        byte[] hash;try{hash=java.security.MessageDigest.getInstance("SHA-256").digest(contenido);}catch(Exception e){throw new IllegalStateException(e);}
        if(parte==c.siguiente-1&&Arrays.equals(hash,c.ultima))return Map.of("estado","correcto","siguiente",c.siguiente);
        if(parte!=c.siguiente)throw fallo(HttpStatus.CONFLICT,"Parte fuera de orden.");
        if(c.bytes+contenido.length>MAX_VIDEO||espacioUsado()+contenido.length>MAX_TOTAL)throw fallo(HttpStatus.PAYLOAD_TOO_LARGE,"Se alcanzó el límite de almacenamiento del video.");
        if(parte==0&&(contenido.length<4||(contenido[0]&255)!=0x1a||(contenido[1]&255)!=0x45||(contenido[2]&255)!=0xdf||(contenido[3]&255)!=0xa3))
            throw fallo(HttpStatus.BAD_REQUEST,"La grabación debe ser un video WebM.");
        long previo=c.bytes;
        try{Files.write(archivo(id,".part"),contenido,StandardOpenOption.APPEND);}catch(IOException e){try(var canal=java.nio.channels.FileChannel.open(archivo(id,".part"),StandardOpenOption.WRITE)){canal.truncate(previo);}throw e;}
        c.bytes+=contenido.length;c.siguiente++;c.ultima=hash;
        return Map.of("estado","correcto","siguiente",c.siguiente);
    }
    @PostMapping("/cargas/{id}/finalizar")
    public synchronized Map<String,Object> finalizar(@PathVariable String id,@RequestBody Fin fin,
            @RequestHeader(value="X-Usuario-Id",required=false) Integer usuario) throws IOException {
        if(!cargas.containsKey(id)) {
            Usuario u=usuario(usuario);Properties p=leer(id);
            if(!p.getProperty("usuario").equals(String.valueOf(u.getId()))||!acceso(p.getProperty("sala"),u.getId()))throw fallo(HttpStatus.FORBIDDEN,"No puedes finalizar esa grabación.");
            return Map.of("estado","correcto","grabacion",vista(p));
        }
        Carga c=carga(id,usuario);
        if(c.bytes==0||fin.duracionSegundos()<0||fin.duracionSegundos()>86_400)throw fallo(HttpStatus.BAD_REQUEST,"Grabación vacía o duración inválida.");
        Properties p=new Properties();p.setProperty("id",id);p.setProperty("sala",c.sala);p.setProperty("titulo",c.titulo);
        p.setProperty("fecha",c.fecha);p.setProperty("usuario",String.valueOf(c.usuario));p.setProperty("bytes",String.valueOf(c.bytes));p.setProperty("duracionSegundos",String.valueOf(fin.duracionSegundos()));
        try(OutputStream out=Files.newOutputStream(archivo(id,".meta.tmp"))){p.store(out,"JJM grabacion");}
        Files.move(archivo(id,".part"),archivo(id,".webm"));
        try{Files.move(archivo(id,".meta.tmp"),archivo(id,".meta"),StandardCopyOption.ATOMIC_MOVE);}
        catch(IOException e){Files.move(archivo(id,".webm"),archivo(id,".part"));throw e;}
        cargas.remove(id);return Map.of("estado","correcto","grabacion",vista(p));
    }
    private Properties leer(String id) throws IOException {
        Properties p=new Properties();Path meta=archivo(id,".meta");
        if(!Files.isRegularFile(meta)||!Files.isRegularFile(archivo(id,".webm")))throw fallo(HttpStatus.NOT_FOUND,"La grabación no existe.");
        try(InputStream in=Files.newInputStream(meta)){p.load(in);}return p;
    }
    private Map<String,Object> vista(Properties p) {
        return Map.of("id",p.getProperty("id"),"sala",p.getProperty("sala"),"titulo",p.getProperty("titulo"),"fecha",p.getProperty("fecha"),"bytes",Long.parseLong(p.getProperty("bytes")),"duracionSegundos",Long.parseLong(p.getProperty("duracionSegundos")));
    }
    @GetMapping
    public synchronized Map<String,Object> listar(@RequestParam(required=false) String sala,
            @RequestHeader(value="X-Usuario-Id",required=false) Integer id) throws IOException {
        Usuario u=usuario(id);if(sala!=null&&!acceso(sala,u.getId()))throw fallo(HttpStatus.FORBIDDEN,"No tienes acceso a esas grabaciones.");
        List<Map<String,Object>> lista=new ArrayList<>();
        try(var metas=Files.list(raiz)){for(Path meta:metas.filter(p->p.toString().endsWith(".meta")).toList()){
            String uuid=meta.getFileName().toString().replace(".meta","");Properties p=leer(uuid);
            if((sala==null||sala.equals(p.getProperty("sala")))&&acceso(p.getProperty("sala"),u.getId()))lista.add(vista(p));
        }}
        lista.sort(Comparator.comparing(m->String.valueOf(m.get("fecha")),Comparator.reverseOrder()));
        return Map.of("estado","correcto","grabaciones",lista);
    }
    @GetMapping("/{id}/video")
    public ResponseEntity<Resource> video(@PathVariable String id,@RequestHeader(value="X-Usuario-Id",required=false) Integer activo) throws IOException {
        Usuario u=usuario(activo);Properties p=leer(id);
        if(!acceso(p.getProperty("sala"),u.getId()))throw fallo(HttpStatus.FORBIDDEN,"No tienes acceso al video de este proyecto.");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType("video/webm"))
            .header(HttpHeaders.CONTENT_DISPOSITION,"inline; filename=\"JJM-"+id+".webm\"")
            .body(new FileSystemResource(archivo(id,".webm")));
    }
}
