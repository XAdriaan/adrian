const API_PROYECTOS = window.apiUrl("/api/proyectos");
const API_TAREAS = window.apiUrl("/api/tareas");
const API_MIEMBROS = window.apiUrl("/api/miembros");
const API_MIEMBRO_SESION = window.apiUrl("/api/miembros/mi-sesion");
const API_MIEMBROS_PROYECTO =
    window.apiUrl("/api/miembros-proyecto");

let proyectoActual = null;
let fasesProyecto = [];
let tareasProyecto = [];
let miembrosProyecto = [];
let miembrosEquipo = [];
let miembroSesion = null;
let usuarioActivo = obtenerUsuarioActivo();
let reunionActivaProyecto = null;
let reunionesProyecto = [];

document.addEventListener("DOMContentLoaded", async function () {
    usuarioActivo = obtenerUsuarioActivo();

    configurarTabs();
    configurarEventos();

    const idProyecto = obtenerParametroURL("id");

    if (!idProyecto) {
        mostrarProyectoNoEncontrado(
            "No se recibió un identificador válido del proyecto."
        );
        return;
    }

    await inicializarDetalleProyecto(idProyecto);
});

/* =========================================================
   INICIALIZACIÓN
========================================================= */

async function inicializarDetalleProyecto(idProyecto) {
    try {
        await cargarProyectoActual(idProyecto);

        if (!proyectoActual || !proyectoActual.id) {
            throw new Error(
                "El proyecto recibido no contiene información válida."
            );
        }

        renderizarProyecto();
        renderizarAlcanceProyecto();

        const resultados = await Promise.allSettled([
            cargarFasesProyecto(),
            cargarTareasProyecto(),
            cargarMiembrosProyecto(),
            cargarMiembroSesion(),
            cargarMiembrosEquipo(),
            cargarReunionesProyecto()
        ]);

        resultados.forEach(function (resultado) {
            if (resultado.status === "rejected") {
                console.warn(
                    "Una sección del detalle no pudo cargarse:",
                    resultado.reason
                );
            }
        });

        configurarPermisosVisuales();
        renderizarProyecto();
        renderizarAlcanceProyecto();
        renderizarFasesProyecto();
        renderizarPlanTareasProyecto();
        renderizarEquipoProyecto();
        renderizarReunionesProyecto();
        actualizarAvanceProyecto();

    } catch (error) {
        console.error("Error al cargar detalle del proyecto:", error);

        mostrarProyectoNoEncontrado(
            error.message ||
            "No fue posible cargar la información del proyecto."
        );
    }
}

/* =========================================================
   SESIÓN Y PERMISOS
========================================================= */

function obtenerUsuarioActivo() {
    try {
        return JSON.parse(
            localStorage.getItem("usuarioActivo")
        ) || null;
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
    if (window.PMOPermisos && window.PMOPermisos.tiene("proyectos.ver_todos")) return true;

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


function tienePermisoDetalleProyecto(clave) {
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

function obtenerIdMiembroDesdeSesion() {
    if (!usuarioActivo) {
        return null;
    }

    return usuarioActivo.idMiembro ||
        usuarioActivo.miembroId ||
        usuarioActivo.id_miembro ||
        usuarioActivo.idMiembroEquipo ||
        null;
}

function obtenerIdMiembroUsuarioActivo() {
    const idDesdeSesion = obtenerIdMiembroDesdeSesion();

    if (idDesdeSesion) {
        return idDesdeSesion;
    }

    if (miembroSesion) {
        return miembroSesion.id ||
            miembroSesion.idMiembro ||
            miembroSesion.id_miembro ||
            null;
    }

    const idUsuario = obtenerIdUsuarioActivo();

    if (!idUsuario) {
        return null;
    }

    const miembro = miembrosEquipo.find(function (item) {
        return String(
            item.idUsuario ||
            item.usuarioId ||
            item.id_usuario ||
            ""
        ) === String(idUsuario);
    });

    return miembro
        ? miembro.id ||
          miembro.idMiembro ||
          miembro.id_miembro ||
          null
        : null;
}

function esResponsableProyecto() {
    if (!proyectoActual) {
        return false;
    }

    const idMiembroActivo =
        obtenerIdMiembroUsuarioActivo();

    if (!idMiembroActivo) {
        return false;
    }

    return String(proyectoActual.idResponsable) ===
        String(idMiembroActivo);
}

function esMiembroDelProyecto() {
    const idMiembroActivo =
        obtenerIdMiembroUsuarioActivo();

    if (!idMiembroActivo) {
        return false;
    }

    return miembrosProyecto.some(function (miembro) {
        return String(miembro.idMiembro) ===
            String(idMiembroActivo);
    });
}

function puedeGestionarMiembrosProyecto() {
    return tienePermisoDetalleProyecto("proyectos.miembros.gestionar");
}

function puedeRetirarMiembrosProyecto() {
    return tienePermisoDetalleProyecto("proyectos.miembros.gestionar");
}

function puedeCrearTareasEnProyecto() {
    if (esUsuarioConsulta()) return false;

    // Un perfil con acceso global de lectura (por ejemplo Supervisor) no
    // obtiene automáticamente permisos de edición.
    if (esAdministrador()) {
        return tienePermisoDetalleProyecto("tareas.gestionar");
    }

    return esResponsableProyecto() || esMiembroDelProyecto();
}

function puedeCrearReunionProyecto() {
    if (window.PMOPermisos?.esAdministradorReal?.()) return true;
    return esMiembroDelProyecto();
}

function puedeExportarImprimirProyecto() {
    if (esUsuarioConsulta()) return false;

    if (esAdministrador()) {
        return tienePermisoDetalleProyecto("reportes.exportar");
    }

    return esResponsableProyecto() || esMiembroDelProyecto();
}

function configurarPermisosVisuales() {
    const btnAgregarMiembro =
        document.getElementById("btnAgregarMiembro");

    const btnNuevaReunion =
        document.getElementById("btnNuevaReunion");

    const btnUnirseReunionActiva =
        document.getElementById("btnUnirseReunionActiva");

    const btnExportarFases =
        document.getElementById("btnExportarFases");

    const btnImprimirProyecto =
        document.getElementById("btnImprimirProyecto");

    if (btnAgregarMiembro) {
        btnAgregarMiembro.style.display =
            puedeGestionarMiembrosProyecto()
                ? "inline-block"
                : "none";
    }

    if (btnNuevaReunion) {
        btnNuevaReunion.style.display =
            puedeCrearReunionProyecto()
                ? "inline-block"
                : "none";
    }

    if (btnExportarFases) {
        btnExportarFases.style.display =
            puedeExportarImprimirProyecto()
                ? "inline-block"
                : "none";
    }

    if (btnImprimirProyecto) {
        btnImprimirProyecto.style.display =
            puedeExportarImprimirProyecto()
                ? "inline-block"
                : "none";
    }
}

/* =========================================================
   PETICIONES API
========================================================= */

async function cargarProyectoActual(idProyecto) {
    if (
        !idProyecto ||
        idProyecto === "undefined" ||
        idProyecto === "null"
    ) {
        throw new Error(
            "No se recibió un identificador válido del proyecto."
        );
    }

    const respuesta = await fetch(
        `${API_PROYECTOS}/${idProyecto}`,
        {
            headers: obtenerHeadersSesion()
        }
    );

    const datos = await obtenerRespuestaJSON(respuesta);

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje ||
            "No fue posible obtener el proyecto."
        );
    }

    proyectoActual = datos.proyecto || datos || null;

    if (!proyectoActual || !proyectoActual.id) {
        throw new Error(
            "El proyecto fue recibido sin un identificador válido."
        );
    }
}

async function cargarReunionesProyecto() {
    const respuesta = await fetch(
        `${API_PROYECTOS}/${proyectoActual.id}/reuniones`,
        { headers: obtenerHeadersSesion() }
    );

    const datos = await obtenerRespuestaJSON(respuesta);

    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No fue posible consultar las reuniones del proyecto.");
    }

    reunionesProyecto = Array.isArray(datos.reuniones) ? datos.reuniones : [];
    reunionActivaProyecto = reunionesProyecto.find(function (reunion) {
        return normalizarTexto(reunion.estado) === "activa";
    }) || null;
}

async function cargarFasesProyecto() {
    const respuesta = await fetch(
        `${API_PROYECTOS}/${proyectoActual.id}/fases`,
        {
            headers: obtenerHeadersSesion()
        }
    );

    const datos = await obtenerRespuestaJSON(respuesta);

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje ||
            "No fue posible cargar las fases del proyecto."
        );
    }

    fasesProyecto = Array.isArray(datos.fases)
        ? ordenarFases(datos.fases)
        : [];
}

async function cargarTareasProyecto() {
    const respuesta = await fetch(
        `${API_TAREAS}/proyecto/${proyectoActual.id}`,
        {
            headers: obtenerHeadersSesion()
        }
    );

    const datos = await obtenerRespuestaJSON(respuesta);

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje ||
            "No fue posible cargar las tareas del proyecto."
        );
    }

    tareasProyecto = Array.isArray(datos.tareas)
        ? datos.tareas
        : [];
}

async function cargarMiembrosProyecto() {
    const respuesta = await fetch(
        `${API_MIEMBROS_PROYECTO}/proyecto/${proyectoActual.id}`,
        {
            headers: obtenerHeadersSesion()
        }
    );

    const datos = await obtenerRespuestaJSON(respuesta);

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje ||
            "No fue posible cargar los integrantes del proyecto."
        );
    }

    miembrosProyecto = Array.isArray(datos.miembros)
        ? datos.miembros
        : [];
}

async function cargarMiembroSesion() {
    try {
        const respuesta = await fetch(
            API_MIEMBRO_SESION,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar el miembro activo."
            );
        }

        miembroSesion = datos.miembro || null;

    } catch (error) {
        console.warn(
            "No se pudo cargar el miembro activo:",
            error
        );

        miembroSesion = null;
    }
}

async function cargarMiembrosEquipo() {
    if (!esAdministrador()) {
        miembrosEquipo = miembroSesion
            ? [miembroSesion]
            : [];

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
                datos.mensaje ||
                "No fue posible cargar el equipo general."
            );
        }

        miembrosEquipo = Array.isArray(datos.miembros)
            ? datos.miembros
            : [];

    } catch (error) {
        console.warn(
            "No se pudo cargar el equipo general.",
            error
        );

        miembrosEquipo = [];
    }
}

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

/* =========================================================
   PESTAÑAS Y EVENTOS
========================================================= */

function configurarTabs() {
    const botones = document.querySelectorAll(".tab-button");
    const contenidos = document.querySelectorAll(".tab-content");

    botones.forEach(function (boton) {
        boton.addEventListener("click", function () {
            const tab = boton.dataset.tab;

            botones.forEach(function (item) {
                item.classList.remove("active");
            });

            contenidos.forEach(function (contenido) {
                contenido.classList.remove("active");
            });

            boton.classList.add("active");

            const contenidoActivo = document.getElementById(
                "tab-" + tab
            );

            if (contenidoActivo) {
                contenidoActivo.classList.add("active");
            }
        });
    });
}

function configurarEventos() {
    const btnExportarFases =
        document.getElementById("btnExportarFases");

    const btnImprimirProyecto =
        document.getElementById("btnImprimirProyecto");

    const btnNuevaReunion =
        document.getElementById("btnNuevaReunion");

    const btnCerrarModalTareaFase =
        document.getElementById("btnCerrarModalTareaFase");

    const btnCancelarTareaFase =
        document.getElementById("btnCancelarTareaFase");

    const formTareaFase =
        document.getElementById("formTareaFase");

    const modalTareaFase =
        document.getElementById("modalTareaFase");

    const btnAgregarMiembro =
        document.getElementById("btnAgregarMiembro");

    const btnCerrarModalMiembro =
        document.getElementById("btnCerrarModalMiembro");

    const btnCancelarMiembroProyecto =
        document.getElementById("btnCancelarMiembroProyecto");

    const formAgregarMiembro =
        document.getElementById("formAgregarMiembro");

    const modalAgregarMiembro =
        document.getElementById("modalAgregarMiembro");

    if (btnExportarFases) {
        btnExportarFases.addEventListener(
            "click",
            exportarFasesCSV
        );
    }

    if (btnImprimirProyecto) {
        btnImprimirProyecto.addEventListener(
            "click",
            function () {
                if (!puedeExportarImprimirProyecto()) {
                    alert(
                        "No tienes permiso para imprimir este proyecto."
                    );
                    return;
                }

                window.print();
            }
        );
    }

    if (btnNuevaReunion) {
        btnNuevaReunion.addEventListener(
            "click",
            async function () {
                if (!puedeCrearReunionProyecto()) {
                    alert(
                        "Solo el administrador o el responsable del proyecto puede crear reuniones."
                    );
                    return;
                }

                if (!proyectoActual) return;

                if (reunionActivaProyecto) {
                    abrirReunion(reunionActivaProyecto);
                    return;
                }

                btnNuevaReunion.disabled = true;
                const textoOriginal = btnNuevaReunion.textContent;
                btnNuevaReunion.textContent = "Creando reunión...";

                try {
                    const respuesta = await fetch(
                        `${API_PROYECTOS}/${proyectoActual.id}/reuniones`,
                        {
                            method: "POST",
                            headers: obtenerHeadersSesion()
                        }
                    );
                    const datos = await obtenerRespuestaJSON(respuesta);
                    if (!respuesta.ok || !datos.reunion) {
                        throw new Error(datos.mensaje || "No fue posible crear la reunión.");
                    }

                    abrirReunion(datos.reunion);
                } catch (error) {
                    console.error("No fue posible crear la reunión:", error);
                    alert(error.message || "No fue posible crear la reunión.");
                    btnNuevaReunion.disabled = false;
                    btnNuevaReunion.textContent = textoOriginal;
                }
            }
        );
    }

    if (btnUnirseReunionActiva) {
        btnUnirseReunionActiva.addEventListener("click", function () {
            if (!reunionActivaProyecto) {
                alert("Ya no existe una reunión activa para este proyecto.");
                return;
            }
            abrirReunion(reunionActivaProyecto);
        });
    }

    if (btnCerrarModalTareaFase) {
        btnCerrarModalTareaFase.addEventListener(
            "click",
            cerrarModalTareaFase
        );
    }

    if (btnCancelarTareaFase) {
        btnCancelarTareaFase.addEventListener(
            "click",
            cerrarModalTareaFase
        );
    }

    if (modalTareaFase) {
        modalTareaFase.addEventListener(
            "click",
            function (event) {
                if (event.target === modalTareaFase) {
                    cerrarModalTareaFase();
                }
            }
        );
    }

    if (formTareaFase) {
        formTareaFase.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                guardarTareaFase();
            }
        );
    }

    if (btnAgregarMiembro) {
        btnAgregarMiembro.addEventListener(
            "click",
            abrirModalAgregarMiembro
        );
    }

    if (btnCerrarModalMiembro) {
        btnCerrarModalMiembro.addEventListener(
            "click",
            cerrarModalAgregarMiembro
        );
    }

    if (btnCancelarMiembroProyecto) {
        btnCancelarMiembroProyecto.addEventListener(
            "click",
            cerrarModalAgregarMiembro
        );
    }

    if (modalAgregarMiembro) {
        modalAgregarMiembro.addEventListener(
            "click",
            function (event) {
                if (event.target === modalAgregarMiembro) {
                    cerrarModalAgregarMiembro();
                }
            }
        );
    }

    if (formAgregarMiembro) {
        formAgregarMiembro.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                guardarMiembroProyecto();
            }
        );
    }
}

/* =========================================================
   DATOS DEL PROYECTO
========================================================= */

function renderizarProyecto() {
    if (!proyectoActual) {
        return;
    }

    actualizarTexto(
        "projectName",
        proyectoActual.nombre || "Proyecto sin nombre"
    );

    actualizarTexto(
        "projectClient",
        proyectoActual.organizacionNombre ||
        proyectoActual.clienteArea ||
        "Sin cliente / área"
    );

    actualizarTexto(
        "projectStatus",
        proyectoActual.estado || "Sin estado"
    );

    actualizarTexto(
        "infoNombre",
        proyectoActual.nombre || "—"
    );

    actualizarTexto(
        "infoCliente",
        proyectoActual.organizacionNombre ||
        proyectoActual.clienteArea ||
        "—"
    );

    actualizarTexto(
        "infoResponsable",
        proyectoActual.responsableNombre || "—"
    );

    actualizarTexto(
        "infoPrioridad",
        proyectoActual.prioridad || "—"
    );

    actualizarTexto(
        "infoFechaInicio",
        formatearFecha(proyectoActual.fechaInicio)
    );

    actualizarTexto(
        "infoFechaFin",
        formatearFecha(proyectoActual.fechaFin)
    );

    actualizarTexto(
        "infoDescripcion",
        proyectoActual.descripcion || "—"
    );

    const badgeEstado =
        document.getElementById("projectStatus");

    if (badgeEstado) {
        badgeEstado.className =
            "badge " +
            obtenerColorEstadoProyecto(proyectoActual.estado);
    }

    const indicadorSalud =
        document.getElementById("healthIndicator");

    if (indicadorSalud) {
        indicadorSalud.className =
            "health-indicator " +
            obtenerSaludProyecto();
    }
}

function renderizarAlcanceProyecto() {
    const contenedor = document.getElementById("projectScopeChips");
    const descripcion = document.getElementById("projectScopeDescription");
    if (!contenedor || !proyectoActual) return;

    const fuente = proyectoActual.clavesFuente || proyectoActual.clienteArea || "";
    const componentes = String(fuente)
        .split(/\s*\/\s*|\s*·\s*|\s*,\s*/g)
        .map(v => v.trim())
        .filter(Boolean)
        .filter((v, i, arr) => arr.findIndex(x => normalizarTexto(x) === normalizarTexto(v)) === i);

    if (descripcion) {
        descripcion.textContent = proyectoActual.descripcion ||
            "El detalle muestra las soluciones, módulos o líneas de trabajo que forman parte del proyecto asignado.";
    }

    if (!componentes.length) {
        contenedor.innerHTML = '<span class="project-scope-empty">No se registraron componentes separados para este proyecto.</span>';
        return;
    }

    contenedor.innerHTML = "";
    componentes.forEach(componente => {
        const chip = document.createElement("span");
        chip.className = "project-scope-chip";
        chip.textContent = componente;
        contenedor.appendChild(chip);
    });
}

function actualizarAvanceProyecto() {
    const totalTareas = tareasProyecto.length;

    const tareasCompletadas = tareasProyecto.filter(
        function (tarea) {
            return normalizarTexto(tarea.estado) === "completada";
        }
    ).length;

    let porcentaje = Number(
        proyectoActual
            ? proyectoActual.porcentajeAvance || 0
            : 0
    );

    if (totalTareas > 0) {
        porcentaje = Math.round(
            (tareasCompletadas / totalTareas) * 100
        );
    }

    actualizarTexto("projectProgress", porcentaje + "%");
    actualizarTexto("projectTasks", totalTareas);
    actualizarTexto("projectMembers", miembrosProyecto.length);

    const progressFill =
        document.getElementById("progressFill");

    if (progressFill) {
        progressFill.style.width = porcentaje + "%";
    }

    renderizarPlanTareasProyecto();
}

/* =========================================================
   FASES Y TAREAS
========================================================= */

function ordenarFases(fases) {
    return fases.slice().sort(function (a, b) {
        const ordenA = convertirOrdenFase(a.numeroOrden);
        const ordenB = convertirOrdenFase(b.numeroOrden);

        return ordenA - ordenB;
    });
}

function convertirOrdenFase(valor) {
    const texto = String(valor || "0")
        .replace(",", ".");

    const numero = Number(texto);

    return Number.isNaN(numero)
        ? 0
        : numero;
}

function renderizarFasesProyecto() {
    const contenedor = document.getElementById("phaseList");

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    if (fasesProyecto.length === 0) {
        contenedor.innerHTML = `
            <p class="project-empty-text">
                No se encontraron fases para este proyecto.
                Recarga la página o verifica que Spring Boot esté ejecutándose.
            </p>
        `;

        renderizarTareasSinFase();
        return;
    }

    fasesProyecto.forEach(function (fase) {
        const tareasFase = tareasProyecto.filter(function (tarea) {
            return String(tarea.idFase) === String(fase.id);
        });

        const avanceFase =
            calcularProgresoTareas(tareasFase);

        const estadoVisual =
            obtenerEstadoVisualFase(fase, avanceFase);

        const card = document.createElement("article");

        card.className =
            "phase-card estado-" + estadoVisual;

        const encabezado = document.createElement("div");

        encabezado.className = "phase-row";

        const numero = document.createElement("div");
        numero.className = "phase-number";
        numero.textContent = fase.numeroOrden || "—";

        const punto = document.createElement("div");
        punto.className = "phase-dot " + estadoVisual;

        const abreviatura = document.createElement("div");
        abreviatura.className = "phase-abbr";
        abreviatura.textContent =
            obtenerAbreviaturaFase(fase.nombre);

        const nombre = document.createElement("div");
        nombre.className = "phase-name";
        nombre.textContent =
            fase.nombre || "Fase sin nombre";

        const estado = document.createElement("div");
        estado.className = "phase-status";
        estado.textContent =
            fase.estado || "No iniciado";

        const barraMini = document.createElement("div");
        barraMini.className = "phase-progress-mini";

        const rellenoMini = document.createElement("div");
        rellenoMini.className = "phase-progress-fill";
        rellenoMini.style.width = avanceFase + "%";

        barraMini.appendChild(rellenoMini);

        const porcentaje = document.createElement("div");
        porcentaje.className = "phase-percent";
        porcentaje.textContent = avanceFase + "%";

        encabezado.appendChild(numero);
        encabezado.appendChild(punto);
        encabezado.appendChild(abreviatura);
        encabezado.appendChild(nombre);
        encabezado.appendChild(estado);
        encabezado.appendChild(barraMini);
        encabezado.appendChild(porcentaje);

        if (puedeCrearTareasEnProyecto()) {
            const botonCrear = document.createElement("button");

            botonCrear.type = "button";
            botonCrear.className = "btn-add-task-phase";
            botonCrear.textContent = "+ Crear tarea";

            botonCrear.addEventListener(
                "click",
                function () {
                    abrirModalTareaFase(fase);
                }
            );

            encabezado.appendChild(botonCrear);
        }

        card.appendChild(encabezado);

        const contenedorTareas =
            document.createElement("div");

        contenedorTareas.className = "phase-tasks";

        if (tareasFase.length === 0) {
            contenedorTareas.innerHTML = `
                <p class="project-empty-text">
                    No hay tareas registradas en esta fase.
                </p>
            `;
        } else {
            tareasFase.forEach(function (tarea) {
                contenedorTareas.appendChild(
                    crearElementoTarea(tarea)
                );
            });
        }

        card.appendChild(contenedorTareas);
        contenedor.appendChild(card);
    });

    renderizarTareasSinFase();
}

function renderizarTareasSinFase() {
    const contenedor = document.getElementById("phaseList");

    if (!contenedor) {
        return;
    }

    const tareasSinFase = tareasProyecto.filter(function (tarea) {
        return !tarea.idFase;
    });

    if (tareasSinFase.length === 0) {
        return;
    }

    const card = document.createElement("article");

    card.className = "phase-card estado-no-iniciado";

    card.innerHTML = `
        <div class="phase-row">
            <div class="phase-number">—</div>
            <div class="phase-dot no-iniciado"></div>
            <div class="phase-abbr">TG</div>
            <div class="phase-name">Tareas generales del proyecto</div>
            <div class="phase-status">Sin fase</div>
            <div class="phase-progress-mini">
                <div
                    class="phase-progress-fill"
                    style="width: ${calcularProgresoTareas(
                        tareasSinFase
                    )}%;">
                </div>
            </div>
            <div class="phase-percent">
                ${calcularProgresoTareas(tareasSinFase)}%
            </div>
        </div>
    `;

    const contenedorTareas =
        document.createElement("div");

    contenedorTareas.className = "phase-tasks";

    tareasSinFase.forEach(function (tarea) {
        contenedorTareas.appendChild(
            crearElementoTarea(tarea)
        );
    });

    card.appendChild(contenedorTareas);
    contenedor.appendChild(card);
}

function crearElementoTarea(tarea) {
    const item = document.createElement("div");

    item.className = "phase-task";

    const informacion = document.createElement("div");

    const titulo = document.createElement("strong");
    titulo.textContent =
        tarea.titulo || "Tarea sin título";

    const detalles = document.createElement("span");
    detalles.textContent =
        "Asignado: " +
        (tarea.miembroNombre || "Sin asignar") +
        " · " +
        (tarea.horasEstimadas || 0) +
        " h";

    informacion.appendChild(titulo);
    informacion.appendChild(detalles);

    const badge = document.createElement("span");

    badge.className =
        "badge " +
        obtenerColorEstadoTarea(tarea.estado);

    badge.textContent =
        tarea.estado || "Pendiente";

    item.appendChild(informacion);
    item.appendChild(badge);

    return item;
}


function renderizarPlanTareasProyecto() {
    const contenedor = document.getElementById("taskPlanList");
    const resumen = document.getElementById("taskPlanSummary");

    if (!contenedor) return;

    if (!Array.isArray(tareasProyecto) || tareasProyecto.length === 0) {
        contenedor.innerHTML = `
            <div class="task-overview-empty">
                Este proyecto todavía no tiene tareas registradas.
            </div>
        `;
        if (resumen) resumen.textContent = "0 tareas";
        return;
    }

    const ordenadas = tareasProyecto.slice().sort(function (a, b) {
        const fechaA = String(a.fechaLimite || a.fechaInicio || "9999-12-31");
        const fechaB = String(b.fechaLimite || b.fechaInicio || "9999-12-31");
        return fechaA.localeCompare(fechaB);
    });

    const completadas = ordenadas.filter(t =>
        normalizarTexto(t.estado) === "completada"
    ).length;

    const horas = ordenadas.reduce((total, tarea) =>
        total + Number(tarea.horasEstimadas || 0), 0
    );

    if (resumen) {
        resumen.textContent =
            `${completadas}/${ordenadas.length} completadas · ${horas} h estimadas`;
    }

    contenedor.innerHTML = "";

    ordenadas.forEach(function (tarea, indice) {
        const item = document.createElement("article");
        item.className = "task-overview-item";

        const numero = document.createElement("span");
        numero.className = "task-overview-number";
        numero.textContent = String(indice + 1).padStart(2, "0");

        const cuerpo = document.createElement("div");
        cuerpo.className = "task-overview-body";

        const titulo = document.createElement("strong");
        titulo.textContent = tarea.titulo || "Tarea sin título";

        const descripcion = document.createElement("p");
        descripcion.textContent = tarea.descripcion || "Sin descripción registrada.";

        const meta = document.createElement("div");
        meta.className = "task-overview-meta";

        const responsable = document.createElement("span");
        responsable.textContent = "Responsable: " + (tarea.miembroNombre || "Por asignar");

        const horasTarea = document.createElement("span");
        horasTarea.textContent = `${Number(tarea.horasEstimadas || 0)} h`;

        const fecha = document.createElement("span");
        fecha.textContent = tarea.fechaLimite
            ? "Límite: " + formatearFecha(tarea.fechaLimite)
            : "Sin fecha límite";

        meta.append(responsable, horasTarea, fecha);
        cuerpo.append(titulo, descripcion, meta);

        const estado = document.createElement("span");
        estado.className = "badge " + obtenerColorEstadoTarea(tarea.estado);
        estado.textContent = tarea.estado || "Pendiente";

        item.append(numero, cuerpo, estado);
        contenedor.appendChild(item);
    });
}

function calcularProgresoTareas(tareas) {
    if (!Array.isArray(tareas) || tareas.length === 0) {
        return 0;
    }

    const completadas = tareas.filter(function (tarea) {
        return normalizarTexto(tarea.estado) === "completada";
    }).length;

    return Math.round(
        (completadas / tareas.length) * 100
    );
}

function obtenerEstadoVisualFase(fase, avanceFase) {
    const estado = normalizarTexto(fase.estado);

    if (avanceFase === 100 || estado.includes("completado")) {
        return "completada";
    }

    if (estado.includes("proceso")) {
        return "progreso";
    }

    if (estado.includes("pendiente")) {
        return "pendiente";
    }

    if (estado.includes("no entregado")) {
        return "no-entregado";
    }

    return "no-iniciado";
}

/* =========================================================
   CREAR TAREA DESDE FASE
========================================================= */

function abrirModalTareaFase(fase) {
    if (!puedeCrearTareasEnProyecto()) {
        alert(
            "No tienes permiso para crear tareas dentro de este proyecto."
        );
        return;
    }

    const modal =
        document.getElementById("modalTareaFase");

    const form =
        document.getElementById("formTareaFase");

    const inputFase =
        document.getElementById("faseTareaProyecto");

    const tituloModal =
        document.getElementById("tituloModalTareaFase");

    const estado =
        document.getElementById("estadoTareaFase");

    const prioridad =
        document.getElementById("prioridadTareaFase");

    const horas =
        document.getElementById("horasTareaFase");

    if (!modal || !form) {
        return;
    }

    form.reset();

    if (inputFase) {
        inputFase.value = fase.id || "";
    }

    if (tituloModal) {
        tituloModal.textContent =
            "Nueva tarea - " +
            (fase.nombre || "Fase");
    }

    if (estado) {
        estado.value = "Pendiente";
    }

    if (prioridad) {
        prioridad.value = "Media";
    }

    if (horas) {
        horas.value = 0;
    }

    cargarMiembrosProyectoEnSelectTarea();

    modal.classList.add("show");
}

function cerrarModalTareaFase() {
    const modal =
        document.getElementById("modalTareaFase");

    const form =
        document.getElementById("formTareaFase");

    if (modal) {
        modal.classList.remove("show");
    }

    if (form) {
        form.reset();
    }
}

function cargarMiembrosProyectoEnSelectTarea() {
    const select =
        document.getElementById("asignadoTareaFase");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Selecciona una persona del proyecto
        </option>
    `;

    if (miembrosProyecto.length === 0) {
        select.innerHTML = `
            <option value="">
                No hay integrantes asignados a este proyecto
            </option>
        `;
        return;
    }

    miembrosProyecto.forEach(function (miembro) {
        const opcion = document.createElement("option");

        opcion.value = miembro.idMiembro;

        opcion.textContent =
            `${miembro.miembroNombre || "Sin nombre"} · ` +
            `${miembro.rolProyecto || "Colaborador"}`;

        select.appendChild(opcion);
    });
}

async function guardarTareaFase() {
    if (!puedeCrearTareasEnProyecto()) {
        alert(
            "No tienes permiso para guardar tareas dentro de este proyecto."
        );
        return;
    }

    const titulo =
        document.getElementById("tituloTareaFase");

    const asignado =
        document.getElementById("asignadoTareaFase");

    const estado =
        document.getElementById("estadoTareaFase");

    const prioridad =
        document.getElementById("prioridadTareaFase");

    const horas =
        document.getElementById("horasTareaFase");

    const descripcion =
        document.getElementById("descripcionTareaFase");

    const fase =
        document.getElementById("faseTareaProyecto");

    if (!titulo || titulo.value.trim() === "") {
        alert("Ingresa el título de la tarea.");
        titulo.focus();
        return;
    }

    if (!asignado || asignado.value === "") {
        alert("Selecciona una persona del proyecto.");
        asignado.focus();
        return;
    }

    if (!fase || fase.value === "") {
        alert("No se encontró una fase válida.");
        return;
    }

    const integranteValido = miembrosProyecto.some(
        function (miembro) {
            return String(miembro.idMiembro) ===
                String(asignado.value);
        }
    );

    if (!integranteValido) {
        alert(
            "La persona seleccionada no pertenece a este proyecto."
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
        horas ? horas.value || 0 : 0
    );

    if (horasEstimadas < 0) {
        alert("Las horas estimadas no pueden ser negativas.");
        return;
    }

    const datosTarea = {
        idProyecto: Number(proyectoActual.id),
        idFase: Number(fase.value),
        idMiembroAsignado: Number(asignado.value),
        titulo: titulo.value.trim(),
        descripcion: descripcion
            ? descripcion.value.trim()
            : "",
        estado: estado
            ? estado.value
            : "Pendiente",
        prioridad: prioridad
            ? prioridad.value
            : "Media",
        horasEstimadas: horasEstimadas,
        horasRegistradas: null,
        fechaInicio: null,
        fechaLimite: null
    };

    const botonGuardar = document.querySelector(
        "#formTareaFase button[type='submit']"
    );

    if (botonGuardar) {
        botonGuardar.disabled = true;
        botonGuardar.textContent = "Guardando...";
    }

    try {
        const respuesta = await fetch(
            API_TAREAS,
            {
                method: "POST",
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

        cerrarModalTareaFase();

        await Promise.all([
            cargarTareasProyecto(),
            cargarProyectoActual(proyectoActual.id)
        ]);

        configurarPermisosVisuales();
        renderizarProyecto();
        renderizarFasesProyecto();
        actualizarAvanceProyecto();

        alert(
            datos.mensaje ||
            "Tarea creada correctamente."
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
            botonGuardar.textContent = "Guardar tarea";
        }
    }
}

/* =========================================================
   EQUIPO DEL PROYECTO
========================================================= */

function abrirModalAgregarMiembro() {
    if (!puedeGestionarMiembrosProyecto()) {
        alert(
            "Solo un administrador puede asignar integrantes."
        );
        return;
    }

    const modal =
        document.getElementById("modalAgregarMiembro");

    const form =
        document.getElementById("formAgregarMiembro");

    if (!modal || !form) {
        return;
    }

    form.reset();
    cargarMiembrosEquipoEnSelect();

    modal.classList.add("show");
}

function cerrarModalAgregarMiembro() {
    const modal =
        document.getElementById("modalAgregarMiembro");

    const form =
        document.getElementById("formAgregarMiembro");

    if (modal) {
        modal.classList.remove("show");
    }

    if (form) {
        form.reset();
    }
}

function cargarMiembrosEquipoEnSelect() {
    const select = document.getElementById(
        "miembroExistenteProyecto"
    );

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Selecciona una persona registrada
        </option>
    `;

    const idsYaAsignados = miembrosProyecto.map(
        function (miembro) {
            return String(miembro.idMiembro);
        }
    );

    const miembrosDisponibles = miembrosEquipo.filter(
        function (miembro) {
            const activo =
                normalizarTexto(miembro.estado) === "activo";

            const idMiembro =
                miembro.id ||
                miembro.idMiembro ||
                miembro.id_miembro;

            return activo &&
                !idsYaAsignados.includes(String(idMiembro));
        }
    );

    if (miembrosDisponibles.length === 0) {
        select.innerHTML = `
            <option value="">
                No hay integrantes disponibles para asignar
            </option>
        `;
        return;
    }

    miembrosDisponibles.forEach(function (miembro) {
        const opcion = document.createElement("option");

        opcion.value =
            miembro.id ||
            miembro.idMiembro ||
            miembro.id_miembro;

        opcion.textContent =
            `${miembro.nombreCompleto || "Sin nombre"} · ` +
            `${miembro.rol || "Colaborador"}`;

        select.appendChild(opcion);
    });
}

async function guardarMiembroProyecto() {
    if (!puedeGestionarMiembrosProyecto()) {
        alert(
            "Solo un administrador puede asignar integrantes."
        );
        return;
    }

    const select = document.getElementById(
        "miembroExistenteProyecto"
    );

    const rol =
        document.getElementById("rolMiembroProyecto");

    const horas =
        document.getElementById("horasMiembroProyecto");

    const notas =
        document.getElementById("notasMiembroProyecto");

    if (!select || select.value === "") {
        alert("Selecciona una persona registrada.");
        return;
    }

    const horasAsignadas = Number(
        horas ? horas.value || 0 : 0
    );

    if (horasAsignadas < 0) {
        alert("Las horas asignadas no pueden ser negativas.");
        return;
    }

    const idUsuario = obtenerIdUsuarioActivo();

    if (!idUsuario) {
        alert(
            "No se encontró una sesión activa. Cierra sesión e inicia nuevamente."
        );
        return;
    }

    const datosAsignacion = {
        idMiembro: Number(select.value),
        rolProyecto: rol && rol.value.trim() !== ""
            ? rol.value.trim()
            : "Colaborador",
        horasAsignadas: horasAsignadas,
        notas: notas
            ? notas.value.trim()
            : ""
    };

    try {
        const respuesta = await fetch(
            `${API_MIEMBROS_PROYECTO}/proyecto/${proyectoActual.id}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Usuario-Id": String(idUsuario)
                },
                body: JSON.stringify(datosAsignacion)
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible asignar al integrante."
            );
        }

        cerrarModalAgregarMiembro();

        await cargarMiembrosProyecto();

        configurarPermisosVisuales();
        renderizarEquipoProyecto();
        renderizarFasesProyecto();
        actualizarAvanceProyecto();

        alert(
            datos.mensaje ||
            "Miembro agregado correctamente."
        );

    } catch (error) {
        console.error("Error al asignar integrante:", error);

        alert(
            error.message ||
            "No fue posible asignar al integrante."
        );
    }
}

async function retirarMiembroProyecto(idMiembro) {
    if (!puedeRetirarMiembrosProyecto()) {
        alert(
            "Solo un administrador puede retirar integrantes."
        );
        return;
    }

    const confirmar = confirm(
        "¿Deseas retirar a esta persona del proyecto?"
    );

    if (!confirmar) {
        return;
    }

    const idUsuario = obtenerIdUsuarioActivo();

    try {
        const respuesta = await fetch(
            `${API_MIEMBROS_PROYECTO}/proyecto/${proyectoActual.id}/miembro/${idMiembro}`,
            {
                method: "DELETE",
                headers: {
                    "X-Usuario-Id": String(idUsuario)
                }
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible retirar al integrante."
            );
        }

        await cargarMiembrosProyecto();

        configurarPermisosVisuales();
        renderizarEquipoProyecto();
        renderizarFasesProyecto();
        actualizarAvanceProyecto();

        alert(
            datos.mensaje ||
            "Miembro retirado correctamente."
        );

    } catch (error) {
        console.error("Error al retirar integrante:", error);

        alert(
            error.message ||
            "No fue posible retirar al integrante."
        );
    }
}

function renderizarEquipoProyecto() {
    const contenedor =
        document.getElementById("teamList");

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    if (miembrosProyecto.length === 0) {
        contenedor.innerHTML = `
            <p class="project-empty-text">
                No hay integrantes asignados a este proyecto.
            </p>
        `;

        actualizarTexto("projectMembers", 0);
        return;
    }

    miembrosProyecto.forEach(function (miembro) {
        const item = document.createElement("div");

        item.className = "team-item";

        const informacion = document.createElement("div");

        const nombre = document.createElement("h3");
        nombre.textContent =
            miembro.miembroNombre || "Sin nombre";

        const correo = document.createElement("p");
        correo.textContent =
            miembro.miembroCorreo || "Sin correo";

        const rol = document.createElement("span");
        rol.className = "team-status activo";
        rol.textContent =
            miembro.rolProyecto ||
            miembro.miembroRolOperativo ||
            "Colaborador";

        informacion.appendChild(nombre);
        informacion.appendChild(correo);
        informacion.appendChild(rol);

        if (miembro.notas) {
            const notas = document.createElement("p");

            notas.className = "team-notes";
            notas.textContent = miembro.notas;

            informacion.appendChild(notas);
        }

        const acciones = document.createElement("div");

        acciones.className = "team-member-actions";

        const horas = document.createElement("div");

        horas.className = "team-hours";
        horas.textContent =
            Number(miembro.horasAsignadas || 0) + " h";

        acciones.appendChild(horas);

        if (puedeRetirarMiembrosProyecto()) {
            const botonRetirar = document.createElement("button");

            botonRetirar.type = "button";
            botonRetirar.className =
                "btn-danger btn-retirar-miembro";

            botonRetirar.textContent = "Retirar";

            botonRetirar.addEventListener(
                "click",
                function () {
                    retirarMiembroProyecto(
                        miembro.idMiembro
                    );
                }
            );

            acciones.appendChild(botonRetirar);
        }

        item.appendChild(informacion);
        item.appendChild(acciones);

        contenedor.appendChild(item);
    });

    actualizarTexto("projectMembers", miembrosProyecto.length);
}

/* =========================================================
   EXPORTAR CSV
========================================================= */

function exportarFasesCSV() {
    if (!proyectoActual) {
        return;
    }

    if (!puedeExportarImprimirProyecto()) {
        alert(
            "No tienes permiso para exportar este proyecto."
        );
        return;
    }

    const filas = [
        [
            "Proyecto",
            "Orden",
            "Fase",
            "Tarea",
            "Asignado",
            "Estado",
            "Prioridad",
            "Horas estimadas"
        ]
    ];

    fasesProyecto.forEach(function (fase) {
        const tareasFase = tareasProyecto.filter(function (tarea) {
            return String(tarea.idFase) === String(fase.id);
        });

        if (tareasFase.length === 0) {
            filas.push([
                proyectoActual.nombre || "",
                fase.numeroOrden || "",
                fase.nombre || "",
                "",
                "",
                "",
                "",
                ""
            ]);

            return;
        }

        tareasFase.forEach(function (tarea) {
            filas.push([
                proyectoActual.nombre || "",
                fase.numeroOrden || "",
                fase.nombre || "",
                tarea.titulo || "",
                tarea.miembroNombre || "",
                tarea.estado || "",
                tarea.prioridad || "",
                tarea.horasEstimadas || 0
            ]);
        });
    });

    const csv = filas.map(function (fila) {
        return fila.map(function (campo) {
            return `"${String(campo)
                .replace(/"/g, "\"\"")}"`;
        }).join(",");
    }).join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const url = URL.createObjectURL(blob);

    const enlace = document.createElement("a");

    enlace.href = url;

    enlace.download =
        "detalle_" +
        String(proyectoActual.nombre || "proyecto")
            .replace(/\s+/g, "_") +
        ".csv";

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    URL.revokeObjectURL(url);
}

/* =========================================================
   UTILIDADES
========================================================= */

function actualizarTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}

function mostrarProyectoNoEncontrado(mensaje) {
    const content =
        document.getElementById("projectContent");

    if (!content) {
        return;
    }

    content.innerHTML = `
        <div class="project-empty">
            <h2>No fue posible abrir el proyecto</h2>
            <p>${escaparHTML(mensaje)}</p>
        </div>
    `;
}

function obtenerParametroURL(nombre) {
    const parametros = new URLSearchParams(
        window.location.search
    );

    const valor = parametros.get(nombre);

    if (
        !valor ||
        valor === "undefined" ||
        valor === "null"
    ) {
        return null;
    }

    return valor;
}

function obtenerAbreviaturaFase(nombre) {
    const texto = normalizarTexto(nombre);

    if (texto.includes("levantamiento")) return "L";
    if (texto.includes("infraestructura")) return "I";
    if (texto.includes("diseno")) return "D";
    if (texto.includes("desarrollo")) return "DE";
    if (texto.includes("pruebas")) return "QA";
    if (texto.includes("validacion")) return "EV";
    if (texto.includes("implementacion")) return "IM";
    if (texto.includes("capacitacion")) return "CA";
    if (texto.includes("documentacion")) return "DOC";
    if (texto.includes("usuario")) return "MU";
    if (texto.includes("tecnico")) return "MT";
    if (texto.includes("administrador")) return "MA";
    if (texto.includes("integral")) return "CI";
    if (texto.includes("ejecutable")) return "CE";
    if (texto.includes("evaluacion")) return "EV";
    if (texto.includes("cierre")) return "C";
    if (texto.includes("chequeo")) return "LCC";
    if (texto.includes("f2")) return "F2";
    if (texto.includes("f7")) return "F7";
    if (texto.includes("f8")) return "F8";

    return "F";
}

function obtenerColorEstadoProyecto(estado) {
    const texto = normalizarTexto(estado);

    if (
        texto.includes("cerrado") ||
        texto.includes("completado")
    ) {
        return "green";
    }

    if (
        texto.includes("ejecucion") ||
        texto.includes("monitoreo")
    ) {
        return "orange";
    }

    if (
        texto.includes("cancelado") ||
        texto.includes("bloqueado")
    ) {
        return "red";
    }

    if (
        texto.includes("inicio") ||
        texto.includes("planificacion") ||
        texto.includes("propuesto")
    ) {
        return "blue";
    }

    return "gray";
}

function obtenerColorEstadoTarea(estado) {
    const texto = normalizarTexto(estado);

    if (texto.includes("completada")) return "green";
    if (texto.includes("progreso")) return "orange";
    if (texto.includes("bloqueada")) return "red";
    if (texto.includes("pendiente")) return "blue";

    return "gray";
}

function obtenerSaludProyecto() {
    const prioridad = normalizarTexto(
        proyectoActual
            ? proyectoActual.prioridad || ""
            : ""
    );

    const estado = normalizarTexto(
        proyectoActual
            ? proyectoActual.estado || ""
            : ""
    );

    if (
        prioridad.includes("critica") ||
        estado.includes("riesgo")
    ) {
        return "health-red";
    }

    if (
        prioridad.includes("alta") ||
        estado.includes("bloqueado")
    ) {
        return "health-yellow";
    }

    if (
        estado.includes("cerrado") ||
        estado.includes("completado")
    ) {
        return "health-green";
    }

    return "health-gray";
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "—";
    }

    const partes = String(fecha)
        .split("T")[0]
        .split("-");

    if (partes.length !== 3) {
        return fecha;
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

function abrirReunion(reunion) {
    if (!reunion || !reunion.id || !proyectoActual) return;

    window.location.href =
        "reunion.html?id=" + encodeURIComponent(proyectoActual.id) +
        "&reunion=" + encodeURIComponent(reunion.id);
}

function renderizarReunionesProyecto() {
    const boxActiva = document.getElementById("reunionActivaBox");
    const tituloActiva = document.getElementById("reunionActivaTitulo");
    const metaActiva = document.getElementById("reunionActivaMeta");
    const lista = document.getElementById("historialReunionesLista");
    const btnNueva = document.getElementById("btnNuevaReunion");

    if (boxActiva) {
        boxActiva.hidden = !reunionActivaProyecto;
        if (reunionActivaProyecto) {
            if (tituloActiva) tituloActiva.textContent = reunionActivaProyecto.titulo || "Reunión activa";
            if (metaActiva) {
                metaActiva.textContent =
                    "Inició " + formatearFechaHoraReunion(reunionActivaProyecto.fechaInicio) +
                    ". Cualquier miembro asignado al proyecto puede unirse desde aquí.";
            }
        }
    }

    if (btnNueva && puedeCrearReunionProyecto()) {
        btnNueva.textContent = reunionActivaProyecto ? "Abrir reunión activa" : "Nueva reunión";
    }

    if (!lista) return;

    if (!reunionesProyecto.length) {
        lista.innerHTML = '<p class="project-empty-text">Todavía no hay reuniones registradas.</p>';
        return;
    }

    lista.innerHTML = reunionesProyecto.slice(0, 12).map(function (reunion) {
        const activa = normalizarTexto(reunion.estado) === "activa";
        const grabaciones = Array.isArray(reunion.grabaciones) ? reunion.grabaciones : [];
        const grabacionesHtml = grabaciones.length
            ? grabaciones.map(function (grabacion) {
                return `
                    <a class="meeting-recording-link" href="#" data-grabacion-url="${escaparHTML(grabacion.url)}">
                        ▶ ${escaparHTML(grabacion.nombre || "Grabación de reunión")}
                    </a>`;
              }).join("")
            : '<span class="meeting-no-recording">Las grabaciones se descargan desde la sala.</span>';

        return `
            <article class="meeting-history-item">
                <div class="meeting-history-main">
                    <div>
                        <strong>${escaparHTML(reunion.titulo || "Reunión del proyecto")}</strong>
                        <span class="meeting-state ${activa ? "active" : "finished"}">${activa ? "ACTIVA" : "FINALIZADA"}</span>
                    </div>
                    <small>${escaparHTML(formatearFechaHoraReunion(reunion.fechaInicio))}</small>
                </div>
                <div class="meeting-recordings">${grabacionesHtml}</div>
                ${activa ? `<button type="button" class="btn-secondary btn-join-history" data-id-reunion="${reunion.id}">Unirse</button>` : ""}
            </article>`;
    }).join("");

    lista.querySelectorAll(".btn-join-history").forEach(function (boton) {
        boton.addEventListener("click", function () {
            const reunion = reunionesProyecto.find(item => String(item.id) === String(boton.dataset.idReunion));
            abrirReunion(reunion);
        });
    });

    lista.querySelectorAll("[data-grabacion-url]").forEach(function (enlace) {
        enlace.addEventListener("click", function (event) {
            event.preventDefault();
            abrirGrabacionProyecto(enlace.dataset.grabacionUrl);
        });
    });
}

async function abrirGrabacionProyecto(ruta) {
    if (!ruta) return;
    try {
        const respuesta = await fetch(window.apiUrl(ruta));
        if (!respuesta.ok) throw new Error("No fue posible abrir la grabación.");
        const blob = await respuesta.blob();
        const url = URL.createObjectURL(blob);
        const ventana = window.open(url, "_blank", "noopener");
        if (!ventana) {
            const descarga = document.createElement("a");
            descarga.href = url;
            descarga.download = "grabacion-reunion.webm";
            descarga.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
    } catch (error) {
        alert(error.message || "No fue posible abrir la grabación.");
    }
}

function formatearFechaHoraReunion(valor) {
    if (!valor) return "fecha no disponible";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return String(valor);
    return fecha.toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}
