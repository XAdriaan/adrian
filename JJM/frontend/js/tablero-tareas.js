const API_TAREAS = window.apiUrl("/api/tareas");
const API_PROYECTOS = window.apiUrl("/api/proyectos");
const API_MIEMBROS_PROYECTO =
    window.apiUrl("/api/miembros-proyecto");

let tareas = [];
let proyectos = [];
let fasesProyectoActual = [];
let miembrosProyectoActual = [];
let usuarioActivo = obtenerUsuarioActivo();
let solicitudProyectoActual = 0;

const btnNuevaTarea = document.getElementById("btnNuevaTarea");
const modalTarea = document.getElementById("modalTarea");
const btnCerrarModalTarea =
    document.getElementById("btnCerrarModalTarea");
const btnCancelarTarea =
    document.getElementById("btnCancelarTarea");
const formTarea = document.getElementById("formTarea");

const buscarTarea = document.getElementById("buscarTarea");
const filtroEstadoTabla =
    document.getElementById("filtroEstadoTabla");

const columnaPendiente =
    document.getElementById("columnaPendiente");
const columnaEnProgreso =
    document.getElementById("columnaEnProgreso");
const columnaBloqueada =
    document.getElementById("columnaBloqueada");
const columnaCompletada =
    document.getElementById("columnaCompletada");

const idTarea = document.getElementById("idTarea");
const tituloModalTarea =
    document.getElementById("tituloModalTarea");
const tituloTarea = document.getElementById("tituloTarea");
const proyectoTarea = document.getElementById("proyectoTarea");
const faseTarea = document.getElementById("faseTarea");
const asignadoTarea = document.getElementById("asignadoTarea");
const estadoTarea = document.getElementById("estadoTarea");
const prioridadTarea = document.getElementById("prioridadTarea");
const horasEstimadasTarea =
    document.getElementById("horasEstimadasTarea");
const descripcionTarea =
    document.getElementById("descripcionTarea");

document.addEventListener("DOMContentLoaded", async function () {
    usuarioActivo = obtenerUsuarioActivo();

    configurarEventos();
    configurarColumnasArrastrables();

    await cargarProyectos();
    await cargarTareas();
});

/* =========================================================
   SESIÓN
========================================================= */

function obtenerUsuarioActivo() {
    try {
        return JSON.parse(
            localStorage.getItem("usuarioActivo")
        ) || null;
    } catch (error) {
        console.error("No fue posible leer la sesión:", error);
        return null;
    }
}

function obtenerIdUsuarioActivo() {
    if (!usuarioActivo) {
        return null;
    }

    return usuarioActivo.id ||
        usuarioActivo.idUsuario ||
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
        "";
}

function esAdministrador() {
    if (window.PMOPermisos && window.PMOPermisos.tiene("tareas.ver_todas")) return true;

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

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    if (btnNuevaTarea) {
        btnNuevaTarea.addEventListener(
            "click",
            abrirModalNuevaTarea
        );
    }

    if (btnCerrarModalTarea) {
        btnCerrarModalTarea.addEventListener(
            "click",
            cerrarModalTarea
        );
    }

    if (btnCancelarTarea) {
        btnCancelarTarea.addEventListener(
            "click",
            cerrarModalTarea
        );
    }

    if (modalTarea) {
        modalTarea.addEventListener(
            "click",
            function (event) {
                if (event.target === modalTarea) {
                    cerrarModalTarea();
                }
            }
        );
    }

    if (formTarea) {
        formTarea.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                guardarTarea();
            }
        );
    }

    if (buscarTarea) {
        buscarTarea.addEventListener(
            "input",
            renderizarTablero
        );
    }

    if (filtroEstadoTabla) {
        filtroEstadoTabla.addEventListener(
            "change",
            renderizarTablero
        );
    }

    if (proyectoTarea) {
        proyectoTarea.addEventListener(
            "change",
            async function () {
                await cargarDatosProyectoFormulario(
                    proyectoTarea.value
                );
            }
        );
    }
}

function configurarColumnasArrastrables() {
    const columnas = [
        columnaPendiente,
        columnaEnProgreso,
        columnaBloqueada,
        columnaCompletada
    ];

    columnas.forEach(function (columna) {
        if (!columna) {
            return;
        }

        columna.addEventListener(
            "dragover",
            function (event) {
                event.preventDefault();
                columna.classList.add("drag-over");
            }
        );

        columna.addEventListener(
            "dragleave",
            function () {
                columna.classList.remove("drag-over");
            }
        );

        columna.addEventListener(
            "drop",
            async function (event) {
                event.preventDefault();

                columna.classList.remove("drag-over");

                const idTareaMovida =
                    event.dataTransfer.getData("text/plain");

                const nuevoEstado =
                    columna.dataset.estado;

                if (!idTareaMovida || !nuevoEstado) {
                    return;
                }

                await cambiarEstadoTarea(
                    idTareaMovida,
                    nuevoEstado
                );
            }
        );
    });
}

/* =========================================================
   CARGA DE DATOS
========================================================= */

async function cargarProyectos() {
    try {
        const respuesta = await fetch(
            API_PROYECTOS,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar los proyectos."
            );
        }

        proyectos = Array.isArray(datos.proyectos)
            ? datos.proyectos
            : [];

        llenarSelectProyectos();

    } catch (error) {
        console.error("Error al cargar proyectos:", error);

        proyectos = [];
        llenarSelectProyectos();
    }
}

async function cargarTareas() {
    mostrarCargaEnColumnas();

    try {
        const respuesta = await fetch(
            API_TAREAS,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar las tareas."
            );
        }

        tareas = Array.isArray(datos.tareas)
            ? datos.tareas.map(normalizarTarea)
            : [];

        renderizarTablero();

    } catch (error) {
        console.error("Error al cargar tareas:", error);

        mostrarErrorEnColumnas(
            error.message ||
            "No fue posible cargar las tareas."
        );
    }
}

function normalizarTarea(tarea) {
    return {
        id: tarea.id,
        idProyecto: tarea.idProyecto,
        idFase: tarea.idFase || null,
        idMiembroAsignado: tarea.idMiembroAsignado || null,

        titulo: tarea.titulo || "",
        descripcion: tarea.descripcion || "",
        estado: tarea.estado || "Pendiente",
        prioridad: tarea.prioridad || "Media",

        horasEstimadas: Number(tarea.horasEstimadas || 0),
        horasRegistradas: Number(tarea.horasRegistradas || 0),

        fechaInicio: tarea.fechaInicio || null,
        fechaLimite: tarea.fechaLimite || null,

        proyectoNombre: tarea.proyectoNombre || "Proyecto",
        faseNombre: tarea.faseNombre || "Sin fase",
        miembroNombre: tarea.miembroNombre || "Sin asignar",
        miembroRol: tarea.miembroRol || ""
    };
}

/* =========================================================
   FORMULARIO DE TAREAS
========================================================= */

function llenarSelectProyectos() {
    if (!proyectoTarea) {
        return;
    }

    proyectoTarea.innerHTML = `
        <option value="">Selecciona un proyecto</option>
    `;

    if (proyectos.length === 0) {
        proyectoTarea.innerHTML = `
            <option value="">No tienes proyectos disponibles</option>
        `;
        return;
    }

    proyectos.forEach(function (proyecto) {
        const opcion = document.createElement("option");

        opcion.value = proyecto.id;

        opcion.textContent =
            `${proyecto.nombre || "Proyecto sin nombre"} · ` +
            `${proyecto.codigo || "Sin código"}`;

        proyectoTarea.appendChild(opcion);
    });
}

async function cargarDatosProyectoFormulario(
    idProyectoSeleccionado,
    idFaseSeleccionada = "",
    idMiembroSeleccionado = ""
) {
    const idSolicitud = ++solicitudProyectoActual;

    fasesProyectoActual = [];
    miembrosProyectoActual = [];

    limpiarSelectFases("Cargando fases...");
    limpiarSelectMiembros("Cargando integrantes...");

    if (!idProyectoSeleccionado) {
        limpiarSelectFases("Selecciona primero un proyecto");
        limpiarSelectMiembros("Selecciona primero un proyecto");
        return;
    }

    await Promise.all([
        cargarFasesProyecto(
            idProyectoSeleccionado,
            idFaseSeleccionada,
            idSolicitud
        ),
        cargarMiembrosProyecto(
            idProyectoSeleccionado,
            idMiembroSeleccionado,
            idSolicitud
        )
    ]);
}

async function cargarFasesProyecto(
    idProyectoSeleccionado,
    idFaseSeleccionada,
    idSolicitud
) {
    try {
        const respuesta = await fetch(
            `${API_PROYECTOS}/${idProyectoSeleccionado}/fases`,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (idSolicitud !== solicitudProyectoActual) {
            return;
        }

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar las fases."
            );
        }

        fasesProyectoActual = Array.isArray(datos.fases)
            ? datos.fases
            : [];

        if (!faseTarea) {
            return;
        }

        faseTarea.innerHTML = `
            <option value="">Sin fase asignada</option>
        `;

        fasesProyectoActual.forEach(function (fase) {
            const opcion = document.createElement("option");

            opcion.value = fase.id;

            opcion.textContent =
                `${fase.numeroOrden || ""} · ` +
                `${fase.nombre || "Fase sin nombre"}`;

            if (
                String(fase.id) ===
                String(idFaseSeleccionada)
            ) {
                opcion.selected = true;
            }

            faseTarea.appendChild(opcion);
        });

    } catch (error) {
        console.error("Error al cargar fases:", error);

        if (idSolicitud !== solicitudProyectoActual) {
            return;
        }

        limpiarSelectFases("No fue posible cargar fases");
    }
}

async function cargarMiembrosProyecto(
    idProyectoSeleccionado,
    idMiembroSeleccionado,
    idSolicitud
) {
    try {
        const respuesta = await fetch(
            `${API_MIEMBROS_PROYECTO}/proyecto/${idProyectoSeleccionado}`,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (idSolicitud !== solicitudProyectoActual) {
            return;
        }

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar integrantes."
            );
        }

        miembrosProyectoActual = Array.isArray(datos.miembros)
            ? datos.miembros
            : [];

        if (!asignadoTarea) {
            return;
        }

        asignadoTarea.innerHTML = `
            <option value="">
                Selecciona una persona del proyecto
            </option>
        `;

        miembrosProyectoActual.forEach(function (miembro) {
            const opcion = document.createElement("option");

            opcion.value = miembro.idMiembro;

            opcion.textContent =
                `${miembro.miembroNombre || "Sin nombre"} · ` +
                `${miembro.rolProyecto || "Colaborador"}`;

            if (
                String(miembro.idMiembro) ===
                String(idMiembroSeleccionado)
            ) {
                opcion.selected = true;
            }

            asignadoTarea.appendChild(opcion);
        });

    } catch (error) {
        console.error("Error al cargar integrantes:", error);

        if (idSolicitud !== solicitudProyectoActual) {
            return;
        }

        limpiarSelectMiembros(
            "No fue posible cargar integrantes"
        );
    }
}

function limpiarSelectFases(mensaje) {
    if (!faseTarea) {
        return;
    }

    faseTarea.innerHTML = `
        <option value="">${escaparHTML(mensaje)}</option>
    `;
}

function limpiarSelectMiembros(mensaje) {
    if (!asignadoTarea) {
        return;
    }

    asignadoTarea.innerHTML = `
        <option value="">${escaparHTML(mensaje)}</option>
    `;
}

function abrirModalNuevaTarea() {
    if (proyectos.length === 0) {
        alert(
            "No tienes proyectos disponibles para crear tareas."
        );
        return;
    }

    if (formTarea) {
        formTarea.reset();
    }

    if (idTarea) {
        idTarea.value = "";
    }

    if (tituloModalTarea) {
        tituloModalTarea.textContent = "Nueva Tarea";
    }

    if (estadoTarea) {
        estadoTarea.value = "Pendiente";
    }

    if (prioridadTarea) {
        prioridadTarea.value = "Media";
    }

    if (horasEstimadasTarea) {
        horasEstimadasTarea.value = 0;
    }

    llenarSelectProyectos();

    limpiarSelectFases("Selecciona primero un proyecto");
    limpiarSelectMiembros("Selecciona primero un proyecto");

    modalTarea.classList.add("show");
}

async function editarTarea(id) {
    const tarea = tareas.find(function (item) {
        return String(item.id) === String(id);
    });

    if (!tarea) {
        alert("No se encontró la tarea.");
        return;
    }

    if (formTarea) {
        formTarea.reset();
    }

    llenarSelectProyectos();

    if (tituloModalTarea) {
        tituloModalTarea.textContent = "Editar Tarea";
    }

    if (idTarea) idTarea.value = tarea.id;
    if (tituloTarea) tituloTarea.value = tarea.titulo || "";
    if (proyectoTarea) proyectoTarea.value = tarea.idProyecto || "";
    if (estadoTarea) estadoTarea.value = tarea.estado || "Pendiente";

    if (prioridadTarea) {
        prioridadTarea.value = tarea.prioridad || "Media";
    }

    if (horasEstimadasTarea) {
        horasEstimadasTarea.value =
            tarea.horasEstimadas || 0;
    }

    if (descripcionTarea) {
        descripcionTarea.value = tarea.descripcion || "";
    }

    await cargarDatosProyectoFormulario(
        tarea.idProyecto,
        tarea.idFase || "",
        tarea.idMiembroAsignado || ""
    );

    modalTarea.classList.add("show");
}

async function guardarTarea() {
    const titulo = tituloTarea
        ? tituloTarea.value.trim()
        : "";

    const idProyectoSeleccionado = proyectoTarea
        ? proyectoTarea.value
        : "";

    const idMiembroAsignado = asignadoTarea
        ? asignadoTarea.value
        : "";

    if (titulo === "") {
        alert("Ingresa el título de la tarea.");
        return;
    }

    if (idProyectoSeleccionado === "") {
        alert("Selecciona un proyecto.");
        return;
    }

    if (idMiembroAsignado === "") {
        alert(
            "Selecciona una persona asignada al proyecto."
        );
        return;
    }

    const miembroPermitido = miembrosProyectoActual.some(
        function (miembro) {
            return String(miembro.idMiembro) ===
                String(idMiembroAsignado);
        }
    );

    if (!miembroPermitido) {
        alert(
            "La persona seleccionada no pertenece al proyecto."
        );
        return;
    }

    const idUsuario = obtenerIdUsuarioActivo();

    if (!idUsuario) {
        alert(
            "No se encontró una sesión activa. Cierra sesión e inicia nuevamente."
        );
        return;
    }

    const horasEstimadas = Number(
        horasEstimadasTarea
            ? horasEstimadasTarea.value || 0
            : 0
    );

    if (horasEstimadas < 0) {
        alert("Las horas estimadas no pueden ser negativas.");
        return;
    }

    const id = idTarea ? idTarea.value : "";
    const esEdicion = id !== "";

    const datosTarea = {
        idProyecto: Number(idProyectoSeleccionado),
        idFase: faseTarea && faseTarea.value
            ? Number(faseTarea.value)
            : null,
        idMiembroAsignado: Number(idMiembroAsignado),
        titulo: titulo,
        descripcion: descripcionTarea
            ? descripcionTarea.value.trim()
            : "",
        estado: estadoTarea
            ? estadoTarea.value
            : "Pendiente",
        prioridad: prioridadTarea
            ? prioridadTarea.value
            : "Media",
        horasEstimadas: horasEstimadas,
        horasRegistradas: null,
        fechaInicio: null,
        fechaLimite: null
    };

    const botonGuardar = document.querySelector(
        "#formTarea button[type='submit']"
    );

    if (botonGuardar) {
        botonGuardar.disabled = true;
        botonGuardar.textContent = "Guardando...";
    }

    try {
        const respuesta = await fetch(
            esEdicion
                ? `${API_TAREAS}/${id}`
                : API_TAREAS,
            {
                method: esEdicion ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Usuario-Id": String(idUsuario)
                },
                body: JSON.stringify(datosTarea)
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible guardar la tarea."
            );
        }

        cerrarModalTarea();
        await cargarTareas();

        alert(
            datos.mensaje ||
            "Tarea guardada correctamente."
        );

    } catch (error) {
        console.error("Error al guardar tarea:", error);

        alert(
            error.message ||
            "No fue posible guardar la tarea."
        );
    } finally {
        if (botonGuardar) {
            botonGuardar.disabled = false;
            botonGuardar.textContent = "Guardar Tarea";
        }
    }
}

function cerrarModalTarea() {
    if (modalTarea) {
        modalTarea.classList.remove("show");
    }

    if (formTarea) {
        formTarea.reset();
    }

    if (idTarea) {
        idTarea.value = "";
    }

    fasesProyectoActual = [];
    miembrosProyectoActual = [];
}

/* =========================================================
   TABLERO KANBAN
========================================================= */

function renderizarTablero() {
    limpiarColumnas();

    const tareasFiltradas = obtenerTareasFiltradas();

    tareasFiltradas.forEach(function (tarea) {
        const columna = obtenerColumnaPorEstado(tarea.estado);

        if (columna) {
            columna.appendChild(crearTarjetaTarea(tarea));
        }
    });

    mostrarColumnasVacias();
}

function obtenerTareasFiltradas() {
    let lista = tareas.slice();

    const busqueda = buscarTarea
        ? buscarTarea.value.trim().toLowerCase()
        : "";

    const estadoFiltro = filtroEstadoTabla
        ? filtroEstadoTabla.value
        : "todos";

    if (busqueda !== "") {
        lista = lista.filter(function (tarea) {
            return (
                String(tarea.titulo || "")
                    .toLowerCase()
                    .includes(busqueda) ||

                String(tarea.proyectoNombre || "")
                    .toLowerCase()
                    .includes(busqueda) ||

                String(tarea.faseNombre || "")
                    .toLowerCase()
                    .includes(busqueda) ||

                String(tarea.miembroNombre || "")
                    .toLowerCase()
                    .includes(busqueda)
            );
        });
    }

    if (estadoFiltro !== "todos") {
        lista = lista.filter(function (tarea) {
            return tarea.estado === estadoFiltro;
        });
    }

    return lista;
}

function crearTarjetaTarea(tarea) {
    const tarjeta = document.createElement("article");

    tarjeta.className =
        "kanban-task priority-" +
        normalizarPrioridad(tarea.prioridad);

    tarjeta.draggable = true;

    tarjeta.addEventListener(
        "dragstart",
        function (event) {
            event.dataTransfer.setData(
                "text/plain",
                String(tarea.id)
            );

            tarjeta.classList.add("dragging");
        }
    );

    tarjeta.addEventListener(
        "dragend",
        function () {
            tarjeta.classList.remove("dragging");
        }
    );

    tarjeta.innerHTML = `
        <div class="kanban-task-top">
            <span class="kanban-priority">
                ${escaparHTML(tarea.prioridad || "Media")}
            </span>

            <button
                type="button"
                class="kanban-edit-btn"
                title="Editar tarea">
                ✎
            </button>
        </div>

        <h3>${escaparHTML(tarea.titulo || "Tarea sin título")}</h3>

        <p class="kanban-description">
            ${escaparHTML(
                tarea.descripcion ||
                "Sin descripción registrada."
            )}
        </p>

        <div class="kanban-meta">
            <span>
                <strong>Proyecto:</strong>
                ${escaparHTML(tarea.proyectoNombre || "—")}
            </span>

            <span>
                <strong>Fase:</strong>
                ${escaparHTML(tarea.faseNombre || "Sin fase")}
            </span>

            <span>
                <strong>Asignado:</strong>
                ${escaparHTML(tarea.miembroNombre || "Sin asignar")}
            </span>
        </div>

        <div class="kanban-task-footer">
            <span>${Number(tarea.horasEstimadas || 0)} h</span>
            <span class="kanban-status">
                ${escaparHTML(tarea.estado || "Pendiente")}
            </span>
        </div>
    `;

    const btnEditar = tarjeta.querySelector(
        ".kanban-edit-btn"
    );

    if (btnEditar) {
        btnEditar.addEventListener(
            "click",
            function (event) {
                event.stopPropagation();
                editarTarea(tarea.id);
            }
        );
    }

    tarjeta.addEventListener(
        "dblclick",
        function () {
            editarTarea(tarea.id);
        }
    );

    return tarjeta;
}

function obtenerColumnaPorEstado(estado) {
    const texto = String(estado || "")
        .trim()
        .toLowerCase();

    if (texto === "pendiente") {
        return columnaPendiente;
    }

    if (texto === "en progreso") {
        return columnaEnProgreso;
    }

    if (texto === "bloqueada") {
        return columnaBloqueada;
    }

    if (texto === "completada") {
        return columnaCompletada;
    }

    return columnaPendiente;
}

function limpiarColumnas() {
    const columnas = [
        columnaPendiente,
        columnaEnProgreso,
        columnaBloqueada,
        columnaCompletada
    ];

    columnas.forEach(function (columna) {
        if (columna) {
            columna.innerHTML = "";
        }
    });
}

function mostrarColumnasVacias() {
    const columnas = [
        columnaPendiente,
        columnaEnProgreso,
        columnaBloqueada,
        columnaCompletada
    ];

    columnas.forEach(function (columna) {
        if (!columna || columna.children.length > 0) {
            return;
        }

        columna.innerHTML = `
            <div class="kanban-empty">
                No hay tareas aquí.
            </div>
        `;
    });
}

function mostrarCargaEnColumnas() {
    const columnas = [
        columnaPendiente,
        columnaEnProgreso,
        columnaBloqueada,
        columnaCompletada
    ];

    columnas.forEach(function (columna) {
        if (!columna) {
            return;
        }

        columna.innerHTML = `
            <div class="kanban-empty">
                Cargando tareas...
            </div>
        `;
    });
}

function mostrarErrorEnColumnas(mensaje) {
    const columnas = [
        columnaPendiente,
        columnaEnProgreso,
        columnaBloqueada,
        columnaCompletada
    ];

    columnas.forEach(function (columna) {
        if (!columna) {
            return;
        }

        columna.innerHTML = `
            <div class="kanban-empty kanban-error">
                ${escaparHTML(mensaje)}
            </div>
        `;
    });
}

async function cambiarEstadoTarea(idTareaSeleccionada, nuevoEstado) {
    const tarea = tareas.find(function (item) {
        return String(item.id) ===
            String(idTareaSeleccionada);
    });

    if (!tarea || tarea.estado === nuevoEstado) {
        return;
    }

    const idUsuario = obtenerIdUsuarioActivo();

    if (!idUsuario) {
        alert(
            "No se encontró una sesión activa. Cierra sesión e inicia nuevamente."
        );
        return;
    }

    const datosTarea = {
        idProyecto: Number(tarea.idProyecto),
        idFase: tarea.idFase
            ? Number(tarea.idFase)
            : null,
        idMiembroAsignado: Number(tarea.idMiembroAsignado),
        titulo: tarea.titulo,
        descripcion: tarea.descripcion || "",
        estado: nuevoEstado,
        prioridad: tarea.prioridad || "Media",
        horasEstimadas: Number(tarea.horasEstimadas || 0),
        horasRegistradas: null,
        fechaInicio: tarea.fechaInicio || null,
        fechaLimite: tarea.fechaLimite || null
    };

    const estadoAnterior = tarea.estado;

    tarea.estado = nuevoEstado;
    renderizarTablero();

    try {
        const respuesta = await fetch(
            `${API_TAREAS}/${tarea.id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-Usuario-Id": String(idUsuario)
                },
                body: JSON.stringify(datosTarea)
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible mover la tarea."
            );
        }

        await cargarTareas();

    } catch (error) {
        tarea.estado = estadoAnterior;
        renderizarTablero();

        console.error("Error al mover tarea:", error);

        alert(
            error.message ||
            "No fue posible actualizar el estado de la tarea."
        );
    }
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

function normalizarPrioridad(prioridad) {
    const texto = String(prioridad || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (texto.includes("critica")) return "critica";
    if (texto.includes("alta")) return "alta";
    if (texto.includes("baja")) return "baja";

    return "media";
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}