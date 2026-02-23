// Helpers 
function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function setActiveNav(buttonId) {
    document.querySelectorAll('.nav .nav-item').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(buttonId);
    btn?.classList.add('active');
}

function setActiveSubItem(clicked) {
    document.querySelectorAll('#submenuUsuarios .sub-item').forEach(x => x.classList.remove('active'));
    clicked?.classList.add('active');
}

// Elementos
const sectionTitle = document.getElementById('sectionTitle');
const panelContent = document.getElementById('panelContent');
const navUsuarios = document.getElementById('navUsuarios');
const submenuUsuarios = document.getElementById('submenuUsuarios');

// Cargar vista sin recargar y sin parpadeo 
async function loadPanelFromUrl(href, push = true) {
    if (!panelContent) {
        window.location.href = href;
        return;
    }

    panelContent.innerHTML = `<div class="panel-sub">Cargando...</div>`;

    try {
        const res = await fetch(href, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const newPanelContent = doc.getElementById("panelContent");
        const newTitle = doc.getElementById("sectionTitle")?.textContent?.trim();

        if (!newPanelContent) {
            window.location.href = href;
            return;
        }

        panelContent.innerHTML = newPanelContent.innerHTML;
        if (newTitle && sectionTitle) sectionTitle.textContent = newTitle;

        if (push) history.pushState({ href }, "", href);

        closeMobileMenu();
    } catch (e) {
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
        if (!href) return;

        setActiveNav('navUsuarios');
        setActiveSubItem(a);

        navUsuarios?.setAttribute('data-open', 'true');
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
    if (!file) return;
    const url = URL.createObjectURL(file);
    profileImg.src = url;
    profileImg.style.display = 'block';
    profileFallback.style.display = 'none';
});

// Menú móvil
const btnMenu = document.getElementById('btnMenu');
const sidebar = document.getElementById('sidebar');

btnMenu?.addEventListener('click', () => sidebar?.classList.toggle('menu-open'));

function closeMobileMenu() {
    if (window.matchMedia("(max-width: 768px)").matches) {
        sidebar?.classList.remove('menu-open');
    }
}

// Vista inicial (solo activa estilos)
const v = getParam('view') || 'proyectos';
if (v === 'pendientes') {
    setActiveNav('navSolicitudes');
} else if (v.startsWith('usuarios-')) {
    setActiveNav('navUsuarios');
    navUsuarios?.setAttribute('data-open', 'true');
    submenuUsuarios?.classList.add('open');
    const link = document.querySelector(`#submenuUsuarios .sub-item[data-view="${v}"]`);
    setActiveSubItem(link);
} else {
    setActiveNav('navProyectos');
}

// Aprobar usuario (pendientes)
function aprobarUsuario(btn) {
    const id = btn.getAttribute('data-id');
    const sel = document.getElementById('rol-' + id);
    if (!sel.checkValidity()) {
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

function openUserModal() {
    userModal?.classList.add('open');
    userModal?.setAttribute('aria-hidden', 'false');
}

function closeUserModal() {
    userModal?.classList.remove('open');
    userModal?.setAttribute('aria-hidden', 'true');
    currentUserId = null;
}

userModalClose?.addEventListener('click', closeUserModal);

// Cargar detalle por fetch y llenar modal
async function showUserDetail(id) {
    try {
        const res = await fetch(`/admin/usuarios/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const u = await res.json();

        currentUserId = id;

        document.getElementById('mNombre').value = u.nombre ?? '';
        document.getElementById('mApellido').value = u.apellido ?? '';
        document.getElementById('mUsername').value = u.username ?? '';
        document.getElementById('mEmail').value = u.email ?? '';
        document.getElementById('mRol').value = (u.rol && u.rol.nombre) ? u.rol.nombre : 'sin rol';
		
		resetPasswordVisibility();

        openUserModal();
    } catch (e) {
        alert("No se pudo cargar el usuario.");
    }
}

// Conectar clicks en filas
function bindUserRowClicks() {
    document.querySelectorAll('tr.user-row').forEach(tr => {
        if (tr.dataset.bound === "true") return;
        tr.dataset.bound = "true";

        tr.style.cursor = "pointer";
        tr.addEventListener('click', () => {
            const id = tr.getAttribute('data-id');
            if (id) showUserDetail(id);
        });
    });
}

// Llamar al iniciar
bindUserRowClicks();

// IMPORTANTE: cuando cargas por AJAX, vuelves a bindear
const originalLoadPanelFromUrl = loadPanelFromUrl;
loadPanelFromUrl = async function(href, push = true) {
    await originalLoadPanelFromUrl(href, push);
    bindUserRowClicks();
};

// CSRF para fetch
function getCsrf() {
    const token = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
    const header = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');
    return { token, header };
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

// Guardar cambios 
document.getElementById('btnGuardarUsuario')?.addEventListener('click', async () => {
    if (!currentUserId) return;

    const payload = {
        nombre: document.getElementById('mNombre').value.trim(),
        apellido: document.getElementById('mApellido').value.trim(),
        username: document.getElementById('mUsername').value.trim(),
        email: document.getElementById('mEmail').value.trim(),
        password: document.getElementById('mPassword')?.value || "",
        rolNombre: document.getElementById('mRolNombre')?.value || ""
    };

    const { ok, text } = await fetchJson(`/admin/usuarios/${currentUserId}/actualizar`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!ok) {
        alert(text || "No se pudo actualizar.");
        return;
    }

    alert("Usuario actualizado");
    closeUserModal();

    // Refresca la vista actual
    const currentView = getParam('view') || 'proyectos';
    loadPanelFromUrl(`/admin?view=${currentView}`, false);
});

// Eliminar
document.getElementById('btnEliminarUsuario')?.addEventListener('click', async () => {
    if (!currentUserId) return;

    if (!confirm("¿Seguro que quieres eliminar este usuario?")) return;

    const { ok, text } = await fetchJson(`/admin/usuarios/${currentUserId}/eliminar`, {
        method: 'POST'
    });

    if (!ok) {
        alert(text || "No se pudo eliminar.");
        return;
    }

    alert("Usuario eliminado");
    closeUserModal();

    const currentView = getParam('view') || 'proyectos';
    loadPanelFromUrl(`/admin?view=${currentView}`, false);
});

// Crear (botón +) 
document.getElementById('btnAdd')?.addEventListener('click', () => {
    // Reusa el modal para crear
    currentUserId = null;
	
    document.getElementById('mNombre').value = '';
    document.getElementById('mApellido').value = '';
    document.getElementById('mUsername').value = '';
    document.getElementById('mEmail').value = '';
    document.getElementById('mRol').value = 'nuevo';
    if (document.getElementById('mPassword')) document.getElementById('mPassword').value = '';
    if (document.getElementById('mRolNombre')) document.getElementById('mRolNombre').value = '';

	resetPasswordVisibility();
	openUserModal();
});

// Mostrar/ocultar password 
const mPassword = document.getElementById('mPassword');
const togglePassword = document.getElementById('togglePassword');
const togglePasswordIcon = document.getElementById('togglePasswordIcon');
const passwordWrap = document.querySelector('.password-wrap');

function setEyeIcon(isVisible){
  // Ruta de los iconos
  if(!togglePasswordIcon) return;
  togglePasswordIcon.src = isVisible
    ? '/assets/iconos/ojo.png'
    : '/assets/iconos/ojo-cerrado.png';
  togglePassword?.setAttribute('aria-label', isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña');
}

togglePassword?.addEventListener('click', () => {
  if(!mPassword) return;
  const visible = mPassword.type === 'text';
  mPassword.type = visible ? 'password' : 'text';
  setEyeIcon(!visible);
});

function updateEyeVisibility(){
  if(!passwordWrap || !mPassword) return;

  const hasText = mPassword.value.trim().length > 0;
  passwordWrap.classList.toggle('show-eye', hasText);

  // Si se borra el texto, vuelve a ocultar y deja tipo password
  if(!hasText){
    mPassword.type = 'password';
    setEyeIcon(false);
  }
}

mPassword?.addEventListener('input', updateEyeVisibility);

// Cada vez que abras el modal, reinicia a "password"
function resetPasswordVisibility(){
  if(!mPassword) return;
  
  mPassword.value = "";              // vacío
  mPassword.type = 'password';       // oculto
  setEyeIcon(false);                 // icono default
  updateEyeVisibility();             // esto oculta el botón
}
