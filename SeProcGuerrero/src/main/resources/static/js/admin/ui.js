// ui.js - Módulo para manejar la interfaz de usuario: modales, alertas, menú lateral, etc.

// Alertas y confirmaciones personalizadas
const customAlert = document.getElementById('customAlert');
const customAlertTitle = document.getElementById('customAlertTitle');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertOk = document.getElementById('customAlertOk');
const customAlertCancel = document.getElementById('customAlertCancel');

// Función para cerrar la alerta personalizada
export function closeCustomAlert() {
    customAlert?.classList.remove('open');
    customAlert?.setAttribute('aria-hidden', 'true');
}

// Función para mostrar una alerta personalizada
export function showCustomAlert(message, title = "Atención") {
    return new Promise((resolve) => {
        if(customAlertTitle) customAlertTitle.textContent = title;
        if(customAlertMessage) customAlertMessage.textContent = message;
        if(customAlertCancel) customAlertCancel.style.display = 'none'; 
        
        customAlert?.classList.add('open');
        customAlert?.setAttribute('aria-hidden', 'false');

        const handleOk = () => {
            closeCustomAlert();
            customAlertOk?.removeEventListener('click', handleOk);
            resolve(true);
        };
        customAlertOk?.addEventListener('click', handleOk);
    });
}

// Función para mostrar una confirmación personalizada
export function showCustomConfirm(message, title = "Confirmar acción") {
    return new Promise((resolve) => {
        if(customAlertTitle) customAlertTitle.textContent = title;
        if(customAlertMessage) customAlertMessage.textContent = message;
        if(customAlertCancel) customAlertCancel.style.display = 'inline-flex'; 
        
        customAlert?.classList.add('open');
        customAlert?.setAttribute('aria-hidden', 'false');

        const handleOk = () => {
            cleanup();
            resolve(true);
        };
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            closeCustomAlert();
            customAlertOk?.removeEventListener('click', handleOk);
            customAlertCancel?.removeEventListener('click', handleCancel);
        };

        customAlertOk?.addEventListener('click', handleOk);
        customAlertCancel?.addEventListener('click', handleCancel);
    });
}

// Modal de usuarios y contraseñas
const userModal = document.getElementById('userModal');
const mPassword = document.getElementById('mPassword');
const togglePasswordIcon = document.getElementById('togglePasswordIcon');
const passwordWrap = document.querySelector('.password-wrap');

// Funciones para abrir y cerrar el modal de usuario
export function openUserModal() {
    userModal?.classList.add('open');
    userModal?.setAttribute('aria-hidden', 'false');
}

// Función para cerrar el modal de usuario
export function closeUserModal() {
    userModal?.classList.remove('open');
    userModal?.setAttribute('aria-hidden', 'true');
}

// Función para configurar el modal según el modo (crear o editar)
export function setModalMode(mode) {
    const title = document.getElementById("userModalTitle");
    const btnSave = document.getElementById("btnGuardarUsuario");
    const btnDelete = document.getElementById("btnEliminarUsuario");
    const lblPass = document.getElementById("lblPassword");
  
    if (mode === "CREATE") {
        if (title) title.textContent = "Agregar usuario";
        if (btnSave) btnSave.textContent = "Crear usuario";
        if (btnDelete) btnDelete.style.display = "none"; 
        if (lblPass) lblPass.textContent = "Password (obligatorio)";
        if (mPassword) mPassword.placeholder = "Escribe una contraseña";
    } else {
        if (title) title.textContent = "Detalle de usuario";
        if (btnSave) btnSave.textContent = "Guardar cambios";
        if (btnDelete) btnDelete.style.display = "inline-flex"; 
        if (lblPass) lblPass.textContent = "Password";
        if (mPassword) mPassword.placeholder = "Deja vacío para no cambiar";
    }
}

// Función para mostrar u ocultar la contraseña y actualizar el ícono
export function setEyeIcon(isVisible) {
    if (!togglePasswordIcon) return;
    togglePasswordIcon.src = isVisible ? '/assets/iconos/ojo.png' : '/assets/iconos/ojo-cerrado.png';
}

// Función para alternar la visibilidad de la contraseña
export function updateEyeVisibility() {
    if (!passwordWrap || !mPassword) return;
    const hasText = mPassword.value.trim().length > 0;
    passwordWrap.classList.toggle('show-eye', hasText);

    if (!hasText) {
        mPassword.type = 'password';
        setEyeIcon(false);
    }
}

// Función para alternar el tipo de input entre 'password' y 'text'
export function resetPasswordVisibility() {
    if (!mPassword) return;
    mPassword.value = "";              
    mPassword.type = 'password';       
    setEyeIcon(false);                 
    updateEyeVisibility();             
}

// Menu lateral y botones de la vista
export function setActiveNav(buttonId) {
    document.querySelectorAll('.nav .nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(buttonId)?.classList.add('active');
}

// Función para establecer el subítem activo en el menú de usuarios
export function setActiveSubItem(clicked) {
    document.querySelectorAll('#submenuUsuarios .sub-item').forEach(x => x.classList.remove('active'));
    clicked?.classList.add('active');
}

// Función para cerrar el submenú de usuarios y desactivar sus subítems
export function closeUsuariosMenu() {
    document.querySelectorAll('#submenuUsuarios .sub-item').forEach(x => x.classList.remove('active'));
    const navUsuarios = document.getElementById('navUsuarios');
    const submenuUsuarios = document.getElementById('submenuUsuarios');
    
    navUsuarios?.setAttribute('data-open', 'false');
    submenuUsuarios?.classList.remove('open');
}

// Función para cerrar el menú lateral en dispositivos móviles
export function closeMobileMenu() {
    if (window.matchMedia("(max-width: 768px)").matches) {
        document.getElementById('sidebar')?.classList.remove('menu-open');
    }
}

// Función para sincronizar el estado del menú lateral con la vista actual basada en la URL
export function syncSidebarWithUrl(view) {
    const navUsuarios = document.getElementById('navUsuarios');
    const submenuUsuarios = document.getElementById('submenuUsuarios');

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
    if (view === 'password') {
        closeUsuariosMenu();
        setActiveNav('navPassword');
        return;
    }

    closeUsuariosMenu();
    setActiveNav('navProyectos');
}

// Función para mostrar u ocultar el botón de agregar según la vista actual
export function syncAddButtonWithUrl(view) {
    const btnAdd = document.getElementById('btnAdd');
    const btnAddIcon = document.getElementById('btnAddIcon');
    const panelHead = document.querySelector('.panel-head');
	
    if (view === 'password') {
        if (panelHead) panelHead.style.display = 'none';
        if (btnAdd) btnAdd.style.display = 'none';
        return;
    }
    if (panelHead) panelHead.style.display = 'flex';

    if (view === 'pendientes' || view === 'proyectos') {
        if (btnAdd) btnAdd.style.display = 'none';
        return;
    }

    if (view.startsWith('usuarios-')) {
        if (btnAdd) btnAdd.style.display = 'grid';
        if (btnAddIcon) btnAddIcon.src = '/assets/iconos/agregar-usuario.png';
        if (btnAdd) {
            btnAdd.title = 'Agregar usuario';
            const roleByView = {
                "usuarios-supervisores": "supervisor",
                "usuarios-constructores": "contratista",
                "usuarios-directores": "direccion",
                "usuarios-central": "central",
                "usuarios-administrador": "administrador",
            };
            btnAdd.dataset.rol = roleByView[view] || '';
        }
        return;
    }
}

// Eventos del input de contraseña y el botón de mostrar/ocultar
const togglePassword = document.getElementById('togglePassword');

togglePassword?.addEventListener('click', () => {
    if (!mPassword) return;
    const visible = mPassword.type === 'text';
    mPassword.type = visible ? 'password' : 'text';
    setEyeIcon(!visible);
});

mPassword?.addEventListener('input', updateEyeVisibility);

// Menú desplegable de la foto de perfil
const profileMenuDropdown = document.getElementById('profileMenuDropdown');

export function closeProfileMenu() {
    profileMenuDropdown?.classList.remove('open');
}

export function toggleProfileMenu() {
    profileMenuDropdown?.classList.toggle('open');
}

// Escuchar clics en todo el documento para cerrar el menú si haces clic afuera
document.addEventListener('click', (e) => {
    // Si el menú está abierto y el clic NO fue dentro de .userbox, cerramos el menú
    if (profileMenuDropdown?.classList.contains('open') && !e.target.closest('.userbox')) {
        closeProfileMenu();
    }
});