export function getParam(name, href = window.location.href) {
  const u = new URL(href, window.location.origin);
  return u.searchParams.get(name);
}

export function getViewFromUrl(href = window.location.href) {
  return getParam('view', href) || 'solicitudes';
}

export function setActiveNav(id) {
  document.querySelectorAll('.nav .nav-item').forEach(x => x.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

export function setActiveSubItem(clicked) {
  document.querySelectorAll('#submenuUsuarios .sub-item').forEach(x => x.classList.remove('active'));
  clicked?.classList.add('active');
}

export function syncSidebarWithView(view) {
  const navUsuarios = document.getElementById('navUsuarios');
  const submenuUsuarios = document.getElementById('submenuUsuarios');

  if (view.startsWith('usuarios-')) {
    setActiveNav('navUsuarios');
    navUsuarios?.setAttribute('data-open', 'true');
    submenuUsuarios?.classList.add('open');

    const link = document.querySelector(`#submenuUsuarios .sub-item[data-view="${view}"]`);
    document.querySelectorAll('#submenuUsuarios .sub-item').forEach(x => x.classList.remove('active'));
    link?.classList.add('active');
    return;
  }

  document.querySelectorAll('#submenuUsuarios .sub-item').forEach(x => x.classList.remove('active'));
  navUsuarios?.setAttribute('data-open', 'false');
  submenuUsuarios?.classList.remove('open');

  if (view === 'proyectos') setActiveNav('navProyectos');
  else if (view === 'password') setActiveNav('navPassword');
  else setActiveNav('navSolicitudes');
}

export function syncAddButton(view) {
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
    return;
  }

  btnAdd.style.display = 'none';
  btnAdd.dataset.action = '';
  btnAdd.dataset.rol = '';
}

export async function loadPanelFromUrl({
  href,
  push = true,
  onAfterLoad = null
}) {
  const panelContent = document.getElementById('panelContent');
  const sectionTitle = document.getElementById('sectionTitle');
  const sectionSubtitle = document.getElementById('sectionSubtitle');

  if (!panelContent) {
    window.location.href = href;
    return;
  }

  const view = getViewFromUrl(href);

  if (view === 'solicitudes' || view === 'proyectos' || view === 'password') {
    window.location.href = href;
    return;
  }

  panelContent.innerHTML = `<div class="panel-sub">Cargando...</div>`;

  try {
    const res = await fetch(href, {
      cache: 'no-store',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newPanelContent = doc.getElementById('panelContent');

    if (newPanelContent) panelContent.innerHTML = newPanelContent.innerHTML;
    else panelContent.innerHTML = html;

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

    if (typeof onAfterLoad === 'function') {
      onAfterLoad(view);
    }
  } catch (e) {
    window.location.href = href;
  }
}