package com.example.demo.controller;

import java.security.Principal;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.dto.CambiarPasswordDto;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.service.PerfilService;
import com.example.demo.storage.StorageService;

@RestController
@RequestMapping("/api/constructor")
public class ConstructorController {

	private final UsuarioRepository usuarioRepo;
	private final StorageService storageService;
	private final PerfilService perfilService;

	public ConstructorController(UsuarioRepository usuarioRepo, 
			StorageService storageService, PerfilService perfilService) {
		this.usuarioRepo = usuarioRepo;
		this.storageService = storageService;
		this.perfilService = perfilService;
	}
	
    @GetMapping("/perfil")
    public ResponseEntity<?> obtenerPerfil(
            Principal principal) {

        var usuarioOpt = usuarioRepo.findByUsername(
                principal.getName());

        if (usuarioOpt.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "mensaje",
                            "Usuario no encontrado."));
        }

        var usuario = usuarioOpt.get();
        var institucion = usuario.getInstitucion();

        String rol = usuario.getRol() != null
                ? usuario.getRol().getNombre()
                : "";

        String fotoUrl = storageService.publicUrl(
                usuario.getFoto());

        String logoEmpresa = institucion != null
                ? storageService.publicLogoUrl(
                        institucion.getLogoUrl())
                : "";

        String abreviacion = institucion != null
                ? institucion.getAbreviacion()
                : "";

        var respuesta = new PerfilConstructorResponse(
                usuario.getIdUsuario(),
                usuario.getUsername(),
                usuario.getNombre(),
                rol,
                fotoUrl,
                logoEmpresa,
                abreviacion);

        return ResponseEntity.ok(respuesta);
    }
    
    @PostMapping("/perfil/password")
    public ResponseEntity<?> cambiarPassword(
            @RequestBody CambiarPasswordDto dto,
            Principal principal) {

        try {
            perfilService.cambiarPassword(
                    principal.getName(),
                    dto);

            return ResponseEntity.ok(Map.of(
                    "mensaje",
                    "Contraseña actualizada correctamente."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", e.getMessage()));
        }
    }
    
    @PostMapping(
            value = "/perfil/foto",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> subirFotoPerfil(
            @RequestParam("file") MultipartFile file,
            Principal principal) {

        var usuarioOpt = usuarioRepo.findByUsername(
                principal.getName());

        if (usuarioOpt.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "mensaje",
                            "Usuario no encontrado."));
        }

        var usuario = usuarioOpt.get();

        try {
            storageService.deleteIfExists(
                    usuario.getFoto());

            String key = storageService.saveProfilePhoto(
                    usuario.getIdUsuario(),
                    usuario.getUsername(),
                    file);

            usuario.setFoto(key);
            usuarioRepo.save(usuario);

            String url = storageService.publicUrl(key);

            return ResponseEntity.ok(Map.of(
                    "mensaje",
                    "Foto actualizada correctamente.",
                    "url",
                    url));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "mensaje",
                            "No se pudo subir la foto."));
        }
    }

    @DeleteMapping("/perfil/foto")
    public ResponseEntity<?> eliminarFotoPerfil(
            Principal principal) {

        try {
            perfilService.eliminarFotoPerfil(
                    principal.getName());

            return ResponseEntity.ok(Map.of(
                    "mensaje",
                    "Foto eliminada correctamente.",
                    "url",
                    "/assets/seproc/sinFotoPerfil.png"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", e.getMessage()));
        }
    }

    private record PerfilConstructorResponse(
            Long idUsuario,
            String username,
            String nombreUsuario,
            String rolUsuario,
            String fotoUrl,
            String logoEmpresa,
            String abreviacion) {
    	
    }

}