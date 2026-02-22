// Helpers 
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

// Elementos
const sectionTitle   = document.getElementById('sectionTitle');
const panelContent   = document.getElementById('panelContent');
const navUsuarios    = document.getElementById('navUsuarios');
const submenuUsuarios= document.getElementById('submenuUsuarios');

// Cargar vista sin recargar y sin parpadeo 
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

// Submenu Usuarios open/close
navUsuarios?.addEventListener('click', () => {
  const isOpen = navUsuarios.getAttribute('data-open') === 'true';
  navUsuarios.setAttribute('data-open', String(!isOpen));
  submenuUsuarios?.classList.toggle('open', !isOpen);
  setActiveNav('navUsuarios');
});

// Proyectos
document.getElementById('navProyectos')?.addEventListener('click', (ev) => {
  ev.preventDefault?.();
  setActiveNav('navProyectos');
  loadPanelFromUrl('/admin?view=proyectos', true);
});

// Pendientes
document.getElementById('navSolicitudes')?.addEventListener('click', (ev) => {
  ev.preventDefault?.();
  setActiveNav('navSolicitudes');
  loadPanelFromUrl('/admin?view=pendientes', true);
});

// Subitems Usuarios 
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

// Back/Forward
window.addEventListener('popstate', (e) => {
  const href = (e.state && e.state.href) ? e.state.href : window.location.href;
  loadPanelFromUrl(href, false);
});

// Foto de perfil
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

// Menú móvil
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

// Vista inicial (solo activa estilos)
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

// Aprobar usuario (pendientes)
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

// Modal helpers
const userModal = document.getElementById('userModal');
const userModalClose = document.getElementById('userModalClose');
const userModalBackdrop = document.getElementById('userModalBackdrop');
const btnCerrarModal = document.getElementById('btnCerrarModal');

let currentUserId = null;

function openUserModal(){
  userModal?.classList.add('open');
  userModal?.setAttribute('aria-hidden', 'false');
}

function closeUserModal(){
  userModal?.classList.remove('open');
  userModal?.setAttribute('aria-hidden', 'true');
  currentUserId = null;
}

userModalClose?.addEventListener('click', closeUserModal);

// Cargar detalle por fetch y llenar modal
async function showUserDetail(id){
  try{
    const res = await fetch(`/admin/usuarios/${id}`, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const u = await res.json();

    currentUserId = id;

    document.getElementById('mId').value = u.idUsuario ?? '';
    document.getElementById('mNombre').value = u.nombre ?? '';
    document.getElementById('mApellido').value = u.apellido ?? '';
    document.getElementById('mUsername').value = u.username ?? '';
    document.getElementById('mEmail').value = u.email ?? '';
    document.getElementById('mRol').value = (u.rol && u.rol.nombre) ? u.rol.nombre : 'sin rol';
    document.getElementById('mActivo').value = (u.activo === true) ? 'Sí' : 'No';

    openUserModal();
  }catch(e){
    alert("No se pudo cargar el usuario.");
  }
}

// Conectar clicks en filas
function bindUserRowClicks(){
  document.querySelectorAll('tr.user-row').forEach(tr => {
    if(tr.dataset.bound === "true") return;
    tr.dataset.bound = "true";

    tr.style.cursor = "pointer";
    tr.addEventListener('click', () => {
      const id = tr.getAttribute('data-id');
      if(id) showUserDetail(id);
    });
  });
}

// Llamar al iniciar
bindUserRowClicks();

// IMPORTANTE: cuando cargas por AJAX, vuelves a bindear
const originalLoadPanelFromUrl = loadPanelFromUrl;
loadPanelFromUrl = async function(href, push = true){
  await originalLoadPanelFromUrl(href, push);
  bindUserRowClicks();
};
