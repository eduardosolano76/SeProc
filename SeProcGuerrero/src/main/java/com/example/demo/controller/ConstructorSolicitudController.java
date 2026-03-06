package com.example.demo.controller;

import com.example.demo.dto.SolicitudProyectoRequest;
import com.example.demo.modelo.*;
import com.example.demo.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/constructor")
public class ConstructorSolicitudController {

    private final SolicitudProyectoRepository solRepo;
    private final CatEstadoRepository estadoRepo;
    private final CatMunicipioRepository municipioRepo;
    private final CatLocalidadRepository localidadRepo;
    private final UsuarioRepository usuarioRepo; 

    public ConstructorSolicitudController(
            SolicitudProyectoRepository solRepo,
            CatEstadoRepository estadoRepo,
            CatMunicipioRepository municipioRepo,
            CatLocalidadRepository localidadRepo,
            UsuarioRepository usuarioRepo
    ) {
        this.solRepo = solRepo;
        this.estadoRepo = estadoRepo;
        this.municipioRepo = municipioRepo;
        this.localidadRepo = localidadRepo;
        this.usuarioRepo = usuarioRepo;
    }

    @PostMapping("/solicitudes")
    public ResponseEntity<?> crearSolicitud(@RequestBody SolicitudProyectoRequest req, Authentication auth) {

        // sacar id del usuario logueado por nombre de usuario
        String username = auth.getName();
        var usuario = usuarioRepo.findByUsername(username);
        if (usuario.isEmpty()) return ResponseEntity.badRequest().body("Usuario no encontrado");

        // validar catálogos
        CatEstado estado = estadoRepo.findById(req.idEstado).orElse(null);
        CatMunicipio municipio = municipioRepo.findById(req.idMunicipio).orElse(null);
        CatLocalidad localidad = localidadRepo.findById(req.idLocalidad).orElse(null);

        if (estado == null || municipio == null || localidad == null) {
            return ResponseEntity.badRequest().body("Ubicación inválida");
        }

        // crear entidad
        SolicitudProyecto s = new SolicitudProyecto();
        s.setIdUsuarioContratista(usuario.get().getIdUsuario());
        s.setEstadoSolicitud("PENDIENTE");

        s.setNombreEscuela(req.nombreEscuela);
        s.setCct1(req.cct1);
        s.setCct2((req.cct2 == null || req.cct2.isBlank()) ? null : req.cct2);

        s.setEstado(estado);
        s.setMunicipio(municipio);
        s.setLocalidad(localidad);

        s.setCalleNumero(req.calleNumero);
        s.setCp(req.cp);

        s.setResponsableInmueble(req.responsable);
        s.setContacto(req.contacto);

        s.setNumInmueblesEvaluar(req.numInmuebles);
        s.setNumEntreEjes(req.numEntreEjes);

        s.setTipoObra(req.tipoObra);
        s.setConcepto(req.concepto);

        solRepo.save(s);

        return ResponseEntity.ok().body("OK");
    }
}