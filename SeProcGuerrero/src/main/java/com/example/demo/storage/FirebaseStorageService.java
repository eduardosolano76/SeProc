package com.example.demo.storage;

import java.io.IOException;
import java.net.URL;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.Bucket;
import com.google.firebase.cloud.StorageClient;

@Service
@Primary
public class FirebaseStorageService implements StorageService {

    private static final Set<String> ALLOWED = Set.of("image/png", "image/jpeg", "image/webp");
    
    // Añade esta constante al inicio de tu clase
    private static final Set<String> ALLOWED_PDF = Set.of("application/pdf");

    @Override
    public String saveProfilePhoto(Long userId, String username, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Archivo vacío.");
        }
        if (!ALLOWED.contains(file.getContentType())) {
            throw new IllegalArgumentException("Formato no permitido. Usa PNG/JPG/WEBP.");
        }
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new IllegalArgumentException("Máximo 2MB.");
        }

        String ext = extension(file.getOriginalFilename());
        String safeUsername = sanitize(username);

        String folder = "usuarios/" + userId + "_" + safeUsername;
        String filename = folder + "/profile_" + UUID.randomUUID() + (ext.isBlank() ? "" : "." + ext);

        try {
            Bucket bucket = StorageClient.getInstance().bucket();
            bucket.create(filename, file.getInputStream(), file.getContentType());
            return filename;
        } catch (IOException e) {
            throw new RuntimeException("Error al subir imagen a Firebase", e);
        }
    }

    @Override
    public void deleteIfExists(String key) {
        if (key == null || key.isBlank()) return;

        try {
            Bucket bucket = StorageClient.getInstance().bucket();
            Blob blob = bucket.get(key);
            if (blob != null) {
                blob.delete();
            }
        } catch (Exception e) {
            System.err.println("No se pudo eliminar el archivo anterior: " + e.getMessage());
        }
    }

    @Override
    public String publicUrl(String key) {
        if (key == null || key.isBlank()) return null;

        Bucket bucket = StorageClient.getInstance().bucket();
        Blob blob = bucket.get(key);

        if (blob == null) {
            return null;
        }

        URL signedUrl = blob.signUrl(3650, TimeUnit.DAYS);
        return signedUrl.toString();
    }

    private String extension(String name) {
        if (name == null) return "";
        int idx = name.lastIndexOf('.');
        if (idx < 0) return "";
        return name.substring(idx + 1).toLowerCase();
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) return "sin_usuario";
        return value.trim()
                .toLowerCase()
                .replaceAll("[^a-z0-9_-]", "_");
    }
    
    @Override
    public String saveReportePdf(Long userId, String username, Integer idProyecto, String etapa, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Archivo vacío.");
        }
        if (!ALLOWED_PDF.contains(file.getContentType())) {
            throw new IllegalArgumentException("Formato no permitido. Solo se aceptan archivos PDF.");
        }
        if (file.getSize() > 5 * 1024 * 1024) { // Límite de 5MB para PDFs
            throw new IllegalArgumentException("El PDF no debe superar los 5MB.");
        }

        String safeUsername = sanitize(username);
        // Estructura: usuarios/1_juan/proyectos/15/cimentacion/reporte_abc123.pdf
        String folder = "usuarios/" + userId + "_" + safeUsername + "/proyectos/" + idProyecto + "/" + etapa;
        String filename = folder + "/reporte_" + UUID.randomUUID() + ".pdf";

        try {
            Bucket bucket = StorageClient.getInstance().bucket();
            bucket.create(filename, file.getInputStream(), file.getContentType());
            return filename;
        } catch (IOException e) {
            throw new RuntimeException("Error al subir el reporte a Firebase", e);
        }
    }
}