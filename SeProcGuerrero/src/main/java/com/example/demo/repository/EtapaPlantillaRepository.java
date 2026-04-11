package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.modelo.EtapaPlantilla;

@Repository
public interface EtapaPlantillaRepository extends JpaRepository<EtapaPlantilla, Long> {

    List<EtapaPlantilla> findByEtapaPadreIsNullAndTipoObraAndActivoTrueOrderByOrdenVisualAsc(String tipoObra);

    List<EtapaPlantilla> findByEtapaPadre_IdEtapaPlantillaOrderByOrdenVisualAsc(Long idEtapaPadre);

    EtapaPlantilla findByClaveInterna(String claveInterna);

    List<EtapaPlantilla> findByTipoObraAndActivoTrueAndEsTerminalTrueOrderByOrdenVisualAsc(String tipoObra);
}