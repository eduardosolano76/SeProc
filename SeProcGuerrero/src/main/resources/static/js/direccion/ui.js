function addCacheBuster(url) {
  if (!url) return url;
  return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
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

export function renderProfilePhoto(url) {
  const profileImg = document.getElementById('profileImg');
  const profileFallback = document.getElementById('profileFallback');
  if (!profileImg || !profileFallback) return;

  if (!url || url.trim() === '') {
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

export function showCustomAlert(message, title = 'Atención') {
  const customAlert = document.getElementById('customAlert');
  const customAlertBackdrop = document.getElementById('customAlertBackdrop');
  const customAlertTitle = document.getElementById('customAlertTitle');
  const customAlertMessage = document.getElementById('customAlertMessage');
  const customAlertOk = document.getElementById('customAlertOk');
  const customAlertCancel = document.getElementById('customAlertCancel');

  return new Promise((resolve) => {
    if (!customAlert || !customAlertBackdrop) {
      window.alert(message);
      resolve(true);
      return;
    }

    if (customAlertTitle) customAlertTitle.textContent = title;
    if (customAlertMessage) customAlertMessage.textContent = message;
    if (customAlertCancel) customAlertCancel.style.display = 'none';

    openModal(customAlert, customAlertBackdrop);
    customAlert.setAttribute('aria-hidden', 'false');
    customAlertBackdrop.setAttribute('aria-hidden', 'false');

    const handleOk = () => {
      customAlertOk?.removeEventListener('click', handleOk);
      closeCustomAlert();
      resolve(true);
    };

    customAlertOk?.addEventListener('click', handleOk);
  });
}

export function showCustomConfirm(message, title = 'Confirmar acción') {
  const customAlert = document.getElementById('customAlert');
  const customAlertBackdrop = document.getElementById('customAlertBackdrop');
  const customAlertTitle = document.getElementById('customAlertTitle');
  const customAlertMessage = document.getElementById('customAlertMessage');
  const customAlertOk = document.getElementById('customAlertOk');
  const customAlertCancel = document.getElementById('customAlertCancel');

  return new Promise((resolve) => {
    if (!customAlert || !customAlertBackdrop || !customAlertCancel) {
      resolve(window.confirm(message));
      return;
    }

    if (customAlertTitle) customAlertTitle.textContent = title;
    if (customAlertMessage) customAlertMessage.textContent = message;
    customAlertCancel.style.display = 'inline-flex';

    openModal(customAlert, customAlertBackdrop);
    customAlert.setAttribute('aria-hidden', 'false');
    customAlertBackdrop.setAttribute('aria-hidden', 'false');

    const handleOk = () => { cleanup(); resolve(true); };
    const handleCancel = () => { cleanup(); resolve(false); };

    const cleanup = () => {
      customAlertOk?.removeEventListener('click', handleOk);
      customAlertCancel?.removeEventListener('click', handleCancel);
      closeCustomAlert();
    };

    customAlertOk?.addEventListener('click', handleOk);
    customAlertCancel?.addEventListener('click', handleCancel);
  });
}

export function closeCustomAlert() {
  const customAlert = document.getElementById('customAlert');
  const customAlertBackdrop = document.getElementById('customAlertBackdrop');

  closeModal(customAlert, customAlertBackdrop);
  customAlert?.setAttribute('aria-hidden', 'true');
  customAlertBackdrop?.setAttribute('aria-hidden', 'true');
}

export function renderCards(items, onOpenProyecto) {
  const list = document.getElementById('direccionProjectsList');
  const empty = document.getElementById('direccionProjectsEmpty');
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
    p1.textContent = `Constructor: ${it.constructor ?? '—'}`;

    const p2 = document.createElement('span');
    p2.textContent = `Supervisor: ${it.supervisor ?? '—'}`;

    const p3 = document.createElement('span');
    p3.textContent = `Fecha: ${it.fechaAprobacion ?? ''}`;

    meta.appendChild(dot);
    meta.appendChild(p1);
    meta.appendChild(p2);
    meta.appendChild(p3);

    left.appendChild(school);
    left.appendChild(meta);

    const btn = document.createElement('button');
    btn.className = 'btn-detail';
    btn.type = 'button';
    btn.textContent = 'Ver detalle';
    btn.addEventListener('click', () => onOpenProyecto?.(it.idProyecto));

    card.appendChild(left);
    card.appendChild(btn);
    list.appendChild(card);
  }
}

export function renderDetalleProyecto(dto) {
  const badgeEstado = document.getElementById('badgeEstado');
  const detalleMeta = document.getElementById('detalleMeta');
  const detalleBody = document.getElementById('detalleBody');

  if (badgeEstado) {
    badgeEstado.textContent = (dto.estadoProyecto || '').toUpperCase();
  }

  if (detalleMeta) {
    detalleMeta.innerHTML = `
      <div>Proyecto #${escapeHtml(dto.idProyecto)} • Solicitud #${escapeHtml(dto.idSolicitud)}</div>
      <div>Fecha de aprobación: ${escapeHtml(dto.fechaAprobacion ?? '')}</div>
      <div>Constructor: ${escapeHtml(dto.quienEnvia ?? '—')}</div>
      <div>Supervisor asignado: ${escapeHtml(dto.supervisorAsignado ?? '—')}</div>
    `;
  }

  if (detalleBody) {
    detalleBody.innerHTML = `
      <div class="placeholder-detail">
        <div class="ph-grid">
          <div class="ph-box">
            <div class="ph-label">Escuela</div>
            <div class="ph-value">${escapeHtml(dto.nombreEscuela)}</div>
          </div>

          <div class="ph-box">
            <div class="ph-label">CCT</div>
            <div class="ph-value">${escapeHtml(dto.cct1 ?? '')} ${escapeHtml(dto.cct2 ?? '')}</div>
          </div>

          <div class="ph-box">
            <div class="ph-label">Ubicación</div>
            <div class="ph-value">${escapeHtml(dto.estado)}, ${escapeHtml(dto.municipio)}, ${escapeHtml(dto.ciudad)}</div>
          </div>

          <div class="ph-box">
            <div class="ph-label">Dirección</div>
            <div class="ph-value">${escapeHtml(dto.calleNumero)} C.P. ${escapeHtml(dto.cp)}</div>
          </div>

          <div class="ph-box">
            <div class="ph-label">Responsable</div>
            <div class="ph-value">${escapeHtml(dto.responsableInmueble)}</div>
          </div>

          <div class="ph-box">
            <div class="ph-label">Contacto</div>
            <div class="ph-value">${escapeHtml(dto.contacto)}</div>
          </div>

          <div class="ph-box">
            <div class="ph-label">Núm. inmuebles</div>
            <div class="ph-value">${escapeHtml(dto.numInmueblesEvaluar)}</div>
          </div>

          <div class="ph-box">
            <div class="ph-label">Núm. entre ejes</div>
            <div class="ph-value">${escapeHtml(dto.numEntreEjes)}</div>
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
          aqui después se mostrarán las evidencias
        </div>
      </div>
    `;
  }
}

// --- Menú desplegable de la foto de perfil ---
export function closeProfileMenu() {
    document.getElementById('profileMenuDropdown')?.classList.remove('open');
}

export function toggleProfileMenu() {
    document.getElementById('profileMenuDropdown')?.classList.toggle('open');
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileMenuDropdown');
    if (dropdown?.classList.contains('open') && !e.target.closest('.userbox')) {
        closeProfileMenu();
    }
});