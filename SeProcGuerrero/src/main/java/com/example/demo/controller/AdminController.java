package com.example.demo.controller;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.dto.CambiarPasswordDto;
import com.example.demo.dto.UsuarioUpsertDto;
import com.example.demo.modelo.Usuario;
import com.example.demo.service.AdminService;
import com.example.demo.service.PerfilService;
import com.example.demo.service.UsuarioService;
import com.example.demo.storage.StorageService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

	// Inyección de dependencias a través del constructor
	private final AdminService adminService;
	private final UsuarioService usuarioService;
	private final PerfilService perfilService;
	private final StorageService storageService;

	// Constructor para inyectar las dependencias
	public AdminController(AdminService adminService, UsuarioService usuarioService, PerfilService perfilService,
			StorageService storageService) {
		this.adminService = adminService;
		this.usuarioService = usuarioService;
		this.perfilService = perfilService;
		this.storageService = storageService;
	}

    @GetMapping("/perfil")
    public ResponseEntity<?> obtenerPerfil(
            Principal principal) {

        Usuario usuario =
                perfilService.obtenerUsuarioPorUsername(
                        principal.getName());

        String fotoUrl =
                storageService.publicUrl(usuario.getFoto());

        if (fotoUrl == null || fotoUrl.isBlank()) {
            fotoUrl =
                    "/assets/iconos/sinFotoPerfil.png";
        }

        String logoEmpresa =
                "/assets/iconos/logo.jpg";

        String abreviacion = "";

        if (usuario.getInstitucion() != null) {
            abreviacion =
                    usuario.getInstitucion()
                            .getAbreviacion();

            String logoGuardado =
                    storageService.publicLogoUrl(
                            usuario.getInstitucion()
                                    .getLogoUrl());

            if (logoGuardado != null
                    && !logoGuardado.isBlank()) {
                logoEmpresa = logoGuardado;
            }
        }

        String rol =
                usuario.getRol() != null
                        ? usuario.getRol().getNombre()
                        : "sin rol";

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "idUsuario",
                usuario.getIdUsuario());

        response.put(
                "username",
                usuario.getUsername());

        response.put(
                "nombreUsuario",
                construirNombreCompleto(usuario));

        response.put("rolUsuario", rol);
        response.put("fotoUrl", fotoUrl);
        response.put("logoEmpresa", logoEmpresa);
        response.put("abreviacion", abreviacion);

        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/usuarios")
    public ResponseEntity<List<Map<String, Object>>>
            obtenerUsuarios(
                    @RequestParam String view) {

        List<Map<String, Object>> response =
                usuarioService
                        .listarUsuariosPorView(view)
                        .stream()
                        .map(this::convertirUsuario)
                        .toList();

        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/usuarios/pendientes")
    public ResponseEntity<List<Map<String, Object>>>
            obtenerPendientes() {

        List<Map<String, Object>> response =
                adminService.obtenerPendientes()
                        .stream()
                        .map(this::convertirUsuario)
                        .toList();

        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/usuarios/{id}")
    public ResponseEntity<?> obtenerUsuario(
            @PathVariable Long id) {

        Usuario usuario =
                usuarioService.obtenerPorId(id);

        return ResponseEntity.ok(
                convertirUsuario(usuario));
    }
    
    @PostMapping("/usuarios")
    public ResponseEntity<?> crearUsuario(
            @RequestBody UsuarioUpsertDto dto) {

        try {
            usuarioService.crearUsuario(dto);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(Map.of(
                            "mensaje",
                            "Usuario creado correctamente."));
        }
        catch (ResponseStatusException ex) {
            return crearError(ex);
        }
    }
    
    @PutMapping("/usuarios/{id}")
    public ResponseEntity<?> actualizarUsuario(
            @PathVariable Long id,
            @RequestBody UsuarioUpsertDto dto) {

        try {
            usuarioService.actualizarUsuario(id, dto);

            return ResponseEntity.ok(
                    Map.of(
                            "mensaje",
                            "Usuario actualizado correctamente."));
        }
        catch (ResponseStatusException ex) {
            return crearError(ex);
        }
    }

    @DeleteMapping("/usuarios/{id}")
    public ResponseEntity<?> eliminarUsuario(
            @PathVariable Long id,
            Principal principal) {

        try {
            usuarioService.eliminarUsuario(
                    id,
                    principal.getName());

            return ResponseEntity.ok(
                    Map.of(
                            "mensaje",
                            "Usuario eliminado correctamente."));
        }
        catch (ResponseStatusException ex) {
            return crearError(ex);
        }
        catch (DataIntegrityViolationException ex) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "mensaje",
                            "No se puede eliminar el usuario porque tiene datos relacionados."));
        }
    }
    
    @PostMapping("/usuarios/{id}/aprobar")
    public ResponseEntity<?> aprobarUsuario(
            @PathVariable Long id,
            @RequestParam String rolNombre) {

        adminService.aprobarUsuario(id, rolNombre);

        return ResponseEntity.ok(
                Map.of(
                        "mensaje",
                        "Usuario aprobado correctamente."));
    }
    
    @PostMapping("/usuarios/{id}/rechazar")
    public ResponseEntity<?> rechazarUsuario(
            @PathVariable Long id) {

        adminService.rechazarUsuario(id);

        return ResponseEntity.ok(
                Map.of(
                        "mensaje",
                        "Solicitud rechazada correctamente."));
    }
    
    @PostMapping(
            value = "/perfil/foto",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> subirFotoPerfil(
            @RequestParam("file") MultipartFile file,
            Principal principal) {

        Map<String, String> response =
                perfilService.subirFotoPerfil(
                        file,
                        principal.getName());

        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/perfil/foto")
    public ResponseEntity<?> eliminarFotoPerfil(
            Principal principal) {

        perfilService.eliminarFotoPerfil(
                principal.getName());

        return ResponseEntity.ok(
                Map.of(
                        "mensaje",
                        "Foto eliminada correctamente.",
                        "url",
                        "/assets/iconos/sinFotoPerfil.png"));
    }

    @PostMapping("/perfil/password")
    public ResponseEntity<?> cambiarPassword(
            @RequestBody CambiarPasswordDto dto,
            Principal principal) {

        perfilService.cambiarPassword(
                principal.getName(),
                dto);

        return ResponseEntity.ok(
                Map.of(
                        "mensaje",
                        "Contraseña actualizada correctamente."));
    }

    private Map<String, Object> convertirUsuario(
            Usuario usuario) {

        Map<String, Object> dto =
                new LinkedHashMap<>();

        dto.put(
                "idUsuario",
                usuario.getIdUsuario());

        dto.put(
                "nombre",
                texto(usuario.getNombre()));

        dto.put(
                "apellido",
                texto(usuario.getApellido()));

        dto.put(
                "username",
                texto(usuario.getUsername()));

        dto.put(
                "email",
                texto(usuario.getEmail()));

        dto.put(
                "rolNombre",
                usuario.getRol() != null
                        ? texto(usuario.getRol().getNombre())
                        : "");

        return dto;
    }

    private String construirNombreCompleto(
            Usuario usuario) {

        String nombre = texto(usuario.getNombre());
        String apellido = texto(usuario.getApellido());

        return (nombre + " " + apellido).trim();
    }

    private String texto(String valor) {
        return valor == null ? "" : valor;
    }

    private ResponseEntity<?> crearError(
            ResponseStatusException ex) {

        String mensaje =
                ex.getReason() != null
                        ? ex.getReason()
                        : "No fue posible completar la operación.";

        return ResponseEntity
                .status(ex.getStatusCode())
                .body(Map.of("mensaje", mensaje));
    }
}
