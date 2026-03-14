const searchDireccion = document.getElementById('searchDireccion');
const detalleModal = document.getElementById('detalleModal');
const detalleBackdrop = document.getElementById('detalleBackdrop');
const btnCerrarDetalle = document.getElementById('btnCerrarDetalle');
const detalleMeta = document.getElementById('detalleMeta');
const detalleBody = document.getElementById('detalleBody');
const badgeEstado = document.getElementById('badgeEstado');

let currentEstado = 'ACTIVO';
let currentList = [];

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

function renderCards(items) {
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
    btn.addEventListener('click', () => openDetalleProyecto(it.idProyecto));

    card.appendChild(left);
    card.appendChild(btn);
    list.appendChild(card);
  }
}

async function fetchProyectos(estado) {
  const res = await fetch(`/api/direccion/proyectos?estado=${encodeURIComponent(estado)}`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchDetalleProyecto(id) {
  const res = await fetch(`/api/direccion/proyectos/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

function renderDetalleProyecto(dto) {
  badgeEstado.textContent = (dto.estadoProyecto || '').toUpperCase();

  detalleMeta.innerHTML = `
    <div>Proyecto #${escapeHtml(dto.idProyecto)} • Solicitud #${escapeHtml(dto.idSolicitud)}</div>
    <div>Fecha de aprobación: ${escapeHtml(dto.fechaAprobacion ?? '')}</div>
    <div>Constructor: ${escapeHtml(dto.quienEnvia ?? '—')}</div>
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
        aqui el director verá todo lo que sube el super y el constructor
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
    alert('No se pudo cargar el detalle: ' + e.message);
  }
}

async function loadAndRender() {
  try {
    currentList = await fetchProyectos(currentEstado);
    renderCards(currentList);
  } catch (e) {
    alert('No se pudieron cargar los proyectos: ' + e.message);
  }
}

document.querySelectorAll('#tabsDireccion .tab').forEach(tab => {
  tab.addEventListener('click', async () => {
    document.querySelectorAll('#tabsDireccion .tab').forEach(x => x.classList.remove('active'));
    tab.classList.add('active');
    currentEstado = tab.dataset.estado;
    await loadAndRender();
  });
});

searchDireccion?.addEventListener('input', () => {
  const q = (searchDireccion.value || '').toLowerCase().trim();

  if (!q) {
    renderCards(currentList);
    return;
  }

  const filtered = currentList.filter(x =>
    (x.nombreEscuela ?? '').toLowerCase().includes(q) ||
    (x.constructor ?? '').toLowerCase().includes(q) ||
    (x.supervisor ?? '').toLowerCase().includes(q)
  );

  renderCards(filtered);
});

btnCerrarDetalle?.addEventListener('click', () => closeModal(detalleModal, detalleBackdrop));
detalleBackdrop?.addEventListener('click', () => closeModal(detalleModal, detalleBackdrop));

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && detalleModal?.classList.contains('open')) {
    closeModal(detalleModal, detalleBackdrop);
  }
});

loadAndRender();