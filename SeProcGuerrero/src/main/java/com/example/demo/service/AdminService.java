package com.example.demo.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.modelo.Rol;
import com.example.demo.modelo.Usuario;
import com.example.demo.repository.RolRepository;
import com.example.demo.repository.UsuarioRepository;

@Service
public class AdminService {
	
	// Inyección de dependencias a través del constructor
    private final UsuarioRepository usuarioRepo;
    private final RolRepository rolRepo;
    
    // Constructor para inyectar las dependencias
    public AdminService(UsuarioRepository usuarioRepo, RolRepository rolRepo) {
        this.usuarioRepo = usuarioRepo;
        this.rolRepo = rolRepo;
    }
    
    // Método para obtener la lista de usuarios pendientes de aprobación (activos = false)
    public List<Usuario> obtenerPendientes() {
        return usuarioRepo.findByActivoFalse();
    }
    
    // Método para aprobar un usuario, asignándole un rol y activándolo
    public void aprobarUsuario(Long id, String rolNombre) {
        Usuario usuario = usuarioRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado."));

        Rol rol = rolRepo.findByNombre(rolNombre)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rol no válido."));

        usuario.setRol(rol);
        usuario.setActivo(true);

        usuarioRepo.save(usuario);
    }
    
    // Método para rechazar un usuario, eliminándolo de la base de datos, con una validación para no eliminar al admin
    public void rechazarUsuario(Long id) {
        Usuario usuario = usuarioRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado."));

        if ("admin".equalsIgnoreCase(usuario.getUsername())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No se puede rechazar al admin.");
        }

        usuarioRepo.deleteById(id);
    }
}
