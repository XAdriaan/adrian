const API_TAREAS = window.apiUrl("/api/tareas");
const API_PROYECTOS = window.apiUrl("/api/proyectos");
const API_MIEMBROS_PROYECTO =
    window.apiUrl("/api/miembros-proyecto");

let tareas = [];
let proyectos = [];
let miembrosProyectoActual = [];
let fasesProyectoActual = [];
let usuarioActivo = obtenerUsuarioActivo();
let solicitudProyectoActual = 0;

const btnNuevaTarea = document.getElementById("btnNuevaTarea");
const modalTarea = document.getElementById("modalTarea");
const btnCerrarModalTarea =
    document.getElementById("btnCerrarModalTarea");
const btnCancelarTarea =
    document.getElementById("btnCancelarTarea");
const btnGuardarTarea =
    document.getElementById("btnGuardarTarea");
const formTarea = document.getElementById("formTarea");
const tituloModalTarea =
    document.getElementById("tituloModalTarea");

const permisoTareas = document.getElementById("permisoTareas");
const tablaTareas = document.getElementById("tablaTareas");
const buscarTarea = document.getElementById("buscarTarea");
const filtroEstadoTabla =
    document.getElementById("filtroEstadoTabla");

const idTarea = document.getElementById("idTarea");
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
const archivosTarea = document.getElementById("archivosTarea");
const archivosSeleccionadosTarea = document.getElementById("archivosSeleccionadosTarea");
const archivosExistentesTarea = document.getElementById("archivosExistentesTarea");
const modalArchivosTarea = document.getElementById("modalArchivosTarea");
const btnCerrarArchivosTarea = document.getElementById("btnCerrarArchivosTarea");
const tituloArchivosTarea = document.getElementById("tituloArchivosTarea");
const listaArchivosTarea = document.getElementById("listaArchivosTarea");

let idTareaArchivosAbierta = null;

document.addEventListener("DOMContentLoaded", async function () {
    usuarioActivo = obtenerUsuarioActivo();

    configurarEventos();

    await cargarProyectos();
    await cargarTareas();

    configurarPermisosVisuales();
});

/* =========================================================
   SESIÓN Y ROLES
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


function tienePermisoTareas(clave) {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene(clave));
}

function esUsuarioConsulta() {
    const rol = normalizarTexto(obtenerNombreRolUsuario());

    return (
        rol === "cliente" ||
        rol === "consulta" ||
        rol === "usuario de consulta" ||
        rol === "enlace universidad" ||
        rol === "enlace de universidad" ||
        rol === "enlace empresa" ||
        rol === "enlace de empresa"
    );
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
   PERMISOS DE TAREAS
========================================================= */

function puedeCrearTareas() {
    if (!usuarioActivo) {
        return false;
    }

    if (esUsuarioConsulta()) {
        return false;
    }

    if (esAdministrador()) return tienePermisoTareas("tareas.gestionar");
    return proyectos.length > 0;
}

function puedeEditarTarea(tarea) {
    if (!usuarioActivo) {
        return false;
    }

    if (esUsuarioConsulta()) {
        return false;
    }

    if (esAdministrador()) {
        return tienePermisoTareas("tareas.gestionar");
    }

    if (!tarea) {
        return false;
    }

    /*
     * Para usuarios no administradores, el backend ya debe entregar
     * únicamente proyectos donde el usuario participa.
     * Por eso se valida contra la lista de proyectos permitidos.
     */
    return proyectos.some(function (proyecto) {
        return String(proyecto.id) ===
            String(tarea.idProyecto);
    });
}

function puedeUsarProyecto(idProyectoSeleccionado) {
    if (esAdministrador()) {
        return true;
    }

    if (esUsuarioConsulta()) {
        return false;
    }

    return proyectos.some(function (proyecto) {
        return String(proyecto.id) ===
            String(idProyectoSeleccionado);
    });
}

/* =========================================================
   PERMISOS VISUALES
========================================================= */

function configurarPermisosVisuales() {
    const permitidoCrear = puedeCrearTareas();

    if (btnNuevaTarea) {
        btnNuevaTarea.style.display = permitidoCrear
            ? "inline-block"
            : "none";
    }

    if (!permisoTareas) {
        return;
    }

    if (!usuarioActivo) {
        permisoTareas.innerHTML = `
            <span class="permission-readonly">
                No hay una sesión activa.
            </span>
        `;
        return;
    }

    if (esAdministrador()) {
        permisoTareas.innerHTML = `
            <span class="permission-admin">
                Modo administrador: puedes crear y editar tareas en todos los proyectos.
                Al seleccionar un proyecto solo aparecerán sus integrantes asignados.
            </span>
        `;
        return;
    }

    if (esUsuarioConsulta()) {
        permisoTareas.innerHTML = `
            <span class="permission-readonly">
                Modo consulta: solo puedes revisar información autorizada.
            </span>
        `;
        return;
    }

    if (proyectos.length === 0) {
        permisoTareas.innerHTML = `
            <span class="permission-readonly">
                No tienes proyectos asignados. No puedes crear tareas todavía.
            </span>
        `;
        return;
    }

    permisoTareas.innerHTML = `
        <span class="permission-readonly">
            Puedes crear y editar tareas únicamente dentro de tus proyectos asignados.
            En la tabla solo aparecen las tareas permitidas para tu sesión.
        </span>
    `;
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
        modalTarea.addEventListener("click", function (event) {
            if (event.target === modalTarea) {
                cerrarModalTarea();
            }
        });
    }

    if (formTarea) {
        formTarea.addEventListener("submit", function (event) {
            event.preventDefault();
            guardarTarea();
        });
    }

    if (buscarTarea) {
        buscarTarea.addEventListener(
            "input",
            renderizarTareasTabla
        );
    }

    if (filtroEstadoTabla) {
        filtroEstadoTabla.addEventListener(
            "change",
            renderizarTareasTabla
        );
    }

    if (archivosTarea) {
        archivosTarea.addEventListener("change", renderizarArchivosSeleccionados);
    }

    if (btnCerrarArchivosTarea) {
        btnCerrarArchivosTarea.addEventListener("click", cerrarModalArchivosTarea);
    }

    if (modalArchivosTarea) {
        modalArchivosTarea.addEventListener("click", function (event) {
            if (event.target === modalArchivosTarea) cerrarModalArchivosTarea();
        });
    }

    if (proyectoTarea) {
        proyectoTarea.addEventListener(
            "change",
            async function () {
                await cargarDatosDelProyectoFormulario(
                    proyectoTarea.value
                );
            }
        );
    }
}

/* =========================================================
   CARGA GENERAL
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
    mostrarCargando();

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

        localStorage.setItem(
            "tareas",
            JSON.stringify(tareas)
        );

        renderizarTareasTabla();

    } catch (error) {
        console.error("Error al cargar tareas:", error);

        mostrarError(
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
        fechaInicio: tarea.fechaInicio || "",
        fechaLimite: tarea.fechaLimite || "",
        proyectoNombre: tarea.proyectoNombre || "—",
        faseNombre: tarea.faseNombre || "",
        miembroNombre: tarea.miembroNombre || "Sin asignar",
        miembroRol: tarea.miembroRol || "",
        miembroCorreo: tarea.miembroCorreo || ""
    };
}

/* =========================================================
   SELECT DE PROYECTOS
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

/* =========================================================
   FASES E INTEGRANTES DEL PROYECTO
========================================================= */

async function cargarDatosDelProyectoFormulario(
    idProyectoSeleccionado,
    idFaseSeleccionada = "",
    idMiembroSeleccionado = ""
) {
    const idSolicitud = ++solicitudProyectoActual;

    miembrosProyectoActual = [];
    fasesProyectoActual = [];

    limpiarSelectFases("Cargando fases...");
    limpiarSelectMiembrosProyecto("Cargando integrantes...");

    if (!idProyectoSeleccionado) {
        limpiarSelectFases("Selecciona primero un proyecto");
        limpiarSelectMiembrosProyecto(
            "Selecciona primero un proyecto"
        );
        return;
    }

    if (!puedeUsarProyecto(idProyectoSeleccionado)) {
        limpiarSelectFases("Proyecto no permitido");
        limpiarSelectMiembrosProyecto("Proyecto no permitido");

        alert(
            "No tienes permiso para trabajar con este proyecto."
        );
        return;
    }

    await Promise.all([
        cargarFasesDelProyecto(
            idProyectoSeleccionado,
            idFaseSeleccionada,
            idSolicitud
        ),
        cargarMiembrosDelProyecto(
            idProyectoSeleccionado,
            idMiembroSeleccionado,
            idSolicitud
        )
    ]);
}

async function cargarFasesDelProyecto(
    idProyectoSeleccionado,
    idFaseSeleccionada = "",
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

        if (fasesProyectoActual.length === 0) {
            faseTarea.innerHTML = `
                <option value="">
                    Este proyecto todavía no tiene fases registradas
                </option>
            `;
            return;
        }

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

        limpiarSelectFases("No fue posible cargar las fases");
    }
}

async function cargarMiembrosDelProyecto(
    idProyectoSeleccionado,
    idMiembroSeleccionado = "",
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
                "No fue posible cargar los integrantes del proyecto."
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
                Selecciona una persona asignada al proyecto
            </option>
        `;

        if (miembrosProyectoActual.length === 0) {
            asignadoTarea.innerHTML = `
                <option value="">
                    No hay integrantes asignados a este proyecto
                </option>
            `;
            return;
        }

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
        console.error(
            "Error al cargar integrantes del proyecto:",
            error
        );

        if (idSolicitud !== solicitudProyectoActual) {
            return;
        }

        limpiarSelectMiembrosProyecto(
            "No fue posible cargar los integrantes"
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

function limpiarSelectMiembrosProyecto(mensaje) {
    if (!asignadoTarea) {
        return;
    }

    asignadoTarea.innerHTML = `
        <option value="">${escaparHTML(mensaje)}</option>
    `;
}

/* =========================================================
   CREAR Y EDITAR TAREAS
========================================================= */

function abrirModalNuevaTarea() {
    if (!puedeCrearTareas()) {
        alert(
            "No tienes permiso para crear tareas o no tienes proyectos asignados."
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

    solicitudProyectoActual++;

    miembrosProyectoActual = [];
    fasesProyectoActual = [];

    llenarSelectProyectos();

    limpiarSelectFases("Selecciona primero un proyecto");

    limpiarSelectMiembrosProyecto(
        "Selecciona primero un proyecto"
    );

    limpiarArchivosFormulario();

    if (modalTarea) {
        modalTarea.classList.add("show");
    }
}

async function editarTarea(id) {
    const tarea = tareas.find(function (item) {
        return String(item.id) === String(id);
    });

    if (!tarea) {
        alert("No se encontró la tarea.");
        return;
    }

    if (!puedeEditarTarea(tarea)) {
        alert(
            "No tienes permiso para editar tareas de este proyecto."
        );
        return;
    }

    if (formTarea) {
        formTarea.reset();
    }

    if (tituloModalTarea) {
        tituloModalTarea.textContent = "Editar Tarea";
    }

    llenarSelectProyectos();

    if (idTarea) {
        idTarea.value = tarea.id;
    }

    if (tituloTarea) {
        tituloTarea.value = tarea.titulo || "";
    }

    if (proyectoTarea) {
        proyectoTarea.value = tarea.idProyecto || "";
    }

    if (estadoTarea) {
        estadoTarea.value = tarea.estado || "Pendiente";
    }

    if (prioridadTarea) {
        prioridadTarea.value = tarea.prioridad || "Media";
    }

    if (horasEstimadasTarea) {
        horasEstimadasTarea.value = tarea.horasEstimadas || 0;
    }

    if (descripcionTarea) {
        descripcionTarea.value = tarea.descripcion || "";
    }

    await cargarDatosDelProyectoFormulario(
        tarea.idProyecto,
        tarea.idFase || "",
        tarea.idMiembroAsignado || ""
    );

    limpiarArchivosFormulario();
    await cargarArchivosEnFormulario(tarea.id);

    if (modalTarea) {
        modalTarea.classList.add("show");
    }
}

async function guardarTarea() {
    const id = idTarea ? idTarea.value : "";
    const esEdicion = id !== "";

    if (esEdicion) {
        const tareaOriginal = tareas.find(function (item) {
            return String(item.id) === String(id);
        });

        if (!puedeEditarTarea(tareaOriginal)) {
            alert(
                "No tienes permiso para guardar cambios en esta tarea."
            );
            return;
        }
    }

    if (!esEdicion && !puedeCrearTareas()) {
        alert(
            "No tienes permiso para crear tareas."
        );
        return;
    }

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

        if (tituloTarea) {
            tituloTarea.focus();
        }

        return;
    }

    if (idProyectoSeleccionado === "") {
        alert("Selecciona un proyecto.");

        if (proyectoTarea) {
            proyectoTarea.focus();
        }

        return;
    }

    if (!puedeUsarProyecto(idProyectoSeleccionado)) {
        alert(
            "No tienes permiso para guardar tareas en este proyecto."
        );
        return;
    }

    if (idMiembroAsignado === "") {
        alert(
            "Selecciona una persona asignada a este proyecto."
        );

        if (asignadoTarea) {
            asignadoTarea.focus();
        }

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
            "La persona seleccionada no está asignada a este proyecto."
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

    const idUsuario = obtenerIdUsuarioActivo();

    if (!idUsuario) {
        alert(
            "No se encontró una sesión activa. Cierra sesión e inicia nuevamente."
        );
        return;
    }

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

    bloquearBotonGuardar(true);

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

        const idTareaGuardada = datos.tarea && datos.tarea.id
            ? datos.tarea.id
            : (id ? Number(id) : null);

        let resultadoArchivos = { subidos: 0, errores: [] };
        if (idTareaGuardada) {
            resultadoArchivos = await subirArchivosSeleccionados(idTareaGuardada);
        }

        cerrarModalTarea();
        await cargarTareas();

        let mensajeFinal = datos.mensaje || "Tarea guardada correctamente.";
        if (resultadoArchivos.subidos > 0) {
            mensajeFinal += `\n\n${resultadoArchivos.subidos} archivo(s) adjuntado(s).`;
        }
        if (resultadoArchivos.errores.length > 0) {
            mensajeFinal += `\n\nLa tarea se guardó, pero algunos archivos no pudieron subirse:\n- ${resultadoArchivos.errores.join("\n- ")}`;
        }
        alert(mensajeFinal);

    } catch (error) {
        console.error("Error al guardar tarea:", error);

        alert(
            error.message ||
            "No fue posible guardar la tarea. Si el frontend sí permite la acción pero Spring Boot la rechaza, falta ajustar permisos en TareaController."
        );
    } finally {
        bloquearBotonGuardar(false);
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

    limpiarArchivosFormulario();

    solicitudProyectoActual++;

    miembrosProyectoActual = [];
    fasesProyectoActual = [];
}

function bloquearBotonGuardar(estaBloqueado) {
    if (!btnGuardarTarea) {
        return;
    }

    btnGuardarTarea.disabled = estaBloqueado;

    btnGuardarTarea.textContent = estaBloqueado
        ? "Guardando..."
        : "Guardar Tarea";
}

/* =========================================================
   ARCHIVOS ADJUNTOS DE TAREAS
========================================================= */

function limpiarArchivosFormulario() {
    if (archivosTarea) archivosTarea.value = "";
    if (archivosSeleccionadosTarea) archivosSeleccionadosTarea.innerHTML = "";
    if (archivosExistentesTarea) archivosExistentesTarea.innerHTML = "";
}

function archivosSeleccionadosValidos() {
    const lista = archivosTarea ? Array.from(archivosTarea.files || []) : [];
    const permitidas = new Set([
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "txt", "csv", "jpg", "jpeg", "png", "webp", "zip"
    ]);

    if (lista.length > 5) {
        throw new Error("Selecciona como máximo 5 archivos nuevos por guardado.");
    }

    lista.forEach(function (archivo) {
        const nombre = String(archivo.name || "");
        const extension = nombre.includes(".") ? nombre.split(".").pop().toLowerCase() : "";
        if (!permitidas.has(extension)) {
            throw new Error(`El archivo ${nombre} tiene un formato no permitido.`);
        }
        if (archivo.size > 8 * 1024 * 1024) {
            throw new Error(`El archivo ${nombre} supera el máximo de 8 MB.`);
        }
    });

    return lista;
}

function renderizarArchivosSeleccionados() {
    if (!archivosSeleccionadosTarea) return;
    try {
        const lista = archivosSeleccionadosValidos();
        archivosSeleccionadosTarea.innerHTML = lista.length === 0
            ? ""
            : `<div class="task-files-title">Archivos nuevos:</div>${lista.map(function (archivo) {
                return `<div class="task-file-row"><span>📎 ${escaparHTML(archivo.name)}</span><small>${formatearTamanoArchivo(archivo.size)}</small></div>`;
            }).join("")}`;
    } catch (error) {
        if (archivosTarea) archivosTarea.value = "";
        archivosSeleccionadosTarea.innerHTML = "";
        alert(error.message);
    }
}

async function subirArchivosSeleccionados(idTareaDestino) {
    let archivos;
    try {
        archivos = archivosSeleccionadosValidos();
    } catch (error) {
        return { subidos: 0, errores: [error.message] };
    }

    const resultado = { subidos: 0, errores: [] };
    const idUsuario = obtenerIdUsuarioActivo();

    for (const archivo of archivos) {
        const formData = new FormData();
        formData.append("archivo", archivo, archivo.name);

        try {
            const respuesta = await fetch(`${API_TAREAS}/${idTareaDestino}/archivos`, {
                method: "POST",
                headers: { "X-Usuario-Id": String(idUsuario) },
                body: formData
            });
            const datos = await obtenerRespuestaJSON(respuesta);
            if (!respuesta.ok) throw new Error(datos.mensaje || "No fue posible subir el archivo.");
            resultado.subidos++;
        } catch (error) {
            resultado.errores.push(`${archivo.name}: ${error.message}`);
        }
    }

    return resultado;
}

async function cargarArchivosTarea(idTareaDestino) {
    const respuesta = await fetch(`${API_TAREAS}/${idTareaDestino}/archivos`, {
        headers: obtenerHeadersSesion()
    });
    const datos = await obtenerRespuestaJSON(respuesta);
    if (!respuesta.ok) throw new Error(datos.mensaje || "No fue posible cargar los archivos.");
    return datos;
}

async function cargarArchivosEnFormulario(idTareaDestino) {
    if (!archivosExistentesTarea) return;
    archivosExistentesTarea.innerHTML = '<div class="task-files-loading">Cargando archivos adjuntos...</div>';
    try {
        const datos = await cargarArchivosTarea(idTareaDestino);
        renderizarListaArchivos(datos.archivos || [], archivosExistentesTarea, idTareaDestino, !!datos.puedeGestionar, true);
    } catch (error) {
        archivosExistentesTarea.innerHTML = `<div class="task-files-empty">${escaparHTML(error.message)}</div>`;
    }
}

async function abrirArchivosTarea(idTareaDestino) {
    idTareaArchivosAbierta = idTareaDestino;
    const tarea = tareas.find(function (item) { return String(item.id) === String(idTareaDestino); });
    if (tituloArchivosTarea) tituloArchivosTarea.textContent = tarea ? `Archivos: ${tarea.titulo}` : "Archivos de la tarea";
    if (listaArchivosTarea) listaArchivosTarea.innerHTML = '<div class="task-files-loading">Cargando archivos...</div>';
    if (modalArchivosTarea) modalArchivosTarea.classList.add("show");

    try {
        const datos = await cargarArchivosTarea(idTareaDestino);
        renderizarListaArchivos(datos.archivos || [], listaArchivosTarea, idTareaDestino, !!datos.puedeGestionar, false);
    } catch (error) {
        if (listaArchivosTarea) listaArchivosTarea.innerHTML = `<div class="task-files-empty">${escaparHTML(error.message)}</div>`;
    }
}

function cerrarModalArchivosTarea() {
    idTareaArchivosAbierta = null;
    if (modalArchivosTarea) modalArchivosTarea.classList.remove("show");
}

function renderizarListaArchivos(archivos, contenedor, idTareaDestino, puedeGestionar, incluirTitulo) {
    if (!contenedor) return;
    if (!Array.isArray(archivos) || archivos.length === 0) {
        contenedor.innerHTML = incluirTitulo
            ? '<div class="task-files-title">Archivos guardados:</div><div class="task-files-empty">Esta tarea todavía no tiene archivos adjuntos.</div>'
            : '<div class="task-files-empty">Esta tarea todavía no tiene archivos adjuntos.</div>';
        return;
    }

    contenedor.innerHTML = `${incluirTitulo ? '<div class="task-files-title">Archivos guardados:</div>' : ""}${archivos.map(function (archivo) {
        return `<div class="task-file-row task-file-saved">
            <div class="task-file-info">
                <strong>📄 ${escaparHTML(archivo.nombreArchivo || "Archivo")}</strong>
                <small>${formatearTamanoArchivo(archivo.tamanoBytes || 0)}${archivo.usuarioSubio ? ` · Subido por ${escaparHTML(archivo.usuarioSubio)}` : ""}</small>
            </div>
            <div class="task-file-actions">
                <button type="button" onclick="descargarArchivoTarea(${idTareaDestino}, ${archivo.id}, '${escaparAtributoJS(archivo.nombreArchivo || "archivo")}')">Descargar</button>
                ${puedeGestionar ? `<button type="button" class="btn-file-delete" onclick="eliminarArchivoTarea(${idTareaDestino}, ${archivo.id})">Eliminar</button>` : ""}
            </div>
        </div>`;
    }).join("")}`;
}

async function descargarArchivoTarea(idTareaDestino, idArchivo, nombreArchivo) {
    try {
        const respuesta = await fetch(`${API_TAREAS}/${idTareaDestino}/archivos/${idArchivo}/descargar`, {
            headers: obtenerHeadersSesion()
        });
        if (!respuesta.ok) {
            const datos = await obtenerRespuestaJSON(respuesta);
            throw new Error(datos.mensaje || "No fue posible descargar el archivo.");
        }
        const blob = await respuesta.blob();
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombreArchivo || "archivo";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (error) {
        alert(error.message || "No fue posible descargar el archivo.");
    }
}

async function eliminarArchivoTarea(idTareaDestino, idArchivo) {
    if (!confirm("¿Deseas eliminar este archivo adjunto?")) return;
    try {
        const respuesta = await fetch(`${API_TAREAS}/${idTareaDestino}/archivos/${idArchivo}`, {
            method: "DELETE",
            headers: obtenerHeadersSesion()
        });
        const datos = await obtenerRespuestaJSON(respuesta);
        if (!respuesta.ok) throw new Error(datos.mensaje || "No fue posible eliminar el archivo.");

        if (idTarea && String(idTarea.value) === String(idTareaDestino)) {
            await cargarArchivosEnFormulario(idTareaDestino);
        }
        if (idTareaArchivosAbierta && String(idTareaArchivosAbierta) === String(idTareaDestino)) {
            const actualizados = await cargarArchivosTarea(idTareaDestino);
            renderizarListaArchivos(actualizados.archivos || [], listaArchivosTarea, idTareaDestino, !!actualizados.puedeGestionar, false);
        }
    } catch (error) {
        alert(error.message || "No fue posible eliminar el archivo.");
    }
}

function formatearTamanoArchivo(bytes) {
    const numero = Number(bytes || 0);
    if (numero < 1024) return `${numero} B`;
    if (numero < 1024 * 1024) return `${(numero / 1024).toFixed(1)} KB`;
    return `${(numero / (1024 * 1024)).toFixed(1)} MB`;
}

function escaparAtributoJS(valor) {
    return String(valor || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\r/g, "")
        .replace(/\n/g, " ");
}

/* =========================================================
   TABLA
========================================================= */

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

function renderizarTareasTabla() {
    if (!tablaTareas) {
        return;
    }

    const lista = obtenerTareasFiltradas();

    tablaTareas.innerHTML = "";

    if (lista.length === 0) {
        tablaTareas.innerHTML = `
            <tr>
                <td colspan="8" class="empty-row">
                    No hay tareas para mostrar.
                </td>
            </tr>
        `;
        return;
    }

    lista.forEach(function (tarea) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${escaparHTML(tarea.titulo || "—")}</td>

            <td>${escaparHTML(tarea.proyectoNombre || "—")}</td>

            <td>${escaparHTML(tarea.faseNombre || "Sin fase")}</td>

            <td>
                <strong>
                    ${escaparHTML(tarea.miembroNombre || "—")}
                </strong>
                ${
                    tarea.miembroRol
                        ? `
                            <br>
                            <small>
                                ${escaparHTML(tarea.miembroRol)}
                            </small>
                          `
                        : ""
                }
            </td>

            <td>
                <span class="badge ${
                    obtenerColorEstado(tarea.estado)
                }">
                    ${escaparHTML(tarea.estado || "—")}
                </span>
            </td>

            <td>${escaparHTML(tarea.prioridad || "—")}</td>

            <td>${Number(tarea.horasEstimadas || 0)}</td>

            <td>
                <div class="table-actions">
                    <button
                        type="button"
                        onclick="abrirArchivosTarea(${tarea.id})">
                        Archivos
                    </button>
                    ${
                        puedeEditarTarea(tarea)
                            ? `
                                <button
                                    type="button"
                                    onclick="editarTarea(${tarea.id})">
                                    Editar
                                </button>
                              `
                            : `
                                <span class="solo-lectura-tabla">
                                    Solo lectura
                                </span>
                              `
                    }
                </div>
            </td>
        `;

        tablaTareas.appendChild(fila);
    });
}

function mostrarCargando() {
    if (!tablaTareas) {
        return;
    }

    tablaTareas.innerHTML = `
        <tr>
            <td colspan="8" class="empty-row">
                Cargando tareas...
            </td>
        </tr>
    `;
}

function mostrarError(mensaje) {
    if (!tablaTareas) {
        return;
    }

    tablaTareas.innerHTML = `
        <tr>
            <td colspan="8" class="empty-row">
                ${escaparHTML(mensaje)}
            </td>
        </tr>
    `;
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

function obtenerColorEstado(estado) {
    const texto = normalizarTexto(estado);

    if (texto.includes("completada")) return "green";
    if (texto.includes("progreso")) return "orange";
    if (texto.includes("bloqueada")) return "red";
    if (texto.includes("pendiente")) return "blue";

    return "gray";
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}