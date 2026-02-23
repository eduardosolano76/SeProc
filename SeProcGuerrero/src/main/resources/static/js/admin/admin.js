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

const btnAdd = document.getElementById('btnAdd');
const btnAddIcon = document.getElementById('btnAddIcon');

// Cargar vista sin recargar y sin parpadeo 
async function loadPanelFromUrl(href, push = true) {
    if (!panelContent) {
        window.location.href = href;
        return;
    }

    panelContent.innerHTML = `<div class="panel-sub">Cargando...</div>`;

    try {
        const res = await fetch(href, {
            cache: "no-store",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        if (!res.ok) throw new Error("HTTP " + res.status);

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const newPanelContent = doc.getElementById("panelContent");
        const newTitle = doc.getElementById("sectionTitle")?.textContent?.trim();
        const fragment = doc.body?.firstElementChild || doc.body;

        if (newPanelContent) {
            panelContent.innerHTML = newPanelContent.innerHTML;
            if (newTitle && sectionTitle) sectionTitle.textContent = newTitle;
        } else {
            panelContent.innerHTML = fragment.innerHTML;

            const view = getViewFromUrl(href);
            const titles = {
                "usuarios-supervisores": "Supervisores",
                "usuarios-constructores": "Constructores",
                "usuarios-directores": "Directores",
                "usuarios-central": "Central",
                "usuarios-administrador": "Administrador",
            };
            if (sectionTitle) sectionTitle.textContent = titles[view] || "Usuarios";
        }

        if (push) history.pushState({ href }, "", href);

        syncSidebarWithUrl(href);
        syncAddButtonWithUrl(href);
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

    closeUsuariosMenu(); // Cierra “Usuarios” y limpia activos
    setActiveNav('navProyectos');
    loadPanelFromUrl('/admin?view=proyectos', true);
});

// Pendientes
document.getElementById('navSolicitudes')?.addEventListener('click', (ev) => {
    ev.preventDefault?.();

    closeUsuariosMenu(); // Cierra “Usuarios” y limpia activos
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
    syncSidebarWithUrl(href); // Mantener sidebar correcto

    syncAddButtonWithUrl(href);
});

// Foto de perfil
const profileBtn = document.getElementById('profileBtn');
const profileFile = document.getElementById('profileFile');
const profileImg = document.getElementById('profileImg');
const profileFallback = document.getElementById('profileFallback');

document.addEventListener("DOMContentLoaded", () => {
  const fotoUrl = profileBtn?.dataset?.foto;
  if (fotoUrl) {
    profileImg.src = fotoUrl + "?t=" + Date.now();
    profileImg.style.display = 'block';
    profileFallback.style.display = 'none';
  }
});

profileBtn?.addEventListener('click', () => profileFile?.click());

async function uploadProfilePhoto(file) {
  const { token, header } = getCsrf();

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/perfil/foto", {
    method: "POST",
    body: form,
    headers: token && header ? { [header]: token } : {}
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo subir la foto.");

  return data.url; // url pública
}

profileFile?.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  // preview inmediato
  const previewUrl = URL.createObjectURL(file);
  profileImg.src = previewUrl;
  profileImg.style.display = 'block';
  profileFallback.style.display = 'none';

  try {
    const url = await uploadProfilePhoto(file);

    // usa la URL real (guardada en BD)
    profileImg.src = url + "?t=" + Date.now(); // cache-bust
    profileImg.style.display = 'block';
    profileFallback.style.display = 'none';
  } catch (err) {
    alert(err.message || "Error al subir la foto.");
  }
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

syncAddButtonWithUrl(window.location.href);
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

let modalMode = "EDIT"; // "CREATE" | "EDIT"

function setModalMode(mode) {
  modalMode = mode;

  const title = document.getElementById("userModalTitle");
  const btnSave = document.getElementById("btnGuardarUsuario");
  const btnDelete = document.getElementById("btnEliminarUsuario");
  
  const pass = document.getElementById("mPassword");
  const lblPass = document.getElementById("lblPassword");
  
  if (mode === "CREATE") {
    if (title) title.textContent = "Agregar usuario";
    if (btnSave) btnSave.textContent = "Crear usuario";
    if (btnDelete) btnDelete.style.display = "none"; // ocultar eliminar
	
	// Password en CREATE
	if (lblPass) lblPass.textContent = "Password (obligatorio)";
	if (pass) pass.placeholder = "Escribe una contraseña";
  } else {
    if (title) title.textContent = "Detalle de usuario";
    if (btnSave) btnSave.textContent = "Guardar cambios";
    if (btnDelete) btnDelete.style.display = "inline-flex"; // mostrar eliminar
	
	// Password en EDIT
	if (lblPass) lblPass.textContent = "Password";
	if (pass) pass.placeholder = "Deja vacío para no cambiar";
  }
}

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
		
		setModalMode("EDIT");

        document.getElementById('mNombre').value = u.nombre ?? '';
        document.getElementById('mApellido').value = u.apellido ?? '';
        document.getElementById('mUsername').value = u.username ?? '';
        document.getElementById('mEmail').value = u.email ?? '';
        document.getElementById('mRol').value = (u.rol && u.rol.nombre) ? u.rol.nombre : 'sin rol';
		
		// Ocultar/ mostrar el boton eliminar si es el mismo usuario logueado
		const btnDelete = document.getElementById("btnEliminarUsuario");
		const logged = (window.LOGGED_USERNAME || "").toLowerCase();
		const selected = (u.username || "").toLowerCase();

		if (selected === logged) {
		  if (btnDelete) btnDelete.style.display = "none";
		} else {
		  if (btnDelete) btnDelete.style.display = "inline-flex";
		}

		
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

  const payload = {
    nombre: document.getElementById('mNombre').value.trim(),
    apellido: document.getElementById('mApellido').value.trim(),
    username: document.getElementById('mUsername').value.trim(),
    email: document.getElementById('mEmail').value.trim(),
    password: document.getElementById('mPassword')?.value || "",
    rolNombre: document.getElementById('mRolNombre')?.value || "" 
  };

  // CREATE
  if (modalMode === "CREATE") {

    // Validación mínima (porque el backend exige password)
    if (!payload.password || payload.password.trim().length === 0) {
      alert("Password es obligatorio para crear.");
      return;
    }

    const { ok, text } = await fetchJson(`/admin/usuarios/crear`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!ok) {
      alert(text || "No se pudo crear.");
      return;
    }

    alert("Usuario creado");
    closeUserModal();

    const currentView = getParam('view') || 'proyectos';
    loadPanelFromUrl(`/admin?view=${currentView}`, false);
    return;
  }

  // EDIT
  if (!currentUserId) return;

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
btnAdd?.addEventListener('click', () => {
    const action = btnAdd.dataset.action;
    const rol = btnAdd.dataset.rol || "";

    if (action === 'proyecto') {
        // Más adelante se hara el modal de proyecto o algo similar
        alert("Aquí irá: Agregar proyecto (pendiente)");
        return;
    }

    // Crear usuario (reusa modal)
    currentUserId = null;
	setModalMode("CREATE");

    document.getElementById('mNombre').value = '';
    document.getElementById('mApellido').value = '';
    document.getElementById('mUsername').value = '';
    document.getElementById('mEmail').value = '';

    // Aquí se guarda el rol que se va a crear
    document.getElementById('mRol').value = rol || 'nuevo';

    document.getElementById('mRolNombre').value = rol || '';

    resetPasswordVisibility();
    openUserModal();
});

// Mostrar/ocultar password 
const mPassword = document.getElementById('mPassword');
const togglePassword = document.getElementById('togglePassword');
const togglePasswordIcon = document.getElementById('togglePasswordIcon');
const passwordWrap = document.querySelector('.password-wrap');

function setEyeIcon(isVisible) {
    // Ruta de los iconos
    if (!togglePasswordIcon) return;
    togglePasswordIcon.src = isVisible
        ? '/assets/iconos/ojo.png'
        : '/assets/iconos/ojo-cerrado.png';
    togglePassword?.setAttribute('aria-label', isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña');
}

togglePassword?.addEventListener('click', () => {
    if (!mPassword) return;
    const visible = mPassword.type === 'text';
    mPassword.type = visible ? 'password' : 'text';
    setEyeIcon(!visible);
});

function updateEyeVisibility() {
    if (!passwordWrap || !mPassword) return;

    const hasText = mPassword.value.trim().length > 0;
    passwordWrap.classList.toggle('show-eye', hasText);

    // Si se borra el texto, vuelve a ocultar y deja tipo password
    if (!hasText) {
        mPassword.type = 'password';
        setEyeIcon(false);
    }
}

mPassword?.addEventListener('input', updateEyeVisibility);

// Cada vez que abras el modal, reinicia a "password" 
function resetPasswordVisibility() {
    if (!mPassword) return;

    mPassword.value = "";              // vacío
    mPassword.type = 'password';       // oculto
    setEyeIcon(false);                 // icono default
    updateEyeVisibility();             // esto oculta el botón
}

// Cuando cambies a Proyectos/Pendientes, cierra “Usuarios” y limpia activos 
function closeUsuariosMenu() {
    // quita active a sub-items
    document.querySelectorAll('#submenuUsuarios .sub-item')
        .forEach(x => x.classList.remove('active'));

    // cierra submenu y marca data-open false
    navUsuarios?.setAttribute('data-open', 'false');
    submenuUsuarios?.classList.remove('open');
}

// 
function syncSidebarWithUrl(url) {
    const view = new URL(url, window.location.origin).searchParams.get('view') || 'proyectos';

    if (view === 'pendientes') {
        closeUsuariosMenu();
        setActiveNav('navSolicitudes');
        return;
    }

    if (view.startsWith('usuarios-')) {
        setActiveNav('navUsuarios');
        navUsuarios?.setAttribute('data-open', 'true');
        submenuUsuarios?.classList.add('open');
        const link = document.querySelector(`#submenuUsuarios .sub-item[data-view="${view}"]`);
        setActiveSubItem(link);
        return;
    }

    closeUsuariosMenu();
    setActiveNav('navProyectos');
}

// Funcion para configurar el boton segun la vista 
function getViewFromUrl(url) {
    return new URL(url, window.location.origin).searchParams.get('view') || 'proyectos';
}

// Mapa de rol por vista (para que el modal sepa qué crear)
const roleByView = {
    "usuarios-supervisores": "supervisor",
    "usuarios-constructores": "contratista",
    "usuarios-directores": "direccion",
    "usuarios-central": "central",
    "usuarios-administrador": "administrador",
};

function syncAddButtonWithUrl(url) {
    const view = getViewFromUrl(url);

    // Pendientes: ocultar
    if (view === 'pendientes') {
        if (btnAdd) btnAdd.style.display = 'none';
        return;
    }

    // Proyectos: mostrar + icono de proyecto
    if (view === 'proyectos') {
        if (btnAdd) btnAdd.style.display = 'grid';
        if (btnAddIcon) btnAddIcon.src = '/assets/iconos/agregar-proyecto.png';
        if (btnAdd) btnAdd.title = 'Agregar proyecto';
        if (btnAdd) btnAdd.dataset.action = 'proyecto';
        delete btnAdd?.dataset.rol;
        return;
    }

    // Usuarios por rol: mostrar + icono usuario + guardar rol
    if (view.startsWith('usuarios-')) {
        if (btnAdd) btnAdd.style.display = 'grid';
        if (btnAddIcon) btnAddIcon.src = '/assets/iconos/agregar-usuario.png';
        if (btnAdd) btnAdd.title = 'Agregar usuario';
        if (btnAdd) btnAdd.dataset.action = 'usuario';
        if (btnAdd) btnAdd.dataset.rol = roleByView[view] || '';
        return;
    }

    // Default: por seguridad
    if (btnAdd) btnAdd.style.display = 'grid';
}

