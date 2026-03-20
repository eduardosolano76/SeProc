// navigation.js
import { fetchHtml } from './api.js';
import { syncSidebarWithUrl, closeModal } from './ui.js';

export function getParam(name, url = window.location.href) {
    return new URL(url, window.location.origin).searchParams.get(name);
}

export function getViewFromUrl(url = window.location.href) {
    return getParam('view', url) || 'projects';
}

export async function loadPanelFromUrl(href, push = true) {
    const panelContent = document.getElementById('panelContent');

    if (!panelContent) {
        window.location.href = href;
        return;
    }

    panelContent.innerHTML = `<div class="panel-sub">Cargando...</div>`;

    try {
        const html = await fetchHtml(href);
        const doc = new DOMParser().parseFromString(html, "text/html");

        // Busca el panel en el nuevo HTML descargado
        const newPanelContent = doc.getElementById("panelContent");
        const fragment = doc.body?.firstElementChild || doc.body;

        if (newPanelContent) {
            panelContent.innerHTML = newPanelContent.innerHTML;
        } else {
            panelContent.innerHTML = fragment.innerHTML;
        }

        if (push) history.pushState({ href }, "", href);

        const view = getViewFromUrl(href);
        syncSidebarWithUrl(view);

        // Disparamos el evento para que app.js reconecte los botones
        window.dispatchEvent(new CustomEvent('panelLoaded', { detail: { view } }));

    } catch (e) {
        console.error("Error cargando la vista:", e);
        window.location.href = href;
    }
}

export function initGlobalEscape(modals) {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modals.detalleModal?.classList.contains('open')) closeModal(modals.detalleModal, modals.detalleBackdrop);
    if (modals.projModal?.classList.contains('open')) closeModal(modals.projModal, modals.projModalBackdrop);
  });
}