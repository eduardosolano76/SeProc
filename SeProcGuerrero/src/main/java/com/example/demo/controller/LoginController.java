package com.example.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.repository.InstitucionRepository;
import com.example.demo.storage.StorageService;

@RestController
@RequestMapping("/api/seproc/instituciones")
public class LoginController {

	private final InstitucionRepository institucionRepo;
	private final StorageService storageService;

	public LoginController(InstitucionRepository institucionRepo, StorageService storageService) {
		this.institucionRepo = institucionRepo;
		this.storageService = storageService;
	}

	@GetMapping("/{abreviacion}")
	public ResponseEntity<InstitucionLoginResponse> obtenerPorAbreviacion(@PathVariable String abreviacion) {

		return institucionRepo.findByAbreviacionIgnoreCase(abreviacion).filter(inst -> inst.getActiva() != 0)
				.map(inst -> ResponseEntity.ok(new InstitucionLoginResponse(inst.getNombreOficial(),
						inst.getAbreviacion(), storageService.publicLogoUrl(inst.getLogoUrl()))))
				.orElseGet(() -> ResponseEntity.notFound().build());
	}

	public record InstitucionLoginResponse(String nombreOficial, String abreviacion, String logoUrl) {
	}
}
