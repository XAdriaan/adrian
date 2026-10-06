/* =========================================================
   CONFIGURACIÓN CENTRAL DE API + SESIÓN PERSISTENTE
========================================================= */
(function () {
    // Nginx sirve la web y /api en el mismo origen, también en Docker local.
    const base = String(window.OFICINA_API_BASE_URL || window.location.origin).trim();

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
        try { sessionStorage.removeItem("ardia-bienvenida"); } catch (_) {}
        window.dispatchEvent(new Event("pmo:sesion-cerrada"));
    };

    // Un usuario guardado sin token no constituye una sesión autenticada.
    if (!window.obtenerTokenSesionPMO()) localStorage.removeItem("usuarioActivo");

    function invalidarSesion(token) {
        // Una respuesta atrasada de la sesión anterior no debe borrar la nueva.
        if (window.obtenerTokenSesionPMO() !== token) return;
        window.limpiarSesionPMO();
        const pagina = window.location.pathname.split("/").pop();
        if (!["", "index.html", "login.html", "register.html"].includes(pagina)) {
            window.location.replace("login.html?sesion=expirada");
        }
    }

    const fetchOriginal = window.fetch.bind(window);

    window.fetch = function (input, init) {
        const opciones = { ...(init || {}) };
        const esRequest = typeof Request !== "undefined" && input instanceof Request;
        const headers = new Headers(opciones.headers || (esRequest ? input.headers : {}));
        const token = window.obtenerTokenSesionPMO();
        const url = new URL(esRequest ? input.url : String(input), window.location.href);
        const api = new URL(window.apiUrl("/api/"));
        const esApi = url.origin === api.origin && url.pathname.startsWith(api.pathname);
        const esLogin = url.pathname === new URL(window.apiUrl("/api/auth/login")).pathname;
        const autorizadoPorSesion = token && esApi && !headers.has("Authorization");

        if (autorizadoPorSesion) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        opciones.headers = headers;
        return fetchOriginal(input, opciones).then(async function (respuesta) {
            // No borres una sesión válida por cualquier 401 funcional. Solo la
            // invalida cuando el servidor confirma explícitamente que el token
            // ya no existe/venció. Esto evita regresos falsos al login.
            if (respuesta.status === 401 && autorizadoPorSesion && !esLogin) {
                try {
                    const clon = respuesta.clone();
                    const datos = await clon.json();
                    const mensaje = String(datos?.mensaje || "").toLowerCase();
                    if (mensaje.includes("sesión no existe") ||
                        mensaje.includes("sesion no existe") ||
                        mensaje.includes("sesión no es válida") ||
                        mensaje.includes("sesion no es valida") ||
                        mensaje.includes("venció") || mensaje.includes("vencio")) {
                        invalidarSesion(token);
                    }
                } catch (_) {}
            }
            return respuesta;
        });
    };

    let restauracionPendiente = null;
    let tokenPendiente = null;
    window.restaurarSesionPMO = function () {
        const token = window.obtenerTokenSesionPMO();
        if (!token) return Promise.resolve(null);
        if (restauracionPendiente && tokenPendiente === token) return restauracionPendiente;
        tokenPendiente = token;
        const tarea = restaurar(token);
        restauracionPendiente = tarea;
        tarea.finally(function () {
            if (restauracionPendiente === tarea) restauracionPendiente = null;
        });
        return tarea;
    };

    async function restaurar(token) {
        const controlador = new AbortController();
        const temporizador = setTimeout(() => controlador.abort(), 15000);
        try {
            const respuesta = await window.fetch(window.apiUrl("/api/auth/sesion"), {
                headers: { "Accept": "application/json" },
                signal: controlador.signal
            });
            if (!respuesta.ok) {
                if (respuesta.status === 401) invalidarSesion(token);
                return null;
            }
            const datos = await respuesta.json();
            if (datos?.usuario && window.obtenerTokenSesionPMO() === token) {
                localStorage.setItem("usuarioActivo", JSON.stringify(datos.usuario));
                return datos.usuario;
            }
        } catch (error) {
            console.warn("No fue posible validar la sesión con el servidor.", error);
        } finally {
            clearTimeout(temporizador);
        }
        return null;
    }
})();
