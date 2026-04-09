// admin-projects.js
(function() {
    const projectModal = document.getElementById('projectDetailModal');
    const projectDetailClose = document.getElementById('projectDetailClose');
    const projectDetalleMeta = document.getElementById('projectDetalleMeta');
    const projectDetalleBody = document.getElementById('projectDetalleBody');
    const projectBadgeEstado = document.getElementById('projectBadgeEstado');

    const btnAdminProyectoActivo = document.getElementById('btnAdminProyectoActivo');
    const btnAdminProyectoInactivo = document.getElementById('btnAdminProyectoInactivo');
    const btnAdminProyectoFinalizado = document.getElementById('btnAdminProyectoFinalizado');

 	// Agregamos una variable de memoria para el estado actual 
    let currentEstadoMemoria = 'ACTIVO'; 
    let currentList = [];
    let selectedProjectId = null;

    function getViewSafe(url) {
        try {
            return new URL(url || window.location.href, window.location.origin).searchParams.get('view') || 'proyectos';
        } catch {
            return 'proyectos';
        }
    }

    function isProjectsView() {
        return getViewSafe(window.location.href) === 'proyectos';
    }

    function getCsrfAdmin() {
        const token = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
        const header = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');
        return { token, header };
    }

    function buildHeadersAdmin(extra = {}) {
        const { token, header } = getCsrfAdmin();
        const headers = new Headers(extra);
        if (token && header) headers.set(header, token);
        return headers;
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

    function openProjectModal() {
        projectModal?.classList.add('open');
        projectModal?.setAttribute('aria-hidden', 'false');
    }

    function closeProjectModal() {
        projectModal?.classList.remove('open');
        projectModal?.setAttribute('aria-hidden', 'true');
        selectedProjectId = null;
    }

    async function fetchProjects(estado) {
        const res = await fetch(`/api/admin/proyectos?estado=${encodeURIComponent(estado)}`, {
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    }

    async function fetchProjectDetail(id) {
        const res = await fetch(`/api/admin/proyectos/${id}`, {
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    }

    async function changeProjectState(id, estado) {
        const res = await fetch(`/api/admin/proyectos/${id}/estado?estado=${encodeURIComponent(estado)}`, {
            method: 'POST',
            headers: buildHeadersAdmin()
        });

        if (!res.ok) throw new Error(await res.text());
    }

    function renderCards(items) {
        const list = document.getElementById('adminProjectsList');
        const empty = document.getElementById('adminProjectsEmpty');
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
            btn.addEventListener('click', () => openProjectDetail(it.idProyecto));

            card.appendChild(left);
            card.appendChild(btn);
            list.appendChild(card);
        }
    }

    function renderProjectDetail(dto) {
        projectBadgeEstado.textContent = (dto.estadoProyecto || '').toUpperCase();

        projectDetalleMeta.innerHTML = `
      <div>Proyecto #${escapeHtml(dto.idProyecto)} • Solicitud #${escapeHtml(dto.idSolicitud)}</div>
      <div>Fecha de aprobación: ${escapeHtml(dto.fechaAprobacion ?? '')}</div>
      <div>Constructor: ${escapeHtml(dto.quienEnvia ?? '—')}</div>
      <div>Supervisor asignado: ${escapeHtml(dto.supervisorAsignado ?? '—')}</div>
    `;

        projectDetalleBody.innerHTML = `
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
		<div class="ph-label">Tipo de edificación</div>
		<div class="ph-value">${escapeHtml(dto.tipoEdificacion ?? '')}</div>
        </div>
      </div>
    `;
    }

    async function openProjectDetail(id) {
        try {
            selectedProjectId = id;
            const dto = await fetchProjectDetail(id);
            renderProjectDetail(dto);
            openProjectModal();
        } catch (e) {
            alert('No se pudo cargar el detalle: ' + e.message);
        }
    }

    async function loadProjects() {
        if (!isProjectsView()) return;

        try {
            currentList = await fetchProjects(currentEstadoMemoria); // Usa la memoria, no el HTML
            renderCards(currentList);
        } catch (e) {
            alert('No se pudieron cargar los proyectos: ' + e.message);
        }
    }

    function bindTabs() {
        document.querySelectorAll('#adminProjectTabs .tab').forEach(tab => {
            if (tab.dataset.bound === 'true') return;
            tab.dataset.bound = 'true';

            tab.addEventListener('click', async () => {
                document.querySelectorAll('#adminProjectTabs .tab').forEach(x => x.classList.remove('active'));
                tab.classList.add('active');
                currentEstadoMemoria = tab.dataset.estado; // Actualizamos la memoria
                await loadProjects();
            });
        });
    }

    function filterProjects() {
        if (!isProjectsView()) return;

        const currentSearchInput = document.getElementById('searchInput');
        const q = (currentSearchInput?.value || '').toLowerCase().trim();

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
    }

    function initProjectsView() {
        if (!document.getElementById('adminProjectsList')) return;

        // Forzamos visualmente la pestaña basada en MEMORIA 
        document.querySelectorAll('#adminProjectTabs .tab').forEach(t => t.classList.remove('active'));
        const targetTab = document.querySelector(`#adminProjectTabs .tab[data-estado="${currentEstadoMemoria}"]`);
        
        if (targetTab) {
            targetTab.classList.add('active');
        } else {
            // Si la memoria tiene algo raro, forzamos ACTIVO
            currentEstadoMemoria = 'ACTIVO';
            const defaultTab = document.querySelector(`#adminProjectTabs .tab[data-estado="ACTIVO"]`);
            if (defaultTab) defaultTab.classList.add('active');
        }

        // Limpiamos el buscador al cambiar de vista para no ocultar resultados
        const currentSearchInput = document.getElementById('searchInput');
        if (currentSearchInput) currentSearchInput.value = '';

        bindTabs();
        loadProjects();
    }

    projectDetailClose?.addEventListener('click', closeProjectModal);
    projectModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeProjectModal);

    btnAdminProyectoActivo?.addEventListener('click', async () => {
        if (!selectedProjectId) return;
        try {
            await changeProjectState(selectedProjectId, 'ACTIVO');
            closeProjectModal();
            currentEstadoMemoria = 'ACTIVO';
            const tab = document.querySelector('#adminProjectTabs .tab[data-estado="ACTIVO"]');
            document.querySelectorAll('#adminProjectTabs .tab').forEach(x => x.classList.remove('active'));
            tab?.classList.add('active');
            await loadProjects();
        } catch (e) {
            alert('No se pudo cambiar el estado: ' + e.message);
        }
    });

    btnAdminProyectoInactivo?.addEventListener('click', async () => {
        if (!selectedProjectId) return;
        try {
            await changeProjectState(selectedProjectId, 'INACTIVO');
            closeProjectModal();
            currentEstadoMemoria = 'INACTIVO';
            const tab = document.querySelector('#adminProjectTabs .tab[data-estado="INACTIVO"]');
            document.querySelectorAll('#adminProjectTabs .tab').forEach(x => x.classList.remove('active'));
            tab?.classList.add('active');
            await loadProjects();
        } catch (e) {
            alert('No se pudo cambiar el estado: ' + e.message);
        }
    });

    btnAdminProyectoFinalizado?.addEventListener('click', async () => {
        if (!selectedProjectId) return;
        try {
            await changeProjectState(selectedProjectId, 'FINALIZADO');
            closeProjectModal();
            currentEstadoMemoria = 'FINALIZADO';
            const tab = document.querySelector('#adminProjectTabs .tab[data-estado="FINALIZADO"]');
            document.querySelectorAll('#adminProjectTabs .tab').forEach(x => x.classList.remove('active'));
            tab?.classList.add('active');
            await loadProjects();
        } catch (e) {
            alert('No se pudo cambiar el estado: ' + e.message);
        }
    });

    const initialSearchInput = document.getElementById('searchInput');
    initialSearchInput?.addEventListener('input', filterProjects);

    document.addEventListener('DOMContentLoaded', initProjectsView);

    window.addEventListener('panelLoaded', (e) => {
        if (e.detail && e.detail.view === 'proyectos') {
            initProjectsView();

            const nuevoBuscador = document.getElementById('searchInput');
            if (nuevoBuscador) {
                nuevoBuscador.addEventListener('input', filterProjects);
            }
        }
    });

})();