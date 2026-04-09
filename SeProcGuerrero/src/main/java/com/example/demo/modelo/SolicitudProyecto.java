package com.example.demo.modelo;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "solicitud_proyecto")
public class SolicitudProyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitud")
    private Integer idSolicitud;

    @Column(name = "id_usuario_contratista", nullable = false)
    private Long idUsuarioContratista;

    @Column(name = "id_usuario_central")
    private Long idUsuarioCentral;

    @Column(name = "estado_solicitud", nullable = false)
    private String estadoSolicitud;

    @Column(name = "motivo_rechazo", length = 500)
    private String motivoRechazo;

    @Column(name = "fecha_solicitud", nullable = false)
    private LocalDateTime fechaSolicitud;

    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;

    @Column(name = "nombre_escuela", nullable = false, length = 200)
    private String nombreEscuela;

    @Column(name = "cct1", nullable = false, length = 20)
    private String cct1;

    @Column(name = "cct2", length = 20)
    private String cct2;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_estado", nullable = false)
    private CatEstado estado;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_municipio", nullable = false)
    private CatMunicipio municipio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_localidad", nullable = false)
    private CatLocalidad localidad;

    @Column(name = "calle_numero", nullable = false, length = 200)
    private String calleNumero;

    @Column(name = "cp", nullable = false, length = 10)
    private String cp;

    @Column(name = "responsable_inmueble", nullable = false, length = 150)
    private String responsableInmueble;

    @Column(name = "contacto", nullable = false, length = 150)
    private String contacto;

    @Column(name = "num_inmuebles_evaluar", nullable = false)
    private Integer numInmueblesEvaluar;

    @Column(name = "num_entre_ejes", nullable = false)
    private Integer numEntreEjes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_tipo_edificacion", nullable = false)
    private TipoEdificacion tipoEdificacion;

    @Column(name = "tipo_obra", nullable = false, length = 100)
    private String tipoObra;

    @PrePersist
    void prePersist() {
        if (fechaSolicitud == null) {
            fechaSolicitud = LocalDateTime.now();
        }
        if (estadoSolicitud == null || estadoSolicitud.isBlank()) {
            estadoSolicitud = "PENDIENTE";
        }
    }

    public Integer getIdSolicitud() {
        return idSolicitud;
    }

    public void setIdSolicitud(Integer idSolicitud) {
        this.idSolicitud = idSolicitud;
    }

    public Long getIdUsuarioContratista() {
        return idUsuarioContratista;
    }

    public void setIdUsuarioContratista(Long idUsuarioContratista) {
        this.idUsuarioContratista = idUsuarioContratista;
    }

    public Long getIdUsuarioCentral() {
        return idUsuarioCentral;
    }

    public void setIdUsuarioCentral(Long idUsuarioCentral) {
        this.idUsuarioCentral = idUsuarioCentral;
    }

    public String getEstadoSolicitud() {
        return estadoSolicitud;
    }

    public void setEstadoSolicitud(String estadoSolicitud) {
        this.estadoSolicitud = estadoSolicitud;
    }

    public String getMotivoRechazo() {
        return motivoRechazo;
    }

    public void setMotivoRechazo(String motivoRechazo) {
        this.motivoRechazo = motivoRechazo;
    }

    public LocalDateTime getFechaSolicitud() {
        return fechaSolicitud;
    }

    public void setFechaSolicitud(LocalDateTime fechaSolicitud) {
        this.fechaSolicitud = fechaSolicitud;
    }

    public LocalDateTime getFechaResolucion() {
        return fechaResolucion;
    }

    public void setFechaResolucion(LocalDateTime fechaResolucion) {
        this.fechaResolucion = fechaResolucion;
    }

    public String getNombreEscuela() {
        return nombreEscuela;
    }

    public void setNombreEscuela(String nombreEscuela) {
        this.nombreEscuela = nombreEscuela;
    }

    public String getCct1() {
        return cct1;
    }

    public void setCct1(String cct1) {
        this.cct1 = cct1;
    }

    public String getCct2() {
        return cct2;
    }

    public void setCct2(String cct2) {
        this.cct2 = cct2;
    }

    public CatEstado getEstado() {
        return estado;
    }

    public void setEstado(CatEstado estado) {
        this.estado = estado;
    }

    public CatMunicipio getMunicipio() {
        return municipio;
    }

    public void setMunicipio(CatMunicipio municipio) {
        this.municipio = municipio;
    }

    public CatLocalidad getLocalidad() {
        return localidad;
    }

    public void setLocalidad(CatLocalidad localidad) {
        this.localidad = localidad;
    }

    public String getCalleNumero() {
        return calleNumero;
    }

    public void setCalleNumero(String calleNumero) {
        this.calleNumero = calleNumero;
    }

    public String getCp() {
        return cp;
    }

    public void setCp(String cp) {
        this.cp = cp;
    }

    public String getResponsableInmueble() {
        return responsableInmueble;
    }

    public void setResponsableInmueble(String responsableInmueble) {
        this.responsableInmueble = responsableInmueble;
    }

    public String getContacto() {
        return contacto;
    }

    public void setContacto(String contacto) {
        this.contacto = contacto;
    }

    public Integer getNumInmueblesEvaluar() {
        return numInmueblesEvaluar;
    }

    public void setNumInmueblesEvaluar(Integer numInmueblesEvaluar) {
        this.numInmueblesEvaluar = numInmueblesEvaluar;
    }

    public Integer getNumEntreEjes() {
        return numEntreEjes;
    }

    public void setNumEntreEjes(Integer numEntreEjes) {
        this.numEntreEjes = numEntreEjes;
    }

    public TipoEdificacion getTipoEdificacion() {
        return tipoEdificacion;
    }

    public void setTipoEdificacion(TipoEdificacion tipoEdificacion) {
        this.tipoEdificacion = tipoEdificacion;
    }

    public String getTipoObra() {
        return tipoObra;
    }

    public void setTipoObra(String tipoObra) {
        this.tipoObra = tipoObra;
    }
}