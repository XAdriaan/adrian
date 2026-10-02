const API_REGISTROS_HORAS =
    window.apiUrl("/api/registros-horas");

const API_MIEMBROS =
    window.apiUrl("/api/miembros");

const API_PROYECTOS =
    window.apiUrl("/api/proyectos");

const API_TAREAS =
    window.apiUrl("/api/tareas");

const CLAVE_FILTROS_REPORTES =
    "filtrosReportesPMO";

let usuarioActivo = obtenerUsuarioActivo();

let datosOriginales = {
    proyectos: [],
    tareas: [],
    miembros: [],
    horas: [],
    alertas: [],
    encuestas: [],
    certificados: []
};

let datosFiltrados = {
    proyectos: [],
    tareas: [],
    miembros: [],
    horas: [],
    alertas: [],
    encuestas: [],
    certificados: []
};

let filtrosReporte = {
    mesInicio: "",
    mesFin: ""
};

let filtrosHoras = {
    idMiembro: "",
    idProyecto: "",
    estado: "",
    tipo: ""
};

const cursosReporte = [
    "Advanced Gas Turbine Engine Technologies: Fueling the Future of Power",
    "Advanced Manufacturing: Driving the Next Industrial Revolution",
    "An Introduction to Tech Diplomacy",
    "Beyond Mach 5: Hypersonics Opportunities and Challenges",
    "Connecting Worlds: The Evolution and Impact of Advanced Communication Technologies (5G/6G)",
    "Cosmic Opportunities: Technologies for Sustained Presence in Space",
    "Cryptography: Technologies for Securing Data and Communications",
    "Cybersecurity: Securing Information in a Globally Distributed Economy",
    "Deepfakes Decoded: Navigating Disinformation in the Digital Age",
    "Emerging Tech: Leading in an Interconnected Landscape",
    "Energy Transition: The Challenge of Our Century",
    "Engineering the Future: The Revolutionary World of Robotics",
    "Genomic Insights: Opportunities & Risks of Statistical Genetics",
    "Navigating Tomorrow: Exploring the Frontiers of Autonomous Systems",
    "Optimizing Interactions: Human-Machine Interfaces",
    "Preparing for the Next Pandemic: Risks and Opportunities in Synthetic Biology",
    "Quantum Revolution: Computing Beyond Classical Limits",
    "Reimagining Power: The Next Era of Nuclear Technologies",
    "Securing Global Food Supplies: Innovations in Agriculture Technology",
    "The Challenge of Scale: Semiconductor Innovation and Manufacturing",
    "Transforming Money: Opportunities & Risks With Digital Currencies",
    "Understanding Neural Networks: Foundations of AI",
    "Course 1: Transformational Leadership for Tech Diplomacy",
    "Course 2: The Power of Trust for Transformation",
    "Course 3: Fueling Innovation",
    "Course 4: Adopting a Diplomatic Approach"
];

/* =========================================================
   ELEMENTOS PRINCIPALES
========================================================= */

const contenidoReportes =
    document.getElementById("contenidoReportes");

const mensajeAccesoReportes =
    document.getElementById("mensajeAccesoReportes");

const indicadorRolReportes =
    document.getElementById("indicadorRolReportes");

const btnActualizarReportes =
    document.getElementById("btnActualizarReportes");

const btnAplicarFiltroMes =
    document.getElementById("btnAplicarFiltroMes");

const btnLimpiarFiltroMes =
    document.getElementById("btnLimpiarFiltroMes");

const filtroMesInicio =
    document.getElementById("filtroMesInicio");

const filtroMesFin =
    document.getElementById("filtroMesFin");

const textoFiltroActivo =
    document.getElementById("textoFiltroActivo");

const tabButtons =
    document.querySelectorAll(".tab-btn");

const tabContents =
    document.querySelectorAll(".tab-content");

/* =========================================================
   RESUMEN
========================================================= */

const totalProyectosReporte =
    document.getElementById("totalProyectosReporte");

const totalTareasReporte =
    document.getElementById("totalTareasReporte");

const totalEquipoReporte =
    document.getElementById("totalEquipoReporte");

const totalHorasAprobadasReporte =
    document.getElementById(
        "totalHorasAprobadasReporte"
    );

const estadoGeneralPortafolio =
    document.getElementById(
        "estadoGeneralPortafolio"
    );

const estadoGeneralProductividad =
    document.getElementById(
        "estadoGeneralProductividad"
    );

const estadoGeneralHoras =
    document.getElementById(
        "estadoGeneralHoras"
    );

const estadoGeneralRiesgos =
    document.getElementById(
        "estadoGeneralRiesgos"
    );

/* =========================================================
   REPORTE MENSUAL
========================================================= */

const mensualProyectos =
    document.getElementById("mensualProyectos");

const mensualTareas =
    document.getElementById("mensualTareas");

const mensualHoras =
    document.getElementById("mensualHoras");

const mensualHorasAprobadas =
    document.getElementById(
        "mensualHorasAprobadas"
    );

const mensualAlertas =
    document.getElementById("mensualAlertas");

const mensualCertificados =
    document.getElementById(
        "mensualCertificados"
    );

const tablaReporteMensual =
    document.getElementById(
        "tablaReporteMensual"
    );

/* =========================================================
   TABLAS
========================================================= */

const tablaReporteProyectos =
    document.getElementById(
        "tablaReporteProyectos"
    );

const tablaReporteTareas =
    document.getElementById(
        "tablaReporteTareas"
    );

const tablaReporteEquipo =
    document.getElementById(
        "tablaReporteEquipo"
    );

const tablaReporteHoras =
    document.getElementById(
        "tablaReporteHoras"
    );

const tablaReporteAlertas =
    document.getElementById(
        "tablaReporteAlertas"
    );

const tablaReporteEncuestas =
    document.getElementById(
        "tablaReporteEncuestas"
    );

const tablaReporteCursos =
    document.getElementById(
        "tablaReporteCursos"
    );

const tablaReporteCertificados =
    document.getElementById(
        "tablaReporteCertificados"
    );

/* =========================================================
   FILTROS ESPECÍFICOS DE HORAS
========================================================= */

const filtroHorasMiembro =
    document.getElementById(
        "filtroHorasMiembro"
    );

const filtroHorasProyecto =
    document.getElementById(
        "filtroHorasProyecto"
    );

const filtroHorasEstado =
    document.getElementById(
        "filtroHorasEstado"
    );

const filtroHorasTipo =
    document.getElementById(
        "filtroHorasTipo"
    );

const btnAplicarFiltroHoras =
    document.getElementById(
        "btnAplicarFiltroHoras"
    );

const btnLimpiarFiltroHoras =
    document.getElementById(
        "btnLimpiarFiltroHoras"
    );

const horasTotalFiltrado =
    document.getElementById(
        "horasTotalFiltrado"
    );

const horasAprobadasFiltrado =
    document.getElementById(
        "horasAprobadasFiltrado"
    );

const horasPendientesFiltrado =
    document.getElementById(
        "horasPendientesFiltrado"
    );

const horasRechazadasFiltrado =
    document.getElementById(
        "horasRechazadasFiltrado"
    );

const textoHorasFiltradas =
    document.getElementById(
        "textoHorasFiltradas"
    );

const contadorHorasFiltradas =
    document.getElementById(
        "contadorHorasFiltradas"
    );

/* =========================================================
   BOTONES DE DESCARGA
========================================================= */

const btnDescargarReporteGeneral =
    document.getElementById(
        "btnDescargarReporteGeneral"
    );

const btnDescargarMensual =
    document.getElementById(
        "btnDescargarMensual"
    );

const btnDescargarProyectos =
    document.getElementById(
        "btnDescargarProyectos"
    );

const btnDescargarTareas =
    document.getElementById(
        "btnDescargarTareas"
    );

const btnDescargarEquipo =
    document.getElementById(
        "btnDescargarEquipo"
    );

const btnDescargarHoras =
    document.getElementById(
        "btnDescargarHoras"
    );

const btnDescargarAlertas =
    document.getElementById(
        "btnDescargarAlertas"
    );

const btnDescargarEncuestas =
    document.getElementById(
        "btnDescargarEncuestas"
    );

const btnDescargarCursos =
    document.getElementById(
        "btnDescargarCursos"
    );

const btnDescargarCertificados =
    document.getElementById(
        "btnDescargarCertificados"
    );

/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {
        usuarioActivo = obtenerUsuarioActivo();

        configurarTabs();
        configurarEventos();
        cargarFiltrosGuardados();
        configurarAcceso();
        configurarPermisosExportacionReportes();

        if (!esAdministrador()) {
            return;
        }

        await cargarReportes();
    }
);

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
    if (window.PMOPermisos && window.PMOPermisos.tiene("reportes.ver")) return true;

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

function puedeExportarReportes() {
    if (window.PMOPermisos && window.PMOPermisos.tiene("reportes.exportar")) return true;
    return !!(window.PMOPermisos && window.PMOPermisos.esSuperadmin());
}

function configurarPermisosExportacionReportes() {
    const botones = [
        btnDescargarReporteGeneral, btnDescargarMensual, btnDescargarProyectos,
        btnDescargarTareas, btnDescargarEquipo, btnDescargarHoras,
        btnDescargarAlertas, btnDescargarEncuestas, btnDescargarCursos, btnDescargarCertificados
    ].filter(Boolean);

    botones.forEach(function (boton) {
        boton.style.display = puedeExportarReportes() ? "" : "none";
    });
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

function configurarAcceso() {
    if (!usuarioActivo) {
        if (contenidoReportes) {
            contenidoReportes.style.display = "none";
        }

        if (mensajeAccesoReportes) {
            mensajeAccesoReportes.style.display = "flex";
        }

        if (btnActualizarReportes) {
            btnActualizarReportes.style.display = "none";
        }

        if (indicadorRolReportes) {
            indicadorRolReportes.textContent =
                "Sin sesión";
            indicadorRolReportes.className =
                "role-indicator restricted";
        }

        return;
    }

    if (esAdministrador()) {
        if (contenidoReportes) {
            contenidoReportes.style.display = "block";
        }

        if (mensajeAccesoReportes) {
            mensajeAccesoReportes.style.display = "none";
        }

        if (btnActualizarReportes) {
            btnActualizarReportes.style.display = "inline-flex";
        }

        if (indicadorRolReportes) {
            indicadorRolReportes.textContent =
                obtenerRolCompatibilidadPermisos() || "Acceso autorizado";
            indicadorRolReportes.className =
                "role-indicator admin";
        }

        return;
    }

    if (contenidoReportes) {
        contenidoReportes.style.display = "none";
    }

    if (mensajeAccesoReportes) {
        mensajeAccesoReportes.style.display = "flex";
    }

    if (btnActualizarReportes) {
        btnActualizarReportes.style.display = "none";
    }

    if (indicadorRolReportes) {
        indicadorRolReportes.textContent =
            "Acceso restringido";
        indicadorRolReportes.className =
            "role-indicator restricted";
    }
}

/* =========================================================
   CONFIGURACIÓN DE EVENTOS
========================================================= */

function configurarTabs() {
    tabButtons.forEach(function (button) {
        button.addEventListener(
            "click",
            function () {
                const tab =
                    button.getAttribute("data-tab");

                tabButtons.forEach(function (item) {
                    item.classList.remove("active");
                });

                tabContents.forEach(function (item) {
                    item.classList.remove("active");
                });

                button.classList.add("active");

                const contenido =
                    document.getElementById(
                        `tab-${tab}`
                    );

                if (contenido) {
                    contenido.classList.add("active");
                }
            }
        );
    });
}

function configurarEventos() {
    if (btnActualizarReportes) {
        btnActualizarReportes.addEventListener(
            "click",
            cargarReportes
        );
    }

    if (btnAplicarFiltroMes) {
        btnAplicarFiltroMes.addEventListener(
            "click",
            aplicarFiltroMes
        );
    }

    if (btnLimpiarFiltroMes) {
        btnLimpiarFiltroMes.addEventListener(
            "click",
            limpiarFiltroMes
        );
    }

    if (btnAplicarFiltroHoras) {
        btnAplicarFiltroHoras.addEventListener(
            "click",
            aplicarFiltrosHoras
        );
    }

    if (btnLimpiarFiltroHoras) {
        btnLimpiarFiltroHoras.addEventListener(
            "click",
            limpiarFiltrosHoras
        );
    }

    if (btnDescargarReporteGeneral) {
        btnDescargarReporteGeneral.addEventListener(
            "click",
            descargarReporteGeneral
        );
    }

    if (btnDescargarMensual) {
        btnDescargarMensual.addEventListener(
            "click",
            descargarReporteMensualFormatoPDF
        );
    }

    if (btnDescargarProyectos) {
        btnDescargarProyectos.addEventListener(
            "click",
            function () {
                descargarCSV("proyectos");
            }
        );
    }

    if (btnDescargarTareas) {
        btnDescargarTareas.addEventListener(
            "click",
            function () {
                descargarCSV("tareas");
            }
        );
    }

    if (btnDescargarEquipo) {
        btnDescargarEquipo.addEventListener(
            "click",
            function () {
                descargarCSV("equipo");
            }
        );
    }

    if (btnDescargarHoras) {
        btnDescargarHoras.addEventListener(
            "click",
            function () {
                descargarCSV("horas");
            }
        );
    }

    if (btnDescargarAlertas) {
        btnDescargarAlertas.addEventListener(
            "click",
            function () {
                descargarCSV("alertas");
            }
        );
    }

    if (btnDescargarEncuestas) {
        btnDescargarEncuestas.addEventListener(
            "click",
            function () {
                descargarCSV("encuestas");
            }
        );
    }

    if (btnDescargarCursos) {
        btnDescargarCursos.addEventListener(
            "click",
            function () {
                descargarCSV("cursos");
            }
        );
    }

    if (btnDescargarCertificados) {
        btnDescargarCertificados.addEventListener(
            "click",
            function () {
                descargarCSV("certificados");
            }
        );
    }
}

/* =========================================================
   FILTROS GLOBALES
========================================================= */

function cargarFiltrosGuardados() {
    try {
        const filtrosGuardados = JSON.parse(
            localStorage.getItem(
                CLAVE_FILTROS_REPORTES
            )
        ) || {};

        filtrosReporte.mesInicio =
            filtrosGuardados.mesInicio || "";

        filtrosReporte.mesFin =
            filtrosGuardados.mesFin || "";

    } catch (error) {
        filtrosReporte.mesInicio = "";
        filtrosReporte.mesFin = "";
    }

    if (filtroMesInicio) {
        filtroMesInicio.value =
            filtrosReporte.mesInicio;
    }

    if (filtroMesFin) {
        filtroMesFin.value =
            filtrosReporte.mesFin;
    }

    actualizarTextoFiltro();
}

function aplicarFiltroMes() {
    const inicio = filtroMesInicio
        ? filtroMesInicio.value
        : "";

    const fin = filtroMesFin
        ? filtroMesFin.value
        : "";

    if (inicio && fin && inicio > fin) {
        alert(
            "El mes inicial no puede ser posterior al mes final."
        );

        return;
    }

    filtrosReporte.mesInicio = inicio;
    filtrosReporte.mesFin = fin;

    localStorage.setItem(
        CLAVE_FILTROS_REPORTES,
        JSON.stringify(filtrosReporte)
    );

    actualizarTextoFiltro();
    actualizarDatosFiltrados();
    renderizarTodo();
}

function limpiarFiltroMes() {
    filtrosReporte.mesInicio = "";
    filtrosReporte.mesFin = "";

    if (filtroMesInicio) {
        filtroMesInicio.value = "";
    }

    if (filtroMesFin) {
        filtroMesFin.value = "";
    }

    localStorage.removeItem(
        CLAVE_FILTROS_REPORTES
    );

    actualizarTextoFiltro();
    actualizarDatosFiltrados();
    renderizarTodo();
}

function actualizarTextoFiltro() {
    if (!textoFiltroActivo) {
        return;
    }

    const inicio = filtrosReporte.mesInicio;
    const fin = filtrosReporte.mesFin;

    if (!inicio && !fin) {
        textoFiltroActivo.textContent =
            "Mostrando información de todos los meses.";
        return;
    }

    if (inicio && !fin) {
        textoFiltroActivo.textContent =
            `Mostrando información desde ${formatearMes(inicio)}.`;
        return;
    }

    if (!inicio && fin) {
        textoFiltroActivo.textContent =
            `Mostrando información hasta ${formatearMes(fin)}.`;
        return;
    }

    if (inicio === fin) {
        textoFiltroActivo.textContent =
            `Mostrando información de ${formatearMes(inicio)}.`;
        return;
    }

    textoFiltroActivo.textContent =
        `Mostrando información de ${formatearMes(inicio)} a ${formatearMes(fin)}.`;
}

/* =========================================================
   CARGA DE DATOS
========================================================= */

async function cargarReportes() {
    if (!esAdministrador()) {
        return;
    }

    cambiarEstadoBoton(
        btnActualizarReportes,
        true,
        "Actualizando..."
    );

    try {
        const resultados = await Promise.allSettled([
            obtenerDatosAPI(
                API_REGISTROS_HORAS,
                ["registros", "data"]
            ),

            obtenerDatosAPI(
                API_MIEMBROS,
                ["miembros", "data"]
            ),

            obtenerDatosAPI(
                API_PROYECTOS,
                ["proyectos", "data"]
            ),

            obtenerDatosAPI(
                API_TAREAS,
                ["tareas", "data"]
            )
        ]);

        const registrosHoras =
            resultados[0].status === "fulfilled"
                ? resultados[0].value
                : obtenerArregloLocal(
                    "registrosHoras"
                );

        const miembros =
            resultados[1].status === "fulfilled"
                ? resultados[1].value
                : obtenerArregloLocal(
                    "miembrosEquipo"
                );

        const proyectos =
            resultados[2].status === "fulfilled"
                ? resultados[2].value
                : combinarArreglosLocales(
                    "proyectos",
                    "proyectosAvanzados"
                );

        const tareas =
            resultados[3].status === "fulfilled"
                ? resultados[3].value
                : obtenerArregloLocal("tareas");

        datosOriginales = {
            horas: registrosHoras.map(
                normalizarRegistroHoras
            ),

            miembros: miembros.map(
                normalizarMiembro
            ),

            proyectos: proyectos.map(
                normalizarProyecto
            ),

            tareas: tareas.map(
                normalizarTarea
            ),

            alertas: obtenerArregloLocal(
                "alertas"
            ),

            encuestas: obtenerArregloLocal(
                "encuestas"
            ),

            certificados: obtenerArregloLocal(
                "certificadosCursos"
            )
        };

        actualizarDatosFiltrados();
        llenarFiltrosHoras();
        renderizarTodo();

    } catch (error) {
        console.error(
            "Error al cargar los reportes:",
            error
        );

        alert(
            "No fue posible cargar algunos reportes. " +
            "Verifica que Apache, MySQL y el backend Java estén activos."
        );
    } finally {
        cambiarEstadoBoton(
            btnActualizarReportes,
            false,
            "↻ Actualizar reportes"
        );
    }
}

async function obtenerDatosAPI(url, posiblesClaves) {
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

    return extraerArreglo(datos, posiblesClaves);
}

function extraerArreglo(datos, posiblesClaves) {
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

function combinarArreglosLocales(
    primeraClave,
    segundaClave
) {
    return [
        ...obtenerArregloLocal(primeraClave),
        ...obtenerArregloLocal(segundaClave)
    ];
}

/* =========================================================
   NORMALIZAR DATOS
========================================================= */

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

        idProyecto:
            registro.idProyecto ||
            registro.proyectoId ||
            "",

        idTarea:
            registro.idTarea ||
            registro.tareaId ||
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

        incidente:
            registro.incidente ||
            "normal",

        descripcion:
            registro.descripcion ||
            "",

        estadoValidacion:
            registro.estadoValidacion ||
            registro.estado ||
            "Pendiente",

        miembroNombre:
            registro.miembroNombre ||
            registro.persona ||
            registro.nombreMiembro ||
            "",

        proyectoNombre:
            registro.proyectoNombre ||
            registro.proyecto ||
            "",

        tareaTitulo:
            registro.tareaTitulo ||
            registro.tarea ||
            "",

        fechaCreacion:
            limpiarFecha(
                registro.fechaCreacion ||
                registro.fecha
            )
    };
}

function normalizarMiembro(miembro) {
    return {
        id:
            miembro.id ||
            miembro.idMiembro ||
            "",

        nombreCompleto:
            miembro.nombreCompleto ||
            miembro.nombre ||
            "Sin nombre",

        correo:
            miembro.correo ||
            miembro.email ||
            "",

        rol:
            miembro.rol ||
            "Colaborador",

        seniority:
            miembro.seniority ||
            "Junior",

        estado:
            miembro.estado ||
            "Activo",

        horasDisponibles:
            Number(
                miembro.horasDisponibles ||
                miembro.horas ||
                0
            ),

        fechaCreacion:
            limpiarFecha(
                miembro.fechaCreacion ||
                miembro.fechaRegistro
            )
    };
}

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
            "Sin nombre",

        cliente:
            proyecto.cliente ||
            proyecto.area ||
            proyecto.organizacion ||
            "",

        responsable:
            proyecto.responsable ||
            proyecto.nombreResponsable ||
            "",

        estado:
            proyecto.estado ||
            "Pendiente",

        prioridad:
            proyecto.prioridad ||
            "Media",

        avance:
            Number(proyecto.avance || 0),

        fechaCreacion:
            limpiarFecha(
                proyecto.fechaCreacion ||
                proyecto.fechaInicio ||
                proyecto.fechaInicioReal
            )
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
            "Sin título",

        proyecto:
            tarea.proyectoNombre ||
            tarea.proyecto ||
            "",

        fase:
            tarea.fase ||
            "",

        asignado:
            tarea.asignado ||
            tarea.miembroNombre ||
            "",

        estado:
            tarea.estado ||
            "Pendiente",

        prioridad:
            tarea.prioridad ||
            "Media",

        fechaCreacion:
            limpiarFecha(
                tarea.fechaCreacion ||
                tarea.fecha ||
                tarea.fechaLimite
            )
    };
}

/* =========================================================
   FILTRAR DATOS
========================================================= */

function actualizarDatosFiltrados() {
    datosFiltrados = {
        proyectos: filtrarPorPeriodo(
            datosOriginales.proyectos,
            ["fechaCreacion"]
        ),

        tareas: filtrarPorPeriodo(
            datosOriginales.tareas,
            ["fechaCreacion"]
        ),

        miembros: datosOriginales.miembros.slice(),

        horas: filtrarPorPeriodo(
            datosOriginales.horas,
            ["fecha", "fechaCreacion"]
        ),

        alertas: filtrarPorPeriodo(
            datosOriginales.alertas,
            ["fechaCreacion", "fecha"]
        ),

        encuestas: filtrarPorPeriodo(
            datosOriginales.encuestas,
            ["fechaCreacion", "fecha"]
        ),

        certificados: filtrarPorPeriodo(
            datosOriginales.certificados,
            [
                "fechaCompletado",
                "fechaRegistro",
                "fechaActualizacion"
            ]
        )
    };
}

function filtrarPorPeriodo(lista, camposFecha) {
    const inicio = filtrosReporte.mesInicio;
    const fin = filtrosReporte.mesFin;

    if (!inicio && !fin) {
        return lista.slice();
    }

    return lista.filter(function (item) {
        const fecha = obtenerFechaDeCampos(
            item,
            camposFecha
        );

        const mes = obtenerMesDeFecha(fecha);

        if (!mes) {
            return false;
        }

        if (inicio && mes < inicio) {
            return false;
        }

        if (fin && mes > fin) {
            return false;
        }

        return true;
    });
}

function obtenerFechaDeCampos(
    objeto,
    campos
) {
    for (
        let indice = 0;
        indice < campos.length;
        indice++
    ) {
        const valor = objeto?.[campos[indice]];

        if (valor) {
            return valor;
        }
    }

    return "";
}

/* =========================================================
   FILTROS DE HORAS
========================================================= */

function llenarFiltrosHoras() {
    llenarSelectMiembrosHoras();
    llenarSelectProyectosHoras();
}

function llenarSelectMiembrosHoras() {
    if (!filtroHorasMiembro) {
        return;
    }

    const valorAnterior =
        filtroHorasMiembro.value;

    filtroHorasMiembro.innerHTML = `
        <option value="">
            Todos los integrantes
        </option>
    `;

    datosOriginales.miembros.forEach(
        function (miembro) {
            const opcion =
                document.createElement("option");

            opcion.value = miembro.id;
            opcion.textContent =
                miembro.nombreCompleto;

            filtroHorasMiembro.appendChild(opcion);
        }
    );

    filtroHorasMiembro.value =
        valorAnterior;
}

function llenarSelectProyectosHoras() {
    if (!filtroHorasProyecto) {
        return;
    }

    const valorAnterior =
        filtroHorasProyecto.value;

    filtroHorasProyecto.innerHTML = `
        <option value="">
            Todos los proyectos
        </option>
    `;

    datosOriginales.proyectos.forEach(
        function (proyecto) {
            const opcion =
                document.createElement("option");

            opcion.value = proyecto.id;
            opcion.textContent =
                proyecto.nombre;

            filtroHorasProyecto.appendChild(opcion);
        }
    );

    filtroHorasProyecto.value =
        valorAnterior;
}

function aplicarFiltrosHoras() {
    filtrosHoras.idMiembro =
        filtroHorasMiembro?.value || "";

    filtrosHoras.idProyecto =
        filtroHorasProyecto?.value || "";

    filtrosHoras.estado =
        filtroHorasEstado?.value || "";

    filtrosHoras.tipo =
        filtroHorasTipo?.value || "";

    renderHoras();
}

function limpiarFiltrosHoras() {
    filtrosHoras = {
        idMiembro: "",
        idProyecto: "",
        estado: "",
        tipo: ""
    };

    if (filtroHorasMiembro) {
        filtroHorasMiembro.value = "";
    }

    if (filtroHorasProyecto) {
        filtroHorasProyecto.value = "";
    }

    if (filtroHorasEstado) {
        filtroHorasEstado.value = "";
    }

    if (filtroHorasTipo) {
        filtroHorasTipo.value = "";
    }

    renderHoras();
}

function obtenerHorasFiltradas() {
    return datosFiltrados.horas.filter(
        function (registro) {
            if (
                filtrosHoras.idMiembro &&
                String(registro.idMiembro) !==
                String(filtrosHoras.idMiembro)
            ) {
                return false;
            }

            if (
                filtrosHoras.idProyecto &&
                String(registro.idProyecto) !==
                String(filtrosHoras.idProyecto)
            ) {
                return false;
            }

            if (
                filtrosHoras.estado &&
                normalizarTexto(
                    registro.estadoValidacion
                ) !== normalizarTexto(
                    filtrosHoras.estado
                )
            ) {
                return false;
            }

            if (
                filtrosHoras.tipo &&
                normalizarTexto(
                    registro.tipoRegistro
                ) !== normalizarTexto(
                    filtrosHoras.tipo
                )
            ) {
                return false;
            }

            return true;
        }
    );
}

/* =========================================================
   RENDERIZAR TODO
========================================================= */

function renderizarTodo() {
    actualizarResumen();
    renderGeneral();
    renderMensual();
    renderProyectos();
    renderTareas();
    renderEquipo();
    renderHoras();
    renderAlertas();
    renderEncuestas();
    renderCursos();
    renderCertificados();
}

/* =========================================================
   RESUMEN Y GENERAL
========================================================= */

function actualizarResumen() {
    const horasAprobadas = sumarHorasPorEstado(
        datosFiltrados.horas,
        "aprobado"
    );

    if (totalProyectosReporte) {
        totalProyectosReporte.textContent =
            datosFiltrados.proyectos.length;
    }

    if (totalTareasReporte) {
        totalTareasReporte.textContent =
            datosFiltrados.tareas.length;
    }

    if (totalEquipoReporte) {
        totalEquipoReporte.textContent =
            datosFiltrados.miembros.length;
    }

    if (totalHorasAprobadasReporte) {
        totalHorasAprobadasReporte.textContent =
            `${horasAprobadas.toFixed(2)}h`;
    }
}

function renderGeneral() {
    const proyectosActivos =
        datosFiltrados.proyectos.filter(
            function (proyecto) {
                const estado = normalizarTexto(
                    proyecto.estado
                );

                return !(
                    estado.includes("cerrado") ||
                    estado.includes("cancelado") ||
                    estado.includes("finalizado")
                );
            }
        ).length;

    const tareasCompletadas =
        datosFiltrados.tareas.filter(
            function (tarea) {
                return normalizarTexto(
                    tarea.estado
                ) === "completada";
            }
        ).length;

    const horasRegistradas =
        sumarTodasLasHoras(
            datosFiltrados.horas
        );

    const horasAprobadas =
        sumarHorasPorEstado(
            datosFiltrados.horas,
            "aprobado"
        );

    const horasPendientes =
        sumarHorasPorEstado(
            datosFiltrados.horas,
            "pendiente"
        );

    const alertasCriticas =
        datosFiltrados.alertas.filter(
            function (alerta) {
                const severidad = normalizarTexto(
                    alerta.severidad ||
                    alerta.prioridad
                );

                const estado = normalizarTexto(
                    alerta.estado
                );

                const esCritica =
                    severidad.includes("critica") ||
                    severidad.includes("alta");

                return (
                    esCritica &&
                    !estado.includes("resuelta") &&
                    !estado.includes("cerrada")
                );
            }
        ).length;

    if (estadoGeneralPortafolio) {
        estadoGeneralPortafolio.textContent =
            `Existen ${datosFiltrados.proyectos.length} proyectos en el periodo seleccionado; ${proyectosActivos} se consideran activos.`;
    }

    if (estadoGeneralProductividad) {
        estadoGeneralProductividad.textContent =
            `Se registraron ${datosFiltrados.tareas.length} tareas, de las cuales ${tareasCompletadas} están completadas. El equipo acumuló ${horasRegistradas.toFixed(2)} horas.`;
    }

    if (estadoGeneralHoras) {
        estadoGeneralHoras.textContent =
            `Hay ${horasAprobadas.toFixed(2)} horas aprobadas y ${horasPendientes.toFixed(2)} horas pendientes de validación.`;
    }

    if (estadoGeneralRiesgos) {
        estadoGeneralRiesgos.textContent =
            alertasCriticas > 0
                ? `Existen ${alertasCriticas} alertas críticas o de prioridad alta pendientes de atención.`
                : "No se detectan alertas críticas abiertas en el periodo seleccionado.";
    }
}

/* =========================================================
   REPORTE MENSUAL
========================================================= */

function renderMensual() {
    const horasRegistradas =
        sumarTodasLasHoras(
            datosFiltrados.horas
        );

    const horasAprobadas =
        sumarHorasPorEstado(
            datosFiltrados.horas,
            "aprobado"
        );

    if (mensualProyectos) {
        mensualProyectos.textContent =
            datosFiltrados.proyectos.length;
    }

    if (mensualTareas) {
        mensualTareas.textContent =
            datosFiltrados.tareas.length;
    }

    if (mensualHoras) {
        mensualHoras.textContent =
            `${horasRegistradas.toFixed(2)}h`;
    }

    if (mensualHorasAprobadas) {
        mensualHorasAprobadas.textContent =
            `${horasAprobadas.toFixed(2)}h`;
    }

    if (mensualAlertas) {
        mensualAlertas.textContent =
            datosFiltrados.alertas.length;
    }

    if (mensualCertificados) {
        mensualCertificados.textContent =
            datosFiltrados.certificados.length;
    }

    const agrupado =
        agruparDatosPorMes();

    const meses = Object.keys(agrupado).sort();

    if (!tablaReporteMensual) {
        return;
    }

    if (meses.length === 0) {
        renderEmpty(
            tablaReporteMensual,
            7,
            "No hay información mensual dentro del periodo seleccionado."
        );

        return;
    }

    tablaReporteMensual.innerHTML = meses
        .map(function (mes) {
            const item = agrupado[mes];

            return `
                <tr>
                    <td>${escaparHTML(formatearMes(mes))}</td>
                    <td>${item.proyectos}</td>
                    <td>${item.tareas}</td>
                    <td>${item.horas.toFixed(2)}h</td>
                    <td>${item.horasAprobadas.toFixed(2)}h</td>
                    <td>${item.alertas}</td>
                    <td>${item.certificados}</td>
                </tr>
            `;
        })
        .join("");
}

function agruparDatosPorMes() {
    const resumen = {};

    agregarDatosMensuales(
        resumen,
        datosFiltrados.proyectos,
        ["fechaCreacion"],
        "proyectos"
    );

    agregarDatosMensuales(
        resumen,
        datosFiltrados.tareas,
        ["fechaCreacion"],
        "tareas"
    );

    agregarDatosMensuales(
        resumen,
        datosFiltrados.alertas,
        ["fechaCreacion", "fecha"],
        "alertas"
    );

    agregarDatosMensuales(
        resumen,
        datosFiltrados.certificados,
        [
            "fechaCompletado",
            "fechaRegistro",
            "fechaActualizacion"
        ],
        "certificados"
    );

    datosFiltrados.horas.forEach(
        function (registro) {
            const mes = obtenerMesDeFecha(
                registro.fecha ||
                registro.fechaCreacion
            );

            if (!mes) {
                return;
            }

            if (!resumen[mes]) {
                resumen[mes] =
                    crearResumenMes();
            }

            resumen[mes].horas += Number(
                registro.horasTrabajadas || 0
            );

            if (
                normalizarTexto(
                    registro.estadoValidacion
                ) === "aprobado"
            ) {
                resumen[mes].horasAprobadas +=
                    Number(
                        registro.horasTrabajadas || 0
                    );
            }
        }
    );

    return resumen;
}

function agregarDatosMensuales(
    resumen,
    lista,
    camposFecha,
    campo
) {
    lista.forEach(function (item) {
        const fecha = obtenerFechaDeCampos(
            item,
            camposFecha
        );

        const mes = obtenerMesDeFecha(fecha);

        if (!mes) {
            return;
        }

        if (!resumen[mes]) {
            resumen[mes] =
                crearResumenMes();
        }

        resumen[mes][campo] += 1;
    });
}

function crearResumenMes() {
    return {
        proyectos: 0,
        tareas: 0,
        horas: 0,
        horasAprobadas: 0,
        alertas: 0,
        certificados: 0
    };
}

/* =========================================================
   TABLAS DE PROYECTOS, TAREAS Y EQUIPO
========================================================= */

function renderProyectos() {
    if (!tablaReporteProyectos) {
        return;
    }

    const proyectos =
        datosFiltrados.proyectos;

    if (proyectos.length === 0) {
        renderEmpty(
            tablaReporteProyectos,
            6,
            "No hay proyectos registrados para el periodo seleccionado."
        );

        return;
    }

    tablaReporteProyectos.innerHTML = proyectos
        .map(function (proyecto) {
            return `
                <tr>
                    <td>${escaparHTML(proyecto.nombre)}</td>
                    <td>${escaparHTML(proyecto.cliente || "—")}</td>
                    <td>${escaparHTML(proyecto.responsable || "—")}</td>
                    <td>
                        <span class="badge ${obtenerColorEstado(proyecto.estado)}">
                            ${escaparHTML(proyecto.estado)}
                        </span>
                    </td>
                    <td>${escaparHTML(proyecto.prioridad)}</td>
                    <td>${Number(proyecto.avance || 0)}%</td>
                </tr>
            `;
        })
        .join("");
}

function renderTareas() {
    if (!tablaReporteTareas) {
        return;
    }

    const tareas = datosFiltrados.tareas;

    if (tareas.length === 0) {
        renderEmpty(
            tablaReporteTareas,
            6,
            "No hay tareas registradas para el periodo seleccionado."
        );

        return;
    }

    tablaReporteTareas.innerHTML = tareas
        .map(function (tarea) {
            return `
                <tr>
                    <td>${escaparHTML(tarea.titulo)}</td>
                    <td>${escaparHTML(tarea.proyecto || "—")}</td>
                    <td>${escaparHTML(tarea.fase || "—")}</td>
                    <td>${escaparHTML(tarea.asignado || "—")}</td>
                    <td>
                        <span class="badge ${obtenerColorEstado(tarea.estado)}">
                            ${escaparHTML(tarea.estado)}
                        </span>
                    </td>
                    <td>${escaparHTML(tarea.prioridad)}</td>
                </tr>
            `;
        })
        .join("");
}

function renderEquipo() {
    if (!tablaReporteEquipo) {
        return;
    }

    const miembros =
        datosFiltrados.miembros;

    if (miembros.length === 0) {
        renderEmpty(
            tablaReporteEquipo,
            6,
            "No hay integrantes disponibles."
        );

        return;
    }

    tablaReporteEquipo.innerHTML = miembros
        .map(function (miembro) {
            return `
                <tr>
                    <td>${escaparHTML(miembro.nombreCompleto)}</td>
                    <td>${escaparHTML(miembro.correo || "—")}</td>
                    <td>${escaparHTML(miembro.rol)}</td>
                    <td>${escaparHTML(miembro.seniority)}</td>
                    <td>
                        <span class="badge ${obtenerColorEstadoMiembro(miembro.estado)}">
                            ${escaparHTML(miembro.estado)}
                        </span>
                    </td>
                    <td>${Number(miembro.horasDisponibles || 0)}h</td>
                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   TABLA Y RESUMEN DE HORAS
========================================================= */

function renderHoras() {
    if (!tablaReporteHoras) {
        return;
    }

    const registros = obtenerHorasFiltradas()
        .slice()
        .sort(function (a, b) {
            return convertirFechaRegistro(b) -
                convertirFechaRegistro(a);
        });

    const total =
        sumarTodasLasHoras(registros);

    const aprobadas =
        sumarHorasPorEstado(
            registros,
            "aprobado"
        );

    const pendientes =
        sumarHorasPorEstado(
            registros,
            "pendiente"
        );

    const rechazadas =
        sumarHorasPorEstado(
            registros,
            "rechazado"
        );

    if (horasTotalFiltrado) {
        horasTotalFiltrado.textContent =
            `${total.toFixed(2)}h`;
    }

    if (horasAprobadasFiltrado) {
        horasAprobadasFiltrado.textContent =
            `${aprobadas.toFixed(2)}h`;
    }

    if (horasPendientesFiltrado) {
        horasPendientesFiltrado.textContent =
            `${pendientes.toFixed(2)}h`;
    }

    if (horasRechazadasFiltrado) {
        horasRechazadasFiltrado.textContent =
            `${rechazadas.toFixed(2)}h`;
    }

    if (contadorHorasFiltradas) {
        contadorHorasFiltradas.textContent =
            `${registros.length} ${
                registros.length === 1
                    ? "registro"
                    : "registros"
            }`;
    }

    if (textoHorasFiltradas) {
        textoHorasFiltradas.textContent =
            construirTextoFiltrosHoras(registros.length);
    }

    if (registros.length === 0) {
        renderEmpty(
            tablaReporteHoras,
            9,
            "No hay registros de horas que coincidan con los filtros seleccionados."
        );

        return;
    }

    tablaReporteHoras.innerHTML = registros
        .map(function (registro) {
            const nombreMiembro =
                obtenerNombreMiembro(registro);

            const proyectoTarea =
                construirProyectoTarea(registro);

            return `
                <tr>
                    <td>${escaparHTML(formatearFecha(registro.fecha))}</td>

                    <td>
                        <strong>
                            ${escaparHTML(nombreMiembro)}
                        </strong>
                    </td>

                    <td>
                        <span class="badge ${obtenerColorTipoRegistro(registro.tipoRegistro)}">
                            ${escaparHTML(registro.tipoRegistro)}
                        </span>
                    </td>

                    <td>${escaparHTML(proyectoTarea)}</td>

                    <td class="cell-description">
                        ${escaparHTML(registro.descripcion || "Sin descripción")}
                    </td>

                    <td>
                        ${escaparHTML(
                            formatearHorario(
                                registro.horaEntrada,
                                registro.horaSalida
                            )
                        )}
                    </td>

                    <td>
                        <strong>
                            ${Number(
                                registro.horasTrabajadas || 0
                            ).toFixed(2)}h
                        </strong>
                    </td>

                    <td>
                        ${escaparHTML(
                            formatearIncidente(
                                registro.incidente
                            )
                        )}
                    </td>

                    <td>
                        <span class="badge ${obtenerColorValidacion(registro.estadoValidacion)}">
                            ${escaparHTML(registro.estadoValidacion)}
                        </span>
                    </td>
                </tr>
            `;
        })
        .join("");
}

function construirTextoFiltrosHoras(total) {
    const filtrosAplicados = [];

    if (filtrosHoras.idMiembro) {
        const miembro =
            datosOriginales.miembros.find(
                function (item) {
                    return String(item.id) ===
                        String(
                            filtrosHoras.idMiembro
                        );
                }
            );

        filtrosAplicados.push(
            `integrante: ${
                miembro?.nombreCompleto ||
                "seleccionado"
            }`
        );
    }

    if (filtrosHoras.idProyecto) {
        const proyecto =
            datosOriginales.proyectos.find(
                function (item) {
                    return String(item.id) ===
                        String(
                            filtrosHoras.idProyecto
                        );
                }
            );

        filtrosAplicados.push(
            `proyecto: ${
                proyecto?.nombre ||
                "seleccionado"
            }`
        );
    }

    if (filtrosHoras.estado) {
        filtrosAplicados.push(
            `estado: ${filtrosHoras.estado}`
        );
    }

    if (filtrosHoras.tipo) {
        filtrosAplicados.push(
            `tipo: ${filtrosHoras.tipo}`
        );
    }

    if (filtrosAplicados.length === 0) {
        return `Mostrando ${total} registros del periodo seleccionado.`;
    }

    return `Mostrando ${total} registros con filtros de ${filtrosAplicados.join(", ")}.`;
}

function obtenerNombreMiembro(registro) {
    if (registro.miembroNombre) {
        return registro.miembroNombre;
    }

    const miembro =
        datosOriginales.miembros.find(
            function (item) {
                return String(item.id) ===
                    String(registro.idMiembro);
            }
        );

    return miembro?.nombreCompleto ||
        "Sin integrante";
}

function construirProyectoTarea(registro) {
    let proyecto =
        registro.proyectoNombre ||
        "";

    let tarea =
        registro.tareaTitulo ||
        "";

    if (!proyecto && registro.idProyecto) {
        const proyectoEncontrado =
            datosOriginales.proyectos.find(
                function (item) {
                    return String(item.id) ===
                        String(registro.idProyecto);
                }
            );

        proyecto =
            proyectoEncontrado?.nombre || "";
    }

    if (!tarea && registro.idTarea) {
        const tareaEncontrada =
            datosOriginales.tareas.find(
                function (item) {
                    return String(item.id) ===
                        String(registro.idTarea);
                }
            );

        tarea =
            tareaEncontrada?.titulo || "";
    }

    if (!proyecto && !tarea) {
        return "Sin proyecto / tarea";
    }

    if (!tarea) {
        return proyecto;
    }

    if (!proyecto) {
        return tarea;
    }

    return `${proyecto} · ${tarea}`;
}

/* =========================================================
   ALERTAS, ENCUESTAS, CURSOS Y CERTIFICADOS
========================================================= */

function renderAlertas() {
    if (!tablaReporteAlertas) {
        return;
    }

    const alertas =
        datosFiltrados.alertas;

    if (alertas.length === 0) {
        renderEmpty(
            tablaReporteAlertas,
            6,
            "No hay alertas registradas para el periodo seleccionado."
        );

        return;
    }

    tablaReporteAlertas.innerHTML = alertas
        .map(function (alerta) {
            return `
                <tr>
                    <td>${escaparHTML(alerta.titulo || alerta.nombre || "—")}</td>
                    <td>${escaparHTML(alerta.proyecto || "—")}</td>
                    <td>${escaparHTML(alerta.tipo || "—")}</td>
                    <td>
                        <span class="badge ${obtenerColorSeveridad(alerta.severidad || alerta.prioridad)}">
                            ${escaparHTML(alerta.severidad || alerta.prioridad || "—")}
                        </span>
                    </td>
                    <td>${escaparHTML(alerta.estado || "—")}</td>
                    <td>${escaparHTML(formatearFecha(alerta.fechaCreacion || alerta.fecha))}</td>
                </tr>
            `;
        })
        .join("");
}

function renderEncuestas() {
    if (!tablaReporteEncuestas) {
        return;
    }

    const encuestas =
        datosFiltrados.encuestas;

    if (encuestas.length === 0) {
        renderEmpty(
            tablaReporteEncuestas,
            6,
            "No hay encuestas registradas para el periodo seleccionado."
        );

        return;
    }

    tablaReporteEncuestas.innerHTML = encuestas
        .map(function (encuesta) {
            return `
                <tr>
                    <td>${escaparHTML(encuesta.proyecto || "—")}</td>
                    <td>${escaparHTML(encuesta.tipo || "—")}</td>
                    <td>${escaparHTML(encuesta.calificacion || "—")}</td>
                    <td>${escaparHTML(encuesta.nombre || "—")}</td>
                    <td>${escaparHTML(encuesta.email || encuesta.correo || "—")}</td>
                    <td>${escaparHTML(encuesta.consentimiento || encuesta.difusion || "—")}</td>
                </tr>
            `;
        })
        .join("");
}

function renderCursos() {
    if (!tablaReporteCursos) {
        return;
    }

    tablaReporteCursos.innerHTML = cursosReporte
        .map(function (nombreCurso, indice) {
            const idCurso = indice + 1;

            const certificado =
                datosFiltrados.certificados.find(
                    function (item) {
                        return Number(item.idCurso) ===
                            Number(idCurso);
                    }
                );

            return `
                <tr>
                    <td>${idCurso}</td>
                    <td>${escaparHTML(nombreCurso)}</td>
                    <td>
                        <span class="badge ${
                            certificado
                                ? "green"
                                : "gray"
                        }">
                            ${
                                certificado
                                    ? "Completado"
                                    : "Pendiente"
                            }
                        </span>
                    </td>
                    <td>
                        ${escaparHTML(
                            certificado?.nombreArchivo ||
                            "—"
                        )}
                    </td>
                </tr>
            `;
        })
        .join("");
}

function renderCertificados() {
    if (!tablaReporteCertificados) {
        return;
    }

    const certificados =
        datosFiltrados.certificados;

    if (certificados.length === 0) {
        renderEmpty(
            tablaReporteCertificados,
            4,
            "No hay certificados registrados para el periodo seleccionado."
        );

        return;
    }

    tablaReporteCertificados.innerHTML =
        certificados
            .map(function (certificado) {
                return `
                    <tr>
                        <td>${escaparHTML(certificado.nombreCurso || "—")}</td>
                        <td>${escaparHTML(certificado.nombreArchivo || "—")}</td>
                        <td>${escaparHTML(formatearFecha(certificado.fechaCompletado))}</td>
                        <td>${escaparHTML(certificado.notas || "—")}</td>
                    </tr>
                `;
            })
            .join("");
}

/* =========================================================
   DESCARGAS CSV
========================================================= */

function descargarReporteGeneral() {
    if (!puedeExportarReportes()) { alert("No tienes permiso para exportar reportes."); return; }
    const horasRegistradas =
        sumarTodasLasHoras(
            datosFiltrados.horas
        );

    const horasAprobadas =
        sumarHorasPorEstado(
            datosFiltrados.horas,
            "aprobado"
        );

    const horasPendientes =
        sumarHorasPorEstado(
            datosFiltrados.horas,
            "pendiente"
        );

    const filas = [
        ["Indicador", "Valor"],

        [
            "Periodo aplicado",
            obtenerTextoFiltroCSV()
        ],

        [
            "Proyectos registrados",
            datosFiltrados.proyectos.length
        ],

        [
            "Tareas registradas",
            datosFiltrados.tareas.length
        ],

        [
            "Miembros registrados",
            datosFiltrados.miembros.length
        ],

        [
            "Horas registradas",
            horasRegistradas.toFixed(2)
        ],

        [
            "Horas aprobadas",
            horasAprobadas.toFixed(2)
        ],

        [
            "Horas pendientes",
            horasPendientes.toFixed(2)
        ],

        [
            "Alertas registradas",
            datosFiltrados.alertas.length
        ],

        [
            "Certificados registrados",
            datosFiltrados.certificados.length
        ]
    ];

    descargarFilasCSV(
        filas,
        "reporte_general_oficina_proyectos.csv"
    );
}

function descargarCSV(tipo) {
    if (!puedeExportarReportes()) { alert("No tienes permiso para exportar reportes."); return; }
    let filas = [];
    let nombreArchivo =
        `reporte_${tipo}.csv`;

    if (tipo === "mensual") {
        const agrupado =
            agruparDatosPorMes();

        const meses =
            Object.keys(agrupado).sort();

        filas = [
            [
                "Mes",
                "Proyectos",
                "Tareas",
                "Horas registradas",
                "Horas aprobadas",
                "Alertas",
                "Certificados"
            ],

            ...meses.map(function (mes) {
                const item = agrupado[mes];

                return [
                    formatearMes(mes),
                    item.proyectos,
                    item.tareas,
                    item.horas.toFixed(2),
                    item.horasAprobadas.toFixed(2),
                    item.alertas,
                    item.certificados
                ];
            })
        ];

        nombreArchivo =
            "reporte_mensual.csv";
    }

    if (tipo === "proyectos") {
        filas = [
            [
                "Nombre",
                "Cliente / Área",
                "Responsable",
                "Estado",
                "Prioridad",
                "Avance"
            ],

            ...datosFiltrados.proyectos.map(
                function (proyecto) {
                    return [
                        proyecto.nombre,
                        proyecto.cliente,
                        proyecto.responsable,
                        proyecto.estado,
                        proyecto.prioridad,
                        `${proyecto.avance}%`
                    ];
                }
            )
        ];

        nombreArchivo =
            "reporte_proyectos.csv";
    }

    if (tipo === "tareas") {
        filas = [
            [
                "Tarea",
                "Proyecto",
                "Fase",
                "Asignado",
                "Estado",
                "Prioridad"
            ],

            ...datosFiltrados.tareas.map(
                function (tarea) {
                    return [
                        tarea.titulo,
                        tarea.proyecto,
                        tarea.fase,
                        tarea.asignado,
                        tarea.estado,
                        tarea.prioridad
                    ];
                }
            )
        ];

        nombreArchivo =
            "reporte_tareas.csv";
    }

    if (tipo === "equipo") {
        filas = [
            [
                "Nombre",
                "Correo",
                "Rol",
                "Seniority",
                "Estado",
                "Horas por semana"
            ],

            ...datosFiltrados.miembros.map(
                function (miembro) {
                    return [
                        miembro.nombreCompleto,
                        miembro.correo,
                        miembro.rol,
                        miembro.seniority,
                        miembro.estado,
                        miembro.horasDisponibles
                    ];
                }
            )
        ];

        nombreArchivo =
            "reporte_equipo.csv";
    }

    if (tipo === "horas") {
        const registros =
            obtenerHorasFiltradas();

        filas = [
            [
                "Fecha",
                "Persona",
                "Tipo",
                "Proyecto",
                "Tarea",
                "Descripción",
                "Entrada",
                "Salida",
                "Horas",
                "Incidente",
                "Validación"
            ],

            ...registros.map(
                function (registro) {
                    return [
                        registro.fecha,
                        obtenerNombreMiembro(registro),
                        registro.tipoRegistro,
                        registro.proyectoNombre ||
                            obtenerNombreProyecto(
                                registro.idProyecto
                            ),
                        registro.tareaTitulo ||
                            obtenerNombreTarea(
                                registro.idTarea
                            ),
                        registro.descripcion,
                        registro.horaEntrada,
                        registro.horaSalida,
                        Number(
                            registro.horasTrabajadas || 0
                        ).toFixed(2),
                        formatearIncidente(
                            registro.incidente
                        ),
                        registro.estadoValidacion
                    ];
                }
            )
        ];

        nombreArchivo =
            "reporte_horas.csv";
    }

    if (tipo === "alertas") {
        filas = [
            [
                "Título",
                "Proyecto",
                "Tipo",
                "Severidad",
                "Estado",
                "Fecha"
            ],

            ...datosFiltrados.alertas.map(
                function (alerta) {
                    return [
                        alerta.titulo ||
                            alerta.nombre ||
                            "",
                        alerta.proyecto || "",
                        alerta.tipo || "",
                        alerta.severidad ||
                            alerta.prioridad ||
                            "",
                        alerta.estado || "",
                        alerta.fechaCreacion ||
                            alerta.fecha ||
                            ""
                    ];
                }
            )
        ];

        nombreArchivo =
            "reporte_alertas.csv";
    }

    if (tipo === "encuestas") {
        filas = [
            [
                "Proyecto",
                "Tipo",
                "Calificación",
                "Nombre",
                "Correo",
                "Difusión"
            ],

            ...datosFiltrados.encuestas.map(
                function (encuesta) {
                    return [
                        encuesta.proyecto || "",
                        encuesta.tipo || "",
                        encuesta.calificacion || "",
                        encuesta.nombre || "",
                        encuesta.email ||
                            encuesta.correo ||
                            "",
                        encuesta.consentimiento ||
                            encuesta.difusion ||
                            ""
                    ];
                }
            )
        ];

        nombreArchivo =
            "reporte_encuestas.csv";
    }

    if (tipo === "cursos") {
        filas = [
            [
                "ID",
                "Curso",
                "Estado",
                "Certificado"
            ],

            ...cursosReporte.map(
                function (nombreCurso, indice) {
                    const idCurso = indice + 1;

                    const certificado =
                        datosFiltrados.certificados.find(
                            function (item) {
                                return Number(
                                    item.idCurso
                                ) === Number(idCurso);
                            }
                        );

                    return [
                        idCurso,
                        nombreCurso,
                        certificado
                            ? "Completado"
                            : "Pendiente",
                        certificado?.nombreArchivo ||
                            ""
                    ];
                }
            )
        ];

        nombreArchivo =
            "reporte_cursos.csv";
    }

    if (tipo === "certificados") {
        filas = [
            [
                "Curso",
                "Archivo",
                "Fecha completado",
                "Notas"
            ],

            ...datosFiltrados.certificados.map(
                function (certificado) {
                    return [
                        certificado.nombreCurso || "",
                        certificado.nombreArchivo || "",
                        certificado.fechaCompletado || "",
                        certificado.notas || ""
                    ];
                }
            )
        ];

        nombreArchivo =
            "reporte_certificados.csv";
    }

    descargarFilasCSV(
        filas,
        nombreArchivo
    );
}

function descargarFilasCSV(
    filas,
    nombreArchivo
) {
    if (!filas || filas.length === 0) {
        alert(
            "No hay datos disponibles para exportar."
        );

        return;
    }

    const contenido = filas
        .map(function (fila) {
            return fila
                .map(function (valor) {
                    const texto = String(
                        valor ?? ""
                    ).replace(/"/g, "\"\"");

                    return `"${texto}"`;
                })
                .join(",");
        })
        .join("\n");

    const blob = new Blob(
        ["\uFEFF" + contenido],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const url =
        URL.createObjectURL(blob);

    const enlace =
        document.createElement("a");

    enlace.href = url;
    enlace.download = nombreArchivo;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
}


/* =========================================================
   DESCARGA FORMATO OFICIAL: REPORTE MENSUAL
========================================================= */

function descargarReporteMensualFormatoPDF() {
    if (!puedeExportarReportes()) {
        alert("No tienes permiso para exportar reportes.");
        return;
    }

    const periodo = obtenerPeriodoReporteMensual();
    const proyectoPrincipal = obtenerProyectoPrincipalReporte();
    const filasActividades = construirFilasActividadesMensuales();
    const filasChecklist = construirFilasChecklistMensual();

    const horasRealizadas = sumarTodasLasHoras(datosFiltrados.horas);
    const horasComprometidas = 600;
    const diferencia = Math.max(horasComprometidas - horasRealizadas, 0);

    const contenido = `
        <section class="reporte-oficial">
            ${encabezadoReporteOficial("Reporte Mensual de Proyectos y/o Actividades Asignadas", "1 DE 2")}

            <h3>1.- DATOS GENERALES</h3>

            <table class="tabla-oficial">
                <tr>
                    <th colspan="2">JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.</th>
                </tr>
                <tr>
                    <th>Área</th>
                    <td>Oficina de Proyectos / Asesoría Empresarial</td>
                </tr>
            </table>

            <table class="tabla-oficial">
                <tr>
                    <th>Razón Social</th>
                    <th>Número de contrato y/o convenio</th>
                    <th>Fecha inicio</th>
                    <th>Fecha fin</th>
                </tr>
                <tr>
                    <td>UNIVERSIDAD POLITÉCNICA DE TECÁMAC</td>
                    <td>En trámite</td>
                    <td>${escaparHTML(periodo.fechaInicio)}</td>
                    <td>${escaparHTML(periodo.fechaFin)}</td>
                </tr>
            </table>

            <table class="tabla-oficial">
                <tr>
                    <th>Proyecto</th>
                    <th>Código</th>
                    <th>Asignado(a)</th>
                    <th>Matrícula y/o clave</th>
                </tr>
                <tr>
                    <td>${escaparHTML(proyectoPrincipal.nombre)}</td>
                    <td>${escaparHTML(proyectoPrincipal.codigo)}</td>
                    <td>${escaparHTML(proyectoPrincipal.responsable)}</td>
                    <td>—</td>
                </tr>
            </table>

            <h3>2. ACTIVIDADES</h3>
            <p><strong>2.1 Nivel de especialidad y/o clave del perfil:</strong> ESTUDIANTE / COLABORADOR</p>

            <table class="tabla-oficial tabla-actividades">
                <thead>
                    <tr>
                        <th>Clave</th>
                        <th>Fase del proyecto</th>
                        <th>Descripción de la actividad</th>
                        <th>Ubicación del producto / resultado</th>
                        <th>% Avance</th>
                        <th>Horas trabajadas</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasActividades}
                </tbody>
            </table>

            <div class="salto-pagina"></div>

            ${encabezadoReporteOficial("Reporte Mensual de Proyectos y/o Actividades Asignadas", "2 DE 2")}

            <h3>Lista de Chequeo del Estatus de Avance de Proyecto</h3>

            <table class="tabla-oficial tabla-checklist">
                <thead>
                    <tr>
                        <th>Clave</th>
                        <th>Descripción</th>
                        <th>Programado inicio</th>
                        <th>Programado término</th>
                        <th>Real inicio</th>
                        <th>Real término</th>
                        <th>Cumplimiento / Incumplimiento</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasChecklist}
                </tbody>
            </table>

            <table class="tabla-firmas">
                <tr>
                    <th>(UPT)<br>Elaboró y entregó</th>
                    <th>(JJM)<br>Revisó y entregó</th>
                    <th>(JJM)<br>Recibió, revisó y aprobó</th>
                </tr>
                <tr>
                    <td><br><br>${escaparHTML(proyectoPrincipal.responsable)}<br>Estudiante / Colaborador<br>UNIVERSIDAD POLITÉCNICA DE TECÁMAC</td>
                    <td><br><br>Miguel Ángel Hernández Herrera<br>Asesor Empresarial<br>JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.</td>
                    <td><br><br>Julio Lara García<br>CEO y Fundador<br>JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.</td>
                </tr>
            </table>

            <table class="tabla-resumen-horas">
                <tr><th>Horas realizadas</th><td>${horasRealizadas.toFixed(2)}</td></tr>
                <tr><th>Horas comprometidas</th><td>${horasComprometidas}</td></tr>
                <tr><th>Diferencia</th><td>${diferencia.toFixed(2)}</td></tr>
            </table>
        </section>
    `;

    abrirDocumentoImprimible(
        `reporte_mensual_${periodo.clave}.pdf`,
        contenido
    );
}

function obtenerPeriodoReporteMensual() {
    const mesBase =
        filtrosReporte.mesInicio ||
        filtrosReporte.mesFin ||
        obtenerMesActualISO();

    const partes = mesBase.split("-");
    const anio = Number(partes[0]);
    const mes = Number(partes[1]);

    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0);

    return {
        clave: mesBase,
        nombre: formatearMes(mesBase),
        fechaInicio: formatearFechaISO(fechaInicio),
        fechaFin: formatearFechaISO(fechaFin)
    };
}

function obtenerMesActualISO() {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

function formatearFechaISO(fecha) {
    return `${String(fecha.getDate()).padStart(2, "0")}/${String(fecha.getMonth() + 1).padStart(2, "0")}/${fecha.getFullYear()}`;
}

function obtenerProyectoPrincipalReporte() {
    const proyecto =
        datosFiltrados.proyectos[0] ||
        datosOriginales.proyectos[0] ||
        {};

    const responsable =
        proyecto.responsable ||
        datosFiltrados.miembros[0]?.nombreCompleto ||
        datosOriginales.miembros[0]?.nombreCompleto ||
        "Colaborador";

    return {
        nombre:
            proyecto.nombre ||
            "Proyecto registrado en la Oficina de Proyectos",
        codigo:
            proyecto.codigo ||
            proyecto.id ||
            "PMO",
        responsable: responsable
    };
}

function construirFilasActividadesMensuales() {
    const tareas = datosFiltrados.tareas.length
        ? datosFiltrados.tareas
        : datosOriginales.tareas;

    const horasPorTarea = {};

    datosFiltrados.horas.forEach(function (registro) {
        const idTarea = registro.idTarea || "sin_tarea";
        horasPorTarea[idTarea] = (horasPorTarea[idTarea] || 0) + Number(registro.horasTrabajadas || 0);
    });

    if (!tareas.length) {
        return `
            <tr>
                <td>PMO</td>
                <td>Seguimiento general</td>
                <td>Actividades registradas en el periodo seleccionado.</td>
                <td>Plataforma PMO</td>
                <td>0</td>
                <td>${sumarTodasLasHoras(datosFiltrados.horas).toFixed(2)}</td>
            </tr>
        `;
    }

    return tareas.slice(0, 18).map(function (tarea) {
        const horas = horasPorTarea[tarea.id] || 0;
        const avance = normalizarTexto(tarea.estado).includes("complet")
            ? 100
            : 0;

        return `
            <tr>
                <td>${escaparHTML(tarea.proyecto || "PMO")}</td>
                <td>${escaparHTML(tarea.fase || tarea.estado || "Actividad")}</td>
                <td>${escaparHTML(tarea.titulo || "Actividad registrada")}</td>
                <td>Plataforma PMO</td>
                <td>${avance}</td>
                <td>${horas.toFixed(2)}</td>
            </tr>
        `;
    }).join("");
}

function construirFilasChecklistMensual() {
    const tareas = datosFiltrados.tareas.length
        ? datosFiltrados.tareas
        : datosOriginales.tareas;

    if (!tareas.length) {
        return `
            <tr>
                <td>PMO</td>
                <td>Sin tareas registradas en el periodo</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
            </tr>
        `;
    }

    return tareas.slice(0, 22).map(function (tarea, indice) {
        const estado = tarea.estado || "Pendiente";
        const cumplimiento = normalizarTexto(estado).includes("complet")
            ? "✓"
            : estado;

        return `
            <tr>
                <td>${escaparHTML(tarea.proyecto || "PMO")}</td>
                <td>${indice + 1}.- ${escaparHTML(tarea.fase || tarea.titulo || "Actividad")}</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>${escaparHTML(cumplimiento)}</td>
            </tr>
        `;
    }).join("");
}

function encabezadoReporteOficial(titulo, hoja) {
    return `
        <header class="encabezado-oficial">
            <img src="img/LOGO-J2M.png" alt="Logo JJM" class="logo-oficial">
            <div class="encabezado-centro">
                <h2>UNIVERSIDAD POLITÉCNICA DE TECÁMAC</h2>
                <p>Dirección de la División de Ingeniería Mecánica,<br>Ingeniería en Tecnologías de Manufactura e Ingeniería en Software</p>
                <p>Coordinación de Estancias y Estadías Profesionales</p>
                <h3>${escaparHTML(titulo)}</h3>
            </div>
            <div class="encabezado-derecha">
                <p><strong>HOJA</strong><br>${escaparHTML(hoja)}</p>
                <p><strong>VERSIÓN</strong><br>1.0</p>
                <p><strong>FECHA DE LIBERACIÓN</strong><br>Mayo 2026</p>
            </div>
        </header>
    `;
}

function abrirDocumentoImprimible(titulo, contenidoHTML) {
    const ventana = window.open("", "_blank");

    if (!ventana) {
        alert("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para descargar el documento.");
        return;
    }

    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>${escaparHTML(titulo)}</title>
            <style>
                * { box-sizing: border-box; }
                body {
                    margin: 18px;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #000;
                    background: #fff;
                    font-size: 11px;
                }
                .encabezado-oficial {
                    display: grid;
                    grid-template-columns: 130px 1fr 150px;
                    align-items: start;
                    gap: 12px;
                    margin-bottom: 18px;
                }
                .logo-oficial {
                    width: 105px;
                    max-height: 90px;
                    object-fit: contain;
                }
                .encabezado-centro {
                    text-align: center;
                }
                .encabezado-centro h2,
                .encabezado-centro h3,
                .encabezado-centro p {
                    margin: 2px 0;
                }
                .encabezado-derecha {
                    text-align: center;
                    font-size: 10px;
                }
                h3 {
                    margin: 14px 0 8px;
                }
                .tabla-oficial,
                .tabla-firmas,
                .tabla-resumen-horas {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 12px;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 5px;
                    vertical-align: middle;
                }
                th {
                    background: #d9d9d9;
                    text-align: center;
                    font-weight: 700;
                }
                .tabla-actividades td,
                .tabla-checklist td {
                    vertical-align: top;
                }
                .tabla-firmas td {
                    height: 90px;
                    text-align: center;
                    vertical-align: bottom;
                    font-weight: 600;
                }
                .tabla-resumen-horas {
                    width: 260px;
                    margin-left: auto;
                }
                .tabla-resumen-horas th {
                    text-align: right;
                }
                .tabla-resumen-horas td {
                    text-align: center;
                    font-weight: bold;
                }
                .salto-pagina {
                    page-break-before: always;
                    break-before: page;
                }
                @media print {
                    @page {
                        size: landscape;
                        margin: 12mm;
                    }
                    body {
                        margin: 0;
                    }
                }
            </style>
        </head>
        <body>
            ${contenidoHTML}
            <script>
                window.onload = function () {
                    setTimeout(function () {
                        window.print();
                    }, 400);
                };
            <\/script>
        </body>
        </html>
    `);

    ventana.document.close();
}

/* =========================================================
   UTILIDADES
========================================================= */

function sumarTodasLasHoras(registros) {
    return registros.reduce(
        function (total, registro) {
            return total + Number(
                registro.horasTrabajadas || 0
            );
        },
        0
    );
}

function sumarHorasPorEstado(
    registros,
    estadoBuscado
) {
    return registros
        .filter(function (registro) {
            return normalizarTexto(
                registro.estadoValidacion
            ) === normalizarTexto(
                estadoBuscado
            );
        })
        .reduce(function (total, registro) {
            return total + Number(
                registro.horasTrabajadas || 0
            );
        }, 0);
}

function obtenerNombreProyecto(idProyecto) {
    const proyecto =
        datosOriginales.proyectos.find(
            function (item) {
                return String(item.id) ===
                    String(idProyecto);
            }
        );

    return proyecto?.nombre ||
        "";
}

function obtenerNombreTarea(idTarea) {
    const tarea =
        datosOriginales.tareas.find(
            function (item) {
                return String(item.id) ===
                    String(idTarea);
            }
        );

    return tarea?.titulo ||
        "";
}

function obtenerTextoFiltroCSV() {
    const inicio = filtrosReporte.mesInicio;
    const fin = filtrosReporte.mesFin;

    if (!inicio && !fin) {
        return "Todos los meses";
    }

    if (inicio && fin) {
        return `${formatearMes(inicio)} a ${formatearMes(fin)}`;
    }

    if (inicio) {
        return `Desde ${formatearMes(inicio)}`;
    }

    return `Hasta ${formatearMes(fin)}`;
}

function obtenerMesDeFecha(fecha) {
    if (!fecha) {
        return "";
    }

    const texto = String(fecha);

    if (texto.length >= 7) {
        return texto.substring(0, 7);
    }

    return "";
}

function limpiarFecha(fecha) {
    if (!fecha) {
        return "";
    }

    return String(fecha).split("T")[0];
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "—";
    }

    const partes = String(fecha)
        .split("T")[0]
        .split("-");

    if (partes.length !== 3) {
        return String(fecha);
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearMes(mes) {
    if (!mes) {
        return "—";
    }

    const partes = String(mes).split("-");

    if (partes.length !== 2) {
        return String(mes);
    }

    const nombresMeses = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre"
    ];

    const indiceMes =
        Number(partes[1]) - 1;

    return `${nombresMeses[indiceMes] || "Mes"} ${partes[0]}`;
}

function formatearHorario(
    entrada,
    salida
) {
    if (entrada && salida) {
        return `${formatearHora(entrada)} - ${formatearHora(salida)}`;
    }

    if (entrada && !salida) {
        return `${formatearHora(entrada)} - Jornada abierta`;
    }

    return "Sin horario";
}

function formatearHora(hora) {
    if (!hora) {
        return "—";
    }

    return String(hora).slice(0, 5);
}

function formatearIncidente(incidente) {
    const valor = normalizarTexto(incidente);

    const etiquetas = {
        normal: "Laborado normal",
        justificado:
            "No laborado con justificación",
        no_justificado:
            "No laborado sin justificación",
        recuperacion:
            "Recuperación",
        festivo:
            "Día festivo laborado",
        fin_semana:
            "Fin de semana laborado"
    };

    return etiquetas[valor] ||
        incidente ||
        "Normal";
}

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function obtenerColorEstado(estado) {
    const texto = normalizarTexto(estado);

    if (
        texto.includes("completado") ||
        texto.includes("completada") ||
        texto.includes("cerrado") ||
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
        texto.includes("bloqueada") ||
        texto.includes("bloqueado") ||
        texto.includes("cancelado") ||
        texto.includes("riesgo")
    ) {
        return "red";
    }

    if (
        texto.includes("pendiente") ||
        texto.includes("planificacion") ||
        texto.includes("inicio")
    ) {
        return "blue";
    }

    return "gray";
}

function obtenerColorEstadoMiembro(estado) {
    return normalizarTexto(estado) ===
        "activo"
        ? "green"
        : "gray";
}

function obtenerColorValidacion(estado) {
    const texto = normalizarTexto(estado);

    if (texto === "aprobado") {
        return "green";
    }

    if (texto === "rechazado") {
        return "red";
    }

    return "yellow";
}

function obtenerColorTipoRegistro(tipo) {
    return normalizarTexto(tipo) ===
        "jornada"
        ? "purple"
        : "blue";
}

function obtenerColorSeveridad(severidad) {
    const texto = normalizarTexto(severidad);

    if (
        texto.includes("critica") ||
        texto.includes("alta")
    ) {
        return "red";
    }

    if (texto.includes("media")) {
        return "orange";
    }

    if (texto.includes("baja")) {
        return "blue";
    }

    return "gray";
}

function convertirFechaRegistro(registro) {
    const fecha =
        registro.fecha ||
        registro.fechaCreacion ||
        "";

    const hora =
        registro.horaEntrada ||
        "00:00:00";

    const tiempo = new Date(
        `${fecha}T${hora}`
    ).getTime();

    return Number.isNaN(tiempo)
        ? 0
        : tiempo;
}

function renderEmpty(
    tabla,
    columnas,
    mensaje
) {
    if (!tabla) {
        return;
    }

    tabla.innerHTML = `
        <tr>
            <td
                colspan="${columnas}"
                class="empty-row"
            >
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
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}