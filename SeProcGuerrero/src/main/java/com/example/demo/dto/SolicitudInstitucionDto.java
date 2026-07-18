package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SolicitudInstitucionDto {
    @NotBlank(
            message = "El nombre oficial de la dependencia es obligatorio."
        )
        @Size(
            min = 3,
            max = 200,
            message = "El nombre de la dependencia debe contener entre 3 y 200 caracteres."
        )
        @Pattern(
            regexp = "^[\\p{L}\\p{M}\\p{N}](?:[\\p{L}\\p{M}\\p{N} .,'’&()/#º°:-]*[\\p{L}\\p{M}\\p{N}).º°])?$",
            message = "Utiliza un nombre oficial válido para la dependencia."
        )
        private String nombreDependencia;

        @NotBlank(
            message = "Las siglas o abreviación son obligatorias."
        )
        @Size(
            min = 2,
            max = 50,
            message = "La abreviación debe contener entre 2 y 50 caracteres."
        )
        @Pattern(
            regexp = "^[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*$",
            message = "La abreviación debe iniciar con una letra y solo puede contener letras, números y guiones."
        )
        private String abreviacion;

        @NotBlank(
            message = "El nombre del contacto es obligatorio."
        )
        @Size(
            max = 250,
            message = "El nombre del contacto no puede superar los 250 caracteres."
        )
        @Pattern(
            regexp = "^[\\p{L}\\p{M}]+(?:[ '’][\\p{L}\\p{M}]+)*$",
            message = "El nombre solo puede contener letras, espacios y apóstrofes."
        )
        private String nombreContacto;

        @NotBlank(
            message = "El correo electrónico es obligatorio."
        )
        @Size(
            max = 100,
            message = "El correo electrónico no puede superar los 100 caracteres."
        )
        @Email(
            regexp = "^[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,63}$",
            message = "Escribe un correo electrónico válido."
        )
        private String emailContacto;

        @NotBlank(
            message = "El teléfono del contacto es obligatorio."
        )
        @Size(
            max = 20,
            message = "El teléfono no puede superar los 20 caracteres."
        )
        @Pattern(
            regexp = "^(?:\\+52[ -]?)?(?:[0-9]{10}|[0-9]{3}[ -][0-9]{3}[ -][0-9]{4}|\\([0-9]{3}\\)[ -]?[0-9]{3}[ -][0-9]{4})$",
            message = "Escribe un teléfono mexicano válido de 10 dígitos."
        )
        private String telefonoContacto;
}
