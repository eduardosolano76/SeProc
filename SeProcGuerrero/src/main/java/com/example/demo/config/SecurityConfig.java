package com.example.demo.config;

import java.time.LocalDate;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.example.demo.modelo.Rol;
import com.example.demo.modelo.Usuario;
import com.example.demo.repository.RolRepository;
import com.example.demo.repository.UsuarioRepository;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                // ESTÁTICOS (para que cargue CSS/JS/imagenes)
                .requestMatchers("/assets/**","/css/**", "/js/**", "/images/**", "/static/**").permitAll()

                // TU LOGIN + AUTH (publico)
                .requestMatchers("/login", "/auth/**", "/public/**", "/registro/**").permitAll()

                // TODO lo demás protegido
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")          // <- tu pagina
                .loginProcessingUrl("/login") // <- endpoint que procesa el POST (puede ser el mismo)
                .defaultSuccessUrl("/admin", true) // <- a dónde ir si inicia sesión
                .failureHandler((request, response, exception) -> {
                    if (exception instanceof org.springframework.security.authentication.DisabledException) {
                        response.sendRedirect("/login?pending=true");
                    } else {
                        response.sendRedirect("/login?error=true");
                    }
                })
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout=true")
                .permitAll()
            );

        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
