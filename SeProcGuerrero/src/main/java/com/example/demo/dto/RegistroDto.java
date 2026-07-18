package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegistroDto {

	@NotBlank(message = "El nombre de usuario es obligatorio.")
	@Size(
		min = 4,
		max = 50,
		message = "El nombre de usuario debe contener entre 4 y 50 caracteres."
	)
	@Pattern(
		regexp = "^[A-Za-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$",
		message = "El usuario debe iniciar con una letra y solo puede contener letras, números, punto, guion y guion bajo."
	)
	private String username;

	@NotBlank(message = "La contraseña es obligatoria.")
	@Size(
		min = 8,
		max = 64,
		message = "La contraseña debe contener entre 8 y 64 caracteres."
	)
	@Pattern(
		regexp = "^(?=.*\\p{Ll})(?=.*\\p{Lu})(?=.*[0-9])(?=.*[^\\p{L}\\p{N}\\s])\\S+$",
		message = "La contraseña debe incluir mayúscula, minúscula, número, carácter especial y no contener espacios."
	)
	private String password;

	@NotBlank(message = "El nombre es obligatorio.")
	@Size(
		max = 250,
		message = "El nombre no puede superar los 250 caracteres."
	)
	@Pattern(
		regexp = "^[\\p{L}\\p{M}]+(?:[ '’][\\p{L}\\p{M}]+)*$",
		message = "El nombre solo puede contener letras, espacios y apóstrofes."
	)
	private String nombre;

	@NotBlank(message = "Los apellidos son obligatorios.")
	@Size(
		max = 250,
		message = "Los apellidos no pueden superar los 250 caracteres."
	)
	@Pattern(
		regexp = "^[\\p{L}\\p{M}]+(?:[ '’][\\p{L}\\p{M}]+)*$",
		message = "Los apellidos solo pueden contener letras, espacios y apóstrofes."
	)
	private String apellido;

	@NotBlank(message = "El correo electrónico es obligatorio.")
	@Size(
		max = 100,
		message = "El correo electrónico no puede superar los 100 caracteres."
	)
	@Email(
		regexp = "^[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,63}$",
		message = "Escribe un correo electrónico válido."
	)
	private String email;

}
