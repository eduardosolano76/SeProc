export function getParam(name, href = window.location.href) {
  const u = new URL(href, window.location.origin);
  return u.searchParams.get(name);
}

export function getViewFromUrl(href = window.location.href) {
  return getParam('view', href) || 'proyectos';
}

export function setActiveNav(id) {
  document.querySelectorAll('.nav .nav-item').forEach(x => x.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

export function syncSidebarWithView(view) {
  if (view === 'password') {
    setActiveNav('navPassword');
    return;
  }

  setActiveNav('navProyectos');
}

export async function loadPanelFromUrl({
  href,
  push = true,
  onAfterLoad = null
}) {
  const panelContent = document.getElementById('panelContent');

  if (!panelContent) {
    window.location.href = href;
    return;
  }

  const view = getViewFromUrl(href);

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

    if (push) history.pushState({ href }, '', href);

    syncSidebarWithView(view);

    if (typeof onAfterLoad === 'function') {
      onAfterLoad(view);
    }
  } catch (e) {
    window.location.href = href;
  }
}