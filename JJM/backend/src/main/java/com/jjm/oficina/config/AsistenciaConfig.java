package com.jjm.oficina.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class AsistenciaConfig {
    @Bean
    public Clock relojAsistencia() { return Clock.systemUTC(); }
}
