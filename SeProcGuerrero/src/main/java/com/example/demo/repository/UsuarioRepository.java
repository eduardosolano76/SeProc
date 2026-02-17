package com.example.demo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.modelo.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
    
    List<Usuario> findByActivoFalse();
    
    // Aprobados por rol (nombre del rol)
    List<Usuario> findByActivoTrueAndRol_NombreIgnoreCase(String nombre);
    
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
