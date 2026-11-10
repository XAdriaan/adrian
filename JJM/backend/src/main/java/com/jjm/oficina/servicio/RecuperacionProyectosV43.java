package com.jjm.oficina.servicio;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.context.annotation.DependsOn;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Recuperación única solicitada por administración. Conserva IDs y relaciones. */
@Component
@Order(5)
@DependsOn("esquemaBajaProyecto")
public class RecuperacionProyectosV43 implements ApplicationRunner {
    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    public RecuperacionProyectosV43(JdbcTemplate db, PlatformTransactionManager manager) {
        this.db=db; this.tx=new TransactionTemplate(manager);
    }
    @Override public void run(ApplicationArguments args) {
        db.execute("CREATE TABLE IF NOT EXISTS pmo_recuperaciones (version VARCHAR(60) PRIMARY KEY, aplicada DATETIME NULL) ENGINE=InnoDB");
        db.execute("CREATE TABLE IF NOT EXISTS pmo_proyectos_recuperados_v43 (id_proyecto INT PRIMARY KEY, eliminado_en DATETIME NOT NULL, recuperado_en DATETIME NOT NULL) ENGINE=InnoDB");
        tx.executeWithoutResult(status -> {
            db.update("INSERT IGNORE INTO pmo_recuperaciones(version) VALUES ('proyectos-v43')");
            var registro=db.queryForList("SELECT aplicada FROM pmo_recuperaciones WHERE version='proyectos-v43' FOR UPDATE");
            if (registro.getFirst().get("aplicada")!=null) return;
            db.update("""
                INSERT IGNORE INTO pmo_proyectos_recuperados_v43(id_proyecto,eliminado_en,recuperado_en)
                SELECT id_proyecto,eliminado_en,CURRENT_TIMESTAMP FROM proyectos
                WHERE eliminado_en IS NOT NULL
                AND LOWER(TRIM(nombre)) NOT IN ('333','3333','444','555','eee','work')
                """);
            db.update("UPDATE proyectos p JOIN pmo_proyectos_recuperados_v43 r ON r.id_proyecto=p.id_proyecto SET p.eliminado_en=NULL");
            db.update("UPDATE pmo_recuperaciones SET aplicada=CURRENT_TIMESTAMP WHERE version='proyectos-v43'");
        });
    }
}
