package com.example.demo.controller;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

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

import com.example.demo.modelo.Institucion;
import com.example.demo.modelo.Usuario;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.storage.StorageService;

@RestController
@RequestMapping("/api/central/perfil")
public class CentralController {

	private static final String FOTO_PREDETERMINADA = "/assets/seproc/sinFotoPerfil.png";

	private static final Set<String> TIPOS_IMAGEN_PERMITIDOS = Set.of("image/png", "image/jpeg", "image/webp");

	private final UsuarioRepository usuarioRepo;
	private final StorageService storageService;
	private final PasswordEncoder passwordEncoder;

	public CentralController(
            UsuarioRepository usuarioRepo,
            StorageService storageService,
            PasswordEncoder passwordEncoder) {

        this.usuarioRepo = usuarioRepo;
        this.storageService = storageService;
        this.passwordEncoder = passwordEncoder;
    }

	@GetMapping
	public ResponseEntity<?> obtenerPerfil(Principal principal) {
		Usuario usuario = obtenerUsuarioActual(principal);

		if (usuario == null) {
			return error(HttpStatus.UNAUTHORIZED, "Usuario no encontrado.");
		}

		Institucion institucion = usuario.getInstitucion();

		String nombreUsuario = texto(usuario.getNombre());

		String rol = usuario.getRol() != null ? texto(usuario.getRol().getNombre()) : "central";

		String fotoUrl = "";

		if (usuario.getFoto() != null && !usuario.getFoto().isBlank()) {

			fotoUrl = texto(storageService.publicUrl(usuario.getFoto()));
		}

		String logoEmpresa = "";
		String abreviacion = "SEPROC";

		if (institucion != null) {
			abreviacion = texto(institucion.getAbreviacion());

			if (abreviacion.isBlank()) {
				abreviacion = "SEPROC";
			}

			if (institucion.getLogoUrl() != null && !institucion.getLogoUrl().isBlank()) {

				logoEmpresa = texto(storageService.publicLogoUrl(institucion.getLogoUrl()));
			}
		}

		Map<String, Object> respuesta = new LinkedHashMap<>();
		respuesta.put("idUsuario", usuario.getIdUsuario());
		respuesta.put("username", texto(usuario.getUsername()));
		respuesta.put("nombreUsuario", nombreUsuario);
		respuesta.put("rolUsuario", rol);
		respuesta.put("email", texto(usuario.getEmail()));
		respuesta.put("fotoUrl", fotoUrl);
		respuesta.put("logoEmpresa", logoEmpresa);
		respuesta.put("abreviacion", abreviacion);

		return ResponseEntity.ok(respuesta);
	}

	@PostMapping("/password")
	public ResponseEntity<?> cambiarPassword(@RequestBody Map<String, String> payload, Principal principal) {

		Usuario usuario = obtenerUsuarioActual(principal);

		if (usuario == null) {
			return error(HttpStatus.UNAUTHORIZED, "Usuario no encontrado.");
		}

		if (payload == null) {
			return error(HttpStatus.BAD_REQUEST, "Todos los campos son obligatorios.");
		}

		String passActual = texto(payload.get("passActual"));
		String passNueva = texto(payload.get("passNueva"));
		String passRepetida = texto(payload.get("passRepetida"));

		if (passActual.isBlank() || passNueva.isBlank() || passRepetida.isBlank()) {

			return error(HttpStatus.BAD_REQUEST, "Todos los campos son obligatorios.");
		}

		if (!passNueva.equals(passRepetida)) {
			return error(HttpStatus.BAD_REQUEST, "Las contraseñas nuevas no coinciden.");
		}

		if (!passNueva.matches("^(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$")) {

			return error(HttpStatus.BAD_REQUEST,
					"La contraseña debe tener al menos 8 caracteres, " + "un número y un carácter especial.");
		}

		if (!passwordEncoder.matches(passActual, usuario.getPassword())) {

			return error(HttpStatus.BAD_REQUEST, "La contraseña actual es incorrecta.");
		}

		if (passwordEncoder.matches(passNueva, usuario.getPassword())) {

			return error(HttpStatus.BAD_REQUEST, "La nueva contraseña no puede ser igual a la actual.");
		}

		usuario.setPassword(passwordEncoder.encode(passNueva));

		usuarioRepo.save(usuario);

		return ResponseEntity.ok(mensaje("Contraseña actualizada correctamente."));
	}

	@PostMapping(value = "/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<?> subirFotoPerfil(@RequestParam("file") MultipartFile file, Principal principal) {

		Usuario usuario = obtenerUsuarioActual(principal);

		if (usuario == null) {
			return error(HttpStatus.UNAUTHORIZED, "Usuario no encontrado.");
		}

		if (file == null || file.isEmpty()) {
			return error(HttpStatus.BAD_REQUEST, "Selecciona una imagen.");
		}

		if (!TIPOS_IMAGEN_PERMITIDOS.contains(file.getContentType())) {

			return error(HttpStatus.BAD_REQUEST, "Solo se permiten imágenes PNG, JPG o WEBP.");
		}

		String fotoAnterior = usuario.getFoto();
		String nuevaFoto = null;
		boolean guardadaEnUsuario = false;

		try {
			nuevaFoto = storageService.saveProfilePhoto(usuario.getIdUsuario(), usuario.getUsername(), file);

			usuario.setFoto(nuevaFoto);
			usuarioRepo.save(usuario);
			guardadaEnUsuario = true;

			if (fotoAnterior != null && !fotoAnterior.isBlank() && !fotoAnterior.equals(nuevaFoto)) {

				try {
					storageService.deleteIfExists(fotoAnterior);
				} catch (Exception ignored) {
					// La nueva foto ya quedó guardada.
				}
			}

			Map<String, Object> respuesta = new LinkedHashMap<>();

			respuesta.put("mensaje", "Foto actualizada correctamente.");

			respuesta.put("url", texto(storageService.publicUrl(nuevaFoto)));

			return ResponseEntity.ok(respuesta);

		} catch (IllegalArgumentException e) {
			limpiarNuevaFoto(nuevaFoto, guardadaEnUsuario);

			return error(HttpStatus.BAD_REQUEST, e.getMessage());

		} catch (Exception e) {
			limpiarNuevaFoto(nuevaFoto, guardadaEnUsuario);

			return error(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo subir la foto.");
		}
	}

	@GetMapping("/foto")
	public ResponseEntity<?> obtenerFotoPerfil(Principal principal) {

		Usuario usuario = obtenerUsuarioActual(principal);

		if (usuario == null) {
			return error(HttpStatus.UNAUTHORIZED, "Usuario no encontrado.");
		}

		String url = "";

		if (usuario.getFoto() != null && !usuario.getFoto().isBlank()) {

			url = texto(storageService.publicUrl(usuario.getFoto()));
		}

		if (url.isBlank()) {
			url = FOTO_PREDETERMINADA;
		}

		return ResponseEntity.ok(Map.of("url", url));
	}

	@DeleteMapping("/foto")
	public ResponseEntity<?> eliminarFotoPerfil(Principal principal) {

		Usuario usuario = obtenerUsuarioActual(principal);

		if (usuario == null) {
			return error(HttpStatus.UNAUTHORIZED, "Usuario no encontrado.");
		}

		String fotoActual = usuario.getFoto();

		usuario.setFoto(null);
		usuarioRepo.save(usuario);

		if (fotoActual != null && !fotoActual.isBlank()) {
			try {
				storageService.deleteIfExists(fotoActual);
			} catch (Exception ignored) {
				// La referencia ya fue eliminada del usuario.
			}
		}

		Map<String, Object> respuesta = new LinkedHashMap<>();

		respuesta.put("mensaje", "Foto eliminada correctamente.");

		respuesta.put("url", FOTO_PREDETERMINADA);

		return ResponseEntity.ok(respuesta);
	}

	private Usuario obtenerUsuarioActual(Principal principal) {

		if (principal == null || principal.getName() == null) {
			return null;
		}

		return usuarioRepo.findByUsername(principal.getName()).orElse(null);
	}

	private void limpiarNuevaFoto(String nuevaFoto, boolean guardadaEnUsuario) {

		if (!guardadaEnUsuario && nuevaFoto != null && !nuevaFoto.isBlank()) {

			try {
				storageService.deleteIfExists(nuevaFoto);
			} catch (Exception ignored) {
			}
		}
	}

	private ResponseEntity<Map<String, String>> error(HttpStatus estado, String mensaje) {

		return ResponseEntity.status(estado).body(mensaje(mensaje));
	}

	private Map<String, String> mensaje(String mensaje) {
		return Map.of("mensaje", texto(mensaje));
	}


	private String texto(String valor) {
		return valor == null ? "" : valor.trim();
	}

}