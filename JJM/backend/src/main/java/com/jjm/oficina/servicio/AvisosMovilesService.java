package com.jjm.oficina.servicio;
import jakarta.annotation.*;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jce.interfaces.*;
import nl.martijndwars.webpush.*;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.time.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpResponse;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.nio.charset.StandardCharsets;

@Service
public class AvisosMovilesService {
 static class EmpaquePush extends AbstractPushService<EmpaquePush>{
  EmpaquePush(String publica,String privada,String contacto)throws GeneralSecurityException{super(publica,privada,contacto);}
  nl.martijndwars.webpush.HttpRequest preparar(Notification n,Encoding e)throws Exception{return prepareRequest(n,e);}
 }
 private final JdbcTemplate jdbc;private final Clock reloj;
 private EmpaquePush push;private String publica;
 private final ExecutorService envios=Executors.newSingleThreadExecutor(r->{Thread t=new Thread(r,"avisos-moviles");t.setDaemon(true);return t;});
 private final AtomicBoolean enviando=new AtomicBoolean(false);
 public AvisosMovilesService(JdbcTemplate jdbc,Clock reloj){this.jdbc=jdbc;this.reloj=reloj.withZone(AsistenciaAutomaticaService.ZONA);}
 @PostConstruct public void preparar() throws Exception {
  Security.addProvider(new BouncyCastleProvider());
  jdbc.execute("CREATE TABLE IF NOT EXISTS pmo_push_claves(id INT PRIMARY KEY,publica VARCHAR(150) NOT NULL,privada VARCHAR(150) NOT NULL) ENGINE=InnoDB");
  jdbc.execute("CREATE TABLE IF NOT EXISTS pmo_push_dispositivos(id BIGINT AUTO_INCREMENT PRIMARY KEY,id_usuario INT NOT NULL,firma CHAR(64) NOT NULL UNIQUE,endpoint VARCHAR(2000) NOT NULL,p256dh VARCHAR(150) NOT NULL,auth VARCHAR(100) NOT NULL,actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,KEY idx_push_usuario(id_usuario)) ENGINE=InnoDB");
  jdbc.execute("CREATE TABLE IF NOT EXISTS pmo_push_envios(id_dispositivo BIGINT NOT NULL,fecha DATE NOT NULL,intentos INT NOT NULL DEFAULT 0,proximo_intento DATETIME NULL,enviado BOOLEAN NOT NULL DEFAULT FALSE,PRIMARY KEY(id_dispositivo,fecha)) ENGINE=InnoDB");
  if(jdbc.queryForList("SELECT id FROM pmo_push_claves WHERE id=1").isEmpty()){
   KeyPairGenerator g=KeyPairGenerator.getInstance("ECDH","BC");g.initialize(new ECGenParameterSpec("prime256v1"));KeyPair k=g.generateKeyPair();
   jdbc.update("INSERT IGNORE INTO pmo_push_claves(id,publica,privada) VALUES(1,?,?)",Base64.getUrlEncoder().withoutPadding().encodeToString(Utils.encode((ECPublicKey)k.getPublic())),Base64.getUrlEncoder().withoutPadding().encodeToString(Utils.encode((ECPrivateKey)k.getPrivate())));
  }
  var claves=jdbc.queryForMap("SELECT publica,privada FROM pmo_push_claves WHERE id=1");publica=(String)claves.get("publica");push=new EmpaquePush(publica,(String)claves.get("privada"),"https://oficina.jjmti.com.mx");
 }
 public String publica(){return publica;}
 public static boolean destinoPermitido(String endpoint){
  try{URI u=URI.create(endpoint);String h=Objects.toString(u.getHost(),"").toLowerCase(Locale.ROOT);return "https".equals(u.getScheme())&&u.getUserInfo()==null&&(u.getPort()==-1||u.getPort()==443)&&u.getFragment()==null&&
   (h.equals("fcm.googleapis.com")||h.equals("updates.push.services.mozilla.com")||h.equals("push.services.mozilla.com")||h.equals("web.push.apple.com")||h.endsWith(".notify.windows.com"));}catch(Exception e){return false;}
 }
 public void suscribir(Integer usuario,String endpoint,String p256dh,String auth){
  try{if(endpoint==null||endpoint.length()>2000||!destinoPermitido(endpoint)||Base64.getUrlDecoder().decode(p256dh).length!=65||Base64.getUrlDecoder().decode(auth).length!=16)throw new IllegalArgumentException();Utils.loadPublicKey(p256dh);
   String firma=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(endpoint.getBytes(StandardCharsets.UTF_8)));
   Integer n=jdbc.queryForObject("SELECT COUNT(*) FROM pmo_push_dispositivos WHERE id_usuario=?",Integer.class,usuario);
   if(n!=null&&n>=10&&jdbc.queryForList("SELECT id FROM pmo_push_dispositivos WHERE firma=? AND id_usuario=?",firma,usuario).isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"Ya tienes diez dispositivos registrados. Desactiva los que no uses.");
   jdbc.update("INSERT INTO pmo_push_dispositivos(id_usuario,firma,endpoint,p256dh,auth) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE id_usuario=VALUES(id_usuario),p256dh=VALUES(p256dh),auth=VALUES(auth),actualizado=CURRENT_TIMESTAMP",usuario,firma,endpoint,p256dh,auth);
  }catch(ResponseStatusException e){throw e;}catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"El dispositivo no proporcionó una suscripción válida.");}
 }
 public void retirar(Integer usuario,String endpoint){jdbc.update("DELETE FROM pmo_push_dispositivos WHERE id_usuario=? AND endpoint=?",usuario,endpoint);}
 public static boolean esHorario(LocalDateTime momento){return momento.getDayOfWeek().getValue()<=5&&momento.getHour()==7;}
 @Scheduled(cron="0 0 7 * * MON-FRI",zone="America/Mexico_City") public void puntual(){programar();}
 @Scheduled(fixedDelay=30000,initialDelay=30000) public void programar(){
  LocalDateTime ahora=LocalDateTime.now(reloj);if(!esHorario(ahora))return;
  // La Sala general permanece disponible; este evento fija el inicio diario y su aviso.
  jdbc.update("INSERT IGNORE INTO pmo_recordatorios(clave,id_usuario,titulo,descripcion,enlace,estado,actualizado_en) SELECT CONCAT('reunion-general-7-',?,'-',id_usuario),id_usuario,'Reunión de las 7:00','La reunión programada de Sala general ya comenzó. Entra para participar.','reunion.html?general=1','Abierto',? FROM usuarios WHERE estado='Activo'",ahora.toLocalDate(),ahora);
  jdbc.update("INSERT IGNORE INTO pmo_push_envios(id_dispositivo,fecha) SELECT d.id,? FROM pmo_push_dispositivos d JOIN usuarios u ON u.id_usuario=d.id_usuario WHERE u.estado='Activo'",ahora.toLocalDate());
  if(enviando.compareAndSet(false,true))envios.execute(()->{try{enviarPendientes(ahora.toLocalDate());}finally{enviando.set(false);}});
 }
 void enviarPendientes(LocalDate fecha){
  var http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).followRedirects(HttpClient.Redirect.NEVER).build();
  for(var d:jdbc.queryForList("SELECT d.*,e.intentos FROM pmo_push_envios e JOIN pmo_push_dispositivos d ON d.id=e.id_dispositivo JOIN usuarios u ON u.id_usuario=d.id_usuario WHERE e.fecha=? AND e.enviado=FALSE AND e.intentos<3 AND (e.proximo_intento IS NULL OR e.proximo_intento<=CURRENT_TIMESTAMP) AND u.estado='Activo' LIMIT 100",fecha)){
   if(!esHorario(LocalDateTime.now(reloj)))break;
   long id=((Number)d.get("id")).longValue();int intento=((Number)d.get("intentos")).intValue();
   if(jdbc.update("UPDATE pmo_push_envios SET intentos=intentos+1,proximo_intento=DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 1 MINUTE) WHERE id_dispositivo=? AND fecha=? AND intentos=? AND enviado=FALSE AND (proximo_intento IS NULL OR proximo_intento<=CURRENT_TIMESTAMP)",id,fecha,intento)!=1)continue;
   try{
    String destino=(String)d.get("endpoint");if(!destinoPermitido(destino))continue;
    byte[] payload=("{\"title\":\"JJM · Reunión de las 7:00\",\"body\":\"La reunión de Sala general ya comenzó. Toca para entrar.\",\"tag\":\"jjm-general-"+fecha+"\"}").getBytes(StandardCharsets.UTF_8);
    var req=push.preparar(new Notification(destino,(String)d.get("p256dh"),(String)d.get("auth"),payload,300),Encoding.AES128GCM);
    var b=java.net.http.HttpRequest.newBuilder(URI.create(destino)).timeout(Duration.ofSeconds(12));req.getHeaders().forEach(b::header);
    int status=http.send(b.POST(java.net.http.HttpRequest.BodyPublishers.ofByteArray(req.getBody())).build(),HttpResponse.BodyHandlers.discarding()).statusCode();
    if(status>=200&&status<300)jdbc.update("UPDATE pmo_push_envios SET enviado=TRUE WHERE id_dispositivo=? AND fecha=?",id,fecha);
    if(status==404||status==410)jdbc.update("DELETE FROM pmo_push_dispositivos WHERE id=?",id);
   }catch(Exception e){if(e instanceof InterruptedException){Thread.currentThread().interrupt();break;}java.util.logging.Logger.getLogger(getClass().getName()).warning("No se pudo entregar un aviso móvil; se reintentará hasta tres veces.");}
  }
  jdbc.update("DELETE FROM pmo_push_envios WHERE fecha<?",fecha.minusDays(30));
 }
 @PreDestroy public void cerrar(){envios.shutdownNow();}
}
