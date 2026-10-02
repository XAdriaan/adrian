const API_ALERTAS =
    window.apiUrl("/api/alertas");

const API_PROYECTOS =
    window.apiUrl("/api/proyectos");

const API_TAREAS =
    window.apiUrl("/api/tareas");

const API_MIEMBROS =
    window.apiUrl("/api/miembros");

const API_MIEMBRO_SESION =
    window.apiUrl("/api/miembros/mi-sesion");

const API_REGISTROS_HORAS =
    window.apiUrl("/api/registros-horas");

const CLAVE_ALERTAS_OCULTAS =
    "alertasOcultasPMO";

let usuarioActivo = obtenerUsuarioActivo();

let proyectosAlertas = [];
let tareasAlertas = [];
let miembrosAlertas = [];
let registrosHorasAlertas = [];

let alertasManuales = [];
let alertasAutomaticas = [];
let alertasFinales = [];

let filtrosAlertas = {
    tipo: "",
    severidad: "",
    estado: ""
};

/* =========================================================
   ELEMENTOS
========================================================= */

const contenedorAlertas =
    document.getElementById("contenedorAlertas");

const contadorAbiertas =
    document.getElementById("contadorAbiertas");

const contadorAtencion =
    document.getElementById("contadorAtencion");

const resumenCriticas =
    document.getElementById("resumenCriticas");

const resumenBloqueadas =
    document.getElementById("resumenBloqueadas");

const resumenVencidas =
    document.getElementById("resumenVencidas");

const resumenHorasRechazadas =
    document.getElementById(
        "resumenHorasRechazadas"
    );

const btnNuevaAlerta =
    document.getElementById("btnNuevaAlerta");

const btnActualizarAlertas =
    document.getElementById(
        "btnActualizarAlertas"
    );

const btnAplicarFiltros =
    document.getElementById(
        "btnAplicarFiltros"
    );

const btnLimpiarFiltros =
    document.getElementById(
        "btnLimpiarFiltros"
    );

const filtroTipoAlerta =
    document.getElementById(
        "filtroTipoAlerta"
    );

const filtroSeveridadAlerta =
    document.getElementById(
        "filtroSeveridadAlerta"
    );

const filtroEstadoAlerta =
    document.getElementById(
        "filtroEstadoAlerta"
    );

const modalAlerta =
    document.getElementById("modalAlerta");

const btnCerrarModal =
    document.getElementById("btnCerrarModal");

const btnCancelar =
    document.getElementById("btnCancelar");

const formAlerta =
    document.getElementById("formAlerta");

const tituloAlerta =
    document.getElementById("tituloAlerta");

const tipoAlerta =
    document.getElementById("tipoAlerta");

const severidadAlerta =
    document.getElementById(
        "severidadAlerta"
    );

const proyectoAlerta =
    document.getElementById("proyectoAlerta");

const asignadoAlerta =
    document.getElementById("asignadoAlerta");

const estadoAlerta =
    document.getElementById("estadoAlerta");

const fechaLimiteAlerta =
    document.getElementById(
        "fechaLimiteAlerta"
    );

const descripcionAlerta =
    document.getElementById(
        "descripcionAlerta"
    );

const btnGuardarAlerta =
    document.getElementById(
        "btnGuardarAlerta"
    );

const saludoAlertas =
    document.getElementById("saludoAlertas");

const tituloAlertas =
    document.getElementById("tituloAlertas");

const descripcionAlertas =
    document.getElementById(
        "descripcionAlertas"
    );

const indicadorRolAlertas =
    document.getElementById(
        "indicadorRolAlertas"
    );

const mensajeAlertas =
    document.getElementById("mensajeAlertas");

const textoMensajeAlertas =
    document.getElementById(
        "textoMensajeAlertas"
    );

/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {
        usuarioActivo = obtenerUsuarioActivo();

        configurarEventos();
        configurarEncabezado();

        await cargarCentroAlertas();
    }
);

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    if (btnNuevaAlerta) {
        btnNuevaAlerta.addEventListener(
            "click",
            abrirModal
        );
    }

    if (btnActualizarAlertas) {
        btnActualizarAlertas.addEventListener(
            "click",
            cargarCentroAlertas
        );
    }

    if (btnAplicarFiltros) {
        btnAplicarFiltros.addEventListener(
            "click",
            aplicarFiltros
        );
    }

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener(
            "click",
            limpiarFiltros
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

    if (modalAlerta) {
        modalAlerta.addEventListener(
            "click",
            function (event) {
                if (event.target === modalAlerta) {
                    cerrarModal();
                }
            }
        );
    }

    if (formAlerta) {
        formAlerta.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                guardarAlertaManual();
            }
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
        console.error(
            "No fue posible leer la sesión:",
            error
        );

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

function obtenerIdMiembroDesdeSesion() {
    if (!usuarioActivo) {
        return null;
    }

    return usuarioActivo.idMiembro ||
        usuarioActivo.idMiembroEquipo ||
        usuarioActivo.miembroId ||
        usuarioActivo.id_miembro ||
        null;
}

function obtenerNombreUsuarioActivo() {
    if (!usuarioActivo) {
        return "Usuario";
    }

    return usuarioActivo.nombreCompleto ||
        usuarioActivo.nombre ||
        "Usuario";
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

function esAdministrador() {
    if (window.PMOPermisos && window.PMOPermisos.tiene("alertas.ver_todas")) return true;

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


function puedeGestionarAlertas() {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene("alertas.gestionar"));
}

function obtenerHeadersSesion() {
    const idUsuario =
        obtenerIdUsuarioActivo();

    if (!idUsuario) {
        return {};
    }

    return {
        "X-Usuario-Id": String(idUsuario)
    };
}

function configurarEncabezado() {
    const nombre =
        obtenerNombreUsuarioActivo();

    if (saludoAlertas) {
        saludoAlertas.textContent =
            `Centro de control · ${nombre}`;
    }

    if (!usuarioActivo) {
        if (tituloAlertas) {
            tituloAlertas.textContent =
                "Alertas";
        }

        if (descripcionAlertas) {
            descripcionAlertas.textContent =
                "Inicia sesión para consultar tus alertas.";
        }

        if (indicadorRolAlertas) {
            indicadorRolAlertas.textContent =
                "Sin sesión";
            indicadorRolAlertas.className =
                "role-indicator restricted";
        }

        if (btnNuevaAlerta) {
            btnNuevaAlerta.style.display = "none";
        }

        return;
    }

    if (esAdministrador()) {
        if (tituloAlertas) {
            tituloAlertas.textContent =
                "Alertas administrativas";
        }

        if (descripcionAlertas) {
            descripcionAlertas.textContent =
                "Seguimiento de riesgos, tareas, jornadas y registros del equipo.";
        }

        if (indicadorRolAlertas) {
            indicadorRolAlertas.textContent =
                "Administrador";

            indicadorRolAlertas.className =
                "role-indicator admin";
        }

        if (btnNuevaAlerta) {
            btnNuevaAlerta.style.display = puedeGestionarAlertas()
                ? "inline-flex"
                : "none";
        }

        return;
    }

    if (tituloAlertas) {
        tituloAlertas.textContent =
            "Mis alertas";
    }

    if (descripcionAlertas) {
        descripcionAlertas.textContent =
            "Consulta alertas asignadas a tu usuario y eventos relacionados con tus tareas o registros de horas.";
    }

    if (indicadorRolAlertas) {
        indicadorRolAlertas.textContent =
            obtenerNombreRolUsuario() ||
            "Colaborador";

        indicadorRolAlertas.className =
            "role-indicator collaborator";
    }

    if (btnNuevaAlerta) {
        btnNuevaAlerta.style.display = "none";
    }
}

/* =========================================================
   CARGAR DATOS DEL CENTRO DE ALERTAS
========================================================= */

async function cargarCentroAlertas() {
    mostrarCargaAlertas();

    if (!usuarioActivo) {
        mostrarMensaje(
            "No se encontró una sesión activa. Inicia sesión nuevamente.",
            "error"
        );
        return;
    }

    cambiarEstadoBoton(
        btnActualizarAlertas,
        true,
        "Actualizando..."
    );

    try {
        const resultados = await Promise.allSettled([
            obtenerDatosAPI(
                API_PROYECTOS,
                ["proyectos", "data"]
            ),

            obtenerDatosAPI(
                API_TAREAS,
                ["tareas", "data"]
            ),

            obtenerDatosAPI(
                esAdministrador()
                    ? API_MIEMBROS
                    : API_MIEMBRO_SESION,
                esAdministrador()
                    ? ["miembros", "data"]
                    : ["miembro", "data"]
            ),

            obtenerDatosAPI(
                API_REGISTROS_HORAS,
                ["registros", "data"]
            ),

            obtenerDatosAPI(
                API_ALERTAS,
                ["alertas", "data"]
            )
        ]);

        proyectosAlertas =
            resultados[0].status === "fulfilled"
                ? resultados[0].value.map(
                    normalizarProyecto
                )
                : obtenerProyectosLocales();

        tareasAlertas =
            resultados[1].status === "fulfilled"
                ? resultados[1].value.map(
                    normalizarTarea
                )
                : obtenerTareasLocales();

        miembrosAlertas =
            resultados[2].status === "fulfilled"
                ? resultados[2].value.map(
                    normalizarMiembro
                )
                : obtenerMiembrosLocales();

        registrosHorasAlertas =
            resultados[3].status === "fulfilled"
                ? resultados[3].value.map(
                    normalizarRegistroHoras
                )
                : obtenerHorasLocales();

        alertasManuales =
            resultados[4].status === "fulfilled"
                ? resultados[4].value.map(
                    normalizarAlertaManual
                )
                : obtenerAlertasManualesLocales();

        alertasManuales = filtrarAlertasManualesPermitidas(
            alertasManuales
        );

        generarAlertasAutomaticas();
        prepararAlertasFinales();
        llenarSelectsModal();
        actualizarResumen();
        mostrarAlertas();

        const fallos = resultados.filter(
            function (resultado) {
                return resultado.status === "rejected";
            }
        ).length;

        if (fallos > 0) {
            mostrarMensaje(
                "Algunos datos se cargaron desde información local porque no fue posible consultar todos los servicios del backend.",
                "warning"
            );
        } else {
            ocultarMensaje();
        }

    } catch (error) {
        console.error(
            "Error al cargar alertas:",
            error
        );

        mostrarMensaje(
            "No fue posible cargar toda la información de alertas. Verifica que Apache, MySQL y el backend Java estén activos.",
            "error"
        );

        prepararAlertasFinales();
        actualizarResumen();
        mostrarAlertas();

    } finally {
        cambiarEstadoBoton(
            btnActualizarAlertas,
            false,
            "↻ Actualizar"
        );
    }
}

/* =========================================================
   PETICIONES API
========================================================= */

async function obtenerDatosAPI(
    url,
    posiblesClaves
) {
    const respuesta = await fetch(
        url,
        {
            headers: obtenerHeadersSesion()
        }
    );

    const datos = await obtenerRespuestaJSON(
        respuesta
    );

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje ||
            "No fue posible obtener información."
        );
    }

    return extraerArreglo(
        datos,
        posiblesClaves
    );
}

function extraerArreglo(
    datos,
    posiblesClaves
) {
    if (Array.isArray(datos)) {
        return datos;
    }

    for (
        let indice = 0;
        indice < posiblesClaves.length;
        indice++
    ) {
        const clave = posiblesClaves[indice];

        if (Array.isArray(datos?.[clave])) {
            return datos[clave];
        }

        if (
            datos?.[clave] &&
            typeof datos[clave] === "object"
        ) {
            return [datos[clave]];
        }
    }

    return [];
}

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

/* =========================================================
   FALLBACK LOCALSTORAGE
========================================================= */

function obtenerArregloLocal(clave) {
    try {
        const datos = JSON.parse(
            localStorage.getItem(clave)
        );

        return Array.isArray(datos)
            ? datos
            : [];

    } catch (error) {
        return [];
    }
}

function obtenerProyectosLocales() {
    return [
        ...obtenerArregloLocal("proyectos"),
        ...obtenerArregloLocal("proyectosAvanzados")
    ].map(normalizarProyecto);
}

function obtenerTareasLocales() {
    return obtenerArregloLocal("tareas")
        .map(normalizarTarea);
}

function obtenerMiembrosLocales() {
    return obtenerArregloLocal("miembrosEquipo")
        .map(normalizarMiembro);
}

function obtenerHorasLocales() {
    return obtenerArregloLocal("registrosHoras")
        .map(normalizarRegistroHoras);
}

function obtenerAlertasManualesLocales() {
    return [
        ...obtenerArregloLocal("alertasManualesPMO"),
        ...obtenerArregloLocal("alertas")
    ].map(normalizarAlertaManual);
}

/* =========================================================
   NORMALIZAR DATOS
========================================================= */

function normalizarProyecto(proyecto) {
    return {
        id:
            proyecto.id ||
            proyecto.idProyecto ||
            "",

        nombre:
            proyecto.nombre ||
            proyecto.name ||
            proyecto.titulo ||
            "Proyecto sin nombre",

        estado:
            proyecto.estado ||
            proyecto.estadoActual ||
            "Pendiente"
    };
}

function normalizarTarea(tarea) {
    return {
        id:
            tarea.id ||
            tarea.idTarea ||
            "",

        titulo:
            tarea.titulo ||
            tarea.nombre ||
            "Tarea sin título",

        idProyecto:
            tarea.idProyecto ||
            tarea.proyectoId ||
            "",

        proyectoNombre:
            tarea.proyectoNombre ||
            tarea.proyecto ||
            "",

        idMiembro:
            tarea.idMiembro ||
            tarea.miembroId ||
            tarea.idMiembroAsignado ||
            tarea.asignadoId ||
            "",

        idUsuario:
            tarea.idUsuario ||
            tarea.usuarioId ||
            "",

        miembroNombre:
            tarea.miembroNombre ||
            tarea.asignado ||
            "",

        estado:
            tarea.estado ||
            "Pendiente",

        fechaLimite:
            limpiarFecha(
                tarea.fechaLimite ||
                tarea.fechaVencimiento ||
                tarea.fechaEntrega ||
                ""
            ),

        fechaCreacion:
            limpiarFecha(
                tarea.fechaCreacion ||
                tarea.fecha ||
                ""
            )
    };
}

function normalizarMiembro(miembro) {
    return {
        id:
            miembro.id ||
            miembro.idMiembro ||
            miembro.id_miembro ||
            "",

        idUsuario:
            miembro.idUsuario ||
            miembro.usuarioId ||
            miembro.id_usuario ||
            miembro.usuario?.id ||
            miembro.usuario?.idUsuario ||
            "",

        nombreCompleto:
            miembro.nombreCompleto ||
            miembro.nombre ||
            "Sin nombre"
    };
}

function normalizarRegistroHoras(registro) {
    return {
        id:
            registro.id ||
            registro.idRegistro ||
            "",

        idMiembro:
            registro.idMiembro ||
            registro.miembroId ||
            "",

        fecha:
            limpiarFecha(
                registro.fecha ||
                registro.fechaRegistro ||
                registro.fechaCreacion
            ),

        horaEntrada:
            registro.horaEntrada ||
            "",

        horaSalida:
            registro.horaSalida ||
            "",

        horasTrabajadas:
            Number(
                registro.horasTrabajadas ||
                registro.horas ||
                0
            ),

        tipoRegistro:
            registro.tipoRegistro ||
            "Manual",

        estadoValidacion:
            registro.estadoValidacion ||
            registro.estado ||
            "Pendiente",

        descripcion:
            registro.descripcion ||
            "",

        miembroNombre:
            registro.miembroNombre ||
            registro.persona ||
            registro.nombreMiembro ||
            ""
    };
}

function normalizarAlertaManual(alerta) {
    return {
        id:
            alerta.id ||
            alerta.idAlerta ||
            alerta.id_alerta ||
            `manual-local-${Date.now()}`,

        origen:
            alerta.origen ||
            "manual",

        titulo:
            alerta.titulo ||
            "Alerta sin título",

        tipo:
            alerta.tipo ||
            "Manual",

        severidad:
            alerta.severidad ||
            "Media",

        estado:
            alerta.estado ||
            "Abierta",

        descripcion:
            alerta.descripcion ||
            "",

        asignado:
            alerta.asignado ||
            alerta.nombreMiembro ||
            obtenerNombreMiembro(
                alerta.idMiembroAsignado ||
                alerta.idMiembro
            ),

        idMiembro:
            alerta.idMiembro ||
            alerta.idMiembroAsignado ||
            "",

        idMiembroAsignado:
            alerta.idMiembroAsignado ||
            alerta.idMiembro ||
            "",

        idProyecto:
            alerta.idProyecto ||
            "",

        proyecto:
            alerta.proyecto ||
            alerta.proyectoNombre ||
            obtenerNombreProyecto(alerta.idProyecto),

        idTarea:
            alerta.idTarea ||
            "",

        tarea:
            alerta.tarea ||
            alerta.tareaTitulo ||
            "",

        idUsuarioCreador:
            alerta.idUsuarioCreador ||
            "",

        creador:
            alerta.creador ||
            "",

        fechaLimite:
            limpiarFecha(alerta.fechaLimite || ""),

        fechaCreacion:
            alerta.fechaCreacion ||
            alerta.fecha_creacion ||
            new Date().toISOString(),

        fechaResolucion:
            alerta.fechaResolucion ||
            "",

        fechaActualizacion:
            alerta.fechaActualizacion ||
            "",

        enlace:
            alerta.enlace ||
            "alertas.html"
    };
}


function filtrarAlertasManualesPermitidas(alertas) {
    if (esAdministrador()) {
        return alertas;
    }

    const idMiembro = obtenerIdMiembroUsuarioActivo();
    const idUsuario = obtenerIdUsuarioActivo();

    return alertas.filter(function (alerta) {
        return (
            idMiembro &&
            String(alerta.idMiembroAsignado || alerta.idMiembro) ===
            String(idMiembro)
        ) || (
            idUsuario &&
            String(alerta.idUsuarioCreador) ===
            String(idUsuario)
        );
    });
}

/* =========================================================
   ALERTAS AUTOMÁTICAS
========================================================= */

function generarAlertasAutomaticas() {
    const generadas = [];

    const tareasVisibles =
        obtenerTareasVisibles();

    const registrosVisibles =
        obtenerRegistrosVisibles();

    const fechaHoy =
        obtenerFechaHoyLocal();

    tareasVisibles.forEach(function (tarea) {
        const estado =
            normalizarTexto(tarea.estado);

        if (estado === "bloqueada") {
            generadas.push({
                id: `auto-tarea-bloqueada-${tarea.id}`,
                origen: "automatica",
                titulo: `Tarea bloqueada: ${tarea.titulo}`,
                tipo: "Tarea bloqueada",
                severidad: "Alta",
                estado: "Abierta",
                descripcion:
                    "La tarea se encuentra bloqueada y requiere seguimiento para eliminar el impedimento.",
                asignado:
                    tarea.miembroNombre ||
                    obtenerNombreMiembro(
                        tarea.idMiembro
                    ),
                idMiembro: tarea.idMiembro,
                idProyecto: tarea.idProyecto,
                idTarea: tarea.id,
                proyecto:
                    tarea.proyectoNombre ||
                    obtenerNombreProyecto(
                        tarea.idProyecto
                    ),
                fechaCreacion:
                    tarea.fechaCreacion ||
                    fechaHoy,
                enlace: "tablero-tareas.html"
            });
        }

        if (
            tarea.fechaLimite &&
            tarea.fechaLimite < fechaHoy &&
            !esTareaTerminada(tarea.estado)
        ) {
            generadas.push({
                id: `auto-tarea-vencida-${tarea.id}`,
                origen: "automatica",
                titulo: `Tarea vencida: ${tarea.titulo}`,
                tipo: "Tarea vencida",
                severidad: "Crítica",
                estado: "Abierta",
                descripcion:
                    `La fecha límite era ${formatearFecha(tarea.fechaLimite)} y la tarea no está completada.`,
                asignado:
                    tarea.miembroNombre ||
                    obtenerNombreMiembro(
                        tarea.idMiembro
                    ),
                idMiembro: tarea.idMiembro,
                idProyecto: tarea.idProyecto,
                idTarea: tarea.id,
                proyecto:
                    tarea.proyectoNombre ||
                    obtenerNombreProyecto(
                        tarea.idProyecto
                    ),
                fechaCreacion:
                    tarea.fechaLimite,
                enlace: "tablero-tareas.html"
            });
        }
    });

    registrosVisibles.forEach(function (registro) {
        const estado =
            normalizarTexto(
                registro.estadoValidacion
            );

        const tipo =
            normalizarTexto(
                registro.tipoRegistro
            );

        if (estado === "rechazado") {
            generadas.push({
                id: `auto-horas-rechazadas-${registro.id}`,
                origen: "automatica",
                titulo: "Registro de horas rechazado",
                tipo: "Horas rechazadas",
                severidad: "Alta",
                estado: "Abierta",
                descripcion:
                    registro.descripcion ||
                    "El registro fue rechazado y requiere corrección o una justificación adicional.",
                asignado:
                    obtenerNombreMiembroRegistro(
                        registro
                    ),
                idMiembro: registro.idMiembro,
                idRegistro: registro.id,
                fechaCreacion:
                    registro.fecha ||
                    fechaHoy,
                enlace: "control-horas.html"
            });
        }

        if (
            tipo === "jornada" &&
            !registro.horaSalida &&
            registro.fecha &&
            registro.fecha < fechaHoy
        ) {
            generadas.push({
                id: `auto-jornada-pendiente-${registro.id}`,
                origen: "automatica",
                titulo: "Jornada pendiente de finalizar",
                tipo: "Jornada pendiente",
                severidad: "Media",
                estado: "Abierta",
                descripcion:
                    `La jornada iniciada el ${formatearFecha(registro.fecha)} no tiene una hora de salida registrada.`,
                asignado:
                    obtenerNombreMiembroRegistro(
                        registro
                    ),
                idMiembro: registro.idMiembro,
                idRegistro: registro.id,
                fechaCreacion:
                    registro.fecha,
                enlace: "control-horas.html"
            });
        }
    });

    alertasAutomaticas = generadas;
}

/* =========================================================
   VISIBILIDAD POR ROL
========================================================= */

function obtenerIdMiembroUsuarioActivo() {
    const idMiembroSesion =
        obtenerIdMiembroDesdeSesion();

    if (idMiembroSesion) {
        return idMiembroSesion;
    }

    const idUsuario =
        obtenerIdUsuarioActivo();

    if (!idUsuario) {
        return null;
    }

    const miembro = miembrosAlertas.find(
        function (item) {
            return String(item.idUsuario) ===
                String(idUsuario);
        }
    );

    return miembro?.id || null;
}

function obtenerTareasVisibles() {
    if (esAdministrador()) {
        return tareasAlertas.slice();
    }

    const idUsuario =
        obtenerIdUsuarioActivo();

    const idMiembro =
        obtenerIdMiembroUsuarioActivo();

    return tareasAlertas.filter(
        function (tarea) {
            return (
                idMiembro &&
                String(tarea.idMiembro) ===
                String(idMiembro)
            ) || (
                idUsuario &&
                String(tarea.idUsuario) ===
                String(idUsuario)
            );
        }
    );
}

function obtenerRegistrosVisibles() {
    if (esAdministrador()) {
        return registrosHorasAlertas.slice();
    }

    const idMiembro =
        obtenerIdMiembroUsuarioActivo();

    if (!idMiembro) {
        return [];
    }

    return registrosHorasAlertas.filter(
        function (registro) {
            return String(registro.idMiembro) ===
                String(idMiembro);
        }
    );
}

/* =========================================================
   ALERTAS MANUALES Y ALERTAS FINALES
========================================================= */

function guardarAlertasOcultas(lista) {
    localStorage.setItem(
        CLAVE_ALERTAS_OCULTAS,
        JSON.stringify(lista)
    );
}

function obtenerAlertasOcultas() {
    try {
        const alertasOcultas = JSON.parse(
            localStorage.getItem(
                CLAVE_ALERTAS_OCULTAS
            )
        );

        return Array.isArray(alertasOcultas)
            ? alertasOcultas
            : [];

    } catch (error) {
        return [];
    }
}

function prepararAlertasFinales() {
    const ocultas =
        obtenerAlertasOcultas();

    alertasFinales = [
        ...alertasAutomaticas.filter(
            function (alerta) {
                return !ocultas.includes(
                    alerta.id
                );
            }
        ),

        ...alertasManuales
    ].sort(function (a, b) {
        return convertirFecha(b.fechaCreacion) -
            convertirFecha(a.fechaCreacion);
    });
}

/* =========================================================
   FILTROS Y RENDER
========================================================= */

function aplicarFiltros() {
    filtrosAlertas.tipo =
        filtroTipoAlerta?.value || "";

    filtrosAlertas.severidad =
        filtroSeveridadAlerta?.value || "";

    filtrosAlertas.estado =
        filtroEstadoAlerta?.value || "";

    mostrarAlertas();
}

function limpiarFiltros() {
    filtrosAlertas = {
        tipo: "",
        severidad: "",
        estado: ""
    };

    if (filtroTipoAlerta) {
        filtroTipoAlerta.value = "";
    }

    if (filtroSeveridadAlerta) {
        filtroSeveridadAlerta.value = "";
    }

    if (filtroEstadoAlerta) {
        filtroEstadoAlerta.value = "";
    }

    mostrarAlertas();
}

function obtenerAlertasFiltradas() {
    return alertasFinales.filter(
        function (alerta) {
            if (
                filtrosAlertas.tipo &&
                normalizarTexto(alerta.tipo) !==
                normalizarTexto(
                    filtrosAlertas.tipo
                )
            ) {
                return false;
            }

            if (
                filtrosAlertas.severidad &&
                normalizarTexto(
                    alerta.severidad
                ) !== normalizarTexto(
                    filtrosAlertas.severidad
                )
            ) {
                return false;
            }

            if (
                filtrosAlertas.estado &&
                normalizarTexto(alerta.estado) !==
                normalizarTexto(
                    filtrosAlertas.estado
                )
            ) {
                return false;
            }

            return true;
        }
    );
}

function mostrarAlertas() {
    if (!contenedorAlertas) {
        return;
    }

    const alertas =
        obtenerAlertasFiltradas();

    if (alertas.length === 0) {
        contenedorAlertas.innerHTML = `
            <div class="empty-state">
                <h3>No hay alertas para mostrar</h3>

                <p>
                    No existen alertas que coincidan con los filtros seleccionados.
                </p>
            </div>
        `;

        return;
    }

    contenedorAlertas.innerHTML = "";

    alertas.forEach(function (alerta) {
        const card =
            document.createElement("article");

        card.className =
            `alert-card ${obtenerClaseSeveridad(alerta.severidad)}`;

        card.innerHTML = `
            <div class="alert-content">

                <div class="alert-main">

                    <div class="alert-title-row">

                        <h3>
                            ${escaparHTML(alerta.titulo)}
                        </h3>

                        <span class="badge gray">
                            ${escaparHTML(alerta.tipo)}
                        </span>

                        <span class="badge ${obtenerColorSeveridad(alerta.severidad)}">
                            ${escaparHTML(alerta.severidad)}
                        </span>

                        <span class="badge ${obtenerColorEstado(alerta.estado)}">
                            ${escaparHTML(alerta.estado)}
                        </span>

                        <span class="alert-origin ${alerta.origen === "automatica" ? "automatic" : "manual"}">
                            ${
                                alerta.origen === "automatica"
                                    ? "Automática"
                                    : "Manual"
                            }
                        </span>

                    </div>

                    <p class="alert-description">
                        ${escaparHTML(
                            alerta.descripcion ||
                            "Sin descripción registrada."
                        )}
                    </p>

                    <div class="alert-meta">

                        ${
                            alerta.proyecto
                                ? `
                                <span>
                                    📁 ${escaparHTML(alerta.proyecto)}
                                </span>
                                `
                                : ""
                        }

                        ${
                            alerta.tarea
                                ? `
                                <span>
                                    ✅ ${escaparHTML(alerta.tarea)}
                                </span>
                                `
                                : ""
                        }

                        ${
                            alerta.asignado
                                ? `
                                <span>
                                    👤 ${escaparHTML(alerta.asignado)}
                                </span>
                                `
                                : ""
                        }

                        ${
                            alerta.creador
                                ? `
                                <span>
                                    🧑‍💼 Creada por ${escaparHTML(alerta.creador)}
                                </span>
                                `
                                : ""
                        }

                        <span>
                            📅 ${escaparHTML(
                                formatearFecha(
                                    alerta.fechaCreacion
                                )
                            )}
                        </span>

                    </div>

                </div>

                <div class="alert-actions">
                    ${obtenerBotonesAccion(alerta)}
                </div>

            </div>
        `;

        contenedorAlertas.appendChild(card);
    });
}

/* =========================================================
   ACCIONES DE ALERTAS
========================================================= */

function obtenerBotonesAccion(alerta) {
    const botones = [];

    if (alerta.enlace) {
        botones.push(`
            <button
                type="button"
                class="btn-outline"
                onclick="abrirElementoRelacionado('${escaparAtributo(alerta.enlace)}')"
            >
                Ver relacionado
            </button>
        `);
    }

    if (alerta.origen === "manual" && esAdministrador() && puedeGestionarAlertas()) {
        if (alerta.estado === "Abierta") {
            botones.push(`
                <button
                    type="button"
                    class="btn-outline"
                    onclick="cambiarEstadoAlertaManual('${escaparAtributo(alerta.id)}', 'En atención')"
                >
                    ✅ Atender
                </button>
            `);
        }

        if (alerta.estado === "En atención") {
            botones.push(`
                <button
                    type="button"
                    class="btn-outline"
                    onclick="cambiarEstadoAlertaManual('${escaparAtributo(alerta.id)}', 'Resuelta')"
                >
                    ✓ Resolver
                </button>
            `);
        }

        if (
            alerta.estado === "Abierta" ||
            alerta.estado === "En atención"
        ) {
            botones.push(`
                <button
                    type="button"
                    class="btn-ghost"
                    onclick="cambiarEstadoAlertaManual('${escaparAtributo(alerta.id)}', 'Escalada')"
                >
                    ↗ Escalar
                </button>
            `);
        }

        botones.push(`
            <button
                type="button"
                class="btn-danger-outline"
                onclick="eliminarAlertaManual('${escaparAtributo(alerta.id)}')"
            >
                🗑 Eliminar
            </button>
        `);
    }

    if (
        alerta.origen === "automatica" &&
        esAdministrador() &&
        puedeGestionarAlertas()
    ) {
        botones.push(`
            <button
                type="button"
                class="btn-ghost"
                onclick="ocultarAlertaAutomatica('${escaparAtributo(alerta.id)}')"
            >
                Ocultar
            </button>
        `);
    }

    return botones.join("");
}

function abrirElementoRelacionado(enlace) {
    if (!enlace) {
        return;
    }

    window.location.href = enlace;
}

async function cambiarEstadoAlertaManual(
    id,
    nuevoEstado
) {
    if (!puedeGestionarAlertas()) {
        alert(
            "Tu rol no tiene permiso para actualizar alertas manuales."
        );

        return;
    }

    try {
        const respuesta = await fetch(
            `${API_ALERTAS}/${id}/estado`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...obtenerHeadersSesion()
                },
                body: JSON.stringify({
                    estado: nuevoEstado
                })
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible actualizar la alerta."
            );
        }

        await cargarCentroAlertas();

    } catch (error) {
        console.error(
            "Error al actualizar alerta:",
            error
        );

        alert(
            error.message ||
            "No fue posible actualizar la alerta."
        );
    }
}

async function eliminarAlertaManual(id) {
    if (!puedeGestionarAlertas()) {
        alert(
            "Tu rol no tiene permiso para eliminar alertas manuales."
        );

        return;
    }

    const confirmar = confirm(
        "¿Deseas eliminar esta alerta manual?"
    );

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_ALERTAS}/${id}`,
            {
                method: "DELETE",
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible eliminar la alerta."
            );
        }

        await cargarCentroAlertas();

    } catch (error) {
        console.error(
            "Error al eliminar alerta:",
            error
        );

        alert(
            error.message ||
            "No fue posible eliminar la alerta."
        );
    }
}

function ocultarAlertaAutomatica(id) {
    const ocultas =
        obtenerAlertasOcultas();

    if (!ocultas.includes(id)) {
        ocultas.push(id);
        guardarAlertasOcultas(ocultas);
    }

    prepararAlertasFinales();
    actualizarResumen();
    mostrarAlertas();
}

/* =========================================================
   MODAL Y ALERTAS MANUALES
========================================================= */

function abrirModal() {
    if (!puedeGestionarAlertas()) {
        alert(
            "Tu rol no tiene permiso para registrar alertas manuales."
        );

        return;
    }

    if (!formAlerta || !modalAlerta) {
        return;
    }

    formAlerta.reset();

    if (estadoAlerta) {
        estadoAlerta.value = "Abierta";
    }

    if (severidadAlerta) {
        severidadAlerta.value = "Media";
    }

    modalAlerta.classList.add("show");
}

function cerrarModal() {
    if (modalAlerta) {
        modalAlerta.classList.remove("show");
    }

    if (formAlerta) {
        formAlerta.reset();
    }
}

async function guardarAlertaManual() {
    if (!puedeGestionarAlertas()) {
        alert(
            "Tu rol no tiene permiso para guardar alertas manuales."
        );

        return;
    }

    const titulo = tituloAlerta
        ? tituloAlerta.value.trim()
        : "";

    if (!titulo) {
        alert(
            "El título de la alerta es obligatorio."
        );

        return;
    }

    const payload = {
        titulo: titulo,
        tipo:
            tipoAlerta?.value ||
            "Manual",
        severidad:
            severidadAlerta?.value ||
            "Media",
        estado:
            estadoAlerta?.value ||
            "Abierta",
        descripcion:
            descripcionAlerta?.value.trim() ||
            "",
        idProyecto:
            proyectoAlerta?.value
                ? Number(proyectoAlerta.value)
                : null,
        idTarea: null,
        idMiembroAsignado:
            asignadoAlerta?.value
                ? Number(asignadoAlerta.value)
                : null,
        fechaLimite:
            fechaLimiteAlerta?.value ||
            null
    };

    cambiarEstadoBoton(
        btnGuardarAlerta,
        true,
        "Guardando..."
    );

    try {
        const respuesta = await fetch(
            API_ALERTAS,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...obtenerHeadersSesion()
                },
                body: JSON.stringify(payload)
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible guardar la alerta."
            );
        }

        cerrarModal();
        await cargarCentroAlertas();

        alert(
            datos.mensaje ||
            "Alerta guardada correctamente."
        );

    } catch (error) {
        console.error(
            "Error al guardar alerta:",
            error
        );

        alert(
            error.message ||
            "No fue posible guardar la alerta."
        );

    } finally {
        cambiarEstadoBoton(
            btnGuardarAlerta,
            false,
            "Guardar alerta"
        );
    }
}

/* =========================================================
   SELECTS DEL MODAL
========================================================= */

function llenarSelectsModal() {
    llenarProyectosModal();
    llenarMiembrosModal();
}

function llenarProyectosModal() {
    if (!proyectoAlerta) {
        return;
    }

    const valorAnterior =
        proyectoAlerta.value;

    proyectoAlerta.innerHTML = `
        <option value="">
            Sin proyecto relacionado
        </option>
    `;

    proyectosAlertas.forEach(
        function (proyecto) {
            const opcion =
                document.createElement("option");

            opcion.value = proyecto.id;
            opcion.textContent = proyecto.nombre;

            proyectoAlerta.appendChild(opcion);
        }
    );

    proyectoAlerta.value = valorAnterior;
}

function llenarMiembrosModal() {
    if (!asignadoAlerta) {
        return;
    }

    const valorAnterior =
        asignadoAlerta.value;

    asignadoAlerta.innerHTML = `
        <option value="">
            Sin responsable asignado
        </option>
    `;

    miembrosAlertas.forEach(
        function (miembro) {
            const opcion =
                document.createElement("option");

            opcion.value = miembro.id;
            opcion.textContent =
                miembro.nombreCompleto;

            asignadoAlerta.appendChild(opcion);
        }
    );

    asignadoAlerta.value = valorAnterior;
}

/* =========================================================
   RESUMEN
========================================================= */

function actualizarResumen() {
    const abiertas = alertasFinales.filter(
        function (alerta) {
            return normalizarTexto(
                alerta.estado
            ) === "abierta";
        }
    );

    const enAtencion = alertasFinales.filter(
        function (alerta) {
            return normalizarTexto(
                alerta.estado
            ) === "en atencion";
        }
    );

    const criticasAltas = alertasFinales.filter(
        function (alerta) {
            const severidad = normalizarTexto(
                alerta.severidad
            );

            return (
                severidad === "critica" ||
                severidad === "alta"
            );
        }
    );

    const bloqueadas = alertasFinales.filter(
        function (alerta) {
            return normalizarTexto(
                alerta.tipo
            ) === "tarea bloqueada";
        }
    );

    const vencidas = alertasFinales.filter(
        function (alerta) {
            return normalizarTexto(
                alerta.tipo
            ) === "tarea vencida";
        }
    );

    const horasRechazadas = alertasFinales.filter(
        function (alerta) {
            return normalizarTexto(
                alerta.tipo
            ) === "horas rechazadas";
        }
    );

    actualizarTexto(contadorAbiertas, abiertas.length);
    actualizarTexto(contadorAtencion, enAtencion.length);
    actualizarTexto(resumenCriticas, criticasAltas.length);
    actualizarTexto(resumenBloqueadas, bloqueadas.length);
    actualizarTexto(resumenVencidas, vencidas.length);
    actualizarTexto(
        resumenHorasRechazadas,
        horasRechazadas.length
    );
}

/* =========================================================
   UTILIDADES DE RELACIÓN
========================================================= */

function obtenerNombreMiembro(idMiembro) {
    const miembro = miembrosAlertas.find(
        function (item) {
            return String(item.id) ===
                String(idMiembro);
        }
    );

    return miembro?.nombreCompleto ||
        "Sin responsable";
}

function obtenerNombreMiembroRegistro(registro) {
    if (registro.miembroNombre) {
        return registro.miembroNombre;
    }

    return obtenerNombreMiembro(
        registro.idMiembro
    );
}

function obtenerNombreProyecto(idProyecto) {
    const proyecto = proyectosAlertas.find(
        function (item) {
            return String(item.id) ===
                String(idProyecto);
        }
    );

    return proyecto?.nombre ||
        "";
}

function esTareaTerminada(estado) {
    const texto = normalizarTexto(estado);

    return (
        texto.includes("completada") ||
        texto.includes("completado") ||
        texto.includes("cerrada") ||
        texto.includes("finalizada") ||
        texto.includes("finalizado")
    );
}

/* =========================================================
   MENSAJES Y CARGA
========================================================= */

function mostrarCargaAlertas() {
    if (!contenedorAlertas) {
        return;
    }

    contenedorAlertas.innerHTML = `
        <div class="empty-state">
            <h3>Cargando alertas...</h3>

            <p>
                Consultando tareas, integrantes, registros de horas y alertas manuales.
            </p>
        </div>
    `;
}

function mostrarMensaje(mensaje, tipo) {
    if (!mensajeAlertas ||
        !textoMensajeAlertas) {
        return;
    }

    mensajeAlertas.style.display = "flex";

    mensajeAlertas.className =
        `alerts-notice ${tipo || ""}`;

    textoMensajeAlertas.textContent = mensaje;
}

function ocultarMensaje() {
    if (!mensajeAlertas) {
        return;
    }

    mensajeAlertas.style.display = "none";
}

function cambiarEstadoBoton(
    boton,
    bloqueado,
    texto
) {
    if (!boton) {
        return;
    }

    boton.disabled = bloqueado;
    boton.textContent = texto;
}

function actualizarTexto(
    elemento,
    valor
) {
    if (elemento) {
        elemento.textContent = valor;
    }
}

function obtenerFechaHoyLocal() {
    const fecha = new Date();

    const anio = fecha.getFullYear();

    const mes = String(
        fecha.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        fecha.getDate()
    ).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function limpiarFecha(fecha) {
    if (!fecha) {
        return "";
    }

    return String(fecha).split("T")[0];
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "Sin fecha";
    }

    const partes = String(fecha)
        .split("T")[0]
        .split("-");

    if (partes.length !== 3) {
        return String(fecha);
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function convertirFecha(fecha) {
    if (!fecha) {
        return 0;
    }

    const tiempo = new Date(fecha).getTime();

    return Number.isNaN(tiempo)
        ? 0
        : tiempo;
}

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function obtenerClaseSeveridad(severidad) {
    const texto = normalizarTexto(severidad);

    if (texto === "critica") {
        return "critica";
    }

    if (texto === "alta") {
        return "alta";
    }

    if (texto === "baja") {
        return "baja";
    }

    return "media";
}

function obtenerColorSeveridad(severidad) {
    const texto = normalizarTexto(severidad);

    if (texto === "critica") {
        return "red";
    }

    if (texto === "alta") {
        return "orange";
    }

    if (texto === "media") {
        return "yellow";
    }

    return "gray";
}

function obtenerColorEstado(estado) {
    const texto = normalizarTexto(estado);

    if (texto === "abierta") {
        return "red";
    }

    if (texto === "en atencion") {
        return "yellow";
    }

    if (texto === "escalada") {
        return "orange";
    }

    if (texto === "resuelta") {
        return "green";
    }

    return "gray";
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escaparAtributo(valor) {
    return String(valor ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}
