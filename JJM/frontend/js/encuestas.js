const API_ENCUESTAS =
    window.apiUrl("/api/encuestas");

const API_PROYECTOS =
    window.apiUrl("/api/encuestas/proyectos-disponibles");

let usuarioActivo = obtenerUsuarioActivo();
let encuestas = [];
let proyectosEncuestas = [];

const contenedorEncuestas =
    document.getElementById("contenedorEncuestas");

const promedioCalificacion =
    document.getElementById("promedioCalificacion");

const btnNuevaEncuesta =
    document.getElementById("btnNuevaEncuesta");

const modalEncuesta =
    document.getElementById("modalEncuesta");

const btnCerrarModal =
    document.getElementById("btnCerrarModal");

const btnCancelar =
    document.getElementById("btnCancelar");

const formEncuesta =
    document.getElementById("formEncuesta");

let proyectoEncuesta =
    document.getElementById("proyectoEncuesta");

const tipoEncuesta =
    document.getElementById("tipoEncuesta");

const calificacionEncuesta =
    document.getElementById("calificacionEncuesta");

const nombreEncuestado =
    document.getElementById("nombreEncuestado");

const emailEncuestado =
    document.getElementById("emailEncuestado");

const comentarioEncuesta =
    document.getElementById("comentarioEncuesta");

const videoUrl =
    document.getElementById("videoUrl");

const videoPreviewBox =
    document.getElementById("videoPreviewBox");

const videoPreview =
    document.getElementById("videoPreview");

const consentimientoBox =
    document.getElementById("consentimientoBox");

const videoConsentimiento =
    document.getElementById("videoConsentimiento");

const mensajeConsentimiento =
    document.getElementById("mensajeConsentimiento");

const btnAutoriza =
    document.getElementById("btnAutoriza");

const btnNoAutoriza =
    document.getElementById("btnNoAutoriza");

/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {
        usuarioActivo = obtenerUsuarioActivo();

        configurarEventos();
        configurarVistaPorRol();

        await cargarProyectosParaEncuesta();
        await cargarEncuestasDesdeAPI();
    }
);

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    if (btnNuevaEncuesta) {
        btnNuevaEncuesta.addEventListener(
            "click",
            abrirModal
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

    if (formEncuesta) {
        formEncuesta.addEventListener(
            "submit",
            guardarEncuesta
        );
    }

    if (modalEncuesta) {
        modalEncuesta.addEventListener(
            "click",
            function (event) {
                if (event.target === modalEncuesta) {
                    cerrarModal();
                }
            }
        );
    }

    if (videoUrl) {
        videoUrl.addEventListener(
            "input",
            function () {
                mostrarPreviewVideo(
                    videoUrl.value.trim()
                );
            }
        );
    }

    if (btnAutoriza) {
        btnAutoriza.addEventListener(
            "click",
            function () {
                seleccionarConsentimientoVideo(
                    "Autorizado"
                );
            }
        );
    }

    if (btnNoAutoriza) {
        btnNoAutoriza.addEventListener(
            "click",
            function () {
                seleccionarConsentimientoVideo(
                    "No autorizado"
                );
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

function obtenerNombreUsuarioActivo() {
    if (!usuarioActivo) {
        return "";
    }

    return usuarioActivo.nombreCompleto ||
        usuarioActivo.nombre ||
        "";
}

function obtenerCorreoUsuarioActivo() {
    if (!usuarioActivo) {
        return "";
    }

    return usuarioActivo.correo ||
        usuarioActivo.email ||
        "";
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
    if (window.PMOPermisos && window.PMOPermisos.tiene("encuestas.ver_todas")) return true;

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


function puedeGestionarEncuestas() {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene("encuestas.gestionar"));
}
function puedeEliminarEncuestas() {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene("encuestas.eliminar"));
}

function esClienteOConsulta() {
    const rol = normalizarTexto(
        obtenerNombreRolUsuario()
    );

    return rol === "cliente" ||
        rol === "consulta" ||
        rol === "usuario consulta" ||
        rol === "usuario de consulta" ||
        rol === "enlace universidad" ||
        rol === "enlace de universidad" ||
        rol === "enlace empresa" ||
        rol === "enlace de empresa";
}

function obtenerHeadersSesion(conJson = false) {
    const idUsuario =
        obtenerIdUsuarioActivo();

    const headers = {};

    if (idUsuario) {
        headers["X-Usuario-Id"] = String(idUsuario);
    }

    if (conJson) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

function configurarVistaPorRol() {
    if (!btnNuevaEncuesta) {
        return;
    }

    if (!usuarioActivo) {
        btnNuevaEncuesta.style.display = "none";
        return;
    }

    /*
       Los usuarios operativos pueden crear sus propias encuestas.
       Un perfil con consulta global (por ejemplo Supervisor) solo puede
       crear si además tiene el permiso explícito encuestas.gestionar.
    */
    if (esAdministrador()) {
        btnNuevaEncuesta.style.display = puedeGestionarEncuestas() ? "inline-flex" : "none";
    } else {
        btnNuevaEncuesta.style.display = "inline-flex";
    }
}

/* =========================================================
   CONSULTAS API
========================================================= */

async function cargarEncuestasDesdeAPI() {
    mostrarCargaEncuestas();

    if (!usuarioActivo) {
        mostrarErrorEncuestas(
            "Debes iniciar sesión para consultar o responder encuestas."
        );
        actualizarPromedio();
        return;
    }

    try {
        const respuesta = await fetch(
            API_ENCUESTAS,
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
                "No fue posible cargar las encuestas."
            );
        }

        encuestas = extraerArreglo(
            datos,
            ["encuestas", "data"]
        ).map(normalizarEncuesta);

        mostrarEncuestas();
        actualizarPromedio();

    } catch (error) {
        console.error(
            "Error al cargar encuestas:",
            error
        );

        mostrarErrorEncuestas(
            error.message ||
            "No fue posible conectar con el servicio de encuestas."
        );

        encuestas = [];
        actualizarPromedio();
    }
}

async function cargarProyectosParaEncuesta() {
    if (!usuarioActivo || !proyectoEncuesta) {
        return;
    }

    try {
        const respuesta = await fetch(
            API_PROYECTOS,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(
            respuesta
        );

        if (!respuesta.ok) {
            return;
        }

        proyectosEncuestas = extraerArreglo(
            datos,
            ["proyectos", "data"]
        ).map(function (proyecto) {
            return {
                id: proyecto.id ||
                    proyecto.idProyecto ||
                    "",
                nombre: proyecto.nombre ||
                    proyecto.titulo ||
                    "Proyecto sin nombre"
            };
        });

        llenarSelectorProyectos();

    } catch (error) {
        console.warn(
            "No fue posible cargar proyectos para encuestas:",
            error
        );
    }
}

function llenarSelectorProyectos() {
    if (!proyectoEncuesta) {
        return;
    }

    if (
        proyectoEncuesta.tagName.toLowerCase() !==
        "select"
    ) {
        convertirCampoProyectoEnSelect();
    }

    const valorAnterior =
        proyectoEncuesta.value;

    proyectoEncuesta.innerHTML = `
        <option value="">
            Selecciona un proyecto
        </option>
    `;

    if (proyectosEncuestas.length === 0) {
        const opcion = document.createElement("option");
        opcion.value = "";
        opcion.textContent = "No hay proyectos disponibles";
        proyectoEncuesta.appendChild(opcion);
        return;
    }

    proyectosEncuestas.forEach(function (proyecto) {
        const opcion =
            document.createElement("option");

        opcion.value = proyecto.id;
        opcion.textContent = proyecto.nombre;

        proyectoEncuesta.appendChild(opcion);
    });

    proyectoEncuesta.value = valorAnterior;
}

function convertirCampoProyectoEnSelect() {
    if (!proyectoEncuesta) {
        return;
    }

    const select = document.createElement("select");

    select.id = proyectoEncuesta.id;
    select.name = proyectoEncuesta.name || "proyectoEncuesta";
    select.className = proyectoEncuesta.className || "";
    select.required = proyectoEncuesta.required;

    if (proyectoEncuesta.parentNode) {
        proyectoEncuesta.parentNode.replaceChild(
            select,
            proyectoEncuesta
        );

        proyectoEncuesta = select;
    }
}

async function guardarEncuesta(event) {
    event.preventDefault();

    if (!usuarioActivo) {
        alert(
            "Debes iniciar sesión para registrar una encuesta."
        );
        return;
    }

    const datosEncuesta =
        construirPayloadEncuesta();

    if (!datosEncuesta.proyecto) {
        alert("El proyecto es obligatorio.");
        return;
    }

    if (
        datosEncuesta.calificacion < 1 ||
        datosEncuesta.calificacion > 5
    ) {
        alert(
            "La calificación debe estar entre 1 y 5."
        );
        return;
    }

    try {
        cambiarEstadoFormulario(true);

        const respuesta = await fetch(
            API_ENCUESTAS,
            {
                method: "POST",
                headers: obtenerHeadersSesion(true),
                body: JSON.stringify(datosEncuesta)
            }
        );

        const datos = await obtenerRespuestaJSON(
            respuesta
        );

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible guardar la encuesta."
            );
        }

        cerrarModal();
        await cargarEncuestasDesdeAPI();

        alert(
            datos.mensaje ||
            "Encuesta registrada correctamente."
        );

    } catch (error) {
        console.error(
            "Error al guardar encuesta:",
            error
        );

        alert(
            error.message ||
            "No fue posible guardar la encuesta."
        );

    } finally {
        cambiarEstadoFormulario(false);
    }
}

async function eliminarEncuesta(idEncuesta) {
    if (!esAdministrador() || !puedeEliminarEncuestas()) {
        alert(
            "Solo un administrador puede eliminar encuestas."
        );
        return;
    }

    const confirmar = confirm(
        "¿Deseas eliminar esta encuesta? Esta acción no se puede deshacer."
    );

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_ENCUESTAS}/${idEncuesta}`,
            {
                method: "DELETE",
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(
            respuesta
        );

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible eliminar la encuesta."
            );
        }

        await cargarEncuestasDesdeAPI();

    } catch (error) {
        console.error(
            "Error al eliminar encuesta:",
            error
        );

        alert(
            error.message ||
            "No fue posible eliminar la encuesta."
        );
    }
}

window.eliminarEncuesta = eliminarEncuesta;

/* =========================================================
   NORMALIZACIÓN Y PAYLOAD
========================================================= */

function construirPayloadEncuesta() {
    const proyectoInfo =
        obtenerProyectoSeleccionado();

    return {
        idProyecto: proyectoInfo.idProyecto,
        proyecto: proyectoInfo.nombreProyecto,
        tipo: tipoEncuesta?.value ||
            "Satisfacción",
        calificacion: Number(
            calificacionEncuesta?.value || 5
        ),
        nombreEncuestado:
            nombreEncuestado?.value.trim() ||
            obtenerNombreUsuarioActivo(),
        emailEncuestado:
            emailEncuestado?.value.trim() ||
            obtenerCorreoUsuarioActivo(),
        comentario:
            comentarioEncuesta?.value.trim() ||
            "",
        videoUrl:
            videoUrl?.value.trim() ||
            "",
        consentimientoVideo:
            videoConsentimiento?.value ||
            ""
    };
}

function obtenerProyectoSeleccionado() {
    if (!proyectoEncuesta) {
        return {
            idProyecto: null,
            nombreProyecto: ""
        };
    }

    if (
        proyectoEncuesta.tagName.toLowerCase() ===
        "select"
    ) {
        const opcion =
            proyectoEncuesta.options[
                proyectoEncuesta.selectedIndex
            ];

        return {
            idProyecto: proyectoEncuesta.value
                ? Number(proyectoEncuesta.value)
                : null,
            nombreProyecto: opcion
                ? opcion.textContent.trim()
                : ""
        };
    }

    return {
        idProyecto: null,
        nombreProyecto:
            proyectoEncuesta.value.trim()
    };
}

function normalizarEncuesta(encuesta) {
    return {
        id: encuesta.id ||
            encuesta.idEncuesta ||
            "",
        idProyecto: encuesta.idProyecto ||
            null,
        idUsuarioCliente:
            encuesta.idUsuarioCliente ||
            null,
        proyecto:
            encuesta.proyecto ||
            "Proyecto sin nombre",
        tipo:
            encuesta.tipo ||
            "Satisfacción",
        calificacion:
            Number(encuesta.calificacion || 0),
        nombre:
            encuesta.nombre ||
            encuesta.nombreEncuestado ||
            "",
        email:
            encuesta.email ||
            encuesta.emailEncuestado ||
            "",
        comentario:
            encuesta.comentario ||
            "",
        video:
            encuesta.video ||
            encuesta.videoUrl ||
            "",
        consentimiento:
            encuesta.consentimiento ||
            encuesta.consentimientoVideo ||
            "",
        fechaCreacion:
            encuesta.fechaCreacion ||
            ""
    };
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

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

/* =========================================================
   MODAL
========================================================= */

function abrirModal() {
    if (!usuarioActivo) {
        alert(
            "Debes iniciar sesión para responder una encuesta."
        );
        return;
    }

    if (!formEncuesta || !modalEncuesta) {
        return;
    }

    formEncuesta.reset();

    if (calificacionEncuesta) {
        calificacionEncuesta.value = "5";
    }

    if (nombreEncuestado && !nombreEncuestado.value) {
        nombreEncuestado.value =
            obtenerNombreUsuarioActivo();
    }

    if (emailEncuestado && !emailEncuestado.value) {
        emailEncuestado.value =
            obtenerCorreoUsuarioActivo();
    }

    if (videoConsentimiento) {
        videoConsentimiento.value = "";
    }

    if (videoPreview) {
        videoPreview.src = "";
    }

    if (videoPreviewBox) {
        videoPreviewBox.style.display = "none";
    }

    if (consentimientoBox) {
        consentimientoBox.style.display = "none";
    }

    if (btnAutoriza) {
        btnAutoriza.classList.remove("active-green");
    }

    if (btnNoAutoriza) {
        btnNoAutoriza.classList.remove("active-red");
    }

    if (mensajeConsentimiento) {
        mensajeConsentimiento.textContent = "";
    }

    modalEncuesta.classList.add("show");
}

function cerrarModal() {
    if (modalEncuesta) {
        modalEncuesta.classList.remove("show");
    }

    if (formEncuesta) {
        formEncuesta.reset();
    }
}

function cambiarEstadoFormulario(bloqueado) {
    if (!formEncuesta) {
        return;
    }

    const controles = formEncuesta.querySelectorAll(
        "input, select, textarea, button"
    );

    controles.forEach(function (control) {
        control.disabled = bloqueado;
    });
}

/* =========================================================
   RENDER
========================================================= */

function mostrarCargaEncuestas() {
    if (!contenedorEncuestas) {
        return;
    }

    contenedorEncuestas.innerHTML = `
        <div class="empty-state">
            <h3>Cargando encuestas...</h3>
            <p>Consultando la información registrada en MySQL.</p>
        </div>
    `;
}

function mostrarErrorEncuestas(mensaje) {
    if (!contenedorEncuestas) {
        return;
    }

    contenedorEncuestas.innerHTML = `
        <div class="empty-state">
            <h3>No fue posible cargar encuestas</h3>
            <p>${escaparHTML(mensaje)}</p>
        </div>
    `;
}

function mostrarEncuestas() {
    if (!contenedorEncuestas) {
        return;
    }

    contenedorEncuestas.innerHTML = "";

    if (encuestas.length === 0) {
        contenedorEncuestas.innerHTML = `
            <div class="empty-state">
                <h3>No hay encuestas registradas</h3>
                <p>Cuando se registren evaluaciones de satisfacción, aparecerán en este apartado.</p>
            </div>
        `;
        return;
    }

    encuestas
        .slice()
        .sort(function (a, b) {
            return convertirFecha(b.fechaCreacion) -
                convertirFecha(a.fechaCreacion);
        })
        .forEach(function (encuesta) {
            const card =
                document.createElement("article");

            card.classList.add("survey-card");

            card.innerHTML = `
                <div class="survey-top">
                    <span class="badge gray">
                        ${escaparHTML(encuesta.tipo)}
                    </span>
                    <div class="stars">
                        ${generarEstrellas(encuesta.calificacion)}
                    </div>
                </div>

                <h3>${escaparHTML(encuesta.proyecto)}</h3>

                <p>
                    ${escaparHTML(
                        encuesta.nombre ||
                        encuesta.email ||
                        "Anónimo"
                    )}
                </p>

                ${
                    encuesta.comentario
                        ? `
                        <p>
                            <em>"${escaparHTML(encuesta.comentario)}"</em>
                        </p>
                        `
                        : ""
                }

                ${
                    encuesta.video
                        ? `
                        <div class="video-indicator">
                            🎥 Video adjunto
                        </div>
                        <div>
                            ${obtenerBadgeConsentimiento(encuesta.consentimiento)}
                        </div>
                        <p>
                            <a href="${escaparAtributo(encuesta.video)}" target="_blank" rel="noopener noreferrer">
                                Ver video
                            </a>
                        </p>
                        `
                        : ""
                }

                <p class="survey-date">
                    ${escaparHTML(formatearFecha(encuesta.fechaCreacion))}
                </p>

                ${
                    esAdministrador()
                        ? `
                        <div class="survey-actions">
                            <button
                                type="button"
                                class="btn-danger-outline"
                                onclick="eliminarEncuesta('${escaparAtributo(encuesta.id)}')"
                            >
                                🗑 Eliminar
                            </button>
                        </div>
                        `
                        : ""
                }
            `;

            contenedorEncuestas.appendChild(card);
        });
}

function generarEstrellas(calificacion) {
    let estrellas = "";
    const valor = Number(calificacion || 0);

    for (let i = 1; i <= 5; i++) {
        estrellas += i <= valor ? "★" : "☆";
    }

    return estrellas;
}

function obtenerBadgeConsentimiento(consentimiento) {
    if (consentimiento === "Autorizado") {
        return `<span class="badge green">Difusión autorizada</span>`;
    }

    if (consentimiento === "No autorizado") {
        return `<span class="badge red">Solo interno</span>`;
    }

    return `<span class="badge blue">Sin decisión de difusión</span>`;
}

function actualizarPromedio() {
    if (!promedioCalificacion) {
        return;
    }

    if (encuestas.length === 0) {
        promedioCalificacion.textContent = "—";
        return;
    }

    const suma = encuestas.reduce(
        function (total, encuesta) {
            return total + Number(
                encuesta.calificacion || 0
            );
        },
        0
    );

    promedioCalificacion.textContent =
        (suma / encuestas.length).toFixed(1);
}

/* =========================================================
   VIDEO Y CONSENTIMIENTO
========================================================= */

function seleccionarConsentimientoVideo(valor) {
    if (videoConsentimiento) {
        videoConsentimiento.value = valor;
    }

    if (valor === "Autorizado") {
        if (btnAutoriza) {
            btnAutoriza.classList.add("active-green");
        }

        if (btnNoAutoriza) {
            btnNoAutoriza.classList.remove("active-red");
        }

        if (mensajeConsentimiento) {
            mensajeConsentimiento.textContent =
                "El video podrá usarse para difusión en redes sociales oficiales.";
        }

        return;
    }

    if (btnNoAutoriza) {
        btnNoAutoriza.classList.add("active-red");
    }

    if (btnAutoriza) {
        btnAutoriza.classList.remove("active-green");
    }

    if (mensajeConsentimiento) {
        mensajeConsentimiento.textContent =
            "El video se usará únicamente como evidencia interna.";
    }
}

function mostrarPreviewVideo(url) {
    if (!videoPreview || !videoPreviewBox || !consentimientoBox) {
        return;
    }

    if (url === "") {
        videoPreview.src = "";
        videoPreviewBox.style.display = "none";
        consentimientoBox.style.display = "none";
        return;
    }

    const embedUrl = obtenerEmbedUrl(url);

    videoPreview.src = embedUrl;
    videoPreviewBox.style.display = "block";
    consentimientoBox.style.display = "block";
}

function obtenerEmbedUrl(url) {
    const youtubeWatch = url.match(
        /youtube\.com\/watch\?v=([^&\s]+)/
    );

    const youtubeShort = url.match(
        /youtu\.be\/([^&\s]+)/
    );

    if (youtubeWatch) {
        return "https://www.youtube.com/embed/" +
            youtubeWatch[1];
    }

    if (youtubeShort) {
        return "https://www.youtube.com/embed/" +
            youtubeShort[1];
    }

    return url;
}

/* =========================================================
   UTILIDADES
========================================================= */

function convertirFecha(fecha) {
    if (!fecha) {
        return 0;
    }

    const tiempo = new Date(fecha).getTime();

    return Number.isNaN(tiempo)
        ? 0
        : tiempo;
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "Sin fecha";
    }

    const objetoFecha = new Date(fecha);

    if (Number.isNaN(objetoFecha.getTime())) {
        return String(fecha);
    }

    return objetoFecha.toLocaleDateString(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
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
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
