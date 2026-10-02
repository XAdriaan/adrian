const API_ORGANIZACIONES = window.apiUrl("/api/organizaciones");

let organizaciones = [];
let usuarioActivo = obtenerUsuarioActivo();

const tablaOrganizaciones = document.getElementById("tablaOrganizaciones");
const buscarOrganizacion = document.getElementById("buscarOrganizacion");
const permisoOrganizaciones = document.getElementById("permisoOrganizaciones");

const btnNuevaOrganizacion = document.getElementById("btnNuevaOrganizacion");
const btnExportar = document.getElementById("btnExportar");

const modalOrganizacion = document.getElementById("modalOrganizacion");
const modalDetalle = document.getElementById("modalDetalle");

const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelar = document.getElementById("btnCancelar");
const btnCerrarDetalle = document.getElementById("btnCerrarDetalle");

const formOrganizacion = document.getElementById("formOrganizacion");
const tituloModal = document.getElementById("tituloModal");
const btnGuardarOrganizacion = document.getElementById("btnGuardarOrganizacion");

const idOrganizacion = document.getElementById("idOrganizacion");
const nombreOrganizacion = document.getElementById("nombreOrganizacion");
const tipoOrganizacion = document.getElementById("tipoOrganizacion");
const estadoConvenio = document.getElementById("estadoConvenio");
const nombreContacto = document.getElementById("nombreContacto");
const emailContacto = document.getElementById("emailContacto");
const telefonoContacto = document.getElementById("telefonoContacto");
const fechaInicioConvenio = document.getElementById("fechaInicioConvenio");
const fechaFinConvenio = document.getElementById("fechaFinConvenio");
const notasOrganizacion = document.getElementById("notasOrganizacion");

const detalleOrganizacion = document.getElementById("detalleOrganizacion");

document.addEventListener("DOMContentLoaded", function () {
    usuarioActivo = obtenerUsuarioActivo();

    configurarEventos();
    configurarPermisosVisuales();
    cargarOrganizacionesDesdeAPI();
});

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    if (btnNuevaOrganizacion) {
        btnNuevaOrganizacion.addEventListener(
            "click",
            abrirModalNuevaOrganizacion
        );
    }

    if (btnExportar) {
        btnExportar.addEventListener("click", exportarCSV);
    }

    if (btnCerrarModal) {
        btnCerrarModal.addEventListener("click", cerrarModal);
    }

    if (btnCancelar) {
        btnCancelar.addEventListener("click", cerrarModal);
    }

    if (btnCerrarDetalle) {
        btnCerrarDetalle.addEventListener("click", cerrarDetalle);
    }

    if (buscarOrganizacion) {
        buscarOrganizacion.addEventListener(
            "input",
            mostrarOrganizaciones
        );
    }

    if (modalOrganizacion) {
        modalOrganizacion.addEventListener("click", function (event) {
            if (event.target === modalOrganizacion) {
                cerrarModal();
            }
        });
    }

    if (modalDetalle) {
        modalDetalle.addEventListener("click", function (event) {
            if (event.target === modalDetalle) {
                cerrarDetalle();
            }
        });
    }

    if (formOrganizacion) {
        formOrganizacion.addEventListener("submit", function (event) {
            event.preventDefault();
            guardarOrganizacion();
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

function obtenerIdUsuarioActivo() {
    if (!usuarioActivo) {
        return null;
    }

    return usuarioActivo.id ||
        usuarioActivo.idUsuario ||
        usuarioActivo.id_usuario ||
        null;
}

function obtenerNombreRolUsuario() {
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
    if (window.PMOPermisos && window.PMOPermisos.tiene("organizaciones.ver")) return true;

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


function puedeGestionarOrganizaciones() {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene("organizaciones.gestionar"));
}

function obtenerHeadersSesion() {
    const idUsuario = obtenerIdUsuarioActivo();

    if (!idUsuario) {
        return {};
    }

    return {
        "X-Usuario-Id": String(idUsuario)
    };
}

function configurarPermisosVisuales() {
    if (btnNuevaOrganizacion) {
        btnNuevaOrganizacion.style.display = puedeGestionarOrganizaciones()
            ? "inline-block"
            : "none";
    }

    if (btnExportar) {
        btnExportar.style.display = esAdministrador()
            ? "inline-block"
            : "none";
    }

    if (!permisoOrganizaciones) {
        return;
    }

    if (!usuarioActivo) {
        permisoOrganizaciones.innerHTML = `
            <span class="permission-readonly">
                No hay una sesión activa. Inicia sesión nuevamente.
            </span>
        `;
        return;
    }

    if (esAdministrador()) {
        permisoOrganizaciones.innerHTML = `
            <span class="permission-admin">
                Acceso de gestión: puedes consultar organizaciones.${puedeGestionarOrganizaciones() ? " También puedes registrar y editar." : " Modo solo lectura."}
            </span>
        `;
    } else {
        permisoOrganizaciones.innerHTML = `
            <span class="permission-readonly">
                Este módulo está disponible únicamente para administradores.
            </span>
        `;
    }
}

/* =========================================================
   CARGAR ORGANIZACIONES DESDE MYSQL
========================================================= */

async function cargarOrganizacionesDesdeAPI() {
    mostrarCargando();

    if (!usuarioActivo) {
        mostrarErrorCarga(
            "No se encontró una sesión activa. Cierra sesión e inicia nuevamente."
        );
        return;
    }

    if (!esAdministrador()) {
        organizaciones = [];

        mostrarErrorCarga(
            "No tienes permiso para consultar el catálogo global de organizaciones."
        );

        return;
    }

    try {
        const respuesta = await fetch(
            API_ORGANIZACIONES,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar las organizaciones."
            );
        }

        organizaciones = Array.isArray(datos.organizaciones)
            ? datos.organizaciones.map(normalizarOrganizacion)
            : [];

        guardarCacheCompatible();
        mostrarOrganizaciones();

    } catch (error) {
        console.error("Error al cargar organizaciones:", error);

        mostrarErrorCarga(
            error.message ||
            "No fue posible cargar las organizaciones desde MySQL. Verifica que Apache, MySQL y Spring Boot estén activos."
        );
    }
}

function normalizarOrganizacion(organizacion) {
    return {
        id: organizacion.id,

        nombre: organizacion.nombre || "",
        tipo: organizacion.tipo || "Empresa",

        estado: organizacion.estadoConvenio || "Sin convenio",
        estadoConvenio: organizacion.estadoConvenio || "Sin convenio",

        contacto: organizacion.contacto || "",
        correo: organizacion.correo || "",
        email: organizacion.correo || "",

        telefono: organizacion.telefono || "",

        fechaInicioConvenio: organizacion.fechaInicioConvenio || "",
        fechaFinConvenio: organizacion.fechaFinConvenio || "",

        notas: organizacion.notas || "",
        fechaCreacion: organizacion.fechaCreacion || ""
    };
}

function guardarCacheCompatible() {
    localStorage.setItem(
        "organizaciones",
        JSON.stringify(organizaciones)
    );
}

/* =========================================================
   MOSTRAR TABLA
========================================================= */

function mostrarCargando() {
    if (!tablaOrganizaciones) {
        return;
    }

    tablaOrganizaciones.innerHTML = `
        <tr>
            <td colspan="7" class="empty-table">
                Cargando organizaciones desde MySQL...
            </td>
        </tr>
    `;
}

function mostrarErrorCarga(mensaje) {
    if (!tablaOrganizaciones) {
        return;
    }

    tablaOrganizaciones.innerHTML = `
        <tr>
            <td colspan="7" class="empty-table">
                ${escaparHTML(mensaje)}
            </td>
        </tr>
    `;
}

function mostrarOrganizaciones() {
    if (!tablaOrganizaciones) {
        console.error(
            "No se encontró #tablaOrganizaciones en organizaciones.html."
        );
        return;
    }

    tablaOrganizaciones.innerHTML = "";

    const textoBusqueda = buscarOrganizacion
        ? buscarOrganizacion.value.trim().toLowerCase()
        : "";

    const filtradas = organizaciones.filter(function (organizacion) {
        return (
            String(organizacion.nombre || "")
                .toLowerCase()
                .includes(textoBusqueda) ||

            String(organizacion.tipo || "")
                .toLowerCase()
                .includes(textoBusqueda) ||

            String(organizacion.contacto || "")
                .toLowerCase()
                .includes(textoBusqueda) ||

            String(organizacion.correo || "")
                .toLowerCase()
                .includes(textoBusqueda) ||

            String(organizacion.estadoConvenio || "")
                .toLowerCase()
                .includes(textoBusqueda)
        );
    });

    if (filtradas.length === 0) {
        tablaOrganizaciones.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    No hay organizaciones registradas.
                </td>
            </tr>
        `;
        return;
    }

    filtradas.forEach(function (organizacion) {
        const fila = document.createElement("tr");

        const botonEditar = puedeGestionarOrganizaciones()
            ? `
                <button
                    type="button"
                    onclick="editarOrganizacion(${organizacion.id})"
                    title="Editar organización">
                    ✏
                </button>
              `
            : "";

        fila.innerHTML = `
            <td>
                <div class="org-name">
                    <div class="org-icon">
                        ${obtenerIconoOrganizacion(organizacion.tipo)}
                    </div>
                    <span>${escaparHTML(organizacion.nombre)}</span>
                </div>
            </td>

            <td>
                <span class="badge blue">
                    ${escaparHTML(organizacion.tipo)}
                </span>
            </td>

            <td>
                <span class="badge ${obtenerColorConvenio(organizacion.estadoConvenio)}">
                    ${escaparHTML(organizacion.estadoConvenio)}
                </span>
            </td>

            <td>${escaparHTML(organizacion.contacto || "—")}</td>
            <td>${escaparHTML(organizacion.correo || "—")}</td>
            <td>${escaparHTML(organizacion.telefono || "—")}</td>

            <td class="text-right">
                <div class="action-buttons">
                    <button
                        type="button"
                        onclick="verDetalle(${organizacion.id})"
                        title="Ver detalle">
                        👁
                    </button>

                    ${botonEditar}
                </div>
            </td>
        `;

        tablaOrganizaciones.appendChild(fila);
    });
}

/* =========================================================
   CREAR Y EDITAR - SOLO ADMINISTRADOR
========================================================= */

function abrirModalNuevaOrganizacion() {
    if (!puedeGestionarOrganizaciones()) {
        alert("Solo un administrador puede crear organizaciones.");
        return;
    }

    if (tituloModal) {
        tituloModal.textContent = "Nueva Organización";
    }

    if (formOrganizacion) {
        formOrganizacion.reset();
    }

    if (idOrganizacion) {
        idOrganizacion.value = "";
    }

    if (tipoOrganizacion) {
        tipoOrganizacion.value = "Empresa";
    }

    if (estadoConvenio) {
        estadoConvenio.value = "Sin convenio";
    }

    if (modalOrganizacion) {
        modalOrganizacion.classList.add("show");
    }
}

function editarOrganizacion(id) {
    if (!puedeGestionarOrganizaciones()) {
        alert("Solo un administrador puede editar organizaciones.");
        return;
    }

    const organizacion = organizaciones.find(function (item) {
        return String(item.id) === String(id);
    });

    if (!organizacion) {
        alert("No se encontró la organización seleccionada.");
        return;
    }

    if (tituloModal) {
        tituloModal.textContent = "Editar Organización";
    }

    if (idOrganizacion) {
        idOrganizacion.value = organizacion.id;
    }

    if (nombreOrganizacion) {
        nombreOrganizacion.value = organizacion.nombre || "";
    }

    if (tipoOrganizacion) {
        tipoOrganizacion.value = organizacion.tipo || "Empresa";
    }

    if (estadoConvenio) {
        estadoConvenio.value =
            organizacion.estadoConvenio || "Sin convenio";
    }

    if (nombreContacto) {
        nombreContacto.value = organizacion.contacto || "";
    }

    if (emailContacto) {
        emailContacto.value = organizacion.correo || "";
    }

    if (telefonoContacto) {
        telefonoContacto.value = organizacion.telefono || "";
    }

    if (fechaInicioConvenio) {
        fechaInicioConvenio.value =
            organizacion.fechaInicioConvenio || "";
    }

    if (fechaFinConvenio) {
        fechaFinConvenio.value =
            organizacion.fechaFinConvenio || "";
    }

    if (notasOrganizacion) {
        notasOrganizacion.value = organizacion.notas || "";
    }

    if (modalOrganizacion) {
        modalOrganizacion.classList.add("show");
    }
}

async function guardarOrganizacion() {
    if (!puedeGestionarOrganizaciones()) {
        alert("Solo un administrador puede guardar organizaciones.");
        return;
    }

    const nombre = nombreOrganizacion
        ? nombreOrganizacion.value.trim()
        : "";

    if (nombre === "") {
        alert("El nombre de la organización es obligatorio.");

        if (nombreOrganizacion) {
            nombreOrganizacion.focus();
        }

        return;
    }

    const inicio = fechaInicioConvenio
        ? fechaInicioConvenio.value
        : "";

    const fin = fechaFinConvenio
        ? fechaFinConvenio.value
        : "";

    if (inicio !== "" && fin !== "" && fin < inicio) {
        alert(
            "La fecha final del convenio no puede ser anterior a la fecha de inicio."
        );
        return;
    }

    const datosOrganizacion = {
        nombre: nombre,
        tipo: tipoOrganizacion ? tipoOrganizacion.value : "Empresa",
        estadoConvenio: estadoConvenio
            ? estadoConvenio.value
            : "Sin convenio",
        contacto: nombreContacto
            ? nombreContacto.value.trim()
            : "",
        correo: emailContacto
            ? emailContacto.value.trim()
            : "",
        telefono: telefonoContacto
            ? telefonoContacto.value.trim()
            : "",
        fechaInicioConvenio: inicio || null,
        fechaFinConvenio: fin || null,
        notas: notasOrganizacion
            ? notasOrganizacion.value.trim()
            : ""
    };

    const id = idOrganizacion ? idOrganizacion.value : "";
    const esEdicion = id !== "";

    const idUsuarioActivo = obtenerIdUsuarioActivo();

    if (!idUsuarioActivo) {
        alert(
            "No se encontró el identificador de tu sesión. Cierra sesión e inicia nuevamente."
        );
        return;
    }

    bloquearGuardar(true);

    try {
        const respuesta = await fetch(
            esEdicion
                ? `${API_ORGANIZACIONES}/${id}`
                : API_ORGANIZACIONES,
            {
                method: esEdicion ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Usuario-Id": String(idUsuarioActivo)
                },
                body: JSON.stringify(datosOrganizacion)
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible guardar la organización."
            );
        }

        cerrarModal();
        await cargarOrganizacionesDesdeAPI();

        alert(
            datos.mensaje ||
            "La organización se guardó correctamente."
        );

    } catch (error) {
        console.error("Error al guardar organización:", error);

        alert(
            error.message ||
            "Ocurrió un error al guardar la organización."
        );
    } finally {
        bloquearGuardar(false);
    }
}

function bloquearGuardar(estaBloqueado) {
    if (!btnGuardarOrganizacion) {
        return;
    }

    btnGuardarOrganizacion.disabled = estaBloqueado;

    btnGuardarOrganizacion.textContent = estaBloqueado
        ? "Guardando..."
        : "Guardar Organización";
}

function cerrarModal() {
    if (modalOrganizacion) {
        modalOrganizacion.classList.remove("show");
    }

    if (formOrganizacion) {
        formOrganizacion.reset();
    }

    if (idOrganizacion) {
        idOrganizacion.value = "";
    }
}

/* =========================================================
   DETALLE
========================================================= */

function verDetalle(id) {
    const organizacion = organizaciones.find(function (item) {
        return String(item.id) === String(id);
    });

    if (!organizacion || !detalleOrganizacion) {
        return;
    }

    detalleOrganizacion.innerHTML = `
        <div class="detail-card">
            <strong>Organización</strong>
            <span>${escaparHTML(organizacion.nombre)}</span>
        </div>

        <div class="detail-card">
            <strong>Tipo</strong>
            <span>${escaparHTML(organizacion.tipo)}</span>
        </div>

        <div class="detail-card">
            <strong>Estado del convenio</strong>
            <span>${escaparHTML(organizacion.estadoConvenio)}</span>
        </div>

        <div class="detail-card">
            <strong>Contacto</strong>
            <span>
                ${escaparHTML(
                    organizacion.contacto || "Sin contacto registrado"
                )}
            </span>
        </div>

        <div class="detail-card">
            <strong>Email</strong>
            <span>
                ${escaparHTML(
                    organizacion.correo || "Sin correo registrado"
                )}
            </span>
        </div>

        <div class="detail-card">
            <strong>Teléfono</strong>
            <span>
                ${escaparHTML(
                    organizacion.telefono || "Sin teléfono registrado"
                )}
            </span>
        </div>

        <div class="detail-card">
            <strong>Inicio del convenio</strong>
            <span>
                ${formatearFecha(
                    organizacion.fechaInicioConvenio,
                    "Sin fecha registrada"
                )}
            </span>
        </div>

        <div class="detail-card">
            <strong>Fin del convenio</strong>
            <span>
                ${formatearFecha(
                    organizacion.fechaFinConvenio,
                    "Sin fecha registrada"
                )}
            </span>
        </div>

        <div class="detail-card">
            <strong>Notas</strong>
            <span>
                ${escaparHTML(
                    organizacion.notas || "Sin notas registradas"
                )}
            </span>
        </div>
    `;

    if (modalDetalle) {
        modalDetalle.classList.add("show");
    }
}

function cerrarDetalle() {
    if (modalDetalle) {
        modalDetalle.classList.remove("show");
    }
}

/* =========================================================
   EXPORTACIÓN
========================================================= */

function exportarCSV() {
    if (!esAdministrador()) {
        alert("Solo un administrador puede exportar organizaciones.");
        return;
    }

    if (organizaciones.length === 0) {
        alert("No hay organizaciones para exportar.");
        return;
    }

    const encabezados = [
        "Nombre",
        "Tipo",
        "Estado Convenio",
        "Contacto",
        "Correo",
        "Teléfono",
        "Inicio Convenio",
        "Fin Convenio",
        "Notas"
    ];

    const filas = organizaciones.map(function (organizacion) {
        return [
            organizacion.nombre,
            organizacion.tipo,
            organizacion.estadoConvenio,
            organizacion.contacto,
            organizacion.correo,
            organizacion.telefono,
            organizacion.fechaInicioConvenio,
            organizacion.fechaFinConvenio,
            organizacion.notas
        ];
    });

    const contenidoCSV = [encabezados, ...filas]
        .map(function (fila) {
            return fila.map(function (valor) {
                const texto = String(valor || "").replace(/"/g, '""');
                return `"${texto}"`;
            }).join(",");
        })
        .join("\n");

    const blob = new Blob(
        ["\uFEFF" + contenidoCSV],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = "organizaciones.csv";

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    URL.revokeObjectURL(url);
}

/* =========================================================
   UTILIDADES
========================================================= */

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

function obtenerColorConvenio(estado) {
    if (estado === "Activo") {
        return "green";
    }

    if (estado === "Pendiente") {
        return "yellow";
    }

    if (estado === "Vencido") {
        return "red";
    }

    return "blue";
}

function obtenerIconoOrganizacion(tipo) {
    if (tipo === "Universidad") {
        return "🎓";
    }

    if (tipo === "Proveedor") {
        return "🚚";
    }

    if (tipo === "Cliente") {
        return "🤝";
    }

    if (tipo === "Otro") {
        return "🏛";
    }

    return "🏢";
}

function formatearFecha(fecha, valorPredeterminado) {
    if (!fecha) {
        return valorPredeterminado;
    }

    const partes = String(fecha).split("-");

    if (partes.length !== 3) {
        return escaparHTML(fecha);
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}