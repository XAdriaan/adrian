/* =========================================================
   PERMISOS GLOBALES PMO + IDIOMA GLOBAL REFORZADO
   - Protege navegación por rol.
   - Muestra indicador de rol.
   - Traduce textos estáticos, dinámicos, placeholders,
     títulos, botones, tablas, modales y mensajes creados por JS.
========================================================= */

const RUTAS_SOLO_ADMINISTRADOR = [
    "equipo.html",
    "organizaciones.html",
    "bitacora.html",
    "reportes.html",
    "proyecto-avanzado.html",
    "seguimiento-estadia.html"
];


const PERMISOS_RUTA_PMO = {
    "equipo.html": "equipo.ver",
    "organizaciones.html": "organizaciones.ver",
    "bitacora.html": "bitacora.ver",
    "reportes.html": "reportes.ver",
    "proyecto-avanzado.html": "proyectos.avanzado",
    "seguimiento-estadia.html": "seguimiento.ver",
    "roles-permisos.html": "roles.gestionar"
};

const RUTAS_OPERATIVAS = [
    "tablero-tareas.html",
    "tareas.html",
    "control-horas.html",
    "detalle-miembro-horas.html"
];

const RUTAS_CLIENTE_BLOQUEADAS = [
    "alertas.html"
];

let observadorIdiomaPMO = null;
let aplicandoIdiomaPMO = false;

document.addEventListener("DOMContentLoaded", async function () {
    cargarEstiloSidebarUnificadoPMO();

    // Confirma también las sesiones guardadas: el objeto local puede ser antiguo.
    if (localStorage.getItem("sesionTokenPMO") && typeof window.restaurarSesionPMO === "function") {
        await window.restaurarSesionPMO();
    }

    aplicarPermisosGlobales();
    iniciarIdiomaGlobalPMO();

    refrescarPermisosUsuarioGlobal().finally(function () {
        aplicarPermisosGlobales();
        sincronizarIndicadoresRolGlobal();
    });

    setTimeout(function () { aplicarPermisosGlobales(); sincronizarIndicadoresRolGlobal(); }, 200);
    setTimeout(function () { aplicarPermisosGlobales(); sincronizarIndicadoresRolGlobal(); }, 800);
});

document.addEventListener("DOMContentLoaded", function () {
    iniciarGuardiaFuertePermisosGlobal();
});




/* =========================================================
   ESTILO GLOBAL DE BARRA LATERAL
   Unifica el menú lateral con el diseño usado en Perfil.
========================================================= */
function cargarEstiloSidebarUnificadoPMO() {
    if (document.getElementById("sidebar-unificado-pmo-css")) {
        return;
    }

    const enlace = document.createElement("link");
    enlace.id = "sidebar-unificado-pmo-css";
    enlace.rel = "stylesheet";
    enlace.href = "css/sidebar-global.css?v=20261005-v9";
    document.head.appendChild(enlace);

    document.body.classList.add("sidebar-unificado-pmo");
}

/* =========================================================
   GUARDIA FUERTE DE MENÚ POR ROL
   Evita que colaboradores/consulta vean módulos administrativos
   aunque otra función vuelva a mostrar enlaces dinámicamente.
========================================================= */
const ENLACES_ADMIN_OCULTOS_GLOBAL = [
    "equipo.html",
    "organizaciones.html",
    "bitacora.html",
    "reportes.html",
    "proyecto-avanzado.html"
];

const ENLACES_CONSULTA_OCULTOS_GLOBAL = [
    "tablero-tareas.html",
    "tareas.html",
    "control-horas.html",
    "detalle-miembro-horas.html",
    "alertas.html",
    ...ENLACES_ADMIN_OCULTOS_GLOBAL
];

function instalarCSSPermisosMenuGlobal() {
    if (document.getElementById("pmo-css-permisos-menu")) {
        return;
    }

    const estilo = document.createElement("style");
    estilo.id = "pmo-css-permisos-menu";
    estilo.textContent = `
        body[data-pmo-menu-scope="colaborador"] .sidebar-menu a[href*="equipo.html"],
        body[data-pmo-menu-scope="colaborador"] .sidebar-menu a[href*="organizaciones.html"],
        body[data-pmo-menu-scope="colaborador"] .sidebar-menu a[href*="bitacora.html"],
        body[data-pmo-menu-scope="colaborador"] .sidebar-menu a[href*="reportes.html"],
        body[data-pmo-menu-scope="colaborador"] .sidebar-menu a[href*="proyecto-avanzado.html"],
        body[data-pmo-menu-scope="consulta"] .sidebar-menu a[href*="equipo.html"],
        body[data-pmo-menu-scope="consulta"] .sidebar-menu a[href*="organizaciones.html"],
        body[data-pmo-menu-scope="consulta"] .sidebar-menu a[href*="bitacora.html"],
        body[data-pmo-menu-scope="consulta"] .sidebar-menu a[href*="reportes.html"],
        body[data-pmo-menu-scope="consulta"] .sidebar-menu a[href*="proyecto-avanzado.html"],
        body[data-pmo-menu-scope="consulta"] .sidebar-menu a[href*="tablero-tareas.html"],
        body[data-pmo-menu-scope="consulta"] .sidebar-menu a[href*="tareas.html"],
        body[data-pmo-menu-scope="consulta"] .sidebar-menu a[href*="control-horas.html"],
        body[data-pmo-menu-scope="consulta"] .sidebar-menu a[href*="detalle-miembro-horas.html"],
        body[data-pmo-menu-scope="consulta"] .sidebar-menu a[href*="alertas.html"] {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }
    `;

    document.head.appendChild(estilo);
}

function obtenerScopeMenuGlobal(usuario) {
    if (esAdministradorGlobal(usuario)) {
        return "admin";
    }

    if (esRolConsultaGlobal(usuario)) {
        return "consulta";
    }

    const permisos = obtenerPermisosUsuarioGlobal(usuario);
    if (permisos.some(function (p) { return p !== "dashboard.ver"; })) {
        return "personalizado";
    }

    return "colaborador";
}

function aplicarScopeMenuBodyGlobal() {
    const usuario = obtenerUsuarioActivoGlobal();
    const scope = obtenerScopeMenuGlobal(usuario);

    if (document.body) {
        document.body.setAttribute("data-pmo-menu-scope", scope);
    }
}

function debeOcultarHrefPorRolGlobal(href, usuario) {
    const pagina = normalizarHrefMenuGlobal(href);

    if (!pagina) return false;

    const permisoRuta = PERMISOS_RUTA_PMO[pagina];
    // Roles y permisos es exclusivo del Superadministrador, incluso si el usuario es Administrador.
    if (pagina === "roles-permisos.html") {
        return !tienePermisoGlobal(usuario, "roles.gestionar");
    }

    if (esAdministradorGlobal(usuario)) return false;
    if (permisoRuta) {
        return !tienePermisoGlobal(usuario, permisoRuta);
    }

    if (esRolConsultaGlobal(usuario)) {
        return ENLACES_CONSULTA_OCULTOS_GLOBAL.includes(pagina);
    }

    return false;
}

function aplicarGuardiaMenuPorRolGlobal() {
    const usuario = obtenerUsuarioActivoGlobal();

    instalarCSSPermisosMenuGlobal();
    agregarEnlaceSeguimientoEstadiaGlobal();
    aplicarScopeMenuBodyGlobal();

    sincronizarIndicadoresRolGlobal();

    document.querySelectorAll(".sidebar-menu a").forEach(function (enlace) {
        const href = enlace.getAttribute("href") || "";
        const ocultar = debeOcultarHrefPorRolGlobal(href, usuario);

        if (ocultar) {
            enlace.style.setProperty("display", "none", "important");
            enlace.style.setProperty("visibility", "hidden", "important");
            enlace.setAttribute("hidden", "hidden");
            enlace.setAttribute("aria-hidden", "true");
            enlace.classList.remove("active");
        } else {
            enlace.removeAttribute("hidden");
            enlace.removeAttribute("aria-hidden");
            enlace.style.removeProperty("display");
            enlace.style.removeProperty("visibility");
        }
    });
}

function protegerRutaActualFuerteGlobal() {
    const usuario = obtenerUsuarioActivoGlobal();
    if (!usuario) return;

    const paginaActual = obtenerPaginaActualGlobal();

    if (debeOcultarHrefPorRolGlobal(paginaActual, usuario)) {
        window.location.replace("dashboard.html");
    }
}

function iniciarGuardiaFuertePermisosGlobal() {
    instalarCSSPermisosMenuGlobal();
    aplicarGuardiaMenuPorRolGlobal();
    protegerRutaActualFuerteGlobal();

    [50, 150, 350, 700, 1200, 2000, 3500].forEach(function (tiempo) {
        setTimeout(function () {
            aplicarGuardiaMenuPorRolGlobal();
            protegerRutaActualFuerteGlobal();
        }, tiempo);
    });

    let ejecuciones = 0;
    const intervalo = setInterval(function () {
        aplicarGuardiaMenuPorRolGlobal();
        protegerRutaActualFuerteGlobal();
        ejecuciones += 1;

        if (ejecuciones >= 20) {
            clearInterval(intervalo);
        }
    }, 300);


}


/* =========================================================
   SESIÓN Y ROL
========================================================= */

function obtenerUsuarioActivoGlobal() {
    try {
        return JSON.parse(localStorage.getItem("usuarioActivo")) || null;
    } catch (error) {
        console.error("No fue posible leer la sesión activa:", error);
        return null;
    }
}

function guardarUsuarioActivoGlobal(usuario) {
    if (!usuario) return;
    localStorage.setItem("usuarioActivo", JSON.stringify(usuario));
}

async function refrescarPermisosUsuarioGlobal() {
    const usuario = obtenerUsuarioActivoGlobal();
    if (!usuario || !localStorage.getItem("sesionTokenPMO") || typeof window.apiUrl !== "function") {
        return usuario;
    }

    try {
        const respuesta = await fetch(window.apiUrl("/api/roles/mi-permisos"));
        if (!respuesta.ok) return usuario;

        const datos = await respuesta.json();
        const actualizado = { ...usuario };

        if (datos.rol) actualizado.rol = datos.rol;
        if (datos.idRol != null) actualizado.idRol = datos.idRol;
        if (Array.isArray(datos.permisos)) actualizado.permisos = datos.permisos;
        actualizado.superadministrador = datos.superadministrador === true;

        guardarUsuarioActivoGlobal(actualizado);
        return actualizado;
    } catch (error) {
        console.warn("No fue posible refrescar los permisos de la sesión.", error);
        return usuario;
    }
}

function obtenerIdUsuarioGlobal(usuario) {
    if (!usuario) return null;
    return usuario.id || usuario.idUsuario || usuario.id_usuario || null;
}

function obtenerRolUsuarioGlobal(usuario) {
    if (!usuario) return "";

    if (usuario.rol && typeof usuario.rol === "object") {
        return usuario.rol.nombre || "";
    }

    return usuario.rol || usuario.rolNombre || usuario.nombreRol || "";
}

function normalizarRolGlobal(rol) {
    return String(rol || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function obtenerPermisosUsuarioGlobal(usuario) {
    if (!usuario || !Array.isArray(usuario.permisos)) return [];
    return usuario.permisos.map(function (p) { return String(p || "").trim(); }).filter(Boolean);
}

function tienePermisoGlobal(usuario, clave) {
    if (!usuario || !clave) return false;
    if (esSuperAdministradorGlobal(usuario)) return true;
    return obtenerPermisosUsuarioGlobal(usuario).includes(clave);
}

function esSuperAdministradorGlobal(usuario) {
    const rol = normalizarRolGlobal(obtenerRolUsuarioGlobal(usuario));
    return rol === "superadministrador" || usuario?.superadministrador === true;
}

function esAdministradorGlobal(usuario) {
    const rol = normalizarRolGlobal(obtenerRolUsuarioGlobal(usuario));

    return esSuperAdministradorGlobal(usuario) ||
        rol === "administrador" ||
        rol === "admin pmo" ||
        rol === "admin_pmo" ||
        rol === "administrador pmo";
}

function tieneAccesoGestionGlobal(usuario) {
    return esAdministradorGlobal(usuario) ||
        tienePermisoGlobal(usuario, "proyectos.ver_todos") ||
        tienePermisoGlobal(usuario, "reportes.ver") ||
        tienePermisoGlobal(usuario, "equipo.ver");
}

window.PMOPermisos = {
    usuario: obtenerUsuarioActivoGlobal,
    tiene: function (clave) { return tienePermisoGlobal(obtenerUsuarioActivoGlobal(), clave); },
    tieneAlguno: function () {
        const usuario = obtenerUsuarioActivoGlobal();
        return Array.from(arguments).some(function (clave) { return tienePermisoGlobal(usuario, clave); });
    },
    rol: function () { return obtenerRolUsuarioGlobal(obtenerUsuarioActivoGlobal()) || "Usuario"; },
    esSuperadmin: function () { return esSuperAdministradorGlobal(obtenerUsuarioActivoGlobal()); },
    esAdministrador: function () { return esAdministradorGlobal(obtenerUsuarioActivoGlobal()); },
    esAdministradorReal: function () {
        const usuario = obtenerUsuarioActivoGlobal();
        const rol = normalizarRolGlobal(obtenerRolUsuarioGlobal(usuario));
        return esSuperAdministradorGlobal(usuario) || rol === "administrador" || rol === "admin pmo" || rol === "admin_pmo" || rol === "administrador pmo";
    },
    refrescar: refrescarPermisosUsuarioGlobal
};

function esRolConsultaGlobal(usuario) {
    const rol = normalizarRolGlobal(obtenerRolUsuarioGlobal(usuario));

    return rol === "cliente" ||
        rol === "usuario de consulta" ||
        rol === "consulta" ||
        rol === "enlace universidad" ||
        rol === "enlace de universidad" ||
        rol === "enlace empresa" ||
        rol === "enlace de empresa";
}

/* =========================================================
   RUTA ACTUAL
========================================================= */

function obtenerPaginaActualGlobal() {
    const segmentos = window.location.pathname.split("/");
    return segmentos[segmentos.length - 1] || "dashboard.html";
}

function redirigirDashboardGlobal() {
    window.location.replace("dashboard.html");
}

function redirigirLoginGlobal() {
    window.location.replace("login.html");
}

function obtenerClavesDatosAcademicosGlobal(usuario) {
    const idUsuario = obtenerIdUsuarioGlobal(usuario);
    const correo = usuario?.correo || usuario?.email || "";

    const claves = ["datosAcademicosPMO"];

    if (idUsuario) {
        claves.unshift(`datosAcademicosPMO_${idUsuario}`);
    }

    if (correo) {
        claves.push(`datosAcademicosPMO_${correo}`);
    }

    return [...new Set(claves)];
}

function datosAcademicosValidosGlobal(datos) {
    return !!(
        datos &&
        (datos.completo === true || datos.datosAcademicosCompletos === true || datos.perfilAcademicoCompletado === true || (
            datos.nombreCompleto &&
            datos.matricula &&
            datos.universidad &&
            datos.carrera &&
            datos.cuatrimestre
        ))
    );
}

function tieneDatosAcademicosGlobal(usuario) {
    if (!usuario) return false;

    if (usuario.datosAcademicosCompletos === true) return true;
    if (usuario.perfilAcademicoCompletado === true) return true;

    if (
        usuario.nombreCompleto &&
        usuario.matricula &&
        usuario.universidad &&
        usuario.carrera &&
        usuario.cuatrimestre
    ) {
        return true;
    }

    try {
        const claves = obtenerClavesDatosAcademicosGlobal(usuario);

        for (let indice = 0; indice < claves.length; indice++) {
            const datos = JSON.parse(localStorage.getItem(claves[indice]) || "null");

            if (datosAcademicosValidosGlobal(datos)) {
                return true;
            }
        }
    } catch (error) {
        return false;
    }

    return false;
}

function debeCompletarDatosAcademicosGlobal(usuario, paginaActual, esAdmin) {
    if (!usuario || esAdmin || tieneAccesoGestionGlobal(usuario)) return false;

    const paginasLibres = [
        "login.html",
        "register.html",
        "datos-academicos.html"
    ];

    if (paginasLibres.includes(paginaActual)) {
        return false;
    }

    if (esRolConsultaGlobal(usuario)) {
        return false;
    }

    /*
     * Guardia ligera: solo manda a datos académicos cuando realmente
     * no hay información académica guardada. Si ya se guardó en cualquier
     * clave compatible, permite navegar a todos los módulos autorizados.
     */
    return !tieneDatosAcademicosGlobal(usuario);
}

/* =========================================================
   APLICAR PERMISOS
========================================================= */

function aplicarPermisosGlobales() {
    const usuario = obtenerUsuarioActivoGlobal();

    if (!usuario) {
        redirigirLoginGlobal();
        return;
    }

    const paginaActual = obtenerPaginaActualGlobal();
    const esAdmin = esAdministradorGlobal(usuario);
    const esConsulta = esRolConsultaGlobal(usuario);

    if (debeCompletarDatosAcademicosGlobal(usuario, paginaActual, esAdmin)) {
        window.location.replace("datos-academicos.html");
        return;
    }

    protegerRutaActual(paginaActual, esAdmin, esConsulta);
    ocultarOpcionesMenu(esAdmin, esConsulta);
    aplicarGuardiaMenuPorRolGlobal();
    protegerRutaActualFuerteGlobal();
    mostrarIndicadorRolGlobal(usuario, esAdmin, esConsulta);
    configurarCerrarSesionGlobal();
    agregarEnlaceSeguimientoEstadiaGlobal();
}

function protegerRutaActual(paginaActual, esAdmin, esConsulta) {
    const usuario = obtenerUsuarioActivoGlobal();
    const permisoRuta = PERMISOS_RUTA_PMO[paginaActual];

    if (permisoRuta && !tienePermisoGlobal(usuario, permisoRuta) && !esAdmin) {
        redirigirDashboardGlobal();
        return;
    }

    if (esConsulta && RUTAS_OPERATIVAS.includes(paginaActual)) {
        redirigirDashboardGlobal();
        return;
    }

    if (esConsulta && RUTAS_CLIENTE_BLOQUEADAS.includes(paginaActual)) {
        redirigirDashboardGlobal();
    }
}

function normalizarHrefMenuGlobal(href) {
    return String(href || "")
        .split("?")[0]
        .split("#")[0]
        .split("/")
        .pop();
}

function ocultarOpcionesMenu(esAdmin, esConsulta) {
    const usuario = obtenerUsuarioActivoGlobal();
    const enlaces = document.querySelectorAll(".sidebar-menu a");

    enlaces.forEach(function (enlace) {
        const hrefOriginal = enlace.getAttribute("href");
        if (!hrefOriginal) return;

        const ocultar = debeOcultarHrefPorRolGlobal(hrefOriginal, usuario);
        if (ocultar) {
            enlace.style.setProperty("display", "none", "important");
        } else {
            enlace.style.removeProperty("display");
        }
    });
}


function agregarEnlaceSeguimientoEstadiaGlobal() {
    const menu = document.querySelector(".sidebar-menu");
    if (!menu) return;
    let enlace = menu.querySelector('a[data-pmo-seguimiento-estadia="true"]')
        || menu.querySelector('a[href="mi-estadia.html"]');
    if (!enlace) {
        enlace = document.createElement("a");
        enlace.href = "mi-estadia.html";
        enlace.textContent = "Mi seguimiento de estadía";
        menu.appendChild(enlace);
    }
    enlace.dataset.pmoSeguimientoEstadia = "true";
    if (enlace.getAttribute("href") !== "mi-estadia.html") enlace.href = "mi-estadia.html";
    if (enlace.textContent !== "Mi seguimiento de estadía") enlace.textContent = "Mi seguimiento de estadía";
    if (!menu.querySelector('a[href="seguimiento-estadia.html"]')) {
        const administracion = document.createElement("a");
        administracion.href = "seguimiento-estadia.html";
        administracion.textContent = "Seguimiento del equipo";
        menu.appendChild(administracion);
    }
    agregarEnlacesEstadiaRapidosGlobal();
    agregarEnlaceRolesPermisosGlobal();
}

function agregarEnlacesEstadiaRapidosGlobal() {
    // FO-EST-03 y los pases se encuentran dentro del seguimiento personal.
    document.querySelectorAll('a[data-pmo-estadia-rapido]').forEach(a => a.remove());
}

function agregarEnlaceRolesPermisosGlobal() {
    const sidebar = document.querySelector(".sidebar-menu");
    if (!sidebar) return;
    const usuario = obtenerUsuarioActivoGlobal();
    // Detecta también el enlace que ya venga escrito en el HTML para no duplicarlo.
    const existentes = Array.from(sidebar.querySelectorAll('a[href]')).filter(function (a) {
        return normalizarHrefMenuGlobal(a.getAttribute("href")) === "roles-permisos.html";
    });
    const existente = existentes[0] || null;
    const puede = esSuperAdministradorGlobal(usuario) || tienePermisoGlobal(usuario, "roles.gestionar");

    if (!puede) {
        existentes.forEach(function (a) { a.style.setProperty("display", "none", "important"); });
        return;
    }

    // Si por una versión anterior ya quedaron dos enlaces, conserva solo uno.
    existentes.slice(1).forEach(function (a) { a.remove(); });
    if (existente) {
        existente.style.removeProperty("display");
        return;
    }

    const enlace = document.createElement("a");
    enlace.href = "roles-permisos.html";
    enlace.dataset.pmoRolesPermisos = "true";
    enlace.textContent = "Roles y permisos";
    enlace.title = "Administración de seguridad";

    const equipo = sidebar.querySelector('a[href="equipo.html"]');
    if (equipo && equipo.nextSibling) equipo.parentNode.insertBefore(enlace, equipo.nextSibling);
    else sidebar.appendChild(enlace);
}

function obtenerClaseIndicadorRolGlobal(usuario) {
    if (esSuperAdministradorGlobal(usuario)) return "role-indicator admin";
    if (esAdministradorGlobal(usuario)) return "role-indicator admin";
    if (esRolConsultaGlobal(usuario)) return "role-indicator restricted";
    return "role-indicator collaborator";
}

function sincronizarIndicadoresRolGlobal() {
    const usuario = obtenerUsuarioActivoGlobal();
    if (!usuario) return;

    const nombreRol = obtenerRolUsuarioGlobal(usuario) || "Usuario";
    const clase = obtenerClaseIndicadorRolGlobal(usuario);

    document.querySelectorAll('[id^="indicadorRol"]').forEach(function (indicador) {
        // El indicador del pie lateral usa sus propias clases de diseño.
        if (indicador.id === "indicadorRolGlobal") return;
        if (indicador.textContent !== nombreRol) indicador.textContent = nombreRol;
        if (indicador.className !== clase) indicador.className = clase;
    });
}

function configurarCerrarSesionGlobal() {
    const enlaces = document.querySelectorAll(".sidebar-footer a, a");

    enlaces.forEach(function (enlace) {
        const texto = normalizarTextoIdiomaPMO(enlace.textContent);
        const href = enlace.getAttribute("href") || "";

        if (texto === "cerrar sesion" || href.endsWith("login.html")) {
            enlace.addEventListener("click", function () {
                // Revoca la sesión del backend; keepalive permite completar la solicitud durante la navegación.
                fetch(window.apiUrl("/api/auth/logout"), { method: "POST", keepalive: true }).catch(() => {});
                localStorage.removeItem("usuarioActivo");
                localStorage.removeItem("sesionTokenPMO");
            });
        }
    });
}

function mostrarIndicadorRolGlobal(usuario, esAdmin, esConsulta) {
    const sidebar = document.querySelector(".sidebar-footer");
    if (!sidebar) return;

    const indicadorAnterior = document.getElementById("indicadorRolGlobal");
    if (indicadorAnterior) indicadorAnterior.remove();

    const rol = obtenerRolUsuarioGlobal(usuario) || "Colaborador";
    let tipoRol = "colaborador";
    if (esAdmin) tipoRol = "admin";
    if (esConsulta) tipoRol = "consulta";

    const indicador = document.createElement("div");
    indicador.id = "indicadorRolGlobal";
    indicador.className = `indicador-rol-global ${tipoRol}`;
    indicador.textContent = `Rol: ${rol}`;

    sidebar.insertBefore(indicador, sidebar.firstChild);
}

/* =========================================================
   IDIOMA GLOBAL PMO
========================================================= */

const TRADUCCIONES_PMO = {
    en: {
        // Navegación
        "dashboard": "Dashboard",
        "perfil": "Profile",
        "proyectos": "Projects",
        "proyecto avanzado": "Advanced Project",
        "cursos": "Courses",
        "tablero de tareas": "Task Board",
        "tareas": "Tasks",
        "equipo": "Team",
        "organizaciones": "Organizations",
        "control de horas": "Time Control",
        "bitacora": "Logbook",
        "alertas": "Alerts",
        "reportes": "Reports",
        "encuestas": "Surveys",
        "chatbot ia": "AI Chatbot",
        "cerrar sesion": "Log out",
        "rol": "Role",
        "administrador": "Administrator",
        "colaborador": "Collaborator",
        "cliente": "Client",
        "usuario de consulta": "Consultation User",
        "responsable del proyecto": "Project Manager",

        // Acciones generales
        "guardar": "Save",
        "guardar informacion": "Save information",
        "guardar preferencias": "Save preferences",
        "guardar proyecto": "Save project",
        "guardar tarea": "Save task",
        "guardar alerta": "Save alert",
        "guardar encuesta": "Save survey",
        "guardar contrasena": "Save password",
        "crear": "Create",
        "crear proyecto": "Create project",
        "crear tarea": "Create task",
        "nueva tarea": "New task",
        "nuevo proyecto": "New project",
        "nueva alerta": "New alert",
        "nueva encuesta": "New survey",
        "actualizar": "Refresh",
        "actualizando": "Refreshing",
        "buscar": "Search",
        "filtrar": "Filter",
        "limpiar filtros": "Clear filters",
        "editar": "Edit",
        "eliminar": "Delete",
        "cancelar": "Cancel",
        "volver": "Back",
        "enviar": "Send",
        "imprimir": "Print",
        "exportar": "Export",
        "descargar": "Download",
        "ver detalle": "View details",
        "ver historial": "View history",
        "ver relacionado": "View related",
        "ver video": "View video",
        "atender": "Attend",
        "resolver": "Resolve",
        "escalar": "Escalate",
        "ocultar": "Hide",
        "limpiar chat": "Clear chat",
        "selecciona un proyecto": "Select a project",
        "sin proyecto relacionado": "No related project",
        "sin responsable asignado": "No assignee",

        // Login
        "bienvenido": "Welcome",
        "inicia sesion en tu cuenta": "Sign in to your account",
        "continuar con google": "Continue with Google",
        "o con email": "or with email",
        "correo electronico": "Email",
        "contrasena": "Password",
        "contrasena actual": "Current password",
        "iniciar sesion": "Sign in",
        "ingresando": "Signing in",
        "no tienes cuenta": "Don't have an account?",
        "registrate aqui": "Register here",
        "olvidaste tu contrasena": "Forgot your password?",
        "recuperar contrasena": "Recover password",
        "nueva contrasena": "New password",
        "confirmar contrasena": "Confirm password",
        "enviar codigo": "Send code",
        "validar codigo": "Validate code",
        "verificar codigo": "Verify code",
        "ingresa el codigo enviado": "Enter the code sent.",

        // Perfil
        "informacion general": "General information",
        "datos y seguridad": "Data and security",
        "hora e idioma": "Time and language",
        "condiciones y politicas": "Terms and policies",
        "terminos condiciones y politicas": "Terms, conditions and policies",
        "terminos condiciones y politicas de uso": "Terms, conditions and use policies",
        "contactos": "Contacts",
        "contactos de soporte": "Support contacts",
        "nombre completo": "Full name",
        "usuario": "User",
        "descripcion": "Description",
        "foto de perfil": "Profile picture",
        "nombre del usuario": "User name",
        "nombre de usuario": "Username",
        "agrega una breve descripcion profesional": "Add a brief professional description",
        "administra tu informacion personal seguridad preferencias y politicas de uso": "Manage your personal information, security, preferences and use policies.",
        "actualiza tus datos visibles dentro de la plataforma": "Update the data visible in the platform.",
        "gestiona la autenticacion recuperacion de contrasena y proteccion de la cuenta": "Manage authentication, password recovery and account protection.",
        "configura las preferencias regionales de la plataforma": "Configure the platform regional preferences.",
        "consulta las politicas de uso de la solucion integral pmo": "Review the PMO Integral Solution use policies.",
        "accede a los canales de soporte de la plataforma": "Access the platform support channels.",
        "autenticacion de cuenta": "Account authentication",
        "la autenticacion adicional no esta configurada": "Additional authentication is not configured.",
        "configurar autenticacion": "Configure authentication",
        "selecciona un metodo de verificacion adicional para proteger la cuenta": "Select an additional verification method to protect the account.",
        "correo asociado a la cuenta del usuario": "Email associated with the user account.",
        "campo de referencia para cambios futuros con backend": "Reference field for future backend changes.",
        "recuperacion de contrasena": "Password recovery",
        "solicita un codigo de recuperacion para actualizar tu contrasena": "Request a recovery code to update your password.",
        "no recuerdas tu contrasena": "Forgot your password?",
        "codigo de prueba": "Test code",
        "autenticacion configurada correctamente": "Authentication configured successfully.",
        "correo electronico": "Email",
        "recibe un codigo de verificacion en tu correo": "Receive a verification code in your email.",
        "verificacion de seguridad": "Security verification",
        "idioma": "Language",
        "zona horaria": "Time zone",
        "idioma activo": "Active language",
        "zona horaria activa": "Active time zone",
        "hora actual": "Current time",
        "fecha local": "Local date",
        "espanol": "Spanish",
        "ingles": "English",
        "chino mandarin": "Mandarin Chinese",
        "hindi": "Hindi",
        "arabe": "Arabic",
        "frances": "French",
        "ruso": "Russian",
        "portugues": "Portuguese",
        "aleman": "German",
        "japones": "Japanese",
        "coreano": "Korean",
        "italiano": "Italian",
        "turco": "Turkish",
        "ciudad de mexico": "Mexico City",
        "nueva york": "New York",
        "madrid": "Madrid",
        "conoce nuestro soporte": "Meet our support",
        "consulta dudas operativas con el asistente pmo": "Ask operational questions to the PMO assistant.",
        "soporte tecnico": "Technical support",
        "administracion pmo": "PMO Administration",
        "area responsable de la operacion y seguimiento de proyectos": "Area responsible for project operation and follow-up.",
        "horario lunes a viernes de 900 a 1800 hrs": "Schedule: Monday to Friday from 9:00 to 18:00 hrs.",

        // Proyectos / tareas
        "proyecto": "Project",
        "codigo": "Code",
        "estado": "Status",
        "prioridad": "Priority",
        "responsable": "Responsible",
        "organizacion": "Organization",
        "cliente area": "Client / Area",
        "fecha inicio": "Start date",
        "fecha fin": "End date",
        "avance": "Progress",
        "porcentaje de avance": "Progress percentage",
        "proyectos activos": "Active projects",
        "proyectos registrados": "Registered projects",
        "proyectos asignados": "Assigned projects",
        "proyecto sin nombre": "Unnamed project",
        "proyecto no disponible": "Project unavailable",
        "tarea": "Task",
        "titulo": "Title",
        "titulo de la tarea": "Task title",
        "fase": "Phase",
        "asignado": "Assigned",
        "miembro asignado": "Assigned member",
        "fecha limite": "Deadline",
        "horas estimadas": "Estimated hours",
        "horas registradas": "Registered hours",
        "pendiente": "Pending",
        "en progreso": "In progress",
        "bloqueada": "Blocked",
        "completada": "Completed",
        "baja": "Low",
        "media": "Medium",
        "alta": "High",
        "critica": "Critical",
        "propuesto": "Proposed",
        "inicio": "Start",
        "planificacion": "Planning",
        "ejecucion": "Execution",
        "monitoreo": "Monitoring",
        "cierre": "Closure",
        "cerrado": "Closed",
        "cancelado": "Cancelled",
        "no iniciado": "Not started",
        "sin fecha": "No date",
        "sin descripcion": "No description",
        "sin responsable": "No responsible person",
        "miembro no disponible": "Member unavailable",
        "fase no disponible": "Phase unavailable",
        "organizacion no disponible": "Organization unavailable",
        "responsable no disponible": "Responsible person unavailable",

        // Equipo / organizaciones
        "miembros": "Members",
        "integrantes": "Members",
        "miembro": "Member",
        "nombre": "Name",
        "correo": "Email",
        "telefono": "Phone",
        "seniority": "Seniority",
        "habilidades": "Skills",
        "notas": "Notes",
        "activo": "Active",
        "inactivo": "Inactive",
        "empresa": "Company",
        "tipo": "Type",
        "direccion": "Address",
        "sitio web": "Website",

        // Horas
        "fecha": "Date",
        "hora entrada": "Start time",
        "hora salida": "End time",
        "horas trabajadas": "Hours worked",
        "tipo registro": "Record type",
        "incidente": "Incident",
        "validacion": "Validation",
        "estado de validacion": "Validation status",
        "aprobado": "Approved",
        "rechazado": "Rejected",
        "jornada": "Workday",
        "manual": "Manual",
        "iniciar jornada": "Start workday",
        "finalizar jornada": "End workday",
        "registrar horas": "Register hours",
        "ver mi historial": "View my history",
        "control de horas general": "General time control",
        "tu control de horas": "Your time control",
        "pendientes de validacion": "Pending validation",
        "registros encontrados": "Records found",
        "horas acumuladas": "Accumulated hours",
        "registros visibles": "Visible records",

        // Alertas
        "alertas administrativas": "Administrative alerts",
        "mis alertas": "My alerts",
        "centro de control": "Control center",
        "seguimiento de riesgos tareas jornadas y registros del equipo": "Tracking risks, tasks, workdays and team records.",
        "consulta alertas asignadas a tu usuario y eventos relacionados con tus tareas o registros de horas": "Review alerts assigned to your user and events related to your tasks or time records.",
        "tipo de alerta": "Alert type",
        "severidad": "Severity",
        "abierta": "Open",
        "en atencion": "In progress",
        "escalada": "Escalated",
        "resuelta": "Resolved",
        "automatico": "Automatic",
        "automatica": "Automatic",
        "automática": "Automatic",
        "tarea bloqueada": "Blocked task",
        "tarea vencida": "Overdue task",
        "horas rechazadas": "Rejected hours",
        "jornada pendiente": "Pending workday",
        "cargando alertas": "Loading alerts...",
        "consultando tareas integrantes registros de horas y alertas manuales": "Consulting tasks, members, time records and manual alerts.",
        "no hay alertas para mostrar": "No alerts to show",
        "no existen alertas que coincidan con los filtros seleccionados": "There are no alerts matching the selected filters.",
        "alerta sin titulo": "Alert without title",
        "sin descripcion registrada": "No description registered.",
        "creada por": "Created by",

        // Encuestas
        "encuesta": "Survey",
        "satisfaccion": "Satisfaction",
        "calificacion": "Rating",
        "promedio de satisfaccion": "Average satisfaction",
        "nombre encuestado": "Respondent name",
        "email encuestado": "Respondent email",
        "comentario": "Comment",
        "video adjunto": "Attached video",
        "difusion autorizada": "Distribution authorized",
        "solo interno": "Internal only",
        "sin decision de difusion": "No distribution decision",
        "autorizado": "Authorized",
        "no autorizado": "Not authorized",
        "cargando encuestas": "Loading surveys...",
        "consultando la informacion registrada en mysql": "Consulting information registered in MySQL.",
        "no hay encuestas registradas": "No surveys registered",
        "cuando se registren evaluaciones de satisfaccion apareceran en este apartado": "When satisfaction evaluations are registered, they will appear here.",
        "no fue posible cargar encuestas": "Surveys could not be loaded",
        "anonimo": "Anonymous",

        // Chatbot / reportes / bitácora
        "escribe tu pregunta": "Type your question",
        "analizando la informacion disponible": "Analyzing available information...",
        "resumen visible para tu sesion": "Summary visible for your session",
        "permisos detectados": "Detected permissions",
        "recomendacion de ardia": "Ard.IA recommendation",
        "bitacora de auditoria": "Audit logbook",
        "modulo": "Module",
        "accion": "Action",
        "entidad": "Entity",
        "reporte": "Report",
        "reportes administrativos": "Administrative reports",
        "balance general": "General balance",
        "exportar excel": "Export Excel",
        "exportar pdf": "Export PDF",
        "generar reporte": "Generate report",

        // Mensajes frecuentes
        "informacion de perfil guardada correctamente": "Profile information saved successfully.",
        "preferencias de hora e idioma guardadas correctamente": "Time and language preferences saved successfully.",
        "el codigo ingresado no es correcto": "The entered code is incorrect.",
        "ingresa un correo electronico": "Enter an email address.",
        "la contrasena debe tener al menos 6 caracteres": "The password must have at least 6 characters.",
        "las contrasenas no coinciden": "Passwords do not match.",
        "cuenta creada correctamente ahora inicia sesion": "Account created successfully. Now sign in.",
        "debes ingresar correo y contrasena": "You must enter email and password.",
        "ingresa un correo electronico valido": "Enter a valid email address.",
        "correo o contrasena incorrectos": "Email or password is incorrect.",
        "inicio de sesion correcto redirigiendo": "Login successful. Redirecting...",
        "no fue posible conectar con el servidor verifica que el backend de java este ejecutandose": "Could not connect to the server. Verify that the Java backend is running.",
        "el servidor no devolvio la informacion del usuario": "The server did not return user information."
    },

    // Diccionarios extendidos comunes. Para textos no registrados se mantiene el español.
    pt: {
        "dashboard": "Painel", "perfil": "Perfil", "proyectos": "Projetos", "proyecto avanzado": "Projeto avançado", "cursos": "Cursos", "tablero de tareas": "Quadro de tarefas", "tareas": "Tarefas", "equipo": "Equipe", "organizaciones": "Organizações", "control de horas": "Controle de horas", "bitacora": "Registro", "alertas": "Alertas", "reportes": "Relatórios", "encuestas": "Pesquisas", "chatbot ia": "Chatbot IA", "cerrar sesion": "Sair", "rol": "Função", "informacion general": "Informações gerais", "datos y seguridad": "Dados e segurança", "hora e idioma": "Hora e idioma", "condiciones y politicas": "Termos e políticas", "contactos": "Contatos", "guardar informacion": "Salvar informações", "guardar preferencias": "Salvar preferências", "nombre completo": "Nome completo", "usuario": "Usuário", "descripcion": "Descrição", "correo electronico": "E-mail", "contrasena": "Senha", "contrasena actual": "Senha atual", "idioma": "Idioma", "zona horaria": "Fuso horário", "configurar autenticacion": "Configurar autenticação", "recuperacion de contrasena": "Recuperação de senha", "enviar codigo": "Enviar código", "validar codigo": "Validar código", "guardar contrasena": "Salvar senha", "cancelar": "Cancelar", "volver": "Voltar", "crear proyecto": "Criar projeto", "crear tarea": "Criar tarefa", "actualizar": "Atualizar", "buscar": "Pesquisar", "editar": "Editar", "eliminar": "Excluir", "enviar": "Enviar", "proyecto": "Projeto", "estado": "Estado", "prioridad": "Prioridade", "responsable": "Responsável", "fecha": "Data", "comentario": "Comentário", "calificacion": "Avaliação"
    },
    fr: {
        "dashboard": "Tableau de bord", "perfil": "Profil", "proyectos": "Projets", "proyecto avanzado": "Projet avancé", "cursos": "Cours", "tablero de tareas": "Tableau des tâches", "tareas": "Tâches", "equipo": "Équipe", "organizaciones": "Organisations", "control de horas": "Suivi du temps", "bitacora": "Journal", "alertas": "Alertes", "reportes": "Rapports", "encuestas": "Enquêtes", "chatbot ia": "Chatbot IA", "cerrar sesion": "Déconnexion", "rol": "Rôle", "informacion general": "Informations générales", "datos y seguridad": "Données et sécurité", "hora e idioma": "Heure et langue", "condiciones y politicas": "Conditions et politiques", "contactos": "Contacts", "guardar informacion": "Enregistrer les informations", "guardar preferencias": "Enregistrer les préférences", "nombre completo": "Nom complet", "usuario": "Utilisateur", "descripcion": "Description", "correo electronico": "E-mail", "contrasena": "Mot de passe", "idioma": "Langue", "zona horaria": "Fuseau horaire", "configurar autenticacion": "Configurer l’authentification", "recuperacion de contrasena": "Récupération du mot de passe", "enviar codigo": "Envoyer le code", "validar codigo": "Valider le code", "cancelar": "Annuler", "volver": "Retour", "crear proyecto": "Créer un projet", "crear tarea": "Créer une tâche", "actualizar": "Actualiser", "buscar": "Rechercher", "editar": "Modifier", "eliminar": "Supprimer", "enviar": "Envoyer", "proyecto": "Projet", "estado": "État", "prioridad": "Priorité", "responsable": "Responsable", "fecha": "Date", "comentario": "Commentaire", "calificacion": "Note"
    },
    de: {"dashboard":"Dashboard","perfil":"Profil","proyectos":"Projekte","proyecto avanzado":"Erweitertes Projekt","cursos":"Kurse","tablero de tareas":"Aufgabenboard","tareas":"Aufgaben","equipo":"Team","organizaciones":"Organisationen","control de horas":"Zeiterfassung","bitacora":"Protokoll","alertas":"Warnungen","reportes":"Berichte","encuestas":"Umfragen","chatbot ia":"KI-Chatbot","cerrar sesion":"Abmelden","guardar preferencias":"Einstellungen speichern","idioma":"Sprache","zona horaria":"Zeitzone","enviar":"Senden","cancelar":"Abbrechen","buscar":"Suchen","actualizar":"Aktualisieren","editar":"Bearbeiten","eliminar":"Löschen","proyecto":"Projekt","estado":"Status","fecha":"Datum"},
    it: {"dashboard":"Dashboard","perfil":"Profilo","proyectos":"Progetti","proyecto avanzado":"Progetto avanzato","cursos":"Corsi","tablero de tareas":"Bacheca attività","tareas":"Attività","equipo":"Team","organizaciones":"Organizzazioni","control de horas":"Controllo ore","bitacora":"Registro","alertas":"Avvisi","reportes":"Report","encuestas":"Sondaggi","chatbot ia":"Chatbot IA","cerrar sesion":"Esci","guardar preferencias":"Salva preferenze","idioma":"Lingua","zona horaria":"Fuso orario","enviar":"Invia","cancelar":"Annulla","buscar":"Cerca","actualizar":"Aggiorna","editar":"Modifica","eliminar":"Elimina","proyecto":"Progetto","estado":"Stato","fecha":"Data"},
    ja: {"dashboard":"ダッシュボード","perfil":"プロフィール","proyectos":"プロジェクト","proyecto avanzado":"高度なプロジェクト","cursos":"コース","tablero de tareas":"タスクボード","tareas":"タスク","equipo":"チーム","organizaciones":"組織","control de horas":"時間管理","bitacora":"ログ","alertas":"アラート","reportes":"レポート","encuestas":"アンケート","chatbot ia":"AIチャットボット","cerrar sesion":"ログアウト","guardar preferencias":"設定を保存","idioma":"言語","zona horaria":"タイムゾーン","enviar":"送信","cancelar":"キャンセル","buscar":"検索","actualizar":"更新","editar":"編集","eliminar":"削除","proyecto":"プロジェクト","estado":"状態","fecha":"日付"},
    ko: {"dashboard":"대시보드","perfil":"프로필","proyectos":"프로젝트","proyecto avanzado":"고급 프로젝트","cursos":"과정","tablero de tareas":"작업 보드","tareas":"작업","equipo":"팀","organizaciones":"조직","control de horas":"시간 관리","bitacora":"로그","alertas":"알림","reportes":"보고서","encuestas":"설문","chatbot ia":"AI 챗봇","cerrar sesion":"로그아웃","guardar preferencias":"환경설정 저장","idioma":"언어","zona horaria":"시간대","enviar":"보내기","cancelar":"취소","buscar":"검색","actualizar":"새로고침","editar":"편집","eliminar":"삭제","proyecto":"프로젝트","estado":"상태","fecha":"날짜"},
    zh: {"dashboard":"仪表板","perfil":"个人资料","proyectos":"项目","proyecto avanzado":"高级项目","cursos":"课程","tablero de tareas":"任务看板","tareas":"任务","equipo":"团队","organizaciones":"组织","control de horas":"工时管理","bitacora":"日志","alertas":"警报","reportes":"报告","encuestas":"调查","chatbot ia":"AI聊天机器人","cerrar sesion":"退出登录","guardar preferencias":"保存偏好","idioma":"语言","zona horaria":"时区","enviar":"发送","cancelar":"取消","buscar":"搜索","actualizar":"刷新","editar":"编辑","eliminar":"删除","proyecto":"项目","estado":"状态","fecha":"日期"},
    ar: {"dashboard":"لوحة التحكم","perfil":"الملف الشخصي","proyectos":"المشاريع","proyecto avanzado":"مشروع متقدم","cursos":"الدورات","tablero de tareas":"لوحة المهام","tareas":"المهام","equipo":"الفريق","organizaciones":"المنظمات","control de horas":"إدارة الساعات","bitacora":"السجل","alertas":"التنبيهات","reportes":"التقارير","encuestas":"الاستبيانات","chatbot ia":"روبوت محادثة ذكي","cerrar sesion":"تسجيل الخروج","guardar preferencias":"حفظ التفضيلات","idioma":"اللغة","zona horaria":"المنطقة الزمنية","enviar":"إرسال","cancelar":"إلغاء","buscar":"بحث","actualizar":"تحديث","editar":"تعديل","eliminar":"حذف","proyecto":"مشروع","estado":"الحالة","fecha":"التاريخ"},
    ru: {"dashboard":"Панель","perfil":"Профиль","proyectos":"Проекты","proyecto avanzado":"Расширенный проект","cursos":"Курсы","tablero de tareas":"Доска задач","tareas":"Задачи","equipo":"Команда","organizaciones":"Организации","control de horas":"Учет времени","bitacora":"Журнал","alertas":"Оповещения","reportes":"Отчеты","encuestas":"Опросы","chatbot ia":"ИИ-чатбот","cerrar sesion":"Выйти","guardar preferencias":"Сохранить настройки","idioma":"Язык","zona horaria":"Часовой пояс","enviar":"Отправить","cancelar":"Отмена","buscar":"Поиск","actualizar":"Обновить","editar":"Редактировать","eliminar":"Удалить","proyecto":"Проект","estado":"Статус","fecha":"Дата"},
    hi: {"dashboard":"डैशबोर्ड","perfil":"प्रोफ़ाइल","proyectos":"परियोजनाएँ","proyecto avanzado":"उन्नत परियोजना","cursos":"कोर्स","tablero de tareas":"कार्य बोर्ड","tareas":"कार्य","equipo":"टीम","organizaciones":"संगठन","control de horas":"समय नियंत्रण","bitacora":"लॉग","alertas":"अलर्ट","reportes":"रिपोर्ट","encuestas":"सर्वेक्षण","chatbot ia":"AI चैटबॉट","cerrar sesion":"लॉग आउट","guardar preferencias":"प्राथमिकताएँ सहेजें","idioma":"भाषा","zona horaria":"समय क्षेत्र","enviar":"भेजें","cancelar":"रद्द करें","buscar":"खोजें","actualizar":"अपडेट","editar":"संपादित करें","eliminar":"हटाएं","proyecto":"परियोजना","estado":"स्थिति","fecha":"तारीख"},
    tr: {"dashboard":"Panel","perfil":"Profil","proyectos":"Projeler","proyecto avanzado":"Gelişmiş Proje","cursos":"Kurslar","tablero de tareas":"Görev panosu","tareas":"Görevler","equipo":"Ekip","organizaciones":"Organizasyonlar","control de horas":"Saat kontrolü","bitacora":"Kayıt","alertas":"Uyarılar","reportes":"Raporlar","encuestas":"Anketler","chatbot ia":"YZ Chatbot","cerrar sesion":"Çıkış yap","guardar preferencias":"Tercihleri kaydet","idioma":"Dil","zona horaria":"Saat dilimi","enviar":"Gönder","cancelar":"İptal","buscar":"Ara","actualizar":"Güncelle","editar":"Düzenle","eliminar":"Sil","proyecto":"Proje","estado":"Durum","fecha":"Tarih"}
};

function iniciarIdiomaGlobalPMO() {
    configurarSelectorIdiomaPMO();
    aplicarIdiomaGlobalPMO();

    setTimeout(aplicarIdiomaGlobalPMO, 100);
    setTimeout(aplicarIdiomaGlobalPMO, 350);
    setTimeout(aplicarIdiomaGlobalPMO, 900);
    setTimeout(aplicarIdiomaGlobalPMO, 1600);

    iniciarObservadorIdiomaPMO();
}

function obtenerIdiomaGlobalPMO() {
    const usuario = obtenerUsuarioActivoGlobal();
    const idUsuario = obtenerIdUsuarioGlobal(usuario);

    if (usuario && usuario.idioma) return usuario.idioma;

    try {
        const claves = [
            `perfilUsuarioPMO_${idUsuario}`,
            `perfilUsuario_${idUsuario}`,
            "perfilUsuario"
        ];

        for (const clave of claves) {
            const perfil = JSON.parse(localStorage.getItem(clave));
            if (perfil && perfil.idioma) return perfil.idioma;
        }
    } catch (error) {
        // Sin acción.
    }

    return localStorage.getItem("idiomaGlobalPMO") || "es";
}

function guardarIdiomaGlobalPMO(idioma) {
    const usuario = obtenerUsuarioActivoGlobal();
    const idUsuario = obtenerIdUsuarioGlobal(usuario);

    localStorage.setItem("idiomaGlobalPMO", idioma);

    if (usuario) {
        usuario.idioma = idioma;
        guardarUsuarioActivoGlobal(usuario);
    }

    if (idUsuario) {
        const claves = [
            `perfilUsuarioPMO_${idUsuario}`,
            `perfilUsuario_${idUsuario}`
        ];

        claves.forEach(function (clave) {
            try {
                const perfil = JSON.parse(localStorage.getItem(clave)) || {};
                perfil.idioma = idioma;
                localStorage.setItem(clave, JSON.stringify(perfil));
            } catch (error) {
                // Sin acción.
            }
        });
    }
}



/* =========================================================
   TRADUCCIONES EXTRA PARA SUBTÍTULOS Y TEXTOS INTERNOS
   - Refuerza page-header, section-title, empty-state,
     tarjetas y textos generados por los JS de cada módulo.
========================================================= */

const TRADUCCIONES_EXTRA_PMO_EN = {

    // Refuerzo avanzado por pantallas detectadas
    "alta de proyecto avanzado": "Advanced Project Registration",
    "alta de advanced project": "Advanced Project Registration",
    "registra un proyecto con avance previo y continua su seguimiento mediante fases y subfases": "Register a project with prior progress and continue tracking it through phases and subphases.",
    "registra un project con avance previo y continua su seguimiento mediante fases y subfases": "Register a project with prior progress and continue tracking it through phases and subphases.",
    "modo administrador puedes registrar y editar proyectos avanzados": "Administrator mode: you can register and edit advanced projects.",
    "modo administrador puedes registrar y editar projects avanzados": "Administrator mode: you can register and edit advanced projects.",
    "datos generales": "General data",
    "project name": "Project name",
    "nombre del proyecto": "Project name",
    "project code": "Project code",
    "codigo del proyecto": "Project code",
    "opcional se genera automaticamente": "Optional; generated automatically",
    "optional se genera automaticamente": "Optional; generated automatically",
    "related organization": "Related organization",
    "organizacion relacionada": "Related organization",
    "sin organizacion asignada": "No assigned organization",
    "descripcion general del proyecto": "General project description",
    "descripcion general del project": "General project description",
    "responsible person": "Responsible person",
    "selecciona un responsable": "Select a responsible person",
    "selecciona un responsible person": "Select a responsible person",
    "fecha de inicio real": "Actual start date",
    "fecha estimada de termino": "Estimated end date",
    "fecha estimada de término": "Estimated end date",
    "estado actual": "Current status",
    "clasificacion": "Classification",
    "clasificación": "Classification",
    "externo": "External",
    "interno": "Internal",
    "avance calculado por fases": "Progress calculated by phases",
    "el sistema lo calcula automaticamente": "The system calculates it automatically.",
    "el sistema lo calcula automáticamente": "The system calculates it automatically.",
    "observaciones generales": "General observations",
    "observaciones contexto previo acuerdos pendientes o informacion relevante": "Observations, prior context, agreements, pending items or relevant information",
    "observaciones contexto previo acuerdos pendings o informacion relevante": "Observations, prior context, agreements, pending items or relevant information",

    "estado actual de fases": "Current phase status",
    "indica el estado de las fases y subfases": "Indicates the status of phases and subphases.",
    "indica el estado de las fases y subproject phases": "Indicates the status of phases and subphases.",
    "completado": "Completed",
    "en proceso": "In progress",
    "no entregado": "Not delivered",
    "levantamiento de requerimientos": "Requirements gathering",
    "identificacion de los requerimientos e infraestructura": "Requirements and infrastructure identification",
    "identificación de los requerimientos e infraestructura": "Requirements and infrastructure identification",
    "diseno": "Design",
    "diseño": "Design",
    "desarrollo": "Development",
    "pruebas": "Testing",
    "validacion por parte del cliente": "Client validation",
    "validation por parte del client": "Client validation",
    "implementacion": "Implementation",
    "implementación": "Implementation",
    "capacitacion": "Training",
    "capacitación": "Training",
    "documentacion de la solucion tecnologica": "Technology solution documentation",
    "documentación de la solución tecnológica": "Technology solution documentation",
    "manual de usuario": "User manual",
    "manual de user": "User manual",
    "manual tecnico": "Technical manual",
    "manual técnico": "Technical manual",
    "manual de administrador": "Administrator manual",
    "codigo integral": "Complete code",
    "código integral": "Complete code",
    "codigo ejecutable": "Executable code",
    "código ejecutable": "Executable code",
    "evaluacion y liberacion por parte del cliente": "Client evaluation and release",
    "evaluación y liberación por parte del cliente": "Client evaluation and release",
    "lista de chequeo de cumplimiento": "Compliance checklist",
    "liberacion de carta de termino contestacion cuestionarios": "Release of completion letter / questionnaire response",
    "liberación de carta de término contestación cuestionarios": "Release of completion letter / questionnaire response",

    "cursos de capacitacion": "Training courses",
    "cursos de capacitación": "Training courses",
    "sube el certificado de cada curso completado para actualizar el avance general": "Upload the certificate for each completed course to update the overall progress.",
    "sube el certificado de cada curso completado para refresh el avance general": "Upload the certificate for each completed course to update the overall progress.",
    "avance de certificaciones": "Certification progress",
    "certificados subidos": "certificates uploaded",
    "todos": "All",
    "certificado subido": "Certificate uploaded",
    "ver certificado": "View certificate",
    "subir certificado": "Upload certificate",

    "consulta organiza y actualiza las tareas de los proyectos mediante columnas de estado": "View, organize and update project tasks using status columns.",
    "consulta organiza y actualiza las tareas de los projects mediante columnas de estado": "View, organize and update project tasks using status columns.",
    "buscar tarea proyecto fase o integrante": "Search task, project, phase or member",
    "buscar tarea project fase o integrante": "Search task, project, phase or member",
    "todos los estados": "All statuses",
    "tareas por iniciar": "Tasks to start",
    "tareas actualmente en desarrollo": "Tasks currently in progress",
    "tareas con impedimentos": "Tasks with blockers",
    "tareas finalizadas": "Completed tasks",
    "no descripcion registrada": "No description registered.",
    "no description registered": "No description registered.",
    "project work": "Project work",
    "phase levantamiento de requerimientos": "Phase: Requirements gathering",
    "phase diseno": "Phase: Design",
    "phase diseño": "Phase: Design",
    "phase manual de user": "Phase: User manual",
    "assigned": "Assigned",

    "universidades empresas clientes y proveedores participantes": "Universities, companies, clients and participating suppliers.",
    "universidades companys clients y proveedores participantes": "Universities, companies, clients and participating suppliers.",
    "modo administrador puedes registrar y editar organizaciones": "Administrator mode: you can register and edit organizations.",
    "modo administrador puedes registrar y editar organizations": "Administrator mode: you can register and edit organizations.",
    "exportar lista": "Export list",
    "export lista": "Export list",
    "nueva organizacion": "New organization",
    "nueva organización": "New organization",
    "buscar organizacion": "Search organization",
    "buscar organización": "Search organization",
    "estado convenio": "Agreement status",
    "contacto": "Contact",
    "acciones": "Actions",

    "control administrativo de horas": "Administrative time control",
    "consulta valida y administra los registros de tiempo de todos los miembros": "View, validate and manage time records for all members.",
    "consulta valida y administra los registros de tiempo de todos los members": "View, validate and manage time records for all members.",
    "no hay una jornada abierta actualmente": "There is no open workday currently.",
    "no hay una workday open actualmente": "There is no open workday currently.",
    "hoy": "Today",
    "registros recientes": "Recent records",
    "se muestran los registros de todos los miembros": "Records for all members are shown.",
    "se muestran los registros de todos los members": "Records for all members are shown.",
    "date": "Date",
    "person": "Person",
    "project tarea": "Project / Task",
    "schedule": "Schedule",
    "horas": "Hours",
    "sin proyecto sin tarea": "No project · No task",
    "sin project sin tarea": "No project · No task",
    "inicio de jornada registrado desde la plataforma": "Workday start recorded from the platform.",
    "inicio de workday registrado desde la plataforma": "Workday start recorded from the platform.",

    "auditoria administrativa": "Administrative audit",
    "auditoría administrativa": "Administrative audit",
    "bitacora de movimientos": "Movement logbook",
    "bitácora de movimientos": "Movement logbook",
    "consulta las acciones relevantes realizadas dentro de la oficina de proyectos": "View relevant actions performed inside the Project Office.",
    "consulta las acciones relevantes realizadas dentro de la oficina de projects": "View relevant actions performed inside the Project Office.",
    "eventos encontrados": "Events found",
    "eventos de hoy": "Today's events",
    "events de hoy": "Today's events",
    "usuarios con actividad": "Users with activity",
    "users con actividad": "Users with activity",
    "modulos involucrados": "Modules involved",
    "módulos involucrados": "Modules involved",
    "filtros": "Filters",
    "refina los movimientos por responsable modulo accion o periodo": "Refine movements by responsible person, module, action or period.",
    "refina los movimientos por responsible person modulo accion o periodo": "Refine movements by responsible person, module, action or period.",
    "fecha inicial": "Start date",
    "fecha final": "End date",
    "end dateal": "End date",
    "todos los usuarios": "All users",
    "todos los users": "All users",
    "todos los modulos": "All modules",
    "todos los módulos": "All modules",
    "todas las acciones": "All actions",
    "aplicar filtros": "Apply filters",
    "movimientos registrados": "Registered movements",
    "movimientos encontrados": "movements found",
    "fecha y hora": "Date and time",
    "elemento": "Element",
    "detalle": "Detail",
    "view details": "View details",
    "validar registro": "Validate record",
    "se cambio la validacion del registro de horas de pendiente a rejected": "The time record validation changed from Pending to Rejected.",
    "se cambio la validation del registro de horas de pending a rejected": "The time record validation changed from Pending to Rejected.",
    "se cambio la validacion del registro de horas de pendiente a approved": "The time record validation changed from Pending to Approved.",
    "se cambio la validation del registro de horas de pending a approved": "The time record validation changed from Pending to Approved.",
    "se finalizo una jornada": "A workday was ended.",
    "se finalizo una workday": "A workday was ended.",
    "se inicio una jornada para": "A workday was started for",
    "se inicio una workday para": "A workday was started for",
    "resumen general de proyectos y tareas": "General summary of projects and tasks",
    "proyectos activos": "Active projects",
    "tareas registradas": "Registered tasks",
    "tareas bloqueadas": "Blocked tasks",
    "horas estimadas": "Estimated hours",
    "proyectos recientes": "Recent projects",
    "tareas recientes": "Recent tasks",
    "cargando proyectos": "Loading projects",
    "cargando tareas": "Loading tasks",
    "espera mientras se consulta la informacion del sistema": "Please wait while the system information is loaded",
    "espera mientras se consulta la información del sistema": "Please wait while the system information is loaded",
    "ver todos": "View all",
    "ver tablero": "View board",

    "gestion integral del portafolio de proyectos": "Comprehensive management of the project portfolio",
    "gestión integral del portafolio de proyectos": "Comprehensive management of the project portfolio",
    "consultando la informacion registrada en mysql": "Loading information registered in MySQL",
    "consultando la información registrada en mysql": "Loading information registered in MySQL",
    "nuevo proyecto": "New project",
    "cargando proyectos": "Loading projects",
    "nombre del proyecto": "Project name",
    "nombre del proyecto *": "Project name *",
    "codigo del proyecto": "Project code",
    "código del proyecto": "Project code",
    "organizacion relacionada": "Related organization",
    "organización relacionada": "Related organization",
    "responsable": "Responsible person",
    "cliente / area": "Client / Area",
    "cliente / área": "Client / Area",
    "fecha estimada de cierre": "Estimated closing date",
    "guardar proyecto": "Save project",

    "registra y consulta tareas vinculadas a proyectos fases y miembros del equipo": "Register and view tasks linked to projects, phases, and team members",
    "registra y consulta tareas vinculadas a proyectos, fases y miembros del equipo": "Register and view tasks linked to projects, phases, and team members",
    "nueva tarea": "New task",
    "titulo de la tarea": "Task title",
    "título de la tarea": "Task title",
    "titulo de la tarea *": "Task title *",
    "título de la tarea *": "Task title *",
    "fase del proyecto": "Project phase",
    "asignado a": "Assigned to",
    "asignado a *": "Assigned to *",
    "horas estimadas": "Estimated hours",
    "guardar tarea": "Save task",

    "detalle del proyecto": "Project detail",
    "fases y tareas": "Phases and tasks",
    "equipo asignado": "Assigned team",
    "fases del proyecto": "Project phases",
    "detalles": "Details",
    "exportar csv": "Export CSV",
    "imprimir / pdf": "Print / PDF",
    "agregar miembro": "Add member",
    "agregar miembro al proyecto": "Add member to project",
    "nueva reunion": "New meeting",
    "nueva reunión": "New meeting",
    "regresar a proyectos": "Back to projects",
    "persona del equipo": "Team member",
    "persona del equipo *": "Team member *",
    "rol en el proyecto": "Role in the project",
    "horas asignadas": "Assigned hours",
    "notas": "Notes",
    "sin estado": "No status",
    "sin cliente / area": "No client / area",
    "sin cliente / área": "No client / area",
    "completada": "Completed",
    "en progreso": "In progress",
    "pendiente": "Pending",
    "no iniciado": "Not started",
    "no entregado": "Not delivered",

    "registro y seguimiento de tiempo por tarea y proyecto": "Time tracking by task and project",
    "hoy": "Today",
    "total registrado": "Total registered",
    "horas aprobadas": "Approved hours",
    "registros recientes": "Recent records",
    "registrar horas": "Register hours",
    "registros obtenidos desde el sistema": "Records loaded from the system",
    "iniciar jornada": "Start workday",
    "finalizar jornada": "End workday",
    "ver mi historial": "View my history",
    "guardar registro": "Save record",
    "persona": "Person",
    "persona *": "Person *",
    "fecha": "Date",
    "fecha *": "Date *",
    "hora de entrada": "Start time",
    "hora de salida": "End time",
    "horas trabajadas": "Worked hours",
    "horas trabajadas *": "Worked hours *",
    "tipo de registro": "Record type",
    "descripcion / actividad realizada": "Description / completed activity",
    "descripción / actividad realizada": "Description / completed activity",
    "horario": "Schedule",
    "validacion": "Validation",
    "validación": "Validation",
    "consultando estado de jornada": "Checking workday status",

    "sistema de alertas y puntos de control": "Alert system and control checkpoints",
    "cuando existan tareas vencidas riesgos bloqueos o desviaciones apareceran en este apartado": "When overdue tasks, risks, blockers, or deviations exist, they will appear here",
    "cuando existan tareas vencidas, riesgos, bloqueos o desviaciones, aparecerán en este apartado": "When overdue tasks, risks, blockers, or deviations exist, they will appear here",
    "no hay alertas registradas": "No alerts registered",
    "nueva alerta": "New alert",
    "guardar alerta": "Save alert",
    "titulo": "Title",
    "título": "Title",
    "titulo *": "Title *",
    "título *": "Title *",
    "severidad": "Severity",
    "asignada a": "Assigned to",
    "abiertas": "Open",
    "en atencion": "In progress",
    "en atención": "In progress",

    "asistente inteligente para consultar proyectos tareas alertas horas y recomendaciones pmo": "Smart assistant for consulting projects, tasks, alerts, hours, and PMO recommendations",
    "asistente inteligente para consultar proyectos, tareas, alertas, horas y recomendaciones pmo": "Smart assistant for consulting projects, tasks, alerts, hours, and PMO recommendations",
    "asistente inteligente para la gestion de proyectos": "Smart assistant for project management",
    "asistente inteligente para la gestión de proyectos": "Smart assistant for project management",
    "consulta informacion de la pmo": "Consult PMO information",
    "consulta información de la pmo": "Consult PMO information",
    "conversacion con ardia": "Conversation with Ard.IA",
    "conversación con ard.ia": "Conversation with Ard.IA",
    "preguntas sugeridas": "Suggested questions",
    "que proyectos estan en riesgo": "Which projects are at risk?",
    "¿qué proyectos están en riesgo?": "Which projects are at risk?",
    "cuales son las tareas vencidas": "Which tasks are overdue?",
    "¿cuáles son las tareas vencidas?": "Which tasks are overdue?",
    "cual es el avance general del portafolio": "What is the overall portfolio progress?",
    "¿cuál es el avance general del portafolio?": "What is the overall portfolio progress?",
    "resume el desempeno de esta semana": "Summarize this week's performance",
    "resume el desempeño de esta semana": "Summarize this week's performance",
    "que recomendaciones tienes para reducir retrasos": "What recommendations do you have to reduce delays?",
    "¿qué recomendaciones tienes para reducir retrasos?": "What recommendations do you have to reduce delays?",

    "actualiza tus datos visibles dentro de la plataforma": "Update your visible data within the platform",
    "gestiona la autenticacion recuperacion de contrasena y proteccion de la cuenta": "Manage authentication, password recovery, and account protection",
    "gestiona la autenticación, recuperación de contraseña y protección de la cuenta": "Manage authentication, password recovery, and account protection",
    "autenticacion de cuenta": "Account authentication",
    "autenticación de cuenta": "Account authentication",
    "la autenticacion adicional no esta configurada": "Additional authentication is not configured",
    "la autenticación adicional no está configurada": "Additional authentication is not configured",
    "solicita un codigo de recuperacion para actualizar tu contrasena": "Request a recovery code to update your password",
    "solicita un código de recuperación para actualizar tu contraseña": "Request a recovery code to update your password",
    "correo asociado a la cuenta del usuario": "Email associated with the user account",
    "campo de referencia para cambios futuros con backend": "Reference field for future backend changes",
    "consulta las politicas de uso de la solucion integral pmo": "Review the usage policies of the comprehensive PMO solution",
    "consulta las políticas de uso de la solución integral pmo": "Review the usage policies of the comprehensive PMO solution",
    "contactos de soporte": "Support contacts",
    "accede a los canales de soporte de la plataforma": "Access the platform support channels",
    "conoce nuestro soporte": "Meet our support",
    "consulta dudas operativas con el asistente pmo": "Ask operational questions with the PMO assistant",
    "soporte tecnico": "Technical support",
    "soporte técnico": "Technical support",
    "horario lunes a viernes de 900 a 1800 hrs": "Hours: Monday to Friday from 9:00 to 18:00",
    "administracion pmo": "PMO Administration",
    "administración pmo": "PMO Administration",
    "area responsable de la operacion y seguimiento de proyectos": "Area responsible for project operation and monitoring",
    "área responsable de la operación y seguimiento de proyectos": "Area responsible for project operation and monitoring",
    "selecciona un metodo de verificacion adicional para proteger la cuenta": "Select an additional verification method to protect the account",
    "selecciona un método de verificación adicional para proteger la cuenta": "Select an additional verification method to protect the account",
    "recibe un codigo de verificacion en tu correo": "Receive a verification code in your email",
    "recibe un código de verificación en tu correo": "Receive a verification code in your email",
    "ingresa el codigo enviado": "Enter the code sent",
    "ingresa el código enviado": "Enter the code sent",
    "completa el proceso de verificacion para crear una nueva contrasena": "Complete the verification process to create a new password",
    "completa el proceso de verificación para crear una nueva contraseña": "Complete the verification process to create a new password",
    "ingresa el codigo enviado para continuar": "Enter the code sent to continue",
    "ingresa el código enviado para continuar": "Enter the code sent to continue",
    "nueva contrasena": "New password",
    "nueva contraseña": "New password",
    "confirmar contrasena": "Confirm password",
    "confirmar contraseña": "Confirm password",

    "bienvenido": "Welcome",
    "inicia sesion en tu cuenta": "Sign in to your account",
    "inicia sesión en tu cuenta": "Sign in to your account",
    "continuar con google": "Continue with Google",
    "o con email": "or with email",
    "contrasena": "Password",
    "contraseña": "Password",
    "olvidaste tu contrasena": "Forgot your password?",
    "¿olvidaste tu contraseña?": "Forgot your password?",
    "no tienes cuenta registrate aqui": "Don't have an account? Register here",
    "¿no tienes cuenta? regístrate aquí": "Don't have an account? Register here",
    "registrate aqui": "Register here",
    "regístrate aquí": "Register here"
};



/* =========================================================
   REVISIÓN FINAL DE IDIOMA
   Textos añadidos para Datos Académicos, Documentos,
   Reportes, Control de horas, formularios, modales y estados.
========================================================= */
const TRADUCCIONES_EXTRA_PMO_REVISION = {
    en: {
        "datos academicos": "Academic data",
        "datos académicos": "Academic data",
        "completa tu informacion academica": "Complete your academic information",
        "completa tu información académica": "Complete your academic information",
        "informacion academica": "Academic information",
        "información académica": "Academic information",
        "expediente academico": "Academic record",
        "expediente académico": "Academic record",
        "estos datos se usaran para reportes cartas de presentacion cartas de liberacion y formatos de horas": "These data will be used for reports, presentation letters, release letters and time formats.",
        "estos datos se usarán para reportes cartas de presentación cartas de liberación y formatos de horas": "These data will be used for reports, presentation letters, release letters and time formats.",
        "matricula": "Student ID",
        "matrícula": "Student ID",
        "universidad": "University",
        "carrera": "Program / Major",
        "cuatrimestre": "Quarter",
        "grupo": "Group",
        "correo institucional": "Institutional email",
        "telefono": "Phone",
        "teléfono": "Phone",
        "area": "Area",
        "área": "Area",
        "periodo de estadia": "Internship period",
        "periodo de estadía": "Internship period",
        "fecha de inicio": "Start date",
        "fecha de termino": "End date",
        "fecha de término": "End date",
        "asesor academico": "Academic advisor",
        "asesor académico": "Academic advisor",
        "asesor empresarial": "Business advisor",
        "responsable ceo": "Responsible person / CEO",
        "guardar datos academicos": "Save academic data",
        "guardar datos académicos": "Save academic data",
        "datos guardados correctamente": "Data saved successfully",
        "regresar al dashboard": "Return to dashboard",
        "editar datos academicos": "Edit academic data",
        "editar datos académicos": "Edit academic data",
        "datos del estudiante": "Student data",
        "datos institucionales": "Institutional data",
        "datos de estadia": "Internship data",
        "datos de estadía": "Internship data",
        "datos de asesores": "Advisor data",
        "ej universidad politecnica de tecamac": "e.g., Universidad Politécnica de Tecámac",
        "ej ingenieria en tecnologias de la informacion e innovacion digital": "e.g., Information Technology and Digital Innovation Engineering",
        "selecciona cuatrimestre": "Select quarter",
        "nombre completo del estudiante": "Student full name",

        "documentos": "Documents",
        "documentos y expediente": "Documents and record",
        "expediente": "Record",
        "gestion documental": "Document management",
        "gestión documental": "Document management",
        "administra cartas documentos de estadia y liberaciones del colaborador": "Manage collaborator letters, internship documents and releases.",
        "administra cartas documentos de estadía y liberaciones del colaborador": "Manage collaborator letters, internship documents and releases.",
        "carta de presentacion": "Presentation letter",
        "carta de presentación": "Presentation letter",
        "cartas de presentacion": "Presentation letters",
        "cartas de presentación": "Presentation letters",
        "carta de liberacion": "Release letter",
        "carta de liberación": "Release letter",
        "cartas de liberacion": "Release letters",
        "cartas de liberación": "Release letters",
        "subir carta de presentacion": "Upload presentation letter",
        "subir carta de presentación": "Upload presentation letter",
        "liberar carta": "Release letter",
        "subir carta de liberacion": "Upload release letter",
        "subir carta de liberación": "Upload release letter",
        "revision administrativa": "Administrative review",
        "revisión administrativa": "Administrative review",
        "documentos pendientes": "Pending documents",
        "documentos aceptados": "Accepted documents",
        "documentos rechazados": "Rejected documents",
        "documentos liberados": "Released documents",
        "seleccionar archivo pdf": "Select PDF file",
        "ningun archivo seleccionado": "No file selected",
        "ningún archivo seleccionado": "No file selected",
        "tipo de documento": "Document type",
        "nombre del archivo": "File name",
        "fecha de subida": "Upload date",
        "fecha de revision": "Review date",
        "fecha de revisión": "Review date",
        "estado del documento": "Document status",
        "observaciones del administrador": "Administrator observations",
        "aceptar documento": "Accept document",
        "rechazar documento": "Reject document",
        "descargar documento": "Download document",
        "ver documento": "View document",
        "pendiente de revision": "Pending review",
        "pendiente de revisión": "Pending review",
        "aceptado": "Accepted",
        "rechazado": "Rejected",
        "liberado": "Released",
        "no disponible": "Not available",
        "disponible para descarga": "Available for download",
        "selecciona colaborador": "Select collaborator",
        "selecciona un colaborador": "Select a collaborator",
        "subir documento": "Upload document",
        "guardar documento": "Save document",
        "historial documental": "Document history",
        "mi expediente": "My record",
        "mis documentos": "My documents",
        "carta pendiente": "Pending letter",
        "carta validada": "Validated letter",
        "carta rechazada": "Rejected letter",
        "carta liberada": "Released letter",

        "reportes": "Reports",
        "consulta filtra y exporta informacion de la oficina de proyectos": "View, filter and export Project Office information.",
        "consulta filtra y exporta información de la oficina de proyectos": "View, filter and export Project Office information.",
        "verificando permisos": "Checking permissions",
        "actualizar reportes": "Refresh reports",
        "filtros globales": "Global filters",
        "aplica un periodo general a los reportes mensuales proyectos tareas horas alertas encuestas y certificados": "Apply a general period to monthly reports, projects, tasks, hours, alerts, surveys and certificates.",
        "mes inicial": "Start month",
        "mes final": "End month",
        "aplicar filtro": "Apply filter",
        "limpiar": "Clear",
        "mostrando informacion de todos los meses": "Showing information for all months.",
        "mostrando información de todos los meses": "Showing information for all months.",
        "reporte general": "General report",
        "resumen general de la operacion de la oficina de proyectos": "General summary of the Project Office operation.",
        "resumen general de la operación de la oficina de proyectos": "General summary of the Project Office operation.",
        "descargar resumen csv": "Download CSV summary",
        "reporte mensual": "Monthly report",
        "consolidado por mes de proyectos tareas horas y eventos registrados": "Monthly consolidation of projects, tasks, hours and registered events.",
        "descargar csv": "Download CSV",
        "descargar reporte mensual": "Download monthly report",
        "proyectos del periodo": "Projects in period",
        "tareas del periodo": "Tasks in period",
        "horas registradas": "Registered hours",
        "horas aprobadas": "Approved hours",
        "alertas del periodo": "Alerts in period",
        "certificados del periodo": "Certificates in period",
        "estado del portafolio": "Portfolio status",
        "productividad": "Productivity",
        "validacion de horas": "Time validation",
        "validación de horas": "Time validation",
        "riesgos principales": "Main risks",
        "reporte de proyectos": "Project report",
        "reporte de tareas": "Task report",
        "reporte de equipo": "Team report",
        "reporte de horas": "Time report",
        "reporte de alertas": "Alert report",
        "reporte de encuestas": "Survey report",
        "reporte de cursos": "Course report",
        "reporte de certificados": "Certificate report",
        "cargando informacion del portafolio": "Loading portfolio information",
        "cargando información del portafolio": "Loading portfolio information",
        "cargando indicadores de productividad": "Loading productivity indicators",
        "cargando informacion de horas": "Loading time information",
        "cargando información de horas": "Loading time information",
        "cargando alertas registradas": "Loading registered alerts",
        "no hay informacion mensual dentro del periodo seleccionado": "There is no monthly information within the selected period.",
        "no hay información mensual dentro del periodo seleccionado": "There is no monthly information within the selected period.",
        "no hay datos disponibles para exportar": "There are no data available to export.",

        "historial de horas": "Time history",
        "mi historial de horas": "My time history",
        "historial de horas del integrante": "Member time history",
        "consulta de jornadas y registros de tiempo": "Workday and time record query.",
        "consulta de tus jornadas y registros de horas": "Review your workdays and time records.",
        "regresar a control de horas": "Return to time control",
        "descargar formato": "Download format",
        "descargar asistencia personal": "Download personal attendance",
        "firma encargado": "Manager signature",
        "firma digital del encargado": "Manager digital signature",
        "la firma se integrara a los formatos y documentos descargables que generara la plataforma": "The signature will be included in the downloadable formats and documents generated by the platform.",
        "la firma se integrará a los formatos y documentos descargables que generará la plataforma": "The signature will be included in the downloadable formats and documents generated by the platform.",
        "vista previa de la firma": "Signature preview",
        "no hay una firma registrada": "No signature is registered.",
        "seleccionar imagen de firma": "Select signature image",
        "formatos permitidos png jpg o jpeg": "Allowed formats: PNG, JPG or JPEG.",
        "guardar firma": "Save signature",
        "eliminar firma": "Delete signature",
        "firma que deseas configurar": "Signature to configure",
        "miguel angel hernandez herrera": "Miguel Ángel Hernández Herrera",
        "miguel ángel hernández herrera": "Miguel Ángel Hernández Herrera",
        "julio lara garcia": "Julio Lara García",
        "julio lara garcía": "Julio Lara García",
        "registros del periodo": "Period records",
        "selecciona un periodo para consultar los registros": "Select a period to view records.",
        "total registrado": "Total registered",
        "horas pendientes": "Pending hours",
        "horas rechazadas": "Rejected hours",
        "jornada": "Workday",
        "iniciar jornada": "Start workday",
        "finalizar jornada": "End workday",
        "ver mi historial": "View my history",
        "registrar horas": "Register hours",
        "mi control de horas": "My time control",
        "registra tu jornada y las horas trabajadas en tus tareas": "Record your workday and the hours worked on your tasks.",
        "solo se muestran los registros asociados a tu usuario": "Only records associated with your user are shown.",
        "persona": "Person",
        "tipo": "Type",
        "proyecto tarea": "Project / Task",
        "horario": "Schedule",
        "validacion": "Validation",
        "validación": "Validation",
        "acciones": "Actions",
        "tipo de registro": "Record type",
        "laborado normal": "Regular workday",
        "no laborado con justificacion": "Not worked with justification",
        "no laborado con justificación": "Not worked with justification",
        "no laborado sin justificacion": "Not worked without justification",
        "no laborado sin justificación": "Not worked without justification",
        "recuperacion de dia no laborado": "Recovery of non-worked day",
        "recuperación de día no laborado": "Recovery of non-worked day",
        "dia festivo laborado": "Worked holiday",
        "día festivo laborado": "Worked holiday",
        "fin de semana laborado": "Worked weekend",
        "descripcion actividad realizada": "Description / activity performed",
        "descripción actividad realizada": "Description / activity performed",
        "describe el avance actividad entregable o evidencia realizada": "Describe the progress, activity, deliverable or evidence completed",
        "guardar registro": "Save record",
        "corregir registro de horas": "Correct time record",
        "cargando registros": "Loading records",
        "cargando registros de horas": "Loading time records",
        "cargando historial de horas": "Loading time history",
        "no hay registros de horas disponibles": "No time records available.",
        "no hay registros de horas para el periodo seleccionado": "No time records for the selected period.",
        "jornada abierta": "Open workday",
        "jornada abierta actualmente": "Currently open workday",
        "jornada iniciada": "Workday started",
        "jornada finalizada correctamente": "Workday ended successfully.",
        "jornada iniciada correctamente": "Workday started successfully.",
        "sin horario": "No schedule",
        "jornada abierta": "Open workday",
        "sin descripcion": "No description",
        "sin descripción": "No description",
        "sin integrante": "No member",
        "sin proyecto": "No project",
        "sin tarea": "No task",
        "aprobado": "Approved",
        "pendiente": "Pending",
        "manual": "Manual",

        "bitacora": "Logbook",
        "bitácora": "Logbook",
        "modulo": "Module",
        "módulo": "Module",
        "accion": "Action",
        "acción": "Action",
        "elemento": "Element",
        "detalle": "Detail",
        "ver detalles": "View details",
        "aplicar filtros": "Apply filters",
        "todos los usuarios": "All users",
        "todos los modulos": "All modules",
        "todos los módulos": "All modules",
        "todas las acciones": "All actions",
        "fecha inicial": "Start date",
        "fecha final": "End date",
        "movimientos registrados": "Registered movements",
        "eventos de hoy": "Today's events",
        "usuarios con actividad": "Users with activity",
        "modulos involucrados": "Modules involved",
        "módulos involucrados": "Modules involved",
        "acceso restringido": "Restricted access",
        "la bitacora general solo esta disponible para administradores": "The general logbook is only available to administrators.",
        "la bitácora general solo está disponible para administradores": "The general logbook is only available to administrators.",
        "ir al dashboard": "Go to Dashboard",

        "organizacion": "Organization",
        "organización": "Organization",
        "tipo": "Type",
        "estado convenio": "Agreement status",
        "telefono": "Phone",
        "activo": "Active",
        "inactivo": "Inactive",
        "empresa": "Company",
        "universidad": "University",
        "cliente": "Client",
        "proveedor": "Supplier",

        "crear cuenta": "Create account",
        "registro": "Registration",
        "registrarse": "Register",
        "apellidos": "Last names",
        "confirmar contraseña": "Confirm password",
        "confirmar contrasena": "Confirm password",
        "ya tienes cuenta": "Already have an account?",
        "iniciar sesion aqui": "Sign in here",
        "iniciar sesión aquí": "Sign in here",
        "oficina de proyectos": "Project Office",
        "gestion integral de proyectos colaboradores evidencias horas y reportes": "Comprehensive management of projects, collaborators, evidence, hours and reports.",
        "gestión integral de proyectos colaboradores evidencias horas y reportes": "Comprehensive management of projects, collaborators, evidence, hours and reports.",
        "modulos principales": "Main modules",
        "módulos principales": "Main modules",
        "beneficios": "Benefits",
        "flujo de uso": "Usage flow",
        "conocer modulos": "Explore modules",
        "conocer módulos": "Explore modules",

        "enero": "January", "febrero": "February", "marzo": "March", "abril": "April", "mayo": "May", "junio": "June", "julio": "July", "agosto": "August", "septiembre": "September", "octubre": "October", "noviembre": "November", "diciembre": "December"
    }
};

const TRADUCCIONES_EXTRA_PMO = {
    en: TRADUCCIONES_EXTRA_PMO_EN,
    pt: {
        "resumen general de proyectos y tareas": "Resumo geral de projetos e tarefas",
        "gestion integral del portafolio de proyectos": "Gestão integral do portfólio de projetos",
        "gestión integral del portafolio de proyectos": "Gestão integral do portfólio de projetos",
        "registra y consulta tareas vinculadas a proyectos fases y miembros del equipo": "Registre e consulte tarefas vinculadas a projetos, fases e membros da equipe",
        "registro y seguimiento de tiempo por tarea y proyecto": "Registro e acompanhamento de tempo por tarefa e projeto",
        "sistema de alertas y puntos de control": "Sistema de alertas e pontos de controle",
        "asistente inteligente para consultar proyectos tareas alertas horas y recomendaciones pmo": "Assistente inteligente para consultar projetos, tarefas, alertas, horas e recomendações PMO",
        "actualiza tus datos visibles dentro de la plataforma": "Atualize seus dados visíveis dentro da plataforma",
        "gestiona la autenticacion recuperacion de contrasena y proteccion de la cuenta": "Gerencie autenticação, recuperação de senha e proteção da conta",
        "contactos de soporte": "Contatos de suporte",
        "bienvenido": "Bem-vindo",
        "inicia sesion en tu cuenta": "Entre na sua conta"
    },
    fr: {
        "resumen general de proyectos y tareas": "Résumé général des projets et des tâches",
        "gestion integral del portafolio de proyectos": "Gestion complète du portefeuille de projets",
        "gestión integral del portafolio de proyectos": "Gestion complète du portefeuille de projets",
        "registra y consulta tareas vinculadas a proyectos fases y miembros del equipo": "Enregistrez et consultez les tâches liées aux projets, phases et membres de l’équipe",
        "registro y seguimiento de tiempo por tarea y proyecto": "Suivi du temps par tâche et par projet",
        "sistema de alertas y puntos de control": "Système d’alertes et points de contrôle",
        "asistente inteligente para consultar proyectos tareas alertas horas y recomendaciones pmo": "Assistant intelligent pour consulter projets, tâches, alertes, heures et recommandations PMO",
        "actualiza tus datos visibles dentro de la plataforma": "Mettez à jour vos données visibles dans la plateforme",
        "contactos de soporte": "Contacts de support",
        "bienvenido": "Bienvenue",
        "inicia sesion en tu cuenta": "Connectez-vous à votre compte"
    },
    de: {
        "resumen general de proyectos y tareas": "Allgemeine Zusammenfassung von Projekten und Aufgaben",
        "gestion integral del portafolio de proyectos": "Umfassende Verwaltung des Projektportfolios",
        "gestión integral del portafolio de proyectos": "Umfassende Verwaltung des Projektportfolios",
        "registra y consulta tareas vinculadas a proyectos fases y miembros del equipo": "Aufgaben zu Projekten, Phasen und Teammitgliedern erfassen und anzeigen",
        "registro y seguimiento de tiempo por tarea y proyecto": "Zeiterfassung nach Aufgabe und Projekt",
        "sistema de alertas y puntos de control": "Warnsystem und Kontrollpunkte",
        "asistente inteligente para consultar proyectos tareas alertas horas y recomendaciones pmo": "Intelligenter Assistent für Projekte, Aufgaben, Warnungen, Zeiten und PMO-Empfehlungen",
        "actualiza tus datos visibles dentro de la plataforma": "Aktualisiere deine sichtbaren Daten in der Plattform",
        "contactos de soporte": "Supportkontakte",
        "bienvenido": "Willkommen",
        "inicia sesion en tu cuenta": "Melde dich bei deinem Konto an"
    },
    it: {
        "resumen general de proyectos y tareas": "Riepilogo generale di progetti e attività",
        "gestion integral del portafolio de proyectos": "Gestione integrale del portafoglio progetti",
        "gestión integral del portafolio de proyectos": "Gestione integrale del portafoglio progetti",
        "registra y consulta tareas vinculadas a proyectos fases y miembros del equipo": "Registra e consulta attività collegate a progetti, fasi e membri del team",
        "registro y seguimiento de tiempo por tarea y proyecto": "Registrazione e monitoraggio del tempo per attività e progetto",
        "sistema de alertas y puntos de control": "Sistema di avvisi e punti di controllo",
        "asistente inteligente para consultar proyectos tareas alertas horas y recomendaciones pmo": "Assistente intelligente per consultare progetti, attività, avvisi, ore e raccomandazioni PMO",
        "actualiza tus datos visibles dentro de la plataforma": "Aggiorna i tuoi dati visibili nella piattaforma",
        "contactos de soporte": "Contatti di supporto",
        "bienvenido": "Benvenuto",
        "inicia sesion en tu cuenta": "Accedi al tuo account"
    }
};

function construirDiccionarioIdiomaPMO(idioma) {
    if (idioma === "es") {
        return {};
    }

    const baseIngles = TRADUCCIONES_EXTRA_PMO_EN;
    const revisionIngles = TRADUCCIONES_EXTRA_PMO_REVISION.en || {};
    const base = TRADUCCIONES_PMO[idioma] || {};
    const extra = TRADUCCIONES_EXTRA_PMO[idioma] || {};
    const revision = TRADUCCIONES_EXTRA_PMO_REVISION[idioma] || {};

    /*
     * Para idiomas secundarios se usa inglés técnico como respaldo
     * cuando todavía no exista una traducción específica. Así se evita
     * que subtítulos internos queden en español.
     */
    return {
        ...baseIngles,
        ...revisionIngles,
        ...base,
        ...extra,
        ...revision
    };
}

function aplicarIdiomaGlobalPMO() {
    if (aplicandoIdiomaPMO) return;

    aplicandoIdiomaPMO = true;

    try {
        const idioma = obtenerIdiomaGlobalPMO();
        const diccionario = construirDiccionarioIdiomaPMO(idioma);

        document.documentElement.lang = idioma || "es";
        document.documentElement.dir = idioma === "ar" ? "rtl" : "ltr";

        configurarSelectorIdiomaPMO();
        repararValoresTecnicosPMO();

        if (idioma === "es") {
            restaurarEspanolPMO();
            return;
        }

        traducirTextosProfundosPMO(diccionario);
        traducirAtributosPMO(diccionario);
        traducirSelectoresEspecialesPMO(diccionario);
    } finally {
        aplicandoIdiomaPMO = false;
    }
}


function repararValoresTecnicosPMO() {
    const elementos = document.querySelectorAll("[data-i18n-originalvalue]");

    elementos.forEach(function (elemento) {
        const original = elemento.dataset.i18nOriginalvalue;

        if (original !== undefined && original !== null) {
            elemento.setAttribute("value", original);
        }
    });
}

function configurarSelectorIdiomaPMO() {
    const selector = document.getElementById("idiomaPerfil");
    if (!selector) return;

    selector.value = obtenerIdiomaGlobalPMO();

    if (selector.dataset.idiomaGlobalConfigurado === "true") return;

    selector.dataset.idiomaGlobalConfigurado = "true";

    selector.addEventListener("change", function () {
        guardarIdiomaGlobalPMO(selector.value);
        aplicarIdiomaGlobalPMO();
        setTimeout(aplicarIdiomaGlobalPMO, 100);
        setTimeout(aplicarIdiomaGlobalPMO, 400);
    });
}

function iniciarObservadorIdiomaPMO() {
    if (observadorIdiomaPMO) {
        observadorIdiomaPMO.disconnect();
    }

    observadorIdiomaPMO = new MutationObserver(function () {
        if (aplicandoIdiomaPMO) return;

        const idioma = obtenerIdiomaGlobalPMO();
        if (idioma === "es") return;

        clearTimeout(window.__temporizadorIdiomaPMO);
        window.__temporizadorIdiomaPMO = setTimeout(aplicarIdiomaGlobalPMO, 80);
    });

    observadorIdiomaPMO.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

function traducirTextosProfundosPMO(diccionario) {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                if (!node.nodeValue || !node.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }

                const padre = node.parentElement;
                if (!padre) return NodeFilter.FILTER_REJECT;

                const tag = padre.tagName.toLowerCase();
                if (["script", "style", "noscript", "code", "pre"].includes(tag)) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const nodos = [];
    while (walker.nextNode()) {
        nodos.push(walker.currentNode);
    }

    nodos.forEach(function (nodo) {
        if (!nodo.__textoOriginalPMO) {
            nodo.__textoOriginalPMO = nodo.nodeValue;
        }

        const original = nodo.__textoOriginalPMO;
        const traducido = traducirCadenaPMO(original, diccionario);

        if (traducido && traducido !== nodo.nodeValue) {
            nodo.nodeValue = traducido;
        }
    });
}

function traducirAtributosPMO(diccionario) {
    /*
     * No se traduce el atributo value.
     * Los JS de Proyectos, Tareas, Tablero, Horas y Reportes usan value
     * para filtrar estados, enviar payloads al backend y comparar datos.
     * Si value cambia de "Pendiente" a "Pending", los registros desaparecen.
     */
    const atributos = [
        "placeholder",
        "title",
        "aria-label",
        "alt"
    ];

    const elementos = document.querySelectorAll("input, textarea, img, button, a, option, [title], [aria-label]");

    elementos.forEach(function (elemento) {
        atributos.forEach(function (atributo) {
            if (!elemento.hasAttribute(atributo)) return;

            const dataKey = `i18nOriginal${atributo.replace(/[^a-zA-Z]/g, "")}`;

            if (!elemento.dataset[dataKey]) {
                elemento.dataset[dataKey] = elemento.getAttribute(atributo) || "";
            }

            const original = elemento.dataset[dataKey];
            const traducido = traducirCadenaPMO(original, diccionario);

            if (traducido) {
                elemento.setAttribute(atributo, traducido);
            }
        });
    });
}

function traducirSelectoresEspecialesPMO(diccionario) {
    const elementos = document.querySelectorAll(".badge, .role-indicator, .indicador-rol-global, .empty-state h3, .empty-state p");

    elementos.forEach(function (elemento) {
        if (!elemento.dataset.i18nOriginalTextoEspecial) {
            elemento.dataset.i18nOriginalTextoEspecial = elemento.textContent || "";
        }

        const traducido = traducirCadenaPMO(elemento.dataset.i18nOriginalTextoEspecial, diccionario);
        if (traducido) elemento.textContent = traducido;
    });
}

function restaurarEspanolPMO() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodos = [];
    while (walker.nextNode()) nodos.push(walker.currentNode);

    nodos.forEach(function (nodo) {
        if (nodo.__textoOriginalPMO) {
            nodo.nodeValue = nodo.__textoOriginalPMO;
        }
    });

    const elementos = document.querySelectorAll("[data-i18n-originalplaceholder], [data-i18n-originaltitle], [data-i18n-originalarialabel], [data-i18n-originalalt]");

    elementos.forEach(function (elemento) {
        [
            ["placeholder", "i18nOriginalplaceholder"],
            ["title", "i18nOriginaltitle"],
            ["aria-label", "i18nOriginalarialabel"],
            ["alt", "i18nOriginalalt"]
        ].forEach(function (par) {
            const atributo = par[0];
            const key = par[1];
            if (elemento.dataset[key]) {
                elemento.setAttribute(atributo, elemento.dataset[key]);
            }
        });
    });
}

function traducirCadenaPMO(valor, diccionario) {
    const cadena = String(valor || "");
    if (!cadena.trim()) return cadena;

    const inicio = cadena.match(/^\s*/)[0] || "";
    const fin = cadena.match(/\s*$/)[0] || "";
    const contenido = cadena.trim();

    const prefijo = contenido.match(/^[^\p{L}\p{N}¿¡]+/u)?.[0] || "";
    const sufijo = contenido.match(/[^\p{L}\p{N}.!?%:)]+$/u)?.[0] || "";

    const limpio = contenido
        .replace(/^[^\p{L}\p{N}¿¡]+/u, "")
        .replace(/[^\p{L}\p{N}.!?%:)]+$/u, "")
        .trim();

    const traduccionExacta = buscarTraduccionPMO(limpio, diccionario);
    if (traduccionExacta) return inicio + prefijo + traduccionExacta + sufijo + fin;

    const traduccionFlexible = traducirFraseFlexiblePMO(limpio, diccionario);
    if (traduccionFlexible && traduccionFlexible !== limpio) {
        return inicio + prefijo + traduccionFlexible + sufijo + fin;
    }

    const traduccionPatron = traducirPatronesDinamicosPMO(limpio, diccionario);
    if (traduccionPatron && traduccionPatron !== limpio) {
        return inicio + prefijo + traduccionPatron + sufijo + fin;
    }

    return cadena;
}

function traducirPatronesDinamicosPMO(texto, diccionario) {
    const esIngles = diccionario && diccionario["dashboard"] === "Dashboard";
    if (!esIngles) return texto;

    let t = String(texto || "");
    const n = normalizarTextoIdiomaPMO(t);

    let m = n.match(/^(\d+) de (\d+) certificados subidos$/);
    if (m) return `${m[1]} of ${m[2]} certificates uploaded`;

    m = n.match(/^(\d+) registros?$/);
    if (m) return `${m[1]} ${m[1] === "1" ? "record" : "records"}`;

    m = n.match(/^(\d+) movimientos encontrados$/);
    if (m) return `${m[1]} movements found`;

    m = n.match(/^(\d+) eventos encontrados$/);
    if (m) return `${m[1]} events found`;

    m = n.match(/^registros correspondientes a (.+)$/);
    if (m) return `Records for ${m[1]}.`;

    m = n.match(/^mostrando (\d+) registros del periodo seleccionado$/);
    if (m) return `Showing ${m[1]} records for the selected period.`;

    m = n.match(/^mostrando (\d+) registros con filtros de (.+)$/);
    if (m) return `Showing ${m[1]} records with filters: ${m[2]}.`;

    m = n.match(/^existen (\d+) proyectos en el periodo seleccionado (\d+) se consideran activos$/);
    if (m) return `There are ${m[1]} projects in the selected period; ${m[2]} are considered active.`;

    m = n.match(/^se registraron (\d+) tareas de las cuales (\d+) estan completadas el equipo acumulo ([\d.]+) horas$/);
    if (m) return `${m[1]} tasks were recorded, ${m[2]} of which are completed. The team accumulated ${m[3]} hours.`;

    m = n.match(/^hay ([\d.]+) horas aprobadas y ([\d.]+) horas pendientes de validacion$/);
    if (m) return `There are ${m[1]} approved hours and ${m[2]} hours pending validation.`;

    m = n.match(/^se inicio una (jornada|workday) para (.+)$/);
    if (m) return `A workday was started for ${m[2]}.`;

    if (n.includes("se cambio la") && n.includes("validation") && n.includes("registro de horas")) {
        return t
            .replace(/Se cambió|Se cambio/gi, "Changed")
            .replace(/la Validation|la validación|la validacion/gi, "the validation")
            .replace(/del registro de horas/gi, "of the time record")
            .replace(/de Pending a Rejected|de Pendiente a Rechazado/gi, "from Pending to Rejected")
            .replace(/de Pending a Approved|de Pendiente a Aprobado/gi, "from Pending to Approved");
    }

    return texto;
}

function buscarTraduccionPMO(texto, diccionario) {
    const variantes = [
        texto,
        texto.replace(/:$/, ""),
        texto.replace(/\.$/, ""),
        texto.replace(/\?$/, ""),
        texto.replace(/^¿/, "").replace(/\?$/, ""),
        texto.replace(/^¡/, "").replace(/!$/, "")
    ];

    for (const variante of variantes) {
        const clave = normalizarTextoIdiomaPMO(variante);
        if (diccionario[clave]) return diccionario[clave];
    }

    return null;
}

function traducirFraseFlexiblePMO(texto, diccionario) {
    let resultado = texto;

    const claves = Object.keys(diccionario)
        .sort(function (a, b) { return b.length - a.length; });

    claves.forEach(function (clave) {
        if (clave.length < 7) return;

        const expresion = new RegExp(escaparRegexPMO(clave), "gi");
        resultado = resultado.replace(expresion, diccionario[clave]);
    });

    resultado = resultado
        .replace(/Project/g, "Project")
        .replace(/Projects/g, "Projects")
        .replace(/Workday/g, "Workday")
        .replace(/Validation/g, "Validation")
        .replace(/Users con actividad/gi, "Users with activity")
        .replace(/End dateal/gi, "End date")
        .replace(/Companys/gi, "Companies")
        .replace(/Clients/g, "Clients")
        .replace(/Members/g, "Members");

    return resultado;
}

function normalizarTextoIdiomaPMO(valor) {
    return String(valor || "")
        .replace(/&nbsp;/g, " ")
        .replace(/^[^\p{L}\p{N}¿¡]+/u, "")
        .replace(/[^\p{L}\p{N}.!?%:)]+$/u, "")
        .replace(/[“”"']/g, "")
        .replace(/[¿?¡!.,:;]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function escaparRegexPMO(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* =========================================================
   MÓDULO DOCUMENTOS / EXPEDIENTE
   Inserta el acceso al menú sin tener que editar todos los HTML.
========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    insertarAccesoDocumentosGlobal();
    setTimeout(insertarAccesoDocumentosGlobal, 300);
});

function insertarAccesoDocumentosGlobal() {
    const usuario = obtenerUsuarioActivoGlobal();
    const esAdmin = esAdministradorGlobal(usuario);
    const esConsulta = esRolConsultaGlobal(usuario);
    const menus = document.querySelectorAll(".sidebar-menu");

    menus.forEach(function (menu) {
        if (!menu.querySelector('a[href="datos-academicos.html"]')) {
            const enlaceAcademico = document.createElement("a");
            enlaceAcademico.href = "datos-academicos.html";
            enlaceAcademico.textContent = "Datos académicos";

            if (obtenerPaginaActualGlobal && obtenerPaginaActualGlobal() === "datos-academicos.html") {
                enlaceAcademico.classList.add("active");
            }

            const perfil = menu.querySelector('a[href="perfil.html"]');
            if (perfil && perfil.nextSibling) {
                perfil.parentNode.insertBefore(enlaceAcademico, perfil.nextSibling);
            } else {
                menu.appendChild(enlaceAcademico);
            }
        }

        menu.querySelectorAll('a[href*="pmbok-v8.html"]').forEach(a => a.remove());
        if (!menu.querySelector('a[href="videollamadas.html"]')) {
            const enlace = document.createElement("a");
            enlace.href = "videollamadas.html";
            enlace.textContent = "Videollamadas";
            menu.appendChild(enlace);
        }

        if (menu.querySelector('a[href="documentos.html"]')) {
            return;
        }

        const enlace = document.createElement("a");
        enlace.href = "documentos.html";
        enlace.textContent = "Documentos";

        if (obtenerPaginaActualGlobal && obtenerPaginaActualGlobal() === "documentos.html") {
            enlace.classList.add("active");
        }

        const chatbot = menu.querySelector('a[href="chatbot.html"]');
        if (chatbot) {
            chatbot.parentNode.insertBefore(enlace, chatbot);
        } else {
            menu.appendChild(enlace);
        }
    });

    ocultarOpcionesMenu(esAdmin, esConsulta);
}

try {
    Object.keys(TRADUCCIONES_PMO || {}).forEach(function (idioma) {
        const t = TRADUCCIONES_PMO[idioma];
        if (!t) return;

        if (idioma === "en") {
            Object.assign(t, {
                "documentos": "Documents",
                "documentos y expediente": "Documents and records",
                "gestiona cartas de presentacion validaciones administrativas y cartas de liberacion": "Manage presentation letters, administrative validations, and release letters",
                "mis documentos": "My documents",
                "revision administrativa": "Administrative review",
                "revisión administrativa": "Administrative review",
                "cartas de liberacion": "Release letters",
                "cartas de liberación": "Release letters",
                "subir carta de presentacion": "Upload presentation letter",
                "subir carta de presentación": "Upload presentation letter",
                "liberar carta": "Release letter",
                "carta de presentacion": "Presentation letter",
                "carta de presentación": "Presentation letter",
                "carta de liberacion": "Release letter",
                "carta de liberación": "Release letter",
                "revisar documento": "Review document",
                "guardar documento": "Save document",
                "guardar revision": "Save review",
                "guardar revisión": "Save review",
                "colaborador": "Collaborator",
                "documento": "Document",
                "documentos": "Documents",
                "fecha de subida": "Upload date",
                "fecha de liberacion": "Release date",
                "fecha de liberación": "Release date",
                "observaciones": "Comments",
                "acciones": "Actions",
                "descargar": "Download",
                "aceptar": "Accept",
                "rechazar": "Reject",
                "liberada": "Released",
                "aceptado": "Accepted",
                "rechazado": "Rejected",
                "pendiente": "Pending"
            });
        }

        if (idioma === "pt") {
            Object.assign(t, { "documentos": "Documentos", "documentos y expediente": "Documentos e expediente", "mis documentos": "Meus documentos", "cartas de liberacion": "Cartas de liberação", "subir carta de presentacion": "Enviar carta de apresentação", "liberar carta": "Liberar carta", "descargar": "Baixar" });
        }
        if (idioma === "fr") {
            Object.assign(t, { "documentos": "Documents", "documentos y expediente": "Documents et dossier", "mis documentos": "Mes documents", "cartas de liberacion": "Lettres de libération", "subir carta de presentacion": "Téléverser la lettre", "liberar carta": "Libérer la lettre", "descargar": "Télécharger" });
        }
    });
} catch (error) {
    // Sin acción.
}


/* Traducciones rápidas para datos académicos */
try {
    Object.keys(TRADUCCIONES_PMO || {}).forEach(function (idioma) {
        const t = TRADUCCIONES_PMO[idioma];
        if (!t) return;
        if (idioma === "en") {
            Object.assign(t, {
                "datos academicos": "Academic data",
                "datos académicos": "Academic data",
                "completa tu informacion universitaria": "Complete your university information",
                "completa tu información universitaria": "Complete your university information",
                "matricula": "Student ID",
                "matrícula": "Student ID",
                "universidad": "University",
                "carrera": "Program",
                "cuatrimestre": "Term",
                "grupo": "Group",
                "periodo de estadia": "Internship period",
                "periodo de estadía": "Internship period",
                "asesor academico": "Academic advisor",
                "asesor académico": "Academic advisor",
                "asesor empresarial": "Business advisor",
                "guardar datos academicos": "Save academic data",
                "guardar datos académicos": "Save academic data"
            });
        }
    });
} catch (error) {}


// Navegación V7: los accesos principales permanecen visibles.
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".sidebar-menu").forEach(function (menu) {
        if (menu.dataset.pmoNavegacionV7) return;
        menu.dataset.pmoNavegacionV7 = "true";
        const principales = [
            ["dashboard.html", "Inicio", "inicio"],
            ["proyectos.html", "Proyectos", "proyectos"],
            ["tablero-tareas.html", "Mis tareas", "tareas"],
            ["mi-estadia.html", "Mi seguimiento de estadía", "estadia"],
            ["videollamadas.html", "Videollamadas", "video"],
            ["control-horas.html", "Control de horas", "horas"]
        ];
        const encabezado = document.createElement("p");
        encabezado.className = "pmo-menu-label";
        encabezado.textContent = "ESPACIO DE TRABAJO";
        const zonaPrincipal = document.createElement("div");
        zonaPrincipal.className = "pmo-menu-principal";
        menu.append(encabezado, zonaPrincipal);
        const grupos = [
            ["Mi cuenta y documentos", ["perfil.html", "datos-academicos.html", "documentos.html"]],
            ["Herramientas", ["tareas.html", "cursos.html", "alertas.html", "encuestas.html", "chatbot.html"]],
            ["Administración", ["seguimiento-estadia.html", "equipo.html", "organizaciones.html", "bitacora.html", "reportes.html", "roles-permisos.html", "proyecto-avanzado.html"]]
        ].map(([nombre, rutas]) => {
            const details = document.createElement("details");
            details.className = "pmo-menu-grupo";
            details.setAttribute("name", "pmo-menu-extras");
            const summary = document.createElement("summary");
            summary.textContent = nombre;
            details.appendChild(summary);
            menu.appendChild(details);
            return { details, rutas };
        });
        const busqueda = document.createElement("input");
        Object.assign(busqueda, { type: "search", name: "pmo-navigation-query", autocomplete: "off",
            spellcheck: false, placeholder: "Buscar un apartado", className: "pmo-menu-busqueda" });
        busqueda.setAttribute("aria-label", "Buscar en el menú");
        busqueda.setAttribute("data-lpignore", "true");
        busqueda.setAttribute("data-1p-ignore", "true");
        menu.prepend(busqueda);
        const aviso = document.createElement("p");
        aviso.className = "pmo-menu-sin-resultados";
        aviso.textContent = "No hay apartados con ese nombre.";
        aviso.hidden = true;
        menu.appendChild(aviso);
        const pagina = location.pathname.split("/").pop();
        const normalizar = v => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        let organizando = false;
        const expedientesAdmin=document.createElement('a');expedientesAdmin.href='documentos.html#expedientesPorPeriodo';
        expedientesAdmin.textContent='Documentos por periodo';expedientesAdmin.dataset.pmoAdministracion='true';expedientesAdmin.hidden=true;
        grupos[2].details.appendChild(expedientesAdmin);
        function organizar() {
            if (organizando) return;
            organizando = true;
            menu.querySelectorAll('a[href*="pmbok-v8.html"]').forEach(a => a.remove());
            principales.forEach(([ruta, texto, icono]) => {
                const enlaces = Array.from(menu.querySelectorAll("a[href]")).filter(a => a.getAttribute("href") === ruta);
                let enlace = enlaces.shift();
                enlaces.forEach(a => a.remove());
                if (!enlace) {
                    enlace = document.createElement("a"); enlace.href = ruta; enlace.textContent = texto;
                }
                if (ruta !== "mi-estadia.html" && enlace.textContent !== texto) enlace.textContent = texto;
                enlace.dataset.icono = icono;
                if (enlace.parentNode !== zonaPrincipal) zonaPrincipal.appendChild(enlace);
            });
            menu.querySelectorAll("a[href]").forEach(enlace => {
                const ruta = enlace.getAttribute("href").split(/[?#]/)[0].split("/").pop();
                const grupo = enlace.dataset.pmoAdministracion==='true'?grupos[2]:grupos.find(g => g.rutas.includes(ruta));
                if (grupo && enlace.parentNode !== grupo.details) grupo.details.appendChild(enlace);
                enlace.classList.toggle("active", ruta === pagina);
                if (ruta === pagina) {
                    if (enlace.getAttribute("aria-current") !== "page") enlace.setAttribute("aria-current", "page");
                    if (grupo) grupo.details.open = true;
                } else enlace.removeAttribute("aria-current");
            });
            filtrar();
            organizando = false;
        }
        function filtrar() {
            expedientesAdmin.hidden=!window.PMOPermisos.esAdministradorReal();
            const usuario = obtenerUsuarioActivoGlobal();
            const correo = String(usuario?.correo || usuario?.email || "").trim().toLowerCase();
            if (correo && busqueda.value.trim().toLowerCase() === correo) busqueda.value = "";
            const texto = normalizar(busqueda.value.trim());
            let visibles = 0;
            menu.querySelectorAll("a[href]").forEach(a => {
                const coincide = !texto || normalizar(a.textContent).includes(texto);
                if (!coincide && !a.hasAttribute("data-pmo-busqueda-oculto")) a.setAttribute("data-pmo-busqueda-oculto", "true");
                if (coincide) a.removeAttribute("data-pmo-busqueda-oculto");
                if (coincide && !a.hidden && getComputedStyle(a).display !== "none") visibles++;
            });
            grupos.forEach(g => {
                if (texto) g.details.removeAttribute("name");
                else g.details.setAttribute("name", "pmo-menu-extras");
                const oculto = !Array.from(g.details.querySelectorAll("a")).some(a =>
                    !a.hidden && !a.hasAttribute("data-pmo-busqueda-oculto") && getComputedStyle(a).display !== "none");
                if (g.details.hidden !== oculto) g.details.hidden = oculto;
                if (texto && !g.details.hidden) g.details.open = true;
                if (!texto) g.details.open = !!g.details.querySelector('a[aria-current="page"]');
            });
            if (aviso.hidden !== (visibles > 0)) aviso.hidden = visibles > 0;
        }
        busqueda.addEventListener("input", filtrar);
        busqueda.addEventListener("change", filtrar);
        busqueda.addEventListener("keydown", e => {
            if (e.key === "Escape") { busqueda.value = ""; filtrar(); }
            if (e.key === "Enter") {
                const enlace = Array.from(menu.querySelectorAll("a[href]")).find(a =>
                    !a.hidden && !a.hasAttribute("data-pmo-busqueda-oculto") && getComputedStyle(a).display !== "none");
                if (enlace) enlace.click();
            }
        });
        window.addEventListener("pageshow", filtrar);
        organizar();
        setTimeout(organizar, 500);
        setTimeout(filtrar, 1500);
        let pendiente = false;
        new MutationObserver(registros => {
            if (!registros.some(r => r.type === "attributes" || Array.from(r.addedNodes).some(n =>
                n.nodeType === 1 && (n.matches("a") || n.querySelector?.("a"))))) return;
            if (!pendiente) { pendiente = true; requestAnimationFrame(() => { pendiente = false; organizar(); }); }
        }).observe(menu, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "hidden"] });
    });
    const sidebar = document.querySelector(".sidebar");
    if (sidebar && !document.getElementById("pmo-menu-movil")) {
        const movil = document.createElement("div"); movil.className = "pmo-mobile-bar";
        movil.innerHTML = '<span>JJM <b>ProjectSphere</b></span><button id="pmo-menu-movil" type="button" aria-expanded="false" aria-label="Abrir menú de navegación">☰ Menú</button>';
        document.body.prepend(movil);
        const boton = movil.querySelector("button");
        boton.addEventListener("click", () => {
            const abierto = document.body.classList.toggle("pmo-menu-abierto");
            boton.setAttribute("aria-expanded", String(abierto));
            boton.setAttribute("aria-label", abierto ? "Cerrar menú de navegación" : "Abrir menú de navegación");
        });
    }
});
