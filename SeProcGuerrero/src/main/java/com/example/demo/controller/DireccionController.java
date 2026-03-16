package com.example.demo.controller;

import java.security.Principal;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

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
}