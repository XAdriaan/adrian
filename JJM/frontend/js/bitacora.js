const API_BITACORA = window.apiUrl("/api/bitacora");
const API_MIEMBROS = window.apiUrl("/api/miembros");

let usuarioActivo = obtenerUsuarioActivo();
let registrosBitacora = [];

const contenidoBitacora = document.getElementById("contenidoBitacora");
const mensajeAcceso = document.getElementById("mensajeAcceso");
const indicadorRol = document.getElementById("indicadorRol");
const tablaBitacora = document.getElementById("tablaBitacora");
const textoResultado = document.getElementById("textoResultado");

const filtroUsuario = document.getElementById("filtroUsuario");
const filtroModulo = document.getElementById("filtroModulo");
const filtroAccion = document.getElementById("filtroAccion");
const fechaInicio = document.getElementById("fechaInicio");
const fechaFin = document.getElementById("fechaFin");

const btnActualizar = document.getElementById("btnActualizar");
const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");

const modalDetalle = document.getElementById("modalDetalle");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const detalleSubtitulo = document.getElementById("detalleSubtitulo");
const detalleAnterior = document.getElementById("detalleAnterior");
const detalleNuevo = document.getElementById("detalleNuevo");

document.addEventListener("DOMContentLoaded", async function () {
    usuarioActivo = obtenerUsuarioActivo();

    configurarEventos();
    configurarAcceso();

    if (!esAdministrador()) {
        return;
    }

    await cargarUsuariosFiltro();
    await cargarBitacora();
});

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    if (btnActualizar) {
        btnActualizar.addEventListener("click", cargarBitacora);
    }

    if (btnAplicarFiltros) {
        btnAplicarFiltros.addEventListener("click", cargarBitacora);
    }

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener("click", limpiarFiltros);
    }

    if (btnCerrarModal) {
        btnCerrarModal.addEventListener("click", cerrarModal);
    }

    if (modalDetalle) {
        modalDetalle.addEventListener("click", function (event) {
            if (event.target === modalDetalle) {
                cerrarModal();
            }
        });
    }
}

/* =========================================================
   SESIÓN Y PERMISOS
========================================================= */

function obtenerUsuarioActivo() {
    try {
        return JSON.parse(localStorage.getItem("usuarioActivo")) || null;
    } catch (error) {
        console.error("No fue posible leer la sesión activa:", error);
        return null;
    }
}

function obtenerIdUsuario() {
    if (!usuarioActivo) {
        return null;
    }

    return usuarioActivo.id ||
        usuarioActivo.idUsuario ||
        usuarioActivo.id_usuario ||
        null;
}

function obtenerRol() {
    if (!usuarioActivo) {
        return "";
    }

    if (
        usuarioActivo.rol &&
        typeof usuarioActivo.rol === "object"
    ) {
        return usuarioActivo.rol.nombre || "";
    }

    return usuarioActivo.rol ||
        usuarioActivo.rolNombre ||
        usuarioActivo.nombreRol ||
        "";
}

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function esAdministrador() {
    if (window.PMOPermisos && window.PMOPermisos.tiene("bitacora.ver")) return true;

    const rol = normalizarTextoCompatibilidadPermisos(obtenerRolCompatibilidadPermisos());
    return rol === "superadministrador" || rol === "administrador" || rol === "admin pmo" || rol === "admin_pmo" || rol === "administrador pmo";
}
function obtenerRolCompatibilidadPermisos() {
    try {
        const usuario = JSON.parse(localStorage.getItem("usuarioActivo") || "null") || {};
        return usuario.rol?.nombre || usuario.rol || usuario.rolNombre || usuario.nombreRol || "";
    } catch (e) { return ""; }
}

function normalizarTextoCompatibilidadPermisos(valor) {
    return String(valor || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


function headersSesion() {
    const id = obtenerIdUsuario();

    if (!id) {
        return {};
    }

    return {
        "X-Usuario-Id": String(id)
    };
}

function configurarAcceso() {
    if (!usuarioActivo) {
        if (indicadorRol) {
            indicadorRol.textContent = "Sin sesión";
            indicadorRol.className = "role-indicator restricted";
        }

        if (contenidoBitacora) {
            contenidoBitacora.style.display = "none";
        }

        if (mensajeAcceso) {
            mensajeAcceso.style.display = "flex";
        }

        if (btnActualizar) {
            btnActualizar.style.display = "none";
        }

        return;
    }

    if (esAdministrador()) {
        if (indicadorRol) {
            indicadorRol.textContent = "Administrador";
            indicadorRol.className = "role-indicator admin";
        }

        if (contenidoBitacora) {
            contenidoBitacora.style.display = "block";
        }

        if (mensajeAcceso) {
            mensajeAcceso.style.display = "none";
        }

        if (btnActualizar) {
            btnActualizar.style.display = "inline-flex";
        }

        return;
    }

    if (indicadorRol) {
        indicadorRol.textContent = "Acceso restringido";
        indicadorRol.className = "role-indicator restricted";
    }

    if (contenidoBitacora) {
        contenidoBitacora.style.display = "none";
    }

    if (mensajeAcceso) {
        mensajeAcceso.style.display = "flex";
    }

    if (btnActualizar) {
        btnActualizar.style.display = "none";
    }
}

/* =========================================================
   CARGA DE USUARIOS PARA FILTRO
========================================================= */

async function cargarUsuariosFiltro() {
    if (!esAdministrador() || !filtroUsuario) {
        return;
    }

    try {
        const respuesta = await fetch(
            API_MIEMBROS,
            {
                headers: headersSesion()
            }
        );

        const datos = await obtenerJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar usuarios para el filtro."
            );
        }

        const miembros = Array.isArray(datos.miembros)
            ? datos.miembros
            : [];

        filtroUsuario.innerHTML = `
            <option value="">Todos los usuarios</option>
        `;

        miembros.forEach(function (miembro) {
            const idUsuario =
                miembro.idUsuario ||
                miembro.usuarioId ||
                miembro.id_usuario ||
                miembro.usuario?.id ||
                miembro.usuario?.idUsuario ||
                null;

            if (!idUsuario) {
                return;
            }

            const option = document.createElement("option");

            option.value = idUsuario;
            option.textContent =
                miembro.nombreCompleto ||
                miembro.nombre ||
                `Usuario #${idUsuario}`;

            filtroUsuario.appendChild(option);
        });

    } catch (error) {
        console.warn("No fue posible cargar usuarios para filtro.", error);
    }
}

/* =========================================================
   CARGA DE BITÁCORA
========================================================= */

async function cargarBitacora() {
    if (!esAdministrador()) {
        return;
    }

    if (
        fechaInicio &&
        fechaFin &&
        fechaInicio.value &&
        fechaFin.value &&
        fechaInicio.value > fechaFin.value
    ) {
        alert("La fecha inicial no puede ser posterior a la fecha final.");
        return;
    }

    cambiarBoton(true, "Actualizando...");

    try {
        const params = new URLSearchParams();

        if (filtroUsuario && filtroUsuario.value) {
            params.set("idUsuario", filtroUsuario.value);
        }

        if (filtroModulo && filtroModulo.value) {
            params.set("modulo", filtroModulo.value);
        }

        if (filtroAccion && filtroAccion.value) {
            params.set("accion", filtroAccion.value);
        }

        if (fechaInicio && fechaInicio.value) {
            params.set("fechaInicio", fechaInicio.value);
        }

        if (fechaFin && fechaFin.value) {
            params.set("fechaFin", fechaFin.value);
        }

        const url = params.toString()
            ? `${API_BITACORA}?${params.toString()}`
            : API_BITACORA;

        const respuesta = await fetch(
            url,
            {
                headers: headersSesion()
            }
        );

        const datos = await obtenerJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible consultar la bitácora."
            );
        }

        registrosBitacora = Array.isArray(datos.registros)
            ? datos.registros
            : [];

        actualizarResumen();
        renderizarTabla();

    } catch (error) {
        console.error("Error al cargar bitácora:", error);

        if (tablaBitacora) {
            tablaBitacora.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-row">
                        ${escaparHTML(
                            error.message ||
                            "No fue posible cargar la bitácora."
                        )}
                    </td>
                </tr>
            `;
        }

        if (textoResultado) {
            textoResultado.textContent =
                "No fue posible consultar los movimientos.";
        }

    } finally {
        cambiarBoton(false, "↻ Actualizar");
    }
}

function limpiarFiltros() {
    if (filtroUsuario) filtroUsuario.value = "";
    if (filtroModulo) filtroModulo.value = "";
    if (filtroAccion) filtroAccion.value = "";
    if (fechaInicio) fechaInicio.value = "";
    if (fechaFin) fechaFin.value = "";

    cargarBitacora();
}

/* =========================================================
   RESUMEN
========================================================= */

function actualizarResumen() {
    const hoy = fechaLocalHoy();

    const usuarios = new Set(
        registrosBitacora
            .map(function (registro) {
                return registro.idUsuario;
            })
            .filter(Boolean)
    );

    const modulos = new Set(
        registrosBitacora
            .map(function (registro) {
                return registro.modulo;
            })
            .filter(Boolean)
    );

    const hoyEventos = registrosBitacora.filter(function (registro) {
        return String(registro.fechaCreacion || "").slice(0, 10) === hoy;
    }).length;

    asignarTexto("totalEventos", registrosBitacora.length);
    asignarTexto("eventosHoy", hoyEventos);
    asignarTexto("usuariosActivos", usuarios.size);
    asignarTexto("modulosActivos", modulos.size);
}

/* =========================================================
   TABLA
========================================================= */

function renderizarTabla() {
    if (!tablaBitacora) {
        return;
    }

    if (textoResultado) {
        textoResultado.textContent =
            `${registrosBitacora.length} ${
                registrosBitacora.length === 1
                    ? "movimiento encontrado"
                    : "movimientos encontrados"
            }.`;
    }

    if (!registrosBitacora.length) {
        tablaBitacora.innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">
                    No hay movimientos para los filtros seleccionados.
                </td>
            </tr>
        `;
        return;
    }

    tablaBitacora.innerHTML = registrosBitacora.map(function (registro, indice) {
        const elemento = registro.tipoEntidad
            ? `${registro.tipoEntidad}${registro.idEntidad ? ` #${registro.idEntidad}` : ""}`
            : "—";

        return `
            <tr>
                <td>${escaparHTML(formatearFechaHora(registro.fechaCreacion))}</td>

                <td>
                    <strong>${escaparHTML(registro.usuarioNombre || "Sistema")}</strong>
                    <small>${escaparHTML(registro.usuarioCorreo || "")}</small>
                </td>

                <td>
                    <span class="badge module">
                        ${escaparHTML(registro.modulo || "—")}
                    </span>
                </td>

                <td>
                    <span class="badge action">
                        ${escaparHTML(formatearAccion(registro.accion))}
                    </span>
                </td>

                <td>${escaparHTML(elemento)}</td>

                <td class="description">
                    ${escaparHTML(registro.descripcion || "—")}
                </td>

                <td>
                    <button
                        type="button"
                        class="btn-detail"
                        onclick="verDetalle(${indice})">
                        Ver detalle
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function verDetalle(indice) {
    const registro = registrosBitacora[indice];

    if (!registro) {
        return;
    }

    if (detalleSubtitulo) {
        detalleSubtitulo.textContent =
            `${registro.modulo || "Módulo"} · ` +
            `${formatearAccion(registro.accion)} · ` +
            `${formatearFechaHora(registro.fechaCreacion)}`;
    }

    if (detalleAnterior) {
        detalleAnterior.textContent =
            registro.datosAnteriores ||
            "Sin datos anteriores.";
    }

    if (detalleNuevo) {
        detalleNuevo.textContent =
            registro.datosNuevos ||
            "Sin datos nuevos.";
    }

    if (modalDetalle) {
        modalDetalle.classList.add("show");
    }
}

function cerrarModal() {
    if (modalDetalle) {
        modalDetalle.classList.remove("show");
    }
}

/* =========================================================
   UTILIDADES
========================================================= */

function formatearAccion(accion) {
    return String(accion || "—")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, function (letra) {
            return letra.toUpperCase();
        });
}

function formatearFechaHora(fecha) {
    if (!fecha) {
        return "—";
    }

    const fechaObjeto = new Date(fecha);

    if (Number.isNaN(fechaObjeto.getTime())) {
        return String(fecha).replace("T", " ");
    }

    return fechaObjeto.toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function fechaLocalHoy() {
    const fecha = new Date();

    return `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
    ).padStart(2, "0")}-${String(
        fecha.getDate()
    ).padStart(2, "0")}`;
}

function asignarTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}

function cambiarBoton(deshabilitado, texto) {
    if (!btnActualizar) {
        return;
    }

    btnActualizar.disabled = deshabilitado;
    btnActualizar.textContent = texto;
}

async function obtenerJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}