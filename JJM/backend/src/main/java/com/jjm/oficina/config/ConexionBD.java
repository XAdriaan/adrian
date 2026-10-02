package com.jjm.oficina.config;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import javax.sql.DataSource;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ConexionBD {

    @Bean
    CommandLineRunner probarConexionMySQL(DataSource dataSource) {
        return args -> {
            try (
                Connection conexion = dataSource.getConnection();
                PreparedStatement consulta = conexion.prepareStatement("SELECT DATABASE()");
                ResultSet resultado = consulta.executeQuery()
            ) {
                if (resultado.next()) {
                    System.out.println("==============================================");
                    System.out.println("CONEXION MYSQL EXITOSA");
                    System.out.println("Base de datos activa: " + resultado.getString(1));
                    System.out.println("==============================================");
                }
            } catch (Exception error) {
                System.err.println("==============================================");
                System.err.println("ERROR AL CONECTAR CON MYSQL");
                System.err.println(error.getMessage());
                System.err.println("==============================================");

                throw error;
            }
        };
    }
}