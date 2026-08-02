package com.example.demo.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.modelo.Usuario;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.storage.StorageService;

@RestController
@RequestMapping("/api/direccion")
public class DireccionController {

    private final UsuarioRepository usuarioRepo;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;

    public DireccionController(
            UsuarioRepository usuarioRepo,
            StorageService storageService,
            PasswordEncoder passwordEncoder) {

        this.usuarioRepo = usuarioRepo;
        this.storageService = storageService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/perfil")
    public ResponseEntity<?> obtenerPerfil(Authentication auth) {

        Usuario usuario = obtenerUsuario(auth);

        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("nombreUsuario", usuario.getNombre());
        respuesta.put("rolUsuario", "DIRECCION");
        respuesta.put(
                "fotoUrl",
                resolverFotoUrl(usuario.getFoto())
        );

        if (usuario.getInstitucion() != null) {
            respuesta.put(
                    "logoEmpresa",
                    storageService.publicLogoUrl(
                            usuario.getInstitucion().getLogoUrl()
                    )
            );

            /*
             * Cambia getAbreviacion() si en tu entidad
             * el atributo se llama siglas, clave o de otra manera.
             */
            respuesta.put(
                    "abreviacion",
                    usuario.getInstitucion().getAbreviacion()
            );
        } else {
            respuesta.put("logoEmpresa", "");
            respuesta.put("abreviacion", "");
        }

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/perfil/password")
    public ResponseEntity<?> cambiarPassword(
            @RequestBody Map<String, String> body,
            Authentication auth) {

        Usuario usuario = obtenerUsuario(auth);

        String actual = body.get("actual");
        String nueva = body.get("nueva");
        String repetida = body.get("repetida");

        if (actual == null || nueva == null || repetida == null
                || actual.isBlank()
                || nueva.isBlank()
                || repetida.isBlank()) {

            return error(
                    HttpStatus.BAD_REQUEST,
                    "Todos los campos son obligatorios."
            );
        }

        if (!passwordEncoder.matches(actual, usuario.getPassword())) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "La contraseña actual es incorrecta."
            );
        }

        if (!nueva.equals(repetida)) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "Las contraseñas nuevas no coinciden."
            );
        }

        if (!nueva.matches(
                "^(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$"
        )) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "La contraseña debe tener al menos 8 caracteres, "
                            + "un número y un carácter especial."
            );
        }

        if (passwordEncoder.matches(nueva, usuario.getPassword())) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "La contraseña nueva debe ser diferente a la actual."
            );
        }

        usuario.setPassword(
                passwordEncoder.encode(nueva)
        );

        usuarioRepo.save(usuario);

        return ResponseEntity.ok(
                Map.of(
                        "mensaje",
                        "Contraseña actualizada correctamente."
                )
        );
    }

    @PostMapping(
            value = "/perfil/foto",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> subirFoto(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {

        Usuario usuario = obtenerUsuario(auth);

        String fotoAnterior = usuario.getFoto();
        String nuevaClave = null;

        try {
            nuevaClave = storageService.saveProfilePhoto(
                    usuario.getIdUsuario(),
                    usuario.getUsername(),
                    file
            );

            String nuevaUrl = storageService.publicUrl(nuevaClave);

            if (nuevaUrl == null) {
                throw new IllegalStateException(
                        "No se pudo generar la URL de la imagen."
                );
            }

            usuario.setFoto(nuevaClave);
            usuarioRepo.save(usuario);

            if (esClaveFirebase(fotoAnterior)) {
                storageService.deleteIfExists(fotoAnterior);
            }

            return ResponseEntity.ok(
                    Map.of(
                            "url", nuevaUrl,
                            "mensaje", "Foto actualizada correctamente."
                    )
            );

        } catch (IllegalArgumentException e) {

            if (nuevaClave != null) {
                storageService.deleteIfExists(nuevaClave);
            }

            usuario.setFoto(fotoAnterior);

            return error(
                    HttpStatus.BAD_REQUEST,
                    e.getMessage()
            );

        } catch (Exception e) {

            if (nuevaClave != null) {
                storageService.deleteIfExists(nuevaClave);
            }

            usuario.setFoto(fotoAnterior);

            return error(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo actualizar la foto de perfil."
            );
        }
    }

    @DeleteMapping("/perfil/foto")
    public ResponseEntity<?> eliminarFoto(
            Authentication auth) {

        Usuario usuario = obtenerUsuario(auth);
        String fotoAnterior = usuario.getFoto();

        if (fotoAnterior == null || fotoAnterior.isBlank()) {
            return ResponseEntity.ok(
                    Map.of(
                            "url", "",
                            "mensaje", "El usuario no tiene foto de perfil."
                    )
            );
        }

        try {
            /*
             * Primero se limpia la base de datos.
             */
            usuario.setFoto(null);
            usuarioRepo.save(usuario);

            /*
             * Después se elimina el archivo de Firebase.
             */
            if (esClaveFirebase(fotoAnterior)) {
                storageService.deleteIfExists(fotoAnterior);
            }

            return ResponseEntity.ok(
                    Map.of(
                            "url", "",
                            "mensaje", "Foto eliminada correctamente."
                    )
            );

        } catch (Exception e) {

            usuario.setFoto(fotoAnterior);

            return error(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo eliminar la foto de perfil."
            );
        }
    }

    private Usuario obtenerUsuario(Authentication auth) {
        return usuarioRepo
                .findByUsername(auth.getName())
                .orElseThrow(
                        () -> new IllegalStateException(
                                "No se encontró el usuario autenticado."
                        )
                );
    }

    private ResponseEntity<?> error(
            HttpStatus estado,
            String mensaje) {

        return ResponseEntity
                .status(estado)
                .body(Map.of("mensaje", mensaje));
    }
    
    private String resolverFotoUrl(String key) {

        if (key == null || key.isBlank()) {
            return "";
        }

        /*
         * Compatibilidad con imágenes locales o URLs antiguas.
         */
        if (key.startsWith("/assets/")
                || key.startsWith("http://")
                || key.startsWith("https://")
                || key.startsWith("data:")
                || key.startsWith("blob:")) {

            return key;
        }

        String url = storageService.publicUrl(key);

        return url != null ? url : "";
    }

    private boolean esClaveFirebase(String key) {

        return key != null
                && !key.isBlank()
                && !key.startsWith("/assets/")
                && !key.startsWith("http://")
                && !key.startsWith("https://")
                && !key.startsWith("data:")
                && !key.startsWith("blob:");
    }
}