const API_PROYECTOS_AVANZADOS = window.apiUrl("/api/proyectos/avanzados");
const API_ORGANIZACIONES = window.apiUrl("/api/organizaciones");
const API_MIEMBROS = window.apiUrl("/api/miembros");

const FASES_BASE = [
    {
        numeroOrden: "1",
        nombre: "Levantamiento de requerimientos",
        subfases: []
    },
    {
        numeroOrden: "2",
        nombre: "Identificación de los requerimientos e infraestructura",
        subfases: []
    },
    {
        numeroOrden: "3",
        nombre: "Diseño",
        subfases: [
            "Desarrollo",
            "Pruebas",
            "Validación por parte del Cliente"
        ]
    },
    {
        numeroOrden: "4",
        nombre: "Implementación",
        subfases: [
            "Capacitación"
        ]
    },
    {
        numeroOrden: "5",
        nombre: "Documentación de la Solución Tecnológica",
        subfases: [
            "Manual de Usuario",
            "Manual Técnico",
            "Manual de Administrador",
            "Código Integral",
            "Código Ejecutable"
        ]
    },
    {
        numeroOrden: "6",
        nombre: "Evaluación y liberación por parte del cliente",
        subfases: []
    },
    {
        numeroOrden: "7",
        nombre: "Cierre",
        subfases: [
            "Lista de Chequeo de Cumplimiento"
        ]
    },
    {
        numeroOrden: "8",
        nombre: "Liberación de Carta de Término / Contestación Cuestionarios",
        subfases: [
            "F2",
            "F7",
            "F8"
        ]
    }
];

let usuarioActivo = obtenerUsuarioActivo();
let organizaciones = [];
let miembrosEquipo = [];
let proyectoCargado = null;

const formProyectoAvanzado = document.getElementById("formProyectoAvanzado");
const contenedorFases = document.getElementById("contenedorFases");

const permisoProyectoAvanzado = document.getElementById("permisoProyectoAvanzado");
const tituloPagina = document.getElementById("tituloPagina");

const idProyectoAvanzado = document.getElementById("idProyectoAvanzado");
const nombreProyecto = document.getElementById("nombreProyecto");
const codigoProyecto = document.getElementById("codigoProyecto");
const organizacionProyecto = document.getElementById("organizacionProyecto");
const descripcionProyecto = document.getElementById("descripcionProyecto");
const responsableProyecto = document.getElementById("responsableProyecto");
const prioridadProyecto = document.getElementById("prioridadProyecto");
const fechaInicio = document.getElementById("fechaInicio");
const fechaFin = document.getElementById("fechaFin");
const estadoProyecto = document.getElementById("estadoProyecto");
const clasificacionProyecto = document.getElementById("clasificacionProyecto");
const clienteArea = document.getElementById("clienteArea");
const avanceTexto = document.getElementById("avanceTexto");
const barraAvance = document.getElementById("barraAvance");
const observacionesProyecto = document.getElementById("observacionesProyecto");

const btnGuardarProyectoAvanzado = document.getElementById("btnGuardarProyectoAvanzado");
const btnCancelar = document.getElementById("btnCancelar");

document.addEventListener("DOMContentLoaded", async function () {
    usuarioActivo = obtenerUsuarioActivo();

    configurarPermisosVisuales();
    configurarEventos();

    if (esAdministrador()) {
        await Promise.all([
            cargarOrganizaciones(),
            cargarMiembros()
        ]);
    } else {
        organizaciones = [];
        miembrosEquipo = [];

        llenarSelectOrganizaciones();
        llenarSelectResponsables();
    }

    renderizarFases();

    const idProyecto = obtenerIdDesdeURL();

    if (idProyecto) {
        await cargarProyectoAvanzado(idProyecto);
    } else {
        actualizarAvanceVisual();
    }

    configurarPermisosVisuales();
});

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
    if (window.PMOPermisos && window.PMOPermisos.tiene("proyectos.avanzado")) return true;

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
    if (!permisoProyectoAvanzado) {
        return;
    }

    if (!usuarioActivo) {
        permisoProyectoAvanzado.innerHTML = `
            <span class="permission-readonly">
                No hay una sesión activa. Inicia sesión nuevamente.
            </span>
        `;

        bloquearFormulario();
        return;
    }

    if (esAdministrador()) {
        permisoProyectoAvanzado.innerHTML = `
            <span class="permission-admin">
                Modo administrador: puedes registrar y editar proyectos avanzados.
            </span>
        `;

        desbloquearFormulario();
    } else {
        permisoProyectoAvanzado.innerHTML = `
            <span class="permission-readonly">
                Modo consulta: solo un administrador puede registrar o editar proyectos avanzados.
            </span>
        `;

        bloquearFormulario();
    }
}

function bloquearFormulario() {
    const controles = document.querySelectorAll(
        "#formProyectoAvanzado input, " +
        "#formProyectoAvanzado select, " +
        "#formProyectoAvanzado textarea, " +
        "#formProyectoAvanzado button"
    );

    controles.forEach(function (control) {
        if (control.id !== "btnCancelar") {
            control.disabled = true;
        }
    });
}

function desbloquearFormulario() {
    const controles = document.querySelectorAll(
        "#formProyectoAvanzado input, " +
        "#formProyectoAvanzado select, " +
        "#formProyectoAvanzado textarea, " +
        "#formProyectoAvanzado button"
    );

    controles.forEach(function (control) {
        control.disabled = false;
    });
}

/* =========================================================
   EVENTOS
========================================================= */

function actualizarAreaEnfoquePmbokVisual() {
    const valor = estadoProyecto ? estadoProyecto.value : "";
    document.querySelectorAll(".focus-area-strip [data-focus-value]").forEach(function (item) {
        item.classList.toggle("active", item.getAttribute("data-focus-value") === valor);
    });
}

function configurarEventos() {
    if (estadoProyecto) {
        estadoProyecto.addEventListener("change", actualizarAreaEnfoquePmbokVisual);
        actualizarAreaEnfoquePmbokVisual();
    }

    if (formProyectoAvanzado) {
        formProyectoAvanzado.addEventListener("submit", function (event) {
            event.preventDefault();
            guardarProyectoAvanzado();
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener("click", function () {
            window.location.href = "proyectos.html";
        });
    }
}

/* =========================================================
   CARGA DE ORGANIZACIONES Y MIEMBROS
========================================================= */

async function cargarOrganizaciones() {
    if (!esAdministrador()) {
        organizaciones = [];
        llenarSelectOrganizaciones();
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
                datos.mensaje || "No se pudieron cargar las organizaciones."
            );
        }

        organizaciones = Array.isArray(datos.organizaciones)
            ? datos.organizaciones
            : [];

        llenarSelectOrganizaciones();

    } catch (error) {
        console.error("Error al cargar organizaciones:", error);
        organizaciones = [];
        llenarSelectOrganizaciones();

        alert(
            error.message ||
            "No se pudieron cargar las organizaciones. Verifica tu sesión de administrador."
        );
    }
}

async function cargarMiembros() {
    if (!esAdministrador()) {
        miembrosEquipo = [];
        llenarSelectResponsables();
        return;
    }

    try {
        const respuesta = await fetch(
            API_MIEMBROS,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje || "No se pudieron cargar los miembros."
            );
        }

        miembrosEquipo = Array.isArray(datos.miembros)
            ? datos.miembros
            : [];

        llenarSelectResponsables();

    } catch (error) {
        console.error("Error al cargar miembros:", error);
        miembrosEquipo = [];
        llenarSelectResponsables();

        alert(
            error.message ||
            "No se pudieron cargar los responsables. Verifica tu sesión de administrador."
        );
    }
}

function llenarSelectOrganizaciones() {
    if (!organizacionProyecto) {
        return;
    }

    organizacionProyecto.innerHTML = `
        <option value="">Sin organización asignada</option>
    `;

    organizaciones.forEach(function (organizacion) {
        const opcion = document.createElement("option");

        opcion.value = organizacion.id;
        opcion.textContent = organizacion.nombre || "Organización sin nombre";

        organizacionProyecto.appendChild(opcion);
    });
}

function llenarSelectResponsables() {
    if (!responsableProyecto) {
        return;
    }

    responsableProyecto.innerHTML = `
        <option value="">Selecciona un responsable</option>
    `;

    miembrosEquipo
        .filter(function (miembro) {
            return normalizarTexto(miembro.estado) === "activo";
        })
        .forEach(function (miembro) {
            const opcion = document.createElement("option");

            opcion.value =
                miembro.id ||
                miembro.idMiembro ||
                miembro.id_miembro;

            opcion.textContent =
                miembro.nombreCompleto || "Miembro sin nombre";

            responsableProyecto.appendChild(opcion);
        });
}

/* =========================================================
   FASES Y SUBFASES
========================================================= */

function renderizarFases(fasesGuardadas = []) {
    if (!contenedorFases) {
        return;
    }

    contenedorFases.innerHTML = "";

    FASES_BASE.forEach(function (faseBase) {
        const faseGuardada = buscarFaseGuardada(
            fasesGuardadas,
            faseBase.numeroOrden
        );

        const phaseCard = document.createElement("article");

        phaseCard.className = "phase-card";
        phaseCard.dataset.numeroOrden = faseBase.numeroOrden;
        phaseCard.dataset.tipo = "fase";

        phaseCard.innerHTML = `
            <div class="phase-main">
                <span class="phase-number">${faseBase.numeroOrden}</span>
                <span class="phase-dot gray"></span>
                <span class="phase-abbr">${obtenerAbreviatura(faseBase.nombre)}</span>
                <span class="phase-title">${escaparHTML(faseBase.nombre)}</span>

                <select class="phase-status">
                    ${opcionesEstado(
                        faseGuardada
                            ? faseGuardada.estado
                            : "No iniciado"
                    )}
                </select>

                <button
                    type="button"
                    class="btn-expand"
                    aria-label="Mostrar comentarios de fase">
                    ›
                </button>
            </div>

            <div class="phase-notes">
                <label>Comentarios de esta fase</label>
                <textarea
                    rows="2"
                    placeholder="Observaciones, evidencias o pendientes..."
                >${escaparHTML(
                    faseGuardada
                        ? faseGuardada.observaciones || ""
                        : ""
                )}</textarea>
            </div>
        `;

        configurarEventosFase(phaseCard);

        contenedorFases.appendChild(phaseCard);

        faseBase.subfases.forEach(function (nombreSubfase, indice) {
            const numeroSubfase = `${faseBase.numeroOrden}.${indice + 1}`;

            const subfaseGuardada = buscarSubfaseGuardada(
                faseGuardada,
                numeroSubfase
            );

            const subphaseCard = document.createElement("article");

            subphaseCard.className = "phase-card subfase";
            subphaseCard.dataset.numeroOrden = numeroSubfase;
            subphaseCard.dataset.tipo = "subfase";
            subphaseCard.dataset.fasePadre = faseBase.numeroOrden;

            subphaseCard.innerHTML = `
                <div class="phase-main">
                    <span class="phase-number">↳</span>
                    <span class="phase-dot gray"></span>
                    <span class="phase-abbr">${obtenerAbreviatura(nombreSubfase)}</span>
                    <span class="phase-title">${escaparHTML(nombreSubfase)}</span>

                    <select class="phase-status">
                        ${opcionesEstado(
                            subfaseGuardada
                                ? subfaseGuardada.estado
                                : "No iniciado"
                        )}
                    </select>

                    <button
                        type="button"
                        class="btn-expand"
                        aria-label="Mostrar comentarios de subfase">
                        ›
                    </button>
                </div>

                <div class="phase-notes">
                    <label>Comentarios de esta subfase</label>
                    <textarea
                        rows="2"
                        placeholder="Observaciones, evidencias o pendientes..."
                    >${escaparHTML(
                        subfaseGuardada
                            ? subfaseGuardada.observaciones || ""
                            : ""
                    )}</textarea>
                </div>
            `;

            configurarEventosFase(subphaseCard);

            contenedorFases.appendChild(subphaseCard);
        });
    });

    actualizarAvanceVisual();
    configurarPermisosVisuales();
}

function configurarEventosFase(card) {
    const botonExpandir = card.querySelector(".btn-expand");
    const selectEstado = card.querySelector(".phase-status");

    if (botonExpandir) {
        botonExpandir.addEventListener("click", function () {
            card.classList.toggle("open");
        });
    }

    if (selectEstado) {
        selectEstado.addEventListener("change", function () {
            actualizarEstiloFase(card);
            actualizarAvanceVisual();
        });

        actualizarEstiloFase(card);
    }
}

function opcionesEstado(estadoSeleccionado) {
    const estados = [
        "No iniciado",
        "Pendiente",
        "En proceso",
        "Completado",
        "No entregado"
    ];

    return estados.map(function (estado) {
        const seleccionado = estado === estadoSeleccionado
            ? "selected"
            : "";

        return `
            <option value="${estado}" ${seleccionado}>
                ${estado}
            </option>
        `;
    }).join("");
}

function actualizarEstiloFase(card) {
    const selectEstado = card.querySelector(".phase-status");

    if (!selectEstado) {
        return;
    }

    const estadoNormalizado = normalizarEstado(selectEstado.value);

    card.classList.remove(
        "status-no-iniciado",
        "status-pendiente",
        "status-en-proceso",
        "status-completado",
        "status-no-entregado"
    );

    card.classList.add(`status-${estadoNormalizado}`);

    const dot = card.querySelector(".phase-dot");

    if (dot) {
        dot.className = `phase-dot ${obtenerClaseColorEstado(selectEstado.value)}`;
    }
}

function actualizarAvanceVisual() {
    const avance = calcularAvancePorFases();

    if (avanceTexto) {
        avanceTexto.textContent = `${avance}%`;
    }

    if (barraAvance) {
        barraAvance.style.width = `${avance}%`;
    }
}

function calcularAvancePorFases() {
    const estados = document.querySelectorAll(".phase-status");

    if (estados.length === 0) {
        return 0;
    }

    let suma = 0;

    estados.forEach(function (selectEstado) {
        suma += porcentajePorEstado(selectEstado.value);
    });

    return Math.round(suma / estados.length);
}

function porcentajePorEstado(estado) {
    if (estado === "Completado") {
        return 100;
    }

    if (estado === "En proceso") {
        return 50;
    }

    if (estado === "Pendiente") {
        return 25;
    }

    return 0;
}

function obtenerFasesParaGuardar() {
    const fases = [];

    FASES_BASE.forEach(function (faseBase) {
        const tarjetaFase = document.querySelector(
            `.phase-card[data-numero-orden="${faseBase.numeroOrden}"]`
        );

        if (!tarjetaFase) {
            return;
        }

        const estadoFase = tarjetaFase
            .querySelector(".phase-status")
            .value;

        const observacionesFase = tarjetaFase
            .querySelector(".phase-notes textarea")
            .value
            .trim();

        const subfases = faseBase.subfases.map(function (_nombreSubfase, indice) {
            const numeroSubfase = `${faseBase.numeroOrden}.${indice + 1}`;

            const tarjetaSubfase = document.querySelector(
                `.phase-card[data-numero-orden="${numeroSubfase}"]`
            );

            return {
                nombre: tarjetaSubfase
                    ? tarjetaSubfase.querySelector(".phase-title").textContent.trim()
                    : "",
                numeroOrden: numeroSubfase,
                estado: tarjetaSubfase
                    ? tarjetaSubfase.querySelector(".phase-status").value
                    : "No iniciado",
                observaciones: tarjetaSubfase
                    ? tarjetaSubfase
                        .querySelector(".phase-notes textarea")
                        .value
                        .trim()
                    : ""
            };
        });

        fases.push({
            nombre: faseBase.nombre,
            numeroOrden: faseBase.numeroOrden,
            estado: estadoFase,
            observaciones: observacionesFase,
            subfases: subfases
        });
    });

    return fases;
}

/* =========================================================
   CARGA DE PROYECTO AVANZADO
========================================================= */

async function cargarProyectoAvanzado(idProyecto) {
    mostrarEstadoGuardado("Cargando proyecto avanzado...");

    try {
        const respuesta = await fetch(
            `${API_PROYECTOS_AVANZADOS}/${idProyecto}`,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar el proyecto avanzado."
            );
        }

        proyectoCargado = datos.proyecto;

        llenarFormularioProyecto(proyectoCargado);

        if (tituloPagina) {
            tituloPagina.textContent = "Editar Proyecto Avanzado";
        }

    } catch (error) {
        console.error("Error al cargar proyecto avanzado:", error);

        alert(
            error.message ||
            "No fue posible cargar el proyecto avanzado."
        );

        window.location.href = "proyectos.html";
    }
}

function llenarFormularioProyecto(proyecto) {
    if (idProyectoAvanzado) idProyectoAvanzado.value = proyecto.id || "";
    if (nombreProyecto) nombreProyecto.value = proyecto.nombre || "";
    if (codigoProyecto) codigoProyecto.value = proyecto.codigo || "";

    if (organizacionProyecto) {
        organizacionProyecto.value = proyecto.idOrganizacion || "";
    }

    if (descripcionProyecto) {
        descripcionProyecto.value = proyecto.descripcion || "";
    }

    if (responsableProyecto) {
        responsableProyecto.value = proyecto.idResponsable || "";
    }

    if (prioridadProyecto) {
        prioridadProyecto.value = proyecto.prioridad || "Media";
    }

    if (fechaInicio) {
        fechaInicio.value = proyecto.fechaInicio || "";
    }

    if (fechaFin) {
        fechaFin.value = proyecto.fechaFin || "";
    }

    if (estadoProyecto) {
        estadoProyecto.value = proyecto.estado || "Ejecución";
        actualizarAreaEnfoquePmbokVisual();
    }

    if (clasificacionProyecto) {
        clasificacionProyecto.value =
            proyecto.clasificacionProyecto || "Externo";
    }

    if (clienteArea) {
        clienteArea.value = proyecto.clienteArea || "";
    }

    if (observacionesProyecto) {
        observacionesProyecto.value =
            proyecto.observacionesGenerales || "";
    }

    renderizarFases(proyecto.fases || []);
}

/* =========================================================
   GUARDAR PROYECTO AVANZADO
========================================================= */

async function guardarProyectoAvanzado() {
    if (!esAdministrador()) {
        alert("Solo un administrador puede guardar proyectos avanzados.");
        return;
    }

    const nombre = nombreProyecto
        ? nombreProyecto.value.trim()
        : "";

    const idResponsable = responsableProyecto
        ? responsableProyecto.value
        : "";

    if (nombre === "") {
        alert("Ingresa el nombre del proyecto.");

        if (nombreProyecto) {
            nombreProyecto.focus();
        }

        return;
    }

    if (idResponsable === "") {
        alert("Selecciona un responsable para el proyecto.");

        if (responsableProyecto) {
            responsableProyecto.focus();
        }

        return;
    }

    const inicio = fechaInicio ? fechaInicio.value : "";
    const fin = fechaFin ? fechaFin.value : "";

    if (inicio !== "" && fin !== "" && fin < inicio) {
        alert("La fecha final no puede ser anterior a la fecha de inicio.");
        return;
    }

    const idUsuarioActivo = obtenerIdUsuarioActivo();

    if (!idUsuarioActivo) {
        alert(
            "No se encontró tu sesión activa. Cierra sesión e inicia nuevamente."
        );
        return;
    }

    const idProyecto = idProyectoAvanzado
        ? idProyectoAvanzado.value
        : "";

    const esEdicion = idProyecto !== "";

    const datosProyecto = {
        idOrganizacion: organizacionProyecto && organizacionProyecto.value
            ? Number(organizacionProyecto.value)
            : null,

        idResponsable: Number(idResponsable),

        nombre: nombre,
        codigo: codigoProyecto
            ? codigoProyecto.value.trim()
            : "",

        descripcion: descripcionProyecto
            ? descripcionProyecto.value.trim()
            : "",

        clienteArea: clienteArea
            ? clienteArea.value.trim()
            : "",

        clasificacionProyecto: clasificacionProyecto
            ? clasificacionProyecto.value
            : "Externo",

        estado: estadoProyecto
            ? estadoProyecto.value
            : "Ejecución",

        prioridad: prioridadProyecto
            ? prioridadProyecto.value
            : "Media",

        fechaInicio: inicio || null,
        fechaFin: fin || null,

        observacionesGenerales: observacionesProyecto
            ? observacionesProyecto.value.trim()
            : "",

        fases: obtenerFasesParaGuardar()
    };

    bloquearBotonGuardar(true);

    try {
        const respuesta = await fetch(
            esEdicion
                ? `${API_PROYECTOS_AVANZADOS}/${idProyecto}`
                : API_PROYECTOS_AVANZADOS,
            {
                method: esEdicion ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Usuario-Id": String(idUsuarioActivo)
                },
                body: JSON.stringify(datosProyecto)
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible guardar el proyecto avanzado."
            );
        }

        alert(
            datos.mensaje ||
            "Proyecto avanzado guardado correctamente."
        );

        window.location.href = "proyectos.html";

    } catch (error) {
        console.error("Error al guardar proyecto avanzado:", error);

        alert(
            error.message ||
            "Ocurrió un error al guardar el proyecto avanzado."
        );
    } finally {
        bloquearBotonGuardar(false);
    }
}

function bloquearBotonGuardar(estaBloqueado) {
    if (!btnGuardarProyectoAvanzado) {
        return;
    }

    btnGuardarProyectoAvanzado.disabled = estaBloqueado;

    btnGuardarProyectoAvanzado.textContent = estaBloqueado
        ? "Guardando..."
        : "💾 Guardar Proyecto y Continuar";
}

/* =========================================================
   UTILIDADES
========================================================= */

function obtenerIdDesdeURL() {
    const parametros = new URLSearchParams(window.location.search);
    return parametros.get("id");
}

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

function buscarFaseGuardada(fasesGuardadas, numeroOrden) {
    return fasesGuardadas.find(function (fase) {
        return String(fase.numeroOrden) === String(numeroOrden);
    });
}

function buscarSubfaseGuardada(faseGuardada, numeroOrden) {
    if (!faseGuardada || !Array.isArray(faseGuardada.subfases)) {
        return null;
    }

    return faseGuardada.subfases.find(function (subfase) {
        return String(subfase.numeroOrden) === String(numeroOrden);
    });
}

function obtenerAbreviatura(nombre) {
    const palabras = String(nombre || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (palabras.length === 0) {
        return "—";
    }

    if (palabras.length === 1) {
        return palabras[0].substring(0, 3).toUpperCase();
    }

    return palabras
        .slice(0, 3)
        .map(function (palabra) {
            return palabra[0];
        })
        .join("")
        .toUpperCase();
}

function normalizarEstado(estado) {
    return String(estado || "")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function obtenerClaseColorEstado(estado) {
    if (estado === "Completado") {
        return "green";
    }

    if (estado === "En proceso") {
        return "orange";
    }

    if (estado === "Pendiente") {
        return "yellow";
    }

    if (estado === "No entregado") {
        return "red";
    }

    return "gray";
}

function mostrarEstadoGuardado(mensaje) {
    console.log(mensaje);
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}