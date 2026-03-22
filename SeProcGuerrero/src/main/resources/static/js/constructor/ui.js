// ui.js

// Alertas Globales
const customAlert = document.getElementById('customAlert');
const customAlertTitle = document.getElementById('customAlertTitle');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertOk = document.getElementById('customAlertOk');
const customAlertCancel = document.getElementById('customAlertCancel');

export function addCacheBuster(url) {
  if (!url) return url;
  return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
}

export function renderProfilePhoto(url) {
  const profileImg = document.getElementById('profileImg');
  const profileFallback = document.getElementById('profileFallback');
  
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

export function closeCustomAlert() {
  customAlert?.classList.remove('open');
  customAlert?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

export function showCustomAlert(message, title = "Atención") {
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

export function showCustomConfirm(message, title = "Confirmar acción") {
  return new Promise((resolve) => {
    customAlertTitle.textContent = title;
    customAlertMessage.textContent = message;
    customAlertCancel.style.display = 'inline-flex';

    customAlert.classList.add('open');
    customAlert.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const handleOk = () => { cleanup(); resolve(true); };
    const handleCancel = () => { cleanup(); resolve(false); };

    const cleanup = () => {
      closeCustomAlert();
      customAlertOk.removeEventListener('click', handleOk);
      customAlertCancel.removeEventListener('click', handleCancel);
    };

    customAlertOk.addEventListener('click', handleOk);
    customAlertCancel.addEventListener('click', handleCancel);
  });
}

export function openModal(modalEl, backdropEl) {
  modalEl?.classList.add('open');
  backdropEl?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeModal(modalEl, backdropEl) {
  modalEl?.classList.remove('open');
  backdropEl?.classList.remove('open');
  document.body.style.overflow = '';
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function estadoDotClass(estado) {
  const s = (estado || '').toUpperCase();
  if (s === 'ACTIVO') return 'dot-aprobada';
  if (s === 'INACTIVO') return 'dot-pendiente';
  if (s === 'FINALIZADO') return 'dot-rechazada';
  return 'dot-pendiente';
}

export function renderCards(items, onDetailClick) {
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
    btn.addEventListener('click', () => onDetailClick(it.idProyecto));

    card.appendChild(left);
    card.appendChild(btn);
    list.appendChild(card);
  }
}

export function renderDetalleProyecto(dto) {
  const badgeEstado = document.getElementById('badgeEstado');
  const detalleMeta = document.getElementById('detalleMeta');
  const detalleBody = document.getElementById('detalleBody');
  
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
      <div class="ph-note">aqui después para subir evidencias</div>
    </div>
  `;
}

export function fillSelect(selectEl, items, placeholder = "Seleccionar") {
  selectEl.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
  for (const it of items) {
    const opt = document.createElement('option');
    opt.value = it.id;
    opt.textContent = it.nombre;
    selectEl.appendChild(opt);
  }
}

export function setActiveNav(navId) {
    document.querySelectorAll('.sidebar a.nav-item').forEach(el => el.classList.remove('active'));
    const item = document.getElementById(navId);
    if (item) item.classList.add('active');
}

export function syncSidebarWithUrl(view) {
    if (view === 'password') {
        setActiveNav('navPassword');
    } else {
        setActiveNav('navProyectos');
    }
}

// Menú desplegable de la foto de perfil
const profileMenuDropdown = document.getElementById('profileMenuDropdown');

export function closeProfileMenu() {
    profileMenuDropdown?.classList.remove('open');
}

export function toggleProfileMenu() {
    profileMenuDropdown?.classList.toggle('open');
}

// Escuchar clics en todo el documento para cerrar el menú
document.addEventListener('click', (e) => {
    if (profileMenuDropdown?.classList.contains('open') && !e.target.closest('.userbox')) {
        closeProfileMenu();
    }
});