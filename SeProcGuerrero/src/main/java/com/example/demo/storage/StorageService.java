package com.example.demo.storage;

import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
	
    String saveProfilePhoto(Long userId, MultipartFile file); // retorna "key" (ruta relativa)
    void deleteIfExists(String key);
    String publicUrl(String key); // construye la URL pública

}
