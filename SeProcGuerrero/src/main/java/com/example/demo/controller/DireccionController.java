package com.example.demo.controller;

import java.security.Principal;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.example.demo.repository.UsuarioRepository;
import com.example.demo.storage.StorageService;

@Controller
public class DireccionController {

    private final UsuarioRepository usuarioRepo;
    private final StorageService storageService;

    public DireccionController(UsuarioRepository usuarioRepo, StorageService storageService) {
        this.usuarioRepo = usuarioRepo;
        this.storageService = storageService;
    }

    @GetMapping("/direccion")
    public String direccion(Model model, Principal principal) {

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

        return "direccion/direccion";
    }
}