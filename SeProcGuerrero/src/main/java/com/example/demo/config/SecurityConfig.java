package com.example.demo.config;

import java.time.LocalDate;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

import com.example.demo.modelo.Usuario;
import com.example.demo.repository.UsuarioRepository;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

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
                .requestMatchers("/login", "/auth/**", "/public/**").permitAll()

                // TODO lo demás protegido
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")          // <- tu pagina
                .loginProcessingUrl("/login") // <- endpoint que procesa el POST (puede ser el mismo)
                .defaultSuccessUrl("/", true) // <- a dónde ir si inicia sesión
                .failureUrl("/login?error=true")
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
    
    // Crear admin si no existe)
    @Bean
    CommandLineRunner initAdmin(UsuarioRepository repo, PasswordEncoder encoder) {
        return args -> {
            if (repo.findByUsername("admin").isEmpty()) {
                Usuario u = new Usuario();
                u.setUsername("admin");
                u.setPassword(encoder.encode("1234"));
                u.setTipo("central");
                u.setNombre("Administrador");
                u.setApellido("Sistema");
                u.setEmail("admin@seproc.com");
                u.setFechaRegistro(LocalDate.now());
                u.setIdRoles(1);
                repo.save(u);
            }
        };
    }
}
