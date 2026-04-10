package com.example.demo.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.modelo.Proyecto;
import com.example.demo.modelo.ProyectoEtapa;
import com.example.demo.modelo.ProyectoEtapaEntrega;
import com.example.demo.modelo.SolicitudProyecto;
import com.example.demo.repository.ProyectoEtapaEntregaRepository;
import com.example.demo.repository.ProyectoEtapaRepository;
import com.example.demo.repository.ProyectoRepository;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.storage.StorageService;

@RestController
@RequestMapping("/api/constructor/proyectos")
public class ConstructorProyectosApiController {

    private final ProyectoRepository proyectoRepo;
    private final UsuarioRepository usuarioRepo;
    private final StorageService storageService;
    private final ProyectoEtapaRepository proyectoEtapaRepo;
    private final ProyectoEtapaEntregaRepository entregaRepo;

    public ConstructorProyectosApiController(ProyectoRepository proyectoRepo,
                                             UsuarioRepository usuarioRepo, 
                                             StorageService storageService,
                                             ProyectoEtapaRepository proyectoEtapaRepo,
                                             ProyectoEtapaEntregaRepository entregaRepo) {
        this.proyectoRepo = proyectoRepo;
        this.usuarioRepo = usuarioRepo;
        this.storageService = storageService;
        this.proyectoEtapaRepo = proyectoEtapaRepo;
        this.entregaRepo = entregaRepo;
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
        dto.put("tipoEdificacion", s.getTipoEdificacion() != null
                ? s.getTipoEdificacion().getNombre()
                : "");

        return ResponseEntity.ok(dto);
    }
    
    @PostMapping("/{id}/etapas/{etapa}/reporte")
    public ResponseEntity<?> subirReporteEtapa(@PathVariable Integer id,
                                               @PathVariable String etapa,
                                               @RequestParam("file") MultipartFile file,
                                               Authentication auth) {
        
        var usuarioOpt = usuarioRepo.findByUsername(auth.getName());
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no encontrado.");
        }

        var usuario = usuarioOpt.get();

        // Validar que el proyecto le pertenece al constructor
        var pOpt = proyectoRepo.findById(id);
        if (pOpt.isEmpty()) return ResponseEntity.notFound().build();
        
        Proyecto p = pOpt.get();
        if (!usuario.getIdUsuario().equals(p.getSolicitud().getIdUsuarioContratista())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No tienes acceso a este proyecto.");
        }

        try {
            // 1. Subimos a Firebase (Lo que ya tienes)
            String key = storageService.saveReportePdf(usuario.getIdUsuario(), usuario.getUsername(), id, etapa, file);
            String publicUrl = storageService.publicUrl(key);
            
            // --- NUEVO: GUARDAR EN BASE DE DATOS ---
            
            // 2. Buscar la etapa del proyecto (Necesitas un método en tu ProyectoEtapaRepository)
            // Ejemplo: Buscar por ID del proyecto y alguna clave interna de la etapa
         // Cambia la línea donde buscas la etapa por esta:
            ProyectoEtapa etapaActual = proyectoEtapaRepo.findByProyecto_IdProyectoAndEtapaPlantilla_ClaveInterna(id, etapa)
                .orElseThrow(() -> new RuntimeException("Etapa no encontrada en la base de datos"));

            // 3. Crear el registro de la entrega
            ProyectoEtapaEntrega entrega = new ProyectoEtapaEntrega();
            entrega.setProyectoEtapa(etapaActual);
            entrega.setUsuarioConstructor(usuario);
            entrega.setNombreArchivoOriginal(file.getOriginalFilename());
            entrega.setExtensionArchivo("pdf");
            entrega.setProviderArchivo("FIREBASE"); // Según tu ENUM
            entrega.setArchivoStoragePath(key);
            entrega.setArchivoUrl(publicUrl);
            entrega.setEstadoEntrega("ENTREGADO"); // O "EN_REVISION" según tu ENUM
            entrega.setFechaSubida(LocalDateTime.now());
            
            // 4. Guardar en MySQL
            entregaRepo.save(entrega);

            return ResponseEntity.ok(Map.of(
                "mensaje", "Reporte subido y guardado correctamente",
                "url", publicUrl
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error interno al subir el reporte.");
        }
    }
}