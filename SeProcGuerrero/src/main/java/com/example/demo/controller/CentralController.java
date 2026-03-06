package com.example.demo.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.demo.modelo.Usuario;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.storage.StorageService;

@Controller
public class CentralController {

    private final UsuarioRepository usuarioRepo;
    private final StorageService storageService;

    public CentralController(UsuarioRepository usuarioRepo, StorageService storageService) {
        this.usuarioRepo = usuarioRepo;
        this.storageService = storageService;
    }

    @GetMapping("/central")
    public String central(
            Model model,
            Principal principal,
            @RequestParam(value = "view", required = false, defaultValue = "solicitudes") String view,
            @RequestHeader(value = "X-Requested-With", required = false) String requestedWith
    ) {

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

        List<Usuario> usuarios = List.of();

        switch (view) {
            case "usuarios-supervisores":
                usuarios = usuarioRepo.findByActivoTrueAndRol_NombreIgnoreCase("supervisor");
                break;
            case "usuarios-constructores":
                usuarios = usuarioRepo.findByActivoTrueAndRol_NombreIgnoreCase("contratista");
                break;
            case "usuarios-directores":
                usuarios = usuarioRepo.findByActivoTrueAndRol_NombreIgnoreCase("direccion");
                break;
            default:
                break;
        }

        model.addAttribute("usuarios", usuarios);

        boolean isAjax = "XMLHttpRequest".equalsIgnoreCase(requestedWith);
        if (isAjax && view != null && view.startsWith("usuarios-")) {
            return "central/_usuarios :: usuariosContent";
        }

        return "central/central";
    }
}