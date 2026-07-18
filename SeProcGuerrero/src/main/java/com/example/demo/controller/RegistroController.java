package com.example.demo.controller;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.RegistroDto;
import com.example.demo.modelo.Institucion;
import com.example.demo.modelo.Usuario;
import com.example.demo.repository.InstitucionRepository;
import com.example.demo.repository.UsuarioRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/seproc/registro")
public class RegistroController {

	private final UsuarioRepository usuarioRepo;
	private final PasswordEncoder encoder;
	private final InstitucionRepository institucionRepo;

	public RegistroController(UsuarioRepository usuarioRepo, PasswordEncoder encoder,
			InstitucionRepository institucionRepo) {

		this.usuarioRepo = usuarioRepo;
		this.encoder = encoder;
		this.institucionRepo = institucionRepo;
	}

	@PostMapping("/{abreviacion}")
	@Transactional
	public ResponseEntity<Map<String, Object>> registrar(@PathVariable String abreviacion,
			@Valid @RequestBody RegistroDto dto, BindingResult bindingResult) {

		Institucion institucion = institucionRepo.findByAbreviacionIgnoreCase(abreviacion).orElse(null);

		if (institucion == null || institucion.getActiva() == 0) {
			return respuestaError(HttpStatus.NOT_FOUND, "La institución indicada no existe o no está activa.",
					Map.of());
		}

		Map<String, String> errores = new LinkedHashMap<>();

		bindingResult.getFieldErrors()
				.forEach(error -> errores.putIfAbsent(error.getField(), error.getDefaultMessage()));

		String username = dto.getUsername() == null ? "" : dto.getUsername().trim();

		String email = dto.getEmail() == null ? "" : dto.getEmail().trim();

		if (!username.isBlank() && usuarioRepo.existsByUsernameIgnoreCase(username)) {

			errores.put("username", "Ese nombre de usuario ya está registrado.");
		}

		if (!email.isBlank() && usuarioRepo.existsByEmailIgnoreCase(email)) {

			errores.put("email", "Ese correo electrónico ya está registrado.");
		}

		if (!errores.isEmpty()) {
			return respuestaError(HttpStatus.BAD_REQUEST, "Revisa los datos marcados en el formulario.", errores);
		}

		Usuario usuario = new Usuario();

		usuario.setNombre(dto.getNombre().trim());
		usuario.setApellido(dto.getApellido().trim());
		usuario.setEmail(email);
		usuario.setUsername(username);
		usuario.setPassword(encoder.encode(dto.getPassword()));

		usuario.setFechaRegistro(LocalDate.now());
		usuario.setInstitucion(institucion);

		// La cuenta queda esperando aprobación
		usuario.setActivo(false);
		usuario.setRol(null);

		usuarioRepo.save(usuario);

		Map<String, Object> respuesta = new LinkedHashMap<>();

		respuesta.put("mensaje", "Tu solicitud fue enviada correctamente. "
				+ "            Podrás iniciar sesión cuando el administrador\r\n"
				+ "            de la institución active tu cuenta y te asigne un rol.");

		return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
	}

	private ResponseEntity<Map<String, Object>> respuestaError(HttpStatus estado, String mensaje,
			Map<String, String> errores) {

		Map<String, Object> respuesta = new LinkedHashMap<>();

		respuesta.put("mensaje", mensaje);
		respuesta.put("errores", errores);

		return ResponseEntity.status(estado).body(respuesta);
	}
}
