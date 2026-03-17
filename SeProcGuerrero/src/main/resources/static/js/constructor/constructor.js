function getCsrf() {
  const token = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
  const header = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');
  return { token, header };
}

function buildHeaders(extra = {}) {
  const { token, header } = getCsrf();
  const headers = new Headers(extra);
  if (token && header) headers.set(header, token);
  return headers;
}

// 
async function fetchText(url, options = {}) {
  const headers = buildHeaders({ 'Content-Type': 'application/json', ...(options.headers || {}) });
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

const profileBtn = document.getElementById('profileBtn');
const profileFile = document.getElementById('profileFile');
const profileImg = document.getElementById('profileImg');
const profileFallback = document.getElementById('profileFallback');

function addCacheBuster(url) {
  if (!url) return url;
  return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
}

function renderProfilePhoto(url) {
  if (!profileImg || !profileFallback) return;

  if (!url || url.trim() === "") {
    profileImg.style.display = 'none';
    profileFallback.style.display = 'block';
    return;
  }

  profileImg.onload = () => {
    profileImg.style.display = 'block';
    profileFallback.style.display = 'none';
  };

  profileImg.onerror = () => {
    profileImg.style.display = 'none';
    profileFallback.style.display = 'block';
  };

  profileImg.src = addCacheBuster(url);
}

async function uploadProfilePhoto(file) {
  const { token, header } = getCsrf();

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/constructor/perfil/foto", {
    method: "POST",
    body: form,
    headers: token && header ? { [header]: token } : {}
  });

  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data?.message || text || "No se pudo subir la foto.");
  }

  return data.url;
}

function initProfilePhoto() {
  const fotoUrl = profileBtn?.dataset?.foto;
  renderProfilePhoto(fotoUrl);

  profileBtn?.addEventListener('click', () => profileFile?.click());

  profileFile?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    profileImg.src = previewUrl;
    profileImg.style.display = 'block';
    profileFallback.style.display = 'none';

    try {
      const url = await uploadProfilePhoto(file);
      renderProfilePhoto(url);

      if (profileBtn) {
        profileBtn.dataset.foto = url;
      }
    } catch (err) {
      renderProfilePhoto(profileBtn?.dataset?.foto || "");
      await showCustomAlert(err.message || "Error al subir la foto.", "Error");
    } finally {
      profileFile.value = "";
    }
  });
}

const projectsView = document.getElementById('constructorProjectsView');
const passwordView = document.getElementById('constructorPasswordView');

document.addEventListener('submit', async (e) => {
  if (e.target.id === 'formCambiarPasswordConstructor') {
    e.preventDefault();

    const passActual = document.getElementById('passActualConstructor').value;
    const passNueva = document.getElementById('passNuevaConstructor').value;
    const passRepetida = document.getElementById('passRepetidaConstructor').value;

    const tieneNumero = /[0-9]/.test(passNueva);
    const tieneEspecial = /[^A-Za-z0-9]/.test(passNueva);

    if (passNueva.length < 8 || !tieneNumero || !tieneEspecial) {
      await showCustomAlert(
        "La nueva contraseña debe tener 8 caracteres como mínimo, 1 número y 1 carácter especial.",
        "Contraseña débil"
      );
      return;
    }

    if (passNueva !== passRepetida) {
      await showCustomAlert("Las contraseñas nuevas no coinciden.", "Error");
      return;
    }

    const payload = {
      passActual: passActual,
      passNueva: passNueva
    };

    const { ok, text } = await fetchText('/constructor/perfil/password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!ok) {
      await showCustomAlert(text || "Ocurrió un error al cambiar la contraseña.", "Error");
      return;
    }

    await showCustomAlert("Tu contraseña ha sido actualizada correctamente.", "Éxito");
    document.getElementById('formCambiarPasswordConstructor').reset();
  }
});

const customAlert = document.getElementById('customAlert');
const customAlertTitle = document.getElementById('customAlertTitle');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertOk = document.getElementById('customAlertOk');
const customAlertCancel = document.getElementById('customAlertCancel');

function closeCustomAlert() {
  customAlert?.classList.remove('open');
  customAlert?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function showCustomAlert(message, title = "Atención") {
  return new Promise((resolve) => {
    customAlertTitle.textContent = title;
    customAlertMessage.textContent = message;
    customAlertCancel.style.display = 'none';

    customAlert.classList.add('open');
    customAlert.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const handleOk = () => {
      closeCustomAlert();
      customAlertOk.removeEventListener('click', handleOk);
      resolve(true);
    };

    customAlertOk.addEventListener('click', handleOk);
  });
}

function showCustomConfirm(message, title = "Confirmar acción") {
  return new Promise((resolve) => {
    customAlertTitle.textContent = title;
    customAlertMessage.textContent = message;
    customAlertCancel.style.display = 'inline-flex';

    customAlert.classList.add('open');
    customAlert.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const handleOk = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      closeCustomAlert();
      customAlertOk.removeEventListener('click', handleOk);
      customAlertCancel.removeEventListener('click', handleCancel);
    };

    customAlertOk.addEventListener('click', handleOk);
    customAlertCancel.addEventListener('click', handleCancel);
  });
}

function openModal(modalEl, backdropEl) {
  modalEl?.classList.add('open');
  backdropEl?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl, backdropEl) {
  modalEl?.classList.remove('open');
  backdropEl?.classList.remove('open');
  document.body.style.overflow = '';
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function estadoDotClass(estado) {
  const s = (estado || '').toUpperCase();
  if (s === 'ACTIVO') return 'dot-aprobada';
  if (s === 'INACTIVO') return 'dot-pendiente';
  if (s === 'FINALIZADO') return 'dot-rechazada';
  return 'dot-pendiente';
}

/* =========================
modal de formulario
========================= */
const btnAddProyecto = document.getElementById('btnAddProyecto');
const projModal = document.getElementById('projModal');
const projModalBackdrop = document.getElementById('projModalBackdrop');

function openProjModal() {
  openModal(projModal, projModalBackdrop);
  loadEstados().catch(console.error);
}

function closeProjModal() {
  closeModal(projModal, projModalBackdrop);
}

btnAddProyecto?.addEventListener('click', openProjModal);
projModalBackdrop?.addEventListener('click', closeProjModal);
document.getElementById('btnCerrarProyecto')?.addEventListener('click', closeProjModal);

/* =========================
proyectos del constructor
========================= */
const searchConstructor = document.getElementById('searchConstructor');
const detalleModal = document.getElementById('detalleModal');
const detalleBackdrop = document.getElementById('detalleBackdrop');
const btnCerrarDetalle = document.getElementById('btnCerrarDetalle');
const detalleMeta = document.getElementById('detalleMeta');
const detalleBody = document.getElementById('detalleBody');
const badgeEstado = document.getElementById('badgeEstado');

let currentEstado = 'ACTIVO';
let currentList = [];

function renderCards(items) {
  const list = document.getElementById('constructorProjectsList');
  const empty = document.getElementById('constructorProjectsEmpty');
  if (!list || !empty) return;

  list.querySelectorAll('.card-sol').forEach(x => x.remove());

  if (!items || items.length === 0) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  for (const it of items) {
    const card = document.createElement('div');
    card.className = 'card-sol';

    const left = document.createElement('div');
    left.className = 'left';

    const school = document.createElement('div');
    school.className = 'school';
    school.textContent = it.nombreEscuela ?? '—';

    const meta = document.createElement('div');
    meta.className = 'meta';

    const dot = document.createElement('span');
    dot.className = `state-dot ${estadoDotClass(it.estadoProyecto)}`;

    const p1 = document.createElement('span');
    p1.textContent = `Supervisor: ${it.supervisor ?? '—'}`;

    const p2 = document.createElement('span');
    p2.textContent = `Fecha: ${it.fechaAprobacion ?? ''}`;

    meta.appendChild(dot);
    meta.appendChild(p1);
    meta.appendChild(p2);

    left.appendChild(school);
    left.appendChild(meta);

    const btn = document.createElement('button');
    btn.className = 'btn-detail';
    btn.type = 'button';
    btn.textContent = 'Ver detalle';
    btn.addEventListener('click', () => openDetalleProyecto(it.idProyecto));

    card.appendChild(left);
    card.appendChild(btn);
    list.appendChild(card);
  }
}

async function fetchProyectos(estado) {
  const res = await fetch(`/api/constructor/proyectos?estado=${encodeURIComponent(estado)}`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchDetalleProyecto(id) {
  const res = await fetch(`/api/constructor/proyectos/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

function renderDetalleProyecto(dto) {
  badgeEstado.textContent = (dto.estadoProyecto || '').toUpperCase();

  detalleMeta.innerHTML = `
    <div>Proyecto #${escapeHtml(dto.idProyecto)} • Solicitud #${escapeHtml(dto.idSolicitud)}</div>
    <div>Fecha de aprobación: ${escapeHtml(dto.fechaAprobacion ?? '')}</div>
    <div>Supervisor asignado: ${escapeHtml(dto.supervisorAsignado ?? '—')}</div>
  `;

  detalleBody.innerHTML = `
    <div class="placeholder-detail">
      <div class="ph-grid">
        <div class="ph-box">
          <div class="ph-label">Escuela</div>
          <div class="ph-value">${escapeHtml(dto.nombreEscuela)}</div>
        </div>

        <div class="ph-box">
          <div class="ph-label">Ubicación</div>
          <div class="ph-value">${escapeHtml(dto.estado)}, ${escapeHtml(dto.municipio)}, ${escapeHtml(dto.ciudad)}</div>
        </div>

        <div class="ph-box">
          <div class="ph-label">Tipo de obra</div>
          <div class="ph-value">${escapeHtml(dto.tipoObra)}</div>
        </div>

        <div class="ph-box">
          <div class="ph-label">Concepto</div>
          <div class="ph-value">${escapeHtml(dto.concepto)}</div>
        </div>
      </div>

      <div class="ph-note">
	  aqui después para subir evidencias
      </div>
    </div>
  `;
}

async function openDetalleProyecto(idProyecto) {
  try {
    const dto = await fetchDetalleProyecto(idProyecto);
    renderDetalleProyecto(dto);
    openModal(detalleModal, detalleBackdrop);
  } catch (e) {
   await showCustomAlert('No se pudo cargar el detalle: ' + e.message, 'Error');
  }
}

async function loadAndRenderProjects() {
  try {
    currentList = await fetchProyectos(currentEstado);
    renderCards(currentList);
  } catch (e) {
    await showCustomAlert('No se pudieron cargar los proyectos: ' + e.message, 'Error');
  }
}

document.querySelectorAll('#tabsConstructor .tab').forEach(tab => {
  tab.addEventListener('click', async () => {
    document.querySelectorAll('#tabsConstructor .tab').forEach(x => x.classList.remove('active'));
    tab.classList.add('active');
    currentEstado = tab.dataset.estado;
    await loadAndRenderProjects();
  });
});

searchConstructor?.addEventListener('input', () => {
  const q = (searchConstructor.value || '').toLowerCase().trim();

  if (!q) {
    renderCards(currentList);
    return;
  }

  const filtered = currentList.filter(x =>
    (x.nombreEscuela ?? '').toLowerCase().includes(q) ||
    (x.supervisor ?? '').toLowerCase().includes(q)
  );

  renderCards(filtered);
});

btnCerrarDetalle?.addEventListener('click', () => closeModal(detalleModal, detalleBackdrop));
detalleBackdrop?.addEventListener('click', () => closeModal(detalleModal, detalleBackdrop));

/* =========================
cascada de estado, municipio y localidad
========================= */
const selEstado = document.querySelector('#formSolicitudProyecto select[name="estado"]');
const selMunicipio = document.querySelector('#formSolicitudProyecto select[name="municipio"]');
const selCiudad = document.querySelector('#formSolicitudProyecto select[name="ciudad"]');

async function fillSelect(selectEl, items, placeholder = "Seleccionar") {
  selectEl.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
  for (const it of items) {
    const opt = document.createElement('option');
    opt.value = it.id;
    opt.textContent = it.nombre;
    selectEl.appendChild(opt);
  }
}

async function loadEstados() {
  const res = await fetch('/api/geo/estados');
  const data = await res.json();
  await fillSelect(selEstado, data);
  selMunicipio.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
  selCiudad.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
}

async function loadMunicipios() {
  const estadoId = selEstado.value;
  if (!estadoId) return;

  const res = await fetch(`/api/geo/municipios?estadoId=${encodeURIComponent(estadoId)}`);
  const data = await res.json();

  await fillSelect(selMunicipio, data);
  selCiudad.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
}

async function loadLocalidades() {
  const municipioId = selMunicipio.value;
  if (!municipioId) return;

  const res = await fetch(`/api/geo/localidades?municipioId=${encodeURIComponent(municipioId)}`);
  const data = await res.json();

  await fillSelect(selCiudad, data);
}

selEstado?.addEventListener('change', () => loadMunicipios().catch(console.error));
selMunicipio?.addEventListener('change', () => loadLocalidades().catch(console.error));

/* =========================
para enviar solicitudes de proyectos
========================= */
async function postSolicitud() {
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

  const headers = buildHeaders({ 'Content-Type': 'application/json' });

  const res = await fetch('/api/constructor/solicitudes', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al guardar');
  }
}

document.getElementById('btnEnviarSolicitud')?.addEventListener('click', async () => {
  const form = document.getElementById('formSolicitudProyecto');
  if (!form) return;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  try {
    await postSolicitud();
    closeProjModal();
    form.reset();
    await showCustomAlert('Solicitud enviada correctamente.', 'Éxito');
  } catch (e) {
    await showCustomAlert('No se pudo enviar: ' + e.message, 'Error');
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  if (detalleModal?.classList.contains('open')) {
    closeModal(detalleModal, detalleBackdrop);
    return;
  }

  if (projModal?.classList.contains('open')) {
    closeProjModal();
  }
});

loadAndRenderProjects();
initProfilePhoto();