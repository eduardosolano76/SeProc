// api.js - Módulo para manejar las llamadas a la API con CSRF

// Función privada de este módulo
function getCsrf() {
    const token = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
    const header = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');
    return { token, header };
}

// Exportamos esta función para usarla en el resto de la app
export async function fetchJson(url, options = {}) {
    const { token, header } = getCsrf();
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    
    if (token && header) headers.set(header, token);
    
    const res = await fetch(url, { ...options, headers });
    
    const contentType = res.headers.get("content-type") || "";
    let data = null;
    let text = "";
    
    if (contentType.includes("application/json")) {
        data = await res.json().catch(() => null);
    } else {
        text = await res.text().catch(() => "");
    }

    return {
        ok: res.ok,
        status: res.status,
        data,
        text,
        message: data?.message || text || ""
    };
}