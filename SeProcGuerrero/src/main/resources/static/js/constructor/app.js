// app.js
import * as api from './api.js';
import * as ui from './ui.js';
import * as nav from './navigation.js';

let currentEstado = 'ACTIVO';
let currentList = [];

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


// --- Lógica de Vista (Re-vinculable) ---
function bindPanelEvents() {
    // 1. Botón Agregar Proyecto (Dentro del panel)
    const btnAdd = document.getElementById('btnAddProyecto');
    if (btnAdd) {
        // Removemos el listener anterior si existiera para no duplicarlo, luego lo agregamos
        btnAdd.removeEventListener('click', openProjModal);
        btnAdd.addEventListener('click', openProjModal);
    }

    // 2. Pestañas (Activos, Inactivos...) (Dentro del panel)
    const tabs = document.querySelectorAll('#tabsConstructor .tab');
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            // Reemplazamos el nodo para limpiar listeners fantasmas
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);

            // Añadimos el nuevo evento
            newTab.addEventListener('click', async () => {
                document.querySelectorAll('#tabsConstructor .tab').forEach(x => x.classList.remove('active'));
                newTab.classList.add('active');
                
                // Actualizamos el estado global
                currentEstado = newTab.dataset.estado;
                
                // Disparamos la carga de datos
                await loadAndRenderProjects();
            });
        });

        // 3. Forzamos a que visualmente y en el estado, la pestaña activa al cargar sea "ACTIVO" 
        // a menos que vengamos de otra vista. (Por defecto, al cargar el panel de proyectos, queremos ver los activos).
        const activeTab = document.querySelector('#tabsConstructor .tab.active');
        if (activeTab) {
            currentEstado = activeTab.dataset.estado;
        } else {
            currentEstado = 'ACTIVO';
        }
    }
}

// --- Eventos Globales (Solo se registran una vez) ---
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

    // Delegación de formularios (Sobrevive a la recarga del panel)
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

// --- Funciones de Proyectos ---
async function loadAndRenderProjects() {
    try {
        currentList = await api.fetchProyectos(currentEstado);
        ui.renderCards(currentList, openDetalleProyecto);
    } catch (e) {
        await ui.showCustomAlert('No se pudieron cargar los proyectos: ' + e.message, 'Error');
    }
}

async function openDetalleProyecto(idProyecto) {
    try {
        const dto = await api.fetchDetalleProyecto(idProyecto);
        ui.renderDetalleProyecto(dto);
        ui.openModal(detalleModal, detalleBackdrop);
    } catch (e) {
        await ui.showCustomAlert('No se pudo cargar el detalle: ' + e.message, 'Error');
    }
}

function openProjModal() {
    ui.openModal(projModal, projModalBackdrop);
    loadEstados().catch(console.error);
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
        tipoObra: form.tipoObra.value,
        concepto: form.concepto.value.trim()
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

// --- Perfil ---
function initProfilePhoto() {
    const fotoUrl = profileBtn?.dataset?.foto;
    ui.renderProfilePhoto(fotoUrl);
    profileBtn?.addEventListener('click', () => profileFile?.click());
    
    profileFile?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

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