package com.example.demo.modelo;

import jakarta.persistence.*;

@Entity
@Table(name = "tipo_edificacion")
public class TipoEdificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_edificacion")
    private Integer idTipoEdificacion;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "numero_niveles", nullable = false)
    private Integer numeroNiveles;

    @Column(name = "activo", nullable = false)
    private Boolean activo;

    public Integer getIdTipoEdificacion() {
        return idTipoEdificacion;
    }

    public void setIdTipoEdificacion(Integer idTipoEdificacion) {
        this.idTipoEdificacion = idTipoEdificacion;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Integer getNumeroNiveles() {
        return numeroNiveles;
    }

    public void setNumeroNiveles(Integer numeroNiveles) {
        this.numeroNiveles = numeroNiveles;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}