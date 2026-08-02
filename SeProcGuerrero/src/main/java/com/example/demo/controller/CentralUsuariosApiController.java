package com.example.demo.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.UsuarioUpsertDto;
import com.example.demo.modelo.Institucion;
import com.example.demo.modelo.Rol;
import com.example.demo.modelo.Usuario;
import com.example.demo.repository.RolRepository;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.service.SeguridadService;

@RestController
@RequestMapping("/api/central/usuarios")
public class CentralUsuariosApiController {

    private final UsuarioRepository usuarioRepo;
    private final RolRepository rolRepo;
    private final PasswordEncoder passwordEncoder;
    private final SeguridadService seguridadService;

    public CentralUsuariosApiController(
            UsuarioRepository usuarioRepo,
            RolRepository rolRepo,
            PasswordEncoder passwordEncoder,
            SeguridadService seguridadService) {

        this.usuarioRepo = usuarioRepo;
        this.rolRepo = rolRepo;
        this.passwordEncoder = passwordEncoder;
        this.seguridadService = seguridadService;
    }

    @GetMapping
    public ResponseEntity<?> listar(
            @RequestParam("view") String view) {

        Institucion institucion =
                seguridadService.getInstitucionActual();

        if (institucion == null) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "El usuario no tiene una institución asignada."
            );
        }

        String rolNombre = obtenerRolPorVista(view);

        if (rolNombre == null) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "Vista de usuarios no válida."
            );
        }

        List<Map<String, Object>> usuarios =
                usuarioRepo
                        .findByInstitucionAndActivoTrueAndRol_NombreIgnoreCase(
                                institucion,
                                rolNombre
                        )
                        .stream()
                        .map(this::convertirDto)
                        .toList();

        return ResponseEntity.ok(usuarios);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detalle(
            @PathVariable Long id) {

        Institucion institucion =
                seguridadService.getInstitucionActual();

        if (institucion == null) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "El usuario no tiene una institución asignada."
            );
        }

        Usuario usuario =
                usuarioRepo.findById(id).orElse(null);

        if (usuario == null
                || !perteneceAInstitucion(
                        usuario,
                        institucion)
                || !esRolAdministrable(usuario)) {

            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                convertirDto(usuario)
        );
    }

    @PostMapping("/crear")
    public ResponseEntity<?> crear(
            @RequestBody UsuarioUpsertDto dto) {

        Institucion institucion =
                seguridadService.getInstitucionActual();

        if (institucion == null) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "El usuario no tiene una institución asignada."
            );
        }

        String errorValidacion =
                validarDatos(dto, true);

        if (errorValidacion != null) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    errorValidacion
            );
        }

        String username = dto.getUsername().trim();
        String email = dto.getEmail().trim();
        String rolNombre = normalizar(dto.getRolNombre());

        if (!esRolAdministrable(rolNombre)) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "Central solo puede crear supervisor, "
                            + "contratista o direccion."
            );
        }

        if (usuarioRepo.existsByUsernameIgnoreCase(username)) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "Username ya existe."
            );
        }

        if (usuarioRepo.existsByEmailIgnoreCase(email)) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "Email ya existe."
            );
        }

        Rol rol = rolRepo
                .findByNombre(rolNombre)
                .orElse(null);

        if (rol == null) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "Rol no válido."
            );
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(dto.getNombre().trim());
        usuario.setApellido(dto.getApellido().trim());
        usuario.setUsername(username);
        usuario.setEmail(email);
        usuario.setPassword(
                passwordEncoder.encode(
                        dto.getPassword()
                )
        );
        usuario.setActivo(true);
        usuario.setRol(rol);
        usuario.setInstitucion(institucion);

        usuarioRepo.save(usuario);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(mensaje(
                        "Usuario creado correctamente."
                ));
    }

    @PostMapping("/{id}/actualizar")
    public ResponseEntity<?> actualizar(
            @PathVariable Long id,
            @RequestBody UsuarioUpsertDto dto) {

        Institucion institucion =
                seguridadService.getInstitucionActual();

        if (institucion == null) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "El usuario no tiene una institución asignada."
            );
        }

        Usuario usuario =
                usuarioRepo.findById(id).orElse(null);

        if (usuario == null
                || !perteneceAInstitucion(
                        usuario,
                        institucion)) {

            return ResponseEntity.notFound().build();
        }

        if (!esRolAdministrable(usuario)) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "Central no puede editar este tipo de usuario."
            );
        }

        String errorValidacion =
                validarDatos(dto, false);

        if (errorValidacion != null) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    errorValidacion
            );
        }

        String username = dto.getUsername().trim();
        String email = dto.getEmail().trim();

        String rolActual =
                usuario.getRol() != null
                        ? normalizar(
                                usuario.getRol().getNombre())
                        : "";

        String rolSolicitado =
                normalizar(dto.getRolNombre());

        if (!rolSolicitado.isBlank()
                && !rolSolicitado.equals(rolActual)) {

            return error(
                    HttpStatus.BAD_REQUEST,
                    "No se puede cambiar el rol del usuario "
                            + "desde esta sección."
            );
        }

        if (!username.equalsIgnoreCase(
                usuario.getUsername())
                && usuarioRepo
                .existsByUsernameIgnoreCase(username)) {

            return error(
                    HttpStatus.BAD_REQUEST,
                    "Username ya existe."
            );
        }

        if (!email.equalsIgnoreCase(
                usuario.getEmail())
                && usuarioRepo
                .existsByEmailIgnoreCase(email)) {

            return error(
                    HttpStatus.BAD_REQUEST,
                    "Email ya existe."
            );
        }

        usuario.setNombre(dto.getNombre().trim());
        usuario.setApellido(dto.getApellido().trim());
        usuario.setUsername(username);
        usuario.setEmail(email);

        if (dto.getPassword() != null
                && !dto.getPassword().isBlank()) {

            usuario.setPassword(
                    passwordEncoder.encode(
                            dto.getPassword()
                    )
            );
        }

        usuarioRepo.save(usuario);

        return ResponseEntity.ok(
                mensaje("Usuario actualizado correctamente.")
        );
    }

    @PostMapping("/{id}/eliminar")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {

        Institucion institucion =
                seguridadService.getInstitucionActual();

        if (institucion == null) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "El usuario no tiene una institución asignada."
            );
        }

        Usuario usuario =
                usuarioRepo.findById(id).orElse(null);

        if (usuario == null
                || !perteneceAInstitucion(usuario, institucion)) {

            return ResponseEntity.notFound().build();
        }

        if (!esRolAdministrable(usuario)) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "Central no puede eliminar este tipo de usuario."
            );
        }

        try {
            usuarioRepo.deleteById(id);

            return ResponseEntity.ok(
                    mensaje("Usuario eliminado correctamente.")
            );

        } catch (DataIntegrityViolationException ex) {
            return error(
                    HttpStatus.CONFLICT,
                    "No se puede eliminar el usuario porque tiene datos relacionados."
            );
        }
    }

    private Map<String, Object> convertirDto(
            Usuario usuario) {

        Map<String, Object> dto = new LinkedHashMap<>();

        dto.put("idUsuario", usuario.getIdUsuario());
        dto.put("nombre", texto(usuario.getNombre()));
        dto.put("apellido", texto(usuario.getApellido()));
        dto.put("username", texto(usuario.getUsername()));
        dto.put("email", texto(usuario.getEmail()));
        dto.put(
                "rolNombre",
                usuario.getRol() != null
                        ? texto(usuario.getRol().getNombre())
                        : ""
        );

        return dto;
    }

    private String validarDatos(
            UsuarioUpsertDto dto,
            boolean passwordObligatorio) {

        if (dto == null) {
            return "Los datos del usuario son obligatorios.";
        }

        if (dto.getNombre() == null
                || dto.getNombre().isBlank()) {
            return "Nombre obligatorio.";
        }

        if (dto.getApellido() == null
                || dto.getApellido().isBlank()) {
            return "Apellido obligatorio.";
        }

        if (dto.getUsername() == null
                || dto.getUsername().isBlank()) {
            return "Username obligatorio.";
        }

        if (dto.getEmail() == null
                || dto.getEmail().isBlank()) {
            return "Email obligatorio.";
        }

        if (!dto.getEmail().trim().matches(
                "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return "Email no válido.";
        }

        if (passwordObligatorio
                && (dto.getPassword() == null
                || dto.getPassword().isBlank())) {
            return "Password obligatorio.";
        }

        return null;
    }

    private String obtenerRolPorVista(String view) {
        if (view == null) {
            return null;
        }

        return switch (view.trim().toLowerCase()) {
            case "usuarios-supervisores" -> "supervisor";
            case "usuarios-constructores" -> "contratista";
            case "usuarios-directores" -> "direccion";
            default -> null;
        };
    }

    private boolean perteneceAInstitucion(
            Usuario usuario,
            Institucion institucion) {

        return usuario.getInstitucion() != null
                && Objects.equals(
                        usuario.getInstitucion()
                                .getIdInstitucion(),
                        institucion.getIdInstitucion()
                );
    }

    private boolean esRolAdministrable(
            Usuario usuario) {

        return usuario.getRol() != null
                && esRolAdministrable(
                        usuario.getRol().getNombre()
                );
    }

    private boolean esRolAdministrable(
            String rolNombre) {

        String rol = normalizar(rolNombre);

        return rol.equals("supervisor")
                || rol.equals("contratista")
                || rol.equals("direccion");
    }

    private ResponseEntity<Map<String, String>> error(
            HttpStatus status,
            String mensaje) {

        return ResponseEntity
                .status(status)
                .body(mensaje(mensaje));
    }

    private Map<String, String> mensaje(
            String mensaje) {

        return Map.of(
                "mensaje",
                texto(mensaje)
        );
    }

    private String normalizar(String valor) {
        return texto(valor).toLowerCase();
    }

    private String texto(String valor) {
        return valor == null ? "" : valor.trim();
    }
}