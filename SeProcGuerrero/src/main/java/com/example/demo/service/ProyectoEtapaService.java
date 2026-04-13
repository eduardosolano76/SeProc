package com.example.demo.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.modelo.EtapaPlantilla;
import com.example.demo.modelo.Proyecto;
import com.example.demo.modelo.ProyectoEtapa;
import com.example.demo.modelo.ProyectoEtapaEntrega;
import com.example.demo.modelo.ProyectoEtapaInteraccion;
import com.example.demo.modelo.Usuario;
import com.example.demo.repository.EtapaPlantillaRepository;
import com.example.demo.repository.ProyectoEtapaEntregaRepository;
import com.example.demo.repository.ProyectoEtapaInteraccionRepository;
import com.example.demo.repository.ProyectoEtapaRepository;

@Service
@Transactional
public class ProyectoEtapaService {

    public static final String ESTADO_BLOQUEADA = "BLOQUEADA";
    public static final String ESTADO_EN_PROCESO = "EN_PROCESO";
    public static final String ESTADO_CON_OBSERVACIONES = "CON_OBSERVACIONES";
    public static final String ESTADO_APROBADA = "APROBADA";

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

        List<EtapaPlantilla> plantillas = obtenerTerminalesEnSecuencia(tipoObra, nivelesProyecto);
        List<EtapaProgramada> secuencia = construirSecuenciaProgramada(plantillas, nivelesProyecto);

        int orden = 1;
        boolean primeraActiva = false;

        for (EtapaProgramada programada : secuencia) {
            ProyectoEtapa etapa = crearEtapaBase(proyecto, programada.plantilla(), orden++);
            etapa.setNumeroNivel(programada.numeroNivel());
            etapa.setNombreMostrado(programada.plantilla().getNombre());

            if (!primeraActiva) {
                activarPrimeraEtapa(etapa);
                primeraActiva = true;
            } else {
                bloquearEtapa(etapa);
            }

            proyectoEtapaRepo.save(etapa);
        }
    }

    public ProyectoEtapa obtenerEtapaPorClaveVisual(Integer idProyecto, String claveVisual) {
        String claveInterna = claveVisual;
        Integer numeroNivel = null;

        if ("habilitado_cadenas".equals(claveInterna)) {
            claveInterna = "habilitado_cadenas_cimentacion";
        }

        if (claveVisual != null && claveVisual.startsWith("estructura_n")) {
            try {
                String resto = claveVisual.substring(12);
                int primerGuionBajo = resto.indexOf('_');

                if (primerGuionBajo != -1) {
                    String nivelStr = resto.substring(0, primerGuionBajo);
                    numeroNivel = Integer.parseInt(nivelStr);
                    claveInterna = resto.substring(primerGuionBajo + 1);
                }
            } catch (NumberFormatException e) {
                // Sin accion
            }
        }

        return proyectoEtapaRepo.findByClaveInternaAndNivel(idProyecto, claveInterna, numeroNivel)
                .orElseThrow(() -> new RuntimeException("No se encontro la etapa para la clave: " + claveVisual));
    }

    public void validarSubidaPermitida(ProyectoEtapa etapa) {
        String estado = etapa.getEstado();

        if (ESTADO_BLOQUEADA.equalsIgnoreCase(estado)) {
            throw new IllegalArgumentException("La etapa esta bloqueada y aun no permite subir evidencias.");
        }

        if (ESTADO_APROBADA.equalsIgnoreCase(estado)) {
            throw new IllegalArgumentException("La etapa ya fue completada y no acepta nuevas evidencias.");
        }

        if (!ESTADO_EN_PROCESO.equalsIgnoreCase(estado) &&
            !ESTADO_CON_OBSERVACIONES.equalsIgnoreCase(estado)) {
            throw new IllegalArgumentException("La etapa no permite subir evidencias en su estado actual.");
        }
    }

    public ProyectoEtapaEntrega guardarBorrador(ProyectoEtapa etapa,
                                                Usuario constructor,
                                                String nombreArchivoOriginal,
                                                String storagePath,
                                                String publicUrl) {

        var ultimaEntregaOpt = entregaRepo.findFirstByProyectoEtapa_IdProyectoEtapaOrderByVersionDesc(etapa.getIdProyectoEtapa());

        ProyectoEtapaEntrega entrega;

        if (ultimaEntregaOpt.isPresent() && "BORRADOR".equalsIgnoreCase(ultimaEntregaOpt.get().getEstadoEntrega())) {
            entrega = ultimaEntregaOpt.get();
            entrega.setNombreArchivoOriginal(nombreArchivoOriginal);
            entrega.setArchivoStoragePath(storagePath);
            entrega.setArchivoUrl(publicUrl);
            entrega.setFechaSubida(LocalDateTime.now());
        } else {
            long versiones = entregaRepo.countByProyectoEtapa_IdProyectoEtapa(etapa.getIdProyectoEtapa());

            entrega = new ProyectoEtapaEntrega();
            entrega.setProyectoEtapa(etapa);
            entrega.setUsuarioConstructor(constructor);
            entrega.setVersion((int) versiones + 1);
            entrega.setNombreArchivoOriginal(nombreArchivoOriginal);
            entrega.setExtensionArchivo("pdf");
            entrega.setProviderArchivo("FIREBASE");
            entrega.setArchivoStoragePath(storagePath);
            entrega.setArchivoUrl(publicUrl);
            entrega.setEstadoEntrega("BORRADOR");
            entrega.setFechaSubida(LocalDateTime.now());
        }

        etapa.setEstado(ESTADO_EN_PROCESO);
        etapa.setFechaInicio(etapa.getFechaInicio() == null ? LocalDateTime.now() : etapa.getFechaInicio());
        etapa.setFechaActualizacion(LocalDateTime.now());
        proyectoEtapaRepo.save(etapa);

        return entregaRepo.save(entrega);
    }

    public void confirmarEntregaAlSupervisor(ProyectoEtapa etapa, Usuario constructor) {
        var ultimaEntregaOpt = entregaRepo.findFirstByProyectoEtapa_IdProyectoEtapaOrderByVersionDesc(etapa.getIdProyectoEtapa());

        if (ultimaEntregaOpt.isEmpty()) {
            throw new IllegalArgumentException("No hay ningun archivo subido para entregar.");
        }

        ProyectoEtapaEntrega entrega = ultimaEntregaOpt.get();

        if (!"BORRADOR".equalsIgnoreCase(entrega.getEstadoEntrega())) {
            throw new IllegalArgumentException("El reporte actual ya fue entregado o esta en un estado no valido para envio.");
        }

        entrega.setEstadoEntrega("ENVIADA");
        entregaRepo.save(entrega);

        ProyectoEtapaInteraccion interaccion = new ProyectoEtapaInteraccion();
        interaccion.setProyectoEtapa(etapa);
        interaccion.setUsuarioActor(constructor);
        interaccion.setTipoInteraccion("ENTREGA");
        interaccion.setMensaje("Reporte enviado para revision del supervisor.");
        interaccion.setFechaInteraccion(LocalDateTime.now());
        interaccionRepo.save(interaccion);
    }

    public void marcarConObservaciones(ProyectoEtapa etapa) {
        etapa.setEstado(ESTADO_CON_OBSERVACIONES);
        etapa.setFechaActualizacion(LocalDateTime.now());
        proyectoEtapaRepo.save(etapa);
    }

    public void aprobarEtapaYHabilitarSiguiente(ProyectoEtapa etapa, Usuario supervisor) {
        if (ESTADO_APROBADA.equalsIgnoreCase(etapa.getEstado())) {
            throw new IllegalStateException("Esta etapa ya fue aprobada.");
        }

        var ultimaEntregaOpt = entregaRepo.findFirstByProyectoEtapa_IdProyectoEtapaOrderByVersionDesc(etapa.getIdProyectoEtapa());
        if (ultimaEntregaOpt.isEmpty()) {
            throw new IllegalStateException("No existe un reporte enviado para aprobar.");
        }

        ProyectoEtapaEntrega entregaActual = ultimaEntregaOpt.get();
        if (!"ENVIADA".equalsIgnoreCase(entregaActual.getEstadoEntrega())) {
            throw new IllegalStateException("Solo se puede aprobar una entrega en estado ENVIADA.");
        }

        etapa.setEstado(ESTADO_APROBADA);
        etapa.setFechaCierre(LocalDateTime.now());
        etapa.setFechaActualizacion(LocalDateTime.now());
        proyectoEtapaRepo.save(etapa);

        entregaActual.setEstadoEntrega(ESTADO_APROBADA);
        entregaRepo.save(entregaActual);

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
            throw new IllegalArgumentException("La observacion es obligatoria.");
        }

        ProyectoEtapaInteraccion interaccion = new ProyectoEtapaInteraccion();
        interaccion.setProyectoEtapa(etapa);
        interaccion.setUsuarioActor(supervisor);
        interaccion.setTipoInteraccion("OBSERVACION");
        interaccion.setMensaje(comentario.trim());
        interaccion.setFechaInteraccion(LocalDateTime.now());

        interaccionRepo.save(interaccion);

        var ultimaEntregaOpt = entregaRepo.findFirstByProyectoEtapa_IdProyectoEtapaOrderByVersionDesc(etapa.getIdProyectoEtapa());
        if (ultimaEntregaOpt.isPresent()) {
            ProyectoEtapaEntrega entregaActual = ultimaEntregaOpt.get();
            entregaActual.setEstadoEntrega(ESTADO_CON_OBSERVACIONES);
            entregaRepo.save(entregaActual);
        }

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

            String claveBase = pe.getEtapaPlantilla().getClaveInterna();
            String estado = pe.getEstado() != null ? pe.getEstado() : "BLOQUEADA";

            if (pe.getNumeroNivel() != null && pe.getNumeroNivel() > 0) {
                mapa.put("estructura_n" + pe.getNumeroNivel() + "_" + claveBase, estado.toUpperCase());
            } else {
                mapa.put(claveBase, estado.toUpperCase());
            }
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

    private List<EtapaPlantilla> obtenerTerminalesEnSecuencia(String tipoObra, int nivelesProyecto) {
        List<EtapaPlantilla> roots =
                etapaPlantillaRepo.findByEtapaPadreIsNullAndTipoObraAndActivoTrueOrderByOrdenVisualAsc(tipoObra);

        List<EtapaPlantilla> terminales = new ArrayList<>();
        for (EtapaPlantilla root : roots) {
            appendTerminales(root, nivelesProyecto, terminales);
        }
        return terminales;
    }

    private void appendTerminales(EtapaPlantilla plantilla, int nivelesProyecto, List<EtapaPlantilla> destino) {
        if (!aplicaANiveles(plantilla, nivelesProyecto)) {
            return;
        }

        List<EtapaPlantilla> hijos =
                etapaPlantillaRepo.findByEtapaPadre_IdEtapaPlantillaOrderByOrdenVisualAsc(
                        plantilla.getIdEtapaPlantilla()
                );

        if (hijos == null || hijos.isEmpty()) {
            if (Boolean.TRUE.equals(plantilla.getEsTerminal())) {
                destino.add(plantilla);
            }
            return;
        }

        for (EtapaPlantilla hijo : hijos) {
            appendTerminales(hijo, nivelesProyecto, destino);
        }
    }
    
    private record EtapaProgramada(EtapaPlantilla plantilla, Integer numeroNivel) {}

    private List<EtapaProgramada> construirSecuenciaProgramada(List<EtapaPlantilla> plantillas, int nivelesProyecto) {
        List<EtapaProgramada> resultado = new ArrayList<>();
        List<EtapaPlantilla> bloqueRepetible = new ArrayList<>();

        for (EtapaPlantilla plantilla : plantillas) {
            if (!aplicaANiveles(plantilla, nivelesProyecto)) {
                continue;
            }

            if (Boolean.TRUE.equals(plantilla.getEsRepetiblePorNivel())) {
                bloqueRepetible.add(plantilla);
                continue;
            }

            flushBloqueRepetible(bloqueRepetible, nivelesProyecto, resultado);
            resultado.add(new EtapaProgramada(plantilla, null));
        }

        flushBloqueRepetible(bloqueRepetible, nivelesProyecto, resultado);
        return resultado;
    }

    private void flushBloqueRepetible(List<EtapaPlantilla> bloqueRepetible,
                                      int nivelesProyecto,
                                      List<EtapaProgramada> resultado) {
        if (bloqueRepetible == null || bloqueRepetible.isEmpty()) {
            return;
        }

        for (int nivel = 1; nivel <= nivelesProyecto; nivel++) {
            for (EtapaPlantilla plantilla : bloqueRepetible) {
                if (aplicaEnNivelRepetible(plantilla, nivel, nivelesProyecto)) {
                    resultado.add(new EtapaProgramada(plantilla, nivel));
                }
            }
        }

        bloqueRepetible.clear();
    }

    private boolean aplicaEnNivelRepetible(EtapaPlantilla plantilla, int nivel, int nivelesProyecto) {
        if (!aplicaANiveles(plantilla, nivelesProyecto)) {
            return false;
        }

        if (!Boolean.TRUE.equals(plantilla.getEsRepetiblePorNivel())) {
            return false;
        }

        int inicio = plantilla.getNivelInicioRepeticion() != null
                ? plantilla.getNivelInicioRepeticion()
                : 1;

        int fin = plantilla.getNivelFinRepeticion() != null
                ? plantilla.getNivelFinRepeticion()
                : nivelesProyecto;

        inicio = Math.max(1, inicio);
        fin = Math.min(nivelesProyecto, fin);

        return nivel >= inicio && nivel <= fin;
    }

}