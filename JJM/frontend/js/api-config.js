/* =========================================================
   CONFIGURACIÓN CENTRAL DE API - OFICINA DE PROYECTOS
   Para producción con backend en otro dominio, cambia solo:
   window.OFICINA_API_BASE_URL = "https://api.tudominio.com";
   antes de cargar este archivo, o asigna el valor directamente abajo.
========================================================= */
(function () {
    const PRODUCCION_API_BASE_URL = window.location.origin;
    const hostLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);

    const baseConfigurada = String(
        window.OFICINA_API_BASE_URL || PRODUCCION_API_BASE_URL || ""
    ).trim();

    const base = baseConfigurada || (
        hostLocal
            ? `${window.location.protocol}//${window.location.hostname}:8080`
            : window.location.origin
    );

    window.API_BASE_URL = base.replace(/\/$/, "");
    window.apiUrl = function (ruta) {
        const path = String(ruta || "");
        if (/^https?:\/\//i.test(path)) return path;
        return window.API_BASE_URL + (path.startsWith("/") ? path : "/" + path);
    };

    const fetchOriginal = window.fetch.bind(window);

    window.fetch = function (input, init) {
        const opciones = { ...(init || {}) };
        const headers = new Headers(opciones.headers || {});
        const token = localStorage.getItem("sesionTokenPMO");
        const url = typeof input === "string" ? input : (input && input.url ? input.url : "");
        const esApi = url.startsWith(window.API_BASE_URL) || url.startsWith("/api/");

        if (token && esApi && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        opciones.headers = headers;
        return fetchOriginal(input, opciones).then(function (respuesta) {
            if (respuesta.status === 401 && token && esApi) {
                // Conserva la respuesta para que cada módulo muestre su mensaje,
                // pero limpia una sesión vencida para evitar identidades falsas.
                localStorage.removeItem("sesionTokenPMO");
                localStorage.removeItem("usuarioActivo");
            }
            return respuesta;
        });
    };
})();
