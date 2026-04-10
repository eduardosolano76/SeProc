package com.example.demo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.modelo.ProyectoEtapaEntrega;

@Repository
public interface ProyectoEtapaEntregaRepository extends JpaRepository<ProyectoEtapaEntrega, Long> {
	
	// Obtener todas las entregas de una etapa específica
    List<ProyectoEtapaEntrega> findByProyectoEtapa_IdProyectoEtapa(Long idProyectoEtapa);

    // Obtener la entrega más reciente (última versión) de una etapa en particular
    Optional<ProyectoEtapaEntrega> findTopByProyectoEtapa_IdProyectoEtapaOrderByFechaSubidaDesc(Long idProyectoEtapa);

}
