// app.js
import * as api from './api.js';
import * as ui from './ui.js';
import * as nav from './navigation.js';

let currentEstado = 'ACTIVO';
let currentList = [];
let currentProcesoDto = null;

// Elementos Globales (fuera del panel)
const profileBtn = document.getElementById('profileBtn');
const profileFile = document.getElementById('profileFile');
const searchConstructor = document.getElementById('searchConstructor');
const projModal = document.getElementById('projModal');
const projModalBackdrop = document.getElementById('projModalBackdrop');
const detalleModal = document.getElementById('detalleModal');
const detalleBackdrop = document.getElementById('detalleBackdrop');

// --- Inicialización ---
document.addEventListener("DOMContentLoaded", () => {
    const view = nav.getViewFromUrl();
    ui.syncSidebarWithUrl(view);
    
    registerGlobalEvents();
    bindPanelEvents(); // Conecta los botones de la vista actual
    initProfilePhoto();
    
    if (view !== 'password') loadAndRenderProjects();
});

// --- Navegación del Menú ---
document.getElementById('navProyectos')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    nav.loadPanelFromUrl('/constructor', true); // Cambia esto si tu URL base es distinta
});

document.getElementById('navPassword')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    nav.loadPanelFromUrl('/constructor?view=password', true);
});

// Retroceso del navegador
window.addEventListener('popstate', (e) => {
    const href = (e.state && e.state.href) ? e.state.href : window.location.href;
    nav.loadPanelFromUrl(href, false);
});

// Cada vez que se carga un nuevo HTML en el panel, volvemos a conectar los botones
window.addEventListener('panelLoaded', () => {
    bindPanelEvents();
    const view = nav.getViewFromUrl();
    if (view !== 'password') loadAndRenderProjects();
});


// --- Lógica de Vista ---
function bindPanelEvents() {
    // Botón agregar proyecto dentro del panel
    const btnAdd = document.getElementById('btnAddProyecto');
    if (btnAdd) {
        btnAdd.removeEventListener('click', openProjModal);
        btnAdd.addEventListener('click', openProjModal);
    }

    // Pestañas activos e inactivos 
    const tabs = document.querySelectorAll('#tabsConstructor .tab');
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);

            newTab.addEventListener('click', async () => {
                document.querySelectorAll('#tabsConstructor .tab').forEach(x => x.classList.remove('active'));
                newTab.classList.add('active');
                
                currentEstado = newTab.dataset.estado;
                
                await loadAndRenderProjects();
            });
        });
    }
	
	const btnBackProceso = document.getElementById('btnBackProceso');
	if (btnBackProceso) {
	    btnBackProceso.removeEventListener('click', volverAListaProyectos);
	    btnBackProceso.addEventListener('click', volverAListaProyectos);
	}
	
	const btnBackBloque = document.getElementById('btnBackBloque');
	if (btnBackBloque) {
	    btnBackBloque.removeEventListener('click', volverAProcesoConstructor);
	    btnBackBloque.addEventListener('click', volverAProcesoConstructor);
	}

	const procesoContent = document.getElementById('constructorProcesoContent');
	if (procesoContent && !procesoContent.dataset.boundStages) {
	    procesoContent.addEventListener('click', (e) => {
	        const btn = e.target.closest('.process-mini-stage[data-bloque]');
	        if (!btn) return;
	        openBloqueConstructor(btn.dataset.bloque);
	    });
	    procesoContent.dataset.boundStages = '1';
	}
}

// Solo se registran una vez ---
function registerGlobalEvents() {
    nav.initGlobalEscape({ detalleModal, detalleBackdrop, projModal, projModalBackdrop });

    // Cierre de modales
    document.getElementById('btnCerrarProyecto')?.addEventListener('click', closeProjModal);
    projModalBackdrop?.addEventListener('click', closeProjModal);
    document.getElementById('btnCerrarDetalle')?.addEventListener('click', () => ui.closeModal(detalleModal, detalleBackdrop));
    detalleBackdrop?.addEventListener('click', () => ui.closeModal(detalleModal, detalleBackdrop));

    // Selects Geo
    const selEstado = document.querySelector('#formSolicitudProyecto select[name="estado"]');
    const selMunicipio = document.querySelector('#formSolicitudProyecto select[name="municipio"]');
    selEstado?.addEventListener('change', () => loadMunicipios().catch(console.error));
    selMunicipio?.addEventListener('change', () => loadLocalidades().catch(console.error));

    // Buscador
    searchConstructor?.addEventListener('input', () => {
        const q = (searchConstructor.value || '').toLowerCase().trim();
        if (!q) return ui.renderCards(currentList, openDetalleProyecto);
        
        const filtered = currentList.filter(x =>
            (x.nombreEscuela ?? '').toLowerCase().includes(q) ||
            (x.supervisor ?? '').toLowerCase().includes(q)
        );
        ui.renderCards(filtered, openDetalleProyecto);
    });

    // Delegación de formularios 
    document.addEventListener('submit', async (e) => {
        if (e.target.id === 'formCambiarPasswordConstructor') {
            e.preventDefault();
            await handlePasswordChange();
        }
    });

    document.getElementById('btnEnviarSolicitud')?.addEventListener('click', async () => {
        const form = document.getElementById('formSolicitudProyecto');
        if (!form) return;
        if (!form.checkValidity()) return form.reportValidity();
        await handleProjectSubmit(form);
    });
}


function showConstructorView(viewName) {
    const projectsView = document.getElementById('constructorProjectsView');
    const passwordView = document.getElementById('constructorPasswordView');
    const procesoView = document.getElementById('constructorProcesoView');
    const bloqueView = document.getElementById('constructorBloqueView');

    if (projectsView) projectsView.style.display = viewName === 'projects' ? 'block' : 'none';
    if (passwordView) passwordView.style.display = viewName === 'password' ? 'block' : 'none';
    if (procesoView) procesoView.style.display = viewName === 'proceso' ? 'block' : 'none';
    if (bloqueView) bloqueView.style.display = viewName === 'bloque' ? 'block' : 'none';
}

function volverAListaProyectos() {
    showConstructorView('projects');
}

function volverAProcesoConstructor() {
    showConstructorView('proceso');
}

function openBloqueConstructor(bloque) {
    if (!currentProcesoDto) return;

    ui.renderBloqueProyecto(currentProcesoDto, bloque);
    showConstructorView('bloque');
    bindPanelEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Funciones de Proyectos ---
async function loadAndRenderProjects() {
    try {
        // se limpian las pestañas
        document.querySelectorAll('#tabsConstructor .tab').forEach(t => t.classList.remove('active'));
        
        const targetTab = document.querySelector(`#tabsConstructor .tab[data-estado="${currentEstado}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        } else {
            currentEstado = 'ACTIVO';
            const defaultTab = document.querySelector(`#tabsConstructor .tab[data-estado="ACTIVO"]`);
            if (defaultTab) defaultTab.classList.add('active');
        }

        if (searchConstructor) searchConstructor.value = '';

        currentList = await api.fetchProyectos(currentEstado);
        ui.renderCards(currentList, openDetalleProyecto);
    } catch (e) {
        await ui.showCustomAlert('No se pudieron cargar los proyectos: ' + e.message, 'Error');
    }
}

async function openDetalleProyecto(idProyecto) {
    try {
        const dto = await api.fetchDetalleProyecto(idProyecto);
        currentProcesoDto = dto;
        ui.renderProcesoProyecto(dto);
        showConstructorView('proceso');
        bindPanelEvents();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        await ui.showCustomAlert('No se pudo cargar el detalle: ' + e.message, 'Error');
    }
}

async function openProjModal() {
    ui.openModal(projModal, projModalBackdrop);
    await loadEstados();
    await loadTiposEdificacion();
}

function closeProjModal() {
    ui.closeModal(projModal, projModalBackdrop);
}

async function handleProjectSubmit(form) {
    const payload = {
        nombreEscuela: form.nombreEscuela.value.trim(),
        cct1: form.cct1.value.trim(),
        cct2: form.cct2.value.trim(),
        idEstado: parseInt(form.estado.value, 10),
        idMunicipio: parseInt(form.municipio.value, 10),
        idLocalidad: parseInt(form.ciudad.value, 10),
        calleNumero: form.calleNumero.value.trim(),
        cp: form.cp.value.trim(),
        responsable: form.responsable.value.trim(),
        contacto: form.contacto.value.trim(),
        numInmuebles: parseInt(form.numInmuebles.value, 10),
        numEntreEjes: parseInt(form.numEntreEjes.value, 10),
        idTipoEdificacion: parseInt(form.tipoEdificacion.value, 10),
        tipoObra: form.tipoObra.value
    };

    try {
        await api.postSolicitud(payload);
        closeProjModal();
        form.reset();
        await ui.showCustomAlert('Solicitud enviada correctamente.', 'Éxito');
        loadAndRenderProjects();
    } catch (e) {
        await ui.showCustomAlert('No se pudo enviar: ' + e.message, 'Error');
    }
}

// --- Geolocalización ---
async function loadEstados() {
    const selEstado = document.querySelector('#formSolicitudProyecto select[name="estado"]');
    const selMunicipio = document.querySelector('#formSolicitudProyecto select[name="municipio"]');
    const selCiudad = document.querySelector('#formSolicitudProyecto select[name="ciudad"]');
    
    const data = await api.fetchEstados();
    ui.fillSelect(selEstado, data);
    selMunicipio.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
    selCiudad.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
}

async function loadMunicipios() {
    const selEstado = document.querySelector('#formSolicitudProyecto select[name="estado"]');
    const selMunicipio = document.querySelector('#formSolicitudProyecto select[name="municipio"]');
    const selCiudad = document.querySelector('#formSolicitudProyecto select[name="ciudad"]');
    
    if (!selEstado.value) return;
    const data = await api.fetchMunicipios(selEstado.value);
    ui.fillSelect(selMunicipio, data);
    selCiudad.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
}

async function loadLocalidades() {
    const selMunicipio = document.querySelector('#formSolicitudProyecto select[name="municipio"]');
    const selCiudad = document.querySelector('#formSolicitudProyecto select[name="ciudad"]');
    
    if (!selMunicipio.value) return;
    const data = await api.fetchLocalidades(selMunicipio.value);
    ui.fillSelect(selCiudad, data);
}

// --- Cambio de Contraseña ---
async function handlePasswordChange() {
    const form = document.getElementById('formCambiarPasswordConstructor');
    
    const passActual = document.getElementById('passActualConstructor').value.trim();
    const passNueva = document.getElementById('passNuevaConstructor').value.trim();
    const passRepetida = document.getElementById('passRepetidaConstructor').value.trim();

    // Validaciones básicas
    if (!passActual || !passNueva || !passRepetida) {
        return ui.showCustomAlert("Todos los campos son obligatorios.", "Error");
    }

    if (passNueva !== passRepetida) {
        return ui.showCustomAlert("Las contraseñas nuevas no coinciden.", "Error");
    }

    const payload = {
        passActual: passActual,
        passNueva: passNueva,
        passRepetida: passRepetida
    };

    try {
        // Obtenemos los tokens CSRF de las etiquetas <meta> del HTML 
        const csrfToken = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
        const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');

        const headers = {
            'Content-Type': 'application/json'
        };

        // Inyectamos el header CSRF solo si existe en la vista
        if (csrfToken && csrfHeader) {
            headers[csrfHeader] = csrfToken;
        }

        // Hacemos la petición con el fetch nativo
        const response = await fetch('/constructor/perfil/password', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        // Intentamos extraer el JSON de la respuesta (el Map.of que hicimos en Java)
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Si hay error (ej. 400 Bad Request por contraseña incorrecta), lanzamos el mensaje del backend
            throw new Error(data.message || "Ocurrió un error al cambiar la contraseña.");
        }

        // Si el status es 200 OK
        await ui.showCustomAlert("Tu contraseña ha sido actualizada correctamente.", "Éxito");
        form.reset();

    } catch (error) {
        // Atrapamos el error y lo mostramos en tu modal personalizado
        await ui.showCustomAlert(error.message, "Error");
    }
}

async function loadTiposEdificacion() {
    const selTipoEdificacion = document.querySelector('#formSolicitudProyecto select[name="tipoEdificacion"]');
    if (!selTipoEdificacion) return;

    const data = await api.fetchTiposEdificacion();
    ui.fillSelect(selTipoEdificacion, data);
}

// --- Perfil ---
function initProfilePhoto() {
    const btnViewPhoto = document.getElementById('btnViewPhoto');
    const btnUploadPhoto = document.getElementById('btnUploadPhoto');
    const btnDeletePhoto = document.getElementById('btnDeletePhoto');

    const fotoUrl = profileBtn?.dataset?.foto;
    ui.renderProfilePhoto(fotoUrl);
    
    // 1. Alternar menú desplegable
    profileBtn?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ui.toggleProfileMenu();
    });

    // 2. Subir foto (abre el explorador)
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

    // 5. Manejar el cambio de archivo
    profileFile?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Previsualización
        document.getElementById('profileImg').src = URL.createObjectURL(file);
        document.getElementById('profileImg').style.display = 'block';
        document.getElementById('profileFallback').style.display = 'none';

        try {
            const url = await api.uploadProfilePhoto(file);
            ui.renderProfilePhoto(url);
            if (profileBtn) profileBtn.dataset.foto = url;
        } catch (err) {
            ui.renderProfilePhoto(profileBtn?.dataset?.foto || "");
            await ui.showCustomAlert(err.message || "Error al subir la foto.", "Error");
        } finally {
            profileFile.value = "";
        }
    });
}