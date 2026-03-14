package com.example.demo.controller;

import com.example.demo.modelo.Proyecto;
import com.example.demo.modelo.SolicitudProyecto;
import com.example.demo.repository.ProyectoRepository;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;

@RestController
@RequestMapping("/api/constructor/proyectos")
public class ConstructorProyectosApiController {

    private final ProyectoRepository proyectoRepo;
    private final UsuarioRepository usuarioRepo;

    public ConstructorProyectosApiController(ProyectoRepository proyectoRepo,
                                             UsuarioRepository usuarioRepo) {
        this.proyectoRepo = proyectoRepo;
        this.usuarioRepo = usuarioRepo;
    }

    @GetMapping
    public ResponseEntity<?> listar(@RequestParam("estado") String estado,
                                    Authentication auth) {

        var usuarioOpt = usuarioRepo.findByUsername(auth.getName());
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Constructor no encontrado");
        }

        Long constructorId = usuarioOpt.get().getIdUsuario();

        var items = proyectoRepo
                .findBySolicitud_IdUsuarioContratistaAndEstadoProyectoOrderByFechaAprobacionDesc(
                        constructorId, estado.toUpperCase()
                )
                .stream()
                .map(p -> {
                    SolicitudProyecto s = p.getSolicitud();
                    var supervisor = usuarioRepo.findById(p.getIdUsuarioSupervisor()).orElse(null);

                    return new HashMap<String, Object>() {{
                        put("idProyecto", p.getIdProyecto());
                        put("idSolicitud", s.getIdSolicitud());
                        put("nombreEscuela", s.getNombreEscuela());
                        put("supervisor", supervisor != null
                                ? (supervisor.getNombre() + " " + supervisor.getApellido())
                                : "—");
                        put("fechaAprobacion", p.getFechaAprobacion() != null
                                ? p.getFechaAprobacion().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                                : "");
                        put("estadoProyecto", p.getEstadoProyecto());
                    }};
                })
                .toList();

        return ResponseEntity.ok(items);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detalle(@PathVariable Integer id,
                                     Authentication auth) {

        var usuarioOpt = usuarioRepo.findByUsername(auth.getName());
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Constructor no encontrado");
        }

        Long constructorId = usuarioOpt.get().getIdUsuario();

        var pOpt = proyectoRepo.findById(id);
        if (pOpt.isEmpty()) return ResponseEntity.notFound().build();

        Proyecto p = pOpt.get();
        SolicitudProyecto s = p.getSolicitud();

        if (!constructorId.equals(s.getIdUsuarioContratista())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("No tienes acceso a este proyecto");
        }

        var constructor = usuarioRepo.findById(s.getIdUsuarioContratista()).orElse(null);
        var supervisor = usuarioRepo.findById(p.getIdUsuarioSupervisor()).orElse(null);

        var dto = new HashMap<String, Object>();
        dto.put("idProyecto", p.getIdProyecto());
        dto.put("idSolicitud", s.getIdSolicitud());
        dto.put("estadoProyecto", p.getEstadoProyecto());
        dto.put("fechaAprobacion", p.getFechaAprobacion() != null
                ? p.getFechaAprobacion().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                : null);

        dto.put("quienEnvia", constructor != null
                ? (constructor.getNombre() + " " + constructor.getApellido())
                : "—");

        dto.put("supervisorAsignado", supervisor != null
                ? (supervisor.getNombre() + " " + supervisor.getApellido())
                : "—");

        dto.put("nombreEscuela", s.getNombreEscuela());
        dto.put("estado", s.getEstado().getNombre());
        dto.put("municipio", s.getMunicipio().getNombre());
        dto.put("ciudad", s.getLocalidad().getNombre());
        dto.put("tipoObra", s.getTipoObra());
        dto.put("concepto", s.getConcepto());

        return ResponseEntity.ok(dto);
    }
}