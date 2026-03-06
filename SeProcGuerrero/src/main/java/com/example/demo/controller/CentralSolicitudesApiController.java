package com.example.demo.controller;

import com.example.demo.dto.SolicitudDetalleDto;
import com.example.demo.modelo.*;
import com.example.demo.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/central/solicitudes")
public class CentralSolicitudesApiController {

    private final SolicitudProyectoRepository solRepo;
    private final UsuarioRepository usuarioRepo;
    private final ProyectoRepository proyectoRepo;

    public CentralSolicitudesApiController(SolicitudProyectoRepository solRepo,
                                           UsuarioRepository usuarioRepo,
                                           ProyectoRepository proyectoRepo) {
        this.solRepo = solRepo;
        this.usuarioRepo = usuarioRepo;
        this.proyectoRepo = proyectoRepo;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detalle(@PathVariable Integer id) {
        var solOpt = solRepo.findById(id);
        if (solOpt.isEmpty()) return ResponseEntity.notFound().build();

        var s = solOpt.get();
        SolicitudDetalleDto dto = new SolicitudDetalleDto();
        dto.idSolicitud = s.getIdSolicitud();
        dto.estadoSolicitud = s.getEstadoSolicitud();
        dto.motivoRechazo = s.getMotivoRechazo();

        dto.fechaSolicitud = s.getFechaSolicitud() != null
                ? s.getFechaSolicitud().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                : null;

        // quien envía
        var uEnv = usuarioRepo.findById(s.getIdUsuarioContratista()).orElse(null);
        dto.quienEnvia = (uEnv != null) ? (uEnv.getNombre() + " " + uEnv.getApellido()) : "—";

        dto.nombreEscuela = s.getNombreEscuela();
        dto.cct1 = s.getCct1();
        dto.cct2 = s.getCct2();

        dto.estado = s.getEstado().getNombre();
        dto.municipio = s.getMunicipio().getNombre();
        dto.ciudad = s.getLocalidad().getNombre();

        dto.calleNumero = s.getCalleNumero();
        dto.cp = s.getCp();
        dto.responsableInmueble = s.getResponsableInmueble();
        dto.contacto = s.getContacto();

        dto.numInmueblesEvaluar = s.getNumInmueblesEvaluar();
        dto.numEntreEjes = s.getNumEntreEjes();

        dto.tipoObra = s.getTipoObra();
        dto.concepto = s.getConcepto();

        // supervisor asignado si existe proyecto
        
        var p = proyectoRepo.findBySolicitud_IdSolicitud(id).orElse(null);

        if (p != null) {
            var sup = usuarioRepo.findById(p.getIdUsuarioSupervisor()).orElse(null);
            dto.supervisorAsignado = sup != null ? (sup.getNombre() + " " + sup.getApellido()) : "—";
        } else {
            dto.supervisorAsignado = null;
        }

        return ResponseEntity.ok(dto);
    }
    
    @GetMapping
    public ResponseEntity<?> listar(@RequestParam("estado") String estado) {
        var items = solRepo.findByEstadoSolicitudOrderByFechaSolicitudDesc(estado.toUpperCase())
                .stream()
                .map(s -> {
               
                    var u = usuarioRepo.findById(s.getIdUsuarioContratista()).orElse(null);

                    return new java.util.HashMap<String, Object>() {{
                        put("idSolicitud", s.getIdSolicitud());
                        put("nombreEscuela", s.getNombreEscuela());
                        put("constructor", u != null ? (u.getNombre() + " " + u.getApellido()) : "—");
                        put("fechaSolicitud", s.getFechaSolicitud() != null
                                ? s.getFechaSolicitud().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                                : "");
                        put("estadoSolicitud", s.getEstadoSolicitud());
                    }};
                })
                .toList();

        return ResponseEntity.ok(items);
    }
    
    @GetMapping("/supervisores")
    public ResponseEntity<?> supervisores() {
        var list = usuarioRepo.findByRol_NombreIgnoreCase("supervisor")
                .stream()
                .map(u -> new java.util.HashMap<String, Object>() {{
                    put("id", u.getIdUsuario());
                    put("nombre", u.getNombre() + " " + u.getApellido());
                }})
                .toList();

        return ResponseEntity.ok(list);
    }

    @PostMapping("/{id}/aprobar")
    public ResponseEntity<?> aprobar(@PathVariable Integer id,
                                     @RequestParam Long supervisorId,
                                     Authentication auth) {

        var solOpt = solRepo.findById(id);
        if (solOpt.isEmpty()) return ResponseEntity.notFound().build();
        var s = solOpt.get();

        if (!"PENDIENTE".equalsIgnoreCase(s.getEstadoSolicitud())) {
            return ResponseEntity.badRequest().body("Solo se puede aprobar si está PENDIENTE");
        }

        if (proyectoRepo.existsBySolicitud_IdSolicitud(id)) {
            return ResponseEntity.badRequest().body("Ya existe un proyecto para esta solicitud");
        }

        // central que aprueba
        var central = usuarioRepo.findByUsername(auth.getName()).orElse(null);
        if (central == null) return ResponseEntity.badRequest().body("Central no encontrado");

        // set solicitud aprobada
        s.setEstadoSolicitud("APROBADA");
        s.setIdUsuarioCentral(central.getIdUsuario());
        s.setMotivoRechazo(null);
        s.setFechaResolucion(java.time.LocalDateTime.now());
        solRepo.save(s);

        // crear proyecto
        Proyecto p = new Proyecto();
        p.setSolicitud(s);
        p.setIdUsuarioSupervisor(supervisorId);
        p.setEstadoProyecto("ACTIVO");
        proyectoRepo.save(p);

        return ResponseEntity.ok("OK");
    }

    @PostMapping("/{id}/rechazar")
    public ResponseEntity<?> rechazar(@PathVariable Integer id,
                                      @RequestParam String motivo,
                                      Authentication auth) {

        if (motivo == null || motivo.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Motivo requerido");
        }

        var solOpt = solRepo.findById(id);
        if (solOpt.isEmpty()) return ResponseEntity.notFound().build();
        var s = solOpt.get();

        if (!"PENDIENTE".equalsIgnoreCase(s.getEstadoSolicitud())) {
            return ResponseEntity.badRequest().body("Solo se puede rechazar si está PENDIENTE");
        }

        var central = usuarioRepo.findByUsername(auth.getName()).orElse(null);
        if (central == null) return ResponseEntity.badRequest().body("Central no encontrado");

        s.setEstadoSolicitud("RECHAZADA");
        s.setIdUsuarioCentral(central.getIdUsuario());
        s.setMotivoRechazo(motivo.trim());
        s.setFechaResolucion(java.time.LocalDateTime.now());
        solRepo.save(s);

        return ResponseEntity.ok("OK");
    }
}