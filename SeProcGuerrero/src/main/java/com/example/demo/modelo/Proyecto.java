package com.example.demo.modelo;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proyecto")
public class Proyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_proyecto")
    private Integer idProyecto;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_solicitud", nullable = false, unique = true)
    private SolicitudProyecto solicitud;

    @Column(name = "id_usuario_supervisor", nullable = false)
    private Long idUsuarioSupervisor;

    @Column(name = "estado_proyecto", nullable = false)
    private String estadoProyecto; // ACTIVO/INACTIVO/RECHAZADO/FINALIZADO

    @Column(name = "fecha_aprobacion", nullable = false)
    private LocalDateTime fechaAprobacion;

    @PrePersist
    void prePersist() {
        if (fechaAprobacion == null) fechaAprobacion = LocalDateTime.now();
        if (estadoProyecto == null) estadoProyecto = "ACTIVO";
    }

    // getters/setters
    public Integer getIdProyecto() { return idProyecto; }
    public void setIdProyecto(Integer idProyecto) { this.idProyecto = idProyecto; }

    public SolicitudProyecto getSolicitud() { return solicitud; }
    public void setSolicitud(SolicitudProyecto solicitud) { this.solicitud = solicitud; }

    public Long getIdUsuarioSupervisor() { return idUsuarioSupervisor; }
    public void setIdUsuarioSupervisor(Long idUsuarioSupervisor) { this.idUsuarioSupervisor = idUsuarioSupervisor; }

    public String getEstadoProyecto() { return estadoProyecto; }
    public void setEstadoProyecto(String estadoProyecto) { this.estadoProyecto = estadoProyecto; }

    public LocalDateTime getFechaAprobacion() { return fechaAprobacion; }
    public void setFechaAprobacion(LocalDateTime fechaAprobacion) { this.fechaAprobacion = fechaAprobacion; }
}