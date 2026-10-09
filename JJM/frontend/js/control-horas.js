const API_REGISTROS_HORAS =
    window.apiUrl("/api/registros-horas");

const API_PROYECTOS =
    window.apiUrl("/api/proyectos");

const API_TAREAS =
    window.apiUrl("/api/tareas");

const API_MIEMBROS =
    window.apiUrl("/api/miembros");

const API_MIEMBRO_SESION =
    window.apiUrl("/api/miembros/mi-sesion");

let usuarioActivo = obtenerUsuarioActivo();

let registrosHoras = [];
let proyectosDisponibles = [];
let miembrosDisponibles = [];
let tareasProyectoActual = [];

let solicitudProyectoActual = 0;

/* =========================================================
   ELEMENTOS DE LA PÁGINA
========================================================= */

const tablaHoras =
    document.getElementById("tablaHoras");

const horasHoy =
    document.getElementById("horasHoy");

const horasTotales =
    document.getElementById("horasTotales");

const horasAprobadas =
    document.getElementById("horasAprobadas");

const btnRegistrarHoras =
    document.getElementById("btnRegistrarHoras");

const btnCheckIn =
    document.getElementById("btnCheckIn");

const btnCheckOut =
    document.getElementById("btnCheckOut");

const btnActualizarHoras =
    document.getElementById("btnActualizarHoras");

const btnVerMiHistorial =
    document.getElementById("btnVerMiHistorial");

const textoJornada =
    document.getElementById("textoJornada");

const jornadaStatus =
    document.getElementById("jornadaStatus");

const modalHoras =
    document.getElementById("modalHoras");

const btnCerrarModal =
    document.getElementById("btnCerrarModal");

const btnCancelar =
    document.getElementById("btnCancelar");

const formHoras =
    document.getElementById("formHoras");

const tituloModal =
    document.getElementById("tituloModal");

const idRegistro =
    document.getElementById("idRegistro");

const fechaRegistro =
    document.getElementById("fechaRegistro");

const personaRegistro =
    document.getElementById("personaRegistro");

const proyectoRegistro =
    document.getElementById("proyectoRegistro");

const tareaRegistro =
    document.getElementById("tareaRegistro");

const horaEntrada =
    document.getElementById("horaEntrada");

const horaSalida =
    document.getElementById("horaSalida");

const horasRegistro =
    document.getElementById("horasRegistro");

const incidenteRegistro =
    document.getElementById("incidenteRegistro");

const descripcionRegistro =
    document.getElementById("descripcionRegistro");

const grupoPersonaRegistro =
    document.getElementById("grupoPersonaRegistro");

/* =========================================================
   INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
    usuarioActivo = obtenerUsuarioActivo();

    configurarEventos();
    configurarEncabezado();

    await Promise.allSettled([
        cargarMiembros(),
        cargarProyectos()
    ]);

    await cargarRegistrosHoras();
});

/* =========================================================
   SESIÓN Y ROL
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
    if (window.PMOPermisos && window.PMOPermisos.tiene("horas.ver_todas")) return true;

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


function puedeGestionarHorasGlobales() {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene("horas.gestionar"));
}
function puedeValidarHorasGlobales() {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene("horas.validar"));
}
function puedeEliminarHorasGlobales() {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene("horas.eliminar"));
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

function obtenerIdMiembroActivoDesdeSesion() {
    if (!usuarioActivo) {
        return null;
    }

    return usuarioActivo.idMiembro ||
        usuarioActivo.miembroId ||
        usuarioActivo.id_miembro ||
        usuarioActivo.idMiembroEquipo ||
        null;
}

function obtenerMiembroActivo() {
    const idDesdeSesion = obtenerIdMiembroActivoDesdeSesion();

    if (idDesdeSesion && Array.isArray(miembrosDisponibles)) {
        const miembroPorSesion = miembrosDisponibles.find(function (miembro) {
            return String(
                miembro.id ||
                miembro.idMiembro ||
                miembro.id_miembro ||
                ""
            ) === String(idDesdeSesion);
        });

        if (miembroPorSesion) {
            return miembroPorSesion;
        }
    }

    if (!esAdministrador() && miembrosDisponibles.length === 1) {
        return miembrosDisponibles[0];
    }

    const idUsuario = obtenerIdUsuarioActivo();

    if (!idUsuario) {
        return null;
    }

    return miembrosDisponibles.find(function (miembro) {
        const idUsuarioMiembro =
            miembro.idUsuario ||
            miembro.usuarioId ||
            miembro.id_usuario ||
            miembro.usuario?.id ||
            miembro.usuario?.idUsuario ||
            "";

        return String(idUsuarioMiembro) === String(idUsuario);
    }) || null;
}

function obtenerIdMiembroActivo() {
    const idDesdeSesion = obtenerIdMiembroActivoDesdeSesion();

    if (idDesdeSesion) {
        return idDesdeSesion;
    }

    const miembro = obtenerMiembroActivo();

    if (!miembro) {
        return null;
    }

    return miembro.id ||
        miembro.idMiembro ||
        miembro.id_miembro ||
        null;
}


/* Modo solo lectura para horas globales */
document.addEventListener("DOMContentLoaded", function () {
    if (esAdministrador() && !puedeGestionarHorasGlobales()) {
        if (btnRegistrarHoras) btnRegistrarHoras.style.display = "none";
        if (btnActualizarHoras) btnActualizarHoras.style.display = "none";
    }
});

/* =========================================================
   ENCABEZADO SEGÚN ROL
========================================================= */

function configurarEncabezado() {
    const titulo =
        document.getElementById("tituloControlHoras");

    const descripcion =
        document.getElementById("descripcionControlHoras");

    const subtitulo =
        document.getElementById("subtituloTablaHoras");

    if (esAdministrador()) {
        const puedeGestionar = puedeGestionarHorasGlobales();
        const puedeValidar = puedeValidarHorasGlobales();

        if (titulo) {
            titulo.textContent = "Control global de horas";
        }

        if (descripcion) {
            descripcion.textContent = (puedeGestionar || puedeValidar)
                ? "Consulta los registros de todos los integrantes y realiza las acciones autorizadas para tu rol."
                : "Consulta los registros de tiempo de todos los integrantes en modo solo lectura.";
        }

        if (subtitulo) {
            subtitulo.textContent = "Se muestran los registros de todos los integrantes.";
        }

        if (btnVerMiHistorial) {
            btnVerMiHistorial.style.display = "none";
        }

        return;
    }

    if (titulo) {
        titulo.textContent =
            "Mi control de horas";
    }

    if (descripcion) {
        descripcion.textContent =
            "Registra tu jornada y las horas trabajadas en tus tareas.";
    }

    if (subtitulo) {
        subtitulo.textContent =
            "Solo se muestran los registros asociados a tu usuario.";
    }

    if (btnVerMiHistorial) {
        btnVerMiHistorial.style.display = "inline-flex";
    }
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    if (btnRegistrarHoras) {
        btnRegistrarHoras.addEventListener(
            "click",
            abrirModalNuevoRegistro
        );
    }

    if (btnCheckIn) {
        btnCheckIn.addEventListener(
            "click",
            iniciarJornada
        );
    }

    if (btnCheckOut) {
        btnCheckOut.addEventListener(
            "click",
            finalizarJornada
        );
    }

    if (btnActualizarHoras) {
        btnActualizarHoras.addEventListener(
            "click",
            cargarRegistrosHoras
        );
    }

    if (btnVerMiHistorial) {
        btnVerMiHistorial.addEventListener(
            "click",
            verMiHistorialHoras
        );
    }

    if (btnCerrarModal) {
        btnCerrarModal.addEventListener(
            "click",
            cerrarModal
        );
    }

    if (btnCancelar) {
        btnCancelar.addEventListener(
            "click",
            cerrarModal
        );
    }

    if (modalHoras) {
        modalHoras.addEventListener(
            "click",
            function (event) {
                if (event.target === modalHoras) {
                    cerrarModal();
                }
            }
        );
    }

    if (formHoras) {
        formHoras.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                guardarRegistro();
            }
        );
    }

    if (proyectoRegistro) {
        proyectoRegistro.addEventListener(
            "change",
            async function () {
                await cargarTareasProyecto(
                    proyectoRegistro.value
                );
            }
        );
    }

    if (horaEntrada) {
        horaEntrada.addEventListener(
            "change",
            calcularHorasPorHorario
        );
    }

    if (horaSalida) {
        horaSalida.addEventListener(
            "change",
            calcularHorasPorHorario
        );
    }
}

function verMiHistorialHoras() {
    if (esAdministrador()) {
        alert(
            "Para consultar el historial de un integrante, entra al módulo Equipo y selecciona Ver historial de horas."
        );
        return;
    }

    window.location.href = "detalle-miembro-horas.html";
}

/* =========================================================
   CARGA DE INFORMACIÓN
========================================================= */

async function cargarRegistrosHoras() {
    mostrarCargaTabla();

    try {
        const respuesta = await fetch(
            API_REGISTROS_HORAS,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar los registros de horas."
            );
        }

        registrosHoras = Array.isArray(datos.registros)
            ? datos.registros
            : [];

        mostrarRegistros();
        actualizarEstadisticas();
        actualizarEstadoJornada();

    } catch (error) {
        console.error(
            "Error al cargar registros de horas:",
            error
        );

        registrosHoras = [];

        mostrarErrorTabla(
            error.message ||
            "No fue posible cargar los registros."
        );

        actualizarEstadisticas();
        actualizarEstadoJornada();
    }
}

async function cargarMiembros() {
    try {
        const respuesta = await fetch(
            esAdministrador()
                ? API_MIEMBROS
                : API_MIEMBRO_SESION,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar integrantes."
            );
        }

        if (esAdministrador()) {
            miembrosDisponibles = Array.isArray(datos.miembros)
                ? datos.miembros
                : [];
        } else {
            miembrosDisponibles = datos.miembro
                ? [datos.miembro]
                : [];
        }

        llenarSelectPersonas();

    } catch (error) {
        console.error("Error al cargar integrantes:", error);

        miembrosDisponibles = [];
        llenarSelectPersonas();
    }
}

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
                "No fue posible cargar proyectos."
            );
        }

        proyectosDisponibles = Array.isArray(datos.proyectos)
            ? datos.proyectos
            : [];

        llenarSelectProyectos();

    } catch (error) {
        console.error("Error al cargar proyectos:", error);

        proyectosDisponibles = [];
        llenarSelectProyectos();
    }
}

async function cargarTareasProyecto(
    idProyecto,
    idTareaSeleccionada = ""
) {
    const idSolicitud = ++solicitudProyectoActual;

    tareasProyectoActual = [];

    limpiarSelectTareas(
        idProyecto
            ? "Cargando tareas..."
            : "Selecciona primero un proyecto"
    );

    if (!idProyecto) {
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_TAREAS}/proyecto/${idProyecto}`,
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
                "No fue posible cargar las tareas del proyecto."
            );
        }

        let tareasCargadas = Array.isArray(datos.tareas)
            ? datos.tareas
            : [];

        if (!esAdministrador()) {
            const idMiembroActivo = obtenerIdMiembroActivo();

            tareasCargadas = tareasCargadas.filter(
                function (tarea) {
                    return String(
                        tarea.idMiembroAsignado
                    ) === String(idMiembroActivo);
                }
            );
        }

        tareasProyectoActual = tareasCargadas;

        if (!tareaRegistro) {
            return;
        }

        tareaRegistro.innerHTML = `
            <option value="">
                Sin tarea relacionada
            </option>
        `;

        tareasProyectoActual.forEach(function (tarea) {
            const opcion = document.createElement("option");

            opcion.value = tarea.id;

            opcion.textContent =
                `${tarea.titulo || "Tarea sin título"} · ` +
                `${tarea.estado || "Pendiente"}`;

            if (
                String(tarea.id) ===
                String(idTareaSeleccionada)
            ) {
                opcion.selected = true;
            }

            tareaRegistro.appendChild(opcion);
        });

    } catch (error) {
        console.error(
            "Error al cargar tareas del proyecto:",
            error
        );

        if (idSolicitud !== solicitudProyectoActual) {
            return;
        }

        limpiarSelectTareas(
            "No fue posible cargar tareas"
        );
    }
}

/* =========================================================
   SELECTORES DEL FORMULARIO
========================================================= */

function llenarSelectPersonas() {
    if (!personaRegistro) {
        return;
    }

    personaRegistro.disabled = false;
    personaRegistro.innerHTML = "";

    if (esAdministrador()) {
        personaRegistro.innerHTML = `
            <option value="">
                Selecciona una persona
            </option>
        `;

        miembrosDisponibles
            .filter(function (miembro) {
                return String(miembro.estado || "")
                    .trim()
                    .toLowerCase() === "activo";
            })
            .forEach(function (miembro) {
                const opcion = document.createElement("option");

                opcion.value =
                    miembro.id ||
                    miembro.idMiembro;

                opcion.textContent =
                    miembro.nombreCompleto ||
                    miembro.nombre ||
                    "Integrante sin nombre";

                personaRegistro.appendChild(opcion);
            });

        if (grupoPersonaRegistro) {
            grupoPersonaRegistro.style.display = "flex";
        }

        return;
    }

    const miembroActivo = obtenerMiembroActivo();

    if (!miembroActivo) {
        personaRegistro.innerHTML = `
            <option value="">
                No fue posible identificar tu perfil
            </option>
        `;

        personaRegistro.disabled = true;
        return;
    }

    const opcion = document.createElement("option");

    opcion.value =
        miembroActivo.id ||
        miembroActivo.idMiembro;

    opcion.textContent =
        miembroActivo.nombreCompleto ||
        miembroActivo.nombre ||
        "Mi perfil";

    opcion.selected = true;

    personaRegistro.appendChild(opcion);
    personaRegistro.disabled = true;

    if (grupoPersonaRegistro) {
        grupoPersonaRegistro.style.display = "flex";
    }
}

function llenarSelectProyectos() {
    if (!proyectoRegistro) {
        return;
    }

    proyectoRegistro.innerHTML = `
        <option value="">
            Sin proyecto relacionado
        </option>
    `;

    proyectosDisponibles.forEach(function (proyecto) {
        const opcion = document.createElement("option");

        opcion.value = proyecto.id;

        opcion.textContent =
            `${proyecto.nombre || "Proyecto sin nombre"} · ` +
            `${proyecto.codigo || "Sin código"}`;

        proyectoRegistro.appendChild(opcion);
    });
}

function limpiarSelectTareas(mensaje) {
    if (!tareaRegistro) {
        return;
    }

    tareaRegistro.innerHTML = `
        <option value="">
            ${escaparHTML(mensaje)}
        </option>
    `;
}

/* =========================================================
   DETECCIÓN DE JORNADA ABIERTA
========================================================= */

function actualizarEstadoJornada() {
    if (window.asistenciaAutomaticaPMO?.esAlumno()) {
        if (btnCheckIn) btnCheckIn.hidden = true;
        if (btnCheckOut) btnCheckOut.hidden = true;
        if (btnRegistrarHoras) btnRegistrarHoras.hidden = true;
        const asistencia = window.asistenciaAutomaticaPMO.estado();
        if (textoJornada) textoJornada.textContent = asistencia?.mensaje || "Confirmando tu asistencia automática...";
        if (jornadaStatus) jornadaStatus.className = "jornada-status " +
                (asistencia?.contando ? "jornada-abierta" : "jornada-cerrada");
        return;
    }
    /*
     * Para un colaborador, el backend devuelve únicamente
     * sus propios registros. No se necesita volver a comparar
     * idMiembro, porque eso era lo que impedía habilitar
     * el botón Finalizar jornada.
     */
    let registrosParaBuscar = registrosHoras;

    /*
     * Para administrador sí se filtra con su propio perfil,
     * porque administración puede consultar registros de todos.
     */
    if (esAdministrador()) {
        const idMiembroActivo = obtenerIdMiembroActivo();

        if (idMiembroActivo) {
            registrosParaBuscar = registrosHoras.filter(
                function (registro) {
                    return String(registro.idMiembro) ===
                        String(idMiembroActivo);
                }
            );
        } else {
            registrosParaBuscar = [];
        }
    }

    const jornadaAbierta = registrosParaBuscar.find(
        function (registro) {
            const tipoRegistro = String(
                registro.tipoRegistro || ""
            )
                .trim()
                .toLowerCase();

            const estadoValidacion = String(
                registro.estadoValidacion || ""
            )
                .trim()
                .toLowerCase();

            return (
                tipoRegistro === "jornada" &&
                estadoValidacion === "pendiente" &&
                !registro.horaSalida
            );
        }
    );

    if (btnCheckIn) {
        btnCheckIn.textContent =
            "▶ Iniciar jornada";
    }

    if (btnCheckOut) {
        btnCheckOut.textContent =
            "■ Finalizar jornada";
    }

    if (jornadaAbierta) {
        if (textoJornada) {
            textoJornada.textContent =
                "Jornada iniciada a las " +
                formatearHora(jornadaAbierta.horaEntrada) +
                ".";
        }

        if (jornadaStatus) {
            jornadaStatus.className =
                "jornada-status jornada-abierta";
        }

        if (btnCheckIn) {
            btnCheckIn.disabled = true;
        }

        if (btnCheckOut) {
            btnCheckOut.disabled = false;
        }

        return;
    }

    if (textoJornada) {
        textoJornada.textContent =
            "No hay una jornada abierta actualmente.";
    }

    if (jornadaStatus) {
        jornadaStatus.className =
            "jornada-status jornada-cerrada";
    }

    if (btnCheckIn) {
        btnCheckIn.disabled = false;
    }

    if (btnCheckOut) {
        btnCheckOut.disabled = true;
    }
}

/* =========================================================
   INICIAR Y FINALIZAR JORNADA
========================================================= */

async function iniciarJornada() {
    if (!confirm(
        "¿Deseas iniciar tu jornada de trabajo ahora?"
    )) {
        return;
    }

    cambiarEstadoBoton(
        btnCheckIn,
        true,
        "Iniciando..."
    );

    try {
        const respuesta = await fetch(
            `${API_REGISTROS_HORAS}/check-in`,
            {
                method: "POST",
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible iniciar la jornada."
            );
        }

        alert(
            datos.mensaje ||
            "Jornada iniciada correctamente."
        );

        await cargarRegistrosHoras();

    } catch (error) {
        console.error("Error al iniciar jornada:", error);

        alert(
            error.message ||
            "No fue posible iniciar la jornada."
        );
    } finally {
        actualizarEstadoJornada();
    }
}

async function finalizarJornada() {
    if (!confirm(
        "¿Deseas finalizar tu jornada de trabajo ahora?"
    )) {
        return;
    }

    cambiarEstadoBoton(
        btnCheckOut,
        true,
        "Finalizando..."
    );

    try {
        const respuesta = await fetch(
            `${API_REGISTROS_HORAS}/check-out`,
            {
                method: "POST",
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible finalizar la jornada."
            );
        }

        alert(
            datos.mensaje ||
            "Jornada finalizada correctamente."
        );

        await cargarRegistrosHoras();

    } catch (error) {
        console.error("Error al finalizar jornada:", error);

        alert(
            error.message ||
            "No fue posible finalizar la jornada."
        );
    } finally {
        actualizarEstadoJornada();
    }
}

/* =========================================================
   MODAL Y GUARDADO
========================================================= */

function abrirModalNuevoRegistro() {
    if (!formHoras || !modalHoras) {
        return;
    }

    formHoras.reset();

    if (idRegistro) {
        idRegistro.value = "";
    }

    if (tituloModal) {
        tituloModal.textContent =
            "Registrar horas";
    }

    if (fechaRegistro) {
        fechaRegistro.value = obtenerFechaActual();
    }

    if (horasRegistro) {
        horasRegistro.value = "0";
    }

    if (incidenteRegistro) {
        incidenteRegistro.value = "normal";
    }

    llenarSelectPersonas();
    llenarSelectProyectos();

    limpiarSelectTareas(
        "Selecciona primero un proyecto"
    );

    modalHoras.classList.add("show");
}

function cerrarModal() {
    if (modalHoras) {
        modalHoras.classList.remove("show");
    }

    if (formHoras) {
        formHoras.reset();
    }

    if (idRegistro) {
        idRegistro.value = "";
    }

    tareasProyectoActual = [];
}

async function guardarRegistro() {
    const idMiembro = personaRegistro
        ? personaRegistro.value
        : "";

    const fecha = fechaRegistro
        ? fechaRegistro.value
        : "";

    const horas = Number(
        horasRegistro
            ? horasRegistro.value || 0
            : 0
    );

    if (!idMiembro) {
        alert("Selecciona una persona.");
        return;
    }

    if (!fecha) {
        alert("Selecciona una fecha.");
        return;
    }

    if (horas < 0 || horas > 24) {
        alert(
            "Las horas trabajadas deben estar entre 0 y 24."
        );
        return;
    }

    if (
        horaEntrada &&
        horaSalida &&
        horaEntrada.value &&
        horaSalida.value
    ) {
        const entrada = convertirHoraAMinutos(
            horaEntrada.value
        );

        const salida = convertirHoraAMinutos(
            horaSalida.value
        );

        if (salida <= entrada) {
            alert(
                "La hora de salida debe ser posterior a la hora de entrada."
            );
            return;
        }
    }

    const datosRegistro = {
        idMiembro: Number(idMiembro),

        idProyecto:
            proyectoRegistro &&
            proyectoRegistro.value
                ? Number(proyectoRegistro.value)
                : null,

        idTarea:
            tareaRegistro &&
            tareaRegistro.value
                ? Number(tareaRegistro.value)
                : null,

        fecha: fecha,

        horaEntrada:
            horaEntrada &&
            horaEntrada.value
                ? horaEntrada.value
                : null,

        horaSalida:
            horaSalida &&
            horaSalida.value
                ? horaSalida.value
                : null,

        horasTrabajadas: horas,

        tipoRegistro: "Manual",

        incidente:
            incidenteRegistro
                ? incidenteRegistro.value
                : "normal",

        descripcion:
            descripcionRegistro
                ? descripcionRegistro.value.trim()
                : ""
    };

    const esEdicion =
        idRegistro &&
        idRegistro.value !== "";

    if (esEdicion && !esAdministrador()) {
        alert(
            "Solo un administrador puede corregir registros de horas."
        );
        return;
    }

    const botonGuardar = document.querySelector(
        "#formHoras button[type='submit']"
    );

    cambiarEstadoBoton(
        botonGuardar,
        true,
        "Guardando..."
    );

    try {
        const respuesta = await fetch(
            esEdicion
                ? `${API_REGISTROS_HORAS}/${idRegistro.value}`
                : API_REGISTROS_HORAS,
            {
                method: esEdicion ? "PUT" : "POST",

                headers: {
                    "Content-Type": "application/json",
                    ...obtenerHeadersSesion()
                },

                body: JSON.stringify(datosRegistro)
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible guardar el registro."
            );
        }

        cerrarModal();

        await cargarRegistrosHoras();

        alert(
            datos.mensaje ||
            "Registro guardado correctamente."
        );

    } catch (error) {
        console.error(
            "Error al guardar registro:",
            error
        );

        alert(
            error.message ||
            "No fue posible guardar el registro."
        );
    } finally {
        cambiarEstadoBoton(
            botonGuardar,
            false,
            "Guardar registro"
        );
    }
}

function calcularHorasPorHorario() {
    if (
        !horaEntrada ||
        !horaSalida ||
        !horasRegistro ||
        !horaEntrada.value ||
        !horaSalida.value
    ) {
        return;
    }

    const minutosEntrada =
        convertirHoraAMinutos(horaEntrada.value);

    const minutosSalida =
        convertirHoraAMinutos(horaSalida.value);

    if (minutosSalida <= minutosEntrada) {
        return;
    }

    const totalHoras =
        (minutosSalida - minutosEntrada) / 60;

    horasRegistro.value =
        totalHoras.toFixed(2);
}

/* =========================================================
   TABLA
========================================================= */

function mostrarRegistros() {
    if (!tablaHoras) {
        return;
    }

    tablaHoras.innerHTML = "";

    if (registrosHoras.length === 0) {
        tablaHoras.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table">
                    No hay registros de horas disponibles.
                </td>
            </tr>
        `;

        return;
    }

    registrosHoras
        .slice()
        .sort(function (a, b) {
            return convertirFecha(b.fechaCreacion) -
                convertirFecha(a.fechaCreacion);
        })
        .forEach(function (registro) {
            const fila = document.createElement("tr");

            const proyectoTarea = [
                registro.proyectoNombre ||
                    "Sin proyecto",

                registro.tareaTitulo ||
                    "Sin tarea"
            ].join(" · ");

            fila.innerHTML = `
                <td>
                    ${escaparHTML(
                        formatearFecha(registro.fecha)
                    )}
                </td>

                <td>
                    <strong>
                        ${escaparHTML(
                            registro.miembroNombre ||
                            "Sin integrante"
                        )}
                    </strong>
                </td>

                <td>
                    ${escaparHTML(proyectoTarea)}
                </td>

                <td>
                    ${escaparHTML(
                        registro.descripcion ||
                        "Sin descripción"
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        formatearHorario(
                            registro.horaEntrada,
                            registro.horaSalida
                        )
                    )}
                </td>

                <td class="text-right">
                    <strong>
                        ${Number(
                            registro.horasTrabajadas || 0
                        ).toFixed(2)}h
                    </strong>
                </td>

                <td>
                    <span class="badge ${
                        obtenerColorEstadoValidacion(
                            registro.estadoValidacion
                        )
                    }">
                        ${escaparHTML(
                            registro.estadoValidacion ||
                            "Pendiente"
                        )}
                    </span>
                </td>

                <td class="text-right">
                    <div class="action-buttons">
                        ${crearAccionesRegistro(registro)}
                    </div>
                </td>
            `;

            configurarAccionesFila(fila, registro);

            tablaHoras.appendChild(fila);
        });
}

function crearAccionesRegistro(registro) {
    const acciones = [];

    if (esAdministrador() && puedeGestionarHorasGlobales() && (!registro.automatico || registro.horaSalida)) {
        acciones.push(`
            <button type="button" class="btn-editar-registro" title="Corregir registro">✏</button>
        `);
    }

    if (esAdministrador() && puedeValidarHorasGlobales()) {
        acciones.push(`
            <button type="button" class="btn-aprobar-registro" title="Aprobar registro">✓</button>
        `);
        acciones.push(`
            <button type="button" class="btn-rechazar-registro" title="Rechazar registro">✕</button>
        `);
    }

    if (!registro.automatico && puedeEliminarRegistro(registro)) {
        acciones.push(`
            <button type="button" class="btn-eliminar-registro" title="Eliminar registro">🗑</button>
        `);
    }

    return acciones.join("");
}

function configurarAccionesFila(fila, registro) {
    const btnEditar = fila.querySelector(
        ".btn-editar-registro"
    );

    const btnEliminar = fila.querySelector(
        ".btn-eliminar-registro"
    );

    const btnAprobar = fila.querySelector(
        ".btn-aprobar-registro"
    );

    const btnRechazar = fila.querySelector(
        ".btn-rechazar-registro"
    );

    if (btnEditar) {
        btnEditar.addEventListener(
            "click",
            function () {
                editarRegistro(registro.id);
            }
        );
    }

    if (btnEliminar) {
        btnEliminar.addEventListener(
            "click",
            function () {
                eliminarRegistro(registro.id);
            }
        );
    }

    if (btnAprobar) {
        btnAprobar.addEventListener(
            "click",
            function () {
                validarRegistro(
                    registro.id,
                    "Aprobado"
                );
            }
        );
    }

    if (btnRechazar) {
        btnRechazar.addEventListener(
            "click",
            function () {
                validarRegistro(
                    registro.id,
                    "Rechazado"
                );
            }
        );
    }
}

/* =========================================================
   ESTADÍSTICAS
========================================================= */

function actualizarEstadisticas() {
    const hoy = obtenerFechaActual();

    const totalHoy = registrosHoras
        .filter(function (registro) {
            return registro.fecha === hoy;
        })
        .reduce(function (total, registro) {
            return total + Number(
                registro.horasTrabajadas || 0
            );
        }, 0);

    const totalRegistrado = registrosHoras.reduce(
        function (total, registro) {
            return total + Number(
                registro.horasTrabajadas || 0
            );
        },
        0
    );

    const totalAprobado = registrosHoras
        .filter(function (registro) {
            return String(
                registro.estadoValidacion || ""
            )
                .trim()
                .toLowerCase() === "aprobado";
        })
        .reduce(function (total, registro) {
            return total + Number(
                registro.horasTrabajadas || 0
            );
        },
        0
    );

    if (horasHoy) {
        horasHoy.textContent =
            totalHoy.toFixed(2) + "h";
    }

    if (horasTotales) {
        horasTotales.textContent =
            totalRegistrado.toFixed(2) + "h";
    }

    if (horasAprobadas) {
        horasAprobadas.textContent =
            totalAprobado.toFixed(2) + "h";
    }

    actualizarContadorAutomatico();
}

function actualizarContadorAutomatico() {
    const seguimiento = window.asistenciaAutomaticaPMO;
    if (!seguimiento?.esAlumno()) return;
    const estado = seguimiento.estado();
    const segundos = seguimiento.segundosVisibles();
    if (!estado || segundos == null) return;
    const otrasHoras = registrosHoras.filter(r => Number(r.idMiembro) === Number(estado.idMiembro)
            && Number(r.id) !== Number(estado.idRegistro))
        .reduce((total, r) => total + Number(r.horasTrabajadas || 0), 0);
    if (horasHoy) horasHoy.textContent = (segundos / 3600).toFixed(2) + "h / 10h";
    if (horasTotales) horasTotales.textContent = (otrasHoras + segundos / 3600).toFixed(2) + "h";
    if (textoJornada && !estado.error && estado.contando) {
        const h = Math.floor(segundos / 3600), m = Math.floor(segundos % 3600 / 60), s = Math.floor(segundos % 60);
        textoJornada.textContent = `Asistencia automática: ${[h,m,s].map(n => String(n).padStart(2,"0")).join(":")} de 10:00:00. Lunes a viernes, 07:00 a 17:00.`;
    }
}

window.addEventListener("pmo:asistencia", () => { actualizarEstadoJornada(); actualizarEstadisticas(); });
setInterval(actualizarContadorAutomatico, 1000);

/* =========================================================
   EDITAR, VALIDAR Y ELIMINAR
========================================================= */

async function editarRegistro(id) {
    if (!esAdministrador() || !puedeGestionarHorasGlobales()) {
        alert(
            "Los registros de horas no se editan directamente. " +
            "Si existe un error y el registro sigue pendiente, " +
            "elimínalo y registra uno nuevo."
        );
        return;
    }

    const registro = registrosHoras.find(
        function (item) {
            return String(item.id) === String(id);
        }
    );

    if (!registro) {
        alert("No se encontró el registro seleccionado.");
        return;
    }

    if (!modalHoras || !formHoras) {
        return;
    }

    formHoras.reset();

    if (tituloModal) {
        tituloModal.textContent =
            "Corregir registro de horas";
    }

    if (idRegistro) {
        idRegistro.value = registro.id;
    }

    llenarSelectPersonas();
    llenarSelectProyectos();

    if (personaRegistro) {
        personaRegistro.value =
            registro.idMiembro || "";
    }

    if (fechaRegistro) {
        fechaRegistro.value =
            registro.fecha || "";
    }

    if (proyectoRegistro) {
        proyectoRegistro.value =
            registro.idProyecto || "";
    }

    if (horaEntrada) {
        horaEntrada.value =
            registro.horaEntrada || "";
    }

    if (horaSalida) {
        horaSalida.value =
            registro.horaSalida || "";
    }

    if (horasRegistro) {
        horasRegistro.value =
            Number(
                registro.horasTrabajadas || 0
            ).toFixed(2);
    }

    if (incidenteRegistro) {
        incidenteRegistro.value =
            registro.incidente || "normal";
    }

    if (descripcionRegistro) {
        descripcionRegistro.value =
            registro.descripcion || "";
    }

    await cargarTareasProyecto(
        registro.idProyecto || "",
        registro.idTarea || ""
    );

    modalHoras.classList.add("show");
}

async function validarRegistro(id, estadoValidacion) {
    if (!esAdministrador() || !puedeValidarHorasGlobales()) {
        alert(
            "Solo un administrador puede validar registros."
        );
        return;
    }

    const textoAccion = estadoValidacion === "Aprobado"
        ? "aprobar"
        : "rechazar";

    if (!confirm(
        `¿Deseas ${textoAccion} este registro de horas?`
    )) {
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_REGISTROS_HORAS}/${id}/validacion`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json",
                    ...obtenerHeadersSesion()
                },

                body: JSON.stringify({
                    estadoValidacion: estadoValidacion
                })
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible actualizar la validación."
            );
        }

        await cargarRegistrosHoras();

        alert(
            datos.mensaje ||
            "Registro validado correctamente."
        );

    } catch (error) {
        console.error(
            "Error al validar registro:",
            error
        );

        alert(
            error.message ||
            "No fue posible validar el registro."
        );
    }
}

async function eliminarRegistro(id) {
    const registro = registrosHoras.find(
        function (item) {
            return String(item.id) === String(id);
        }
    );

    if (!registro) {
        alert("No se encontró el registro seleccionado.");
        return;
    }

    if (!puedeEliminarRegistro(registro)) {
        alert(
            "No tienes permiso para eliminar este registro."
        );
        return;
    }

    if (!confirm(
        "¿Deseas eliminar este registro de horas?"
    )) {
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_REGISTROS_HORAS}/${id}`,
            {
                method: "DELETE",
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible eliminar el registro."
            );
        }

        await cargarRegistrosHoras();

        alert(
            datos.mensaje ||
            "Registro eliminado correctamente."
        );

    } catch (error) {
        console.error(
            "Error al eliminar registro:",
            error
        );

        alert(
            error.message ||
            "No fue posible eliminar el registro."
        );
    }
}

function puedeEliminarRegistro(registro) {
    if (esAdministrador()) {
        return puedeEliminarHorasGlobales();
    }

    const idMiembroActivo = obtenerIdMiembroActivo();

    const esRegistroPropio = idMiembroActivo &&
        String(registro.idMiembro) === String(idMiembroActivo);

    const estadoValidacion = String(
        registro.estadoValidacion || ""
    )
        .trim()
        .toLowerCase();

    return esRegistroPropio && estadoValidacion === "pendiente";
}

/* =========================================================
   UTILIDADES
========================================================= */

function obtenerFechaActual() {
    return new Date()
        .toISOString()
        .split("T")[0];
}

function convertirHoraAMinutos(hora) {
    const partes = String(hora || "").split(":");

    if (partes.length < 2) {
        return 0;
    }

    return Number(partes[0]) * 60 +
        Number(partes[1]);
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

function formatearHora(hora) {
    if (!hora) {
        return "—";
    }

    return String(hora).slice(0, 5);
}

function formatearHorario(entrada, salida) {
    if (entrada && salida) {
        return (
            formatearHora(entrada) +
            " - " +
            formatearHora(salida)
        );
    }

    if (entrada && !salida) {
        return (
            formatearHora(entrada) +
            " - Jornada abierta"
        );
    }

    return "Sin horario";
}

function obtenerColorEstadoValidacion(estado) {
    const texto = String(estado || "")
        .trim()
        .toLowerCase();

    if (texto === "aprobado") {
        return "green";
    }

    if (texto === "rechazado") {
        return "red";
    }

    return "yellow";
}

function convertirFecha(fecha) {
    if (!fecha) {
        return 0;
    }

    const timestamp = new Date(fecha).getTime();

    return Number.isNaN(timestamp)
        ? 0
        : timestamp;
}

function mostrarCargaTabla() {
    if (!tablaHoras) {
        return;
    }

    tablaHoras.innerHTML = `
        <tr>
            <td colspan="8" class="empty-table">
                Cargando registros de horas...
            </td>
        </tr>
    `;
}

function mostrarErrorTabla(mensaje) {
    if (!tablaHoras) {
        return;
    }

    tablaHoras.innerHTML = `
        <tr>
            <td colspan="8" class="empty-table">
                ${escaparHTML(mensaje)}
            </td>
        </tr>
    `;
}

function cambiarEstadoBoton(
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

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
