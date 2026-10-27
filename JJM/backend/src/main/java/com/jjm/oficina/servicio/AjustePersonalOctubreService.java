package com.jjm.oficina.servicio;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Migración administrativa personal autorizada; corte fijo, sin ampliar derechos. */
@Service @Order(40)
public class AjustePersonalOctubreService implements ApplicationRunner {
 public static final String CORREO="jonathan_1323144210@uptecamac.edu.mx";
 public static final LocalDate DESDE=LocalDate.of(2026,9,1), CORTE=LocalDate.of(2026,10,30);
 private final JdbcTemplate jdbc; private final TransactionTemplate tx; private final Clock reloj;
 private final BitacoraService bitacora; private final boolean habilitado;
 public AjustePersonalOctubreService(JdbcTemplate jdbc,PlatformTransactionManager gestor,Clock reloj,BitacoraService bitacora,
  @Value("${PMO_AJUSTE_PERSONAL_OCT30:false}") boolean habilitado){this.jdbc=jdbc;this.tx=new TransactionTemplate(gestor);this.reloj=reloj;this.bitacora=bitacora;this.habilitado=habilitado;}
 public static List<LocalDate> dias(){return DESDE.datesUntil(CORTE.plusDays(1)).filter(d->d.getDayOfWeek().getValue()<=5).toList();}
 @Override public void run(ApplicationArguments args){
  if(!habilitado||LocalDate.now(reloj.withZone(AsistenciaAutomaticaService.ZONA)).isBefore(LocalDate.of(2026,10,26)))return;
  jdbc.execute("CREATE TABLE IF NOT EXISTS pmo_ajustes_personales(id_usuario INT NOT NULL,corte DATE NOT NULL,horas_agregadas DECIMAL(14,2) NOT NULL,aplicado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id_usuario,corte)) ENGINE=InnoDB");
  tx.executeWithoutResult(t->{
   var cuentas=jdbc.queryForList("SELECT id_usuario FROM usuarios WHERE LOWER(TRIM(correo))=? FOR UPDATE",CORREO);
   if(cuentas.size()!=1)throw new IllegalStateException("Ajuste personal: se requiere una cuenta única de Jonathan.");
   int id=((Number)cuentas.getFirst().get("id_usuario")).intValue();
   if(!jdbc.queryForList("SELECT id_usuario FROM pmo_ajustes_personales WHERE id_usuario=? AND corte=?",id,CORTE).isEmpty())return;
   var miembros=jdbc.queryForList("SELECT id_miembro FROM miembros_equipo WHERE id_usuario=?",id);
   if(miembros.size()!=1)throw new IllegalStateException("Ajuste personal: se requiere un miembro único de Jonathan.");
   int miembro=((Number)miembros.getFirst().get("id_miembro")).intValue();
   jdbc.update("UPDATE jornadas_automaticas SET finalizada=TRUE,conexiones='',motivo_cierre='ajuste_administrativo' WHERE id_usuario=? AND fecha BETWEEN ? AND ?",id,DESDE,CORTE);
   BigDecimal agregadas=BigDecimal.ZERO;
   for(LocalDate dia:dias()){
    BigDecimal existentes=jdbc.queryForObject("SELECT COALESCE(SUM(GREATEST(COALESCE(horas_trabajadas,0),0)),0) FROM registros_horas WHERE id_miembro=? AND fecha=? AND COALESCE(estado_validacion,'')<>'Rechazado'",BigDecimal.class,miembro,dia);
    jdbc.update("UPDATE registros_horas SET estado_validacion='Aprobado' WHERE id_miembro=? AND fecha=? AND COALESCE(estado_validacion,'')<>'Rechazado'",miembro,dia);
    BigDecimal faltan=BigDecimal.TEN.subtract(existentes==null?BigDecimal.ZERO:existentes).max(BigDecimal.ZERO);
    if(faltan.signum()>0){jdbc.update("INSERT INTO registros_horas(id_miembro,fecha,horas_trabajadas,tipo_registro,incidente,descripcion,estado_validacion) VALUES(?,?,?,'Manual','normal',?,'Aprobado')",miembro,dia,faltan,"Ajuste personal autorizado Jonathan. Corte fijo 30/10/2026: complemento hasta 10 horas por día hábil. No representa conexión observada.");agregadas=agregadas.add(faltan);}
   }
   bitacora.registrar(null,"HORAS","AJUSTE_PERSONAL_OCT30","Usuarios",id,"Reconocimiento personal autorizado de 44 días hábiles hasta el 30/10/2026. Solo se completa el faltante; se conservan los segundos observados.",null,agregadas.toPlainString());
   jdbc.update("INSERT INTO pmo_ajustes_personales(id_usuario,corte,horas_agregadas) VALUES(?,?,?)",id,CORTE,agregadas);
  });
 }
}
