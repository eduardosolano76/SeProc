import * as api from './api.js';
import * as ui from './ui.js';
import { getParam, syncSidebarWithView } from './navigation.js';

let currentView = getParam('view') || 'proyectos';
let currentEstado = 'ACTIVO';
let currentList = [];

function updateCurrentEstadoByView() {
  if (currentView !== 'proyectos') return;

  currentEstado = currentEstado && ['ACTIVO', 'INACTIVO', 'FINALIZADO'].includes(currentEstado)
    ? currentEstado
    : 'ACTIVO';
}

async function loadAndRender() {
  if (currentView !== 'proyectos') return;

  try {
    updateCurrentEstadoByView();
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
      document.querySelectorAll('#tabsSupervisor .tab').forEach(x => x.classList.remove('active'));
      tab.classList.add('active');
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

  const fotoUrl = profileBtn?.dataset?.foto || '';
  ui.renderProfilePhoto(fotoUrl);

  profileBtn?.addEventListener('click', () => profileFile?.click());

  profileFile?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

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
  document.getElementById('navProyectos')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/supervisor?view=proyectos';
  });

  document.getElementById('navPassword')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/supervisor?view=password';
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