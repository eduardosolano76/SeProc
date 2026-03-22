package com.example.demo.controller;

import java.security.Principal;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.modelo.Usuario;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.storage.StorageService;

@Controller
public class DireccionController {

    private final UsuarioRepository usuarioRepo;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;

    public DireccionController(UsuarioRepository usuarioRepo, StorageService storageService,
    		PasswordEncoder passwordEncoder) {
        this.usuarioRepo = usuarioRepo;
        this.storageService = storageService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/direccion")
    public String direccion(Model model, Principal principal,
    		@RequestParam(value = "view", required = false, defaultValue = "proyectos") String view) {

        String username = principal.getName();
        var usuario = usuarioRepo.findByUsername(username).orElse(null);

        if (usuario != null) {
            model.addAttribute("nombreUsuario", usuario.getNombre());
            String rol = (usuario.getRol() != null) ? usuario.getRol().getNombre() : "sin rol";
            model.addAttribute("rolUsuario", rol);
            model.addAttribute("fotoUrl", storageService.publicUrl(usuario.getFoto()));
        } else {
            model.addAttribute("nombreUsuario", username);
            model.addAttribute("rolUsuario", "sin rol");
            model.addAttribute("fotoUrl", null);
        }
        
        model.addAttribute("view", view);

        return "direccion/direccion";
    }
    
    @PostMapping("/direccion/perfil/password")
    @ResponseBody
    public ResponseEntity<?> cambiarPassword(@RequestBody Map<String, String> payload, Principal principal) {
        String username = principal.getName();
        Usuario usuario = usuarioRepo.findByUsername(username).orElse(null);

        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no encontrado.");
        }

        String passActual = payload.get("passActual");
        String passNueva = payload.get("passNueva");

        if (passActual == null || passActual.isBlank() || passNueva == null || passNueva.isBlank()) {
            return ResponseEntity.badRequest().body("Todos los campos son obligatorios.");
        }

        // Validar password actual
        if (!passwordEncoder.matches(passActual, usuario.getPassword())) {
            return ResponseEntity.badRequest().body("La contraseña actual es incorrecta.");
        }

        // Evitar guardar la misma contraseña
        if (passwordEncoder.matches(passNueva, usuario.getPassword())) {
            return ResponseEntity.badRequest().body("La nueva contraseña no puede ser igual a la actual.");
        }

        usuario.setPassword(passwordEncoder.encode(passNueva));
        usuarioRepo.save(usuario);

        return ResponseEntity.ok().build();
    }
    
    @PostMapping(value = "/direccion/perfil/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<?> subirFotoPerfil(@RequestParam("file") MultipartFile file, Principal principal) {

        String username = principal.getName();
        Usuario usuario = usuarioRepo.findByUsername(username).orElse(null);

        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no encontrado.");
        }

        try {
            storageService.deleteIfExists(usuario.getFoto());

            String key = storageService.saveProfilePhoto(usuario.getIdUsuario(), usuario.getUsername(), file);
            usuario.setFoto(key);
            usuarioRepo.save(usuario);

            String url = storageService.publicUrl(key);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("No se pudo subir la foto.");
        }
    }

    @GetMapping("/direccion/perfil/foto")
    @ResponseBody
    public ResponseEntity<?> obtenerFotoPerfil(Principal principal) {
        String username = principal.getName();
        Usuario usuario = usuarioRepo.findByUsername(username).orElse(null);

        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no encontrado.");
        }

        String url = storageService.publicUrl(usuario.getFoto());
        if (url == null || url.isBlank()) {
            url = "/assets/iconos/sinFotoPerfil.png";
        }

        return ResponseEntity.ok(Map.of("url", url));
    }
    
    // Eliminar foto de perfil
    @DeleteMapping("/direccion/perfil/foto")
    @ResponseBody
    public ResponseEntity<?> eliminarFotoPerfil(Principal principal) {
        String username = principal.getName();
        Usuario usuario = usuarioRepo.findByUsername(username).orElse(null);

        if (usuario != null && usuario.getFoto() != null) {
            storageService.deleteIfExists(usuario.getFoto());
            usuario.setFoto(null);
            usuarioRepo.save(usuario);
        }

        return ResponseEntity.ok(Map.of(
            "message", "Foto eliminada correctamente", 
            "url", "/assets/iconos/sinFotoPerfil.png"
        ));
    }

}