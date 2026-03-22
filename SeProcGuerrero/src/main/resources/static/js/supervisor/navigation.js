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