package com.example.demo.repository;

import com.example.demo.modelo.SolicitudProyecto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SolicitudProyectoRepository extends JpaRepository<SolicitudProyecto, Integer> {

    // para el central lista por estado de solicitud
    List<SolicitudProyecto> findByEstadoSolicitudOrderByFechaSolicitudDesc(String estadoSolicitud);

    // para el constructor ve sus solicitudes
    List<SolicitudProyecto> findByIdUsuarioContratistaOrderByFechaSolicitudDesc(Integer idUsuarioContratista);
}