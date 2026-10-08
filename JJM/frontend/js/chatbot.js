/* =========================================================
   Ard.IA — Asistente contextual PMO con voz
   Usa los datos permitidos por la sesión actual y Web Speech API.
========================================================= */
const API_PROYECTOS = window.apiUrl("/api/proyectos");
const API_TAREAS = window.apiUrl("/api/tareas");
const API_ALERTAS = window.apiUrl("/api/alertas");
const API_REGISTROS_HORAS = window.apiUrl("/api/registros-horas");
const API_ENCUESTAS = window.apiUrl("/api/encuestas");
const API_SEGUIMIENTO = window.apiUrl("/api/seguimiento-estadia/mi-seguimiento");
const API_DOCUMENTOS = window.apiUrl("/api/documentos");

let usuarioActivo = obtenerUsuarioActivo();
let vozActiva = localStorage.getItem("ardiaVozActiva") === "1";
let reconocimiento = null;
let escuchando = false;
let contextoCache = null;
let contextoCacheEn = 0;
const CLAVE_CHATBOT = usuarioActivo && obtenerIdUsuarioActivo() ? `mensajesChatbot_${obtenerIdUsuarioActivo()}` : "mensajesChatbot_invitado";
let mensajesChatbot = obtenerMensajesGuardados();

const chatMessages = document.getElementById("chatMessages");
const formChatbot = document.getElementById("formChatbot");
const inputChatbot = document.getElementById("inputChatbot");
const btnLimpiarChatbot = document.getElementById("btnLimpiarChatbot");
const btnVozChatbot = document.getElementById("btnVozChatbot");
const btnDetenerVoz = document.getElementById("btnDetenerVoz");
const btnMicrofonoChatbot = document.getElementById("btnMicrofonoChatbot");
const suggestionButtons = document.querySelectorAll(".suggestion-btn");
const estadoArdia = document.getElementById("estadoArdia");
const contextoArdia = document.getElementById("contextoArdia");

document.addEventListener("DOMContentLoaded", async function () {
    usuarioActivo = obtenerUsuarioActivo();
    if (!usuarioActivo && typeof window.restaurarSesionPMO === "function") {
        usuarioActivo = await window.restaurarSesionPMO();
    }
    inicializarVoz();
    configurarEventosChatbot();
    await inicializarChatbot();
});

async function inicializarChatbot() {
    if (!usuarioActivo) {
        mensajesChatbot = [{ id: `msg-${Date.now()}`, tipo: "bot", texto: "No detecté una sesión activa. Inicia sesión para poder consultar tu contexto de JJM Oficina de Proyectos.", fecha: new Date().toISOString() }];
        renderizarMensajesChatbot();
        if (estadoArdia) estadoArdia.textContent = "Sin sesión";
        return;
    }

    if (!mensajesChatbot.length) {
        mensajesChatbot.push({ id:`msg-${Date.now()}`, tipo:"bot", texto:construirMensajeBienvenida(), fecha:new Date().toISOString() });
        guardarMensajesChatbot();
    }
    renderizarMensajesChatbot();
    actualizarBotonVoz();

    try {
        const datos = await cargarDatosPermitidos(true);
        const nombre = nombreCortoUsuario();
        if (estadoArdia) estadoArdia.textContent = `Contexto conectado${nombre ? " · " + nombre : ""}`;
        if (contextoArdia) contextoArdia.textContent = `${datos.proyectos.length} proyecto(s) · ${datos.tareas.length} tarea(s) · ${datos.registrosHoras.length} registro(s) de horas`;
    } catch (_) {
        if (estadoArdia) estadoArdia.textContent = "Sesión activa · contexto parcial";
    }
}

function configurarEventosChatbot() {
    formChatbot?.addEventListener("submit", async e => { e.preventDefault(); await enviarMensajeUsuario(); });
    btnLimpiarChatbot?.addEventListener("click", limpiarChatbot);
    btnVozChatbot?.addEventListener("click", () => { vozActiva = !vozActiva; localStorage.setItem("ardiaVozActiva", vozActiva ? "1" : "0"); actualizarBotonVoz(); if (!vozActiva) detenerVoz(); });
    btnDetenerVoz?.addEventListener("click", detenerVoz);
    btnMicrofonoChatbot?.addEventListener("click", alternarMicrofono);
    suggestionButtons.forEach(b => b.addEventListener("click", async () => { if(inputChatbot) inputChatbot.value=b.textContent.trim(); await enviarMensajeUsuario(); }));
}

async function enviarMensajeUsuario() {
    const texto = inputChatbot?.value.trim() || "";
    if (!texto) return;
    agregarMensaje("user", texto);
    inputChatbot.value = "";
    const idTemporal = agregarMensaje("bot", "Analizando tu contexto de JJM Oficina de Proyectos...", true);
    try {
        const respuesta = await generarRespuestaChatbot(texto);
        actualizarMensaje(idTemporal, respuesta, true);
    } catch (error) {
        console.error("Ard.IA:", error);
        actualizarMensaje(idTemporal, "No pude completar esa consulta en este momento. Tu sesión sigue activa; intenta de nuevo o pregúntame por proyectos, tareas, documentos, asistencia u horas.", true);
    }
}

function agregarMensaje(tipo,texto,processing=false){const id=`msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;mensajesChatbot.push({id,tipo,texto,processing,fecha:new Date().toISOString()});guardarMensajesChatbot();renderizarMensajesChatbot();return id;}
function actualizarMensaje(id,texto,leer=false){mensajesChatbot=mensajesChatbot.map(m=>m.id===id?{...m,texto,processing:false,fecha:new Date().toISOString()}:m);guardarMensajesChatbot();renderizarMensajesChatbot();if(leer&&vozActiva)hablarTexto(texto);}
function obtenerMensajesGuardados(){try{const d=JSON.parse(localStorage.getItem(CLAVE_CHATBOT));return Array.isArray(d)?d:[]}catch(_){return[]}}
function guardarMensajesChatbot(){localStorage.setItem(CLAVE_CHATBOT,JSON.stringify(mensajesChatbot.slice(-80)))}
function renderizarMensajesChatbot(){if(!chatMessages)return;chatMessages.innerHTML="";mensajesChatbot.forEach(m=>{const d=document.createElement("div");d.className=`message ${m.tipo}${m.processing?" processing":""}`;d.innerHTML=formatearTextoMensaje(m.texto);chatMessages.appendChild(d)});chatMessages.scrollTop=chatMessages.scrollHeight}
function limpiarChatbot(){if(!confirm("¿Limpiar la conversación con Ard.IA?"))return;detenerVoz();mensajesChatbot=[{id:`msg-${Date.now()}`,tipo:"bot",texto:construirMensajeBienvenida(),fecha:new Date().toISOString()}];guardarMensajesChatbot();renderizarMensajesChatbot()}

async function generarRespuestaChatbot(pregunta) {
    const t=normalizarTexto(pregunta);const d=await cargarDatosPermitidos();
    if(contieneAlguna(t,["hola","buenos dias","buenas tardes","buenas noches","que tal"]))return `Hola${nombreCortoUsuario()?", "+nombreCortoUsuario():""}. Estoy conectado a tu contexto de JJM Oficina de Proyectos. Puedo revisar contigo proyecto, tareas, horas, asistencia, documentos, FO-EST y riesgos.`;
    if(contieneAlguna(t,["quien soy","mi cuenta","mi rol"]))return responderIdentidad();
    if(contieneAlguna(t,["que debo hacer hoy","qué debo hacer hoy","prioridad","prioridades","hoy"]))return responderPrioridades(d);
    if(contieneAlguna(t,["pase de lista","pases de lista","asistencia","entrada","salida","jornada"]))return responderAsistencia(d.registrosHoras);
    if(contieneAlguna(t,["fo-est","fo est","foest","documento","documentos","carta","expediente","estadía","estadia"]))return responderSeguimiento(d.seguimiento,d.documentos);
    if(contieneAlguna(t,["pmbok","principio","focus area","area de enfoque"]))return responderPmbok(d);
    if(contieneAlguna(t,["permiso","permisos","rol","que puedo hacer","acceso"]))return responderPermisos();
    if(contieneAlguna(t,["hora","horas","timesheet"]))return responderHoras(d.registrosHoras);
    if(contieneAlguna(t,["alerta","alertas","riesgo","riesgos"]))return responderAlertas(d.alertas,d.proyectos,d.tareas);
    if(contieneAlguna(t,["tarea","tareas","vencida","bloqueada","pendiente"]))return responderTareas(d.tareas);
    if(contieneAlguna(t,["proyecto","proyectos","avance","portafolio"]))return responderProyectos(d.proyectos,d.tareas);
    if(contieneAlguna(t,["encuesta","satisfaccion","calificacion"]))return responderEncuestas(d.encuestas);
    if(contieneAlguna(t,["recomendacion","retraso","mejorar"]))return responderRecomendaciones(d);
    if(contieneAlguna(t,["resumen","semana","desempeno","general"]))return responderResumen(d);
    return responderAyuda(d);
}

async function cargarDatosPermitidos(forzar=false){if(!forzar&&contextoCache&&Date.now()-contextoCacheEn<30000)return contextoCache;const resultados=await Promise.allSettled([obtenerDatosAPI(API_PROYECTOS,["proyectos","data"]),obtenerDatosAPI(API_TAREAS,["tareas","data"]),obtenerDatosAPI(API_ALERTAS,["alertas","data"]),obtenerDatosAPI(API_REGISTROS_HORAS,["registros","data"]),obtenerDatosAPI(API_ENCUESTAS,["encuestas","data"]),obtenerObjetoAPI(API_SEGUIMIENTO),obtenerDatosAPI(API_DOCUMENTOS,["documentos","data"])]);contextoCache={proyectos:arrResultado(resultados[0]),tareas:arrResultado(resultados[1]),alertas:arrResultado(resultados[2]),registrosHoras:arrResultado(resultados[3]),encuestas:arrResultado(resultados[4]),seguimiento:objResultado(resultados[5]),documentos:arrResultado(resultados[6])};contextoCacheEn=Date.now();return contextoCache}
function arrResultado(r){return r.status==="fulfilled"&&Array.isArray(r.value)?r.value:[]}
function objResultado(r){return r.status==="fulfilled"&&r.value&&typeof r.value==="object"?r.value:{}}
async function obtenerDatosAPI(url,claves){const r=await fetch(url);const d=await json(r);if(!r.ok)throw new Error(d.mensaje||"No fue posible consultar datos.");if(Array.isArray(d))return d;for(const k of claves)if(Array.isArray(d?.[k]))return d[k];return[]}
async function obtenerObjetoAPI(url){const r=await fetch(url);const d=await json(r);if(!r.ok)throw new Error(d.mensaje||"No fue posible consultar el seguimiento.");return d||{}}
async function json(r){try{return await r.json()}catch(_){return{}}}

function responderIdentidad(){const rol=obtenerNombreRolUsuario()||"Usuario";return `Eres **${nombreCompletoUsuario()||"usuario de JJM Oficina de Proyectos"}**. Tu rol actual es **${rol}**. Solo consultaré información autorizada para tu sesión.`}
function responderPermisos(){const rol=obtenerNombreRolUsuario()||"Sin rol";return esAdministrador()?`Tu rol es **${rol}**. Puedes consultar operación general, proyectos, tareas, alertas, horas, documentos y seguimiento.`:`Tu rol es **${rol}**. Puedo ayudarte con tu proyecto, tareas, horas, asistencia, documentos y seguimiento visibles.`}
function responderAsistencia(registros){const hoy=new Date();const ym=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;const mes=registros.filter(r=>String(r.fecha||"").slice(0,7)===ym);const dias=new Set(mes.map(r=>String(r.fecha||"").slice(0,10)).filter(Boolean)).size;const horas=mes.reduce((a,r)=>a+num(r.horasTrabajadas??r.horas),0);const abiertas=mes.filter(r=>r.horaEntrada&&!r.horaSalida).length;return `**Pases de lista de este mes:**\n- Días registrados: ${dias}.\n- Horas acumuladas: ${horas.toFixed(1)} h.\n- Jornadas abiertas sin salida: ${abiertas}.\nPuedes registrar entrada/salida en **Control de horas** y generar el PDF oficial desde **Mi seguimiento de estadía → Pases de lista**.`}
function responderSeguimiento(seg,docs){const s=seg?.seguimiento||{};const e=seg?.documentos||{};const lista=[];lista.push(`Carta de presentación: ${e.cartaPresentacion?"aceptada":"pendiente"}`);lista.push(`Carta de aceptación: ${e.cartaAceptacion?"liberada":"pendiente"}`);lista.push(`Carta de término: ${e.cartaTermino?"liberada":"pendiente"}`);lista.push(`FO-EST-02: ${s.empresa?"contestado":"pendiente"}`);lista.push(`FO-EST-03: ${s.foEst03?"evaluado":"disponible / pendiente de evaluación"}`);lista.push(`FO-EST-08: ${s.satisfaccion?"contestado":"pendiente"}`);return `**Tu seguimiento de estadía:**\n- ${lista.join(".\n- ")}.\nEl FO-EST-03 y los pases de lista están disponibles desde **Mi seguimiento de estadía**.`}
function responderPmbok(d){return `**PMBOK® 8 aplicado a tu trabajo:**\n1. Mantén visión integral y foco en valor.\n2. Integra calidad en tareas y entregables.\n3. Trabaja con las áreas de enfoque de iniciación, planificación, ejecución, monitoreo y control, y cierre.\n4. Revisa gobernanza, alcance, cronograma, finanzas, interesados, recursos y riesgos.\nAhora mismo tienes ${d.tareas.length} tarea(s) visible(s) y ${d.alertas.length} alerta(s), que son buenos puntos de entrada para monitoreo y control.`}
function responderPrioridades(d){const pend=d.tareas.filter(t=>{const e=normalizarTexto(t.estado);return !e.includes("complet")&&!e.includes("finaliz")&&!e.includes("cerrad")});const bloq=pend.filter(t=>normalizarTexto(t.estado).includes("bloque"));const sinSalida=d.registrosHoras.filter(r=>r.horaEntrada&&!r.horaSalida).length;let r="**Prioridades sugeridas para hoy:**";if(bloq.length)r+=`\n1. Atender ${bloq.length} tarea(s) bloqueada(s).`;if(pend.length)r+=`\n2. Revisar ${pend.length} tarea(s) todavía abiertas.`;if(sinSalida)r+=`\n3. Cerrar ${sinSalida} jornada(s) con entrada pero sin salida.`;if(!bloq.length&&!pend.length&&!sinSalida)r+="\nNo detecté pendientes críticos. Actualiza evidencias, horas y avance del proyecto.";return r}
function responderHoras(r){const h=r.reduce((a,x)=>a+num(x.horasTrabajadas??x.horas),0);const p=r.filter(x=>normalizarTexto(x.estadoValidacion||x.estado).includes("pendiente")).length;return `**Control de horas:** ${r.length} registro(s), ${h.toFixed(1)} h acumuladas y ${p} pendiente(s) de validación.`}
function responderAlertas(a,p,t){const altas=a.filter(x=>{const s=normalizarTexto(x.severidad);return s.includes("alta")||s.includes("critica")}).length;const b=t.filter(x=>normalizarTexto(x.estado).includes("bloque")).length;return `**Riesgos detectados:** ${a.length} alerta(s), ${altas} de severidad alta/crítica y ${b} tarea(s) bloqueada(s).`}
function responderTareas(t){if(!t.length)return"No encontré tareas visibles en tu sesión.";const p=t.filter(x=>normalizarTexto(x.estado).includes("pendiente")).length;const c=t.filter(x=>{const e=normalizarTexto(x.estado);return e.includes("complet")||e.includes("finaliz")}).length;return `**Tareas:** ${t.length} total, ${p} pendiente(s) y ${c} completada(s). En **Ver detalles** del proyecto puedes consultar el listado de actividades.`}
function responderProyectos(p,t){if(!p.length)return"No encontré proyectos visibles para tu sesión.";const prom=Math.round(p.reduce((a,x)=>a+num(x.porcentajeAvance??x.avance??x.progreso),0)/p.length);return `**Proyectos visibles:** ${p.length}. Avance promedio registrado: ${prom}%. Tareas relacionadas visibles: ${t.length}.`}
function responderEncuestas(e){if(!e.length)return"No encontré encuestas visibles.";const prom=e.length?e.reduce((a,x)=>a+num(x.calificacion),0)/e.length:0;return `Tienes ${e.length} encuesta(s) visible(s), con promedio registrado de ${prom.toFixed(1)}/5.`}
function responderRecomendaciones(d){const b=d.tareas.filter(x=>normalizarTexto(x.estado).includes("bloque")).length;return b?`Mi recomendación es resolver primero las ${b} tarea(s) bloqueada(s), validar dependencias y después actualizar horas/evidencias.`:"Mantén tareas, horas, asistencia y evidencias actualizadas; revisa riesgos antes de iniciar nuevas actividades."}
function responderResumen(d){return `**Resumen de tu contexto:**\n- Proyectos: ${d.proyectos.length}\n- Tareas: ${d.tareas.length}\n- Alertas: ${d.alertas.length}\n- Registros de horas: ${d.registrosHoras.length}\n- Documentos visibles: ${d.documentos.length}`}
function responderAyuda(d){return `Puedo conversar contigo usando el contexto de JJM Oficina de Proyectos. Por ejemplo: **¿qué debo hacer hoy?**, **¿cómo va mi asistencia?**, **¿qué FO-EST tengo pendiente?**, **¿cómo va mi proyecto?**, **explícame PMBOK 8** o **dame un resumen**.`}

function inicializarVoz(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){reconocimiento=new SR();reconocimiento.lang="es-MX";reconocimiento.interimResults=false;reconocimiento.continuous=false;reconocimiento.onstart=()=>{escuchando=true;btnMicrofonoChatbot?.classList.add("listening");if(estadoArdia)estadoArdia.textContent="Escuchando..."};reconocimiento.onresult=e=>{const texto=e.results?.[0]?.[0]?.transcript||"";if(inputChatbot)inputChatbot.value=texto};reconocimiento.onend=()=>{escuchando=false;btnMicrofonoChatbot?.classList.remove("listening");if(estadoArdia)estadoArdia.textContent="Contexto conectado";if(inputChatbot?.value.trim())enviarMensajeUsuario()};reconocimiento.onerror=()=>{escuchando=false;btnMicrofonoChatbot?.classList.remove("listening")}}else if(btnMicrofonoChatbot){btnMicrofonoChatbot.disabled=true;btnMicrofonoChatbot.title="Tu navegador no ofrece reconocimiento de voz"}actualizarBotonVoz()}
function alternarMicrofono(){if(!reconocimiento)return;if(escuchando){try{reconocimiento.stop()}catch(_){}}else{detenerVoz();try{reconocimiento.start()}catch(_){}}}
function actualizarBotonVoz(){if(!btnVozChatbot)return;btnVozChatbot.classList.toggle("active",vozActiva);btnVozChatbot.setAttribute("aria-pressed",vozActiva?"true":"false");btnVozChatbot.textContent=vozActiva?"🔊 Voz activada":"🔈 Activar voz"}
function hablarTexto(texto){if(!("speechSynthesis"in window)||!vozActiva)return;detenerVoz();const u=new SpeechSynthesisUtterance(textoParaVoz(texto));u.lang="es-MX";u.rate=.98;u.pitch=1.02;const voces=speechSynthesis.getVoices();u.voice=voces.find(v=>String(v.lang).toLowerCase().startsWith("es-mx"))||voces.find(v=>String(v.lang).toLowerCase().startsWith("es"))||null;speechSynthesis.speak(u)}
function detenerVoz(){if("speechSynthesis"in window)speechSynthesis.cancel()}
function textoParaVoz(t){return String(t||"").replace(/\*\*/g,"").replace(/[•#]/g,"").replace(/\n+/g,". ")}

function obtenerUsuarioActivo(){try{return JSON.parse(localStorage.getItem("usuarioActivo"))||null}catch(_){return null}}
function obtenerIdUsuarioActivo(){return usuarioActivo?.id||usuarioActivo?.idUsuario||usuarioActivo?.id_usuario||null}
function nombreCompletoUsuario(){if(!usuarioActivo)return"";return usuarioActivo.nombreCompleto||[usuarioActivo.nombre,usuarioActivo.apellidoPaterno,usuarioActivo.apellidoMaterno].filter(Boolean).join(" ")||usuarioActivo.correo||""}
function nombreCortoUsuario(){return String(usuarioActivo?.nombre||nombreCompletoUsuario()).split(" ")[0]||""}
function obtenerNombreRolUsuario(){if(!usuarioActivo)return"";if(usuarioActivo.rol&&typeof usuarioActivo.rol==="object")return usuarioActivo.rol.nombre||"";return usuarioActivo.rol||usuarioActivo.rolNombre||usuarioActivo.nombreRol||""}
function esAdministrador(){const r=normalizarTexto(obtenerNombreRolUsuario());return ["administrador","admin pmo","admin_pmo","administrador pmo","superadministrador"].includes(r)}
function construirMensajeBienvenida(){return `Hola${nombreCortoUsuario()?", "+nombreCortoUsuario():""}. Soy **Ard.IA**. Estoy preparada para ayudarte con tu proyecto, tareas, horas, pases de lista, documentos, FO-EST y PMBOK® 8. Puedes escribirme o usar el micrófono.`}
function contieneAlguna(t,p){return p.some(x=>t.includes(normalizarTexto(x)))}
function normalizarTexto(v){return String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
function escaparHTML(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function formatearTextoMensaje(t){return escaparHTML(t).replace(/\n/g,"<br>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")}
