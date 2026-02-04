package com.example.demo.modelo;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long idUsuario;

    @Column(name = "id_roles")
    private Integer idRoles; // por ahora simple (sin relación)

    @Column(name = "nombre", nullable = false, length = 250)
    private String nombre;

    @Column(name = "apellido", nullable = false, length = 250)
    private String apellido;

    @Column(name = "password", nullable = false, length = 100)
    private String password;

    @Column(name = "username", length = 50)
    private String username;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "tipo", nullable = false)
    private String tipo; // central/contratista/supervisor/direccion

    @Column(name = "fechaRegistro")
    private LocalDate fechaRegistro;
}
