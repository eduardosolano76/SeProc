// navigation.js - Módulo para manejar la navegación interna sin recargar la página
import { syncSidebarWithUrl, syncAddButtonWithUrl, closeMobileMenu } from './ui.js';

// Función para obtener el valor de un parámetro de la URL
export function getParam(name, url = window.location.href) {
    return new URL(url, window.location.origin).searchParams.get(name);
}

// Función para obtener la vista actual desde la URL
export function getViewFromUrl(url = window.location.href) {
    return getParam('view', url) || 'proyectos';
}

// Cargar vista sin recargar y sin parpadeo 
export async function loadPanelFromUrl(href, push = true) {
    const panelContent = document.getElementById('panelContent');
    const sectionTitle = document.getElementById('sectionTitle');

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

        // Reemplazo de contenido
        if (newPanelContent) {
            panelContent.innerHTML = newPanelContent.innerHTML;
            if (newTitle && sectionTitle) sectionTitle.textContent = newTitle;
        } else {
            panelContent.innerHTML = fragment.innerHTML;
            
            // Si el backend no mandó título, lo inferimos de la URL
            const view = getViewFromUrl(href);
            const titles = {
                "usuarios-supervisores": "Supervisores",
                "usuarios-constructores": "Constructores",
                "usuarios-directores": "Directores",
                "usuarios-central": "Central",
                "usuarios-administrador": "Administrador",
                "password": "Cambiar contraseña",
            };
            if (sectionTitle) sectionTitle.textContent = titles[view] || "Usuarios";
        }

        // Modificar el historial del navegador
        if (push) history.pushState({ href }, "", href);

        // Actualizar la UI
        const view = getViewFromUrl(href);
        syncSidebarWithUrl(view);
        syncAddButtonWithUrl(view);
        closeMobileMenu();

        // Disparamos un evento personalizado para avisar que el panel ya cargó
        window.dispatchEvent(new CustomEvent('panelLoaded', {
			detail: { view }
		}));

    } catch (e) {
		console.error("Error cargando la vista:", e);
		
        // Si falla el fetch silencioso, forzamos la recarga clásica
        window.location.href = href;
    }
}