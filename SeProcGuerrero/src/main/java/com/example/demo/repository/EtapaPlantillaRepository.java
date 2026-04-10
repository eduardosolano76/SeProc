package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.modelo.EtapaPlantilla;

@Repository
public interface EtapaPlantillaRepository extends JpaRepository<EtapaPlantilla, Long> {
	
	// Buscar etapas principales por tipo de obra (donde el padre es null)
    List<EtapaPlantilla> findByEtapaPadreIsNullAndTipoObraAndActivoTrueOrderByOrdenVisualAsc(String tipoObra);

    // Buscar sub-etapas de un padre específico
    List<EtapaPlantilla> findByEtapaPadre_IdEtapaPlantillaOrderByOrdenVisualAsc(Long idEtapaPadre);

    // Buscar por clave interna (ej. "cimentacion")
    EtapaPlantilla findByClaveInterna(String claveInterna);

}
