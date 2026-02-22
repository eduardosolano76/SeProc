// ===== Helpers =====
function getParam(name){
  return new URLSearchParams(window.location.search).get(name);
}

function setActiveNav(buttonId){
  document.querySelectorAll('.nav .nav-item').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(buttonId);
  btn?.classList.add('active');
}

function setActiveSubItem(clicked){
  document.querySelectorAll('#submenuUsuarios .sub-item').forEach(x => x.classList.remove('active'));
  clicked?.classList.add('active');
}

// ===== Elementos =====
const sectionTitle   = document.getElementById('sectionTitle');
const panelContent   = document.getElementById('panelContent');
const navUsuarios    = document.getElementById('navUsuarios');
const submenuUsuarios= document.getElementById('submenuUsuarios');

// ===== Cargar vista sin recargar y sin parpadeo =====
async function loadPanelFromUrl(href, push = true){
  if(!panelContent){
    window.location.href = href;
    return;
  }

  panelContent.innerHTML = `<div class="panel-sub">Cargando...</div>`;

  try{
    const res = await fetch(href, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);

    const html = await res.text();
    const doc  = new DOMParser().parseFromString(html, "text/html");

    const newPanelContent = doc.getElementById("panelContent");
    const newTitle = doc.getElementById("sectionTitle")?.textContent?.trim();

    if(!newPanelContent){
      window.location.href = href;
      return;
    }

    panelContent.innerHTML = newPanelContent.innerHTML;
    if(newTitle && sectionTitle) sectionTitle.textContent = newTitle;

    if(push) history.pushState({ href }, "", href);

    closeMobileMenu();
  }catch(e){
    window.location.href = href;
  }
}

// ===== Submenu Usuarios open/close =====
navUsuarios?.addEventListener('click', () => {
  const isOpen = navUsuarios.getAttribute('data-open') === 'true';
  navUsuarios.setAttribute('data-open', String(!isOpen));
  submenuUsuarios?.classList.toggle('open', !isOpen);
  setActiveNav('navUsuarios');
});

// ===== Proyectos =====
document.getElementById('navProyectos')?.addEventListener('click', (ev) => {
  ev.preventDefault?.();
  setActiveNav('navProyectos');
  loadPanelFromUrl('/admin?view=proyectos', true);
});

// ===== Pendientes =====
document.getElementById('navSolicitudes')?.addEventListener('click', (ev) => {
  ev.preventDefault?.();
  setActiveNav('navSolicitudes');
  loadPanelFromUrl('/admin?view=pendientes', true);
});

// ===== Subitems Usuarios =====
document.querySelectorAll('#submenuUsuarios .sub-item').forEach(a => {
  a.addEventListener('click', (ev) => {
    ev.preventDefault();

    const href = a.getAttribute('href');
    if(!href) return;

    setActiveNav('navUsuarios');
    setActiveSubItem(a);

    navUsuarios?.setAttribute('data-open','true');
    submenuUsuarios?.classList.add('open');

    loadPanelFromUrl(href, true);
  });
});

// ===== Back/Forward =====
window.addEventListener('popstate', (e) => {
  const href = (e.state && e.state.href) ? e.state.href : window.location.href;
  loadPanelFromUrl(href, false);
});

// ===== Foto de perfil =====
const profileBtn = document.getElementById('profileBtn');
const profileFile = document.getElementById('profileFile');
const profileImg = document.getElementById('profileImg');
const profileFallback = document.getElementById('profileFallback');

profileBtn?.addEventListener('click', () => profileFile?.click());
profileFile?.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const url = URL.createObjectURL(file);
  profileImg.src = url;
  profileImg.style.display = 'block';
  profileFallback.style.display = 'none';
});

// ===== Menú móvil =====
const btnMenu = document.getElementById('btnMenu');
const sidebar = document.getElementById('sidebar');

btnMenu?.addEventListener('click', () => sidebar?.classList.toggle('menu-open'));

function closeMobileMenu(){
  if(window.matchMedia("(max-width: 768px)").matches){
    sidebar?.classList.remove('menu-open');
  }
}

// Botón agregar todavía sin función
document.getElementById('btnAdd')?.addEventListener('click', () => {});

// ===== Vista inicial (solo activa estilos) =====
const v = getParam('view') || 'proyectos';
if(v === 'pendientes'){
  setActiveNav('navSolicitudes');
} else if(v.startsWith('usuarios-')){
  setActiveNav('navUsuarios');
  navUsuarios?.setAttribute('data-open','true');
  submenuUsuarios?.classList.add('open');
  const link = document.querySelector(`#submenuUsuarios .sub-item[data-view="${v}"]`);
  setActiveSubItem(link);
} else {
  setActiveNav('navProyectos');
}

// ===== Aprobar usuario (pendientes) =====
function aprobarUsuario(btn){
  const id = btn.getAttribute('data-id');
  const sel = document.getElementById('rol-' + id);
  if(!sel.checkValidity()){
    sel.reportValidity();
    return;
  }
  document.getElementById('rolHidden-' + id).value = sel.value;
  document.getElementById('aprobar-' + id).submit();
}
window.aprobarUsuario = aprobarUsuario; 