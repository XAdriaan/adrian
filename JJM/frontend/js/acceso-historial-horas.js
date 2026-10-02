const API_MIEMBROS_HISTORIAL =
    window.apiUrl("/api/miembros");

let usuarioSesionHistorial = null;
let miembrosHistorial = [];

/* =========================================================
   ELEMENTOS
========================================================= */

const btnVerMiHistorial =
    document.getElementById("btnVerMiHistorial");

const btnConsultarHistorial =
    document.getElementById("btnConsultarHistorial");

/* =========================================================
   INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    usuarioSesionHistorial = obtenerUsuarioSesionHistorial();

    configurarBotonesHistorial();
    configurarVistaSegunRol();
});

/* =========================================================
   SESIÓN Y ROL
========================================================= */

function obtenerUsuarioSesionHistorial() {
    try {
        return JSON.parse(
            localStorage.getItem("usuarioActivo")
        ) || null;
    } catch (error) {
        console.error(
            "No fue posible leer la sesión:",
            error
        );

        return null;
    }
}

function obtenerIdUsuarioSesionHistorial() {
    if (!usuarioSesionHistorial) {
        return null;
    }

    return usuarioSesionHistorial.id ||
        usuarioSesionHistorial.idUsuario ||
        null;
}

function obtenerRolSesionHistorial() {
    if (!usuarioSesionHistorial) {
        return "";
    }

    if (
        usuarioSesionHistorial.rol &&
        typeof usuarioSesionHistorial.rol === "object"
    ) {
        return usuarioSesionHistorial.rol.nombre || "";
    }

    return usuarioSesionHistorial.rol ||
        usuarioSesionHistorial.rolNombre ||
        "";
}

function esAdministradorHistorial() {
    return String(obtenerRolSesionHistorial())
        .trim()
        .toLowerCase() === "administrador";
}

function obtenerHeadersHistorial() {
    const idUsuario =
        obtenerIdUsuarioSesionHistorial();

    if (!idUsuario) {
        return {};
    }

    return {
        "X-Usuario-Id": String(idUsuario)
    };
}

/* =========================================================
   INTERFAZ POR ROL
========================================================= */

function configurarVistaSegunRol() {
    if (esAdministradorHistorial()) {
        if (btnVerMiHistorial) {
            btnVerMiHistorial.textContent =
                "🕘 Ver mi historial";
        }

        if (btnConsultarHistorial) {
            btnConsultarHistorial.style.display =
                "inline-flex";
        }

        return;
    }

    if (btnConsultarHistorial) {
        btnConsultarHistorial.style.display =
            "none";
    }
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarBotonesHistorial() {
    if (btnVerMiHistorial) {
        btnVerMiHistorial.addEventListener(
            "click",
            abrirMiHistorial
        );
    }

    if (btnConsultarHistorial) {
        btnConsultarHistorial.addEventListener(
            "click",
            consultarHistorialAdministrador
        );
    }
}

/* =========================================================
   HISTORIAL PROPIO
========================================================= */

async function abrirMiHistorial() {
    const botonOriginal = btnVerMiHistorial
        ? btnVerMiHistorial.textContent
        : "";

    cambiarEstadoBotonHistorial(
        btnVerMiHistorial,
        true,
        "Buscando historial..."
    );

    try {
        const miembroActual =
            await obtenerMiembroSesionActual();

        if (!miembroActual) {
            throw new Error(
                "No se encontró un integrante asociado a esta sesión."
            );
        }

        const idMiembro =
            miembroActual.id ||
            miembroActual.idMiembro;

        if (!idMiembro) {
            throw new Error(
                "No se encontró el identificador del integrante."
            );
        }

        window.location.href =
            `detalle-miembro-horas.html?id=${encodeURIComponent(idMiembro)}`;

    } catch (error) {
        console.error(
            "Error al abrir historial propio:",
            error
        );

        alert(
            error.message ||
            "No fue posible abrir tu historial de horas."
        );

        cambiarEstadoBotonHistorial(
            btnVerMiHistorial,
            false,
            botonOriginal
        );
    }
}

/* =========================================================
   CONSULTA PARA ADMINISTRADOR
========================================================= */

async function consultarHistorialAdministrador() {
    if (!esAdministradorHistorial()) {
        alert(
            "Solo un administrador puede consultar historiales de otros integrantes."
        );
        return;
    }

    const botonOriginal = btnConsultarHistorial
        ? btnConsultarHistorial.textContent
        : "";

    cambiarEstadoBotonHistorial(
        btnConsultarHistorial,
        true,
        "Cargando integrantes..."
    );

    try {
        const miembros = await cargarMiembrosHistorial();

        if (miembros.length === 0) {
            throw new Error(
                "No hay integrantes disponibles para consultar."
            );
        }

        const opciones = miembros
            .filter(function (miembro) {
                return String(miembro.estado || "")
                    .trim()
                    .toLowerCase() === "activo";
            })
            .map(function (miembro, indice) {
                const nombre =
                    miembro.nombreCompleto ||
                    miembro.nombre ||
                    "Integrante sin nombre";

                const correo =
                    miembro.correo ||
                    "Sin correo";

                return (
                    `${indice + 1}. ${nombre} · ${correo}`
                );
            });

        if (opciones.length === 0) {
            throw new Error(
                "No hay integrantes activos disponibles."
            );
        }

        const textoSeleccion = [
            "Escribe el número del integrante cuyo historial deseas consultar:",
            "",
            ...opciones
        ].join("\n");

        const respuesta = prompt(textoSeleccion);

        if (
            respuesta === null ||
            String(respuesta).trim() === ""
        ) {
            return;
        }

        const numeroSeleccionado =
            Number(respuesta);

        if (
            Number.isNaN(numeroSeleccionado) ||
            numeroSeleccionado < 1 ||
            numeroSeleccionado > opciones.length
        ) {
            throw new Error(
                "Selecciona un número válido de la lista."
            );
        }

        const miembrosActivos = miembros.filter(
            function (miembro) {
                return String(miembro.estado || "")
                    .trim()
                    .toLowerCase() === "activo";
            }
        );

        const miembroSeleccionado =
            miembrosActivos[numeroSeleccionado - 1];

        const idMiembro =
            miembroSeleccionado.id ||
            miembroSeleccionado.idMiembro;

        window.location.href =
            `detalle-miembro-horas.html?id=${encodeURIComponent(idMiembro)}`;

    } catch (error) {
        console.error(
            "Error al consultar historial:",
            error
        );

        alert(
            error.message ||
            "No fue posible consultar el historial del integrante."
        );
    } finally {
        cambiarEstadoBotonHistorial(
            btnConsultarHistorial,
            false,
            botonOriginal
        );
    }
}

/* =========================================================
   OBTENER MIEMBROS
========================================================= */

async function obtenerMiembroSesionActual() {
    const idUsuarioActual =
        obtenerIdUsuarioSesionHistorial();

    if (!idUsuarioActual) {
        throw new Error(
            "No se encontró una sesión válida. Cierra sesión e inicia nuevamente."
        );
    }

    const miembros =
        await cargarMiembrosHistorial();

    return miembros.find(function (miembro) {
        const idUsuarioMiembro =
            miembro.idUsuario ||
            miembro.usuarioId ||
            miembro.usuario?.id ||
            miembro.usuario?.idUsuario ||
            "";

        return String(idUsuarioMiembro) ===
            String(idUsuarioActual);
    }) || null;
}

async function cargarMiembrosHistorial() {
    if (miembrosHistorial.length > 0) {
        return miembrosHistorial;
    }

    const respuesta = await fetch(
        API_MIEMBROS_HISTORIAL,
        {
            headers: obtenerHeadersHistorial()
        }
    );

    const datos = await obtenerRespuestaJSONHistorial(
        respuesta
    );

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje ||
            "No fue posible cargar los integrantes."
        );
    }

    miembrosHistorial = Array.isArray(datos.miembros)
        ? datos.miembros
        : [];

    return miembrosHistorial;
}

/* =========================================================
   UTILIDADES
========================================================= */

function cambiarEstadoBotonHistorial(
    boton,
    deshabilitado,
    texto
) {
    if (!boton) {
        return;
    }

    boton.disabled = deshabilitado;
    boton.textContent = texto;
}

async function obtenerRespuestaJSONHistorial(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}