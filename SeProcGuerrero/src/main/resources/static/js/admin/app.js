// app.js - Módulo principal que une todo: maneja eventos globales, estado de la vista, y coordina entre api.js, ui.js y navigation.js
import { fetchJson } from './api.js';
import { 
    showCustomAlert, 
    showCustomConfirm, 
    openUserModal, 
    closeUserModal, 
    setModalMode, 
    resetPasswordVisibility,
    syncSidebarWithUrl,
    syncAddButtonWithUrl,
    setActiveNav,
	
	closeProfileMenu,
	toggleProfileMenu
	
} from './ui.js';
import { loadPanelFromUrl, getViewFromUrl } from './navigation.js';

// Estado global de la vista
let currentUserId = null;
let modalMode = "EDIT"; // "CREATE" | "EDIT"

// Inicialización 
document.addEventListener("DOMContentLoaded", () => {
    const view = getViewFromUrl();
    syncAddButtonWithUrl(view);
    syncSidebarWithUrl(view);
    
    // Cargar la vista inicial si es necesario
    if (view === 'pendientes') setActiveNav('navSolicitudes');
    else if (view === 'password') setActiveNav('navPassword');
    else if (!view.startsWith('usuarios-')) setActiveNav('navProyectos');

    bindUserRowClicks();
});

// Eventos de navegacion y menú
document.getElementById('navProyectos')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    loadPanelFromUrl('/admin?view=proyectos', true);
});

// Abrir/Cerrar submenú de Usuarios
document.getElementById('navUsuarios')?.addEventListener('click', () => {
    const navUsuarios = document.getElementById('navUsuarios');
    const submenuUsuarios = document.getElementById('submenuUsuarios');
    
    const isOpen = navUsuarios.getAttribute('data-open') === 'true';
    navUsuarios.setAttribute('data-open', String(!isOpen));
    submenuUsuarios?.classList.toggle('open', !isOpen);
    setActiveNav('navUsuarios');
});

// Eventos de navegación principal
document.getElementById('navSolicitudes')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    loadPanelFromUrl('/admin?view=pendientes', true);
});

// Para el cambio de contraseña
document.getElementById('navPassword')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    loadPanelFromUrl('/admin?view=password', true);
});

// Subitems de Usuarios
document.querySelectorAll('#submenuUsuarios .sub-item').forEach(a => {
    a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const href = a.getAttribute('href');
        if (href) loadPanelFromUrl(href, true);
    });
});

// Botón de menú móvil
document.getElementById('btnMenu')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('menu-open');
});

// Botón de retroceso/avance del navegador
window.addEventListener('popstate', (e) => {
    const href = (e.state && e.state.href) ? e.state.href : window.location.href;
    loadPanelFromUrl(href, false);
});

// Eventos del modal de usuarios
document.getElementById('userModalClose')?.addEventListener('click', () => {
    closeUserModal();
    currentUserId = null;
});

// Abrir modal para CREAR
document.getElementById('btnAdd')?.addEventListener('click', () => {
    const btnAdd = document.getElementById('btnAdd');
    const rol = btnAdd.dataset.rol || "";

    currentUserId = null;
    modalMode = "CREATE";
    setModalMode("CREATE");

    document.getElementById('mNombre').value = '';
    document.getElementById('mApellido').value = '';
    document.getElementById('mUsername').value = '';
    document.getElementById('mEmail').value = '';
    document.getElementById('mRol').value = rol || 'nuevo';
    document.getElementById('mRolNombre').value = rol || '';

    resetPasswordVisibility();
    openUserModal();
});

// GUARDAR Usuario (Crear o Actualizar)
document.getElementById('btnGuardarUsuario')?.addEventListener('click', async () => {
    const payload = {
        nombre: document.getElementById('mNombre').value.trim(),
        apellido: document.getElementById('mApellido').value.trim(),
        username: document.getElementById('mUsername').value.trim(),
        email: document.getElementById('mEmail').value.trim(),
        password: document.getElementById('mPassword')?.value || "",
        rolNombre: document.getElementById('mRolNombre')?.value || ""
    };

    if (modalMode === "CREATE") {
        const { ok, message } = await fetchJson(`/admin/usuarios/crear`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (!ok) return showCustomAlert(message || "No se pudo crear.", "Error");
        
        await showCustomAlert("El usuario fue creado correctamente.", "Usuario creado");
    } else {
        if (!currentUserId) return;
        const { ok, message } = await fetchJson(`/admin/usuarios/${currentUserId}/actualizar`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!ok) return showCustomAlert(message || "No se pudo actualizar.", "Error");
        
        await showCustomAlert("Los datos fueron actualizados correctamente.", "Usuario actualizado");
    }

    closeUserModal();
    const currentView = getViewFromUrl();
    loadPanelFromUrl(`/admin?view=${currentView}`, false);
});

// ELIMINAR Usuario
document.getElementById('btnEliminarUsuario')?.addEventListener('click', async () => {
    if (!currentUserId) return;

    const confirmado = await showCustomConfirm("¿Estás seguro de que deseas eliminar este usuario de forma permanente?", "Eliminar usuario");
    if (!confirmado) return;

    const { ok, message } = await fetchJson(`/admin/usuarios/${currentUserId}/eliminar`, { method: 'POST' });

    if (!ok) return showCustomAlert(message || "No se pudo eliminar el usuario.", "Error");

    await showCustomAlert("El usuario fue eliminado correctamente.", "Eliminado");
    closeUserModal();
    
    const currentView = getViewFromUrl();
    loadPanelFromUrl(`/admin?view=${currentView}`, false);
});

// FUNCIONES DE TABLAS (Clicks en filas y Aprobar)
// Como los módulos de ES6 no exponen funciones al HTML directamente, 
// necesitamos atar esta función al objeto window para que los "onclick" en el HTML sigan funcionando.
window.aprobarUsuario = function(btn) {
    const id = btn.getAttribute('data-id');
    const sel = document.getElementById('rol-' + id);
    if (!sel.checkValidity()) {
        sel.reportValidity();
        return;
    }
    document.getElementById('rolHidden-' + id).value = sel.value;
    document.getElementById('aprobar-' + id).submit();
};

// Función para mostrar el detalle de un usuario en el modal
async function showUserDetail(id) {
    try {
        const res = await fetch(`/admin/usuarios/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const u = await res.json();

        currentUserId = id;
        modalMode = "EDIT";
        setModalMode("EDIT");

        document.getElementById('mNombre').value = u.nombre ?? '';
        document.getElementById('mApellido').value = u.apellido ?? '';
        document.getElementById('mUsername').value = u.username ?? '';
        document.getElementById('mEmail').value = u.email ?? '';
        
		document.getElementById('mRol').value = (u.rol && u.rol.nombre) ? u.rol.nombre : 'sin rol';
		
		// Limpiamos el campo oculto para que no envíe roles accidentalmente
		document.getElementById('mRolNombre').value = '';
        
        const btnDelete = document.getElementById("btnEliminarUsuario");
        const logged = (window.LOGGED_USERNAME || "").toLowerCase();
        const selected = (u.username || "").toLowerCase();
        if (btnDelete) btnDelete.style.display = (selected === logged) ? "none" : "inline-flex";

        resetPasswordVisibility();
        openUserModal();
    } catch (e) {
       await showCustomAlert("No se pudo cargar la información del usuario.", "Error");
    }
}

// Función para vincular los clics en las filas de usuario a la función de mostrar detalle
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

// Re-vincular los clics de la tabla cuando navigation.js avisa que se cargó un nuevo panel
window.addEventListener('panelLoaded', bindUserRowClicks);

// Cambiar contraseña
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'formCambiarPassword') {
        e.preventDefault();
        
        const payload = {
            passActual: document.getElementById('passActual').value.trim(),
            passNueva: document.getElementById('passNueva').value.trim(),
            passRepetida: document.getElementById('passRepetida').value.trim()
        };

        if (!payload.passActual || !payload.passNueva || !payload.passRepetida) {
            return showCustomAlert("Todos los campos son obligatorios.", "Error");
        }

        const { ok, message } = await fetchJson('/admin/perfil/password', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!ok) return showCustomAlert(message || "Ocurrió un error al cambiar la contraseña.", "Error");

        await showCustomAlert("Tu contraseña ha sido actualizada correctamente.", "Éxito");
        document.getElementById('formCambiarPassword').reset();
    }
});

// Logica de foto de perfil
const profileBtn = document.getElementById('profileBtn');
const profileFile = document.getElementById('profileFile');
const profileImg = document.getElementById('profileImg');

// Elementos del nuevo menú
const btnViewPhoto = document.getElementById('btnViewPhoto');
const btnUploadPhoto = document.getElementById('btnUploadPhoto');
const btnDeletePhoto = document.getElementById('btnDeletePhoto');

function addCacheBuster(url) {
  if (!url) return url;
  return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
}

// 1. Abrir/Cerrar menú al hacer clic en el botón de perfil
profileBtn?.addEventListener('click', (ev) => {
    ev.stopPropagation(); // Evita interferencias
    toggleProfileMenu(); 
});

// 3. Acción "Subir foto": abre el selector de archivos
btnUploadPhoto?.addEventListener('click', () => {
    closeProfileMenu(); // Cierra el menú primero
    profileFile?.click(); // Abre el explorador de archivos
});

// 4. Acción "Ver foto": abre la foto actual en una pestaña nueva
btnViewPhoto?.addEventListener('click', () => {
    closeProfileMenu(); // Cierra el menú
    const fotoUrl = profileBtn?.dataset?.foto;
    if (fotoUrl && !fotoUrl.includes('sinFotoPerfil.png')) {
        window.open(fotoUrl, '_blank'); // Abre la foto en una nueva pestaña
    } else {
        showCustomAlert("Aún no has subido una foto de perfil.", "Ver foto");
    }
});

// 5. Manejar el cambio de archivo (cuando el usuario selecciona una imagen)
profileFile?.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  // Previsualización inmediata
  const previewUrl = URL.createObjectURL(file);
  profileImg.src = previewUrl;

  try {
    const form = new FormData();
    form.append("file", file);

    // Obtener CSRF directamente para este fetch especial
    const token = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
    const header = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');
    const headers = {};
    if (token && header) headers[header] = token;

    // Subir al servidor (tu endpoint actual)
    const res = await fetch("/perfil/foto", {
      method: "POST",
      body: form,
      headers: headers
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "No se pudo subir la foto.");

    // Actualizar con la URL final y cache buster
    const finalUrl = addCacheBuster(data.url);
    profileImg.src = finalUrl;
    if (profileBtn) profileBtn.dataset.foto = data.url;

  } catch (err) {
    // Si falla, revertir a la foto anterior
    profileImg.src = addCacheBuster(profileBtn?.dataset?.foto);
    await showCustomAlert(err.message || "Error al subir la foto.", "Error");
  }
});

// 6. Acción "Eliminar foto": pide confirmación y hace la petición
btnDeletePhoto?.addEventListener('click', async () => {
    closeProfileMenu(); // Cierra el menú

    const fotoUrl = profileBtn?.dataset?.foto;
    // Validar si ya está usando la imagen por defecto
    if (!fotoUrl || fotoUrl.includes('sinFotoPerfil.png')) {
        return showCustomAlert("No tienes una foto de perfil personalizada para eliminar.", "Aviso");
    }

    const confirmado = await showCustomConfirm("¿Estás seguro de que deseas eliminar tu foto de perfil?", "Eliminar foto");
    if (!confirmado) return;

    // Petición DELETE al backend 
    const { ok, message, data } = await fetchJson('/perfil/foto', { method: 'DELETE' });

    if (!ok) return showCustomAlert(message || "No se pudo eliminar la foto.", "Error");

    // Actualizar la interfaz a la imagen por defecto
    const defaultUrl = data?.url || '/assets/iconos/sinFotoPerfil.png';
    profileImg.src = defaultUrl;
    if (profileBtn) profileBtn.dataset.foto = defaultUrl;
    
    showCustomAlert("Tu foto de perfil ha sido eliminada.", "Éxito");
});
