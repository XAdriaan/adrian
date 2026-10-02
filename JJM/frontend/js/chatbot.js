/* =========================================================
   CHATBOT ARD.IA - PMO
   Versión corregida para responder consultas por rol
========================================================= */

const API_PROYECTOS = window.apiUrl("/api/proyectos");
const API_TAREAS = window.apiUrl("/api/tareas");
const API_ALERTAS = window.apiUrl("/api/alertas");
const API_REGISTROS_HORAS = window.apiUrl("/api/registros-horas");
const API_ENCUESTAS = window.apiUrl("/api/encuestas");

let usuarioActivo = obtenerUsuarioActivo();
const CLAVE_CHATBOT = usuarioActivo && obtenerIdUsuarioActivo()
    ? `mensajesChatbot_${obtenerIdUsuarioActivo()}`
    : "mensajesChatbot_invitado";

let mensajesChatbot = obtenerMensajesGuardados();

const chatMessages = document.getElementById("chatMessages");
const formChatbot = document.getElementById("formChatbot");
const inputChatbot = document.getElementById("inputChatbot");
const btnLimpiarChatbot = document.getElementById("btnLimpiarChatbot");
const suggestionButtons = document.querySelectorAll(".suggestion-btn");

document.addEventListener("DOMContentLoaded", function () {
    usuarioActivo = obtenerUsuarioActivo();
    inicializarChatbot();
});

function inicializarChatbot() {
    if (!usuarioActivo) {
        mensajesChatbot = [
            {
                tipo: "bot",
                texto: "No se detectó una sesión activa. Inicia sesión para usar Ard.IA.",
                fecha: new Date().toISOString()
            }
        ];

        renderizarMensajesChatbot();
        return;
    }

    if (mensajesChatbot.length === 0) {
        mensajesChatbot.push({
            tipo: "bot",
            texto: construirMensajeBienvenida(),
            fecha: new Date().toISOString()
        });

        guardarMensajesChatbot();
    }

    renderizarMensajesChatbot();
    configurarEventosChatbot();
}

function configurarEventosChatbot() {
    if (formChatbot) {
        formChatbot.addEventListener("submit", async function (event) {
            event.preventDefault();
            await enviarMensajeUsuario();
        });
    }

    if (btnLimpiarChatbot) {
        btnLimpiarChatbot.addEventListener("click", limpiarChatbot);
    }

    suggestionButtons.forEach(function (boton) {
        boton.addEventListener("click", async function () {
            const texto = boton.textContent.trim();

            if (inputChatbot) {
                inputChatbot.value = texto;
            }

            await enviarMensajeUsuario();
        });
    });
}

async function enviarMensajeUsuario() {
    if (!inputChatbot) {
        return;
    }

    const texto = inputChatbot.value.trim();

    if (texto === "") {
        return;
    }

    agregarMensaje("user", texto);
    inputChatbot.value = "";

    const idTemporal = agregarMensaje(
        "bot",
        "Analizando la información disponible..."
    );

    try {
        const respuesta = await generarRespuestaChatbot(texto);
        actualizarMensaje(idTemporal, respuesta);
    } catch (error) {
        console.error("Error en Ard.IA:", error);
        actualizarMensaje(
            idTemporal,
            "No fue posible completar la consulta. Verifica que el backend esté activo y vuelve a intentarlo."
        );
    }
}

function agregarMensaje(tipo, texto) {
    const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    mensajesChatbot.push({
        id: id,
        tipo: tipo,
        texto: texto,
        fecha: new Date().toISOString()
    });

    guardarMensajesChatbot();
    renderizarMensajesChatbot();

    return id;
}

function actualizarMensaje(id, texto) {
    mensajesChatbot = mensajesChatbot.map(function (mensaje) {
        if (mensaje.id === id) {
            return {
                ...mensaje,
                texto: texto,
                fecha: new Date().toISOString()
            };
        }

        return mensaje;
    });

    guardarMensajesChatbot();
    renderizarMensajesChatbot();
}

function obtenerMensajesGuardados() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_CHATBOT));
        return Array.isArray(datos) ? datos : [];
    } catch (error) {
        return [];
    }
}

function guardarMensajesChatbot() {
    localStorage.setItem(CLAVE_CHATBOT, JSON.stringify(mensajesChatbot));
}

function renderizarMensajesChatbot() {
    if (!chatMessages) {
        return;
    }

    chatMessages.innerHTML = "";

    mensajesChatbot.forEach(function (mensaje) {
        const div = document.createElement("div");
        div.className = "message " + mensaje.tipo;
        div.innerHTML = formatearTextoMensaje(mensaje.texto);
        chatMessages.appendChild(div);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function limpiarChatbot() {
    const confirmar = confirm("¿Deseas limpiar la conversación con Ard.IA?");

    if (!confirmar) {
        return;
    }

    localStorage.removeItem(CLAVE_CHATBOT);

    mensajesChatbot = [
        {
            id: `msg-${Date.now()}`,
            tipo: "bot",
            texto: construirMensajeBienvenida(),
            fecha: new Date().toISOString()
        }
    ];

    guardarMensajesChatbot();
    renderizarMensajesChatbot();
}

async function generarRespuestaChatbot(pregunta) {
    const texto = normalizarTexto(pregunta);
    const datos = await cargarDatosPermitidos();

    if (contieneAlguna(texto, ["permiso", "permisos", "rol", "que puedo hacer", "qué puedo hacer", "acceso"])) {
        return responderPermisos();
    }

    if (contieneAlguna(texto, ["control de horas", "horas", "jornada", "jornadas", "registros de horas", "timesheet"])) {
        return responderHoras(datos.registrosHoras);
    }

    if (contieneAlguna(texto, ["alerta", "alertas", "riesgo", "riesgos"])) {
        return responderAlertas(datos.alertas, datos.proyectos, datos.tareas);
    }

    if (contieneAlguna(texto, ["tarea", "tareas", "vencida", "vencidas", "bloqueada", "bloqueadas", "pendiente", "pendientes"])) {
        return responderTareas(datos.tareas);
    }

    if (contieneAlguna(texto, ["proyecto", "proyectos", "portafolio", "avance", "avances"])) {
        return responderProyectos(datos.proyectos);
    }

    if (contieneAlguna(texto, ["encuesta", "encuestas", "satisfaccion", "satisfacción", "calificacion", "calificación"])) {
        return responderEncuestas(datos.encuestas);
    }

    if (contieneAlguna(texto, ["usuario", "usuarios", "equipo", "miembros"])) {
        if (esAdministrador()) {
            return "Puedo orientarte sobre usuarios y equipo, pero para consultar el listado completo entra al módulo Equipo, donde se aplican los permisos administrativos.";
        }

        return "Tu rol no tiene acceso al listado interno de usuarios o equipo. Puedo ayudarte con tus proyectos, tareas, alertas o encuestas visibles.";
    }

    if (contieneAlguna(texto, ["recomendacion", "recomendación", "recomendaciones", "retraso", "retrasos", "mejorar"])) {
        return responderRecomendaciones(datos);
    }

    if (contieneAlguna(texto, ["resumen", "semana", "desempeno", "desempeño", "general"])) {
        return responderResumen(datos);
    }

    return responderAyuda();
}

async function cargarDatosPermitidos() {
    const resultados = await Promise.allSettled([
        obtenerDatosAPI(API_PROYECTOS, ["proyectos", "data"]),
        obtenerDatosAPI(API_TAREAS, ["tareas", "data"]),
        obtenerDatosAPI(API_ALERTAS, ["alertas", "data"]),
        obtenerDatosAPI(API_REGISTROS_HORAS, ["registros", "data"]),
        obtenerDatosAPI(API_ENCUESTAS, ["encuestas", "data"])
    ]);

    return {
        proyectos: obtenerResultado(resultados[0], "proyectos"),
        tareas: obtenerResultado(resultados[1], "tareas"),
        alertas: obtenerResultado(resultados[2], "alertas"),
        registrosHoras: obtenerResultado(resultados[3], "registrosHoras"),
        encuestas: obtenerResultado(resultados[4], "encuestas")
    };
}

function obtenerResultado(resultado, claveLocal) {
    if (resultado.status === "fulfilled") {
        return resultado.value;
    }

    return obtenerLocalStorage(claveLocal);
}

async function obtenerDatosAPI(url, posiblesClaves) {
    const respuesta = await fetch(url, {
        headers: obtenerHeadersSesion()
    });

    const datos = await obtenerRespuestaJSON(respuesta);

    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No fue posible consultar datos.");
    }

    return extraerArreglo(datos, posiblesClaves);
}

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

function extraerArreglo(datos, posiblesClaves) {
    if (Array.isArray(datos)) {
        return datos;
    }

    for (let i = 0; i < posiblesClaves.length; i++) {
        const clave = posiblesClaves[i];

        if (Array.isArray(datos?.[clave])) {
            return datos[clave];
        }
    }

    return [];
}

function responderPermisos() {
    const rol = obtenerNombreRolUsuario() || "Sin rol";

    if (esAdministrador()) {
        return "**Permisos detectados:** Administrador PMO.\nPuedes consultar información general de proyectos, tareas, alertas, reportes, horas, encuestas y operación de la plataforma.";
    }

    if (esClienteOConsulta()) {
        return `**Permisos detectados:** ${rol}.\nPuedes consultar información general, revisar tu perfil, responder encuestas y usar el chatbot. No se muestran datos internos de horas, bitácora, equipo ni reportes administrativos.`;
    }

    return `**Permisos detectados:** ${rol}.\nPuedes consultar información relacionada con tus proyectos, tareas, alertas y registros permitidos por tu rol.`;
}

function responderHoras(registrosHoras) {
    if (esClienteOConsulta()) {
        return "Tu rol no tiene acceso al control interno de horas. Solo puedes consultar información general, perfil, encuestas y soporte.";
    }

    const totalRegistros = registrosHoras.length;
    const horasTotales = registrosHoras.reduce(function (total, registro) {
        return total + Number(registro.horasTrabajadas || registro.horas || 0);
    }, 0);

    const pendientes = registrosHoras.filter(function (registro) {
        return normalizarTexto(registro.estadoValidacion || registro.estado).includes("pendiente");
    }).length;

    const rechazados = registrosHoras.filter(function (registro) {
        return normalizarTexto(registro.estadoValidacion || registro.estado).includes("rechaz");
    }).length;

    if (totalRegistros === 0) {
        if (esAdministrador()) {
            return "No se encontraron registros de horas cargados o visibles desde el backend.";
        }

        return "No se encontraron registros de horas visibles para tu sesión.";
    }

    if (esAdministrador()) {
        return `**Control de horas general:**\nRegistros encontrados: ${totalRegistros}.\nHoras acumuladas: ${horasTotales.toFixed(1)}.\nPendientes de validación: ${pendientes}.\nRechazados: ${rechazados}.`;
    }

    return `**Tu control de horas:**\nRegistros visibles: ${totalRegistros}.\nHoras registradas: ${horasTotales.toFixed(1)}.\nPendientes de validación: ${pendientes}.\nRechazados: ${rechazados}.`;
}

function responderAlertas(alertas, proyectos, tareas) {
    const abiertas = alertas.filter(function (alerta) {
        return normalizarTexto(alerta.estado).includes("abierta");
    }).length;

    const criticas = alertas.filter(function (alerta) {
        const severidad = normalizarTexto(alerta.severidad);
        return severidad.includes("critica") || severidad.includes("alta");
    }).length;

    const tareasBloqueadas = tareas.filter(function (tarea) {
        return normalizarTexto(tarea.estado).includes("bloqueada");
    }).length;

    if (alertas.length === 0 && tareasBloqueadas === 0) {
        return "No se encontraron alertas visibles para tu sesión.";
    }

    return `**Alertas visibles:**\nAlertas registradas: ${alertas.length}.\nAlertas abiertas: ${abiertas}.\nAlertas críticas o altas: ${criticas}.\nTareas bloqueadas detectadas: ${tareasBloqueadas}.`;
}

function responderTareas(tareas) {
    const total = tareas.length;

    if (total === 0) {
        return "No se encontraron tareas visibles para tu sesión.";
    }

    const pendientes = tareas.filter(function (tarea) {
        return normalizarTexto(tarea.estado).includes("pendiente");
    }).length;

    const progreso = tareas.filter(function (tarea) {
        return normalizarTexto(tarea.estado).includes("progreso");
    }).length;

    const bloqueadas = tareas.filter(function (tarea) {
        return normalizarTexto(tarea.estado).includes("bloqueada");
    }).length;

    const completadas = tareas.filter(function (tarea) {
        const estado = normalizarTexto(tarea.estado);
        return estado.includes("complet") || estado.includes("finaliz") || estado.includes("cerrad");
    }).length;

    return `**Tareas visibles:**\nTotal: ${total}.\nPendientes: ${pendientes}.\nEn progreso: ${progreso}.\nBloqueadas: ${bloqueadas}.\nCompletadas: ${completadas}.`;
}

function responderProyectos(proyectos) {
    const total = proyectos.length;

    if (total === 0) {
        return "No se encontraron proyectos visibles para tu sesión.";
    }

    const sumaAvance = proyectos.reduce(function (totalAvance, proyecto) {
        return totalAvance + Number(proyecto.avance || proyecto.porcentajeAvance || proyecto.progreso || 0);
    }, 0);

    const promedio = total > 0
        ? Math.round(sumaAvance / total)
        : 0;

    const enRiesgo = proyectos.filter(function (proyecto) {
        const estado = normalizarTexto(proyecto.estado || proyecto.estadoActual);
        const prioridad = normalizarTexto(proyecto.prioridad);

        return estado.includes("riesgo") ||
            estado.includes("bloque") ||
            prioridad.includes("alta") ||
            prioridad.includes("critica");
    }).length;

    return `**Proyectos visibles:**\nTotal: ${total}.\nAvance promedio estimado: ${promedio}%.\nProyectos con posible riesgo: ${enRiesgo}.`;
}

function responderEncuestas(encuestas) {
    if (encuestas.length === 0) {
        return "No se encontraron encuestas visibles para tu sesión.";
    }

    const suma = encuestas.reduce(function (total, encuesta) {
        return total + Number(encuesta.calificacion || 0);
    }, 0);

    const promedio = (suma / encuestas.length).toFixed(1);

    const videosAutorizados = encuestas.filter(function (encuesta) {
        return normalizarTexto(encuesta.consentimiento || encuesta.consentimientoVideo) === "autorizado";
    }).length;

    return `**Encuestas visibles:**\nTotal: ${encuestas.length}.\nPromedio de satisfacción: ${promedio}/5.\nVideos con difusión autorizada: ${videosAutorizados}.`;
}

function responderRecomendaciones(datos) {
    const tareasBloqueadas = datos.tareas.filter(function (tarea) {
        return normalizarTexto(tarea.estado).includes("bloqueada");
    }).length;

    const alertasCriticas = datos.alertas.filter(function (alerta) {
        const severidad = normalizarTexto(alerta.severidad);
        return severidad.includes("critica") || severidad.includes("alta");
    }).length;

    if (tareasBloqueadas > 0 || alertasCriticas > 0) {
        return `**Recomendación de Ard.IA:**\nPrioriza ${tareasBloqueadas} tarea(s) bloqueada(s) y ${alertasCriticas} alerta(s) crítica(s) o altas. Revisa responsables, fechas límite y evidencias pendientes antes de continuar con nuevas tareas.`;
    }

    return "**Recomendación de Ard.IA:**\nMantén actualizado el avance de proyectos, valida horas pendientes y registra alertas preventivas cuando detectes riesgos de retraso.";
}

function responderResumen(datos) {
    return `**Resumen visible para tu sesión:**\nProyectos: ${datos.proyectos.length}.\nTareas: ${datos.tareas.length}.\nAlertas: ${datos.alertas.length}.\nRegistros de horas: ${datos.registrosHoras.length}.\nEncuestas: ${datos.encuestas.length}.`;
}

function responderAyuda() {
    return "Puedo ayudarte con consultas como:\n- ¿Qué alertas tengo?\n- ¿Cómo va mi control de horas?\n- ¿Cuántas tareas hay?\n- ¿Qué proyectos están en riesgo?\n- Dame un resumen general\n- ¿Qué recomendaciones tienes?";
}

/* =========================================================
   SESIÓN Y ROLES
========================================================= */

function obtenerUsuarioActivo() {
    try {
        return JSON.parse(localStorage.getItem("usuarioActivo")) || null;
    } catch (error) {
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

    if (usuarioActivo.rol && typeof usuarioActivo.rol === "object") {
        return usuarioActivo.rol.nombre || "";
    }

    return usuarioActivo.rol ||
        usuarioActivo.rolNombre ||
        usuarioActivo.nombreRol ||
        "";
}

function esAdministrador() {
    const rol = normalizarTexto(obtenerNombreRolUsuario());

    return rol === "administrador" ||
        rol === "admin pmo" ||
        rol === "admin_pmo" ||
        rol === "administrador pmo";
}

function esClienteOConsulta() {
    const rol = normalizarTexto(obtenerNombreRolUsuario());

    return rol === "cliente" ||
        rol === "consulta" ||
        rol === "usuario consulta" ||
        rol === "usuario de consulta"  ||
        rol === "enlace universidad" ||
        rol === "enlace de universidad" ||
        rol === "enlace empresa" ||
        rol === "enlace de empresa";
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

function construirMensajeBienvenida() {
    const rol = obtenerNombreRolUsuario() || "usuario";

    if (esAdministrador()) {
        return "Soy Ard.IA. Puedes preguntarme por proyectos, tareas, alertas, control de horas, encuestas, riesgos o recomendaciones. Tu sesión tiene permisos de Administrador PMO.";
    }

    if (esClienteOConsulta()) {
        return "Soy Ard.IA. Puedes consultarme información general, soporte, perfil y encuestas. No mostraré datos internos del equipo ni control de horas.";
    }

    return `Soy Ard.IA. Puedo apoyarte con información visible para tu rol: ${rol}. Pregúntame por tus proyectos, tareas, alertas u horas.`;
}

/* =========================================================
   UTILIDADES
========================================================= */

function obtenerLocalStorage(clave) {
    try {
        const datos = JSON.parse(localStorage.getItem(clave));
        return Array.isArray(datos) ? datos : [];
    } catch (error) {
        return [];
    }
}

function contieneAlguna(texto, palabras) {
    return palabras.some(function (palabra) {
        return texto.includes(normalizarTexto(palabra));
    });
}

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatearTextoMensaje(texto) {
    return escaparHTML(texto)
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}
