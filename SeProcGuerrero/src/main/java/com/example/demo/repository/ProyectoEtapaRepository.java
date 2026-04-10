package com.example.demo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.modelo.ProyectoEtapa;

@Repository
public interface ProyectoEtapaRepository extends JpaRepository<ProyectoEtapa, Long> {
	
	// Buscar todas las etapas de un proyecto en específico, ordenadas para mostrarlas
    List<ProyectoEtapa> findByProyecto_IdProyectoOrderByOrdenVisualAsc(Integer idProyecto);

    Optional<ProyectoEtapa> findByProyecto_IdProyectoAndEtapaPlantilla_ClaveInterna(Integer idProyecto, String claveInterna);

}
