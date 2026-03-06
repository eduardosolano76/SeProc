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

// ===== Cascada Estado -> Municipio -> Localidad =====
const selEstado = document.querySelector('#formSolicitudProyecto select[name="estado"]');
const selMunicipio = document.querySelector('#formSolicitudProyecto select[name="municipio"]');
const selCiudad = document.querySelector('#formSolicitudProyecto select[name="ciudad"]'); // aquí guardaremos id_localidad

async function fillSelect(selectEl, items, placeholder="Seleccionar"){
  selectEl.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
  for (const it of items){
    const opt = document.createElement('option');
    opt.value = it.id;
    opt.textContent = it.nombre;
    selectEl.appendChild(opt);
  }
}

async function loadEstados(){
  const res = await fetch('/api/geo/estados');
  const data = await res.json();
  await fillSelect(selEstado, data);
  selMunicipio.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
  selCiudad.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
}

async function loadMunicipios(){
  const estadoId = selEstado.value;
  if(!estadoId) return;
  const res = await fetch(`/api/geo/municipios?estadoId=${encodeURIComponent(estadoId)}`);
  const data = await res.json();
  await fillSelect(selMunicipio, data);
  selCiudad.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
}

async function loadLocalidades(){
  const municipioId = selMunicipio.value;
  if(!municipioId) return;
  const res = await fetch(`/api/geo/localidades?municipioId=${encodeURIComponent(municipioId)}`);
  const data = await res.json();
  await fillSelect(selCiudad, data); // ciudad = localidad
}

// Cuando abras modal, carga estados
function openProjModal(){
  projModal?.classList.add('open');
  projModalBackdrop?.classList.add('open');
  document.body.style.overflow = 'hidden';
  loadEstados().catch(console.error);
}

// listeners cascada
selEstado?.addEventListener('change', () => loadMunicipios().catch(console.error));
selMunicipio?.addEventListener('change', () => loadLocalidades().catch(console.error));


// ===== Enviar solicitud =====
async function postSolicitud(){
  const form = document.getElementById('formSolicitudProyecto');

  const payload = {
    nombreEscuela: form.nombreEscuela.value.trim(),
    cct1: form.cct1.value.trim(),
    cct2: form.cct2.value.trim(),

    idEstado: parseInt(selEstado.value, 10),
    idMunicipio: parseInt(selMunicipio.value, 10),
    idLocalidad: parseInt(selCiudad.value, 10),

    calleNumero: form.calleNumero.value.trim(),
    cp: form.cp.value.trim(),

    responsable: form.responsable.value.trim(),
    contacto: form.contacto.value.trim(),

    numInmuebles: parseInt(form.numInmuebles.value, 10),
    numEntreEjes: parseInt(form.numEntreEjes.value, 10),

    tipoObra: form.tipoObra.value,
    concepto: form.concepto.value.trim()
  };

  const csrfToken = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
  const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');

  const headers = { 'Content-Type': 'application/json' };
  if (csrfToken && csrfHeader) {
    headers[csrfHeader] = csrfToken;
  }

  const res = await fetch('/api/constructor/solicitudes', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if(!res.ok){
    const msg = await res.text();
    throw new Error(msg || 'Error al guardar');
  }
}

document.getElementById('btnEnviarSolicitud')?.addEventListener('click', async () => {
  const form = document.getElementById('formSolicitudProyecto');
  if(!form) return;

  if(!form.checkValidity()){
    form.reportValidity();
    return;
  }

  try{
    await postSolicitud();
    closeProjModal();
    alert('Solicitud enviada');
    form.reset();
  }catch(e){
    alert('No se pudo enviar: ' + e.message);
  }
});