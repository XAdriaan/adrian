
package com.jjm.oficina.repositorio;

import com.jjm.oficina.modelo.FaseProyecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FaseProyectoRepository
        extends JpaRepository<FaseProyecto, Integer> {

    /*
     * numero_orden está almacenado como varchar.
     *
     * CAST permite ordenar correctamente:
     * 1, 2, 3, 4 ... 20, 21
     *
     * También conserva un orden correcto para valores como:
     * 3.1, 3.2, 4.1, etc.
     */
    @Query(
            value = """
                    SELECT *
                    FROM fases_proyecto
                    WHERE id_proyecto = :idProyecto
                    ORDER BY
                        CAST(numero_orden AS DECIMAL(10,2)) ASC,
                        id_fase ASC
                    """,
            nativeQuery = true
    )
    List<FaseProyecto> findByIdProyectoOrderByNumeroOrdenAsc(
            @Param("idProyecto") Integer idProyecto
    );

    void deleteByIdProyecto(Integer idProyecto);
}

