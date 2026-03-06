package com.example.demo.repository;

import com.example.demo.modelo.Proyecto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProyectoRepository extends JpaRepository<Proyecto, Integer> {

    boolean existsBySolicitud_IdSolicitud(Integer idSolicitud);

    Optional<Proyecto> findBySolicitud_IdSolicitud(Integer idSolicitud);

    List<Proyecto> findByEstadoProyectoOrderByFechaAprobacionDesc(String estadoProyecto);
}