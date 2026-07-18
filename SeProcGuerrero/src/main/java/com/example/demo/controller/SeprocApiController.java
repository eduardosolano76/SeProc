package com.example.demo.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.SolicitudInstitucionDto;
import com.example.demo.modelo.SolicitudInstitucion;
import com.example.demo.repository.InstitucionRepository;
import com.example.demo.repository.SolicitudInstitucionRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/seproc")
public class SeprocApiController {

    @Autowired
    private SolicitudInstitucionRepository solicitudRepository;
    @Autowired
    private InstitucionRepository institucionRepo;
    
    public SeprocApiController(
            SolicitudInstitucionRepository solicitudRepository,
            InstitucionRepository institucionRepo) {

        this.solicitudRepository = solicitudRepository;
        this.institucionRepo = institucionRepo;
    }

    @GetMapping("/instituciones")
    public Object obtenerInstituciones() {
        return institucionRepo.findByActiva(1);
    }

    @PostMapping("/solicitudes")
    @Transactional
    public ResponseEntity<Map<String, Object>> guardarSolicitud(
            @Valid @RequestBody SolicitudInstitucionDto dto,
            BindingResult bindingResult) {

        Map<String, String> errores =
                new LinkedHashMap<>();

        // Recuperar errores de las anotaciones del DTO
        bindingResult
            .getFieldErrors()
            .forEach(error ->
                errores.putIfAbsent(
                    error.getField(),
                    error.getDefaultMessage()
                )
            );

        String nombreDependencia =
                normalizarEspacios(dto.getNombreDependencia());

        String abreviacion =
                limpiar(dto.getAbreviacion());

        String nombreContacto =
                normalizarEspacios(dto.getNombreContacto());

        String emailContacto =
                limpiar(dto.getEmailContacto());

        String telefonoContacto =
                normalizarTelefono(dto.getTelefonoContacto());

        /*
         * Validar el nombre solamente cuando primero
         * haya pasado las validaciones de formato.
         */
        if (!errores.containsKey("nombreDependencia")) {

            if (institucionRepo
                    .existsByNombreOficialIgnoreCase(
                        nombreDependencia
                    )) {

                errores.put(
                    "nombreDependencia",
                    "Esta dependencia ya se encuentra registrada."
                );

            } else if (solicitudRepository
                    .existsByNombreDependenciaIgnoreCase(
                        nombreDependencia
                    )) {

                errores.put(
                    "nombreDependencia",
                    "Ya existe una solicitud para esta dependencia."
                );
            }
        }

        /*
         * Validar abreviación duplicada.
         */
        if (!errores.containsKey("abreviacion")) {

            if (institucionRepo
                    .existsByAbreviacionIgnoreCase(
                        abreviacion
                    )) {

                errores.put(
                    "abreviacion",
                    "Estas siglas pertenecen a una institución ya registrada."
                );

            } else if (solicitudRepository
                    .existsByAbreviacionIgnoreCase(
                        abreviacion
                    )) {

                errores.put(
                    "abreviacion",
                    "Ya existe una solicitud registrada con estas siglas."
                );
            }
        }

        if (!errores.isEmpty()) {
            return respuestaError(
                HttpStatus.BAD_REQUEST,
                "Revisa los datos marcados en el formulario.",
                errores
            );
        }

        SolicitudInstitucion solicitud =
                new SolicitudInstitucion();

        solicitud.setNombreDependencia(
            nombreDependencia
        );

        solicitud.setAbreviacion(
            abreviacion
        );

        solicitud.setNombreContacto(
            nombreContacto
        );

        solicitud.setEmailContacto(
            emailContacto
        );

        solicitud.setTelefonoContacto(
            telefonoContacto
        );

        solicitudRepository.save(solicitud);

        Map<String, Object> respuesta =
                new LinkedHashMap<>();

        respuesta.put(
            "mensaje",
            "¡Tu solicitud ha sido enviada correctamente! "
            + "El equipo de SeProc se pondrá en contacto pronto."
        );

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(respuesta);
    }

    private String limpiar(String valor) {
        return valor == null
            ? ""
            : valor.trim();
    }

    private String normalizarEspacios(String valor) {
        return valor == null
            ? ""
            : valor.trim().replaceAll(" +", " ");
    }

    /*
     * Convierte:
     * +52 (747) 123-4567
     *
     * En:
     * +527471234567
     */
    private String normalizarTelefono(String valor) {
        return valor == null
            ? ""
            : valor
                .trim()
                .replaceAll("[()\\s-]", "");
    }

    private ResponseEntity<Map<String, Object>> respuestaError(
            HttpStatus estado,
            String mensaje,
            Map<String, String> errores) {

        Map<String, Object> respuesta =
                new LinkedHashMap<>();

        respuesta.put("mensaje", mensaje);
        respuesta.put("errores", errores);

        return ResponseEntity
            .status(estado)
            .body(respuesta);
    }
}