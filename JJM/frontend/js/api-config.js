/* =========================================================
   CONFIGURACIÓN CENTRAL DE API + SESIÓN PERSISTENTE
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

    window.obtenerTokenSesionPMO = function () {
        return localStorage.getItem("sesionTokenPMO") || "";
    };

    window.limpiarSesionPMO = function () {
        localStorage.removeItem("sesionTokenPMO");
        localStorage.removeItem("usuarioActivo");
    };

    const fetchOriginal = window.fetch.bind(window);

    window.fetch = function (input, init) {
        const opciones = { ...(init || {}) };
        const headers = new Headers(opciones.headers || {});
        const token = window.obtenerTokenSesionPMO();
        const url = typeof input === "string" ? input : (input && input.url ? input.url : "");
        const esApi = url.startsWith(window.API_BASE_URL) || url.startsWith("/api/");
        const esLogin = url.includes("/api/auth/login");

        if (token && esApi && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        opciones.headers = headers;
        return fetchOriginal(input, opciones).then(async function (respuesta) {
            // No borres una sesión válida por cualquier 401 funcional. Solo la
            // invalida cuando el servidor confirma explícitamente que el token
            // ya no existe/venció. Esto evita regresos falsos al login.
            if (respuesta.status === 401 && token && esApi && !esLogin) {
                try {
                    const clon = respuesta.clone();
                    const datos = await clon.json();
                    const mensaje = String(datos?.mensaje || "").toLowerCase();
                    if (mensaje.includes("sesión no existe") ||
                        mensaje.includes("sesion no existe") ||
                        mensaje.includes("sesión no es válida") ||
                        mensaje.includes("sesion no es valida") ||
                        mensaje.includes("venció") || mensaje.includes("vencio")) {
                        window.limpiarSesionPMO();
                    }
                } catch (_) {}
            }
            return respuesta;
        });
    };

    window.restaurarSesionPMO = async function () {
        const token = window.obtenerTokenSesionPMO();
        if (!token) return null;

        try {
            const respuesta = await window.fetch(window.apiUrl("/api/auth/sesion"), {
                headers: { "Accept": "application/json" }
            });
            if (!respuesta.ok) {
                if (respuesta.status === 401) window.limpiarSesionPMO();
                return null;
            }
            const datos = await respuesta.json();
            if (datos?.usuario) {
                localStorage.setItem("usuarioActivo", JSON.stringify(datos.usuario));
                return datos.usuario;
            }
        } catch (error) {
            console.warn("No fue posible validar la sesión con el servidor.", error);
        }
        return null;
    };
})();
