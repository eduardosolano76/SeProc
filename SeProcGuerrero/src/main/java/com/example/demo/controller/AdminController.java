package com.example.demo.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.dto.UsuarioUpsertDto;
import com.example.demo.modelo.Rol;
import com.example.demo.modelo.Usuario;
import com.example.demo.repository.RolRepository;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.storage.StorageService;

@Controller
public class AdminController {

    private final UsuarioRepository usuarioRepo;
    private final RolRepository rolRepo;
    
    private final PasswordEncoder passwordEncoder;
    
    private final StorageService storageService;

    public AdminController(UsuarioRepository usuarioRepo, RolRepository rolRepo, PasswordEncoder passwordEncoder,
    		StorageService storageService) {
        this.usuarioRepo = usuarioRepo;
        this.rolRepo = rolRepo;
        this.passwordEncoder = passwordEncoder;
        this.storageService = storageService;
    }

    @GetMapping("/admin")
    public String admin(Model model, Principal principal,
    		@RequestParam(value = "view", required = false, defaultValue = "proyectos") String view,
            @RequestHeader(value = "X-Requested-With", required = false) String requestedWith) {

        // username del que inició sesión
        String username = principal.getName();
        
        model.addAttribute("loggedUsername", username);

        // traer usuario de BD
        var usuario = usuarioRepo.findByUsername(username).orElse(null);

        if (usuario != null) {
            String nombreCompleto = usuario.getNombre() /*+ " " + usuario.getApellido()*/;
            String rol = (usuario.getRol() != null) ? usuario.getRol().getNombre() : "sin rol";
            
            String fotoUrl = storageService.publicUrl(usuario.getFoto());
            if (fotoUrl == null || fotoUrl.isBlank()) {
                fotoUrl = "/assets/iconos/sinFotoPerfil.png";
            }
            model.addAttribute("fotoUrl", fotoUrl);

            model.addAttribute("nombreUsuario", nombreCompleto);
            model.addAttribute("rolUsuario", rol);
        } else {
            model.addAttribute("nombreUsuario", username);
            model.addAttribute("rolUsuario", "sin rol");
        }
        
        // Pendientes para aprobar
        model.addAttribute("pendientes", usuarioRepo.findByActivoFalse());

        // View actual para que el HTML sepa qué mostrar
        model.addAttribute("view", view);

        // Lista de usuarios para la vista de usuarios (por rol)
        List<Usuario> usuarios = List.of();
        
        switch (view) {
        case "usuarios-supervisores":
            usuarios = usuarioRepo.findByActivoTrueAndRol_NombreIgnoreCase("supervisor");
            break;
        case "usuarios-constructores":
            usuarios = usuarioRepo.findByActivoTrueAndRol_NombreIgnoreCase("contratista"); // o "constructor" según tu BD
            break;
        case "usuarios-directores":
            usuarios = usuarioRepo.findByActivoTrueAndRol_NombreIgnoreCase("direccion");
            break;
        case "usuarios-central":
            usuarios = usuarioRepo.findByActivoTrueAndRol_NombreIgnoreCase("central");
            break;
        case "usuarios-administrador":
            usuarios = usuarioRepo.findByActivoTrueAndRol_NombreIgnoreCase("administrador");
            break;
        default:
            // proyectos / pendientes / etc.
            break;
    }
        model.addAttribute("usuarios", usuarios);
        
        boolean isAjax = "XMLHttpRequest".equalsIgnoreCase(requestedWith);
        if (isAjax && view != null && view.startsWith("usuarios-")) {
            return "admin/_usuarios :: usuariosContent";
        }
        
        model.addAttribute("proyectos", List.of()); // temporal mientras se conecta la BD
        
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
    
    // Endpoint para traer un usuario por ID (JSON)
    @GetMapping("/admin/usuarios/{id}")
    @ResponseBody
    public ResponseEntity<Usuario> verUsuario(@PathVariable Long id) {
        Usuario u = usuarioRepo.findById(id).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();

        // Nota: Como Usuario tiene rol ManyToOne EAGER, vendrá rol también.
        return ResponseEntity.ok(u);
    }
    
    // Actualizar
    @PostMapping("/admin/usuarios/{id}/actualizar")
    @ResponseBody
    public ResponseEntity<?> actualizarUsuario(@PathVariable Long id, @RequestBody UsuarioUpsertDto dto) {
        Usuario u = usuarioRepo.findById(id).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();

        // No tocar admin por seguridad
        if ("admin".equalsIgnoreCase(u.getUsername())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No se puede editar el admin.");
        }

        // Validaciones simples
        if (dto.getUsername() != null && !dto.getUsername().equalsIgnoreCase(u.getUsername())
                && usuarioRepo.existsByUsername(dto.getUsername())) {
            return ResponseEntity.badRequest().body("Username ya existe.");
        }

        if (dto.getEmail() != null && !dto.getEmail().equalsIgnoreCase(u.getEmail())
                && usuarioRepo.existsByEmail(dto.getEmail())) {
            return ResponseEntity.badRequest().body("Email ya existe.");
        }

        u.setNombre(dto.getNombre());
        u.setApellido(dto.getApellido());
        u.setUsername(dto.getUsername());
        u.setEmail(dto.getEmail());

        // Si quieres permitir cambiar password desde modal
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            u.setPassword(passwordEncoder.encode(dto.getPassword()));
        }

        // Si quieres permitir cambiar rol desde modal
        if (dto.getRolNombre() != null && !dto.getRolNombre().isBlank()) {
            Rol rol = rolRepo.findByNombre(dto.getRolNombre()).orElse(null);
            if (rol == null) return ResponseEntity.badRequest().body("Rol no válido.");
            u.setRol(rol);
        }

        usuarioRepo.save(u);
        return ResponseEntity.ok().build();
    }
    
    // Eliminar
    @PostMapping("/admin/usuarios/{id}/eliminar")
    @ResponseBody
    public ResponseEntity<?> eliminarUsuario(@PathVariable Long id, Principal principal) {
        Usuario u = usuarioRepo.findById(id).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();

        // username del que está logueado
        String loggedUsername = principal.getName();

        // NO permitir auto-eliminación (aplica para admin y para cualquier rol)
        if (u.getUsername() != null && u.getUsername().equalsIgnoreCase(loggedUsername)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("No puedes eliminar tu propio usuario mientras estás logueado.");
        }

        usuarioRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }
    
    // Crear
    @PostMapping("/admin/usuarios/crear")
    @ResponseBody
    public ResponseEntity<?> crearUsuario(@RequestBody UsuarioUpsertDto dto) {

        if (dto.getPassword() == null || dto.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Password es obligatorio.");
        }
        if (usuarioRepo.existsByUsername(dto.getUsername())) {
            return ResponseEntity.badRequest().body("Username ya existe.");
        }
        if (usuarioRepo.existsByEmail(dto.getEmail())) {
            return ResponseEntity.badRequest().body("Email ya existe.");
        }

        Usuario u = new Usuario();
        u.setNombre(dto.getNombre());
        u.setApellido(dto.getApellido());
        u.setUsername(dto.getUsername());
        u.setEmail(dto.getEmail());
        u.setPassword(passwordEncoder.encode(dto.getPassword()));
        u.setActivo(true);

        if (dto.getRolNombre() != null && !dto.getRolNombre().isBlank()) {
            Rol rol = rolRepo.findByNombre(dto.getRolNombre()).orElse(null);
            if (rol == null) return ResponseEntity.badRequest().body("Rol no válido.");
            u.setRol(rol);
        }

        usuarioRepo.save(u);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
    
    @PostMapping(value = "/perfil/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<?> subirFotoPerfil(@RequestParam("file") MultipartFile file, Principal principal) {

        String username = principal.getName();
        Usuario u = usuarioRepo.findByUsername(username).orElse(null);
        if (u == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        // (opcional) borrar anterior
        storageService.deleteIfExists(u.getFoto());

        String key = storageService.saveProfilePhoto(u.getIdUsuario(), u.getUsername(), file);
        u.setFoto(key);
        usuarioRepo.save(u);

        String url = storageService.publicUrl(key);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/perfil/foto")
    @ResponseBody
    public ResponseEntity<?> obtenerFotoPerfil(Principal principal) {
        String username = principal.getName();
        Usuario u = usuarioRepo.findByUsername(username).orElse(null);
        if (u == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String url = storageService.publicUrl(u.getFoto());
        return ResponseEntity.ok(Map.of("url", url));
    }
}
