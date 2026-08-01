package com.example.demo.controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.modelo.Usuario;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.storage.StorageService;

@RestController
@RequestMapping("/api/supervisor")
public class SupervisorController {

	private final UsuarioRepository usuarioRepo;

	private final StorageService storageService;

	private final PasswordEncoder passwordEncoder;

	public SupervisorController(UsuarioRepository usuarioRepo, StorageService storageService,
			PasswordEncoder passwordEncoder) {
		this.usuarioRepo = usuarioRepo;
		this.storageService = storageService;
		this.passwordEncoder = passwordEncoder;
	}

	@GetMapping("/perfil")
	public ResponseEntity<?> obtenerPerfil(Principal principal) {

		Usuario usuario = usuarioRepo.findByUsername(principal.getName()).orElse(null);

		if (usuario == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "Usuario no encontrado."));
		}

		String rol = usuario.getRol() != null ? usuario.getRol().getNombre() : "SUPERVISOR";

		String fotoUrl = storageService.publicUrl(usuario.getFoto());

		String logoEmpresa = null;
		String abreviacion = null;

		if (usuario.getInstitucion() != null) {
			logoEmpresa = storageService.publicLogoUrl(usuario.getInstitucion().getLogoUrl());

			// Ajusta el getter si en tu entidad tiene otro nombre.
			abreviacion = usuario.getInstitucion().getAbreviacion();
		}

		Map<String, Object> perfil = new HashMap<>();
		perfil.put("nombreUsuario", usuario.getNombre());
		perfil.put("rolUsuario", rol);
		perfil.put("fotoUrl", fotoUrl);
		perfil.put("logoEmpresa", logoEmpresa);
		perfil.put("abreviacion", abreviacion);

		return ResponseEntity.ok(perfil);
	}
	
	// Cambiar password del perfil logueado
	@PostMapping("/perfil/password")
	public ResponseEntity<?> cambiarPassword(
	        @RequestBody Map<String, String> payload,
	        Principal principal) {

	    Usuario usuario = usuarioRepo.findByUsername(principal.getName())
	            .orElse(null);

	    if (usuario == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body(Map.of("mensaje", "Usuario no encontrado."));
	    }

	    String passActual = payload.get("passActual");
	    String passNueva = payload.get("passNueva");
	    String passRepetida = payload.get("passRepetida");

	    if (passActual == null || passNueva == null || passRepetida == null
	            || passActual.isBlank()
	            || passNueva.isBlank()
	            || passRepetida.isBlank()) {

	        return ResponseEntity.badRequest()
	                .body(Map.of("mensaje", "Todos los campos son obligatorios."));
	    }

	    if (!passNueva.equals(passRepetida)) {
	        return ResponseEntity.badRequest()
	                .body(Map.of("mensaje", "Las contraseñas nuevas no coinciden."));
	    }

	    if (!passwordEncoder.matches(passActual, usuario.getPassword())) {
	        return ResponseEntity.badRequest()
	                .body(Map.of("mensaje", "La contraseña actual es incorrecta."));
	    }

	    if (passwordEncoder.matches(passNueva, usuario.getPassword())) {
	        return ResponseEntity.badRequest()
	                .body(Map.of(
	                        "mensaje",
	                        "La nueva contraseña debe ser diferente a la actual."
	                ));
	    }

	    usuario.setPassword(passwordEncoder.encode(passNueva));
	    usuarioRepo.save(usuario);

	    return ResponseEntity.ok(
	            Map.of("mensaje", "Contraseña actualizada correctamente.")
	    );
	}

	// Subir foto
	@PostMapping(value = "/perfil/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<?> subirFotoPerfil(@RequestParam("file") MultipartFile file, Principal principal) {

		String username = principal.getName();
		Usuario u = usuarioRepo.findByUsername(username).orElse(null);
		if (u == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no encontrado.");
		}

		try {
			// borrar foto anterior si existe
			storageService.deleteIfExists(u.getFoto());

			String key = storageService.saveProfilePhoto(u.getIdUsuario(), u.getUsername(), file);
			u.setFoto(key);
			usuarioRepo.save(u);

			String url = storageService.publicUrl(key);
			return ResponseEntity.ok(Map.of("url", url));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(e.getMessage());
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("No se pudo subir la foto.");
		}
	}

	@GetMapping("/perfil/foto")
	public ResponseEntity<?> obtenerFotoPerfil(Principal principal) {
		String username = principal.getName();
		Usuario u = usuarioRepo.findByUsername(username).orElse(null);

		if (u == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no encontrado.");
		}

		String url = storageService.publicUrl(u.getFoto());
		if (url == null || url.isBlank()) {
			url = "/assets/iconos/sinFotoPerfil.png";
		}

		return ResponseEntity.ok(Map.of("url", url));
	}

	@DeleteMapping("/perfil/foto")
	public ResponseEntity<?> eliminarFotoPerfil(Principal principal) {
		String username = principal.getName();
		Usuario u = usuarioRepo.findByUsername(username).orElse(null);

		if (u != null && u.getFoto() != null) {
			storageService.deleteIfExists(u.getFoto());
			u.setFoto(null);
			usuarioRepo.save(u);
		}

		return ResponseEntity
				.ok(Map.of("message", "Foto eliminada correctamente", "url", "/assets/iconos/sinFotoPerfil.png"));
	}

}