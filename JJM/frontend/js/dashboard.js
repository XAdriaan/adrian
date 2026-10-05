const API_PROYECTOS =
    (window.apiUrl ? "/api/proyectos" : "/api/proyectos");

const API_TAREAS =
    (window.apiUrl ? "/api/tareas" : "/api/tareas");

const API_MIEMBROS =
    (window.apiUrl ? "/api/miembros" : "/api/miembros");

const API_REGISTROS_HORAS =
    (window.apiUrl ? "/api/registros-horas" : "/api/registros-horas");

/* =========================================================
   DATOS PRINCIPALES
========================================================= */

let usuarioActivo = obtenerUsuarioActivo();

let proyectosDashboard = [];
let tareasDashboard = [];
let miembrosDashboard = [];
let registrosHorasDashboard = [];

/* =========================================================
   ELEMENTOS
========================================================= */

const tituloDashboard =
    document.getElementById("tituloDashboard");

const descripcionDashboard =
    document.getElementById("descripcionDashboard");

const saludoDashboard =
    document.getElementById("saludoDashboard");

const indicadorRolDashboard =
    document.getElementById("indicadorRolDashboard");

const btnActualizarDashboard =
    document.getElementById("btnActualizarDashboard");

const mensajeDashboard =
    document.getElementById("mensajeDashboard");

const textoMensajeDashboard =
    document.getElementById("textoMensajeDashboard");

const totalProyectosActivos =
    document.getElementById("totalProyectosActivos");

const totalTareas =
    document.getElementById("totalTareas");

const totalAlertas =
    document.getElementById("totalAlertas");

const totalHoras =
    document.getElementById("totalHoras");

const etiquetaProyectos =
    document.getElementById("etiquetaProyectos");

const etiquetaTareas =
    document.getElementById("etiquetaTareas");

const etiquetaAlertas =
    document.getElementById("etiquetaAlertas");

const etiquetaHoras =
    document.getElementById("etiquetaHoras");

const tituloTareasRecientes =
    document.getElementById("tituloTareasRecientes");

const descripcionTareasRecientes =
    document.getElementById(
        "descripcionTareasRecientes"
    );

const tituloActividad =
    document.getElementById("tituloActividad");

const descripcionActividad =
    document.getElementById(
        "descripcionActividad"
    );

const proyectosOverview =
    document.getElementById("proyectosOverview");

const tareasOverview =
    document.getElementById("tareasOverview");

const actividadOverview =
    document.getElementById("actividadOverview");

const tituloJornada =
    document.getElementById("tituloJornada");

const textoJornada =
    document.getElementById("textoJornada");

const tarjetaJornada =
    document.getElementById("tarjetaJornada");

/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {
        if (window.restaurarSesionPMO) await window.restaurarSesionPMO();
        usuarioActivo = obtenerUsuarioActivo();

        if (!usuarioActivo) {
            window.location.replace("login.html");
            return;
        }

        configurarEventos();
        configurarEncabezadoDashboard();

        await cargarDashboard();
    }
);

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    if (btnActualizarDashboard) {
        btnActualizarDashboard.addEventListener(
            "click",
            cargarDashboard
        );
    }
}

/* =========================================================
   SESIÓN Y ROL
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
        null;
}

function obtenerNombreUsuarioActivo() {
    if (!usuarioActivo) {
        return "Usuario";
    }

    return usuarioActivo.nombreCompleto ||
        usuarioActivo.nombre ||
        usuarioActivo.usuario ||
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
        "";
}

function esAdministrador() {
    if (window.PMOPermisos && window.PMOPermisos.tiene("proyectos.ver_todos")) return true;

    const rol = normalizarTextoCompatibilidadPermisos(obtenerRolCompatibilidadPermisos());
    return rol === "superadministrador" || rol === "administrador" || rol === "admin pmo" || rol === "admin_pmo" || rol === "administrador pmo";
}
function esAdministradorRealDashboard() {
    return !!(window.PMOPermisos && typeof window.PMOPermisos.esAdministradorReal === "function" && window.PMOPermisos.esAdministradorReal());
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
    const idUsuario =
        obtenerIdUsuarioActivo();

    if (!idUsuario) {
        return {};
    }

    return {
        "X-Usuario-Id": String(idUsuario)
    };
}

/* =========================================================
   ENCABEZADO DINÁMICO
========================================================= */

function configurarEncabezadoDashboard() {
    const nombre =
        obtenerNombreUsuarioActivo();

    if (saludoDashboard) {
        saludoDashboard.textContent =
            `Bienvenido, ${nombre}`;
    }

    if (esAdministrador()) {
        if (tituloDashboard) {
            tituloDashboard.textContent = esAdministradorRealDashboard()
                ? "Dashboard administrativo"
                : "Dashboard global";
        }

        if (descripcionDashboard) {
            descripcionDashboard.textContent = esAdministradorRealDashboard()
                ? "Resumen de proyectos, tareas, horas y actividad del equipo."
                : "Consulta global de proyectos, tareas, horas y actividad según los permisos de tu rol.";
        }

        if (indicadorRolDashboard) {
            indicadorRolDashboard.textContent = obtenerNombreRolUsuario() || "Usuario";

            indicadorRolDashboard.className = esAdministradorRealDashboard()
                ? "role-indicator admin"
                : "role-indicator collaborator";
        }

        if (etiquetaProyectos) {
            etiquetaProyectos.textContent =
                "Proyectos activos";
        }

        if (etiquetaTareas) {
            etiquetaTareas.textContent =
                "Tareas registradas";
        }

        if (etiquetaAlertas) {
            etiquetaAlertas.textContent =
                "Tareas bloqueadas";
        }

        if (etiquetaHoras) {
            etiquetaHoras.textContent =
                "Horas pendientes";
        }

        if (tituloTareasRecientes) {
            tituloTareasRecientes.textContent =
                "Tareas recientes";
        }

        if (descripcionTareasRecientes) {
            descripcionTareasRecientes.textContent =
                "Actividades registradas recientemente.";
        }

        if (tituloActividad) {
            tituloActividad.textContent =
                "Actividad reciente del equipo";
        }

        if (descripcionActividad) {
            descripcionActividad.textContent =
                "Últimos registros de jornada y horas manuales.";
        }

        return;
    }

    if (tituloDashboard) {
        tituloDashboard.textContent =
            "Mi Dashboard";
    }

    if (descripcionDashboard) {
        descripcionDashboard.textContent =
            "Consulta tus proyectos, tareas y registro de horas.";
    }

    if (indicadorRolDashboard) {
        indicadorRolDashboard.textContent =
            obtenerNombreRolUsuario() ||
            "Usuario";

        indicadorRolDashboard.className =
            "role-indicator collaborator";
    }

    if (etiquetaProyectos) {
        etiquetaProyectos.textContent =
            "Proyectos disponibles";
    }

    if (etiquetaTareas) {
        etiquetaTareas.textContent =
            "Mis tareas";
    }

    if (etiquetaAlertas) {
        etiquetaAlertas.textContent =
            "Tareas bloqueadas";
    }

    if (etiquetaHoras) {
        etiquetaHoras.textContent =
            "Horas de hoy";
    }

    if (tituloTareasRecientes) {
        tituloTareasRecientes.textContent =
            "Mis tareas recientes";
    }

    if (descripcionTareasRecientes) {
        descripcionTareasRecientes.textContent =
            "Actividades asignadas o disponibles para el usuario.";
    }

    if (tituloActividad) {
        tituloActividad.textContent =
            "Mi actividad reciente";
    }

    if (descripcionActividad) {
        descripcionActividad.textContent =
            "Tus últimos registros de jornada y horas.";
    }
}

/* =========================================================
   CARGAR DASHBOARD
========================================================= */

async function cargarDashboard() {
    mostrarEstadoCarga();

    cambiarEstadoBoton(
        btnActualizarDashboard,
        true,
        "Actualizando..."
    );

    try {
        const resultados = await Promise.allSettled([
            obtenerDatosDesdeAPI(
                API_PROYECTOS,
                ["proyectos", "data"]
            ),

            obtenerDatosDesdeAPI(
                API_TAREAS,
                ["tareas", "data"]
            ),

            obtenerDatosDesdeAPI(
                API_MIEMBROS,
                ["miembros", "data"]
            ),

            obtenerDatosDesdeAPI(
                API_REGISTROS_HORAS,
                ["registros", "data"]
            )
        ]);

        proyectosDashboard =
            resultados[0].status === "fulfilled"
                ? resultados[0].value.map(
                    normalizarProyecto
                )
                : obtenerProyectosLocales();

        tareasDashboard =
            resultados[1].status === "fulfilled"
                ? resultados[1].value.map(
                    normalizarTarea
                )
                : obtenerTareasLocales();

        miembrosDashboard =
            resultados[2].status === "fulfilled"
                ? resultados[2].value.map(
                    normalizarMiembro
                )
                : obtenerMiembrosLocales();

        registrosHorasDashboard =
            resultados[3].status === "fulfilled"
                ? resultados[3].value.map(
                    normalizarRegistroHoras
                )
                : obtenerHorasLocales();

        const fallos = resultados.filter(
            function (resultado) {
                return resultado.status === "rejected";
            }
        ).length;

        actualizarEstadisticas();
        renderizarEstadoJornada();
        renderizarProyectosRecientes();
        renderizarTareasRecientes();
        renderizarActividadReciente();

        if (fallos > 0) {
            mostrarMensajeDashboard(
                "Algunos datos se cargaron desde información local porque una o más conexiones con el servidor no estuvieron disponibles.",
                "warning"
            );
        } else {
            ocultarMensajeDashboard();
        }

    } catch (error) {
        console.error(
            "Error al cargar Dashboard:",
            error
        );

        mostrarMensajeDashboard(
            "No fue posible cargar toda la información del Dashboard. Verifica que Apache, MySQL y el backend Java estén activos.",
            "error"
        );

    } finally {
        cambiarEstadoBoton(
            btnActualizarDashboard,
            false,
            "↻ Actualizar"
        );
    }
}

/* =========================================================
   PETICIONES API
========================================================= */

async function obtenerDatosDesdeAPI(
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
            "Pendiente",

        avance:
            Number(
                proyecto.porcentajeAvance ||
                proyecto.avance ||
                0
            ),

        responsable:
            proyecto.responsableNombre ||
            proyecto.responsable ||
            "Sin responsable",

        cliente:
            proyecto.organizacionNombre ||
            proyecto.clienteArea ||
            proyecto.cliente ||
            proyecto.area ||
            "Sin cliente o área",

        fechaCreacion:
            proyecto.fechaCreacion ||
            proyecto.fechaInicio ||
            proyecto.fechaInicioReal ||
            ""
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

        proyectoNombre:
            tarea.proyectoNombre ||
            tarea.proyecto ||
            "Proyecto sin nombre",

        faseNombre:
            tarea.faseNombre ||
            tarea.fase ||
            "Sin fase",

        miembroNombre:
            tarea.miembroNombre ||
            tarea.asignado ||
            "Sin asignar",

        idMiembro:
            tarea.idMiembro ||
            tarea.miembroId ||
            tarea.asignadoId ||
            "",

        idUsuario:
            tarea.idUsuario ||
            tarea.usuarioId ||
            "",

        estado:
            tarea.estado ||
            "Pendiente",

        prioridad:
            tarea.prioridad ||
            "Media",

        horasEstimadas:
            Number(
                tarea.horasEstimadas ||
                tarea.horas ||
                0
            ),

        fechaCreacion:
            tarea.fechaCreacion ||
            tarea.fecha ||
            tarea.fechaLimite ||
            ""
    };
}

function normalizarMiembro(miembro) {
    return {
        id:
            miembro.id ||
            miembro.idMiembro ||
            "",

        idUsuario:
            miembro.idUsuario ||
            miembro.usuarioId ||
            miembro.usuario?.id ||
            miembro.usuario?.idUsuario ||
            "",

        nombreCompleto:
            miembro.nombreCompleto ||
            miembro.nombre ||
            "Sin nombre",

        estado:
            miembro.estado ||
            "Activo"
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
            "",

        fechaCreacion:
            limpiarFecha(
                registro.fechaCreacion ||
                registro.fecha
            )
    };
}

/* =========================================================
   FILTROS DE USUARIO
========================================================= */

function obtenerIdMiembroUsuarioActivo() {
    const idUsuario =
        obtenerIdUsuarioActivo();

    if (!idUsuario) {
        return null;
    }

    const miembro = miembrosDashboard.find(
        function (item) {
            return String(item.idUsuario) ===
                String(idUsuario);
        }
    );

    return miembro?.id || null;
}

function obtenerTareasVisibles() {
    if (esAdministrador()) {
        return tareasDashboard.slice();
    }

    const idUsuario =
        obtenerIdUsuarioActivo();

    const idMiembro =
        obtenerIdMiembroUsuarioActivo();

    const tareasRelacionadas =
        tareasDashboard.filter(function (tarea) {
            if (
                idMiembro &&
                String(tarea.idMiembro) ===
                String(idMiembro)
            ) {
                return true;
            }

            if (
                idUsuario &&
                String(tarea.idUsuario) ===
                String(idUsuario)
            ) {
                return true;
            }

            return false;
        });

    /*
     * Si el backend ya filtró tareas por usuario y no entrega
     * idMiembro/idUsuario, conserva los datos recibidos.
     */
    const noHayReferenciasAsignacion =
        tareasDashboard.every(function (tarea) {
            return !tarea.idMiembro &&
                !tarea.idUsuario;
        });

    return noHayReferenciasAsignacion
        ? tareasDashboard.slice()
        : tareasRelacionadas;
}

function obtenerRegistrosVisibles() {
    if (esAdministrador()) {
        return registrosHorasDashboard.slice();
    }

    const idMiembro =
        obtenerIdMiembroUsuarioActivo();

    /*
     * El backend ya debe devolver únicamente las horas propias
     * para colaboradores. Solo se filtra si hay idMiembro disponible.
     */
    if (!idMiembro) {
        return registrosHorasDashboard.slice();
    }

    return registrosHorasDashboard.filter(
        function (registro) {
            return String(registro.idMiembro) ===
                String(idMiembro);
        }
    );
}

/* =========================================================
   ESTADÍSTICAS
========================================================= */

function actualizarEstadisticas() {
    const tareasVisibles =
        obtenerTareasVisibles();

    const registrosVisibles =
        obtenerRegistrosVisibles();

    const proyectosActivos =
        proyectosDashboard.filter(
            proyectoEstaActivo
        );

    const tareasBloqueadas =
        tareasVisibles.filter(function (tarea) {
            return normalizarTexto(
                tarea.estado
            ) === "bloqueada";
        }
    );

    let valorHoras = 0;

    if (esAdministrador()) {
        valorHoras = registrosVisibles
            .filter(function (registro) {
                return normalizarTexto(
                    registro.estadoValidacion
                ) === "pendiente";
            })
            .reduce(function (total, registro) {
                return total + Number(
                    registro.horasTrabajadas || 0
                );
            }, 0);

    } else {
        const fechaHoy = obtenerFechaHoyLocal();

        valorHoras = registrosVisibles
            .filter(function (registro) {
                return registro.fecha === fechaHoy;
            })
            .reduce(function (total, registro) {
                return total + Number(
                    registro.horasTrabajadas || 0
                );
            }, 0);
    }

    actualizarTexto(
        totalProyectosActivos,
        proyectosActivos.length
    );

    actualizarTexto(
        totalTareas,
        tareasVisibles.length
    );

    actualizarTexto(
        totalAlertas,
        tareasBloqueadas.length
    );

    actualizarTexto(
        totalHoras,
        `${valorHoras.toFixed(2)}h`
    );
}

function proyectoEstaActivo(proyecto) {
    const estado = normalizarTexto(
        proyecto.estado
    );

    return !(
        estado.includes("cerrado") ||
        estado.includes("cancelado") ||
        estado.includes("finalizado")
    );
}

/* =========================================================
   ESTADO DE JORNADA
========================================================= */

function renderizarEstadoJornada() {
    if (!tituloJornada || !textoJornada) {
        return;
    }

    const registros =
        obtenerRegistrosVisibles();

    const fechaHoy =
        obtenerFechaHoyLocal();

    const jornadaAbierta = registros.find(
        function (registro) {
            return (
                normalizarTexto(
                    registro.tipoRegistro
                ) === "jornada" &&
                normalizarTexto(
                    registro.estadoValidacion
                ) === "pendiente" &&
                !registro.horaSalida
            );
        }
    );

    const horasHoy = registros
        .filter(function (registro) {
            return registro.fecha === fechaHoy;
        })
        .reduce(function (total, registro) {
            return total + Number(
                registro.horasTrabajadas || 0
            );
        }, 0);

    if (jornadaAbierta) {
        tituloJornada.textContent =
            "Jornada en curso";

        textoJornada.textContent =
            `La jornada inició a las ${formatearHora(jornadaAbierta.horaEntrada)}. Registra la salida cuando termines tus actividades.`;

        if (tarjetaJornada) {
            tarjetaJornada.className =
                "jornada-card jornada-open";
        }

        return;
    }

    if (esAdministrador()) {
        tituloJornada.textContent =
            "Control de horas administrativo";

        textoJornada.textContent =
            `Existen ${horasHoy.toFixed(2)} horas registradas hoy en los datos disponibles.`;
    } else {
        tituloJornada.textContent =
            "Jornada cerrada";

        textoJornada.textContent =
            `Hoy se han registrado ${horasHoy.toFixed(2)} horas. Puedes iniciar una nueva jornada desde Control de horas.`;
    }

    if (tarjetaJornada) {
        tarjetaJornada.className =
            "jornada-card";
    }
}

/* =========================================================
   PROYECTOS RECIENTES
========================================================= */

function renderizarProyectosRecientes() {
    if (!proyectosOverview) {
        return;
    }

    const recientes = proyectosDashboard
        .slice()
        .sort(function (a, b) {
            return convertirFecha(b.fechaCreacion) -
                convertirFecha(a.fechaCreacion);
        })
        .slice(0, 5);

    if (recientes.length === 0) {
        proyectosOverview.innerHTML = `
            <div class="empty-dashboard">
                <h3>No hay proyectos disponibles</h3>

                <p>
                    ${
                        esAdministrador()
                            ? "Crea un proyecto para comenzar a organizar el trabajo."
                            : "Cuando se te asigne un proyecto, aparecerá aquí."
                    }
                </p>
            </div>
        `;

        return;
    }

    proyectosOverview.innerHTML = "";

    recientes.forEach(function (proyecto) {
        const item =
            document.createElement("div");

        item.className =
            "dashboard-project-item";

        item.innerHTML = `
            <div class="project-item-info">
                <h3>
                    ${escaparHTML(proyecto.nombre)}
                </h3>

                <p>
                    ${escaparHTML(proyecto.cliente)}
                    ·
                    ${escaparHTML(proyecto.responsable)}
                </p>
            </div>

            <div class="project-item-status">
                <span class="badge ${obtenerColorEstado(proyecto.estado)}">
                    ${escaparHTML(proyecto.estado)}
                </span>

                <strong>
                    ${Number(proyecto.avance || 0)}%
                </strong>
            </div>
        `;

        item.addEventListener(
            "click",
            function () {
                if (!proyecto.id) {
                    window.location.href =
                        "proyectos.html";

                    return;
                }

                window.location.href =
                    `detalle-proyecto.html?id=${encodeURIComponent(proyecto.id)}`;
            }
        );

        proyectosOverview.appendChild(item);
    });
}

/* =========================================================
   TAREAS RECIENTES
========================================================= */

function renderizarTareasRecientes() {
    if (!tareasOverview) {
        return;
    }

    const tareasVisibles =
        obtenerTareasVisibles();

    const recientes = tareasVisibles
        .slice()
        .sort(function (a, b) {
            return convertirFecha(b.fechaCreacion) -
                convertirFecha(a.fechaCreacion);
        })
        .slice(0, 5);

    if (recientes.length === 0) {
        tareasOverview.innerHTML = `
            <div class="empty-dashboard">
                <h3>No hay tareas disponibles</h3>

                <p>
                    ${
                        esAdministrador()
                            ? "Crea una tarea desde el tablero o desde un proyecto."
                            : "Cuando se te asignen tareas, aparecerán en esta sección."
                    }
                </p>
            </div>
        `;

        return;
    }

    tareasOverview.innerHTML = "";

    recientes.forEach(function (tarea) {
        const item =
            document.createElement("div");

        item.className =
            "dashboard-task-item";

        item.innerHTML = `
            <div class="task-item-info">
                <h3>
                    ${escaparHTML(tarea.titulo)}
                </h3>

                <p>
                    ${escaparHTML(tarea.proyectoNombre)}
                    ·
                    ${escaparHTML(tarea.faseNombre)}
                </p>
            </div>

            <div class="task-item-status">
                <span class="badge ${obtenerColorEstadoTarea(tarea.estado)}">
                    ${escaparHTML(tarea.estado)}
                </span>

                <small>
                    ${escaparHTML(tarea.prioridad)}
                </small>
            </div>
        `;

        item.addEventListener(
            "click",
            function () {
                window.location.href =
                    "tablero-tareas.html";
            }
        );

        tareasOverview.appendChild(item);
    });
}

/* =========================================================
   ACTIVIDAD RECIENTE
========================================================= */

function renderizarActividadReciente() {
    if (!actividadOverview) {
        return;
    }

    const registros =
        obtenerRegistrosVisibles()
            .slice()
            .sort(function (a, b) {
                return convertirFechaHora(b) -
                    convertirFechaHora(a);
            })
            .slice(0, 6);

    if (registros.length === 0) {
        actividadOverview.innerHTML = `
            <div class="empty-dashboard">
                <h3>No hay actividad reciente</h3>

                <p>
                    Los registros de jornada y horas aparecerán en esta sección.
                </p>
            </div>
        `;

        return;
    }

    actividadOverview.innerHTML = "";

    registros.forEach(function (registro) {
        const item =
            document.createElement("article");

        item.className =
            "activity-item";

        const tituloActividad = obtenerTituloActividad(
            registro
        );

        const descripcionActividad =
            obtenerDescripcionActividad(
                registro
            );

        item.innerHTML = `
            <div class="activity-icon ${obtenerClaseActividad(registro)}">
                ${obtenerIconoActividad(registro)}
            </div>

            <div class="activity-content">
                <h3>
                    ${escaparHTML(tituloActividad)}
                </h3>

                <p>
                    ${escaparHTML(descripcionActividad)}
                </p>
            </div>

            <div class="activity-meta">
                <strong>
                    ${Number(
                        registro.horasTrabajadas || 0
                    ).toFixed(2)}h
                </strong>

                <span>
                    ${escaparHTML(
                        formatearFecha(
                            registro.fecha
                        )
                    )}
                </span>
            </div>
        `;

        item.addEventListener(
            "click",
            function () {
                window.location.href =
                    "control-horas.html";
            }
        );

        actividadOverview.appendChild(item);
    });
}

function obtenerTituloActividad(registro) {
    const esJornada =
        normalizarTexto(
            registro.tipoRegistro
        ) === "jornada";

    if (esJornada && !registro.horaSalida) {
        return "Jornada iniciada";
    }

    if (esJornada) {
        return "Jornada finalizada";
    }

    return "Registro de horas";
}

function obtenerDescripcionActividad(registro) {
    const persona = esAdministrador()
        ? obtenerNombreMiembroRegistro(registro)
        : "Tu registro";

    const textoBase =
        registro.descripcion ||
        formatearHorario(
            registro.horaEntrada,
            registro.horaSalida
        );

    return `${persona} · ${textoBase}`;
}

function obtenerClaseActividad(registro) {
    const estado = normalizarTexto(
        registro.estadoValidacion
    );

    if (estado === "aprobado") {
        return "success";
    }

    if (estado === "rechazado") {
        return "danger";
    }

    if (
        normalizarTexto(registro.tipoRegistro) ===
        "jornada"
    ) {
        return "primary";
    }

    return "warning";
}

function obtenerIconoActividad(registro) {
    const tipo = normalizarTexto(
        registro.tipoRegistro
    );

    if (tipo === "jornada") {
        return "🕒";
    }

    if (
        normalizarTexto(
            registro.estadoValidacion
        ) === "aprobado"
    ) {
        return "✓";
    }

    return "⏱";
}

function obtenerNombreMiembroRegistro(registro) {
    if (registro.miembroNombre) {
        return registro.miembroNombre;
    }

    const miembro = miembrosDashboard.find(
        function (item) {
            return String(item.id) ===
                String(registro.idMiembro);
        }
    );

    return miembro?.nombreCompleto ||
        "Integrante";
}

/* =========================================================
   MENSAJES Y CARGA
========================================================= */

function mostrarEstadoCarga() {
    if (proyectosOverview) {
        proyectosOverview.innerHTML = `
            <div class="empty-dashboard">
                <h3>Cargando proyectos...</h3>
                <p>Consultando la información del sistema.</p>
            </div>
        `;
    }

    if (tareasOverview) {
        tareasOverview.innerHTML = `
            <div class="empty-dashboard">
                <h3>Cargando tareas...</h3>
                <p>Consultando las actividades disponibles.</p>
            </div>
        `;
    }

    if (actividadOverview) {
        actividadOverview.innerHTML = `
            <div class="empty-dashboard">
                <h3>Cargando actividad...</h3>
                <p>Consultando registros de horas.</p>
            </div>
        `;
    }
}

function mostrarMensajeDashboard(
    mensaje,
    tipo
) {
    if (!mensajeDashboard ||
        !textoMensajeDashboard) {
        return;
    }

    mensajeDashboard.style.display =
        "flex";

    mensajeDashboard.className =
        `dashboard-notice ${tipo || ""}`;

    textoMensajeDashboard.textContent =
        mensaje;
}

function ocultarMensajeDashboard() {
    if (!mensajeDashboard) {
        return;
    }

    mensajeDashboard.style.display =
        "none";
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

/* =========================================================
   UTILIDADES
========================================================= */

function actualizarTexto(
    elemento,
    valor
) {
    if (elemento) {
        elemento.textContent = valor;
    }
}

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
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

function formatearHora(hora) {
    if (!hora) {
        return "—";
    }

    return String(hora).slice(0, 5);
}

function formatearHorario(
    horaEntrada,
    horaSalida
) {
    if (horaEntrada && horaSalida) {
        return `${formatearHora(horaEntrada)} - ${formatearHora(horaSalida)}`;
    }

    if (horaEntrada) {
        return `${formatearHora(horaEntrada)} - Jornada abierta`;
    }

    return "Sin horario";
}

function convertirFecha(fecha) {
    if (!fecha) {
        return 0;
    }

    const valor = new Date(fecha).getTime();

    return Number.isNaN(valor)
        ? 0
        : valor;
}

function convertirFechaHora(registro) {
    const fecha =
        registro.fecha ||
        registro.fechaCreacion ||
        "";

    const hora =
        registro.horaEntrada ||
        "00:00:00";

    const valor = new Date(
        `${fecha}T${hora}`
    ).getTime();

    return Number.isNaN(valor)
        ? 0
        : valor;
}

function obtenerColorEstado(estado) {
    const texto =
        normalizarTexto(estado);

    if (
        texto.includes("cerrado") ||
        texto.includes("completado") ||
        texto.includes("finalizado")
    ) {
        return "green";
    }

    if (
        texto.includes("progreso") ||
        texto.includes("ejecucion") ||
        texto.includes("monitoreo")
    ) {
        return "orange";
    }

    if (
        texto.includes("cancelado") ||
        texto.includes("bloqueado") ||
        texto.includes("riesgo")
    ) {
        return "red";
    }

    if (
        texto.includes("pendiente") ||
        texto.includes("inicio") ||
        texto.includes("planificacion")
    ) {
        return "blue";
    }

    return "gray";
}

function obtenerColorEstadoTarea(estado) {
    const texto =
        normalizarTexto(estado);

    if (texto.includes("completada")) {
        return "green";
    }

    if (texto.includes("progreso")) {
        return "orange";
    }

    if (texto.includes("bloqueada")) {
        return "red";
    }

    if (texto.includes("pendiente")) {
        return "blue";
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
