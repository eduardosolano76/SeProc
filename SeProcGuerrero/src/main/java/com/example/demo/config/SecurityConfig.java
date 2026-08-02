package com.example.demo.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.demo.security.AdminSistemaDetailsService;
import com.example.demo.security.CustomUserDetailsService;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	@Value("${app.frontend-url:http://localhost:4200}")
	private String frontendUrl;

	// Zona super ADMIN (Prioridad 1 - Totalmente Aislada)
	@Bean
	@Order(1)
	SecurityFilterChain superAdminFilterChain(HttpSecurity http, AdminSistemaDetailsService adminSistemaDetailsService,
			PasswordEncoder passwordEncoder) throws Exception {

		DaoAuthenticationProvider superAdminProvider = new DaoAuthenticationProvider(adminSistemaDetailsService);

		superAdminProvider.setPasswordEncoder(passwordEncoder);

		http
				// Esta cadena SOLO atiende la API del súper admin
				.securityMatcher("/api/admin-seproc/**")

				// Provider exclusivo para el Súper Admin
				.authenticationProvider(superAdminProvider)

				// CORS para Angular
				.cors(cors -> cors.configurationSource(corsConfigurationSource()))

				// CSRF activo también para el login
				.csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))

				// Evita guardar peticiones y redireccionar como si fuera una app HTML
				.requestCache(cache -> cache.disable())

				.authorizeHttpRequests(auth -> auth

						// Endpoint público para obtener CSRF
						.requestMatchers(HttpMethod.GET, "/api/admin-seproc/csrf").permitAll()

						// Login público, pero protegido con CSRF
						.requestMatchers(HttpMethod.POST, "/api/admin-seproc/login").permitAll()

						// Recursos estáticos
						.requestMatchers("/assets/**", "/css/**", "/js/**", "/images/**", "/static/**").permitAll()

						// Todo lo demás requiere SUPERADMIN
						.anyRequest().hasRole("SUPERADMIN"))

				// Esto evita que la API te mande al login genérico HTML
				.exceptionHandling(ex -> ex

						.authenticationEntryPoint((request, response, authException) -> {
							response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
							response.setContentType("application/json;charset=UTF-8");
							response.getWriter().write("{\"mensaje\":\"No autenticado\"}");
							response.getWriter().flush();
						})

						.accessDeniedHandler((request, response, accessDeniedException) -> {
							response.setStatus(HttpServletResponse.SC_FORBIDDEN);
							response.setContentType("application/json;charset=UTF-8");
							response.getWriter().write("{\"mensaje\":\"Acceso denegado o CSRF inválido\"}");
							response.getWriter().flush();
						}))

				.formLogin(form -> form

						.loginProcessingUrl("/api/admin-seproc/login")

						.successHandler((request, response, authentication) -> {
							response.setStatus(HttpServletResponse.SC_OK);
							response.setContentType("application/json;charset=UTF-8");
							response.getWriter().write("{\"mensaje\":\"Login correcto\"}");
							response.getWriter().flush();
						})

						.failureHandler((request, response, exception) -> {
							response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
							response.setContentType("application/json;charset=UTF-8");
							response.getWriter().write("{\"mensaje\":\"Usuario o contraseña incorrectos\"}");
							response.getWriter().flush();
						})

						.permitAll())

				.logout(logout -> logout

						.logoutUrl("/api/admin-seproc/logout")

						.logoutSuccessHandler((request, response, authentication) -> {
							response.setStatus(HttpServletResponse.SC_OK);
							response.setContentType("application/json;charset=UTF-8");
							response.getWriter().write("{\"mensaje\":\"Sesión cerrada correctamente\"}");
							response.getWriter().flush();
						})

						.permitAll());

		return http.build();
	}

	@Bean
	@Order(2)
	SecurityFilterChain securityFilterChain(HttpSecurity http,
			CustomUserDetailsService customUserDetailsService, PasswordEncoder passwordEncoder,
			TenantFilter tenantFilter) throws Exception {

		// EXPLÍCITAMENTE para los clientes
		DaoAuthenticationProvider clientProvider = new DaoAuthenticationProvider(customUserDetailsService);
		clientProvider.setPasswordEncoder(passwordEncoder);

		http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
				.csrf(csrf -> csrf.ignoringRequestMatchers("/api/**")).authenticationProvider(clientProvider)
				.addFilterAfter(tenantFilter, UsernamePasswordAuthenticationFilter.class)
				.authorizeHttpRequests(auth -> auth

						// ESTÁTICOS
						.requestMatchers("/assets/**", "/css/**", "/js/**", "/images/**", "/static/**", "/uploads/**")
						.permitAll()

						// PÚBLICOS
						.requestMatchers("/", "/auth/**", "/public/**", "/registro/**", "/api/seproc/**",
								"/api/auth/login", "/api/auth/logout")
						.permitAll()

						// MÓDULOS POR ROL
						.requestMatchers("/admin", "/admin/**").hasRole("ADMINISTRADOR")
						.requestMatchers("/api/admin/**").hasRole("ADMINISTRADOR")

						.requestMatchers("/constructor", "/constructor/**").hasRole("CONTRATISTA")
						.requestMatchers("/api/constructor/**").hasRole("CONTRATISTA")

						.requestMatchers("/api/supervisor/**").hasRole("SUPERVISOR")

						.requestMatchers("/central", "/central/**").hasRole("CENTRAL")
						.requestMatchers("/api/central/**").hasRole("CENTRAL")

						.requestMatchers("/direccion", "/direccion/**").hasRole("DIRECCION")
						.requestMatchers("/api/direccion/**").hasRole("DIRECCION")

						.anyRequest().authenticated())
				.exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {

					// Las API deben responder JSON
					if (request.getServletPath().startsWith("/api/")) {
						response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

						response.setContentType("application/json;charset=UTF-8");

						response.getWriter().write("{\"mensaje\":\"No autenticado\"}");

						response.getWriter().flush();
						return;
					}

					response.sendRedirect(frontendUrl + "/seproc");
				}))

				.formLogin(form -> form

						.loginProcessingUrl("/api/auth/login")

						.successHandler((request, response, authentication) -> {

							String redirectUrl = obtenerRutaPorRol(authentication);

							response.setStatus(HttpServletResponse.SC_OK);
							response.setContentType("application/json;charset=UTF-8");

							response.getWriter().write(
									"{\"mensaje\":\"Login correcto\"," + "\"redirectUrl\":\"" + redirectUrl + "\"}");

							response.getWriter().flush();
						})

						.failureHandler((request, response, exception) -> {

							boolean usuarioDeshabilitado = exception instanceof org.springframework.security.authentication.DisabledException;

							String mensaje = usuarioDeshabilitado ? "Tu cuenta todavía no ha sido activada."
									: "Usuario o contraseña incorrectos.";

							response.setStatus(usuarioDeshabilitado ? HttpServletResponse.SC_FORBIDDEN
									: HttpServletResponse.SC_UNAUTHORIZED);

							response.setContentType("application/json;charset=UTF-8");

							response.getWriter().write("{\"mensaje\":\"" + mensaje + "\"}");

							response.getWriter().flush();
						})
						.permitAll()
						)
		        .logout(logout -> logout

		            .logoutUrl("/api/auth/logout")

		            .invalidateHttpSession(true)

		            .clearAuthentication(true)

		            .deleteCookies("JSESSIONID")

		            .logoutSuccessHandler(
		                (request, response,authentication) -> {

		                    response.setStatus(
		                        HttpServletResponse.SC_OK
		                    );

		                    response.setContentType(
		                        "application/json;charset=UTF-8"
		                    );

		                    response.getWriter().write(
		                        "{\"mensaje\":"
		                        + "\"Sesión cerrada correctamente\"}"
		                    );

		                    response.getWriter().flush();
		                }
		            )

		            .permitAll()
		        );
		return http.build();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuration = new CorsConfiguration();

		configuration.setAllowedOrigins(List.of("http://localhost:4200", "http://127.0.0.1:4200"));

		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

		configuration.setAllowedHeaders(List.of("*"));

		configuration.setExposedHeaders(List.of("Authorization", "Content-Type"));

		configuration.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/api/**", configuration);

		return source;
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	private String obtenerRutaPorRol(Authentication authentication) {

		var authorities = authentication.getAuthorities();

		if (authorities.stream().anyMatch(
				a -> a.getAuthority().equals("ROLE_ADMINISTRADOR") || a.getAuthority().equals("ADMINISTRADOR"))) {
			return "/admin-institucion/dashboard";
		}

		if (authorities.stream()
				.anyMatch(a -> a.getAuthority().equals("ROLE_CONTRATISTA") || a.getAuthority().equals("CONTRATISTA"))) {
			return "/constructor-institucion/dashboard";
		}

		if (authorities.stream()
				.anyMatch(a -> a.getAuthority().equals("ROLE_SUPERVISOR") || a.getAuthority().equals("SUPERVISOR"))) {
			return "/supervisor-institucion/dashboard";
		}

		if (authorities.stream()
				.anyMatch(a -> a.getAuthority().equals("ROLE_CENTRAL") || a.getAuthority().equals("CENTRAL"))) {
			return "/central-institucion/dashboard";
		}

		if (authorities.stream()
				.anyMatch(a -> a.getAuthority().equals("ROLE_DIRECCION") || a.getAuthority().equals("DIRECCION"))) {
			return "/direccion";
		}

		return "/";
	}
}