import * as api from './api.js';
import * as ui from './ui.js';
import { getParam, getViewFromUrl, syncSidebarWithView, loadPanelFromUrl } from './navigation.js';

let currentView = getParam('view') || 'proyectos';
let currentEstado = 'ACTIVO';
let currentList = [];

function updateCurrentEstadoByView() {
  if (currentView !== 'proyectos') return;

  currentEstado = currentEstado && ['ACTIVO', 'INACTIVO', 'FINALIZADO'].includes(currentEstado)
    ? currentEstado
    : 'ACTIVO';
}

function syncTabsVisually() {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.tabs .tab[data-estado="${currentEstado}"]`);
  if (activeTab) activeTab.classList.add('active');
}

async function loadAndRender() {
  if (currentView !== 'proyectos') return;

  try {
    updateCurrentEstadoByView();
    syncTabsVisually();
    
    // Limpiamos el buscador al recargar la vista
    const searchSupervisor = document.getElementById('searchSupervisor');
    if (searchSupervisor) searchSupervisor.value = '';

    currentList = await api.fetchProyectos(currentEstado);
    ui.renderCards(currentList, openDetalleProyecto);
  } catch (e) {
    await ui.showCustomAlert(`No se pudieron cargar los proyectos: ${e.message}`, 'Error');
  }
}

async function openDetalleProyecto(idProyecto) {
  try {
    const dto = await api.fetchDetalleProyecto(idProyecto);
    ui.renderDetalleProyecto(dto);
    ui.openModal(
      document.getElementById('detalleModal'),
      document.getElementById('detalleBackdrop')
    );
  } catch (e) {
    await ui.showCustomAlert(`No se pudo cargar el detalle: ${e.message}`, 'Error');
  }
}

function bindTabs() {
  document.querySelectorAll('#tabsSupervisor .tab').forEach(tab => {
    if (tab.dataset.bound === 'true') return;
    tab.dataset.bound = 'true';

    tab.addEventListener('click', async () => {
      currentEstado = tab.dataset.estado;
      await loadAndRender();
    });
  });
}

function bindSearch() {
  const searchSupervisor = document.getElementById('searchSupervisor');

  searchSupervisor?.addEventListener('input', () => {
    const q = (searchSupervisor.value || '').toLowerCase().trim();

    if (!q) {
      ui.renderCards(currentList, openDetalleProyecto);
      return;
    }

    const filtered = currentList.filter(x =>
      (x.nombreEscuela ?? '').toLowerCase().includes(q) ||
      (x.constructor ?? '').toLowerCase().includes(q)
    );

    ui.renderCards(filtered, openDetalleProyecto);
  });
}

function bindModalActions() {
  document.getElementById('btnCerrarDetalle')?.addEventListener('click', () => {
    ui.closeModal(
      document.getElementById('detalleModal'),
      document.getElementById('detalleBackdrop')
    );
  });

  document.getElementById('detalleBackdrop')?.addEventListener('click', () => {
    ui.closeModal(
      document.getElementById('detalleModal'),
      document.getElementById('detalleBackdrop')
    );
  });

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    const detalleModal = document.getElementById('detalleModal');
    if (detalleModal?.classList.contains('open')) {
      ui.closeModal(
        document.getElementById('detalleModal'),
        document.getElementById('detalleBackdrop')
      );
    }
  });
}

function initProfilePhoto() {
  const profileBtn = document.getElementById('profileBtn');
  const profileFile = document.getElementById('profileFile');

  const btnViewPhoto = document.getElementById('btnViewPhoto');
  const btnUploadPhoto = document.getElementById('btnUploadPhoto');
  const btnDeletePhoto = document.getElementById('btnDeletePhoto');

  const fotoUrl = profileBtn?.dataset?.foto || '';
  ui.renderProfilePhoto(fotoUrl);

  // 1. Abrir/Cerrar menú
  profileBtn?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    ui.toggleProfileMenu();
  });

  // 2. Subir foto
  btnUploadPhoto?.addEventListener('click', () => {
    ui.closeProfileMenu();
    profileFile?.click();
  });

  // 3. Ver foto
  btnViewPhoto?.addEventListener('click', () => {
    ui.closeProfileMenu();
    const currentFoto = profileBtn?.dataset?.foto;
    if (currentFoto && !currentFoto.includes('sinFotoPerfil.png')) {
      window.open(currentFoto, '_blank');
    } else {
      ui.showCustomAlert("Aún no has subido una foto de perfil.", "Ver foto");
    }
  });

  // 4. Eliminar foto
  btnDeletePhoto?.addEventListener('click', async () => {
    ui.closeProfileMenu();
    const currentFoto = profileBtn?.dataset?.foto;

    if (!currentFoto || currentFoto.includes('sinFotoPerfil.png')) {
      return ui.showCustomAlert("No tienes una foto de perfil personalizada para eliminar.", "Aviso");
    }

   const confirmado = await ui.showCustomConfirm("¿Estás seguro de que deseas eliminar tu foto de perfil?", "Eliminar foto");
    if (!confirmado) return;

    try {
      const data = await api.deleteProfilePhoto();
      const defaultUrl = data?.url || '/assets/iconos/sinFotoPerfil.png';
      ui.renderProfilePhoto(defaultUrl);
      if (profileBtn) profileBtn.dataset.foto = defaultUrl;
      ui.showCustomAlert("Tu foto de perfil ha sido eliminada.", "Éxito");
    } catch (err) {
      ui.showCustomAlert(err.message, "Error");
    }
  });

  // 5. Manejar cambio de archivo
  profileFile?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Previsualización inmediata
    const profileImg = document.getElementById('profileImg');
    const profileFallback = document.getElementById('profileFallback');
    profileImg.src = URL.createObjectURL(file);
    profileImg.style.display = 'block';
    profileFallback.style.display = 'none';

    try {
      const url = await api.uploadProfilePhoto(file);
      ui.renderProfilePhoto(url);

      if (profileBtn) {
        profileBtn.dataset.foto = url;
      }
    } catch (err) {
      ui.renderProfilePhoto(profileBtn?.dataset?.foto || '');
      await ui.showCustomAlert(err.message || 'Error al subir la foto.', 'Error');
    } finally {
      profileFile.value = '';
    }
  });
}

function bindPasswordForm() {
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'formCambiarPassword') return;

    e.preventDefault();

    const passActual = document.getElementById('passActual')?.value || '';
    const passNueva = document.getElementById('passNueva')?.value || '';
    const passRepetida = document.getElementById('passRepetida')?.value || '';

    const tieneNumero = /[0-9]/.test(passNueva);
    const tieneEspecial = /[^A-Za-z0-9]/.test(passNueva);

    if (passNueva.length < 8 || !tieneNumero || !tieneEspecial) {
      await ui.showCustomAlert(
        'La nueva contraseña debe tener 8 caracteres como mínimo, 1 número y 1 caracter especial.',
        'Contraseña débil'
      );
      return;
    }

    if (passNueva !== passRepetida) {
      await ui.showCustomAlert('Las contraseñas nuevas no coinciden.', 'Error');
      return;
    }

    try {
      await api.changePassword({ passActual, passNueva });
      await ui.showCustomAlert('Tu contraseña ha sido actualizada correctamente.', 'Éxito');
      document.getElementById('formCambiarPassword')?.reset();
    } catch (e) {
      await ui.showCustomAlert(e.message || 'Ocurrió un error al cambiar la contraseña.', 'Error');
    }
  });
}

function bindNavigation() {
  document.getElementById('navProyectos')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await loadPanelFromUrl({
      href: '/supervisor?view=proyectos',
      push: true,
      onAfterLoad: (newView) => {
        currentView = newView;
        bindTabs();
        loadAndRender();
      }
    });
  });

  document.getElementById('navPassword')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await loadPanelFromUrl({
      href: '/supervisor?view=password',
      push: true,
      onAfterLoad: (newView) => {
        currentView = newView;
      }
    });
  });

  window.addEventListener('popstate', async (e) => {
    const href = (e.state && e.state.href) ? e.state.href : window.location.href;
    const view = getViewFromUrl(href);

    currentView = view;
    syncSidebarWithView(currentView);

    await loadPanelFromUrl({
      href,
      push: false,
      onAfterLoad: () => {
        bindTabs();
        loadAndRender();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  currentView = getParam('view') || 'proyectos';
  syncSidebarWithView(currentView);

  bindNavigation();
  bindTabs();
  bindSearch();
  bindModalActions();
  bindPasswordForm();
  initProfilePhoto();

  await loadAndRender();
});