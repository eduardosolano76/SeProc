package com.example.demo.controller;

import java.security.Principal;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.demo.modelo.Rol;
import com.example.demo.modelo.Usuario;
import com.example.demo.repository.RolRepository;
import com.example.demo.repository.UsuarioRepository;

@Controller
public class AdminController {

    private final UsuarioRepository usuarioRepo;
    private final RolRepository rolRepo;

    public AdminController(UsuarioRepository usuarioRepo, RolRepository rolRepo) {
        this.usuarioRepo = usuarioRepo;
        this.rolRepo = rolRepo;
    }

    @GetMapping("/admin")
    public String admin(Model model, Principal principal,
    		@RequestParam(value = "view", required = false, defaultValue = "proyectos") String view) {

        // username del que inició sesión
        String username = principal.getName();

        // traer usuario de BD
        var usuario = usuarioRepo.findByUsername(username).orElse(null);

        if (usuario != null) {
            String nombreCompleto = usuario.getNombre() /*+ " " + usuario.getApellido()*/;
            String rol = (usuario.getRol() != null) ? usuario.getRol().getNombre() : "sin rol";

            model.addAttribute("nombreUsuario", nombreCompleto);
            model.addAttribute("rolUsuario", rol);
        } else {
            model.addAttribute("nombreUsuario", username);
            model.addAttribute("rolUsuario", "sin rol");
        }
        
        // Pendientes para aprobar
        model.addAttribute("pendientes", usuarioRepo.findByActivoFalse());


        return "admin/admin";
    }
    
    // Aprobar
    @PostMapping("/admin/usuarios/{id}/aprobar")
    public String aprobarUsuario(@PathVariable Long id, @RequestParam String rolNombre) {

        Usuario u = usuarioRepo.findById(id).orElseThrow();
        Rol rol = rolRepo.findByNombre(rolNombre).orElseThrow();

        u.setRol(rol);
        u.setActivo(true);

        usuarioRepo.save(u);
        return "redirect:/admin?view=pendientes";
    }
    
    // Rechazar
    @PostMapping("/admin/usuarios/{id}/rechazar")
    public String rechazarUsuario(@PathVariable Long id) {

        Usuario u = usuarioRepo.findById(id).orElseThrow();

        // Solo seguridad: no dejes borrar al admin accidentalmente
        if ("admin".equalsIgnoreCase(u.getUsername())) {
            return "redirect:/admin?view=pendientes";
        }

        usuarioRepo.deleteById(id);
        return "redirect:/admin?view=pendientes";
    }
}
