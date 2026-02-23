package com.example.demo.storage;

import java.io.IOException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LocalStorageService implements StorageService {

    @Value("${app.storage.base-path:uploads}")
    private String basePath;

    @Value("${app.storage.public-base-url:/uploads}")
    private String publicBaseUrl;

    private static final Set<String> ALLOWED = Set.of("image/png", "image/jpeg", "image/webp");

    @Override
    public String saveProfilePhoto(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Archivo vacío.");
        }
        if (!ALLOWED.contains(file.getContentType())) {
            throw new IllegalArgumentException("Formato no permitido. Usa PNG/JPG/WEBP.");
        }
        if (file.getSize() > 2 * 1024 * 1024) { // 2MB
            throw new IllegalArgumentException("Máximo 2MB.");
        }

        String ext = extension(file.getOriginalFilename());
        String filename = "profile_" + UUID.randomUUID() + (ext.isBlank() ? "" : "." + ext);

        // key (lo que guardas en BD)
        String key = "usuarios/" + userId + "/" + filename;

        Path target = Paths.get(basePath).resolve(key).normalize().toAbsolutePath();
        try {
            Files.createDirectories(target.getParent());
            // copia/replace
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return key;
        } catch (IOException e) {
            throw new RuntimeException("No se pudo guardar la imagen.", e);
        }
    }

    @Override
    public void deleteIfExists(String key) {
        if (key == null || key.isBlank()) return;
        try {
            Path p = Paths.get(basePath).resolve(key).normalize().toAbsolutePath();
            Files.deleteIfExists(p);
        } catch (IOException ignored) {}
    }

    @Override
    public String publicUrl(String key) {
        if (key == null || key.isBlank()) return null;
        // /uploads/usuarios/15/profile_xxx.jpg
        return publicBaseUrl + "/" + key.replace("\\", "/");
    }

    private String extension(String name) {
        if (name == null) return "";
        int idx = name.lastIndexOf('.');
        if (idx < 0) return "";
        return name.substring(idx + 1).toLowerCase();
    }
}