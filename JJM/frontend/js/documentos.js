
// ==========================================================
// CONFIGURACIÓN DE ENDPOINTS Y CONSTANTES
// ==========================================================
const API_MIEMBROS_DOCUMENTOS = window.apiUrl("/api/miembros");
const API_MIEMBRO_SESION_DOCUMENTOS = window.apiUrl("/api/miembros/mi-sesion");
const API_DOCUMENTOS = window.apiUrl("/api/documentos");
const API_DATOS_ACADEMICOS_DOCUMENTOS = window.apiUrl("/api/datos-registro");
const API_TAREAS_FORMATOS_DOCUMENTOS = window.apiUrl("/api/tareas");
const API_HORAS_FORMATOS_DOCUMENTOS = window.apiUrl("/api/registros-horas");
const API_PROYECTOS_FORMATOS_DOCUMENTOS = window.apiUrl("/api/miembros-proyecto/mis-proyectos");


/* ==========================================================
 * CATÁLOGO OFICIAL DE PROYECTOS · SEPTIEMBRE-DICIEMBRE 2026
 * Los títulos marcados en azul en el documento de asignación
 * son los títulos oficiales para los equipos integrados.
 * ========================================================== */
const CATALOGO_OFICIAL_PROYECTOS_SEP_DIC_2026_DOCUMENTOS = [
    { equipo: "01", codigo: "JJM-SD26-01", alumno: "Rodrigo Pérez Tapia", nombre: "Propuesta Innovadora de solución Web y aplicación móvil para realizar la comercialización de Productos y Servicios con causa (E-commerce) con Chatbot e Inteligencia Artificial (IA) para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026." },
    { equipo: "02", codigo: "JJM-SD26-02", alumno: "Jimenez Villegas Karla Guadalupe", nombre: "Mejora e Innovación de 3 Soluciones Tecnológicas (Administración Integral): Plataforma E-learning (de 5,000 a 50,000 usuarios), Herramientas web en minutos (PWEB) y Proyección Profesional (PPCV) para la empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026. (Integración de los 3 proyectos asignados)" },
    { equipo: "03", codigo: "JJM-SD26-03", alumno: "Metzli Citlalli Gamero Gaytan", nombre: "Mejora e Innovación de 2 Soluciones Tecnológicas (Administración Integral): Solución Web y Aplicación móvil para la empresa JJM Tecnologías Innovadoras, S.A de C.V. y la 2da. Empresa es la Administración Integral de los Especialistas en Psicología y Áreas Afines en el 2026. (Integración de los 3 proyectos asignados)" },
    { equipo: "04", codigo: "JJM-SD26-04", alumno: "Jonathan Adrian Flores Morales", nombre: "Mejora e Innovación de 3 Soluciones Tecnológicas (Administración Integral): Compranet, Oficina de Proyectos y Publicidad para la empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026. (Integración de los 3 proyectos asignados)" },
    { equipo: "05", codigo: "JJM-SD26-05", alumno: "Carmona García Leonardo Maximiliano", nombre: "Mejora e Innovación de 3 Soluciones Tecnológicas (Administración Integral): Pacientes en Consultorio (OTO), Concursos por Materia de Competencias Multidisciplinarias (COMPITE) y Productos Chinos (Brocas) en el Sector Ferretero para la empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026. (Integración de los 3 proyectos asignados)" },
    { equipo: "06", codigo: "JJM-SD26-06", alumno: "Angel Zamora Joshua Misael", nombre: "Propuesta innovadora de Credenciales Digitales que sean administradas mediante un Sistema de Gestión Web y aplicación móvil con Chatbot e Inteligencia Artificial (IA) con el que se conozca la trazabilidad de los afiliados administración integral tanto internos (Colaboradores) como externos para cualquier tipo de organización en el 2026." },
    { equipo: "07", codigo: "JJM-SD26-07", alumno: "Martell", nombre: "Propuesta innovadora de un autómata que opere con inteligencia artificial (IA), cuente con mecanismos de auto aprendizaje, ejecute soluciones en tiempo real de forma local y remota, administre de forma integral todos los proyectos contenidos en el servidor web (Linux) para la empresa JJM Tecnologías Innovadoras, S.A. DE C.V. en el 2026" },
    { equipo: "08", codigo: "JJM-SD26-08", alumno: "Emily", nombre: "Propuesta Innovadora de solución Web y aplicación móvil para optimizar la administración integral (desde los proveedores hasta el consumidor final) de un negocio que comercializa Productos y Servicios con Chatbot e Inteligencia Artificial (IA) para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026." },
    { equipo: "09", codigo: "JJM-SD26-09", alumno: "Remigio Elizalde Kevin Uriel", nombre: "Propuesta Innovadora de solución Web y aplicación móvil para realizar la administración integral del expediente clínico de los chihuahuas, Geolocalización en tiempo real (NFC), comercialización de productos (NFC) y servicios mediante en línea mediante el uso del Chatbot e Inteligencia Artificial (IA) para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026." },
    { equipo: "10", codigo: "JJM-SD26-10", alumno: "Edgr Ivan Castañeda Juarez", nombre: "Propuesta Innovadora (solución Web y aplicación móvil) de una Plataforma Universal (libre y de paga) Inclusiva de Streaming que incluya navegación por voz inteligente, Chatbot e Inteligencia Artificial (IA) conversacional Multilenguaje accesible para cualquier tipo de televisor (con y sin Smart TV) y que se pueda ver y ejecutar desde la laptop, móvil, tablet y/o algún dispositivo similar para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026." },
    { equipo: "11", codigo: "JJM-SD26-11", alumno: "Dana Erandi Hernández Franco", nombre: "Propuesta Innovadora (solución Web y aplicación móvil) que considera el Expediente Clínico Veterinario Digital + Red Social Familiar para Mascotas + Marketplace + Telemedicina Veterinaria + Chatbot + Inteligencia Artificial (IA) + Agenda Digital + Geolocalización en tiempo real (NFC) Sistema de Alertas y Trazabilidad de Vida del Animal para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026." },
    { equipo: "13", codigo: "JJM-SD26-13", alumno: "Diana Paola Cesar Hernández", nombre: "Propuesta Innovadora (solución Web y aplicación móvil) que realice Solución inteligente de evaluación digital que crea exámenes personalizados, bloquea entornos externos, supervisa comportamiento, identifica patrones de copia, mide tiempos de resolución y genera alertas académicas automáticas. mediante el uso del Chatbot + Inteligencia Artificial (IA) para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026." },
    { equipo: "14", codigo: "JJM-SD26-14", alumno: "David Mondragón Cardoso", nombre: "Propuesta Innovadora de una Solución tecnológica integral (Web y aplicación móvil) con Inteligencia Artificial, ChatBot que realice el diagnóstico avanzado para monitoreo en tiempo real la realización del mantenimiento de cualquier tipo de equipo electrónico y que haga uso de software, soporte remoto, gestión comercial, e-Commerce, eLearning y atención global multilingüe para la Empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026." },
    { equipo: "15", codigo: "JJM-SD26-15", alumno: "Vilegas Sierra Adrián", nombre: "Autómata Inteligente de Operaciones Neurales que sea una Superinteligencia Artificial (ASI), capaz de crear diversas Inteligencias artificiales generales (AGIS) y que cada AGIS cree y administre las IA´s independientes y especializadas, autoaprendientes y especializadas, operando como sistema operativo independiente para soluciones universales en la empresa JJM Tecnologías Innovadoras, S.A de C.V. en el 2026" }
];

function tokensNombreProyectoOficialDocumentos(valor) {
    return new Set(
        normalizarTextoDocumentos(valor)
            .replace(/[^a-z0-9ñ]+/g, " ")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
    );
}

function obtenerProyectoOficialSepDic2026Documentos(nombreAlumno) {
    const tokensAlumno = tokensNombreProyectoOficialDocumentos(nombreAlumno);
    if (!tokensAlumno.size) return null;

    const coincidencias = CATALOGO_OFICIAL_PROYECTOS_SEP_DIC_2026_DOCUMENTOS.filter(item => {
        const tokensCatalogo = tokensNombreProyectoOficialDocumentos(item.alumno);
        if (!tokensCatalogo.size) return false;

        if (tokensCatalogo.size === 1) {
            return [...tokensCatalogo].every(token => tokensAlumno.has(token));
        }

        const catalogoEnAlumno = [...tokensCatalogo].every(token => tokensAlumno.has(token));
        const alumnoEnCatalogo = [...tokensAlumno].every(token => tokensCatalogo.has(token));
        return catalogoEnAlumno || alumnoEnCatalogo;
    });

    return coincidencias.length === 1 ? coincidencias[0] : null;
}

const CLAVE_DOCUMENTOS_PMO = "documentosUsuarioPMO";
const TAMANO_MAXIMO_MB_DOCUMENTO = 4;

const LOGO_JJM_DATA_URL = "data:image/jpeg;base64,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";


let usuarioActivoDocumentos = obtenerUsuarioActivoDocumentos();
let documentosPMO = [];
let miembrosPMO = [];
let miembroSesionPMO = null;
let documentoRevisionActual = null;
let datosAcademicosDocumentosCache = {};
let errorPadronDocumentos = "";
let filtroPersonaDocumentosValor = "";
let filtroPeriodoDocumentos = "";
let filtroAnioDocumentos = "";
let vistaPreviaDocumentoId = null;
let vistaPreviaBlobUrl = null;


// ==========================================================
// SELECTORES DOM
// ==========================================================
const indicadorRolDocumentos = document.getElementById("indicadorRolDocumentos");
const btnActualizarDocumentos = document.getElementById("btnActualizarDocumentos");

const btnAbrirSubidaPresentacion =
    document.getElementById("btnAbrirSubidaPresentacion");

const btnAbrirSubidaAceptacion =
    document.getElementById("btnAbrirSubidaAceptacion");

const btnAbrirSubidaTermino =
    document.getElementById("btnAbrirSubidaTermino");

const selectorMesFormatoAutomatico =
    document.getElementById("mesFormatoAutomatico");

const btnGenerarFormatoAsistencia =
    document.getElementById("btnGenerarFormatoAsistencia");

const btnGenerarFormatoActividades =
    document.getElementById("btnGenerarFormatoActividades");

const estadoFormatosAutomaticos =
    document.getElementById("estadoFormatosAutomaticos");

const btnAbrirLiberacion =
    document.getElementById("btnAbrirLiberacion");

const totalDocumentos = document.getElementById("totalDocumentos");
const totalPendientes = document.getElementById("totalPendientes");
const totalAceptados = document.getElementById("totalAceptados");
const totalLiberaciones = document.getElementById("totalLiberaciones");

const tablaMisDocumentos =
    document.getElementById("tablaMisDocumentos");

const tablaRevisionDocumentos =
    document.getElementById("tablaRevisionDocumentos");

const tablaLiberaciones =
    document.getElementById("tablaLiberaciones");

const filtroPersonaDocumentos =
    document.getElementById("filtroPersonaDocumentos");

const btnLimpiarFiltroPersonaDocumentos =
    document.getElementById("btnLimpiarFiltroPersonaDocumentos");

const tabButtonsDocumentos =
    document.querySelectorAll(".tab-btn");

const tabContentsDocumentos =
    document.querySelectorAll(".tab-content");


// ==========================================================
// MODAL CARTA DE PRESENTACIÓN
// ==========================================================
const modalSubirPresentacion =
    document.getElementById("modalSubirPresentacion");

const btnCerrarPresentacion =
    document.getElementById("btnCerrarPresentacion");

const btnCancelarPresentacion =
    document.getElementById("btnCancelarPresentacion");

const formSubirPresentacion =
    document.getElementById("formSubirPresentacion");

const archivoPresentacion =
    document.getElementById("archivoPresentacion");

const comentarioPresentacion =
    document.getElementById("comentarioPresentacion");


// ==========================================================
// MODAL CARTA DE ACEPTACIÓN FIRMADA
// ==========================================================
// IMPORTANTE:
// Esta opción SÍ permanece.
// El alumno solamente puede utilizarla después de que
// administración haya generado y liberado su carta.
const modalSubirAceptacion =
    document.getElementById("modalSubirAceptacion");

const btnCerrarAceptacion =
    document.getElementById("btnCerrarAceptacion");

const btnCancelarAceptacion =
    document.getElementById("btnCancelarAceptacion");

const formSubirAceptacion =
    document.getElementById("formSubirAceptacion");

const archivoAceptacion =
    document.getElementById("archivoAceptacion");

const comentarioAceptacion =
    document.getElementById("comentarioAceptacion");


// ==========================================================
// MODAL CARTA DE TÉRMINO
// ==========================================================
const modalSubirTermino =
    document.getElementById("modalSubirTermino");

const btnCerrarTermino =
    document.getElementById("btnCerrarTermino");

const btnCancelarTermino =
    document.getElementById("btnCancelarTermino");

const formSubirTermino =
    document.getElementById("formSubirTermino");

const archivoTermino =
    document.getElementById("archivoTermino");

const comentarioTermino =
    document.getElementById("comentarioTermino");


// ==========================================================
// MODAL GENERACIÓN / LIBERACIÓN
// ==========================================================
const modalLiberacion =
    document.getElementById("modalLiberacion");

const btnCerrarLiberacion =
    document.getElementById("btnCerrarLiberacion");

const btnCancelarLiberacion =
    document.getElementById("btnCancelarLiberacion");

const formLiberacion =
    document.getElementById("formLiberacion");

const miembroLiberacion =
    document.getElementById("miembroLiberacion");

const observacionLiberacion =
    document.getElementById("observacionLiberacion");

const tipoLiberacion =
    document.getElementById("tipoLiberacion");


// ==========================================================
// DATOS PARA GENERAR DOCUMENTOS
// ==========================================================
const docNombreCompleto =
    document.getElementById("docNombreCompleto");

const docMatricula =
    document.getElementById("docMatricula");

const docUniversidad =
    document.getElementById("docUniversidad");

const docCarrera =
    document.getElementById("docCarrera");

const docCuatrimestre =
    document.getElementById("docCuatrimestre");

const docPeriodo =
    document.getElementById("docPeriodo");

const docFechaInicio =
    document.getElementById("docFechaInicio");

const docFechaFin =
    document.getElementById("docFechaFin");

const docHoras =
    document.getElementById("docHoras");

const docProyecto =
    document.getElementById("docProyecto");


// ==========================================================
// MODAL DE REVISIÓN
// ==========================================================
const modalRevision =
    document.getElementById("modalRevision");

const tituloRevision =
    document.getElementById("tituloRevision");

const btnCerrarRevision =
    document.getElementById("btnCerrarRevision");

const btnCancelarRevision =
    document.getElementById("btnCancelarRevision");

const formRevision =
    document.getElementById("formRevision");

const idDocumentoRevision =
    document.getElementById("idDocumentoRevision");

const estadoDocumentoRevision =
    document.getElementById("estadoDocumentoRevision");

const observacionRevision =
    document.getElementById("observacionRevision");


// ==========================================================
// MODAL DE VISTA PREVIA
// ==========================================================
const modalVistaPreviaDocumento =
    document.getElementById("modalVistaPreviaDocumento");

const tituloVistaPreviaDocumento =
    document.getElementById("tituloVistaPreviaDocumento");

const descripcionVistaPreviaDocumento =
    document.getElementById("descripcionVistaPreviaDocumento");

const contenedorVistaPreviaDocumento =
    document.getElementById("contenedorVistaPreviaDocumento");

const btnCerrarVistaPreviaDocumento =
    document.getElementById("btnCerrarVistaPreviaDocumento");

const btnDescargarVistaPreviaDocumento =
    document.getElementById("btnDescargarVistaPreviaDocumento");


// ==========================================================
// INICIO DE LA APLICACIÓN
// ==========================================================
document.addEventListener("DOMContentLoaded", async function () {

    usuarioActivoDocumentos =
        obtenerUsuarioActivoDocumentos();

    if (!usuarioActivoDocumentos) {
        window.location.replace("login.html");
        return;
    }

    configurarInterfazPorRol();
    configurarEventosDocumentos();

    await cargarMiembrosDocumentos();
    await cargarDocumentosBackend();
    await cargarDatosAcademicosDocumentosBackend();

    actualizarSelectorMesFormatosAutomaticosDocumentos();
    actualizarFiltroPersonaDocumentos();
    renderizarDocumentos();
});


// ==========================================================
// GESTIÓN DE USUARIO ACTIVO
// ==========================================================
function obtenerUsuarioActivoDocumentos() {
    try {
        return JSON.parse(
            localStorage.getItem("usuarioActivo")
        ) || null;
    } catch (error) {
        return null;
    }
}


function obtenerIdUsuarioDocumentos() {
    return usuarioActivoDocumentos?.id ||
        usuarioActivoDocumentos?.idUsuario ||
        usuarioActivoDocumentos?.id_usuario ||
        null;
}


function obtenerIdMiembroSesionDocumentos() {
    return usuarioActivoDocumentos?.idMiembro ||
        usuarioActivoDocumentos?.idMiembroEquipo ||
        usuarioActivoDocumentos?.miembroId ||
        null;
}


function obtenerNombreUsuarioDocumentos() {

    return usuarioActivoDocumentos?.nombreCompleto ||

        [
            usuarioActivoDocumentos?.nombre,
            usuarioActivoDocumentos?.apellidoPaterno,
            usuarioActivoDocumentos?.apellidoMaterno
        ]
            .filter(Boolean)
            .join(" ") ||

        usuarioActivoDocumentos?.correo ||

        "Usuario";
}


// ==========================================================
// DATOS ACADÉMICOS
// ==========================================================
function obtenerDatosAcademicosDocumentos(
    idUsuario = obtenerIdUsuarioDocumentos()
) {

    if (!idUsuario) return {};

    const cacheKey = String(idUsuario);

    if (datosAcademicosDocumentosCache[cacheKey]) {
        return datosAcademicosDocumentosCache[cacheKey];
    }

    try {

        const datosLocal = JSON.parse(
            localStorage.getItem(
                `datosAcademicosPMO_${idUsuario}`
            )
        ) || {};

        datosAcademicosDocumentosCache[cacheKey] =
            datosLocal;

        return datosLocal;

    } catch (error) {

        return {};
    }
}


// ==========================================================
// CARGAR DOCUMENTOS DESDE BACKEND
// ==========================================================
async function cargarDocumentosBackend() {

    try {

        const respuesta = await fetch(
            API_DOCUMENTOS,
            {
                method: "GET",
                headers: obtenerHeadersDocumentos()
            }
        );

        const cuerpo =
            await obtenerJSONDocumentos(respuesta);

        if (!respuesta.ok) {

            throw new Error(
                cuerpo.mensaje ||
                "No fue posible cargar los documentos."
            );
        }

        const lista =
            Array.isArray(cuerpo)
                ? cuerpo
                : (
                    Array.isArray(cuerpo.documentos)
                        ? cuerpo.documentos
                        : []
                );


        documentosPMO = lista.map(function (doc) {

            let datosAcademicos =
                doc.datosAcademicos ??
                doc.datos_academicos ??
                {};


            if (typeof datosAcademicos === "string") {

                try {

                    datosAcademicos =
                        JSON.parse(datosAcademicos);

                } catch (error) {

                    console.warn(
                        "No fue posible interpretar los datos académicos del documento.",
                        error
                    );

                    datosAcademicos = {};
                }
            }


            const documento = {

                ...doc,

                id:
                    doc.id ??
                    doc.idDocumento ??
                    doc.id_documento,

                idUsuario:
                    doc.idUsuario ??
                    doc.id_usuario,

                idMiembro:
                    doc.idMiembro ??
                    doc.id_miembro,

                colaboradorNombre:
                    doc.colaboradorNombre ??
                    doc.colaborador_nombre ??
                    "",

                colaboradorCorreo:
                    doc.colaboradorCorreo ??
                    doc.colaborador_correo ??
                    "",

                tipoDocumento:
                    doc.tipoDocumento ??
                    doc.tipo_documento ??
                    "",

                nombreArchivo:
                    doc.nombreArchivo ??
                    doc.nombre_archivo ??
                    "",

                archivoBase64:
                    doc.archivoBase64 ??
                    doc.archivo_base64 ??
                    "",

                mimeType:
                    doc.mimeType ??
                    doc.mime_type ??
                    "",

                estado:
                    doc.estado ??
                    "Pendiente",

                observaciones:
                    doc.observaciones ??
                    "",

                fechaSubida:
                    doc.fechaSubida ??
                    doc.fecha_subida ??
                    null,

                fechaRegistro:
                    doc.fechaRegistro ??
                    doc.fecha_registro ??
                    null,

                fechaRevision:
                    doc.fechaRevision ??
                    doc.fecha_revision ??
                    null,

                idUsuarioRevisor:
                    doc.idUsuarioRevisor ??
                    doc.id_usuario_revisor ??
                    null,

                generadoAutomaticamente:
                    doc.generadoAutomaticamente ??
                    doc.generado_automaticamente ??
                    false,

                datosAcademicos
            };


            aplicarDatosAcademicosADocumento(
                documento,
                datosAcademicos
            );

            return documento;
        });


        guardarDocumentosStorage();

    } catch (error) {

        console.error(
            "No fue posible cargar documentos desde backend:",
            error
        );

        cargarDocumentosStorage();

        if (!documentosPMO.length) {

            console.warn(
                "No existen documentos disponibles en caché local."
            );
        }
    }
}


// ==========================================================
// UTILIDADES ACADÉMICAS Y DE DATOS
// ==========================================================
function obtenerTextoAcademicoDocumento(doc) {

    let datos =
        doc?.datosAcademicos || {};


    if (typeof datos === "string") {

        try {

            datos = JSON.parse(datos);

        } catch (error) {

            datos = {};
        }
    }


    const partes = [];

    const matricula =
        datos.matricula ||
        doc?.matricula ||
        "";

    const carrera =
        datos.carrera ||
        doc?.carrera ||
        "";

    const cuatrimestre =
        datos.cuatrimestre ||
        doc?.cuatrimestre ||
        "";

    const universidad =
        datos.universidad ||
        doc?.universidad ||
        "";


    if (matricula) {
        partes.push(`Matrícula: ${matricula}`);
    }

    if (carrera) {
        partes.push(carrera);
    }

    if (cuatrimestre) {
        partes.push(`${cuatrimestre} cuatrimestre`);
    }

    if (universidad) {
        partes.push(universidad);
    }


    return partes.join(" · ");
}


function aplicarDatosAcademicosADocumento(
    documento,
    datosAcademicos
) {

    documento.datosAcademicos =
        datosAcademicos || {};

    documento.matricula =
        datosAcademicos?.matricula || "";

    documento.universidad =
        datosAcademicos?.universidad || "";

    documento.carrera =
        datosAcademicos?.carrera || "";

    documento.cuatrimestre =
        datosAcademicos?.cuatrimestre || "";

    documento.periodoEstadia =
        datosAcademicos?.periodoEstadia ||
        datosAcademicos?.periodo ||
        "";

    documento.fechaInicio =
        datosAcademicos?.fechaInicio ||
        datosAcademicos?.fecha_inicio ||
        datosAcademicos?.fechaInicioEstadia ||
        datosAcademicos?.fecha_inicio_estadia ||
        datosAcademicos?.fechaInicioEstancia ||
        datosAcademicos?.fecha_inicio_estancia ||
        "";

    documento.fechaFin =
        datosAcademicos?.fechaFin ||
        datosAcademicos?.fecha_fin ||
        datosAcademicos?.fechaTermino ||
        datosAcademicos?.fecha_termino ||
        datosAcademicos?.fechaFinEstadia ||
        datosAcademicos?.fecha_fin_estadia ||
        datosAcademicos?.fechaTerminoEstadia ||
        datosAcademicos?.fecha_termino_estadia ||
        datosAcademicos?.fechaFinEstancia ||
        datosAcademicos?.fecha_fin_estancia ||
        "";

    return documento;
}

// ==========================================================
// ROLES Y PERMISOS
// ==========================================================
function obtenerRolDocumentos() {

    if (
        usuarioActivoDocumentos?.rol &&
        typeof usuarioActivoDocumentos.rol === "object"
    ) {
        return usuarioActivoDocumentos.rol.nombre || "";
    }

    return usuarioActivoDocumentos?.rol ||
        usuarioActivoDocumentos?.rolNombre ||
        usuarioActivoDocumentos?.nombreRol ||
        "";
}


function normalizarTextoDocumentos(valor) {

    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}


function esAdministradorDocumentos() {

    if (
        window.PMOPermisos &&
        window.PMOPermisos.tiene("documentos.ver_todos")
    ) {
        return true;
    }

    const rol =
        normalizarTextoCompatibilidadPermisos(
            obtenerRolCompatibilidadPermisos()
        );

    return [
        "superadministrador",
        "administrador",
        "admin pmo",
        "admin_pmo",
        "administrador pmo"
    ].includes(rol);
}


function obtenerRolCompatibilidadPermisos() {

    try {

        const usuario =
            JSON.parse(
                localStorage.getItem("usuarioActivo") ||
                "null"
            ) || {};

        return usuario.rol?.nombre ||
            usuario.rol ||
            usuario.rolNombre ||
            usuario.nombreRol ||
            "";

    } catch (e) {

        return "";
    }
}


function normalizarTextoCompatibilidadPermisos(valor) {

    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}


function puedeValidarDocumentos() {

    return !!(
        window.PMOPermisos &&
        window.PMOPermisos.tiene("documentos.validar")
    );
}


function puedeEliminarDocumentos() {

    return !!(
        window.PMOPermisos &&
        window.PMOPermisos.tiene("documentos.eliminar")
    );
}


function esRolConsultaDocumentos() {

    const rol =
        normalizarTextoDocumentos(
            obtenerRolDocumentos()
        );

    return [
        "cliente",
        "consulta",
        "usuario de consulta",
        "enlace universidad",
        "enlace de universidad",
        "enlace empresa",
        "enlace de empresa"
    ].includes(rol);
}


function puedeSubirDocumentosPropios() {

    return !esAdministradorDocumentos() &&
        !esRolConsultaDocumentos();
}


function nombreRolDocumentosActual() {

    if (
        window.PMOPermisos &&
        typeof window.PMOPermisos.rol === "function"
    ) {
        return window.PMOPermisos.rol();
    }

    return obtenerRolDocumentos() ||
        "Usuario";
}


function obtenerHeadersDocumentos() {

    const idUsuario =
        obtenerIdUsuarioDocumentos();

    return idUsuario
        ? {
            "X-Usuario-Id":
                String(idUsuario)
        }
        : {};
}


function obtenerFechaOrdenDocumento(doc) {

    const fecha =
        doc?.fechaRegistro ||
        doc?.fecha_registro ||
        doc?.fechaSubida ||
        0;

    const tiempo =
        new Date(fecha).getTime();

    return Number.isNaN(tiempo)
        ? 0
        : tiempo;
}


// ==========================================================
// CONFIGURACIÓN DE INTERFAZ SEGÚN ROL
// ==========================================================
function configurarInterfazPorRol() {

    const accesoGlobal =
        esAdministradorDocumentos();

    const puedeSubir =
        puedeSubirDocumentosPropios();


    // ======================================================
    // CLASE DEL BODY
    // ======================================================

    document.body.classList.toggle(
        "es-admin",
        accesoGlobal
    );


    // ======================================================
    // INDICADOR DEL ROL
    // ======================================================

    if (indicadorRolDocumentos) {

        indicadorRolDocumentos.textContent =
            nombreRolDocumentosActual();

        indicadorRolDocumentos.className =
            accesoGlobal
                ? "role-indicator admin"
                : "role-indicator";
    }


    const tituloPaginaDocumentos = document.getElementById("tituloDocumentosPagina");
    const descripcionPaginaDocumentos = document.getElementById("descripcionDocumentosPagina");
    if (tituloPaginaDocumentos) {
        tituloPaginaDocumentos.textContent = accesoGlobal ? "Documentos y expedientes" : "Mi expediente";
    }
    if (descripcionPaginaDocumentos) {
        descripcionPaginaDocumentos.textContent = accesoGlobal
            ? "Consulta alumnos por periodo, genera cartas y revisa los documentos de cada expediente."
            : "Consulta y gestiona los documentos de tu expediente académico y de estadía.";
    }

    // ======================================================
    // ELEMENTOS EXCLUSIVOS DEL ADMINISTRADOR
    // ======================================================

    const elementosAdmin =
        document.querySelectorAll(
            ".admin-only"
        );

    elementosAdmin.forEach(
        function (elemento) {

            if (accesoGlobal) {

                elemento.classList.remove(
                    "oculto-por-rol"
                );

                elemento.hidden = false;

            } else {

                elemento.classList.add(
                    "oculto-por-rol"
                );

                elemento.hidden = true;
            }
        }
    );


    // ======================================================
    // PESTAÑA DE REVISIÓN
    // ======================================================

    const tabRevision =
        document.querySelector(
            '[data-tab="revision"]'
        );

    if (tabRevision) {

        tabRevision.hidden =
            !accesoGlobal;
    }


    // ======================================================
    // BOTONES PARA SUBIR DOCUMENTOS
    // SOLO ALUMNOS
    // ======================================================

    if (btnAbrirSubidaPresentacion) {

        btnAbrirSubidaPresentacion.hidden =
            accesoGlobal || !puedeSubir;
    }


    if (btnAbrirSubidaAceptacion) {

        btnAbrirSubidaAceptacion.hidden =
            accesoGlobal || !puedeSubir;
    }


    if (btnAbrirSubidaTermino) {

        btnAbrirSubidaTermino.hidden =
            accesoGlobal || !puedeSubir;
    }


    // ======================================================
    // BOTÓN DE GENERACIÓN / LIBERACIÓN
    // SOLO ADMINISTRADOR
    // ======================================================

    if (btnAbrirLiberacion) {

        btnAbrirLiberacion.hidden =
            !accesoGlobal;
    }


    // ======================================================
    // FILTRO DE PERSONAS
    // SOLO ADMINISTRADOR
    // ======================================================

    const filtroContenedor =
        document.getElementById(
            "filtroPersonaDocumentosContenedor"
        );

    if (filtroContenedor) {

        filtroContenedor.hidden =
            !accesoGlobal;
    }


    // ======================================================
    // TEXTO DE DOCUMENTOS PARA ADMINISTRADOR
    // ======================================================

    const tituloMis =
        document.querySelector(
            "#tab-mis-documentos h2"
        );

    const descMis =
        document.querySelector(
            "#tab-mis-documentos .card-header p"
        );

    const botonMis =
        document.querySelector(
            '[data-tab="mis-documentos"]'
        );


    if (accesoGlobal) {

        if (botonMis) {

            botonMis.textContent =
                "Documentos";
        }

        if (tituloMis) {

            tituloMis.textContent =
                "Expedientes y documentos";
        }

        if (descMis) {

            descMis.textContent =
                "Consulta los documentos disponibles y su estado actual.";
        }
    }
}


// ==========================================================
// CONFIGURACIÓN DE EVENTOS
// ==========================================================
function configurarEventosDocumentos() {


    // ======================================================
    // FORMATOS AUTOMÁTICOS: ASISTENCIA Y ACTIVIDADES
    // ======================================================

    if (btnGenerarFormatoAsistencia) {
        btnGenerarFormatoAsistencia.addEventListener(
            "click",
            async function () {
                await ejecutarGeneracionFormatoAutomatico(
                    btnGenerarFormatoAsistencia,
                    generarListaAsistenciaAutomaticaPDF,
                    "Generando lista de asistencia..."
                );
            }
        );
    }

    if (btnGenerarFormatoActividades) {
        btnGenerarFormatoActividades.addEventListener(
            "click",
            async function () {
                await ejecutarGeneracionFormatoAutomatico(
                    btnGenerarFormatoActividades,
                    generarReporteActividadesProyectoPDF,
                    "Generando reporte de tareas..."
                );
            }
        );
    }

    // ======================================================
    // GESTIÓN DE PESTAÑAS
    // ======================================================

    tabButtonsDocumentos.forEach(
        function (boton) {

            boton.addEventListener(
                "click",
                function () {

                    const tab =
                        boton.getAttribute(
                            "data-tab"
                        );


                    tabButtonsDocumentos.forEach(
                        function (btn) {

                            btn.classList.remove(
                                "active"
                            );
                        }
                    );


                    tabContentsDocumentos.forEach(
                        function (contenido) {

                            contenido.classList.remove(
                                "active"
                            );
                        }
                    );


                    boton.classList.add(
                        "active"
                    );


                    const contenidoActivo =
                        document.getElementById(
                            `tab-${tab}`
                        );


                    if (contenidoActivo) {

                        contenidoActivo.classList.add(
                            "active"
                        );
                    }
                }
            );
        }
    );


    // ======================================================
    // ACTUALIZAR
    // ======================================================

    if (btnActualizarDocumentos) {

        btnActualizarDocumentos.addEventListener(
            "click",
            async function () {

                await cargarMiembrosDocumentos();

                await cargarDocumentosBackend();

                await cargarDatosAcademicosDocumentosBackend();

                actualizarSelectorMesFormatosAutomaticosDocumentos();
                actualizarFiltroPersonaDocumentos();

                renderizarDocumentos();
            }
        );
    }


    // ======================================================
    // FILTRO DE PERSONAS / PERIODOS
    // ======================================================

    if (filtroPersonaDocumentos) {

        filtroPersonaDocumentos.addEventListener(
            "change",
            function () {

                filtroPersonaDocumentosValor =
                    filtroPersonaDocumentos.value || "";


                if (
                    filtroPersonaDocumentosValor ===
                    "enero-abril"
                ) {

                    filtroPeriodoDocumentos =
                        "enero-abril";

                } else if (
                    filtroPersonaDocumentosValor ===
                    "septiembre-diciembre"
                ) {

                    filtroPeriodoDocumentos =
                        "septiembre-diciembre";

                } else if (
                    filtroPersonaDocumentosValor ===
                    "mayo-agosto"
                ) {

                    filtroPeriodoDocumentos =
                        "mayo-agosto";

                } else if (filtroPersonaDocumentosValor === "sin-periodo") {
                    filtroPeriodoDocumentos = "sin-periodo";
                } else {
                    filtroPeriodoDocumentos = "";
                }
                renderizarDocumentos();
            }
        );
    }


    // ======================================================
    // LIMPIAR FILTRO
    // ======================================================

    if (btnLimpiarFiltroPersonaDocumentos) {

        btnLimpiarFiltroPersonaDocumentos.addEventListener(
            "click",
            function () {

                filtroPersonaDocumentosValor =
                    "";

                filtroPeriodoDocumentos =
                    "";


                if (filtroPersonaDocumentos) {

                    filtroPersonaDocumentos.value =
                        "";
                }


                renderizarDocumentos();
            }
        );
    }


    // ======================================================
    // SUBIR CARTA DE PRESENTACIÓN
    // ======================================================

    if (btnAbrirSubidaPresentacion) {

        btnAbrirSubidaPresentacion.addEventListener(
            "click",
            function () {

                if (
                    !puedeSubirDocumentosPropios()
                ) {
                    return;
                }


                if (modalSubirPresentacion) {

                    modalSubirPresentacion.classList.add(
                        "active"
                    );
                }
            }
        );
    }


    // ======================================================
    // SUBIR CARTA DE ACEPTACIÓN FIRMADA
    // ======================================================

    if (btnAbrirSubidaAceptacion) {

        btnAbrirSubidaAceptacion.addEventListener(
            "click",
            function () {

                if (
                    !puedeSubirDocumentosPropios()
                ) {
                    return;
                }


                if (
                    !alumnoPuedeSubirCartaAceptacion()
                ) {

                    alert(
                        "Primero debes recibir la Carta de aceptación generada y liberada por administración. Después podrás subirla firmada."
                    );

                    return;
                }


                if (modalSubirAceptacion) {

                    modalSubirAceptacion.classList.add(
                        "active"
                    );
                }
            }
        );
    }


    // ======================================================
    // SUBIR CARTA DE TÉRMINO
    // ======================================================

    if (btnAbrirSubidaTermino) {

        btnAbrirSubidaTermino.addEventListener(
            "click",
            function () {

                if (
                    !puedeSubirDocumentosPropios()
                ) {
                    return;
                }


                if (modalSubirTermino) {

                    modalSubirTermino.classList.add(
                        "active"
                    );
                }
            }
        );
    }


    // ======================================================
    // GENERAR / LIBERAR
    // ======================================================

    if (btnAbrirLiberacion) {

        btnAbrirLiberacion.addEventListener(
            "click",
            function () {

                if (
                    !puedeValidarDocumentos()
                ) {
                    return;
                }


                if (modalLiberacion) {

                    modalLiberacion.classList.add(
                        "active"
                    );
                }
            }
        );
    }


    // ======================================================
    // CERRAR MODAL PRESENTACIÓN
    // ======================================================

    if (btnCerrarPresentacion) {

        btnCerrarPresentacion.addEventListener(
            "click",
            function () {

                if (modalSubirPresentacion) {

                    modalSubirPresentacion.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


    if (btnCancelarPresentacion) {

        btnCancelarPresentacion.addEventListener(
            "click",
            function () {

                if (modalSubirPresentacion) {

                    modalSubirPresentacion.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


    // ======================================================
    // CERRAR MODAL ACEPTACIÓN
    // ======================================================

    if (btnCerrarAceptacion) {

        btnCerrarAceptacion.addEventListener(
            "click",
            function () {

                if (modalSubirAceptacion) {

                    modalSubirAceptacion.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


    if (btnCancelarAceptacion) {

        btnCancelarAceptacion.addEventListener(
            "click",
            function () {

                if (modalSubirAceptacion) {

                    modalSubirAceptacion.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


    // ======================================================
    // CERRAR MODAL TÉRMINO
    // ======================================================

    if (btnCerrarTermino) {

        btnCerrarTermino.addEventListener(
            "click",
            function () {

                if (modalSubirTermino) {

                    modalSubirTermino.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


    if (btnCancelarTermino) {

        btnCancelarTermino.addEventListener(
            "click",
            function () {

                if (modalSubirTermino) {

                    modalSubirTermino.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


    // ======================================================
    // CERRAR MODAL LIBERACIÓN
    // ======================================================

    if (btnCerrarLiberacion) {

        btnCerrarLiberacion.addEventListener(
            "click",
            function () {

                if (modalLiberacion) {

                    modalLiberacion.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


     if (btnCancelarLiberacion) {

        btnCancelarLiberacion.addEventListener(
            "click",
            function () {

                if (modalLiberacion) {

                    modalLiberacion.classList.remove(
                        "active"
                    );
                }
            }
        );
    }
}

function actualizarTextoTipoDocumento() {

    if (!tipoLiberacion) {
        return;
    }

    const tipo = tipoLiberacion.value;

    console.log("Tipo de documento seleccionado:", tipo);
}


    // ------------------------------------------------------
    // LIMPIAR FILTRO
    // ------------------------------------------------------
    if (btnLimpiarFiltroPersonaDocumentos) {

        btnLimpiarFiltroPersonaDocumentos.addEventListener(
            "click",
            function () {

                filtroPersonaDocumentosValor =
                    "";

                filtroPeriodoDocumentos =
                    "";


                if (filtroPersonaDocumentos) {

                    filtroPersonaDocumentos.value =
                        "";
                }


                renderizarDocumentos();
            }
        );
    }


    // ------------------------------------------------------
    // CARTA DE PRESENTACIÓN
    // ------------------------------------------------------
    if (btnAbrirSubidaPresentacion) {

        btnAbrirSubidaPresentacion.addEventListener(
            "click",
            function () {

                if (
                    !puedeSubirDocumentosPropios()
                ) {
                    return;
                }


                limpiarFormularioPresentacion();

                abrirModalDocumentos(
                    modalSubirPresentacion
                );
            }
        );
    }


    // ------------------------------------------------------
    // CARTA DE ACEPTACIÓN FIRMADA
    // ------------------------------------------------------
    if (btnAbrirSubidaAceptacion) {

        btnAbrirSubidaAceptacion.addEventListener(
            "click",
            function () {

                if (
                    !puedeSubirDocumentosPropios()
                ) {
                    return;
                }


                // El alumno NO puede subir la carta
                // antes de que administración la genere
                // y la libere.
                if (
                    !alumnoPuedeSubirCartaAceptacion()
                ) {

                    alert(
                        "Primero debes recibir la Carta de aceptación generada y liberada por administración. Después podrás subirla firmada."
                    );

                    return;
                }


                limpiarFormularioAceptacion();

                abrirModalDocumentos(
                    modalSubirAceptacion
                );
            }
        );
    }


    // ------------------------------------------------------
    // CARTA DE TÉRMINO
    // ------------------------------------------------------
    if (btnAbrirSubidaTermino) {

        btnAbrirSubidaTermino.addEventListener(
            "click",
            function () {

                if (
                    !puedeSubirDocumentosPropios()
                ) {
                    return;
                }


                limpiarFormularioTermino();

                abrirModalDocumentos(
                    modalSubirTermino
                );
            }
        );
    }


    // ------------------------------------------------------
    // GENERACIÓN / LIBERACIÓN ADMINISTRATIVA
    // ------------------------------------------------------
    if (btnAbrirLiberacion) {

        btnAbrirLiberacion.addEventListener(
            "click",
            function () {

                if (
                    !puedeValidarDocumentos()
                ) {
                    return;
                }


                llenarSelectLiberacion();

                limpiarFormularioLiberacion();

                abrirModalDocumentos(
                    modalLiberacion
                );
            }
        );
    }


    // ------------------------------------------------------
    // CIERRE DE MODALES
    // ------------------------------------------------------
    const asociarCierreModal =
        (botones, modal) => {

            botones.forEach(btn => {

                if (btn) {

                    btn.addEventListener(
                        "click",
                        () =>
                            cerrarModalDocumentos(
                                modal
                            )
                    );
                }
            });
        };


    asociarCierreModal(
        [
            btnCerrarPresentacion,
            btnCancelarPresentacion
        ],
        modalSubirPresentacion
    );


    // La carta de aceptación sigue teniendo
    // su modal porque el alumno debe subir
    // posteriormente la versión firmada.
    asociarCierreModal(
        [
            btnCerrarAceptacion,
            btnCancelarAceptacion
        ],
        modalSubirAceptacion
    );


    asociarCierreModal(
        [
            btnCerrarTermino,
            btnCancelarTermino
        ],
        modalSubirTermino
    );


    asociarCierreModal(
        [
            btnCerrarLiberacion,
            btnCancelarLiberacion
        ],
        modalLiberacion
    );


    asociarCierreModal(
        [
            btnCerrarRevision,
            btnCancelarRevision
        ],
        modalRevision
    );


    // ------------------------------------------------------
    // VISTA PREVIA
    // ------------------------------------------------------
    if (btnCerrarVistaPreviaDocumento) {

        btnCerrarVistaPreviaDocumento.addEventListener(
            "click",
            cerrarVistaPreviaDocumento
        );
    }


    if (btnDescargarVistaPreviaDocumento) {

        btnDescargarVistaPreviaDocumento.addEventListener(
            "click",
            function () {

                if (
                    vistaPreviaDocumentoId != null
                ) {

                    descargarDocumento(
                        vistaPreviaDocumentoId
                    );
                }
            }
        );
    }


    // ------------------------------------------------------
    // ENVÍO DE FORMULARIOS
    // ------------------------------------------------------
    if (formSubirPresentacion) {

        formSubirPresentacion.addEventListener(
            "submit",
            guardarCartaPresentacion
        );
    }


    // La Carta de aceptación SÍ se puede subir,
    // pero solamente como versión firmada.
    if (formSubirAceptacion) {

        formSubirAceptacion.addEventListener(
            "submit",
            guardarCartaAceptacion
        );
    }


    if (formSubirTermino) {

        formSubirTermino.addEventListener(
            "submit",
            guardarCartaTermino
        );
    }


    if (formLiberacion) {

        formLiberacion.addEventListener(
            "submit",
            guardarCartaLiberacion
        );
    }


    // ------------------------------------------------------
    // CAMBIOS EN GENERACIÓN ADMINISTRATIVA
    // ------------------------------------------------------
    if (miembroLiberacion) {

        miembroLiberacion.addEventListener(
            "change",
            cargarDatosDocumentoSeleccionado
        );
    }


    if (tipoLiberacion) {

        tipoLiberacion.addEventListener(
            "change",
            actualizarTextoTipoDocumento
        );
    }


    // ------------------------------------------------------
    // REVISIÓN ADMINISTRATIVA
    // ------------------------------------------------------
    if (formRevision) {

        formRevision.addEventListener(
            "submit",
            guardarRevisionDocumento
        );
    }


function formatearFechaCartaTermino(fecha = new Date()) {
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}


function normalizarCuatrimestreCarta(valor) {
    const original = String(valor ?? "").normalize("NFC").trim();
    const texto = original.toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\bcuatrimestre\b/g, "")
        .replace(/[.°ºª:]/g, " ")
        .replace(/\s+/g, " ").trim();

    const nombres = {
        1: "primer",
        2: "segundo",
        3: "tercer",
        4: "cuarto",
        5: "quinto",
        6: "sexto",
        7: "séptimo",
        8: "octavo",
        9: "noveno",
        10: "décimo",
        11: "décimo primer",
        12: "décimo segundo"
    };

    // Si viene como número: 10
    const numero = Number(
        (texto.match(/\d+/) || [""])[0]
    );

    if (numero >= 1 && numero <= 12) {
        return nombres[numero];
    }

    // Si viene escrito con letras
    const equivalencias = {
        primero: "primer",
        primer: "primer",
        segundo: "segundo",
        tercero: "tercer",
        tercer: "tercer",
        cuarto: "cuarto",
        quinto: "quinto",
        sexto: "sexto",
        septimo: "séptimo",
        octavo: "octavo",
        noveno: "noveno",
        decimo: "d\u00e9cimo",
        x: "d\u00e9cimo",
        "decimo primero": "d\u00e9cimo primer",
        undecimo: "décimo primer",
        "decimo primer": "décimo primer",
        duodecimo: "décimo segundo",
        "decimo segundo": "décimo segundo"
    };

    const textoSinCuatrimestre = texto
        .replace(/\bcuatrimestre\b/g, "")
        .trim();

    if (equivalencias[textoSinCuatrimestre]) {
        return equivalencias[textoSinCuatrimestre];
    }

    return original.replace(/\bcuatrimestre\b/gi, "").trim();
}


function normalizarPeriodoCarta(valor) {
    return String(valor || "Septiembre - Diciembre 2026")
        .replace(/\s*[-–—]\s*/g, " - ")
        .replace(/\s+/g, " ")
        .trim();
}


/*
 * ==========================================================
 * NORMALIZAR NOMBRE DE LA CARRERA PARA DOCUMENTOS OFICIALES
 * ==========================================================
 * Garantiza que la carrera se muestre como:
 * Ingeniería en Software
 * aunque en la base de datos venga como, por ejemplo:
 * "Ingenieria en software" o "ingeniería en software".
 */
function normalizarCarreraCarta(valor) {

    const original =
        String(valor || "").trim();

    if (!original) {
        return "";
    }

    const comparable = original
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    if (comparable === "ingenieria en software") {
        return "Ingeniería en Software";
    }

    return original
        .replace(/\bingenieria\b/gi, "Ingeniería")
        .replace(/\bingeniería\b/gi, "Ingeniería")
        .replace(/\bsoftware\b/gi, "Software");
}




// ==========================================================
// FORMATOS AUTOMÁTICOS: ASISTENCIA Y ACTIVIDADES DEL PROYECTO
// ==========================================================

function obtenerConstructorJsPDFDocumentos() {
    const constructor = window.jspdf?.jsPDF;

    if (!constructor) {
        throw new Error(
            "No se cargó el generador de PDF. Recarga la página e inténtalo nuevamente."
        );
    }

    return constructor;
}


function establecerEstadoFormatosAutomaticos(mensaje, tipo = "") {
    if (!estadoFormatosAutomaticos) return;

    estadoFormatosAutomaticos.textContent = mensaje || "";
    estadoFormatosAutomaticos.className = `automatic-format-status ${tipo}`.trim();
}


async function ejecutarGeneracionFormatoAutomatico(boton, funcion, mensaje) {
    if (!boton) return;

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = mensaje;
    establecerEstadoFormatosAutomaticos(mensaje, "loading");

    try {
        await funcion();
        establecerEstadoFormatosAutomaticos(
            "PDF generado correctamente con la información actual del sistema.",
            "success"
        );
    } catch (error) {
        console.error(error);
        establecerEstadoFormatosAutomaticos(
            error?.message || "No fue posible generar el formato.",
            "error"
        );
        alert(error?.message || "No fue posible generar el formato.");
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}


function fechaISOValidaDocumentos(valor) {
    const texto = String(valor || "").trim();
    const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;

    const fecha = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        12, 0, 0, 0
    );

    return Number.isNaN(fecha.getTime()) ? null : fecha;
}


function aISOFechaLocalDocumentos(fecha) {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return "";

    return [
        fecha.getFullYear(),
        String(fecha.getMonth() + 1).padStart(2, "0"),
        String(fecha.getDate()).padStart(2, "0")
    ].join("-");
}


function nombreMesDocumentos(mes) {
    return [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ][Number(mes) - 1] || "";
}


function obtenerDatosAcademicosSesionDocumentos() {
    const idUsuario = obtenerIdUsuarioDocumentos();
    const miembro = miembroSesionPMO || miembrosPMO.find(function (item) {
        return idUsuario && String(item.idUsuario || "") === String(idUsuario);
    }) || {};

    return {
        miembro,
        datos: {
            ...(obtenerDatosAcademicosDocumentos(idUsuario) || {}),
            ...(obtenerDatosAcademicosMiembroDocumentos(miembro) || {})
        }
    };
}


function obtenerMesesDisponiblesFormatosDocumentos(datos) {
    const hoy = new Date();
    let inicio = fechaISOValidaDocumentos(datos?.fechaInicio);
    let fin = fechaISOValidaDocumentos(datos?.fechaFin);

    if (!inicio) {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 12);
    }

    if (!fin) {
        fin = new Date(inicio.getFullYear(), inicio.getMonth(), 1, 12);
    }

    if (fin < inicio) {
        fin = new Date(inicio);
    }

    const meses = [];
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1, 12);
    const limite = new Date(fin.getFullYear(), fin.getMonth(), 1, 12);

    while (cursor <= limite && meses.length < 24) {
        meses.push({
            valor: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
            etiqueta: `${nombreMesDocumentos(cursor.getMonth() + 1).replace(/^./, c => c.toUpperCase())} ${cursor.getFullYear()}`
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return meses;
}


function actualizarSelectorMesFormatosAutomaticosDocumentos() {
    if (!selectorMesFormatoAutomatico) return;

    const { datos } = obtenerDatosAcademicosSesionDocumentos();
    const meses = obtenerMesesDisponiblesFormatosDocumentos(datos);
    const actual = selectorMesFormatoAutomatico.value;

    selectorMesFormatoAutomatico.innerHTML = meses
        .map(item => `<option value="${escaparHTML(item.valor)}">${escaparHTML(item.etiqueta)}</option>`)
        .join("");

    if (actual && meses.some(item => item.valor === actual)) {
        selectorMesFormatoAutomatico.value = actual;
        return;
    }

    const hoy = new Date();
    const mesHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
    const opcionHoy = meses.find(item => item.valor === mesHoy);

    selectorMesFormatoAutomatico.value = opcionHoy
        ? opcionHoy.valor
        : (meses[0]?.valor || mesHoy);
}


function obtenerMesFormatoAutomaticoDocumentos() {
    const valor = selectorMesFormatoAutomatico?.value || "";
    const m = valor.match(/^(\d{4})-(\d{2})$/);

    if (m) {
        return {
            anio: Number(m[1]),
            mes: Number(m[2]),
            valor
        };
    }

    const hoy = new Date();
    return {
        anio: hoy.getFullYear(),
        mes: hoy.getMonth() + 1,
        valor: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
    };
}


async function obtenerJSONSeguroFormatosDocumentos(url) {
    const respuesta = await fetch(url, {
        method: "GET",
        headers: obtenerHeadersDocumentos()
    });

    const cuerpo = await obtenerJSONDocumentos(respuesta);

    if (!respuesta.ok) {
        throw new Error(
            cuerpo?.mensaje ||
            "No fue posible obtener la información necesaria para generar el formato."
        );
    }

    return cuerpo || {};
}


async function cargarContextoFormatosAutomaticosDocumentos() {
    const { miembro, datos } = obtenerDatosAcademicosSesionDocumentos();
    const idMiembro = miembro?.id ?? miembro?.idMiembro ?? miembro?.id_miembro;

    const [cuerpoProyectos, cuerpoTareas, cuerpoHoras] = await Promise.all([
        obtenerJSONSeguroFormatosDocumentos(API_PROYECTOS_FORMATOS_DOCUMENTOS),
        obtenerJSONSeguroFormatosDocumentos(API_TAREAS_FORMATOS_DOCUMENTOS),
        obtenerJSONSeguroFormatosDocumentos(API_HORAS_FORMATOS_DOCUMENTOS)
    ]);

    const proyectos = Array.isArray(cuerpoProyectos?.proyectos)
        ? cuerpoProyectos.proyectos
        : [];

    const tareas = Array.isArray(cuerpoTareas?.tareas)
        ? cuerpoTareas.tareas
        : [];

    let registros = Array.isArray(cuerpoHoras?.registros)
        ? cuerpoHoras.registros
        : [];

    if (idMiembro) {
        registros = registros.filter(registro =>
            String(registro.idMiembro ?? registro.id_miembro ?? "") === String(idMiembro)
        );
    }

    const nombreAlumnoContexto =
        datos?.nombreCompleto ||
        obtenerNombreMiembroDocumentos(miembro) ||
        obtenerNombreUsuarioDocumentos();

    const proyectoOficial =
        obtenerProyectoOficialSepDic2026Documentos(nombreAlumnoContexto);

    const proyectoAcademico = normalizarTextoDocumentos(
        datos?.proyecto || datos?.proyectoTic || datos?.proyecto_tic || ""
    );

    let proyecto = proyectoOficial
        ? proyectos.find(item => String(item?.codigo || "").toUpperCase() === proyectoOficial.codigo)
        : null;

    if (!proyecto) {
        proyecto = proyectos.find(item => {
        const nombre = normalizarTextoDocumentos(item?.nombre || "");
        const codigo = normalizarTextoDocumentos(item?.codigo || "");
        return proyectoAcademico && (
            nombre.includes(proyectoAcademico) ||
            proyectoAcademico.includes(nombre) ||
            codigo === proyectoAcademico
        );
        });
    }

    if (!proyecto) {
        proyecto = proyectos.find(item =>
            !["cerrado", "finalizado", "cancelado"].includes(
                normalizarTextoDocumentos(item?.estado)
            )
        ) || proyectos[0] || null;
    }

    return {
        miembro,
        datos,
        proyectos,
        proyecto,
        proyectoOficial,
        tareas,
        registros
    };
}


function nombreArchivoSeguroDocumentos(valor) {
    return String(valor || "documento")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "documento";
}


function obtenerDiasHabilesFormatoAsistencia(anio, mes, datos) {
    const inicioMes = new Date(anio, mes - 1, 1, 12);
    const finMes = new Date(anio, mes, 0, 12);
    const inicioEstadia = fechaISOValidaDocumentos(datos?.fechaInicio);
    const finEstadia = fechaISOValidaDocumentos(datos?.fechaFin);

    const inicio = inicioEstadia && inicioEstadia > inicioMes
        ? inicioEstadia
        : inicioMes;

    const fin = finEstadia && finEstadia < finMes
        ? finEstadia
        : finMes;

    const dias = [];
    const cursor = new Date(inicio);

    while (cursor <= fin) {
        const diaSemana = cursor.getDay();
        if (diaSemana >= 1 && diaSemana <= 5) {
            dias.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return dias;
}


function horaCortaDocumentos(valor) {
    const texto = String(valor || "").trim();
    const m = texto.match(/(\d{2}:\d{2})/);
    return m ? m[1] : texto;
}


function dibujarLogoFormatoDocumentos(doc, x = 12, y = 8, ancho = 30) {
    try {
        doc.addImage(LOGO_JJM_DATA_URL, "JPEG", x, y, ancho, 18);
    } catch (error) {
        console.warn("No fue posible insertar el logotipo en el formato.", error);
    }
}


function dibujarEncabezadoAsistenciaDocumentos(doc, datos, nombre, anio, mes) {
    dibujarLogoFormatoDocumentos(doc, 12, 8, 31);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ÁREA: OFICINA DE PROYECTOS", 268, 14, { align: "right" });
    doc.text("PROPÓSITO: SEGUIMIENTO DE ASISTENCIAS DEL COLABORADOR", 268, 20, { align: "right" });
    doc.setDrawColor(45, 93, 145);
    doc.setLineWidth(0.45);
    doc.line(12, 23, 268, 23);

    doc.setFontSize(12);
    doc.text(
        "LISTA DE ASISTENCIA PERSONAL DE JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.",
        140,
        31,
        { align: "center" }
    );

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("NOMBRE:", 12, 40);
    doc.setFont("helvetica", "normal");
    doc.text(nombre || "Sin registrar", 30, 40);

    doc.setFont("helvetica", "bold");
    doc.text("INSTITUCIÓN:", 111, 40);
    doc.setFont("helvetica", "normal");
    doc.text(datos?.universidad || "Sin registrar", 135, 40);

    doc.setFont("helvetica", "bold");
    doc.text("MES:", 220, 40);
    doc.setFont("helvetica", "normal");
    doc.text(nombreMesDocumentos(mes), 230, 40);

    doc.setFont("helvetica", "bold");
    doc.text("AÑO:", 252, 40);
    doc.setFont("helvetica", "normal");
    doc.text(String(anio), 262, 40);
}


async function generarListaAsistenciaAutomaticaPDF() {
    const {miembro,datos,registros}=await cargarContextoFormatosAutomaticosDocumentos();
    const {valor}=obtenerMesFormatoAutomaticoDocumentos();
    const nombre=datos?.nombreCompleto || obtenerNombreMiembroDocumentos(miembro) || obtenerNombreUsuarioDocumentos();
    if(!nombre || nombre==='Alumno sin nombre')throw new Error('Actualiza tus datos académicos antes de generar el formato.');
    await window.EstadiaFormatos.descargarAsistencia({mes:valor,datos:datos||{},registros,nombre});
}


function tareaCorrespondeMesDocumentos(tarea, anio, mes) {
    const inicioMes = new Date(anio, mes - 1, 1, 12);
    const finMes = new Date(anio, mes, 0, 23, 59, 59);
    const inicio = fechaISOValidaDocumentos(tarea?.fechaInicio);
    const fin = fechaISOValidaDocumentos(tarea?.fechaLimite);

    if (!inicio && !fin) return true;
    if (inicio && !fin) return inicio <= finMes;
    if (!inicio && fin) return fin >= inicioMes;
    return inicio <= finMes && fin >= inicioMes;
}


function numeroDocumentos(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
}


function dibujarEncabezadoReporteActividadesDocumentos(doc, datos, numeroPagina, totalPaginasTexto = "") {
    dibujarLogoFormatoDocumentos(doc, 12, 7, 27);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(datos?.universidad || "UNIVERSIDAD POLITÉCNICA DE TECÁMAC", 140, 12, { align: "center" });
    doc.setFontSize(9.2);
    doc.text("Dirección de la División de Ingeniería Mecánica,", 140, 17, { align: "center" });
    doc.text("Ingeniería en Tecnologías de Manufactura e Ingeniería en Software", 140, 22, { align: "center" });
    doc.text("Coordinación de Estancias y Estadías Profesionales", 140, 27, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`HOJA ${numeroPagina}${totalPaginasTexto ? ` DE ${totalPaginasTexto}` : ""}`, 263, 10, { align: "right" });
    doc.text("VERSIÓN 1.0", 263, 16, { align: "right" });
    doc.text("FORMATO AUTOMÁTICO PMO", 263, 28, { align: "right" });
}


async function generarReporteActividadesProyectoPDF() {
    const JsPDF = obtenerConstructorJsPDFDocumentos();
    const contexto = await cargarContextoFormatosAutomaticosDocumentos();
    const { anio, mes, valor } = obtenerMesFormatoAutomaticoDocumentos();
    const { miembro, datos, proyecto, proyectoOficial, tareas, registros } = contexto;

    const nombre =
        datos?.nombreCompleto ||
        obtenerNombreMiembroDocumentos(miembro) ||
        obtenerNombreUsuarioDocumentos();

    if (!nombre || nombre === "Alumno sin nombre") {
        throw new Error("No se encontró el nombre del colaborador. Actualiza sus datos académicos antes de generar el formato.");
    }

    if (!proyecto && !(datos?.proyecto || datos?.proyectoTic)) {
        throw new Error("No hay un proyecto asignado al colaborador. Asígnalo a un proyecto antes de generar el reporte de tareas.");
    }

    const idProyecto = proyecto?.id ?? proyecto?.idProyecto ?? null;
    let tareasProyecto = tareas.filter(tarea =>
        !idProyecto || String(tarea?.idProyecto ?? "") === String(idProyecto)
    );

    tareasProyecto = tareasProyecto.filter(tarea =>
        tareaCorrespondeMesDocumentos(tarea, anio, mes)
    );

    const registrosMes = registros.filter(registro =>
        String(registro?.fecha || "").startsWith(valor) &&
        (!idProyecto || String(registro?.idProyecto ?? "") === String(idProyecto))
    );

    const horasPorTarea = new Map();
    registrosMes.forEach(registro => {
        const idTarea = registro?.idTarea;
        if (!idTarea) return;
        const clave = String(idTarea);
        horasPorTarea.set(
            clave,
            (horasPorTarea.get(clave) || 0) + numeroDocumentos(registro?.horasTrabajadas)
        );
    });

    const horasRealizadas = registrosMes.reduce(
        (total, registro) => total + numeroDocumentos(registro?.horasTrabajadas),
        0
    );

    const doc = new JsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "letter"
    });

    dibujarEncabezadoReporteActividadesDocumentos(doc, datos, 1);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Reporte Mensual de Proyectos y/o Actividades Asignadas", 140, 37, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("1.- DATOS GENERALES", 12, 49);
    doc.text("JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.", 12, 57);

    const inicioMes = new Date(anio, mes - 1, 1, 12);
    const finMes = new Date(anio, mes, 0, 12);
    const inicioEstadia = fechaISOValidaDocumentos(datos?.fechaInicio);
    const finEstadia = fechaISOValidaDocumentos(datos?.fechaFin);
    const fechaInicio = inicioEstadia && inicioEstadia > inicioMes ? inicioEstadia : inicioMes;
    const fechaFin = finEstadia && finEstadia < finMes ? finEstadia : finMes;

    doc.autoTable({
        startY: 60,
        head: [["Área", "Asesoría Empresarial"]],
        body: [[datos?.area || "Oficina de Proyectos", datos?.asesorEmpresarial || "Asesor Empresarial"]],
        theme: "grid",
        margin: { left: 12, right: 12 },
        styles: { fontSize: 7.2, cellPadding: 1.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15 },
        headStyles: { fillColor: [218, 218, 218], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" }
    });

    let y = doc.lastAutoTable.finalY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("PROVEEDOR Y/O INSTITUCIÓN:", 12, y);

    doc.autoTable({
        startY: y + 2,
        head: [["Razón Social", "Número de convenio", "Fecha Inicio", "Fecha Fin"]],
        body: [[
            datos?.universidad || "UNIVERSIDAD POLITÉCNICA DE TECÁMAC",
            "En trámite",
            `${String(fechaInicio.getDate()).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`,
            `${String(fechaFin.getDate()).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`
        ]],
        theme: "grid",
        margin: { left: 12, right: 12 },
        styles: { fontSize: 7.2, cellPadding: 1.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15, halign: "center" },
        headStyles: { fillColor: [218, 218, 218], textColor: [0, 0, 0], fontStyle: "bold" }
    });

    y = doc.lastAutoTable.finalY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("PROYECTO:", 12, y);

    const nombreProyecto =
        proyectoOficial?.nombre ||
        proyecto?.nombre ||
        datos?.proyecto ||
        datos?.proyectoTic ||
        "Proyecto asignado por la Oficina de Proyectos";

    const codigoProyecto = proyectoOficial?.codigo || proyecto?.codigo || "PMO";

    doc.autoTable({
        startY: y + 2,
        head: [["Nombre", "Código", "Asignado(a)", "Matrícula y/o Clave"]],
        body: [[nombreProyecto, codigoProyecto, nombre, datos?.matricula || "Sin registrar"]],
        theme: "grid",
        margin: { left: 12, right: 12 },
        styles: { fontSize: 7, cellPadding: 1.6, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15, valign: "middle" },
        headStyles: { fillColor: [218, 218, 218], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
        columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 35, halign: "center" }, 2: { cellWidth: 55, halign: "center" }, 3: { cellWidth: 35, halign: "center" } }
    });

    y = doc.lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("2. ACTIVIDADES", 12, y);
    doc.text("2.1 NIVEL DE ESPECIALIDAD Y/O CLAVE DEL PERFIL: ESTUDIANTE", 12, y + 6);

    const cuerpoTareas = tareasProyecto.length
        ? tareasProyecto.map(tarea => {
            const horasRegistradas = horasPorTarea.get(String(tarea?.id || ""));
            const horas = horasRegistradas != null
                ? horasRegistradas
                : numeroDocumentos(tarea?.horasRegistradas);

            return [
                codigoProyecto,
                tarea?.faseNombre || "Actividad del proyecto",
                [tarea?.titulo, tarea?.descripcion].filter(Boolean).join("\n") || "Tarea sin descripción",
                tarea?.estado || "Pendiente",
                String(numeroDocumentos(tarea?.horasEstimadas) || ""),
                horas ? horas.toFixed(2) : ""
            ];
        })
        : [[codigoProyecto, "Sin tareas registradas", "No hay tareas registradas para el mes seleccionado.", "—", "", ""]];

    doc.autoTable({
        startY: y + 9,
        head: [["Clave", "Fase / Tarea", "Descripción de la Actividad", "Estado", "Horas\nEstimadas", "Horas\nTrabajadas"]],
        body: cuerpoTareas,
        theme: "grid",
        margin: { left: 12, right: 12, top: 36, bottom: 22 },
        styles: { fontSize: 6.8, cellPadding: 1.6, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15, valign: "middle" },
        headStyles: { fillColor: [218, 218, 218], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
        columnStyles: {
            0: { cellWidth: 27, halign: "center" },
            1: { cellWidth: 42, halign: "center" },
            2: { cellWidth: 125 },
            3: { cellWidth: 28, halign: "center" },
            4: { cellWidth: 22, halign: "center" },
            5: { cellWidth: 22, halign: "center" }
        },
        didDrawPage: function (data) {
            if (data.pageNumber > 1) {
                dibujarEncabezadoReporteActividadesDocumentos(doc, datos, data.pageNumber);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.text(
                    `Reporte Mensual de Actividades - ${nombreMesDocumentos(mes)} ${anio}`,
                    140,
                    34,
                    { align: "center" }
                );
            }
        }
    });

    y = doc.lastAutoTable.finalY + 6;
    if (y > 178) {
        doc.addPage("letter", "landscape");
        dibujarEncabezadoReporteActividadesDocumentos(doc, datos, doc.getNumberOfPages());
        y = 42;
    }

    const horasComprometidas = numeroDocumentos(datos?.horas || 600);
    const diferencia = Math.max(0, horasComprometidas - horasRealizadas);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`Horas realizadas en ${nombreMesDocumentos(mes)}: ${horasRealizadas.toFixed(2)}`, 268, y, { align: "right" });
    doc.text(`Horas comprometidas de estadía: ${horasComprometidas.toFixed(0)}`, 268, y + 5, { align: "right" });
    doc.text(`Diferencia: ${diferencia.toFixed(2)}`, 268, y + 10, { align: "right" });

    const firmaY = Math.max(y + 16, 174);
    const asesorEmpresarial = datos?.asesorEmpresarial || "Asesor Empresarial";

    const firmas = [
        { x1: 12, x2: 95, titulo: "(UPT)\nElaboró y Entregó", nombre, rol: "Estudiante", org: datos?.universidad || "UNIVERSIDAD POLITÉCNICA DE TECÁMAC" },
        { x1: 98, x2: 181, titulo: "(JJM)\nRevisó y Entregó", nombre: asesorEmpresarial, rol: "Asesor Empresarial", org: "JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V." },
        { x1: 184, x2: 268, titulo: "(JJM)\nRecibió, Revisó y Aprobó", nombre: "Julio Lara García", rol: "CEO y Fundador", org: "JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V." }
    ];

    firmas.forEach(firma => {
        const centro = (firma.x1 + firma.x2) / 2;
        doc.rect(firma.x1, firmaY, firma.x2 - firma.x1, 30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.7);
        const lineasTitulo = firma.titulo.split("\n");
        doc.text(lineasTitulo, centro, firmaY + 4, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.text(String(firma.nombre || ""), centro, firmaY + 19, { align: "center", maxWidth: (firma.x2 - firma.x1) - 5 });
        doc.text(firma.rol, centro, firmaY + 23, { align: "center" });
        doc.text(String(firma.org || ""), centro, firmaY + 27, { align: "center", maxWidth: (firma.x2 - firma.x1) - 5 });
    });

    const paginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= paginas; pagina++) {
        doc.setPage(pagina);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.text(
            `JJM Tecnologías Innovadoras, S.A. de C.V. · Oficina de Proyectos · Página ${pagina} de ${paginas}`,
            140,
            211,
            { align: "center" }
        );
    }

    const archivo = `Reporte_Actividades_${nombreArchivoSeguroDocumentos(nombre)}_${valor}.pdf`;
    doc.save(archivo);
}


/*
 * ==========================================================
 * PDF ROBUSTO PARA CARTA DE ACEPTACIÓN
 * ==========================================================
 * Esta ruta NO convierte el HTML ni depende de que un nodo
 * quede visible en pantalla. La carta se dibuja directamente
 * en un canvas con el mismo tamaño y distribución de la
 * plantilla original y después se empaqueta como un PDF real.
 *
 * Esto evita el problema de la hoja blanca que puede ocurrir
 * con html2canvas/html2pdf cuando el elemento está fuera del
 * viewport o dentro de un iframe oculto.
 */
function cargarImagenParaCarta(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(
            new Error("No fue posible cargar el logotipo de la carta.")
        );
        img.src = src;
    });
}


function obtenerFechaAceptacionPDF(datos) {
    const texto = String(datos?.fechaInicio || "").trim();
    const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    if (m) {
        const anio = Number(m[1]);
        const mes = Number(m[2]);
        const dia = Number(m[3]);
        if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
            return `${String(dia).padStart(2, "0")} de ${meses[mes - 1]} de ${anio}`;
        }
    }

    return "01 de Septiembre de 2026";
}


function obtenerPeriodoAceptacionPDF(datos) {
    const texto = String(datos?.fechaInicio || "").trim();
    const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (m) {
        const anio = Number(m[1]);
        const mes = Number(m[2]);

        if (mes >= 1 && mes <= 4) {
            return `Enero - Abril ${anio}`;
        }
        if (mes >= 5 && mes <= 8) {
            return `Mayo - Agosto ${anio}`;
        }
        if (mes >= 9 && mes <= 12) {
            return `Septiembre - Diciembre ${anio}`;
        }
    }

    return normalizarPeriodoCarta(
        datos?.periodoEstadia ||
        datos?.periodo ||
        "Septiembre - Diciembre 2026"
    );
}


function convertirBlobADataURL(blob) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result || ""));
        lector.onerror = () => reject(
            new Error("No fue posible codificar el PDF generado.")
        );
        lector.readAsDataURL(blob);
    });
}


function dataURLABytes(dataURL) {
    const base64 = String(dataURL || "").split(",")[1] || "";
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);

    for (let i = 0; i < binario.length; i++) {
        bytes[i] = binario.charCodeAt(i);
    }

    return bytes;
}


function crearPDFUnaPaginaDesdeJPEG(jpegBytes, anchoImagen, altoImagen) {
    const codificador = new TextEncoder();
    const partes = [];
    let offset = 0;
    const offsets = [0];

    const agregarTexto = valor => {
        const bytes = codificador.encode(valor);
        partes.push(bytes);
        offset += bytes.length;
    };

    const agregarBytes = bytes => {
        partes.push(bytes);
        offset += bytes.length;
    };

    const iniciarObjeto = numero => {
        offsets[numero] = offset;
        agregarTexto(`${numero} 0 obj\n`);
    };

    agregarTexto("%PDF-1.4\n%1234\n");

    iniciarObjeto(1);
    agregarTexto("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    iniciarObjeto(2);
    agregarTexto("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

    iniciarObjeto(3);
    agregarTexto(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
        "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
    );

    iniciarObjeto(4);
    agregarTexto(
        `<< /Type /XObject /Subtype /Image /Width ${anchoImagen} ` +
        `/Height ${altoImagen} /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
        `/Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
    );
    agregarBytes(jpegBytes);
    agregarTexto("\nendstream\nendobj\n");

    const contenido = "q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ\n";
    const contenidoBytes = codificador.encode(contenido);

    iniciarObjeto(5);
    agregarTexto(`<< /Length ${contenidoBytes.length} >>\nstream\n`);
    agregarBytes(contenidoBytes);
    agregarTexto("endstream\nendobj\n");

    const inicioXref = offset;
    agregarTexto("xref\n0 6\n");
    agregarTexto("0000000000 65535 f \n");

    for (let i = 1; i <= 5; i++) {
        agregarTexto(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
    }

    agregarTexto(
        "trailer\n<< /Size 6 /Root 1 0 R >>\n" +
        `startxref\n${inicioXref}\n%%EOF`
    );

    return new Blob(partes, { type: "application/pdf" });
}


function configurarFuenteCanvas(ctx, puntos, negrita = false) {
    const px = puntos * (96 / 72);
    ctx.font = `${negrita ? 700 : 400} ${px}px Arial, Helvetica, sans-serif`;
}


function prepararPalabrasEstilizadas(segmentos) {
    const palabras = [];

    segmentos.forEach(segmento => {
        const piezas = String(segmento.texto || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        piezas.forEach(palabra => {
            palabras.push({
                texto: palabra,
                negrita: Boolean(segmento.negrita)
            });
        });
    });

    return palabras;
}


function medirPalabraCanvas(ctx, palabra, puntos) {
    configurarFuenteCanvas(ctx, puntos, palabra.negrita);
    return ctx.measureText(palabra.texto).width;
}


function dibujarParrafoEstilizadoCanvas(
    ctx,
    segmentos,
    x,
    y,
    ancho,
    opciones = {}
) {
    const puntos = opciones.puntos || 10.5;
    const altoLinea = opciones.altoLinea || (puntos * (96 / 72) * 1.5);
    const sangriaPrimera = opciones.sangriaPrimera || 0;
    const justificar = opciones.justificar !== false;
    const palabras = prepararPalabrasEstilizadas(segmentos);
    const lineas = [];
    let linea = [];
    let anchoPalabras = 0;

    const anchoEspacio = (() => {
        configurarFuenteCanvas(ctx, puntos, false);
        return ctx.measureText(" ").width;
    })();

    palabras.forEach(palabra => {
        const indiceLinea = lineas.length;
        const sangria = indiceLinea === 0 ? sangriaPrimera : 0;
        const disponible = ancho - sangria;
        const anchoPalabra = medirPalabraCanvas(ctx, palabra, puntos);
        const candidato = linea.length
            ? anchoPalabras + (anchoEspacio * linea.length) + anchoPalabra
            : anchoPalabra;

        if (linea.length && candidato > disponible) {
            lineas.push(linea);
            linea = [palabra];
            anchoPalabras = anchoPalabra;
        } else {
            linea.push(palabra);
            anchoPalabras += anchoPalabra;
        }
    });

    if (linea.length) {
        lineas.push(linea);
    }

    lineas.forEach((palabrasLinea, indice) => {
        const esPrimera = indice === 0;
        const esUltima = indice === lineas.length - 1;
        const sangria = esPrimera ? sangriaPrimera : 0;
        const disponible = ancho - sangria;
        let totalPalabras = 0;

        palabrasLinea.forEach(p => {
            totalPalabras += medirPalabraCanvas(ctx, p, puntos);
        });

        let espacio = anchoEspacio;

        if (
            justificar &&
            !esUltima &&
            palabrasLinea.length > 1
        ) {
            espacio = (disponible - totalPalabras) / (palabrasLinea.length - 1);
            if (!Number.isFinite(espacio) || espacio < anchoEspacio * 0.7 || espacio > 18) {
                espacio = anchoEspacio;
            }
        }

        let cursorX = x + sangria;

        palabrasLinea.forEach((palabra, indicePalabra) => {
            configurarFuenteCanvas(ctx, puntos, palabra.negrita);
            ctx.fillText(palabra.texto, cursorX, y + (indice * altoLinea));
            cursorX += ctx.measureText(palabra.texto).width;

            if (indicePalabra < palabrasLinea.length - 1) {
                cursorX += espacio;
            }
        });
    });

    return y + (Math.max(1, lineas.length) * altoLinea);
}


function dibujarTextoCentradoCanvas(ctx, texto, centroX, y, puntos, negrita = false) {
    configurarFuenteCanvas(ctx, puntos, negrita);
    ctx.textAlign = "center";
    ctx.fillText(texto, centroX, y);
    ctx.textAlign = "left";
}


function dibujarTextoDerechaCanvas(ctx, texto, derechaX, y, puntos, negrita = false) {
    configurarFuenteCanvas(ctx, puntos, negrita);
    ctx.textAlign = "right";
    ctx.fillText(texto, derechaX, y);
    ctx.textAlign = "left";
}


async function generarCartaAceptacionPDFBase64(datos, miembro, nombreArchivo) {
    const MM = 96 / 25.4;
    const ANCHO = 215.9 * MM;
    const ALTO = 279.4 * MM;
    const ESCALA = 2.5;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(ANCHO * ESCALA);
    canvas.height = Math.round(ALTO * ESCALA);

    const ctx = canvas.getContext("2d", { alpha: false });

    if (!ctx) {
        throw new Error("No fue posible preparar el lienzo de la carta.");
    }

    ctx.scale(ESCALA, ESCALA);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "alphabetic";

    const margenIzquierdo = 15 * MM;
    const margenDerecho = 15 * MM;
    const anchoContenido = ANCHO - margenIzquierdo - margenDerecho;
    const derecha = ANCHO - margenDerecho;
    const centro = ANCHO / 2;

    const nombre = String(
        datos?.nombreCompleto ||
        obtenerNombreMiembroDocumentos(miembro) ||
        ""
    ).trim();

    const matricula = String(datos?.matricula || "").trim();
    const carrera = normalizarCarreraCarta(datos?.carrera || "");
    const cuatrimestre = normalizarCuatrimestreCarta(datos?.cuatrimestre || "");
    const horas = String(datos?.horas || 600).trim();
    const periodo = obtenerPeriodoAceptacionPDF(datos);
    const fechaAceptacion = obtenerFechaAceptacionPDF(datos);

    /* Encabezado: mismas medidas de la plantilla HTML original. */
    const logo = await cargarImagenParaCarta(LOGO_JJM_DATA_URL);
    const anchoLogo = 56 * MM;
    const altoLogo = anchoLogo * (logo.naturalHeight / logo.naturalWidth);
    const ySuperior = 13 * MM;

    ctx.drawImage(
        logo,
        margenIzquierdo,
        ySuperior,
        anchoLogo,
        altoLogo
    );

    dibujarTextoDerechaCanvas(
        ctx,
        `Estado de México, a ${fechaAceptacion}`,
        derecha,
        ySuperior + (17 * MM),
        10.5,
        true
    );

    dibujarTextoDerechaCanvas(
        ctx,
        "CARTA DE ACEPTACIÓN",
        derecha,
        ySuperior + (31 * MM),
        12,
        true
    );

    /* Destinatario. */
    configurarFuenteCanvas(ctx, 9.8, true);
    const altoDestinatario = 9.8 * (96 / 72) * 1.2;
    let y = ySuperior + (52 * MM) + 12;

    [
        "DR. FELIPE NERHI TENORIO GONZÁLEZ",
        "DIRECTOR DE DIVISIÓN DE INGENIERÍA MECÁNICA",
        "AUTOMOTRIZ, INGENIERÍA EN TECNOLOGÍAS DE",
        "MANUFACTURA E INGENIERÍA EN SOFTWARE",
        "UNIVERSIDAD POLITÉCNICA DE TECÁMAC",
        "P  R  E  S  E  N  T  E"
    ].forEach(linea => {
        ctx.fillText(linea, margenIzquierdo, y);
        y += altoDestinatario;
    });

    /* Asunto a la derecha. */
    y += 16 * MM;
    dibujarTextoDerechaCanvas(
        ctx,
        "ASUNTO: CARTA DE ACEPTACIÓN DE ESTADÍA",
        derecha,
        y,
        10.5,
        true
    );

    /* Cuerpo justificado con los mismos énfasis en negrita. */
    y += 12 * MM + 14;
    ctx.fillStyle = "#000000";

    y = dibujarParrafoEstilizadoCanvas(
        ctx,
        [
            { texto: "Por medio de la presente, le informo que el (la) alumno(a)", negrita: false },
            { texto: `${nombre},`, negrita: true },
            { texto: "con matrícula", negrita: false },
            { texto: matricula, negrita: true },
            { texto: "adscrito(a) al", negrita: false },
            { texto: `${cuatrimestre} cuatrimestre`, negrita: true },
            { texto: "de la carrera en", negrita: false },
            { texto: `${carrera},`, negrita: true },
            { texto: "ha sido aceptado(a) para la realización de su Estadía, en la cual deberá cubrir un total de", negrita: false },
            { texto: `${horas} hrs.`, negrita: true },
            { texto: "en el periodo comprendido de", negrita: false },
            { texto: `${periodo},`, negrita: true }
        ],
        margenIzquierdo,
        y,
        anchoContenido,
        {
            puntos: 10.5,
            altoLinea: 10.5 * (96 / 72) * 1.5,
            sangriaPrimera: 12 * MM,
            justificar: true
        }
    );

    y += 8 * MM;

    y = dibujarParrafoEstilizadoCanvas(
        ctx,
        [
            {
                texto: "Sin otro particular por el momento, le envío un cordial saludo y quedo como su seguro servidor.",
                negrita: false
            }
        ],
        margenIzquierdo,
        y,
        anchoContenido,
        {
            puntos: 10.5,
            altoLinea: 10.5 * (96 / 72) * 1.5,
            sangriaPrimera: 0,
            justificar: false
        }
    );

    /* Firma. */
    y += 7 * MM;
    dibujarTextoCentradoCanvas(
        ctx,
        "A   T   E   N   T   A   M   E   N   T   E",
        centro,
        y,
        10.5,
        true
    );

    y += 18 * MM + 18;
    dibujarTextoCentradoCanvas(ctx, "ING. JULIO LARA GARCÍA.", centro, y, 10.5, true);
    y += 17;
    dibujarTextoCentradoCanvas(ctx, "CEO Y FUNDADOR", centro, y, 10.5, true);
    y += 17;
    dibujarTextoCentradoCanvas(ctx, "JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.", centro, y, 10.5, true);

    /* Pie de página original. */
    ctx.fillStyle = "#315d9d";
    const footerPuntos = 7.5;
    const footerLinea = footerPuntos * (96 / 72) * 1.25;
    const footerY = ALTO - (7 * MM) - (footerLinea * 2);

    dibujarTextoCentradoCanvas(
        ctx,
        "JJM Tecnologías Innovadoras, S.A. de C.V.   RFC: JTI251031952",
        centro,
        footerY,
        footerPuntos,
        true
    );

    dibujarTextoCentradoCanvas(
        ctx,
        "Dirección: Privada de Gerona No. 18, Fraccionamiento Villas del Real Primera Sección, Tecámac, Estado de México, México, C.P.: 04450. Teléfono:",
        centro,
        footerY + footerLinea,
        footerPuntos,
        true
    );

    dibujarTextoCentradoCanvas(
        ctx,
        "+52 5544753194 E-mail: jjmti231171@hotmail.com",
        centro,
        footerY + (footerLinea * 2),
        footerPuntos,
        true
    );

    const jpeg = canvas.toDataURL("image/jpeg", 0.97);
    const jpegBytes = dataURLABytes(jpeg);
    const blobPDF = crearPDFUnaPaginaDesdeJPEG(
        jpegBytes,
        canvas.width,
        canvas.height
    );

    const dataURL = await convertirBlobADataURL(blobPDF);

    if (!dataURL.startsWith("data:application/pdf")) {
        throw new Error("No fue posible generar la carta de aceptación en PDF.");
    }

    return dataURL;
}


/*
 * ==========================================================
 * CONVERTIR LA CARTA HTML A PDF REAL
 * ==========================================================
 * El PDF se genera ANTES de enviarlo al backend.
 * Por lo tanto, en la base de datos se guarda como
 * application/pdf y el archivo termina en .pdf.
 */
async function convertirCartaHTMLaPDFBase64(html, nombreArchivo) {

    if (typeof html2pdf !== "function") {
        throw new Error(
            "No se cargó el generador de PDF. Recarga la página e inténtalo nuevamente."
        );
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.left = "0";
    iframe.style.top = "0";
    iframe.style.width = "816px";
    iframe.style.height = "1056px";
    iframe.style.border = "0";
    iframe.style.zIndex = "2147483000";
    iframe.style.background = "#ffffff";
    iframe.style.pointerEvents = "none";

    const mascara = document.createElement("div");
    mascara.setAttribute("aria-hidden", "true");
    mascara.style.position = "fixed";
    mascara.style.inset = "0";
    mascara.style.background = "rgba(255,255,255,.98)";
    mascara.style.zIndex = "2147483647";
    mascara.style.pointerEvents = "none";

    document.body.appendChild(iframe);
    document.body.appendChild(mascara);

    try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        await new Promise(resolve => {
            const terminar = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
            if (doc.readyState === "complete") {
                terminar();
            } else {
                iframe.addEventListener("load", terminar, { once: true });
                setTimeout(terminar, 250);
            }
        });

        const imagenes = Array.from(doc.images || []);
        await Promise.all(
            imagenes.map(img => img.complete
                ? Promise.resolve()
                : new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                })
            )
        );

        const pagina = doc.querySelector(".page") || doc.body;
        if (!pagina) {
            throw new Error("No se encontró el contenido de la carta para generar el PDF.");
        }

        const opciones = {
            margin: 0,
            filename: nombreArchivo || "documento.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
                scale: 2.2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: "#ffffff",
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: {
                unit: "mm",
                format: "letter",
                orientation: "portrait",
                compress: true
            }
        };

        const dataUri = await html2pdf()
            .set(opciones)
            .from(pagina)
            .toPdf()
            .outputPdf("datauristring");

        if (!dataUri || !String(dataUri).startsWith("data:application/pdf")) {
            throw new Error("No fue posible convertir la carta a PDF.");
        }

        return dataUri;

    } finally {
        mascara.remove();
        iframe.remove();
    }
}


function generarDocumentoPersonalizadoHTML(tipo, datos, miembro) {

    const nombre =
        escaparTextoDocumento(datos.nombreCompleto);

    const matricula =
        escaparTextoDocumento(datos.matricula);

    const universidad =
        escaparTextoDocumento(datos.universidad);

    const carrera =
        escaparTextoDocumento(
            normalizarCarreraCarta(
                datos.carrera
            )
        );

    const cuatrimestreOriginal =
        escaparTextoDocumento(datos.cuatrimestre);

    const cuatrimestreCarta =
        escaparTextoDocumento(
            normalizarCuatrimestreCarta(
                datos.cuatrimestre
            )
        );

function obtenerPeriodoEstadia(
    fechaInicio,
    fechaFin
) {

    if (!fechaInicio) {
        return "";
    }

    const texto =
        String(fechaInicio).trim();

    let mes;
    let año;

    /*
     * ======================================================
     * TOMAR EL MES DIRECTAMENTE DE YYYY-MM-DD
     * ======================================================
     */

    const coincidencia =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (coincidencia) {

        año =
            Number(
                coincidencia[1]
            );

        mes =
            Number(
                coincidencia[2]
            );

    } else {

        const inicio =
            new Date(fechaInicio);

        if (
            Number.isNaN(
                inicio.getTime()
            )
        ) {
            return "";
        }

        mes =
            inicio.getMonth() + 1;

        año =
            inicio.getFullYear();
    }

    if (
        mes >= 1 &&
        mes <= 4
    ) {
        return `Enero - Abril ${año}`;
    }

    if (
        mes >= 5 &&
        mes <= 8
    ) {
        return `Mayo - Agosto ${año}`;
    }

    if (
        mes >= 9 &&
        mes <= 12
    ) {
        return `Septiembre - Diciembre ${año}`;
    }

    return "";
}


   const periodo = escaparTextoDocumento(
       normalizarPeriodoCarta(
           obtenerPeriodoEstadia(
               datos.fechaInicio,
               datos.fechaFin
           ) ||
           datos.periodoEstadia ||
           datos.periodo ||
           ""
       )
   );

const fechaInicioEstadia = escaparTextoDocumento(
    formatearFechaCartaEstadia(datos.fechaInicio)
);

const fechaFinEstadia = escaparTextoDocumento(
    formatearFechaCartaEstadia(datos.fechaFin)
);



    const horas =
        escaparTextoDocumento(
            datos.horas || 600
        );


    const proyecto =
        escaparTextoDocumento(
            datos.proyecto ||
            "Proyecto asignado por la Oficina de Proyectos"
        );


    const fecha =
        formatearFechaCartaTermino(
            new Date()
        );


    /*
     * ==========================================================
     * CARTA DE ACEPTACIÓN
     * ==========================================================
     */

    if (tipo === "Carta de aceptación") {

        const fechaAceptacion = (() => {

    const texto =
        String(
            datos.fechaInicio || ""
        ).trim();

    const coincidencia =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (coincidencia) {

        const año =
            Number(coincidencia[1]);

        const mes =
            Number(coincidencia[2]);

        const dia =
            Number(coincidencia[3]);

        const meses = [
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

        return `${String(dia).padStart(2, "0")} de ${
            meses[mes - 1]
        } de ${año}`;
    }

    return "01 de Septiembre de 2026";

})();
        return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Carta de aceptación - ${nombre}</title>

<style>

@page {
    size: Letter;
    margin: 0;
}

* {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    padding: 0;
}

body {
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #ececec;
    font-size: 10.5pt;
}

.page {
    position: relative;
    width: 215.9mm;
    height: 279.4mm;
    margin: 12px auto;
    padding: 13mm 15mm 15mm;
    background: #fff;
    overflow: hidden;
}

.content {
    position: relative;
    z-index: 1;
}

.top {
    display: grid;
    grid-template-columns: 46% 54%;
    min-height: 52mm;
    align-items: start;
}

.logo img {
    width: 56mm;
    height: auto;
    display: block;
}

.top-right {
    text-align: right;
    font-weight: 700;
    padding-top: 13mm;
}

.fecha {
    margin-bottom: 7mm;
}

.titulo {
    font-size: 12pt;
}

.destinatario {
    width: 105mm;
    font-weight: 700;
    line-height: 1.2;
    font-size: 9.8pt;
    margin-top: 0;
}

.presente {
    letter-spacing: .38em;
}

.asunto {
    text-align: right;
    font-weight: 700;
    margin-top: 16mm;
    font-size: 10.5pt;
}

.cuerpo {
    margin-top: 12mm;
    text-align: justify;
    line-height: 1.5;
    font-size: 10.5pt;
}

.cuerpo p {
    margin: 0 0 8mm;
}

.cuerpo p:first-child {
    text-indent: 12mm;
}

.firma {
    text-align: center;
    margin-top: 7mm;
    font-weight: 700;
    line-height: 1.25;
}

.atentamente {
    letter-spacing: .5em;
    margin-bottom: 18mm;
}

.footer {
    position: absolute;
    left: 14mm;
    right: 14mm;
    bottom: 7mm;
    text-align: center;
    color: #315d9d;
    font-weight: 700;
    font-size: 7.5pt;
    line-height: 1.25;
    z-index: 1;
}

.print {
    position: fixed;
    right: 20px;
    top: 20px;
    padding: 10px 16px;
    background: #155eef;
    color: #fff;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    z-index: 10;
}

@media print {

    body {
        background: #fff;
    }

    .page {
        margin: 0;
    }

    .print {
        display: none;
    }

}

</style>
</head>

<body>

<button
    class="print"
    onclick="window.print()">
    Imprimir / Guardar como PDF
</button>

<div class="page">


    <div class="content">

        <div class="top">

            <div class="logo">
                <img
                    src="${LOGO_JJM_DATA_URL}"
                    alt="Logo JJM Tecnologías Innovadoras"
                >
            </div>

            <div class="top-right">

                <div class="fecha">
                    Estado de México, a ${fechaAceptacion}
                </div>

                <div class="titulo">
                    CARTA DE ACEPTACIÓN
                </div>

            </div>

        </div>


        <div class="destinatario">

            DR. FELIPE NERHI TENORIO GONZÁLEZ<br>

            DIRECTOR DE DIVISIÓN DE INGENIERÍA MECÁNICA<br>

            AUTOMOTRIZ, INGENIERÍA EN TECNOLOGÍAS DE<br>

            MANUFACTURA E INGENIERÍA EN SOFTWARE<br>

            UNIVERSIDAD POLITÉCNICA DE TECÁMAC<br>

            <span class="presente">
                P R E S E N T E
            </span>

        </div>


        <div class="asunto">
            ASUNTO: CARTA DE ACEPTACIÓN DE ESTADÍA
        </div>


        <div class="cuerpo">

      <p>
    Por medio de la presente, le informo que el (la)
    alumno(a) <strong>${nombre}</strong>, con matrícula
    <strong>${matricula}</strong> adscrito(a) al
    <strong>${cuatrimestreCarta} cuatrimestre</strong>
    de la carrera en <strong>${carrera}</strong>,
    ha sido aceptado(a) para la realización de su
    Estadía, en la cual deberá cubrir un total de
    <strong>${horas} hrs.</strong> en el periodo
    comprendido de <strong>${periodo}</strong>,
    
</p>

            <p>
                Sin otro particular por el momento, le envío un
                cordial saludo y quedo como su seguro servidor.
            </p>

        </div>


        <div class="firma">

            <div class="atentamente">
                A T E N T A M E N T E
            </div>

            <div>
                ING. JULIO LARA GARCÍA.
            </div>

            <div>
                CEO Y FUNDADOR
            </div>

            <div>
                JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.
            </div>

        </div>

    </div>


    <div class="footer">

        JJM Tecnologías Innovadoras, S.A. de C.V.
        &nbsp; RFC: JTI251031952<br>

        Dirección: Privada de Gerona No. 18,
        Fraccionamiento Villas del Real Primera Sección,
        Tecámac, Estado de México, México,
        C.P.: 04450.

        Teléfono: +52 5544753194

        E-mail: jjmti231171@hotmail.com

    </div>

</div>

</body>
</html>`;
    }


    /*
     * ==========================================================
     * CARTA DE TÉRMINO
     * ==========================================================
     */

    if (tipo === "Carta de término") {

        return `<!doctype html>
<html lang="es">

<head>

<meta charset="utf-8">

<title>
Carta de terminación - ${nombre}
</title>

<style>

@page {
    size: Letter;
    margin: 0;
}

* {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    padding: 0;
}

body {
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #ececec;
    font-size: 10.5pt;
}

.page {
    position: relative;
    width: 215.9mm;
    height: 279.4mm;
    margin: 12px auto;
    padding: 13mm 18mm 15mm;
    background: #fff;
    overflow: hidden;
}

.top {
    display: grid;
    grid-template-columns: 47% 53%;
    align-items: start;
    min-height: 48mm;
}

.logo-wrap {
    text-align: left;
    padding-left: 2mm;
}

.logo-wrap img {
    width: 56mm;
    height: auto;
    display: block;
}

.top-right {
    text-align: right;
    font-weight: 700;
    padding-top: 6mm;
}

.fecha {
    font-size: 10.5pt;
    margin-bottom: 7mm;
}

.titulo {
    font-size: 12pt;
    font-weight: 700;
}

.destinatario {
    width: 92mm;
    margin-top: 2mm;
    font-weight: 700;
    line-height: 1.25;
    font-size: 9.8pt;
}

.presente {
    letter-spacing: .42em;
}

.asunto {
    margin-top: 14mm;
    text-align: right;
    font-weight: 700;
    font-size: 10.5pt;
    white-space: nowrap;
}

.cuerpo {
    margin-top: 12mm;
    font-size: 10.6pt;
    line-height: 1.5;
    text-align: justify;
}

.cuerpo p {
    margin: 0 0 8mm;
}

.cuerpo p:first-child {
    text-indent: 12mm;
}

.cuerpo .saludo {
    text-indent: 12mm;
    margin-top: 9mm;
}

.firma {
    position: relative;
    text-align: center;
    width: 100%;
    margin-top: 3mm;
    font-weight: 700;
}

.atentamente {
    position: relative;
    z-index: 2;
    letter-spacing: .52em;
    margin-bottom: 18mm;
    font-size: 10.5pt;
}

.firma-nombre {
    position: relative;
    z-index: 2;
    line-height: 1.25;
}

.footer {
    position: absolute;
    left: 14mm;
    right: 14mm;
    bottom: 7mm;
    text-align: center;
    color: #315d9d;
    font-weight: 700;
    font-size: 7.5pt;
    line-height: 1.25;
}

.print {
    position: fixed;
    right: 20px;
    top: 20px;
    padding: 10px 16px;
    background: #155eef;
    color: #fff;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    z-index: 10;
}

@media print {

    body {
        background: #fff;
    }

    .page {
        margin: 0;
    }

    .print {
        display: none;
    }

}

</style>

</head>

<body>

<button
    class="print"
    onclick="window.print()">
    Imprimir / Guardar como PDF
</button>

<div class="page">

    <div class="top">

        <div class="logo-wrap">

            <img
                src="${LOGO_JJM_DATA_URL}"
                alt="JJM Tecnologías Innovadoras"
            >

        </div>

        <div class="top-right">

            <div class="fecha">
                Estado de México, a ${fecha}
            </div>

            <div class="titulo">
                CARTA DE TERMINACIÓN
            </div>

        </div>

    </div>


    <div class="destinatario">

        DR. FELIPE NERHI TENORIO GONZÁLEZ<br>

        DIRECTOR DE DIVISIÓN DE INGENIERÍA<br>

        MECÁNICA, INGENIERÍA EN TECNOLOGÍAS DE<br>

        MANUFACTURA E INGENIERÍA EN SOFTWARE<br>

        UNIVERSIDAD POLITÉCNICA DE TECÁMAC<br>

        <span class="presente">
            PRESENTE
        </span>

    </div>


    <div class="asunto">
        ASUNTO: CARTA DE TERMINACIÓN DE ESTADÍA PARA TSU
    </div>


    <div class="cuerpo">

        <p>

            Por medio de la presente, le informo que el (la)
            alumno(a) <strong>${nombre}</strong>, con matrícula
            <strong>${matricula}</strong> adscrito(a) al
            <strong>${cuatrimestreCarta} cuatrimestre</strong>
            de la carrera en <strong>${carrera}</strong>,
            ha concluido satisfactoriamente la realización de su
            <strong>Estadía</strong>, cubriendo un total de
            <strong>${horas} hrs.</strong> en el periodo comprendido
            de <strong>${periodo}</strong>. Demostrando así,
            las competencias alcanzadas en el proyecto entregado.

        </p>


        <p class="saludo">

            Sin otro particular por el momento, le envío un cordial
            saludo y quedo como su seguro servidor.

        </p>

    </div>


    <div class="firma">

        <div class="atentamente">
            ATENTAMENTE
        </div>

        <div class="firma-nombre">

            ING. JULIO LARA GARCÍA.<br>

            CEO Y FUNDADOR<br>

            JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.

        </div>

    </div>


    <div class="footer">

        JJM Tecnologías Innovadoras, S.A. de C.V.
        RFC: JTI251031952<br>

        Dirección: Privada de Gerona No. 18,
        Fraccionamiento Villas del Real Primera Sección,
        Tecámac, Estado de México, México, C.P.:<br>

        04450. Teléfono: +52 5544753194
        E-mail: jjmti231171@hotmail.com

    </div>

</div>

</body>
</html>`;
    }


    /*
     * ==========================================================
     * REPORTE DE DESEMPEÑO
     * ==========================================================
     */

    const cuerpo = `
        <p>
            <strong>ASUNTO: REPORTE DE DESEMPEÑO</strong>
        </p>

        <p>
            Por medio de la presente se emite el reporte ejecutivo
            de desempeño de <strong>${nombre}</strong>, con matrícula
            <strong>${matricula}</strong>, estudiante de
            <strong>${carrera}</strong>,
            ${cuatrimestreOriginal} cuatrimestre,
            de la <strong>${universidad}</strong>.
        </p>

        <p>
            <strong>Proyecto TIC asignado:</strong>
            ${proyecto}
        </p>

        <p>
            <strong>Periodo:</strong> ${periodo}.
            <strong>Horas comprometidas:</strong> ${horas}.
        </p>

        <p>
            Durante la estadía se evaluó el cumplimiento de
            actividades, actitud, puntualidad, planeación,
            innovación, aplicabilidad, desempeño técnico,
            trabajo autónomo y resultados alcanzados.
        </p>

        <p>
            El presente documento se expide para los fines
            académicos y administrativos correspondientes.
        </p>
    `;


    return `<!doctype html>
<html lang="es">

<head>

<meta charset="utf-8">

<title>
${escaparTextoDocumento(tipo)} - ${nombre}
</title>

<style>

body {
    font-family: Arial, sans-serif;
    color: #111;
    line-height: 1.55;
    margin: 0;
    background: #eee;
}

.page {
    width: 210mm;
    min-height: 297mm;
    margin: 20px auto;
    background: #fff;
    padding: 25mm 22mm;
    box-sizing: border-box;
}

.header {
    text-align: center;
    font-weight: 700;
    margin-bottom: 28px;
}

.header img {
    max-width: 140px;
    max-height: 70px;
}

.date {
    text-align: right;
    margin-bottom: 25px;
}

.title {
    text-align: center;
    font-weight: 700;
    letter-spacing: .08em;
    margin: 20px 0;
}

.signature {
    margin-top: 55px;
    text-align: center;
}

.line {
    border-top: 1px solid #111;
    width: 220px;
    margin: 50px auto 8px;
}

.print {
    position: fixed;
    right: 20px;
    top: 20px;
    padding: 10px 16px;
    background: #155eef;
    color: #fff;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
}

@media print {

    body {
        background: #fff;
    }

    .page {
        margin: 0;
        box-shadow: none;
    }

    .print {
        display: none;
    }

}

</style>

</head>

<body>

<button
    class="print"
    onclick="window.print()">
    Imprimir / Guardar como PDF
</button>

<div class="page">

    <div class="header">

        <img
            src="${LOGO_JJM_DATA_URL}"
            alt="Logo JJM Tecnologías Innovadoras"
        >

        <div>
            JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.
        </div>

        <div>
            OFICINA DE PROYECTOS
        </div>

    </div>


    <div class="date">
        Estado de México, a ${fecha}
    </div>


    <div class="title">
        ${escaparTextoDocumento(tipo)}
    </div>


    ${cuerpo}


    <div class="signature">

        <div class="line"></div>

        <strong>
            ING. JULIO LARA GARCÍA
        </strong>

        <br>

        CEO Y FUNDADOR

        <br>

        JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.

    </div>

</div>

</body>
</html>`;
}


/*
 * ==========================================================
 * CONVERTIR DATA URL A BLOB
 * ==========================================================
 */
function dataUrlABlobUrl(dataUrl) {

    if (
        !dataUrl ||
        typeof dataUrl !== "string"
    ) {
        return null;
    }

    try {

        let contenido =
            dataUrl.trim();

        /*
         * ======================================================
         * CASO 1: YA VIENE COMO DATA URL
         * ======================================================
         */

        if (
            contenido.startsWith("data:")
        ) {

            const partes =
                contenido.split(",");

            if (
                partes.length < 2
            ) {
                return null;
            }

            const encabezado =
                partes[0];

            const datos =
                partes
                    .slice(1)
                    .join(",");

            const match =
                encabezado.match(
                    /data:([^;]+)/i
                );

            const mime =
                match
                    ? match[1]
                    : "application/octet-stream";

            let bytes;

            if (
                /;base64/i.test(
                    encabezado
                )
            ) {

                const binario =
                    atob(datos);

                bytes =
                    new Uint8Array(
                        binario.length
                    );

                for (
                    let i = 0;
                    i < binario.length;
                    i++
                ) {

                    bytes[i] =
                        binario.charCodeAt(i);
                }

            } else {

                const texto =
                    decodeURIComponent(
                        datos
                    );

                bytes =
                    new TextEncoder()
                        .encode(texto);
            }

            return URL.createObjectURL(
                new Blob(
                    [bytes],
                    {
                        type: mime
                    }
                )
            );
        }


        /*
         * ======================================================
         * CASO 2: VIENE COMO BASE64 PURO
         * ======================================================
         */

        const binario =
            atob(
                contenido
            );

        const bytes =
            new Uint8Array(
                binario.length
            );

        for (
            let i = 0;
            i < binario.length;
            i++
        ) {

            bytes[i] =
                binario.charCodeAt(i);
        }


        /*
         * Las cartas generadas por el sistema
         * son documentos HTML.
         */

        return URL.createObjectURL(
            new Blob(
                [bytes],
                {
                    type: "text/html;charset=utf-8"
                }
            )
        );

    } catch (error) {

        console.error(
            "No fue posible crear la vista del documento:",
            error
        );

        return null;
    }
}

/*
 * ==========================================================
 * ABRIR DOCUMENTO GENERADO
 * ==========================================================
 */

function abrirDocumentoGenerado(documento) {

    if (
        !documento?.archivoBase64
    ) {
        alert(
            "No se encontró el contenido del documento."
        );

        return;
    }

    let contenido =
        String(
            documento.archivoBase64
        );

    /*
     * Si ya es un Data URL,
     * lo usamos directamente.
     */
    if (
        contenido.startsWith("data:text/html")
    ) {

        const ventana =
            window.open(
                contenido,
                "_blank"
            );

        if (!ventana) {

            alert(
                "El navegador bloqueó la ventana del documento. Permite ventanas emergentes."
            );

        }

        return;
    }

    /*
     * Si el backend quitó el encabezado
     * data:text/html;base64, lo reconstruimos.
     */
    contenido =
        "data:text/html;charset=utf-8;base64," +
        contenido;

    const ventana =
        window.open(
            contenido,
            "_blank"
        );

    if (!ventana) {

        alert(
            "El navegador bloqueó la ventana del documento. Permite ventanas emergentes."
        );

    }
}


/*
 * ==========================================================
 * ABRIR REVISIÓN
 * ==========================================================
 */

function abrirRevisionDocumento(
    id,
    estado
) {

    if (
        !puedeValidarDocumentos()
    ) {
        return;
    }


    documentoRevisionActual =
        documentosPMO.find(
            doc =>
                String(doc.id) ===
                String(id)
        );


    if (
        !documentoRevisionActual
    ) {

        alert(
            "No se encontró el documento."
        );

        return;
    }


    const esAceptacion =
        documentoRevisionActual.tipoDocumento ===
        "Carta de aceptación";


    const esTermino =
        documentoRevisionActual.tipoDocumento ===
        "Carta de término";


    const nombreTipo =
        esAceptacion
            ? "carta de aceptación"
            : esTermino
                ? "carta de término"
                : "carta de presentación";


    if (tituloRevision) {

        if (estado === "Liberada") {

            tituloRevision.textContent =
                `Liberar ${nombreTipo}`;

        } else if (
            estado === "Aceptado"
        ) {

            tituloRevision.textContent =
                "Aceptar carta de presentación";

        } else {

            tituloRevision.textContent =
                `Rechazar ${nombreTipo}`;

        }

    }


    if (idDocumentoRevision) {

        idDocumentoRevision.value =
            id;

    }


    if (estadoDocumentoRevision) {

        estadoDocumentoRevision.value =
            estado;

    }


    if (observacionRevision) {

        if (
            estado === "Liberada"
        ) {

            observacionRevision.value =
                `${
                    esTermino
                        ? "Carta de término"
                        : "Carta de aceptación"
                } liberada por administración.`;

        } else if (
            estado === "Aceptado"
        ) {

            observacionRevision.value =
                "Carta de presentación aceptada por administración.";

        } else {

            observacionRevision.value =
                `${
                    nombreTipo.charAt(0).toUpperCase() +
                    nombreTipo.slice(1)
                } rechazada. Favor de corregir y volver a cargar el documento.`;

        }

    }


    abrirModalDocumentos(
        modalRevision
    );
}


/*
 * ==========================================================
 * GUARDAR REVISIÓN
 * ==========================================================
 */

async function guardarRevisionDocumento(
    event
) {

    event.preventDefault();


    if (
        !puedeValidarDocumentos()
    ) {
        return;
    }


    const id =
        idDocumentoRevision?.value ||
        "";


    const estado =
        estadoDocumentoRevision?.value ||
        "Pendiente";


    const documento =
        documentosPMO.find(
            doc =>
                String(doc.id) ===
                String(id)
        );


    if (!documento) {

        alert(
            "No se encontró el documento."
        );

        return;
    }


    try {

        const respuesta =
            await fetch(
                `${API_DOCUMENTOS}/${id}/revision`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        ...obtenerHeadersDocumentos()
                    },

                    body: JSON.stringify({
                        estado,

                        observaciones:
                            observacionRevision
                                ?.value
                                ?.trim() ||
                            ""
                    })
                }
            );


        const cuerpo =
            await obtenerJSONDocumentos(
                respuesta
            );


        if (!respuesta.ok) {

            throw new Error(
                cuerpo.mensaje ||
                "No se pudo guardar la revisión."
            );
        }


        /*
         * ======================================================
         * ACTUALIZAR CON EL DOCUMENTO REAL DEL BACKEND
         * ======================================================
         */

        const indice =
            documentosPMO.findIndex(
                doc =>
                    String(doc.id) ===
                    String(id)
            );


        if (
            indice >= 0 &&
            cuerpo.documento
        ) {

            documentosPMO[indice] =
                cuerpo.documento;

        }


        /*
         * ======================================================
         * GUARDAR CACHE
         * ======================================================
         */

        guardarDocumentosStorage();


        /*
         * ======================================================
         * CERRAR MODAL Y ACTUALIZAR TABLAS
         * ======================================================
         */

        cerrarModalDocumentos(
            modalRevision
        );


        renderizarDocumentos();


        /*
         * ======================================================
         * MENSAJE DEL BACKEND
         * ======================================================
         */

        if (cuerpo.mensaje) {

            alert(
                cuerpo.mensaje
            );

        } else if (
            estado === "Liberada" &&
            documento.tipoDocumento ===
                "Carta de aceptación"
        ) {

            alert(
                "Carta de aceptación liberada correctamente y disponible en Documentos."
            );

        } else {

            alert(
                "Revisión guardada correctamente."
            );

        }

    } catch (error) {

        console.error(
            error
        );

        alert(
            error.message ||
            "No fue posible guardar la revisión."
        );
    }
}


/*
 * ==========================================================
 * OBTENER MIME DEL DOCUMENTO
 * ==========================================================
 */

function obtenerMimeDocumento(
    documento
) {

    const mimeDeclarado =
        String(
            documento?.mimeType ||
            ""
        )
            .toLowerCase()
            .trim();


    if (mimeDeclarado) {
        return mimeDeclarado;
    }


    const dataUrl =
        String(
            documento?.archivoBase64 ||
            ""
        );


    const coincidencia =
        dataUrl.match(
            /^data:([^;,]+)/i
        );


    if (coincidencia) {

        return coincidencia[1]
            .toLowerCase();

    }


    const nombre =
        String(
            documento?.nombreArchivo ||
            ""
        )
            .toLowerCase();


    if (
        nombre.endsWith(".pdf")
    ) {

        return "application/pdf";

    }


    if (
        /\.(png|jpg|jpeg|gif|webp|bmp)$/.test(
            nombre
        )
    ) {

        if (
            nombre.endsWith(".jpg") ||
            nombre.endsWith(".jpeg")
        ) {

            return "image/jpeg";

        }

        return (
            "image/" +
            nombre
                .split(".")
                .pop()
        );

    }


    if (
        /\.html?$/.test(
            nombre
        )
    ) {

        return "text/html";

    }


    return "application/octet-stream";
}


/*
 * ==========================================================
 * LIBERAR BLOB DE VISTA PREVIA
 * ==========================================================
 */

function liberarBlobVistaPrevia() {

    if (
        vistaPreviaBlobUrl
    ) {

        try {

            URL.revokeObjectURL(
                vistaPreviaBlobUrl
            );

        } catch (_) {}


        vistaPreviaBlobUrl =
            null;
    }
}


/*
 * ==========================================================
 * VISTA PREVIA
 * ==========================================================
 */

function abrirVistaPreviaDocumento(
    id
) {

    const documento =
        documentosPMO.find(
            doc =>
                String(doc.id) ===
                String(id)
        );


    if (
        !documento ||
        !documento.archivoBase64
    ) {

        alert(
            "No se encontró el contenido del archivo para mostrar la vista previa."
        );

        return;
    }


    vistaPreviaDocumentoId =
        id;


    liberarBlobVistaPrevia();


    if (tituloVistaPreviaDocumento) {

        tituloVistaPreviaDocumento.textContent =
            documento.nombreArchivo ||
            "Vista previa del documento";

    }


    if (
        descripcionVistaPreviaDocumento
    ) {

        const partes = [
            documento.tipoDocumento,
            documento.colaboradorNombre
        ].filter(Boolean);


        descripcionVistaPreviaDocumento.textContent =
            partes.join(" · ") ||
            "Vista previa del documento";

    }


    if (
        !contenedorVistaPreviaDocumento
    ) {

        return;
    }


    contenedorVistaPreviaDocumento.innerHTML =
        "";


    const mime =
        obtenerMimeDocumento(
            documento
        );


    /*
     * ======================================================
     * PDF
     * ======================================================
     */

    if (
        mime === "application/pdf"
    ) {

        vistaPreviaBlobUrl =
            dataUrlABlobUrl(
                documento.archivoBase64
            );


        if (
            !vistaPreviaBlobUrl
        ) {

            contenedorVistaPreviaDocumento.innerHTML =
                '<div class="preview-error">No fue posible preparar este PDF para visualizarlo.</div>';

        } else {

            const iframe =
                document.createElement(
                    "iframe"
                );


            iframe.className =
                "preview-frame";


            iframe.title =
                `Vista previa de ${
                    documento.nombreArchivo ||
                    "documento PDF"
                }`;


            iframe.src =
                vistaPreviaBlobUrl;


            iframe.setAttribute(
                "loading",
                "lazy"
            );


            contenedorVistaPreviaDocumento
                .appendChild(
                    iframe
                );

        }


    /*
     * ======================================================
     * IMAGEN
     * ======================================================
     */

    } else if (
        mime.startsWith("image/")
    ) {

        const imagen =
            document.createElement(
                "img"
            );


        imagen.className =
            "preview-image";


        imagen.alt =
            documento.nombreArchivo ||
            "Vista previa del documento";


        imagen.src =
            documento.archivoBase64;


        contenedorVistaPreviaDocumento
            .appendChild(
                imagen
            );


    /*
     * ======================================================
     * HTML
     * ======================================================
     */

    } else if (
        mime === "text/html" ||
        documento.generadoAutomaticamente
    ) {

        vistaPreviaBlobUrl =
            dataUrlABlobUrl(
                documento.archivoBase64
            );


        if (
            !vistaPreviaBlobUrl
        ) {

            contenedorVistaPreviaDocumento.innerHTML =
                '<div class="preview-error">No fue posible preparar este documento para visualizarlo.</div>';

        } else {

            const iframe =
                document.createElement(
                    "iframe"
                );


            iframe.className =
                "preview-frame";


            iframe.title =
                `Vista previa de ${
                    documento.nombreArchivo ||
                    "documento"
                }`;


            iframe.setAttribute(
                "sandbox",
                ""
            );


            iframe.src =
                vistaPreviaBlobUrl;


            contenedorVistaPreviaDocumento
                .appendChild(
                    iframe
                );

        }


    /*
     * ======================================================
     * FORMATO NO SOPORTADO
     * ======================================================
     */

    } else {

        const mensaje =
            document.createElement(
                "div"
            );


        mensaje.className =
            "preview-unsupported";


        mensaje.innerHTML =
            `
                <strong>
                    Vista previa no disponible
                </strong>

                <p>
                    El formato
                    ${escaparHTML(mime)}
                    no puede mostrarse directamente
                    en el navegador.
                    Puedes usar el botón Descargar.
                </p>
            `;


        contenedorVistaPreviaDocumento
            .appendChild(
                mensaje
            );
    }


    if (
        modalVistaPreviaDocumento
    ) {

        modalVistaPreviaDocumento
            .setAttribute(
                "aria-hidden",
                "false"
            );


        abrirModalDocumentos(
            modalVistaPreviaDocumento
        );
    }
}


/*
 * ==========================================================
 * CERRAR VISTA PREVIA
 * ==========================================================
 */

function cerrarVistaPreviaDocumento() {

    if (
        modalVistaPreviaDocumento
    ) {

        modalVistaPreviaDocumento
            .classList
            .remove("show");


        modalVistaPreviaDocumento
            .setAttribute(
                "aria-hidden",
                "true"
            );
    }


    if (
        contenedorVistaPreviaDocumento
    ) {

        contenedorVistaPreviaDocumento.innerHTML =
            '<div class="preview-empty">Selecciona un documento para visualizarlo.</div>';

    }


    vistaPreviaDocumentoId =
        null;


    liberarBlobVistaPrevia();
}


/*
 * ==========================================================
 * DESCARGAR DOCUMENTO
 * ==========================================================
 */

async function descargarDocumento(
    id
) {

    const documento =
        documentosPMO.find(
            doc =>
                String(doc.id) ===
                String(id)
        );


    if (
        !documento ||
        !documento.archivoBase64
    ) {

        alert(
            "No se encontró el archivo para descargar."
        );

        return;
    }


    const mime =
        obtenerMimeDocumento(
            documento
        );


    /*
     * ======================================================
     * HTML / DOCUMENTOS GENERADOS
     * ======================================================
     */

    if (
        mime === "text/html" ||
        (
            documento.generadoAutomaticamente &&
            String(documento.archivoBase64).startsWith(
                "data:text/html"
            )
        )
    ) {

        try {

            /*
             * Compatibilidad con cartas antiguas que ya
             * quedaron guardadas como HTML en la base.
             * Al descargarlas se convierten a PDF real.
             */
            const respuestaHTML =
                await fetch(
                    documento.archivoBase64
                );

            const html =
                await respuestaHTML.text();

            const nombrePDF =
                String(
                    documento.nombreArchivo ||
                    "documento_generado.html"
                )
                    .replace(
                        /\.html?$/i,
                        ""
                    ) +
                ".pdf";

            const pdfBase64 =
                await convertirCartaHTMLaPDFBase64(
                    html,
                    nombrePDF
                );

            const enlace =
                document.createElement(
                    "a"
                );

            enlace.href =
                pdfBase64;

            enlace.download =
                nombrePDF;

            document.body.appendChild(
                enlace
            );

            enlace.click();
            enlace.remove();

        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "No fue posible convertir el documento a PDF."
            );
        }

        return;
    }


    /*
     * ======================================================
     * PDF, IMAGEN U OTRO ARCHIVO
     * ======================================================
     */

    const enlace =
        document.createElement(
            "a"
        );


    enlace.href =
        documento.archivoBase64;


    enlace.download =
        documento.nombreArchivo ||
        (
            mime === "application/pdf"
                ? "documento.pdf"
                : "documento"
        );


    document.body.appendChild(
        enlace
    );


    enlace.click();


    enlace.remove();
}


/*
 * ==========================================================
 * ELIMINAR DOCUMENTO
 * ==========================================================
 */

async function eliminarDocumento(
    id
) {

    if (
        !puedeEliminarDocumentos()
    ) {

        return;
    }


    if (
        !confirm(
            "¿Deseas eliminar este documento?"
        )
    ) {

        return;
    }


    try {

        const respuesta =
            await fetch(
                `${API_DOCUMENTOS}/${id}`,
                {
                    method: "DELETE",
                    headers:
                        obtenerHeadersDocumentos()
                }
            );


        const cuerpo =
            await obtenerJSONDocumentos(
                respuesta
            );


        if (!respuesta.ok) {

            throw new Error(
                cuerpo.mensaje ||
                "No se pudo eliminar el documento."
            );
        }


        documentosPMO =
            documentosPMO.filter(
                doc =>
                    String(doc.id) !==
                    String(id)
            );


        guardarDocumentosStorage();


        renderizarDocumentos();


        alert(
            "Documento eliminado correctamente."
        );


    } catch (error) {

        console.error(
            error
        );


        alert(
            error.message ||
            "No fue posible eliminar el documento."
        );
    }
}


/*
 * ==========================================================
 * SELECT DE LIBERACIÓN
 * ==========================================================
 */

function llenarSelectLiberacion() {

    if (
        !miembroLiberacion
    ) {

        return;
    }


    miembroLiberacion.innerHTML =
        `<option value="">
            Selecciona un colaborador
        </option>`;


    miembrosPMO
        .filter(
            function (miembro) {

                const estado =
                    normalizarTextoDocumentos(
                        miembro.estado ||
                        "Activo"
                    );


                const rol =
                    normalizarTextoDocumentos(
                        miembro.rol ||
                        ""
                    );


                return (
                    estado === "activo" &&
                    ![
                        "administrador",
                        "admin pmo",
                        "admin_pmo",
                        "administrador pmo"
                    ].includes(rol)
                );

            }
        )
        .forEach(
            function (miembro) {

                const opcion =
                    document.createElement(
                        "option"
                    );


                const idMiembro =
                    miembro.id ||
                    miembro.idMiembro;


                opcion.value =
                    idMiembro;


                /*
                 * Buscar un documento del alumno
                 * para obtener sus datos académicos.
                 */

                const docDatos =
                    documentosPMO.find(
                        function (doc) {

                            return (
                                String(
                                    doc.idMiembro ||
                                    ""
                                ) ===
                                String(
                                    idMiembro ||
                                    ""
                                ) &&
                                doc.datosAcademicos
                            );

                        }
                    );


                /*
                 * Los datos académicos pueden venir
                 * directamente como objeto o dentro
                 * de datosAcademicos.
                 */

                let datosAcademicos =
                    docDatos?.datosAcademicos ||
                    {};


                if (
                    typeof datosAcademicos ===
                    "string"
                ) {

                    try {

                        datosAcademicos =
                            JSON.parse(
                                datosAcademicos
                            );

                    } catch (_) {

                        datosAcademicos =
                            {};

                    }

                }


                const matricula =
                    datosAcademicos.matricula ||
                    docDatos?.matricula ||
                    "";


                const nombre =
                    datosAcademicos.nombreCompleto ||
                    docDatos?.colaboradorNombre ||
                    miembro.nombreCompleto ||
                    miembro.nombre ||
                    "Colaborador sin nombre";


                const extra =
                    matricula
                        ? ` · ${matricula}`
                        : "";


                opcion.textContent =
                    `${nombre}${extra}`;


                miembroLiberacion
                    .appendChild(
                        opcion
                    );

            }
        );
}


/*
 * ==========================================================
 * VALIDAR PDF
 * ==========================================================
 */

function validarArchivoPDF(
    archivo
) {

    if (
        archivo.type !==
        "application/pdf"
    ) {

        return (
            "El documento debe ser un archivo PDF."
        );
    }


    const maxBytes =
        TAMANO_MAXIMO_MB_DOCUMENTO *
        1024 *
        1024;


    if (
        archivo.size >
        maxBytes
    ) {

        return (
            `El PDF no debe superar ${
                TAMANO_MAXIMO_MB_DOCUMENTO
            } MB para guardarse localmente.`
        );
    }


    return null;
}


/*
 * ==========================================================
 * ARCHIVO A BASE64
 * ==========================================================
 */

function archivoABase64(
    archivo
) {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const lector =
                new FileReader();


            lector.onload =
                () =>
                    resolve(
                        lector.result
                    );


            lector.onerror =
                () =>
                    reject(
                        new Error(
                            "No fue posible leer el archivo."
                        )
                    );


            lector.readAsDataURL(
                archivo
            );

        }
    );
}


/*
 * ==========================================================
 * MIEMBRO ACTUAL
 * ==========================================================
 */

function obtenerMiembroActualBasico() {

    return {

        id:
            obtenerIdMiembroSesionDocumentos(),

        nombreCompleto:
            obtenerNombreUsuarioDocumentos(),

        correo:
            usuarioActivoDocumentos?.correo ||
            ""

    };
}


/*
 * ==========================================================
 * GENERAR ID
 * ==========================================================
 */

function generarIdDocumento() {

    return `DOC-${Date.now()}-${Math.floor(
        Math.random() * 100000
    )}`;
}


/*
 * ==========================================================
 * CLASE DEL ESTADO
 * ==========================================================
 */

function obtenerClaseEstadoDocumento(
    estado
) {

    const valor =
        normalizarTextoDocumentos(
            estado
        );


    if (
        valor === "aceptado" ||
        valor === "liberada"
    ) {

        return "green";
    }


    if (
        valor === "rechazado"
    ) {

        return "red";
    }


    if (
        valor === "pendiente"
    ) {

        return "yellow";
    }


    return "blue";
}


/*
 * ==========================================================
 * FORMATEAR FECHA
 * ==========================================================
 *
 * IMPORTANTE:
 * Esta función solamente formatea la fecha.
 * El orden de documentos se controla con
 * obtenerFechaOrdenDocumento().
 */

function formatearFechaDocumento(
    fecha
) {

    if (!fecha) {
        return "—";
    }


    const date =
        new Date(fecha);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(fecha);
    }


    return date.toLocaleDateString(
        "es-MX",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    );
}


/*
 * ==========================================================
 * LIMPIAR FORMULARIOS
 * ==========================================================
 */

function limpiarFormularioPresentacion() {

    if (
        formSubirPresentacion
    ) {

        formSubirPresentacion.reset();

    }
}


function limpiarFormularioAceptacion() {

    if (
        formSubirAceptacion
    ) {

        formSubirAceptacion.reset();

    }
}


function limpiarFormularioTermino() {

    if (
        formSubirTermino
    ) {

        formSubirTermino.reset();

    }
}


function limpiarFormularioLiberacion() {

    if (
        formLiberacion
    ) {

        formLiberacion.reset();

    }
}


/*
 * ==========================================================
 * MODALES
 * ==========================================================
 */

function abrirModalDocumentos(
    modal
) {

    if (modal) {

        modal.classList.add(
            "show"
        );

    }
}


function cerrarModalDocumentos(
    modal
) {

    if (modal) {

        modal.classList.remove(
            "show"
        );

    }
}


/*
 * ==========================================================
 * OBTENER JSON
 * ==========================================================
 */

async function obtenerJSONDocumentos(
    respuesta
) {

    try {

        return await respuesta.json();

    } catch (error) {

        return {};

    }
}


/*
 * ==========================================================
 * ESCAPAR HTML
 * ==========================================================
 */

function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

// ==========================================================
// ESCAPAR TEXTO PARA DOCUMENTOS
// ==========================================================

function escaparTextoDocumento(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================================
// FORMATEAR FECHA PARA CARTAS
// ==========================================================
function formatearFechaCartaEstadia(fecha) {

    if (!fecha) {
        return "la fecha correspondiente";
    }

    const texto =
        String(fecha).trim();

    /*
     * ======================================================
     * FECHAS YYYY-MM-DD O ISO
     * Se toman directamente año, mes y día para evitar
     * desplazamientos por zona horaria.
     * ======================================================
     */

    const coincidencia =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (coincidencia) {

        const año =
            Number(coincidencia[1]);

        const mes =
            Number(coincidencia[2]);

        const dia =
            Number(coincidencia[3]);

        const meses = [
            "enero",
            "febrero",
            "marzo",
            "abril",
            "mayo",
            "junio",
            "julio",
            "agosto",
            "septiembre",
            "octubre",
            "noviembre",
            "diciembre"
        ];

        if (
            mes >= 1 &&
            mes <= 12
        ) {

            return `${dia} de ${meses[mes - 1]} de ${año}`;
        }
    }

    /*
     * ======================================================
     * OTROS FORMATOS
     * ======================================================
     */

    const date =
        new Date(fecha);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return texto;
    }

    const meses = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre"
    ];

    return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
}


// ==========================================================
// CARGAR MIEMBROS REGISTRADOS
// ==========================================================

function normalizarMiembroDocumentos(miembro) {
    miembro = miembro || {};

    return {
        ...miembro,

        id:
            miembro.id ??
            miembro.idMiembro ??
            miembro.id_miembro ??
            null,

        idUsuario:
            miembro.idUsuario ??
            miembro.id_usuario ??
            miembro.usuarioId ??
            null,

        nombreCompleto:
            miembro.nombreCompleto ??
            miembro.nombre_completo ??
            [
                miembro.nombre,
                miembro.apellidoPaterno,
                miembro.apellidoMaterno
            ]
                .filter(Boolean)
                .join(" ") ??
            "",

        correo:
            miembro.correo ??
            miembro.email ??
            miembro.correoInstitucional ??
            miembro.correo_institucional ??
            "",

        rol:
            miembro.rol?.nombre ??
            miembro.rol ??
            miembro.rolNombre ??
            miembro.nombreRol ??
            "",

        estado:
            miembro.estado ??
            "Activo",

        fechaRegistro:
            miembro.fechaRegistro ??
            miembro.fecha_registro ??
            miembro.createdAt ??
            miembro.created_at ??
            null
    };
}


async function cargarMiembrosDocumentos() {
    errorPadronDocumentos = "";

    const headers = obtenerHeadersDocumentos();

    try {
        let lista = [];

        /*
         * IMPORTANTE:
         * /api/miembros devuelve todo el equipo y está restringido al admin.
         * Un colaborador debe usar /api/miembros/mi-sesion; de lo contrario
         * el endpoint responde 403 y el expediente termina mostrando
         * "Alumno sin nombre / Sin registrar".
         */
        if (esAdministradorDocumentos()) {

            const respuesta = await fetch(
                API_MIEMBROS_DOCUMENTOS,
                { method: "GET", headers }
            );

            const cuerpo = await obtenerJSONDocumentos(respuesta);

            if (!respuesta.ok) {
                throw new Error(
                    cuerpo.mensaje ||
                    "No fue posible cargar los miembros."
                );
            }

            if (Array.isArray(cuerpo)) {
                lista = cuerpo;
            } else if (Array.isArray(cuerpo.miembros)) {
                lista = cuerpo.miembros;
            } else if (Array.isArray(cuerpo.data)) {
                lista = cuerpo.data;
            } else if (Array.isArray(cuerpo.usuarios)) {
                lista = cuerpo.usuarios;
            }

        } else {

            const respuesta = await fetch(
                API_MIEMBRO_SESION_DOCUMENTOS,
                { method: "GET", headers }
            );

            const cuerpo = await obtenerJSONDocumentos(respuesta);

            if (respuesta.ok && cuerpo?.miembro) {
                lista = [cuerpo.miembro];
            } else if (respuesta.ok && cuerpo?.data) {
                lista = [cuerpo.data];
            } else if (!respuesta.ok && respuesta.status !== 404) {
                throw new Error(
                    cuerpo.mensaje ||
                    "No fue posible cargar el miembro de la sesión."
                );
            }
        }

        miembrosPMO = lista
            .filter(Boolean)
            .map(normalizarMiembroDocumentos);

        if (esAdministradorDocumentos()) {
            // El padrón escolar incluye cuentas sin perfil MiembroEquipo y alumnos de periodos anteriores.
            const respuestaAlumnos = await fetch(window.apiUrl("/api/supervision-escolar"), { headers });
            const padron = await obtenerJSONDocumentos(respuestaAlumnos);
            if (!respuestaAlumnos.ok) throw new Error(padron.mensaje || "No se pudo consultar el padrón de alumnos.");
            for (const alumno of padron.alumnos || []) {
                const existente = miembrosPMO.find(m => String(m.idUsuario) === String(alumno.idUsuario));
                if (!existente) miembrosPMO.push(normalizarMiembroDocumentos({ ...alumno,
                    id: `usuario-${alumno.idUsuario}`, nombreCompleto: alumno.nombre }));
                datosAcademicosDocumentosCache[String(alumno.idUsuario)] = { ...alumno,
                    nombreCompleto: alumno.nombre, horas: alumno.horas || 600 };
            }
        }

        const idMiembroSesion = obtenerIdMiembroSesionDocumentos();
        const idUsuarioSesion = obtenerIdUsuarioDocumentos();

        miembroSesionPMO = miembrosPMO.find(function (miembro) {
            return (
                idMiembroSesion &&
                String(miembro.id || "") === String(idMiembroSesion)
            ) || (
                idUsuarioSesion &&
                String(miembro.idUsuario || "") === String(idUsuarioSesion)
            );
        }) || null;

        /*
         * Si la cuenta todavía no tiene un registro MiembroEquipo enlazado,
         * conservamos la identidad de la sesión para que el encabezado nunca
         * vuelva a mostrar "Alumno sin nombre". Los datos académicos se
         * obtienen por idUsuario en el siguiente paso.
         */
        if (!miembroSesionPMO && !esAdministradorDocumentos()) {
            miembroSesionPMO = normalizarMiembroDocumentos({
                id: idMiembroSesion,
                idUsuario: idUsuarioSesion,
                nombreCompleto: obtenerNombreUsuarioDocumentos(),
                correo: usuarioActivoDocumentos?.correo || usuarioActivoDocumentos?.email || "",
                rol: obtenerRolDocumentos(),
                estado: usuarioActivoDocumentos?.estado || "Activo"
            });

            miembrosPMO = [miembroSesionPMO];
        }

        console.log(
            "Miembros cargados para documentos:",
            miembrosPMO
        );

    } catch (error) {

        console.error(
            "No fue posible cargar los miembros:",
            error
        );

        /* Fallback de identidad para no romper el expediente personal. */
        if (!esAdministradorDocumentos()) {
            miembroSesionPMO = normalizarMiembroDocumentos({
                id: obtenerIdMiembroSesionDocumentos(),
                idUsuario: obtenerIdUsuarioDocumentos(),
                nombreCompleto: obtenerNombreUsuarioDocumentos(),
                correo: usuarioActivoDocumentos?.correo || usuarioActivoDocumentos?.email || "",
                rol: obtenerRolDocumentos(),
                estado: usuarioActivoDocumentos?.estado || "Activo"
            });
            miembrosPMO = [miembroSesionPMO];
        } else {
            miembrosPMO = [];
            miembroSesionPMO = null;
            errorPadronDocumentos = error.message || "No se pudo consultar el padrón de alumnos. Pulsa Actualizar para reintentar.";
        }
    }
}


// ==========================================================
// CARGAR DATOS ACADÉMICOS
// ==========================================================

async function cargarDatosAcademicosDocumentosBackend() {

    try {

        // El backend expone /usuario/{id}; no existe GET /api/datos-registro.
        const ids = [...new Set((puedeValidarDocumentos()
            ? miembrosPMO.map(m => m.idUsuario ?? m.id_usuario ?? m.usuarioId)
            : [obtenerIdUsuarioDocumentos()]).filter(Boolean).map(String))];
        const lista = [];
        let fallos = 0;
        // Limitar las consultas simultáneas para no saturar el servidor.
        for (let inicio = 0; inicio < ids.length; inicio += 6) {
            const resultados = await Promise.all(ids.slice(inicio, inicio + 6).map(async id => {
                try {
                    const respuesta = await fetch(
                        `${API_DATOS_ACADEMICOS_DOCUMENTOS}/usuario/${encodeURIComponent(id)}`,
                        { method: "GET", headers: obtenerHeadersDocumentos() }
                    );
                    const cuerpo = await obtenerJSONDocumentos(respuesta);
                    if (!respuesta.ok) throw new Error(cuerpo.mensaje || "Error de consulta");
                    return { ...(cuerpo.datos || {}), idUsuario: id };
                } catch (error) {
                    fallos++;
                    console.error("No fue posible consultar el expediente del usuario", id, error);
                    return null;
                }
            }));
            lista.push(...resultados.filter(Boolean));
        }
        const aviso = document.getElementById("avisoCargaExpedientes");
        if (aviso) {
            aviso.hidden = !fallos && !errorPadronDocumentos;
            aviso.textContent = errorPadronDocumentos || (fallos
                ? `No se pudieron cargar ${fallos} expedientes. Pulsa Actualizar para reintentar; el listado puede estar incompleto.`
                : "");
        }

        lista.forEach(function (registro) {

            const idUsuario =
                registro.idUsuario ??
                registro.id_usuario ??
                registro.usuarioId;

            const idMiembro =
                registro.idMiembro ??
                registro.id_miembro ??
                registro.miembroId;


            const datos = {
                ...registro,

                nombreCompleto:
                    registro.nombreCompleto ??
                    registro.nombre_completo ??
                    "",

                matricula:
                    registro.matricula ??
                    registro.matriculaAlumno ??
                    registro.matricula_alumno ??
                    "",

                universidad:
                    registro.universidad ??
                    "",

                carrera:
                    registro.carrera ??
                    "",

                cuatrimestre:
                    registro.cuatrimestre ??
                    "",

                periodoEstadia:
                    registro.periodoEstadia ??
                    registro.periodo_estadia ??
                    registro.periodo ??
                    "",

                fechaInicio:
                    registro.fechaInicio ??
                    registro.fecha_inicio ??
                    registro.fechaInicioEstadia ??
                    registro.fecha_inicio_estadia ??
                    registro.fechaInicioEstancia ??
                    registro.fecha_inicio_estancia ??
                    null,

                fechaFin:
                    registro.fechaFin ??
                    registro.fecha_fin ??
                    registro.fechaTermino ??
                    registro.fecha_termino ??
                    registro.fechaFinEstadia ??
                    registro.fecha_fin_estadia ??
                    registro.fechaTerminoEstadia ??
                    registro.fecha_termino_estadia ??
                    registro.fechaFinEstancia ??
                    registro.fecha_fin_estancia ??
                    null,

                horas:
                    registro.horas ??
                    registro.horasEstadia ??
                    registro.horas_estadia ??
                    600,

                proyecto:
                    registro.proyecto ??
                    registro.proyectoTic ??
                    registro.proyecto_tic ??
                    ""
            };


            if (idUsuario) {

                datosAcademicosDocumentosCache[
                    String(idUsuario)
                ] = datos;

            }


            if (idMiembro) {

                datosAcademicosDocumentosCache[
                    `miembro-${idMiembro}`
                ] = datos;

            }

        });


        /*
         * Aplicar los datos académicos a los documentos
         * que ya tenemos cargados.
         */

        documentosPMO.forEach(function (documento) {

            const idUsuario =
                documento.idUsuario;

            const idMiembro =
                documento.idMiembro;

            let datos = null;


            if (idUsuario) {

                datos =
                    datosAcademicosDocumentosCache[
                        String(idUsuario)
                    ];

            }


            if (
                !datos &&
                idMiembro
            ) {

                datos =
                    datosAcademicosDocumentosCache[
                        `miembro-${idMiembro}`
                    ];

            }


            if (datos) {

                aplicarDatosAcademicosADocumento(
                    documento,
                    datos
                );

            }

        });


    } catch (error) {

        console.error(
            "Error cargando datos académicos:",
            error
        );
    }
}


// ==========================================================
// OBTENER DATOS ACADÉMICOS DE UN MIEMBRO
// ==========================================================

function obtenerDatosAcademicosMiembroDocumentos(
    miembro
) {

    if (!miembro) {
        return {};
    }


    const idMiembro =
        miembro.id ??
        miembro.idMiembro ??
        miembro.id_miembro;


    const idUsuario =
        miembro.idUsuario ??
        miembro.id_usuario ??
        miembro.usuarioId;


    let datos = null;


    if (idUsuario) {

        datos =
            datosAcademicosDocumentosCache[
                String(idUsuario)
            ];

    }


    if (
        !datos &&
        idMiembro
    ) {

        datos =
            datosAcademicosDocumentosCache[
                `miembro-${idMiembro}`
            ];

    }


    /*
     * Si no hay datos en cache, buscar en documentos.
     * Esto solamente funciona para alumnos que ya tengan
     * algún documento.
     */

    if (
        !datos &&
        idMiembro
    ) {

        const documento =
            documentosPMO.find(function (doc) {

                return String(
                    doc.idMiembro || ""
                ) === String(
                    idMiembro || ""
                );

            });


        if (documento) {

            datos =
                documento.datosAcademicos ||
                {};

        }

    }


    if (
        typeof datos === "string"
    ) {

        try {

            datos =
                JSON.parse(datos);

        } catch (_) {

            datos = {};

        }

    }


    return {
        ...(datos || {}),

        nombreCompleto:
            datos?.nombreCompleto ||
            miembro.nombreCompleto ||
            miembro.nombre ||
            "",

        matricula:
            datos?.matricula ||
            miembro.matricula ||
            "",

        universidad:
            datos?.universidad ||
            miembro.universidad ||
            "",

        carrera:
            datos?.carrera ||
            miembro.carrera ||
            "",

        cuatrimestre:
            datos?.cuatrimestre ||
            miembro.cuatrimestre ||
            "",

        periodoEstadia:
            datos?.periodoEstadia ||
            datos?.periodo ||
            miembro.periodoEstadia ||
            miembro.periodo ||
            "",

        fechaInicio:
            datos?.fechaInicio ||
            datos?.fecha_inicio ||
            miembro.fechaInicio ||
            miembro.fecha_inicio ||
            null,

        fechaFin:
            datos?.fechaFin ||
            datos?.fecha_fin ||
            miembro.fechaFin ||
            miembro.fecha_fin ||
            null,

        horas:
            datos?.horas ||
            datos?.horasEstadia ||
            miembro.horas ||
            600,

        proyecto:
            datos?.proyecto ||
            datos?.proyectoTic ||
            miembro.proyecto ||
            ""
    };
}


// ==========================================================
// DETERMINAR SI ES ALUMNO
// ==========================================================

function esAlumnoDocumentos(miembro) {

    if (!miembro) {
        return false;
    }


    const rol =
        normalizarTextoDocumentos(
            miembro.rol?.nombre ||
            miembro.rol ||
            miembro.rolNombre ||
            miembro.nombreRol ||
            ""
        );


    /*
     * Roles que NO deben aparecer como alumnos.
     */
    if (
        [
            "administrador",
            "administrador pmo",
            "admin pmo",
            "admin_pmo",
            "superadministrador",
            "directivo escolar",
            "directivo",
            "director",
            "supervisor",
            "asesor academico",
            "asesor académico",
            "asesor empresarial",
            "asesor de empresa",
            "cliente",
            "consulta",
            "enlace universidad",
            "enlace de universidad",
            "enlace empresa",
            "enlace de empresa"
        ].includes(rol)
    ) {

        return false;
    }


    /*
     * Roles que identifican directamente a un alumno.
     */
    if (
        [
            "alumno",
            "colaborador",
            "estudiante",
            "alumna",
            "estudiante pmo"
        ].includes(rol)
    ) {

        return true;
    }


    /*
     * Buscar datos académicos relacionados con el miembro.
     */
    const datos =
        obtenerDatosAcademicosMiembroDocumentos(
            miembro
        );


    /*
     * Si tiene matrícula, se considera alumno.
     */
    if (
        datos?.matricula ||
        miembro.matricula ||
        miembro.matriculaAlumno ||
        miembro.matricula_alumno
    ) {

        return true;
    }


    /*
     * Si tiene datos académicos propios de un alumno,
     * también se considera alumno.
     */
    if (
        datos?.universidad ||
        datos?.carrera ||
        datos?.cuatrimestre ||
        datos?.periodoEstadia ||
        datos?.periodo ||
        datos?.fechaInicio ||
        datos?.fechaFin
    ) {

        return true;
    }


    return false;
}


// ==========================================================
// OBTENER NOMBRE DE PERSONA
// ==========================================================

function obtenerNombreMiembroDocumentos(
    miembro
) {

    if (!miembro) {
        return "Alumno sin nombre";
    }


    return (
        miembro.nombreCompleto ||
        miembro.nombre_completo ||
        [
            miembro.nombre,
            miembro.apellidoPaterno,
            miembro.apellidoMaterno
        ]
            .filter(Boolean)
            .join(" ") ||
        miembro.correo ||
        "Alumno sin nombre"
    );
}

function infoPeriodoAlumnoDocumentos(miembro) {
    const d=obtenerDatosAcademicosMiembroDocumentos(miembro)||{};
    return window.PMOPeriodos.clasificar({periodoEstadia:d.periodoEstadia||d.periodo||miembro?.periodoEstadia||miembro?.periodo,fechaInicio:d.fechaInicio||d.fecha_inicio||miembro?.fechaInicio||miembro?.fecha_inicio});
}
function obtenerPeriodoMiembroDocumentos(miembro) {return infoPeriodoAlumnoDocumentos(miembro).clave;}
function actualizarPeriodosDockDocumentos() {
    const dock=document.getElementById('periodosDock'),select=document.getElementById('anioExpedientes');if(!dock||!select)return;
    const todos=(miembrosPMO||[]).filter(esAlumnoDocumentos),anios=[...new Set(todos.map(a=>infoPeriodoAlumnoDocumentos(a).anio).filter(Boolean))].sort().reverse();
    select.innerHTML='<option value="">Todos los años</option>'+anios.map(a=>`<option value="${a}">${a}</option>`).join('');select.value=filtroAnioDocumentos;
    const alumnos=todos.filter(a=>!filtroAnioDocumentos||infoPeriodoAlumnoDocumentos(a).anio===filtroAnioDocumentos);
    const claves=[...window.PMOPeriodos.grupos,'sin-periodo'],nombres=[...window.PMOPeriodos.nombres,'Sin periodo académico'];
    dock.innerHTML=claves.map((clave,i)=>{const n=alumnos.filter(a=>(obtenerPeriodoMiembroDocumentos(a)||'sin-periodo')===clave).length;return `<button type="button" class="periodo-selector" data-periodo="${clave}" aria-pressed="${filtroPeriodoDocumentos===clave}"><strong>${nombres[i]}</strong><span>${n} ${n===1?'alumno':'alumnos'}</span></button>`;}).join('');
    dock.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{filtroPeriodoDocumentos=b.dataset.periodo;filtroPersonaDocumentosValor=filtroPeriodoDocumentos;filtroPersonaDocumentos.value=filtroPeriodoDocumentos;renderizarDocumentos();}));
}
document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('anioExpedientes')?.addEventListener('change',e=>{filtroAnioDocumentos=e.target.value;renderizarDocumentos();});
    document.getElementById('periodosTodos')?.addEventListener('click',()=>{filtroPeriodoDocumentos='';filtroPersonaDocumentosValor='';filtroPersonaDocumentos.value='';renderizarDocumentos();});
});
// ==========================================================
// OBTENER PERIODO DEL ALUMNO
// ==========================================================
function obtenerAlumnosFiltradosDocumentos() {

    let alumnos =
        (miembrosPMO || []).filter(
            function (alumno) {
                return esAlumnoDocumentos(alumno);
            }
        );


    /*
     * FILTRO POR PERIODO
     */

    if (filtroPeriodoDocumentos) {

        alumnos =
            alumnos.filter(
                function (alumno) {

                    const periodo =
                        obtenerPeriodoMiembroDocumentos(
                            alumno
                        ) || 'sin-periodo';

                    return (
                        normalizarTextoDocumentos(
                            periodo
                        ) ===
                        normalizarTextoDocumentos(
                            filtroPeriodoDocumentos
                        )
                    );

                }
            );

    }


    /*
     * FILTRO POR PERSONA
     */

    const idMiembro =
        obtenerIdMiembroDesdeFiltroDocumentos();


    if (idMiembro) {

        alumnos =
            alumnos.filter(
                function (alumno) {

                    const id =
                        alumno.idMiembro ??
                        alumno.id_miembro ??
                        alumno.idUsuario ??
                        alumno.id_usuario ??
                        alumno.id;


                    return (
                        String(id) ===
                        String(idMiembro)
                    );

                }
            );

    }


    /*
     * ORDENAR POR FECHA DE REGISTRO
     * Más reciente primero.
     */

    if(filtroAnioDocumentos)alumnos=alumnos.filter(a=>infoPeriodoAlumnoDocumentos(a).anio===filtroAnioDocumentos);
    alumnos.sort(
        function (a, b) {

            const fechaA =
                new Date(
                    a.fechaRegistro ||
                    a.fecha_registro ||
                    0
                ).getTime();


            const fechaB =
                new Date(
                    b.fechaRegistro ||
                    b.fecha_registro ||
                    0
                ).getTime();


            const tiempoA =
                Number.isNaN(fechaA)
                    ? 0
                    : fechaA;

            const tiempoB =
                Number.isNaN(fechaB)
                    ? 0
                    : fechaB;


            return tiempoB - tiempoA;

        }
    );


    return alumnos;
}

// ==========================================================
// ACTUALIZAR FILTRO DE PERSONAS
// ==========================================================

function actualizarFiltroPersonaDocumentos() {

    if (!filtroPersonaDocumentos) {
        return;
    }

    /*
     * Guardar el valor seleccionado actualmente
     * antes de reconstruir las opciones.
     */
    const valorActual =
        filtroPersonaDocumentosValor ||
        filtroPersonaDocumentos.value ||
        "";

    /*
     * Limpiar el select.
     */
    filtroPersonaDocumentos.innerHTML = "";

    /*
     * Todas las personas.
     */
    const opcionTodas =
        document.createElement("option");

    opcionTodas.value = "";
    opcionTodas.textContent = "Todos los periodos";

    filtroPersonaDocumentos.appendChild(
        opcionTodas
    );

    /*
     * Periodo enero - abril.
     */
    const opcionEnero =
        document.createElement("option");

    opcionEnero.value =
        "enero-abril";

    opcionEnero.textContent =
        "Enero - Abril";

    filtroPersonaDocumentos.appendChild(
        opcionEnero
    );

    /*
     * Periodo septiembre - diciembre.
     *
     * IMPORTANTE:
     * Este valor debe coincidir exactamente
     * con obtenerAlumnosFiltradosDocumentos().
     */
    const opcionSeptiembre =
        document.createElement("option");

    opcionSeptiembre.value =
        "septiembre-diciembre";

    opcionSeptiembre.textContent =
        "Septiembre - Diciembre";

    filtroPersonaDocumentos.appendChild(
        opcionSeptiembre
    );

    /*
     * Periodo mayo - agosto.
     */
    const opcionMayo =
        document.createElement("option");

    opcionMayo.value =
        "mayo-agosto";

    opcionMayo.textContent =
        "Mayo - Agosto";

    filtroPersonaDocumentos.appendChild(
        opcionMayo
    );

    filtroPersonaDocumentos.insertBefore(opcionMayo, opcionSeptiembre);
    const opcionSinPeriodo = document.createElement("option");
    opcionSinPeriodo.value = "sin-periodo"; opcionSinPeriodo.textContent = "Sin periodo académico";
    filtroPersonaDocumentos.appendChild(opcionSinPeriodo);

    /*
     * Restaurar el filtro seleccionado.
     */
    const opcionActual =
        Array.from(
            filtroPersonaDocumentos.options
        ).find(function (opcion) {
            return opcion.value === valorActual;
        });

    if (opcionActual) {

        filtroPersonaDocumentos.value =
            valorActual;

        filtroPersonaDocumentosValor =
            valorActual;

    } else {

        filtroPersonaDocumentos.value = "";

        filtroPersonaDocumentosValor = "";
        filtroPeriodoDocumentos = "";
    }
}

// ==========================================================
// OBTENER PERSONA SEGÚN FILTRO
// ==========================================================

function obtenerIdMiembroDesdeFiltroDocumentos() {

    const valor =
        filtroPersonaDocumentosValor || "";


    if (
        !valor.startsWith("persona-")
    ) {

        return null;
    }


    return valor.replace(
        "persona-",
        ""
    );
}


// ==========================================================
// OBTENER ALUMNOS FILTRADOS
// ==========================================================




// ==========================================================
// OBTENER DOCUMENTOS DE UN ALUMNO
// ==========================================================

function obtenerDocumentosAlumnoDocumentos(
    alumno
) {

    const idMiembro =
        alumno.id ??
        alumno.idMiembro ??
        alumno.id_miembro;


    const idUsuario =
        alumno.idUsuario ??
        alumno.id_usuario ??
        alumno.usuarioId;


    return documentosPMO.filter(
        function (documento) {

            return (
                (
                    idMiembro &&
                    String(
                        documento.idMiembro || ""
                    ) === String(idMiembro)
                ) ||
                (
                    idUsuario &&
                    String(
                        documento.idUsuario || ""
                    ) === String(idUsuario)
                )
            );

        }
    );
}


// ==========================================================
// OBTENER DOCUMENTO MÁS RECIENTE POR TIPO
// ==========================================================

function obtenerDocumentoPorTipoAlumno(
    alumno,
    tipo
) {

    const documentos =
        obtenerDocumentosAlumnoDocumentos(
            alumno
        )
        .filter(
            function (doc) {

                return (
                    normalizarTextoDocumentos(
                        doc.tipoDocumento
                    ) ===
                    normalizarTextoDocumentos(
                        tipo
                    )
                );

            }
        )
        .sort(
            function (a, b) {

                return (
                    obtenerFechaOrdenDocumento(b) -
                    obtenerFechaOrdenDocumento(a)
                );

            }
        );


    return documentos[0] || null;
}
// ==========================================================
// OBTENER CARTA DE ACEPTACIÓN GENERADA Y LIBERADA
// ==========================================================

// ==========================================================
// OBTENER CARTA DE ACEPTACIÓN GENERADA Y LIBERADA
// ==========================================================

function obtenerCartaAceptacionGeneradaAlumno(
    alumno
) {

    return obtenerDocumentosAlumnoDocumentos(
        alumno
    )
    .filter(
        function (documento) {

            const tipo =
                normalizarTextoDocumentos(
                    documento.tipoDocumento
                );


            if (
                tipo !==
                "carta de aceptacion"
            ) {

                return false;
            }


            const generado =
                documento.generadoAutomaticamente === true ||
                documento.generadoAutomaticamente === "true" ||
                documento.generado_automaticamente === true ||
                documento.generado_automaticamente === "true";


            if (!generado) {

                return false;
            }


            return (
                normalizarTextoDocumentos(
                    documento.estado
                ) ===
                "liberada"
            );

        }
    )
    .sort(
        function (a, b) {

            return (
                obtenerFechaOrdenDocumento(b) -
                obtenerFechaOrdenDocumento(a)
            );

        }
    )[0] || null;
}


// ==========================================================
// VERIFICAR CARTA DE ACEPTACIÓN GENERADA Y LIBERADA
// ==========================================================

function alumnoPuedeSubirCartaAceptacion() {

    const idUsuarioActual =
        obtenerIdUsuarioDocumentos();


    const idMiembroActual =
        obtenerIdMiembroSesionDocumentos();


    if (
        !idUsuarioActual &&
        !idMiembroActual
    ) {

        return false;
    }


    return documentosPMO.some(
        function (documento) {

            const tipo =
                normalizarTextoDocumentos(
                    documento.tipoDocumento
                );


            if (
                tipo !==
                "carta de aceptacion"
            ) {

                return false;
            }


            const perteneceAlUsuario =
                (
                    idUsuarioActual &&
                    String(
                        documento.idUsuario || ""
                    ) ===
                    String(
                        idUsuarioActual
                    )
                ) ||
                (
                    idMiembroActual &&
                    String(
                        documento.idMiembro || ""
                    ) ===
                    String(
                        idMiembroActual
                    )
                );


            if (!perteneceAlUsuario) {

                return false;
            }


            const estado =
                normalizarTextoDocumentos(
                    documento.estado
                );


            const liberada =
                estado ===
                "liberada";


            const generada =
                documento.generadoAutomaticamente === true ||
                documento.generadoAutomaticamente === "true" ||
                documento.generado_automaticamente === true ||
                documento.generado_automaticamente === "true";


            return (
                liberada &&
                generada
            );

        }
    );
}


// ==========================================================
// GUARDAR CARTA DE PRESENTACIÓN
// ==========================================================

async function guardarCartaPresentacion(
    event
) {

    event.preventDefault();


    if (
        !puedeSubirDocumentosPropios()
    ) {

        return;
    }


    const archivo =
        archivoPresentacion?.files?.[0];


    if (!archivo) {

        alert(
            "Selecciona el archivo PDF de la carta de presentación."
        );

        return;
    }


    const errorArchivo =
        validarArchivoPDF(
            archivo
        );


    if (errorArchivo) {

        alert(
            errorArchivo
        );

        return;
    }


    try {

        const base64 =
            await archivoABase64(
                archivo
            );


        const miembro =
            obtenerMiembroActualBasico();


        const datosAcademicos =
            obtenerDatosAcademicosDocumentos();


        const documento = {

            id:
                generarIdDocumento(),

            idUsuario:
                obtenerIdUsuarioDocumentos(),

            idMiembro:
                miembro.id,

            colaboradorNombre:
                obtenerNombreUsuarioDocumentos(),

            colaboradorCorreo:
                miembro.correo,

            tipoDocumento:
                "Carta de presentación",

            nombreArchivo:
                archivo.name,

            archivoBase64:
                base64,

            mimeType:
                archivo.type,

            estado:
                "Pendiente",

            observaciones:
                comentarioPresentacion?.value?.trim() ||
                "",

            fechaSubida:
                new Date().toISOString(),

            fechaRegistro:
                new Date().toISOString(),

            generadoAutomaticamente:
                false,

            datosAcademicos
        };


        await guardarDocumentoBackend(
            documento
        );


        documentosPMO.push(
            documento
        );


        guardarDocumentosStorage();


        cerrarModalDocumentos(
            modalSubirPresentacion
        );


        renderizarDocumentos();


        alert(
            "Carta de presentación enviada correctamente."
        );


    } catch (error) {

        console.error(
            error
        );


        alert(
            error.message ||
            "No fue posible guardar la carta de presentación."
        );
    }
}


// ==========================================================
// GUARDAR CARTA DE ACEPTACIÓN FIRMADA
// ==========================================================

async function guardarCartaAceptacion(
    event
) {

    event.preventDefault();


    if (
        !puedeSubirDocumentosPropios()
    ) {

        return;
    }


    /*
     * SEGURIDAD:
     * No permitir subida antes de que administración
     * genere y libere la carta.
     */

    if (
        !alumnoPuedeSubirCartaAceptacion()
    ) {

        alert(
            "No puedes subir la Carta de aceptación todavía. Primero debe ser generada y liberada por administración."
        );

        return;
    }


    const archivo =
        archivoAceptacion?.files?.[0];


    if (!archivo) {

        alert(
            "Selecciona la Carta de aceptación firmada en PDF."
        );

        return;
    }


    const errorArchivo =
        validarArchivoPDF(
            archivo
        );


    if (errorArchivo) {

        alert(
            errorArchivo
        );

        return;
    }


    try {

        const base64 =
            await archivoABase64(
                archivo
            );


        const miembro =
            obtenerMiembroActualBasico();


        const datosAcademicos =
            obtenerDatosAcademicosDocumentos();


        /*
         * IMPORTANTE:
         *
         * Esta es la versión FIRMADA.
         * No reemplaza la carta original generada.
         *
         * La carta original permanece como:
         * generadoAutomaticamente = true
         * estado = Liberada
         *
         * La firmada se registra como una nueva carga.
         */

        const documento = {

            id:
                generarIdDocumento(),

            idUsuario:
                obtenerIdUsuarioDocumentos(),

            idMiembro:
                miembro.id,

            colaboradorNombre:
                obtenerNombreUsuarioDocumentos(),

            colaboradorCorreo:
                miembro.correo,

            tipoDocumento:
                "Carta de aceptación",

            nombreArchivo:
                archivo.name,

            archivoBase64:
                base64,

            mimeType:
                archivo.type,

            estado:
                "Pendiente",

            observaciones:
                comentarioAceptacion?.value?.trim() ||
                "Carta de aceptación firmada cargada por el alumno.",

            fechaSubida:
                new Date().toISOString(),

            fechaRegistro:
                new Date().toISOString(),

            generadoAutomaticamente:
                false,

            datosAcademicos
        };


        await guardarDocumentoBackend(
            documento
        );


        documentosPMO.push(
            documento
        );


        guardarDocumentosStorage();


        cerrarModalDocumentos(
            modalSubirAceptacion
        );


        renderizarDocumentos();


        alert(
            "Carta de aceptación firmada enviada correctamente para revisión."
        );


    } catch (error) {

        console.error(
            error
        );


        alert(
            error.message ||
            "No fue posible guardar la Carta de aceptación firmada."
        );
    }
}


// ==========================================================
// GUARDAR CARTA DE TÉRMINO
// ==========================================================

async function guardarCartaTermino(
    event
) {

    event.preventDefault();


    if (
        !puedeSubirDocumentosPropios()
    ) {

        return;
    }


    const archivo =
        archivoTermino?.files?.[0];


    if (!archivo) {

        alert(
            "Selecciona la Carta de término en PDF."
        );

        return;
    }


    const errorArchivo =
        validarArchivoPDF(
            archivo
        );


    if (errorArchivo) {

        alert(
            errorArchivo
        );

        return;
    }


    try {

        const base64 =
            await archivoABase64(
                archivo
            );


        const miembro =
            obtenerMiembroActualBasico();


        const datosAcademicos =
            obtenerDatosAcademicosDocumentos();


        const documento = {

            id:
                generarIdDocumento(),

            idUsuario:
                obtenerIdUsuarioDocumentos(),

            idMiembro:
                miembro.id,

            colaboradorNombre:
                obtenerNombreUsuarioDocumentos(),

            colaboradorCorreo:
                miembro.correo,

            tipoDocumento:
                "Carta de término",

            nombreArchivo:
                archivo.name,

            archivoBase64:
                base64,

            mimeType:
                archivo.type,

            estado:
                "Pendiente",

            observaciones:
                comentarioTermino?.value?.trim() ||
                "",

            fechaSubida:
                new Date().toISOString(),

            fechaRegistro:
                new Date().toISOString(),

            generadoAutomaticamente:
                false,

            datosAcademicos
        };


        await guardarDocumentoBackend(
            documento
        );


        documentosPMO.push(
            documento
        );


        guardarDocumentosStorage();


        cerrarModalDocumentos(
            modalSubirTermino
        );


        renderizarDocumentos();


        alert(
            "Carta de término enviada correctamente."
        );


    } catch (error) {

        console.error(
            error
        );


        alert(
            error.message ||
            "No fue posible guardar la carta de término."
        );
    }
}


// ==========================================================
// GUARDAR DOCUMENTO EN BACKEND
// ==========================================================

async function guardarDocumentoBackend(
    documento
) {

    const respuesta =
        await fetch(
            API_DOCUMENTOS,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    ...obtenerHeadersDocumentos()
                },

                body:
                    JSON.stringify(
                        documento
                    )
            }
        );


    const cuerpo =
        await obtenerJSONDocumentos(
            respuesta
        );


    if (!respuesta.ok) {

        throw new Error(
            cuerpo.mensaje ||
            "El servidor no pudo guardar el documento."
        );
    }


    return cuerpo;
}


// ==========================================================
// CARGAR DATOS PARA GENERAR DOCUMENTO
// ==========================================================

function cargarDatosDocumentoSeleccionado() {

    const id =
        miembroLiberacion?.value ||
        "";


    if (!id) {

        limpiarCamposDocumentoGenerado();

        return;
    }


    const miembro =
        miembrosPMO.find(
            function (item) {

                const itemId =
                    item.id ??
                    item.idMiembro ??
                    item.id_miembro;


                return String(itemId) ===
                    String(id);

            }
        );


    if (!miembro) {

        limpiarCamposDocumentoGenerado();

        return;
    }


    const datos =
        obtenerDatosAcademicosMiembroDocumentos(
            miembro
        );


    if (docNombreCompleto) {

        docNombreCompleto.value =
            datos.nombreCompleto ||
            obtenerNombreMiembroDocumentos(
                miembro
            );

    }


    if (docMatricula) {

        docMatricula.value =
            datos.matricula ||
            "";

    }


    if (docUniversidad) {

        docUniversidad.value =
            datos.universidad ||
            "";

    }


    if (docCarrera) {

        docCarrera.value =
            datos.carrera ||
            "";

    }


    if (docCuatrimestre) {

        docCuatrimestre.value =
            datos.cuatrimestre ||
            "";

    }


    if (docPeriodo) {

        docPeriodo.value =
            datos.periodoEstadia ||
            "";

    }


   if (docFechaInicio) {

    docFechaInicio.value =
        datos.fechaInicio
            ? datos.fechaInicio.substring(0, 10)
            : "";

}


if (docFechaFin) {

    docFechaFin.value =
        datos.fechaFin
            ? datos.fechaFin.substring(0, 10)
            : "";

}


if (docHoras) {

    docHoras.value =
        datos.horas ||
        600;

}


if (docProyecto) {

    docProyecto.value =
        datos.proyecto ||
        "";

}
}


// ==========================================================
// GENERAR Y LIBERAR DOCUMENTO
// ==========================================================

async function guardarCartaLiberacion(event) {
    event.preventDefault();
    if (!puedeValidarDocumentos()) return;
    const id = miembroLiberacion?.value || "";
    const tipo = tipoLiberacion?.value || "";
    const miembro = miembrosPMO.find(m => String(m.id ?? m.idMiembro ?? m.id_miembro) === String(id));
    if (!miembro || !tipo) { alert("Selecciona un alumno y un tipo de documento."); return; }
    const boton = formLiberacion?.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;
    try {
        const resultado = await window.CartasLotePMO.generarParaAlumno(miembro,tipo,observacionLiberacion?.value || "");
        guardarDocumentosStorage(); cerrarModalDocumentos(modalLiberacion); renderizarDocumentos();
        alert(resultado.omitida ? "La carta ya estaba liberada para este periodo." : "Documento generado y liberado correctamente. Está disponible en la cuenta del alumno.");
    } catch (error) { alert(error.message || "No fue posible generar el documento."); }
    finally { if (boton) boton.disabled = false; }
}


// ==========================================================
// DOCUMENTO PERTENECE AL USUARIO
// ==========================================================

function documentoPerteneceAlUsuarioDocumentos(
    documento
) {

    const idUsuario =
        obtenerIdUsuarioDocumentos();


    const idMiembro =
        obtenerIdMiembroSesionDocumentos();


    return (
        (
            idUsuario &&
            String(
                documento.idUsuario || ""
            ) ===
            String(
                idUsuario
            )
        ) ||
        (
            idMiembro &&
            String(
                documento.idMiembro || ""
            ) ===
            String(
                idMiembro
            )
        )
    );
}


// ==========================================================
// OBTENER DOCUMENTOS DE ALUMNOS FILTRADOS
// ==========================================================

function obtenerDocumentosFiltradosPorAlumnos(
    alumnos
) {

    const idsMiembros =
        new Set();


    const idsUsuarios =
        new Set();


    alumnos.forEach(
        function (alumno) {

            const idMiembro =
                alumno.id ??
                alumno.idMiembro ??
                alumno.id_miembro;


            const idUsuario =
                alumno.idUsuario ??
                alumno.id_usuario ??
                alumno.usuarioId;


            if (idMiembro) {

                idsMiembros.add(
                    String(idMiembro)
                );

            }


            if (idUsuario) {

                idsUsuarios.add(
                    String(idUsuario)
                );

            }

        }
    );


    return documentosPMO.filter(
        function (documento) {

            return (
                (
                    documento.idMiembro &&
                    idsMiembros.has(
                        String(
                            documento.idMiembro
                        )
                    )
                ) ||
                (
                    documento.idUsuario &&
                    idsUsuarios.has(
                        String(
                            documento.idUsuario
                        )
                    )
                )
            );

        }
    );
}

function renderizarDocumentos() {
    renderizarResumenExpedientePersonal();
    configurarEncabezadoTablaMisDocumentos();

    if (!puedeValidarDocumentos()) {

        renderizarMisDocumentos();

        actualizarEstadisticasDocumentos(
            documentosPMO.filter(
                doc => documentoPerteneceAlUsuarioDocumentos(doc) && !esCertificadoCursoDocumento(doc)
            )
        );

        return;
    }

    const alumnos =
        obtenerAlumnosFiltradosDocumentos();

    actualizarPeriodosDockDocumentos();
    renderizarExpedientesPorPeriodo(alumnos);

    const documentos =
        obtenerDocumentosFiltradosPorAlumnos(alumnos).filter(doc => !esCertificadoCursoDocumento(doc));

    renderizarTablaMisDocumentosAdmin(
        documentos
    );

    renderizarTablaRevisionDocumentos(
        documentos
    );

    renderizarTablaLiberacionesDocumentos(
        documentos
    );

    actualizarEstadisticasDocumentos(
        documentos
    );
}


function configurarEncabezadoTablaMisDocumentos() {
    const encabezado = document.getElementById("encabezadoMisDocumentos");
    if (!encabezado) return;
    if (puedeValidarDocumentos()) {
        encabezado.innerHTML = "<th>Colaborador</th><th>Documento</th><th>Archivo</th><th>Estado</th><th>Fecha</th><th>Observaciones</th><th>Acciones</th>";
    } else {
        encabezado.innerHTML = "<th>Documento</th><th>Tipo</th><th>Estado</th><th>Fecha de carga</th><th>Observaciones</th><th>Acciones</th>";
    }
}

function renderizarResumenExpedientePersonal() {
    const contenedor = document.getElementById("resumenExpedientePersonal");
    if (!contenedor || esAdministradorDocumentos()) return;

    const idUsuario = obtenerIdUsuarioDocumentos();

    const miembro = miembroSesionPMO || miembrosPMO.find(function (item) {
        return idUsuario &&
            String(item.idUsuario || item.id_usuario || "") === String(idUsuario);
    }) || {};

    const datosSesion = obtenerDatosAcademicosDocumentos(idUsuario) || {};
    const datosMiembro = obtenerDatosAcademicosMiembroDocumentos(miembro) || {};
    const datos = {
        ...datosSesion,
        ...datosMiembro
    };

    const nombreMiembro = obtenerNombreMiembroDocumentos(miembro);
    const nombreLimpio = nombreMiembro === "Alumno sin nombre" ? "" : nombreMiembro;

    const nombre = escaparTextoDocumento(
        datos.nombreCompleto ||
        datos.nombre_completo ||
        nombreLimpio ||
        usuarioActivoDocumentos?.nombreCompleto ||
        usuarioActivoDocumentos?.nombre ||
        usuarioActivoDocumentos?.correo ||
        "Alumno"
    );

    const matricula = escaparTextoDocumento(
        datos.matricula ||
        usuarioActivoDocumentos?.matricula ||
        "Sin registrar"
    );

    const universidad = escaparTextoDocumento(datos.universidad || "Sin registrar");
    const carrera = escaparTextoDocumento(normalizarCarreraCarta(datos.carrera) || "Sin registrar");
    const cuatrimestre = escaparTextoDocumento(normalizarCuatrimestreCarta(datos.cuatrimestre) || "Sin registrar");
    const periodo = escaparTextoDocumento(datos.periodoEstadia || obtenerPeriodoLegibleDocumentos(datos) || "Sin registrar");

    contenedor.innerHTML = `<div class="record-summary">
        <div class="record-identity"><span class="record-avatar">●</span><div><strong>${nombre}</strong><small>Matrícula: ${matricula}</small></div></div>
        <div class="record-field"><b>Universidad:</b><span title="${universidad}">${universidad}</span></div>
        <div class="record-field"><b>Carrera:</b><span title="${carrera}">${carrera}</span></div>
        <div class="record-field"><b>Cuatrimestre:</b><span>${cuatrimestre}</span></div>
        <div class="record-field"><b>Periodo:</b><span title="${periodo}">${periodo}</span></div>
    </div>`;
}

function obtenerPeriodoLegibleDocumentos(datos) {
    const inicio = datos?.fechaInicio || datos?.fecha_inicio || "";
    const fecha = inicio ? new Date(inicio + (String(inicio).length === 10 ? "T12:00:00" : "")) : null;
    if (!fecha || Number.isNaN(fecha.getTime())) return "";
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();
    if (mes <= 4) return `Enero - Abril ${anio}`;
    if (mes <= 8) return `Mayo - Agosto ${anio}`;
    return `Septiembre - Diciembre ${anio}`;
}

function obtenerTipoVisualDocumento(documento) {
    const mime = String(documento?.mimeType || documento?.mime_type || "").toLowerCase();
    if (mime.includes("pdf")) return "PDF";
    if (documento?.generadoAutomaticamente === true || documento?.generado_automaticamente === true) return "Carta";
    return "Archivo";
}

function construirAccionesDocumentoBasicas(documento) {
    const id = escaparHTML(documento.id);
    return `<button type="button" class="btn-secondary" onclick="abrirVistaPreviaDocumento('${id}')">👁 Ver</button>
            <button type="button" class="btn-secondary" onclick="descargarDocumento('${id}')">Descargar</button>`;
}

function crearFilaDocumentoAlumnoHTML(documento) {
    const estado = documento.estado || "Pendiente";
    const claseEstado = obtenerClaseEstadoDocumento(estado);
    const documentoNombre = escaparHTML(documento.tipoDocumento || "Documento");
    const tipo = escaparHTML(obtenerTipoVisualDocumento(documento));
    const fecha = formatearFechaDocumento(documento.fechaSubida || documento.fechaRegistro);
    return `<tr>
        <td><strong>${documentoNombre}</strong></td>
        <td>${tipo}</td>
        <td><span class="status-badge ${claseEstado}">${escaparHTML(estado)}</span></td>
        <td>${fecha}</td>
        <td>${escaparHTML(documento.observaciones || "—")}</td>
        <td class="document-actions">${construirAccionesDocumentoBasicas(documento)}</td>
    </tr>`;
}

// ==========================================================
// RENDERIZAR MIS DOCUMENTOS
// ==========================================================

function esCertificadoCursoDocumento(doc) {
    return /^certificado de curso(?:\s*#\s*\d+)?$/i.test(String(doc.tipoDocumento ?? doc.tipo_documento ?? '').trim());
}

function renderizarMisDocumentos() {

    if (!tablaMisDocumentos) {
        return;
    }


    const documentos =
        documentosPMO.filter(
            doc => documentoPerteneceAlUsuarioDocumentos(doc) && !esCertificadoCursoDocumento(doc)
        )
        .sort(
            function (a, b) {

                return (
                    obtenerFechaOrdenDocumento(b) -
                    obtenerFechaOrdenDocumento(a)
                );

            }
        );


    if (!documentos.length) {

        tablaMisDocumentos.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No tienes documentos registrados.
                </td>
            </tr>
        `;

        return;
    }


    tablaMisDocumentos.innerHTML =
        documentos
            .map(
                function (documento) {

                    return crearFilaDocumentoAlumnoHTML(documento);

                }
            )
            .join("");
}


// ==========================================================
// RENDERIZAR TABLA DE REVISIÓN
// ==========================================================

function renderizarTablaRevisionDocumentos(
    documentos
) {

    if (!tablaRevisionDocumentos) {
        return;
    }


    const lista =
        documentos
            .slice()
            .sort(
                function (a, b) {

                    /*
                     * IMPORTANTE:
                     * El orden principal es la fecha
                     * de registro del alumno.
                     *
                     * Si no está disponible, se usa
                     * como respaldo la fecha del documento.
                     */

                    const miembroA =
                        miembrosPMO.find(
                            function (miembro) {

                                return (
                                    String(
                                        miembro.id ??
                                        miembro.idMiembro ??
                                        ""
                                    ) ===
                                    String(
                                        a.idMiembro ||
                                        ""
                                    )
                                );

                            }
                        );


                    const miembroB =
                        miembrosPMO.find(
                            function (miembro) {

                                return (
                                    String(
                                        miembro.id ??
                                        miembro.idMiembro ??
                                        ""
                                    ) ===
                                    String(
                                        b.idMiembro ||
                                        ""
                                    )
                                );

                            }
                        );


                    const fechaA =
                        miembroA?.fechaRegistro ||
                        miembroA?.fecha_registro ||
                        a.fechaRegistro ||
                        a.fechaSubida ||
                        0;


                    const fechaB =
                        miembroB?.fechaRegistro ||
                        miembroB?.fecha_registro ||
                        b.fechaRegistro ||
                        b.fechaSubida ||
                        0;


                    const tiempoA =
                        new Date(
                            fechaA
                        ).getTime();


                    const tiempoB =
                        new Date(
                            fechaB
                        ).getTime();


                    return (
                        (Number.isNaN(tiempoA)
                            ? 0
                            : tiempoA) -
                        (Number.isNaN(tiempoB)
                            ? 0
                            : tiempoB)
                    );

                }
            );


    if (!lista.length) {

        tablaRevisionDocumentos.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No hay documentos para mostrar.
                </td>
            </tr>
        `;

        return;
    }


    tablaRevisionDocumentos.innerHTML =
        lista
            .map(
                function (documento) {

                    return crearFilaDocumentoHTML(
                        documento,
                        true
                    );

                }
            )
            .join("");
}


// ==========================================================
// RENDERIZAR TABLA DE LIBERACIONES
// ==========================================================

function renderizarTablaLiberacionesDocumentos(
    documentos
) {

    if (!tablaLiberaciones) {
        return;
    }


    const lista =
        documentos
            .filter(
                function (documento) {

                    return (
                        normalizarTextoDocumentos(
                            documento.estado
                        ) ===
                        "liberada"
                    );

                }
            )
            .sort(
                function (a, b) {

                    return (
                        obtenerFechaOrdenDocumento(b) -
                        obtenerFechaOrdenDocumento(a)
                    );

                }
            );


    if (!lista.length) {

        tablaLiberaciones.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No hay documentos liberados.
                </td>
            </tr>
        `;

        return;
    }


    tablaLiberaciones.innerHTML =
        lista
            .map(
                function (documento) {

                    return crearFilaDocumentoHTML(
                        documento,
                        false
                    );

                }
            )
            .join("");
}


// ==========================================================
// RENDERIZAR TABLA PRINCIPAL DEL ADMIN
// ==========================================================
function obtenerFechaRegistroAlumnoDocumentos(documento) {

    if (!documento) {
        return 0;
    }

    // Primero intenta obtener la fecha directamente del documento
    const fechaDocumento =
        documento.fechaRegistro ||
        documento.fecha_registro;

    // Si el documento ya tiene la fecha de registro del alumno,
    // se utiliza esa fecha.
    if (fechaDocumento) {

        const tiempo =
            new Date(fechaDocumento).getTime();

        if (!Number.isNaN(tiempo)) {
            return tiempo;
        }
    }

    // Buscar al alumno relacionado con el documento
    const idUsuario =
        documento.idUsuario ||
        documento.id_usuario;

    const idMiembro =
        documento.idMiembro ||
        documento.id_miembro;

    let miembro = null;

    if (idUsuario) {

        miembro = miembrosPMO.find(function (item) {

            return String(
                item.idUsuario || item.id_usuario || item.id
            ) === String(idUsuario);

        });

    }

    if (!miembro && idMiembro) {

        miembro = miembrosPMO.find(function (item) {

            return String(
                item.idMiembro ||
                item.id_miembro ||
                item.id
            ) === String(idMiembro);

        });

    }

    if (miembro) {

        const fechaRegistro =
            miembro.fechaRegistro ||
            miembro.fecha_registro;

        if (fechaRegistro) {

            const tiempo =
                new Date(fechaRegistro).getTime();

            if (!Number.isNaN(tiempo)) {
                return tiempo;
            }
        }
    }

    return obtenerFechaOrdenDocumento(documento);
}

function renderizarTablaMisDocumentosAdmin(
    documentos
) {

    if (!tablaMisDocumentos) {
        return;
    }


    if (!documentos.length) {

        tablaMisDocumentos.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No hay documentos registrados para los filtros seleccionados.
                </td>
            </tr>
        `;

        return;
    }


    tablaMisDocumentos.innerHTML =
        documentos
            .slice()
            .sort(
    function (a, b) {

        return (
            obtenerFechaRegistroAlumnoDocumentos(a) -
            obtenerFechaRegistroAlumnoDocumentos(b)
        );

    }
)
            .map(
                function (documento) {

                    return crearFilaDocumentoHTML(
                        documento,
                        true
                    );

                }
            )
            .join("");
}


// ==========================================================
// CREAR FILA DE DOCUMENTO
// ==========================================================

function crearFilaDocumentoHTML(
    documento,
    mostrarRevision
) {

    const estado =
        documento.estado ||
        "Pendiente";


    const claseEstado =
        obtenerClaseEstadoDocumento(
            estado
        );


    const nombre =
        escaparHTML(
            documento.colaboradorNombre ||
            "Alumno"
        );


    const tipo =
        escaparHTML(
            documento.tipoDocumento ||
            "Documento"
        );


    const archivo =
        escaparHTML(
            documento.nombreArchivo ||
            "Sin archivo"
        );


    const fecha =
        formatearFechaDocumento(
            documento.fechaRegistro ||
            documento.fechaSubida
        );


    const id =
        escaparHTML(
            documento.id
        );


    const generado =
        documento.generadoAutomaticamente === true ||
        documento.generadoAutomaticamente === "true" ||
        documento.generado_automaticamente === true ||
        documento.generado_automaticamente === "true";


    let acciones = `
        <button
            type="button"
            class="btn-secondary"
            onclick="abrirVistaPreviaDocumento('${id}')">
            Ver
        </button>

        <button
            type="button"
            class="btn-secondary"
            onclick="descargarDocumento('${id}')">
            Descargar
        </button>
    `;


    if (
        mostrarRevision &&
        puedeValidarDocumentos()
    ) {

        if (
            normalizarTextoDocumentos(
                estado
            ) ===
            "pendiente"
        ) {

            acciones += `
                <button
                    type="button"
                    class="btn-primary"
                    onclick="abrirRevisionDocumento('${id}', 'Aceptado')">
                    Aceptar
                </button>

                <button
                    type="button"
                    class="btn-danger"
                    onclick="abrirRevisionDocumento('${id}', 'Rechazado')">
                    Rechazar
                </button>
            `;

        }

    }


    if (
        puedeEliminarDocumentos()
    ) {

        acciones += `
            <button
                type="button"
                class="btn-danger"
                onclick="eliminarDocumento('${id}')">
                Eliminar
            </button>
        `;

    }


    const etiquetaGenerado =
        generado
            ? `
                <span class="document-generated-label">
                    Generado por sistema
                </span>
              `
            : "";


    return `
        <tr>

            <td>
                <strong>
                    ${nombre}
                </strong>

                ${etiquetaGenerado}
            </td>

            <td>
                ${tipo}
            </td>

            <td>
                ${archivo}
            </td>

            <td>
                <span class="status-badge ${claseEstado}">
                    ${escaparHTML(estado)}
                </span>
            </td>

            <td>
                ${fecha}
            </td>

            <td>
                ${escaparHTML(
                    documento.observaciones || "—"
                )}
            </td>

            <td class="document-actions">
                ${acciones}
            </td>

        </tr>
    `;
}


// ==========================================================
// ESTADÍSTICAS
// ==========================================================

function actualizarEstadisticasDocumentos(
    documentos
) {

    const total =
        documentos.length;


    const pendientes =
        documentos.filter(
            function (doc) {

                return (
                    normalizarTextoDocumentos(
                        doc.estado
                    ) ===
                    "pendiente"
                );

            }
        ).length;


    const aceptados =
        documentos.filter(
            function (doc) {

                return (
                    normalizarTextoDocumentos(
                        doc.estado
                    ) ===
                    "aceptado"
                );

            }
        ).length;


    const liberaciones =
        documentos.filter(
            function (doc) {

                return (
                    normalizarTextoDocumentos(
                        doc.estado
                    ) ===
                    "liberada"
                );

            }
        ).length;


    if (totalDocumentos) {

        totalDocumentos.textContent =
            total;

    }


    if (totalPendientes) {

        totalPendientes.textContent =
            pendientes;

    }


    if (totalAceptados) {

        totalAceptados.textContent =
            aceptados;

    }


    if (totalLiberaciones) {

        totalLiberaciones.textContent =
            liberaciones;

    }
}


// ==========================================================
// STORAGE LOCAL
// ==========================================================

function guardarDocumentosStorage() {

    try {

        localStorage.setItem(
            CLAVE_DOCUMENTOS_PMO,
            JSON.stringify(
                documentosPMO
            )
        );

    } catch (error) {

        console.warn(
            "No fue posible guardar documentos en caché local:",
            error
        );

    }
}


// ==========================================================
// CARGAR DOCUMENTOS DESDE STORAGE
// ==========================================================

function cargarDocumentosStorage() {

    try {

        const datos =
            JSON.parse(
                localStorage.getItem(
                    CLAVE_DOCUMENTOS_PMO
                )
            );


        if (
            Array.isArray(datos)
        ) {

            documentosPMO =
                datos;

        } else {

            documentosPMO =
                [];

        }

    } catch (error) {

        documentosPMO =
            [];

    }
}


// Cada alumno conserva su expediente, aunque todavía no haya subido archivos.
function renderizarExpedientesPorPeriodo(alumnos) {
    const contenedor = document.getElementById("listaExpedientesPeriodo");
    if (!contenedor) return;
    const periodos=new Map();
    alumnos.slice().sort((a,b)=>{const pa=infoPeriodoAlumnoDocumentos(a),pb=infoPeriodoAlumnoDocumentos(b);return pb.anio.localeCompare(pa.anio)||window.PMOPeriodos.grupos.indexOf(pa.clave)-window.PMOPeriodos.grupos.indexOf(pb.clave);}).forEach(alumno=>{const p=infoPeriodoAlumnoDocumentos(alumno);periodos.set(p.clave+'|'+p.anio,p.nombre+(p.anio?' · '+p.anio:''));});
    if (!alumnos.length) {
        contenedor.innerHTML = '<p class="empty-state">No hay alumnos con datos académicos correspondientes al periodo seleccionado.</p>';
        return;
    }
    contenedor.innerHTML = [...periodos].map(([clave, titulo],indice) => {
        const grupo = alumnos.filter(alumno => infoPeriodoAlumnoDocumentos(alumno).clave+"|"+infoPeriodoAlumnoDocumentos(alumno).anio === clave);
        if (!grupo.length) return "";
        return `<details class="expedientes-periodo" name="periodo-expedientes" ${indice===0?"open":""}><summary>${titulo} · ${grupo.length} ${grupo.length===1?'alumno':'alumnos'}</summary>${grupo.map(alumno => {
            const datos = obtenerDatosAcademicosMiembroDocumentos(alumno);
            const documentos = obtenerDocumentosAlumnoDocumentos(alumno).slice().sort((a,b)=>obtenerFechaOrdenDocumento(b)-obtenerFechaOrdenDocumento(a));
            const e = escaparTextoDocumento;
            const idMiembro = alumno.id ?? alumno.idMiembro ?? alumno.id_miembro ?? "";
            const nombre = e(obtenerNombreMiembroDocumentos(alumno));
            const matricula = e(datos.matricula || "Sin registrar");
            const universidad = e(datos.universidad || "Sin registrar");
            const carrera = e(normalizarCarreraCarta(datos.carrera) || "Sin registrar");
            const cuatrimestre = e(normalizarCuatrimestreCarta(datos.cuatrimestre) || "Sin registrar");
            const periodo = e(datos.periodoEstadia || titulo);
            return `<details class="expediente-alumno" name="expediente-activo">
                <summary>
                    <span class="expediente-summary-id"><span class="record-avatar">●</span><span><strong>${nombre}</strong><small>Matrícula: ${matricula}</small></span></span>
                    <span class="expediente-summary-actions">
                        <button type="button" class="btn-generate-acceptance" onclick="event.preventDefault();event.stopPropagation();abrirLiberacionParaAlumno('${e(idMiembro)}','Carta de aceptación')">▣ Generar Carta de Aceptación</button>
                        <button type="button" class="btn-generate-end" onclick="event.preventDefault();event.stopPropagation();abrirLiberacionParaAlumno('${e(idMiembro)}','Carta de término')">▣ Generar Carta de Terminación</button>
                    </span>
                </summary>
                <div class="expediente-profile">
                    <div><b>Universidad:</b><span>${universidad}</span></div>
                    <div><b>Carrera:</b><span>${carrera}</span></div>
                    <div><b>Cuatrimestre:</b><span>${cuatrimestre}</span></div>
                    <div><b>Periodo:</b><span>${periodo}</span></div>
                </div>
                <div class="expediente-table">
                    <h4>Documentos del expediente</h4>
                    ${documentos.length ? `<div class="table-wrapper"><table><thead><tr><th>Documento</th><th>Archivo</th><th>Estado</th><th>Fecha de carga</th><th>Observaciones</th><th>Acciones</th></tr></thead><tbody>${documentos.map(doc => crearFilaDocumentoExpedienteAdminHTML(doc)).join("")}</tbody></table></div>` : '<p class="empty-state">Este alumno todavía no tiene documentos registrados.</p>'}
                </div>
            </details>`;
        }).join("")}</details>`;
    }).join("");
}

function crearFilaDocumentoExpedienteAdminHTML(documento) {
    const estado = documento.estado || "Pendiente";
    const claseEstado = obtenerClaseEstadoDocumento(estado);
    const id = escaparHTML(documento.id);
    let acciones = construirAccionesDocumentoBasicas(documento);
    if (puedeValidarDocumentos() && normalizarTextoDocumentos(estado) === "pendiente") {
        acciones += `<button type="button" class="btn-primary" onclick="abrirRevisionDocumento('${id}','Aceptado')">Aceptar</button><button type="button" class="btn-danger" onclick="abrirRevisionDocumento('${id}','Rechazado')">Rechazar</button>`;
    }
    if (puedeEliminarDocumentos()) acciones += `<button type="button" class="btn-danger" onclick="eliminarDocumento('${id}')">Eliminar</button>`;
    return `<tr><td><strong>${escaparHTML(documento.tipoDocumento || "Documento")}</strong></td><td>${escaparHTML(documento.nombreArchivo || "Sin archivo")}</td><td><span class="status-badge ${claseEstado}">${escaparHTML(estado)}</span></td><td>${formatearFechaDocumento(documento.fechaSubida || documento.fechaRegistro)}</td><td>${escaparHTML(documento.observaciones || "—")}</td><td class="document-actions">${acciones}</td></tr>`;
}

async function abrirLiberacionParaAlumno(idMiembro, tipoDocumento) {
    if (!puedeValidarDocumentos()) return;
    llenarSelectLiberacion();
    limpiarFormularioLiberacion();
    if (miembroLiberacion) miembroLiberacion.value = String(idMiembro || "");
    if (tipoLiberacion) tipoLiberacion.value = tipoDocumento || "";
    try { await cargarDatosDocumentoSeleccionado(); } catch (error) { console.warn(error); }
    actualizarTextoTipoDocumento();
    abrirModalDocumentos(modalLiberacion);
}
