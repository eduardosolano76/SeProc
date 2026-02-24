package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.example.demo.security.RoleRedirectSuccessHandler;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            RoleRedirectSuccessHandler successHandler
    ) throws Exception {

        http
            .authorizeHttpRequests(auth -> auth
                // ESTÁTICOS
                .requestMatchers("/assets/**","/css/**","/js/**","/images/**","/static/**","/uploads/**").permitAll()

                // PÚBLICOS
                .requestMatchers("/login","/auth/**","/public/**","/registro/**").permitAll()

                // MÓDULOS POR ROL
                .requestMatchers("/admin/**").hasRole("ADMINISTRADOR")
                .requestMatchers("/constructor/**").hasRole("CONTRATISTA")
                .requestMatchers("/supervisor/**").hasRole("SUPERVISOR")
                .requestMatchers("/central/**").hasRole("CENTRAL")
                .requestMatchers("/direccion/**").hasRole("DIRECCION")

                // TODO lo demás protegido
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login")
                .successHandler(successHandler) // <-- REDIRECCIÓN POR ROL
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