package com.example.demo.service;

import java.time.LocalDateTime;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.modelo.EtapaPlantilla;
import com.example.demo.modelo.Proyecto;
import com.example.demo.modelo.ProyectoEtapa;
import com.example.demo.modelo.ProyectoEtapaEntrega;
import com.example.demo.modelo.Usuario;
import com.example.demo.repository.EtapaPlantillaRepository;
import com.example.demo.repository.ProyectoEtapaEntregaRepository;
import com.example.demo.repository.ProyectoEtapaRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.math.BigDecimal;
import com.example.demo.modelo.ProyectoEtapaInteraccion;
import com.example.demo.repository.ProyectoEtapaInteraccionRepository;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;

@Service
@Transactional
public class ProyectoEtapaService {

    public static final String ESTADO_BLOQUEADA = "BLOQUEADA";
    public static final String ESTADO_EN_PROCESO = "EN_PROCESO";
    public static final String ESTADO_CON_OBSERVACIONES = "CON_OBSERVACIONES";
    public static final String ESTADO_COMPLETADA = "COMPLETADA";

    private final ProyectoEtapaRepository proyectoEtapaRepo;
    private final ProyectoEtapaEntregaRepository entregaRepo;
    private final EtapaPlantillaRepository etapaPlantillaRepo;
    private final ProyectoEtapaInteraccionRepository interaccionRepo;

    public ProyectoEtapaService(ProyectoEtapaRepository proyectoEtapaRepo,
            ProyectoEtapaEntregaRepository entregaRepo,
            EtapaPlantillaRepository etapaPlantillaRepo,
            ProyectoEtapaInteraccionRepository interaccionRepo) {
this.proyectoEtapaRepo = proyectoEtapaRepo;
this.entregaRepo = entregaRepo;
this.etapaPlantillaRepo = etapaPlantillaRepo;
this.interaccionRepo = interaccionRepo;
}

    public void inicializarEtapasProyecto(Proyecto proyecto) {
        List<ProyectoEtapa> existentes = proyectoEtapaRepo.findByProyecto_IdProyectoOrderByOrdenVisualAsc(proyecto.getIdProyecto());
        if (!existentes.isEmpty()) {
            return;
        }

        int nivelesProyecto = 1;
        if (proyecto.getSolicitud() != null &&
            proyecto.getSolicitud().getTipoEdificacion() != null &&
            proyecto.getSolicitud().getTipoEdificacion().getNumeroNiveles() != null) {
            nivelesProyecto = proyecto.getSolicitud().getTipoEdificacion().getNumeroNiveles();
        }

        String tipoObra = proyecto.getSolicitud() != null && proyecto.getSolicitud().getTipoObra() != null
                ? proyecto.getSolicitud().getTipoObra()
                : "Edificación";

        List<EtapaPlantilla> plantillas = etapaPlantillaRepo
                .findByTipoObraAndActivoTrueAndEsTerminalTrueOrderByOrdenVisualAsc(tipoObra);

        int orden = 1;
        boolean primeraActiva = false;

        for (EtapaPlantilla plantilla : plantillas) {
            if (!aplicaANiveles(plantilla, nivelesProyecto)) {
                continue;
            }

            if (Boolean.TRUE.equals(plantilla.getEsRepetiblePorNivel())) {
                int inicio = plantilla.getNivelInicioRepeticion() != null ? plantilla.getNivelInicioRepeticion() : 1;
                int fin = plantilla.getNivelFinRepeticion() != null ? plantilla.getNivelFinRepeticion() : nivelesProyecto;

                inicio = Math.max(1, inicio);
                fin = Math.min(nivelesProyecto, fin);

                for (int nivel = inicio; nivel <= fin; nivel++) {
                    ProyectoEtapa etapa = crearEtapaBase(proyecto, plantilla, orden++);
                    etapa.setNumeroNivel(nivel);
                    etapa.setNombreMostrado(plantilla.getNombre());
                    if (!primeraActiva) {
                        activarPrimeraEtapa(etapa);
                        primeraActiva = true;
                    } else {
                        bloquearEtapa(etapa);
                    }
                    proyectoEtapaRepo.save(etapa);
                }
            } else {
                ProyectoEtapa etapa = crearEtapaBase(proyecto, plantilla, orden++);
                etapa.setNumeroNivel(null);
                etapa.setNombreMostrado(plantilla.getNombre());
                if (!primeraActiva) {
                    activarPrimeraEtapa(etapa);
                    primeraActiva = true;
                } else {
                    bloquearEtapa(etapa);
                }
                proyectoEtapaRepo.save(etapa);
            }
        }
    }

    public ProyectoEtapa obtenerEtapaPorClaveVisual(Integer idProyecto, String claveVisual) {
        if (claveVisual == null || claveVisual.isBlank()) {
            throw new IllegalArgumentException("La clave de etapa es requerida.");
        }

        if (claveVisual.startsWith("estructura_n")) {
            String sinPrefijo = claveVisual.substring("estructura_n".length());
            int idx = sinPrefijo.indexOf('_');
            if (idx <= 0) {
                throw new IllegalArgumentException("La clave de etapa no tiene un formato válido.");
            }

            Integer nivel = Integer.valueOf(sinPrefijo.substring(0, idx));
            String claveInterna = sinPrefijo.substring(idx + 1);

            return proyectoEtapaRepo
                    .findByProyecto_IdProyectoAndEtapaPlantilla_ClaveInternaAndNumeroNivel(idProyecto, claveInterna, nivel)
                    .orElseThrow(() -> new IllegalArgumentException("Etapa no encontrada para el proyecto."));
        }

        return proyectoEtapaRepo
                .findByProyecto_IdProyectoAndEtapaPlantilla_ClaveInternaAndNumeroNivelIsNull(idProyecto, claveVisual)
                .orElseThrow(() -> new IllegalArgumentException("Etapa no encontrada para el proyecto."));
    }

    public void validarSubidaPermitida(ProyectoEtapa etapa) {
        String estado = etapa.getEstado();

        if (ESTADO_BLOQUEADA.equalsIgnoreCase(estado)) {
            throw new IllegalArgumentException("La etapa está bloqueada y aún no permite subir evidencias.");
        }

        if (ESTADO_COMPLETADA.equalsIgnoreCase(estado)) {
            throw new IllegalArgumentException("La etapa ya fue completada y no acepta nuevas evidencias.");
        }

        if (!ESTADO_EN_PROCESO.equalsIgnoreCase(estado) &&
            !ESTADO_CON_OBSERVACIONES.equalsIgnoreCase(estado)) {
            throw new IllegalArgumentException("La etapa no permite subir evidencias en su estado actual.");
        }
    }

    public ProyectoEtapaEntrega registrarEntrega(ProyectoEtapa etapa,
                                                 Usuario constructor,
                                                 String nombreArchivoOriginal,
                                                 String storagePath,
                                                 String publicUrl) {

        long versiones = entregaRepo.countByProyectoEtapa_IdProyectoEtapa(etapa.getIdProyectoEtapa());

        ProyectoEtapaEntrega entrega = new ProyectoEtapaEntrega();
        entrega.setProyectoEtapa(etapa);
        entrega.setUsuarioConstructor(constructor);
        entrega.setVersion((int) versiones + 1);
        entrega.setNombreArchivoOriginal(nombreArchivoOriginal);
        entrega.setExtensionArchivo("pdf");
        entrega.setProviderArchivo("FIREBASE");
        entrega.setArchivoStoragePath(storagePath);
        entrega.setArchivoUrl(publicUrl);
        entrega.setEstadoEntrega("EN_REVISION");
        entrega.setFechaSubida(LocalDateTime.now());

        etapa.setEstado(ESTADO_EN_PROCESO);
        etapa.setFechaInicio(etapa.getFechaInicio() == null ? LocalDateTime.now() : etapa.getFechaInicio());
        etapa.setFechaActualizacion(LocalDateTime.now());
        proyectoEtapaRepo.save(etapa);

        return entregaRepo.save(entrega);
    }

    public void marcarConObservaciones(ProyectoEtapa etapa) {
        etapa.setEstado(ESTADO_CON_OBSERVACIONES);
        etapa.setFechaActualizacion(LocalDateTime.now());
        proyectoEtapaRepo.save(etapa);
    }

    public void aprobarEtapaYHabilitarSiguiente(ProyectoEtapa etapa, Usuario supervisor) {
        etapa.setEstado(ESTADO_COMPLETADA);
        etapa.setFechaCierre(LocalDateTime.now());
        etapa.setFechaActualizacion(LocalDateTime.now());
        proyectoEtapaRepo.save(etapa);

        registrarAprobacion(etapa, supervisor);

        Optional<ProyectoEtapa> siguienteOpt =
                proyectoEtapaRepo.findFirstByProyecto_IdProyectoAndOrdenVisualGreaterThanAndEstadoOrderByOrdenVisualAsc(
                        etapa.getProyecto().getIdProyecto(),
                        etapa.getOrdenVisual(),
                        ESTADO_BLOQUEADA
                );

        if (siguienteOpt.isPresent()) {
            ProyectoEtapa siguiente = siguienteOpt.get();
            siguiente.setEstado(ESTADO_EN_PROCESO);
            siguiente.setFechaHabilitada(LocalDateTime.now());
            siguiente.setFechaActualizacion(LocalDateTime.now());
            proyectoEtapaRepo.save(siguiente);
        }
    }
    
    public void registrarObservacion(ProyectoEtapa etapa, Usuario supervisor, String comentario) {
        if (comentario == null || comentario.trim().isEmpty()) {
            throw new IllegalArgumentException("La observación es obligatoria.");
        }

        ProyectoEtapaInteraccion interaccion = new ProyectoEtapaInteraccion();
        interaccion.setProyectoEtapa(etapa);
        interaccion.setUsuarioActor(supervisor);
        interaccion.setTipoInteraccion("OBSERVACION");
        interaccion.setMensaje(comentario.trim());
        interaccion.setFechaInteraccion(LocalDateTime.now());

        interaccionRepo.save(interaccion);

        etapa.setEstado(ESTADO_CON_OBSERVACIONES);
        etapa.setFechaActualizacion(LocalDateTime.now());
        proyectoEtapaRepo.save(etapa);
    }
    
    public void registrarAprobacion(ProyectoEtapa etapa, Usuario supervisor) {
        ProyectoEtapaInteraccion interaccion = new ProyectoEtapaInteraccion();
        interaccion.setProyectoEtapa(etapa);
        interaccion.setUsuarioActor(supervisor);
        interaccion.setTipoInteraccion("APROBACION");
        interaccion.setMensaje("Reporte aprobado");
        interaccion.setFechaInteraccion(LocalDateTime.now());

        interaccionRepo.save(interaccion);
    }
    
    public Map<String, String> obtenerEstadosVisuales(Integer idProyecto) {
        List<ProyectoEtapa> etapas = proyectoEtapaRepo.findByProyecto_IdProyectoOrderByOrdenVisualAsc(idProyecto);

        Map<String, String> mapa = new LinkedHashMap<>();

        for (ProyectoEtapa pe : etapas) {
            if (pe.getEtapaPlantilla() == null || pe.getEtapaPlantilla().getClaveInterna() == null) {
                continue;
            }

            String clave = pe.getEtapaPlantilla().getClaveInterna();
            String estado = pe.getEstado() != null ? pe.getEstado() : "BLOQUEADA";

            mapa.put(clave, estado.toUpperCase());
        }

        return mapa;
    }
    
    public Map<String, Object> obtenerDetalleActualEtapa(ProyectoEtapa etapa) {
        Map<String, Object> dto = new LinkedHashMap<>();

        dto.put("estadoEtapa", etapa.getEstado());

        var ultimaEntregaOpt = entregaRepo.findFirstByProyectoEtapa_IdProyectoEtapaOrderByVersionDesc(etapa.getIdProyectoEtapa());
        if (ultimaEntregaOpt.isPresent()) {
            ProyectoEtapaEntrega entrega = ultimaEntregaOpt.get();

            Map<String, Object> entregaMap = new LinkedHashMap<>();
            entregaMap.put("version", entrega.getVersion());
            entregaMap.put("estadoEntrega", entrega.getEstadoEntrega());
            entregaMap.put("nombreArchivo", entrega.getNombreArchivoOriginal());
            entregaMap.put("archivoUrl", entrega.getArchivoUrl());
            entregaMap.put("fechaSubida", entrega.getFechaSubida() != null
                    ? entrega.getFechaSubida().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                    : null);

            if (entrega.getUsuarioConstructor() != null) {
                entregaMap.put("usuarioNombre",
                        entrega.getUsuarioConstructor().getNombre() + " " + entrega.getUsuarioConstructor().getApellido());
            } else {
                entregaMap.put("usuarioNombre", "—");
            }

            dto.put("entregaActual", entregaMap);
        } else {
            dto.put("entregaActual", null);
        }

        var observaciones = interaccionRepo.findByProyectoEtapa_IdProyectoEtapaOrderByFechaInteraccionDesc(etapa.getIdProyectoEtapa());
        Map<String, Object> ultimaObservacion = null;

        for (ProyectoEtapaInteraccion it : observaciones) {
            if ("OBSERVACION".equalsIgnoreCase(it.getTipoInteraccion())) {
                ultimaObservacion = new LinkedHashMap<>();
                ultimaObservacion.put("mensaje", it.getMensaje());
                ultimaObservacion.put("fecha", it.getFechaInteraccion() != null
                        ? it.getFechaInteraccion().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                        : null);

                if (it.getUsuarioActor() != null) {
                    ultimaObservacion.put("usuarioNombre",
                            it.getUsuarioActor().getNombre() + " " + it.getUsuarioActor().getApellido());
                } else {
                    ultimaObservacion.put("usuarioNombre", "—");
                }
                break;
            }
        }

        dto.put("ultimaObservacion", ultimaObservacion);
        return dto;
    }
    
    public List<Map<String, Object>> obtenerHistorialEtapa(ProyectoEtapa etapa) {
        List<Map<String, Object>> historial = new ArrayList<>();

        List<ProyectoEtapaEntrega> entregas = entregaRepo.findByProyectoEtapa_IdProyectoEtapaOrderByVersionDesc(etapa.getIdProyectoEtapa());
        for (ProyectoEtapaEntrega entrega : entregas) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("tipo", "ENTREGA");
            item.put("version", entrega.getVersion());
            item.put("estadoEntrega", entrega.getEstadoEntrega());
            item.put("nombreArchivo", entrega.getNombreArchivoOriginal());
            item.put("archivoUrl", entrega.getArchivoUrl());
            item.put("fecha", entrega.getFechaSubida() != null
                    ? entrega.getFechaSubida().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                    : null);

            if (entrega.getUsuarioConstructor() != null) {
                item.put("usuarioNombre",
                        entrega.getUsuarioConstructor().getNombre() + " " + entrega.getUsuarioConstructor().getApellido());
            } else {
                item.put("usuarioNombre", "—");
            }

            historial.add(item);
        }

        List<ProyectoEtapaInteraccion> interacciones =
                interaccionRepo.findByProyectoEtapa_IdProyectoEtapaOrderByFechaInteraccionDesc(etapa.getIdProyectoEtapa());

        for (ProyectoEtapaInteraccion it : interacciones) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("tipo", it.getTipoInteraccion());
            item.put("mensaje", it.getMensaje());
            item.put("fecha", it.getFechaInteraccion() != null
                    ? it.getFechaInteraccion().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                    : null);

            if (it.getUsuarioActor() != null) {
                item.put("usuarioNombre",
                        it.getUsuarioActor().getNombre() + " " + it.getUsuarioActor().getApellido());
            } else {
                item.put("usuarioNombre", "—");
            }

            historial.add(item);
        }

        historial.sort((a, b) -> String.valueOf(b.get("fecha")).compareTo(String.valueOf(a.get("fecha"))));
        return historial;
    }

    private ProyectoEtapa crearEtapaBase(Proyecto proyecto, EtapaPlantilla plantilla, int ordenVisual) {
        ProyectoEtapa etapa = new ProyectoEtapa();
        etapa.setProyecto(proyecto);
        etapa.setProyectoEtapaPadre(null);
        etapa.setEtapaPlantilla(plantilla);
        etapa.setOrdenVisual(ordenVisual);
        etapa.setNivelArbol(plantilla.getNivelArbol());
        etapa.setFechaActualizacion(LocalDateTime.now());
        etapa.setAvancePorcentaje(BigDecimal.ZERO);
        return etapa;
    }

    private void activarPrimeraEtapa(ProyectoEtapa etapa) {
        etapa.setEstado(ESTADO_EN_PROCESO);
        etapa.setFechaHabilitada(LocalDateTime.now());
        etapa.setFechaInicio(null);
        etapa.setFechaCierre(null);
    }

    private void bloquearEtapa(ProyectoEtapa etapa) {
        etapa.setEstado(ESTADO_BLOQUEADA);
        etapa.setFechaHabilitada(null);
        etapa.setFechaInicio(null);
        etapa.setFechaCierre(null);
    }

    private boolean aplicaANiveles(EtapaPlantilla plantilla, int nivelesProyecto) {
        Integer min = plantilla.getProyectoNivelesMin();
        Integer max = plantilla.getProyectoNivelesMax();

        if (min != null && nivelesProyecto < min) {
            return false;
        }

        if (max != null && nivelesProyecto > max) {
            return false;
        }

        return true;
    }
}