// ===== Formulario =====
const btnAddProyecto = document.getElementById('btnAddProyecto');
const projModal = document.getElementById('projModal');
const projModalBackdrop = document.getElementById('projModalBackdrop');

function openProjModal(){
  projModal?.classList.add('open');
  projModalBackdrop?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProjModal(){
  projModal?.classList.remove('open');
  projModalBackdrop?.classList.remove('open');
  document.body.style.overflow = '';
}

btnAddProyecto?.addEventListener('click', openProjModal);
projModalBackdrop?.addEventListener('click', closeProjModal);

document.getElementById('btnCerrarProyecto')?.addEventListener('click', closeProjModal);


window.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && projModal?.classList.contains('open')){
    closeProjModal();
  }
});

// Botón "Enviar solicitud" pero mientras no jala
document.getElementById('btnEnviarSolicitud')?.addEventListener('click', () => {
  const form = document.getElementById('formSolicitudProyecto');
  if(!form) return;

  if(!form.checkValidity()){
    form.reportValidity();
    return;
  }

  // Por ahora no guarda solo cierra
  closeProjModal();
});