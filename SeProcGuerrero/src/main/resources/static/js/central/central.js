function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getViewFromUrl(href) {
  const u = new URL(href, window.location.origin);
  return u.searchParams.get("view") || "solicitudes";
}

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

function setActiveNav(id) {
  document.querySelectorAll('.nav .nav-item').forEach(x => x.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function setActiveSubItem(clicked) {
  document.querySelectorAll('#submenuUsuarios .sub-item').forEach(x => x.classList.remove('active'));
  clicked?.classList.add('active');
}

function syncSidebarWithView(view) {
  const navUsuarios = document.getElementById('navUsuarios');
  const submenuUsuarios = document.getElementById('submenuUsuarios');

  if (view.startsWith('usuarios-')) {
    setActiveNav('navUsuarios');
    navUsuarios?.setAttribute('data-open', 'true');
    submenuUsuarios?.classList.add('open');

    const link = document.querySelector(`#submenuUsuarios .sub-item[data-view="${view}"]`);
    document.querySelectorAll('#submenuUsuarios .sub-item').forEach(x => x.classList.remove('active'));
    link?.classList.add('active');
  } else {
    document.querySelectorAll('#submenuUsuarios .sub-item').forEach(x => x.classList.remove('active'));
    navUsuarios?.setAttribute('data-open', 'false');
    submenuUsuarios?.classList.remove('open');

    if (view === 'proyectos') setActiveNav('navProyectos');
    else setActiveNav('navSolicitudes');
  }
}

function syncAddButton(view) {
  const btnAdd = document.getElementById('btnAdd');
  const btnAddIcon = document.getElementById('btnAddIcon');
  if (!btnAdd || !btnAddIcon) return;

  if (view.startsWith('usuarios-')) {
    btnAdd.style.display = 'inline-flex';
    btnAdd.dataset.action = 'usuario';
    btnAdd.dataset.rol =
      view === 'usuarios-supervisores' ? 'supervisor' :
      view === 'usuarios-constructores' ? 'contratista' :
      view === 'usuarios-directores' ? 'direccion' : '';
    btnAddIcon.src = '/assets/iconos/agregar-usuario.png';
  } else {
    btnAdd.style.display = 'none';
    btnAdd.dataset.action = '';
    btnAdd.dataset.rol = '';
  }
}

const panelContent = document.getElementById('panelContent');
const sectionTitle = document.getElementById('sectionTitle');
const sectionSubtitle = document.getElementById('sectionSubtitle');
const searchInput = document.getElementById('searchCentral');

async function loadPanelFromUrl(href, push = true) {
  if (!panelContent) {
    window.location.href = href;
    return;
  }

  const view = getViewFromUrl(href);

  if (view === 'solicitudes' || view === 'proyectos') {
    window.location.href = href;
    return;
  }

  panelContent.innerHTML = `<div class="panel-sub">Cargando...</div>`;

  try {
    const res = await fetch(href, {
      cache: 'no-store',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const newPanelContent = doc.getElementById('panelContent');
    if (newPanelContent) {
      panelContent.innerHTML = newPanelContent.innerHTML;
    } else {
      panelContent.innerHTML = html;
    }

    if (sectionTitle) {
      sectionTitle.textContent =
        view === 'usuarios-supervisores' ? 'Supervisores' :
        view === 'usuarios-constructores' ? 'Constructores' :
        view === 'usuarios-directores' ? 'Directores' : 'Usuarios';
    }

    if (sectionSubtitle) {
      sectionSubtitle.textContent = 'Gestiona usuarios del sistema';
    }

    if (push) history.pushState({ href }, '', href);

    syncSidebarWithView(view);
    syncAddButton(view);
    bindUserRowClicks();
  } catch (e) {
    window.location.href = href;
  }
}

document.getElementById('navSolicitudes')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = '/central?view=solicitudes';
});

document.getElementById('navProyectos')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = '/central?view=proyectos';
});

const navUsuarios = document.getElementById('navUsuarios');
const submenuUsuarios = document.getElementById('submenuUsuarios');

navUsuarios?.addEventListener('click', () => {
  const isOpen = navUsuarios.getAttribute('data-open') === 'true';
  navUsuarios.setAttribute('data-open', String(!isOpen));
  submenuUsuarios?.classList.toggle('open', !isOpen);
  setActiveNav('navUsuarios');
});

document.querySelectorAll('#submenuUsuarios .sub-item').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const href = a.getAttribute('href');
    if (!href) return;
    setActiveNav('navUsuarios');
    setActiveSubItem(a);
    navUsuarios?.setAttribute('data-open', 'true');
    submenuUsuarios?.classList.add('open');
    loadPanelFromUrl(href, true);
  });
});

window.addEventListener('popstate', (e) => {
  const href = (e.state && e.state.href) ? e.state.href : window.location.href;
  const view = getViewFromUrl(href);
  if (view === 'solicitudes' || view === 'proyectos') {
    window.location.href = href;
    return;
  }
  loadPanelFromUrl(href, false);
});

const detalleModal = document.getElementById('detalleModal');
const detalleBackdrop = document.getElementById('detalleBackdrop');
const btnCerrarDetalle = document.getElementById('btnCerrarDetalle');
const detalleMeta = document.getElementById('detalleMeta');
const detalleBody = document.getElementById('detalleBody');
const badgeEstado = document.getElementById('badgeEstado');
const detalleActions = document.getElementById('detalleActions');
const detalleProyectoActions = document.getElementById('detalleProyectoActions');

const btnAprobar = document.getElementById('btnAprobar');
const btnRechazar = document.getElementById('btnRechazar');

const btnProyectoActivo = document.getElementById('btnProyectoActivo');
const btnProyectoInactivo = document.getElementById('btnProyectoInactivo');
const btnProyectoFinalizado = document.getElementById('btnProyectoFinalizado');

const supModal = document.getElementById('supModal');
const supBackdrop = document.getElementById('supBackdrop');
const btnCerrarSup = document.getElementById('btnCerrarSup');
const selectSupervisor = document.getElementById('selectSupervisor');
const btnConfirmarAprobar = document.getElementById('btnConfirmarAprobar');

const motivoModal = document.getElementById('motivoModal');
const motivoBackdrop = document.getElementById('motivoBackdrop');
const btnCerrarMotivo = document.getElementById('btnCerrarMotivo');
const txtMotivo = document.getElementById('txtMotivo');
const btnConfirmarRechazo = document.getElementById('btnConfirmarRechazo');

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
  if (s === 'PENDIENTE') return 'dot-pendiente';
  if (s === 'APROBADA') return 'dot-aprobada';
  if (s === 'RECHAZADA') return 'dot-rechazada';
  if (s === 'ACTIVO') return 'dot-aprobada';
  if (s === 'INACTIVO') return 'dot-pendiente';
  if (s === 'FINALIZADO') return 'dot-rechazada';
  return 'dot-pendiente';
}

function setBadge(estado) {
  badgeEstado.textContent = (estado || '').toUpperCase();
}

let currentView = getParam('view') || 'solicitudes';
let currentEstado = currentView === 'proyectos' ? 'ACTIVO' : 'PENDIENTE';
let currentList = [];
let selectedSolicitudId = null;
let selectedProyectoId = null;
let mode = currentView === 'proyectos' ? 'PROYECTOS' : 'SOLICITUDES';

function renderCards(items, containerId, emptyId, type) {
  const list = document.getElementById(containerId);
  const empty = document.getElementById(emptyId);
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
    dot.className = `state-dot ${estadoDotClass(type === 'SOLICITUD' ? it.estadoSolicitud : it.estadoProyecto)}`;

    const p1 = document.createElement('span');
    p1.textContent = `Constructor: ${it.constructor ?? '—'}`;

    const p2 = document.createElement('span');
    p2.textContent = type === 'SOLICITUD'
      ? `Fecha: ${it.fechaSolicitud ?? ''}`
      : `Supervisor: ${it.supervisor ?? '—'}`;

    meta.appendChild(dot);
    meta.appendChild(p1);
    meta.appendChild(p2);

    left.appendChild(school);
    left.appendChild(meta);

    const btn = document.createElement('button');
    btn.className = 'btn-detail';
    btn.type = 'button';
    btn.textContent = 'Ver detalle';
    btn.addEventListener('click', () => {
      if (type === 'SOLICITUD') openDetalleSolicitud(it.idSolicitud);
      else openDetalleProyecto(it.idProyecto);
    });

    card.appendChild(left);
    card.appendChild(btn);
    list.appendChild(card);
  }
}

async function fetchSolicitudes(estado) {
  const res = await fetch(`/api/central/solicitudes?estado=${encodeURIComponent(estado)}`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchDetalleSolicitud(id) {
  const res = await fetch(`/api/central/solicitudes/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchSupervisores() {
  const res = await fetch(`/api/central/solicitudes/supervisores`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function postAprobar(idSolicitud, supervisorId) {
  const url = `/api/central/solicitudes/${idSolicitud}/aprobar?supervisorId=${encodeURIComponent(supervisorId)}`;
  const res = await fetch(url, { method: 'POST', headers: buildHeaders() });
  if (!res.ok) throw new Error(await res.text());
}

async function postRechazar(idSolicitud, motivo) {
  const url = `/api/central/solicitudes/${idSolicitud}/rechazar?motivo=${encodeURIComponent(motivo)}`;
  const res = await fetch(url, { method: 'POST', headers: buildHeaders() });
  if (!res.ok) throw new Error(await res.text());
}

async function fetchProyectos(estado) {
  const res = await fetch(`/api/central/proyectos?estado=${encodeURIComponent(estado)}`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchDetalleProyecto(id) {
  const res = await fetch(`/api/central/proyectos/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function cambiarEstadoProyecto(id, estado) {
  const res = await fetch(`/api/central/proyectos/${id}/estado?estado=${encodeURIComponent(estado)}`, {
    method: 'POST',
    headers: buildHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
}

function renderDetalleSolicitud(dto) {
  mode = 'SOLICITUDES';
  detalleActions.style.display = (dto.estadoSolicitud || '').toUpperCase() === 'PENDIENTE' ? 'flex' : 'none';
  detalleProyectoActions.style.display = 'none';

  setBadge(dto.estadoSolicitud);

  const lines = [];
  lines.push(`Solicitud #${dto.idSolicitud} • ${dto.fechaSolicitud ?? ''}`);
  lines.push(`Enviada por: ${dto.quienEnvia ?? '—'}`);

  if ((dto.estadoSolicitud || '').toUpperCase() === 'APROBADA' && dto.supervisorAsignado) {
    lines.push(`Supervisor asignado: ${dto.supervisorAsignado}`);
  }
  if ((dto.estadoSolicitud || '').toUpperCase() === 'RECHAZADA' && dto.motivoRechazo) {
    lines.push(`Motivo: ${dto.motivoRechazo}`);
  }

  detalleMeta.innerHTML = lines.map(x => `<div>${x}</div>`).join('');

  detalleBody.innerHTML = renderDetalleForm(dto);
}

function renderDetalleProyecto(dto) {
  mode = 'PROYECTOS';
  detalleActions.style.display = 'none';
  detalleProyectoActions.style.display = 'flex';

  setBadge(dto.estadoProyecto);

  const lines = [];
  lines.push(`Proyecto #${dto.idProyecto} • Solicitud #${dto.idSolicitud}`);
  lines.push(`Fecha de aprobación: ${dto.fechaAprobacion ?? ''}`);
  lines.push(`Constructor: ${dto.quienEnvia ?? '—'}`);
  lines.push(`Supervisor asignado: ${dto.supervisorAsignado ?? '—'}`);

  detalleMeta.innerHTML = lines.map(x => `<div>${x}</div>`).join('');
  detalleBody.innerHTML = renderDetalleForm(dto);
}

function renderDetalleForm(dto) {
  return `
    <div class="ro-grid ro-1">
      <div class="ro-field">
        <label class="ro-label">Nombre de la escuela</label>
        <input class="ro-input" value="${escapeHtml(dto.nombreEscuela)}" readonly>
      </div>
    </div>

    <div class="ro-grid ro-2">
      <div class="ro-field">
        <label class="ro-label">CCT</label>
        <input class="ro-input" value="${escapeHtml(dto.cct1)}" readonly>
      </div>
      <div class="ro-field">
        <label class="ro-label">CCT (opcional)</label>
        <input class="ro-input" value="${escapeHtml(dto.cct2 ?? '')}" readonly>
      </div>
    </div>

    <div class="ro-grid ro-3">
      <div class="ro-field">
        <label class="ro-label">Estado</label>
        <input class="ro-input" value="${escapeHtml(dto.estado)}" readonly>
      </div>
      <div class="ro-field">
        <label class="ro-label">Municipio</label>
        <input class="ro-input" value="${escapeHtml(dto.municipio)}" readonly>
      </div>
      <div class="ro-field">
        <label class="ro-label">Localidad</label>
        <input class="ro-input" value="${escapeHtml(dto.ciudad)}" readonly>
      </div>
    </div>

    <div class="ro-grid ro-2">
      <div class="ro-field">
        <label class="ro-label">Calle y número</label>
        <input class="ro-input" value="${escapeHtml(dto.calleNumero)}" readonly>
      </div>
      <div class="ro-field">
        <label class="ro-label">C.P.</label>
        <input class="ro-input" value="${escapeHtml(dto.cp)}" readonly>
      </div>
    </div>

    <div class="ro-grid ro-3">
      <div class="ro-field">
        <label class="ro-label">Responsable del inmueble</label>
        <input class="ro-input" value="${escapeHtml(dto.responsableInmueble)}" readonly>
      </div>
      <div class="ro-field">
        <label class="ro-label">Contacto</label>
        <input class="ro-input" value="${escapeHtml(dto.contacto)}" readonly>
      </div>
      <div class="ro-field">
        <label class="ro-label">No. de inmuebles a evaluar</label>
        <input class="ro-input" value="${escapeHtml(String(dto.numInmueblesEvaluar ?? ''))}" readonly>
      </div>
    </div>

    <div class="ro-grid ro-3">
      <div class="ro-field">
        <label class="ro-label">Tipo de obra</label>
        <input class="ro-input" value="${escapeHtml(dto.tipoObra)}" readonly>
      </div>
      <div class="ro-field">
        <label class="ro-label">Concepto</label>
        <input class="ro-input" value="${escapeHtml(dto.concepto)}" readonly>
      </div>
      <div class="ro-field">
        <label class="ro-label">No. de entre ejes</label>
        <input class="ro-input" value="${escapeHtml(String(dto.numEntreEjes ?? ''))}" readonly>
      </div>
    </div>
  `;
}

async function openDetalleSolicitud(idSolicitud) {
  try {
    selectedSolicitudId = idSolicitud;
    const dto = await fetchDetalleSolicitud(idSolicitud);
    renderDetalleSolicitud(dto);
    openModal(detalleModal, detalleBackdrop);
  } catch (e) {
    alert('No se pudo cargar detalle: ' + e.message);
  }
}

async function openDetalleProyecto(idProyecto) {
  try {
    selectedProyectoId = idProyecto;
    const dto = await fetchDetalleProyecto(idProyecto);
    renderDetalleProyecto(dto);
    openModal(detalleModal, detalleBackdrop);
  } catch (e) {
    alert('No se pudo cargar detalle del proyecto: ' + e.message);
  }
}

document.querySelectorAll('#tabsSolicitudes .tab').forEach(t => {
  t.addEventListener('click', async () => {
    document.querySelectorAll('#tabsSolicitudes .tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    currentEstado = t.dataset.estado;
    await loadAndRender();
  });
});

document.querySelectorAll('#tabsProyectos .tab').forEach(t => {
  t.addEventListener('click', async () => {
    document.querySelectorAll('#tabsProyectos .tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    currentEstado = t.dataset.estado;
    await loadAndRender();
  });
});

searchInput?.addEventListener('input', () => {
  const q = (searchInput.value || '').toLowerCase().trim();
  if (!q) {
    drawCurrentList();
    return;
  }

  const filtered = currentList.filter(x =>
    (x.nombreEscuela ?? '').toLowerCase().includes(q) ||
    (x.constructor ?? '').toLowerCase().includes(q) ||
    (x.supervisor ?? '').toLowerCase().includes(q)
  );

  if (currentView === 'proyectos') renderCards(filtered, 'proyectosList', 'proyectosEmpty', 'PROYECTO');
  else renderCards(filtered, 'solicitudesList', 'solicitudesEmpty', 'SOLICITUD');
});

function drawCurrentList() {
  if (currentView === 'proyectos') renderCards(currentList, 'proyectosList', 'proyectosEmpty', 'PROYECTO');
  else renderCards(currentList, 'solicitudesList', 'solicitudesEmpty', 'SOLICITUD');
}

btnCerrarDetalle?.addEventListener('click', () => closeModal(detalleModal, detalleBackdrop));
detalleBackdrop?.addEventListener('click', () => closeModal(detalleModal, detalleBackdrop));

btnCerrarSup?.addEventListener('click', () => closeModal(supModal, supBackdrop));
supBackdrop?.addEventListener('click', () => closeModal(supModal, supBackdrop));

btnCerrarMotivo?.addEventListener('click', () => closeModal(motivoModal, motivoBackdrop));
motivoBackdrop?.addEventListener('click', () => closeModal(motivoModal, motivoBackdrop));

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (motivoModal.classList.contains('open')) closeModal(motivoModal, motivoBackdrop);
  else if (supModal.classList.contains('open')) closeModal(supModal, supBackdrop);
  else if (detalleModal.classList.contains('open')) closeModal(detalleModal, detalleBackdrop);
  else if (userModal.classList.contains('open')) closeModal(userModal, userModalBackdrop);
});

btnAprobar?.addEventListener('click', async () => {
  if (!selectedSolicitudId) return;

  try {
    const sups = await fetchSupervisores();
    selectSupervisor.innerHTML = `<option value="" selected disabled>Seleccionar</option>`;
    for (const s of sups) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.nombre;
      selectSupervisor.appendChild(opt);
    }
    openModal(supModal, supBackdrop);
  } catch (e) {
    alert('No se pudieron cargar supervisores: ' + e.message);
  }
});

btnRechazar?.addEventListener('click', () => {
  if (!selectedSolicitudId) return;
  txtMotivo.value = '';
  openModal(motivoModal, motivoBackdrop);
});

btnConfirmarAprobar?.addEventListener('click', async () => {
  const supId = selectSupervisor.value;
  if (!supId) {
    alert('Selecciona un supervisor');
    return;
  }

  try {
    await postAprobar(selectedSolicitudId, supId);
    closeModal(supModal, supBackdrop);
    closeModal(detalleModal, detalleBackdrop);
    await loadAndRender();
    alert('Solicitud aprobada');
  } catch (e) {
    alert('No se pudo aprobar: ' + e.message);
  }
});

btnConfirmarRechazo?.addEventListener('click', async () => {
  const motivo = (txtMotivo.value || '').trim();
  if (!motivo) {
    alert('Escribe el motivo');
    return;
  }

  try {
    await postRechazar(selectedSolicitudId, motivo);
    closeModal(motivoModal, motivoBackdrop);
    closeModal(detalleModal, detalleBackdrop);
    await loadAndRender();
    alert('Solicitud rechazada');
  } catch (e) {
    alert('No se pudo rechazar: ' + e.message);
  }
});

btnProyectoActivo?.addEventListener('click', async () => {
  if (!selectedProyectoId) return;
  try {
    await cambiarEstadoProyecto(selectedProyectoId, 'ACTIVO');
    closeModal(detalleModal, detalleBackdrop);
    await loadAndRender();
    alert('Proyecto actualizado a ACTIVO');
  } catch (e) {
    alert('No se pudo actualizar: ' + e.message);
  }
});

btnProyectoInactivo?.addEventListener('click', async () => {
  if (!selectedProyectoId) return;
  try {
    await cambiarEstadoProyecto(selectedProyectoId, 'INACTIVO');
    closeModal(detalleModal, detalleBackdrop);
    await loadAndRender();
    alert('Proyecto actualizado a INACTIVO');
  } catch (e) {
    alert('No se pudo actualizar: ' + e.message);
  }
});

btnProyectoFinalizado?.addEventListener('click', async () => {
  if (!selectedProyectoId) return;
  try {
    await cambiarEstadoProyecto(selectedProyectoId, 'FINALIZADO');
    closeModal(detalleModal, detalleBackdrop);
    await loadAndRender();
    alert('Proyecto actualizado a FINALIZADO');
  } catch (e) {
    alert('No se pudo actualizar: ' + e.message);
  }
});

async function loadAndRender() {
  try {
    currentView = getParam('view') || 'solicitudes';

    if (currentView === 'proyectos') {
      const data = await fetchProyectos(currentEstado);
      currentList = data;
      drawCurrentList();
      return;
    }

    if (currentView === 'solicitudes') {
      const data = await fetchSolicitudes(currentEstado);
      currentList = data;
      drawCurrentList();
    }
  } catch (e) {
    alert('No se pudieron cargar datos: ' + e.message);
  }
}

/* =========================
   USUARIOS
========================= */
const userModal = document.getElementById('userModal');
const userModalBackdrop = document.getElementById('userModalBackdrop');
const userModalClose = document.getElementById('userModalClose');

let currentUserId = null;
let modalMode = 'EDIT';

function openUserModal() {
  openModal(userModal, userModalBackdrop);
}
function closeUserModal() {
  closeModal(userModal, userModalBackdrop);
  currentUserId = null;
}

userModalClose?.addEventListener('click', closeUserModal);
userModalBackdrop?.addEventListener('click', closeUserModal);

function setModalMode(mode) {
  modalMode = mode;
  const title = document.getElementById('userModalTitle');
  const btnSave = document.getElementById('btnGuardarUsuario');
  const btnDelete = document.getElementById('btnEliminarUsuario');

  if (mode === 'CREATE') {
    if (title) title.textContent = 'Agregar usuario';
    if (btnSave) btnSave.textContent = 'Crear usuario';
    if (btnDelete) btnDelete.style.display = 'none';
  } else {
    if (title) title.textContent = 'Detalle de usuario';
    if (btnSave) btnSave.textContent = 'Guardar cambios';
    if (btnDelete) btnDelete.style.display = 'inline-flex';
  }
}

async function fetchJson(url, options = {}) {
  const { token, header } = getCsrf();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token && header) headers.set(header, token);

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function showUserDetail(id) {
  try {
    const res = await fetch(`/api/central/usuarios/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const u = await res.json();

    currentUserId = id;
    setModalMode('EDIT');

    document.getElementById('mNombre').value = u.nombre ?? '';
    document.getElementById('mApellido').value = u.apellido ?? '';
    document.getElementById('mUsername').value = u.username ?? '';
    document.getElementById('mEmail').value = u.email ?? '';
    document.getElementById('mRol').value = (u.rol && u.rol.nombre) ? u.rol.nombre : 'sin rol';
    document.getElementById('mRolNombre').value = '';

    const currentRoleView = getParam('view') || '';
    document.getElementById('mRolNombre').value =
      currentRoleView === 'usuarios-supervisores' ? 'supervisor' :
      currentRoleView === 'usuarios-constructores' ? 'contratista' :
      currentRoleView === 'usuarios-directores' ? 'direccion' : '';

    document.getElementById('mPassword').value = '';

    openUserModal();
  } catch (e) {
    alert('No se pudo cargar el usuario.');
  }
}

function bindUserRowClicks() {
  document.querySelectorAll('tr.user-row').forEach(tr => {
    if (tr.dataset.bound === 'true') return;
    tr.dataset.bound = 'true';
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      const id = tr.getAttribute('data-id');
      if (id) showUserDetail(id);
    });
  });
}

document.getElementById('btnGuardarUsuario')?.addEventListener('click', async () => {
  const payload = {
    nombre: document.getElementById('mNombre').value.trim(),
    apellido: document.getElementById('mApellido').value.trim(),
    username: document.getElementById('mUsername').value.trim(),
    email: document.getElementById('mEmail').value.trim(),
    password: document.getElementById('mPassword').value || '',
    rolNombre: document.getElementById('mRolNombre').value || ''
  };

  if (modalMode === 'CREATE') {
    if (!payload.password.trim()) {
      alert('Password es obligatorio para crear.');
      return;
    }

    const { ok, text } = await fetchJson('/api/central/usuarios/crear', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!ok) {
      alert(text || 'No se pudo crear.');
      return;
    }

    alert('Usuario creado');
    closeUserModal();
    loadPanelFromUrl(window.location.href, false);
    return;
  }

  if (!currentUserId) return;

  const { ok, text } = await fetchJson(`/api/central/usuarios/${currentUserId}/actualizar`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!ok) {
    alert(text || 'No se pudo actualizar.');
    return;
  }

  alert('Usuario actualizado');
  closeUserModal();
  loadPanelFromUrl(window.location.href, false);
});

document.getElementById('btnEliminarUsuario')?.addEventListener('click', async () => {
  if (!currentUserId) return;
  if (!confirm('¿Seguro que quieres eliminar este usuario?')) return;

  const { ok, text } = await fetchJson(`/api/central/usuarios/${currentUserId}/eliminar`, {
    method: 'POST'
  });

  if (!ok) {
    alert(text || 'No se pudo eliminar.');
    return;
  }

  alert('Usuario eliminado');
  closeUserModal();
  loadPanelFromUrl(window.location.href, false);
});

document.getElementById('btnAdd')?.addEventListener('click', () => {
  const btnAdd = document.getElementById('btnAdd');
  if (btnAdd?.dataset.action !== 'usuario') return;

  const rol = btnAdd.dataset.rol || '';

  currentUserId = null;
  setModalMode('CREATE');

  document.getElementById('mNombre').value = '';
  document.getElementById('mApellido').value = '';
  document.getElementById('mUsername').value = '';
  document.getElementById('mEmail').value = '';
  document.getElementById('mPassword').value = '';
  document.getElementById('mRol').value = rol || 'nuevo';
  document.getElementById('mRolNombre').value = rol || '';

  openUserModal();
});

syncSidebarWithView(currentView);
syncAddButton(currentView);
bindUserRowClicks();
loadAndRender();