package com.example.demo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.modelo.ProyectoEtapa;

@Repository
public interface ProyectoEtapaRepository extends JpaRepository<ProyectoEtapa, Long> {

    List<ProyectoEtapa> findByProyecto_IdProyectoOrderByOrdenVisualAsc(Integer idProyecto);

    Optional<ProyectoEtapa> findByProyecto_IdProyectoAndEtapaPlantilla_ClaveInternaAndNumeroNivel(Integer idProyecto,
                                                                                                  String claveInterna,
                                                                                                  Integer numeroNivel);

    Optional<ProyectoEtapa> findByProyecto_IdProyectoAndEtapaPlantilla_ClaveInternaAndNumeroNivelIsNull(Integer idProyecto,
                                                                                                          String claveInterna);

    Optional<ProyectoEtapa> findFirstByProyecto_IdProyectoAndOrdenVisualGreaterThanAndEstadoOrderByOrdenVisualAsc(Integer idProyecto,
                                                                                                                   Integer ordenVisual,
                                                                                                                   String estado);
}