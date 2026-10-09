/* Presencia en cualquier apartado. Las horas y el horario los calcula el servidor. */
(function () {
    if (window.__asistenciaAutomaticaIniciada) return;
    window.__asistenciaAutomaticaIniciada = true;
    const pagina = window.crypto?.randomUUID?.() || `pagina_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let pendiente = false;
    let abandonando = false;
    let tokenAnterior = "";
    let datos = null;
    let recibido = 0;

    function esAlumno() {
        try {
            const usuario = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
            const rol = String(usuario?.rol?.nombre || usuario?.rol || "").trim().toLowerCase();
            return ["colaborador", "alumno", "estudiante"].includes(rol);
        } catch (_) { return false; }
    }
    function notificar() { window.dispatchEvent(new Event("pmo:asistencia")); }
    function actualizarInicio() {
        if (typeof document === "undefined" || !esAlumno()) return;
        const titulo = document.getElementById("tituloJornada");
        const texto = document.getElementById("textoJornada");
        if (!titulo || !texto) return;
        titulo.textContent = datos?.contando ? "Asistencia automática en curso" : "Asistencia automática";
        const segundos = window.asistenciaAutomaticaPMO.segundosVisibles();
        texto.textContent = (segundos == null ? "" : `${(segundos/3600).toFixed(2)} de 10 horas hoy. `) +
            (datos?.mensaje || "Confirmando tu asistencia...");
    }
    function publicarError(mensaje) {
        datos = { aplicable: true, error: true, contando: false, mensaje };
        notificar();
    }
    async function sincronizar() {
        const token = window.obtenerTokenSesionPMO();
        if (pendiente || abandonando || !token || !esAlumno()) return;
        tokenAnterior = token;
        pendiente = true;
        const controlador = new AbortController();
        const limite = setTimeout(() => controlador.abort(), 15000);
        try {
            const respuesta = await window.fetch(window.apiUrl("/api/asistencia-automatica/presencia"), {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ pagina }), signal: controlador.signal
            });
            const resultado = await respuesta.json();
            if (window.obtenerTokenSesionPMO() !== token || abandonando) return;
            if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo guardar el avance de tus horas.");
            datos = resultado; recibido = Date.now(); notificar();
        } catch (error) {
            if (window.obtenerTokenSesionPMO() === token && !abandonando) {
                publicarError("No se pudo confirmar tu asistencia. Revisa la conexión; el tiempo sin conexión no se registra.");
            }
        } finally { clearTimeout(limite); pendiente = false; }
    }
    function salir() {
        const token = window.obtenerTokenSesionPMO();
        if (!token || !esAlumno() || abandonando) return;
        abandonando = true;
        // keepalive permite guardar el cierre al navegar. Otras pestañas siguen contando.
        window.fetch(window.apiUrl("/api/asistencia-automatica/salida"), {
            method: "POST", keepalive: true,
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ pagina })
        }).catch(() => {});
    }
    window.asistenciaAutomaticaPMO = {
        esAlumno, sincronizar, salir,
        estado() { return datos; },
        segundosVisibles() {
            if (!datos || datos.error) return null;
            // Interpolación corta para el contador; el total guardado siempre viene del servidor.
            const extra = datos.contando ? Math.min(30,Number(datos.segundosHastaCierre ?? 30),Math.max(0,(Date.now()-recibido)/1000)) : 0;
            return Math.min(36000, Number(datos.segundos || 0) + extra);
        }
    };
    window.addEventListener("pagehide", salir);
    window.addEventListener("pageshow", () => { abandonando = false; sincronizar(); });
    window.addEventListener("pmo:antes-cerrar-sesion", salir);
    window.addEventListener("pmo:sesion-cerrada", () => { datos = null; tokenAnterior = ""; notificar(); });
    window.addEventListener("storage", () => {
        if (window.obtenerTokenSesionPMO() !== tokenAnterior) { datos = null; abandonando = false; }
        sincronizar();
    });
    if (typeof document !== "undefined") document.addEventListener("click", event => {
        const enlace = event.target.closest?.("a");
        const texto = String(enlace?.textContent || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
        if (texto === "cerrar sesion") salir();
    },true);
    setInterval(sincronizar, 30000);
    // El formulario de acceso puede guardar la sesión después de cargar este archivo.
    setInterval(() => {
        if (window.obtenerTokenSesionPMO() !== tokenAnterior) sincronizar();
        actualizarInicio();
    }, 1000);
    sincronizar();
})();
