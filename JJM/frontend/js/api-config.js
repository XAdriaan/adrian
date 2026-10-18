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
        window.dispatchEvent(new Event("pmo:antes-cerrar-sesion"));
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
                const rol = String(datos.usuario.rol?.nombre || datos.usuario.rol || "").trim().toLowerCase();
                const pagina = window.location.pathname.split("/").pop();
                if (rol === "empresa" && !["", "index.html", "login.html", "register.html", "registro-empresa.html", "empresa.html"].includes(pagina)) {
                    window.location.replace("empresa.html");
                }
                return datos.usuario;
            }
        } catch (error) {
            console.warn("No fue posible validar la sesión con el servidor.", error);
        } finally {
            clearTimeout(temporizador);
        }
        return null;
    }
    // Todas las páginas usan esta configuración: la presencia sigue al navegar.
    // La Oficina se abre dentro de la llamada: no reemplazar el documento que conserva sus medios.
    window.abrirSalaPMO=function(url){
        if(window.PMOLlamadaActiva?.()){window.PMORestaurarLlamada?.();return;}
        if(window.parent!==window){window.parent.postMessage({tipo:'pmo:volver-llamada'},window.location.origin);return;}
        window.location.href=url;
    };
    if (window.parent !== window && typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('click',function(evento){
            const enlace=evento.target.closest?.('a[href]');if(!enlace)return;
            let destino;try{destino=new URL(enlace.href,window.location.href);}catch(_){return;}
            if(destino.origin===window.location.origin && destino.pathname.endsWith('/reunion.html')){
                evento.preventDefault();window.parent.postMessage({tipo:'pmo:volver-llamada'},window.location.origin);
            }
        },true);
    }
    if (typeof document !== "undefined" && document.createElement && document.head) {
        window.PMOWidgetsMoviblesPromesa=window.PMOWidgetsMovibles?Promise.resolve(true):new Promise(resolve=>{const mover=document.createElement('script');mover.src='js/widgets-movibles.js?v=20261014-v24';mover.onload=()=>resolve(true);mover.onerror=()=>resolve(false);document.head.appendChild(mover);});
        window.PMOMicrofonoPromesa=window.PMOMicrofono?Promise.resolve(true):new Promise(resolve=>{const m=document.createElement('script');m.src='js/microfono.js?v=20261013-v21';m.onload=()=>resolve(true);m.onerror=()=>resolve(false);document.head.appendChild(m);});
        const sesionAviso=document.createElement('script');sesionAviso.src='js/sesion-aviso.js?v=20261013-v21';document.head.appendChild(sesionAviso);
        const contraste=document.createElement('link');contraste.rel='stylesheet';contraste.href='css/contraste-v21.css?v=20261017-v28';document.head.appendChild(contraste);
        window.PMOArdiaVozPromesa=new Promise(resolve=>{const v=document.createElement('script');v.src='js/ardia-voz.js?v=20261013-v21';v.onload=()=>resolve(true);v.onerror=()=>resolve(false);document.head.appendChild(v);});
        const asistencia = document.createElement("script");
        asistencia.src = "js/asistencia-automatica.js?v=20261014-v25";
        document.head.appendChild(asistencia);
        const estiloAsistencia = document.createElement("link");
        estiloAsistencia.rel = "stylesheet";
        estiloAsistencia.href = "css/asistencia.css?v=20261013-v21";
        document.head.appendChild(estiloAsistencia);
        const automatizaciones = document.createElement("script");
        automatizaciones.src = "js/automatizaciones-global.js?v=20261014-v22";
        document.head.appendChild(automatizaciones);
        const avisosReuniones=document.createElement('script');avisosReuniones.src='js/reuniones-avisos.js?v=20261014-v24';document.head.appendChild(avisosReuniones);
    }
})();
