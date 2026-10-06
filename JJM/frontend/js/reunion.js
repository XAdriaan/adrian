const API_PROYECTOS_REUNION = window.apiUrl("/api/proyectos");
const API_REUNIONES = window.apiUrl("/api/reuniones");
const nombreProyectoReunion = document.getElementById("nombreProyectoReunion");
const meetingTimer = document.getElementById("meetingTimer");
const contadorParticipantes = document.getElementById("contadorParticipantes");
const jitsiContainer = document.getElementById("jitsiContainer");
const meetingLoading = document.getElementById("meetingLoading");
const meetingLoadingMessage = document.getElementById("meetingLoadingMessage");
const estadoReunion = document.getElementById("estadoReunion");
const btnCopiarEnlace = document.getElementById("btnCopiarEnlace");
const btnColgarReunion = document.getElementById("btnColgarReunion");
const btnVolverProyecto = document.getElementById("btnVolverProyecto");
const btnReconectar = document.getElementById("btnReconectar");
const btnGrabar = document.getElementById("btnGrabar");
const btnDetenerGrabacion = document.getElementById("btnDetenerGrabacion");
const btnFinalizarReunion = document.getElementById("btnFinalizarReunion");
const listaGrabaciones = document.getElementById("listaGrabaciones");
const btnEntrarSala = document.getElementById("btnEntrarSala");
const btnMicrofono = document.getElementById("btnMicrofono");
const btnCamara = document.getElementById("btnCamara");
const btnPantalla = document.getElementById("btnPantalla");
let proyectoActual = null, reunionActual = null, rtc = null, temporizador = null;
let saliendo = false, conectadoSala = false, grabando = false;
let usuarioActivo = null, tokenSesion = null, pantallaCompartida = null, camaraPropia = null;
let grabacionRecorder = null, grabacionChunks = [], grabacionPantallaStream = null;
let grabacionMicrofonoStream = null, grabacionAudioContext = null, grabacionStreamFinal = null;
let grabacionDeteniendose = false, grabacionFinalizada = Promise.resolve();
const grabacionesLocales = [];
let grabacionInicio=0, grabacionBytes=0;
const esSalaGeneral = obtenerParametroURL("general") === "1";
const idProyecto = esSalaGeneral ? null : obtenerParametroURL("id");
let idReunion = obtenerParametroURL("reunion");

document.addEventListener("DOMContentLoaded", async () => {
    if (window.restaurarSesionPMO) await window.restaurarSesionPMO();
    usuarioActivo = obtenerUsuarioActivo(); tokenSesion = localStorage.getItem("sesionTokenPMO");
    if (!usuarioActivo || !tokenSesion) { location.replace("login.html"); return; }
    btnGrabar.disabled = true;
    try {
        await cargarReunion(); await cargarProyecto();
        if (normalizarTexto(reunionActual.estado) !== "activa") throw new Error("Esta reunión ya terminó.");
        idReunion = reunionActual.id;
        if (!esSalaGeneral) actualizarReunionEnURL(idReunion);
        document.getElementById("tituloSala").textContent = esSalaGeneral ? "Sala general" : "Reunión de proyecto";
        btnVolverProyecto.textContent = esSalaGeneral ? "Volver a videollamadas" : "Volver al proyecto";
        btnFinalizarReunion.hidden = !reunionActual.puedeFinalizar;
        rtc = new window.PMOSalaWebRTC({sala:esSalaGeneral?'general':String(idReunion),contenedor:jitsiContainer,
            estado:estadoReunion,participantes:contadorParticipantes,alCerrar:restablecerControles});
        meetingLoadingMessage.textContent = esSalaGeneral ? "Todos los usuarios con sesión pueden entrar." : "Acceso exclusivo para administración y miembros asignados al proyecto.";
        btnEntrarSala.hidden = false; estadoReunion.textContent = "Sala lista. Pulsa Entrar a la sala.";
        configurarEventos(); iniciarTemporizador(); renderizarGrabacionesLocales();
        document.querySelector("[data-grabaciones-sala]").dataset.grabacionesSala=esSalaGeneral?"general":String(idReunion);
        window.PMOGrabaciones.preparar();
    } catch(e) { mostrarErrorConexion(e.message || "No fue posible abrir la sala."); }
});
async function cargarReunion() {
    if (esSalaGeneral) { reunionActual = {id:'general',estado:'Activa',puedeFinalizar:false,fechaInicio:new Date().toISOString()}; return; }
    if (!idProyecto) throw new Error("Abre una sala desde Videollamadas.");
    const url = idReunion ? `${API_REUNIONES}/${encodeURIComponent(idReunion)}` : `${API_PROYECTOS_REUNION}/${encodeURIComponent(idProyecto)}/reuniones/activa`;
    const r = await fetch(url); const d = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(d.mensaje || "No tienes acceso a esta sala.");
    reunionActual = d.reunion || d.reunionActiva;
    if (!reunionActual || Number(reunionActual.idProyecto) !== Number(idProyecto)) throw new Error("La sala no pertenece al proyecto indicado.");
}
async function cargarProyecto() {
    if (esSalaGeneral) { nombreProyectoReunion.textContent = "Un espacio para todo JJM"; return; }
    const r = await fetch(`${API_PROYECTOS_REUNION}/${encodeURIComponent(idProyecto)}`); const d = await r.json().catch(()=>({}));
    if (!r.ok || !d.proyecto) throw new Error(d.mensaje || "No se pudo consultar el proyecto.");
    proyectoActual = d.proyecto; nombreProyectoReunion.textContent = proyectoActual.nombre || "Proyecto";
}
function restablecerControles() {
    camaraPropia?.stop(); camaraPropia=null;
    pantallaCompartida?.getTracks().forEach(t=>t.stop()); pantallaCompartida=null;
    conectadoSala = false; btnEntrarSala.hidden = false; btnEntrarSala.disabled = false;
    if (grabando) detenerGrabacionLocal().catch(()=>{});
    btnGrabar.disabled = true; [btnMicrofono,btnCamara,btnPantalla].forEach(b=>b.disabled=true);
    btnMicrofono.textContent='Activar micrófono'; btnCamara.textContent='Activar cámara'; btnPantalla.textContent='Compartir pantalla';
}
function configurarEventos() {
    btnEntrarSala.addEventListener('click', async () => {
        btnEntrarSala.disabled = true;
        try { await rtc.entrar(); if (!rtc.activa) return; conectadoSala=true; ocultarCarga(); btnEntrarSala.hidden=true;
            [btnMicrofono,btnCamara,btnPantalla].forEach(b=>b.disabled=false); actualizarBotonesGrabacion();
            if (!esSalaGeneral) await fetch(`${API_REUNIONES}/${idReunion}/unirse`,{method:'POST'});
        } catch(e) { await rtc.salir(); restablecerControles(); estadoReunion.textContent=e.message; }
        finally { btnEntrarSala.disabled=false; }
    });
    btnMicrofono.addEventListener('click',()=>activarMedio('audio',btnMicrofono));
    btnCamara.addEventListener('click',()=>activarMedio('video',btnCamara));
    btnPantalla.addEventListener('click',compartirPantalla);
    document.getElementById('btnEscuchar').addEventListener('click',()=>jitsiContainer.querySelectorAll('video').forEach(v=>v.play().catch(()=>{})));
    btnReconectar.addEventListener('click',async()=>{await rtc.salir(); restablecerControles(); btnEntrarSala.click();});
    btnCopiarEnlace.addEventListener('click',copiarInvitacion); btnColgarReunion.addEventListener('click',colgarVideollamada);
    btnVolverProyecto.addEventListener('click',volverAlProyecto); btnFinalizarReunion.addEventListener('click',finalizarReunion);
    btnGrabar.addEventListener('click',iniciarGrabacionLocal); btnDetenerGrabacion.addEventListener('click',detenerGrabacionLocal);
    window.addEventListener('pagehide',()=>{registrarSalida({keepalive:true});liberarJitsi();});
}
async function activarMedio(tipo, boton) {
    if (!rtc?.activa) return; boton.disabled=true;
    try {
        if (tipo==='video' && pantallaCompartida) { pantallaCompartida.getTracks().forEach(t=>t.stop()); pantallaCompartida=null; btnPantalla.textContent='Compartir pantalla'; }
        const actual=rtc.medios[tipo];
        if (actual && actual.readyState==='live') { actual.enabled=!actual.enabled; boton.textContent=actual.enabled ? (tipo==='audio'?'Silenciar micrófono':'Apagar cámara') : (tipo==='audio'?'Activar micrófono':'Activar cámara'); }
        else {
            if (!navigator.mediaDevices?.getUserMedia) throw new Error('El navegador necesita HTTPS y permiso para usar cámara y micrófono.');
            const flujo=await navigator.mediaDevices.getUserMedia(tipo==='audio'?{audio:{echoCancellation:true,noiseSuppression:true},video:false}:{video:{width:{ideal:640},height:{ideal:360}},audio:false});
            if (!rtc.activa) { flujo.getTracks().forEach(t=>t.stop()); return; }
            const pista=flujo.getTracks()[0]; if(tipo==='video') camaraPropia=pista;
            await rtc.cambiar(tipo,pista); boton.textContent=tipo==='audio'?'Silenciar micrófono':'Apagar cámara';
        }
    } catch(e) { estadoReunion.textContent=e.name==='NotAllowedError'?'Permite el acceso a cámara o micrófono desde el candado del navegador.':e.message; }
    finally { boton.disabled=!rtc?.activa; }
}
async function compartirPantalla() {
    if (!rtc?.activa) return;
    if (pantallaCompartida) { pantallaCompartida.getTracks().forEach(t=>t.stop()); return; }
    try {
        const flujo=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
        if(!rtc.activa){flujo.getTracks().forEach(t=>t.stop());return;}
        pantallaCompartida=flujo; const pista=flujo.getVideoTracks()[0];
        await rtc.cambiar('video',pista); btnPantalla.textContent='Dejar de compartir'; btnCamara.disabled=true;
        pista.addEventListener('ended',async()=>{pantallaCompartida=null;btnPantalla.textContent='Compartir pantalla';btnCamara.disabled=!rtc.activa;if(rtc.activa)await rtc.cambiar('video',camaraPropia?.readyState==='live'?camaraPropia:null);},{once:true});
    } catch(e) { estadoReunion.textContent=e.name==='NotAllowedError'?'Compartir pantalla se canceló.':e.message; }
}
async function registrarSalida(opciones={}) {
    if (!esSalaGeneral && idReunion) await fetch(`${API_REUNIONES}/${idReunion}/salir`,{method:'POST',keepalive:!!opciones.keepalive}).catch(()=>{});
}
function iniciarTemporizador() {
    const inicio=new Date(reunionActual.fechaInicio || Date.now()).getTime();
    const pintar=()=>{const s=Math.max(0,Math.floor((Date.now()-inicio)/1000));meetingTimer.textContent=[Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(v=>String(v).padStart(2,'0')).join(':');};
    pintar();temporizador=setInterval(pintar,1000);
}
function grabacionNavegadorSoportada() {
    return Boolean(
        navigator.mediaDevices?.getDisplayMedia
        && window.MediaRecorder
    );
}

function obtenerMimeGrabacion() {
    const candidatos = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
    ];
    return candidatos.find(tipo => MediaRecorder.isTypeSupported?.(tipo)) || "video/webm";
}

async function iniciarGrabacionLocal() {
    if (!rtc?.activa || !conectadoSala || grabando) return;

    if (!grabacionNavegadorSoportada()) {
        alert("Este navegador no permite la grabación integrada. Usa una versión reciente de Chrome o Edge.");
        return;
    }

    try {
        estadoReunion.textContent = "Selecciona ESTA PESTAÑA y activa Compartir audio para grabar la reunión.";

        // El navegador mostrará su selector de pantalla. Para capturar la reunión completa
        // se debe escoger la pestaña actual y activar Compartir audio.
        grabacionPantallaStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                frameRate: { ideal: 24, max: 30 }
            },
            audio: true,
            preferCurrentTab: true
        });

        // El audio de la pestaña normalmente contiene a los participantes remotos,
        // pero no siempre incluye la propia voz. Añadimos el micrófono del usuario.
        try {
            grabacionMicrofonoStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
        } catch (errorMicrofono) {
            console.warn("No se pudo añadir el micrófono a la grabación.", errorMicrofono);
            grabacionMicrofonoStream = null;
        }

        const videoTrack = grabacionPantallaStream.getVideoTracks()[0];
        if (!videoTrack) throw new Error("No se recibió video de la pestaña seleccionada.");

        grabacionStreamFinal = new MediaStream([videoTrack]);

        const pistasAudioPantalla = grabacionPantallaStream.getAudioTracks();
        const pistasAudioMicrofono = grabacionMicrofonoStream?.getAudioTracks?.() || [];

        if (pistasAudioPantalla.length || pistasAudioMicrofono.length) {
            try {
                grabacionAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                const destino = grabacionAudioContext.createMediaStreamDestination();

                if (pistasAudioPantalla.length) {
                    const fuentePantalla = grabacionAudioContext.createMediaStreamSource(
                        new MediaStream(pistasAudioPantalla)
                    );
                    fuentePantalla.connect(destino);
                }

                if (pistasAudioMicrofono.length) {
                    const fuenteMicrofono = grabacionAudioContext.createMediaStreamSource(
                        new MediaStream(pistasAudioMicrofono)
                    );
                    const gananciaMicrofono = grabacionAudioContext.createGain();
                    gananciaMicrofono.gain.value = 1.0;
                    fuenteMicrofono.connect(gananciaMicrofono).connect(destino);
                }

                destino.stream.getAudioTracks().forEach(track => grabacionStreamFinal.addTrack(track));
            } catch (errorAudio) {
                console.warn("No se pudo mezclar el audio; se utilizará el audio disponible.", errorAudio);
                pistasAudioPantalla.forEach(track => grabacionStreamFinal.addTrack(track));
                if (!pistasAudioPantalla.length) {
                    pistasAudioMicrofono.forEach(track => grabacionStreamFinal.addTrack(track));
                }
            }
        }

        grabacionChunks = [];
        grabacionDeteniendose = false;
        const mimeType = obtenerMimeGrabacion();

        grabacionRecorder = new MediaRecorder(grabacionStreamFinal, {
            mimeType,
            videoBitsPerSecond: 1500000,
            audioBitsPerSecond: 128000
        });

        grabacionRecorder.addEventListener("dataavailable", evento => {
            if (evento.data && evento.data.size > 0) {grabacionChunks.push(evento.data);grabacionBytes+=evento.data.size;if(grabacionBytes>500*1024*1024&&!grabacionDeteniendose)detenerGrabacionLocal();}
        });

        grabacionRecorder.addEventListener("error", evento => {
            console.error("Error de MediaRecorder:", evento.error || evento);
            estadoReunion.textContent = "Ocurrió un error durante la grabación.";
        });

        grabacionFinalizada = new Promise(resolve => {
            grabacionRecorder.addEventListener("stop", async () => {
                try {
                    const blob = new Blob(grabacionChunks, { type: mimeType });
                    grabacionChunks = [];
                    if (!blob.size) throw new Error("La grabación no contiene video.");
                    const fecha = new Date().toISOString().replace(/[:.]/g, "-");
                    const archivo = { blob, nombre: `JJM_reunion_${idReunion}_${fecha}.webm`, fecha: new Date() };
                    grabacionesLocales.push(archivo);
                    descargarGrabacionLocal(archivo);
                    renderizarGrabacionesLocales();
                    limpiarRecursosGrabacion();
                    estadoReunion.textContent = "Guardando grabación en JJM…";
                    try {
                        const guardada=await window.PMOGrabaciones.subir(blob,{sala:esSalaGeneral?'general':String(idReunion),titulo:esSalaGeneral?'Reunión general':(reunionActual.titulo||proyectoActual?.nombre||'Reunión de proyecto'),duracionSegundos:(Date.now()-grabacionInicio)/1000},porcentaje=>{estadoReunion.textContent=`Guardando grabación… ${porcentaje}%`;});
                        archivo.idServidor=guardada.id;renderizarGrabacionesLocales();await window.PMOGrabaciones.cargar();
                        estadoReunion.textContent="Grabación guardada. Ya puedes verla en Videollamadas → Grabaciones.";
                    } catch(e) {estadoReunion.textContent="No se pudo guardar en JJM: "+e.message+" Conserva la copia descargada.";}
                } catch (error) {
                    estadoReunion.textContent = "No se pudo preparar la grabación: " + error.message;
                } finally {
                    limpiarRecursosGrabacion();
                    grabando = false;
                    grabacionDeteniendose = false;
                    actualizarBotonesGrabacion();
                    resolve();
                }
            }, { once: true });
        });

        videoTrack.addEventListener("ended", () => {
            if (grabando && !grabacionDeteniendose) detenerGrabacionLocal();
        });

        grabacionBytes=0;grabacionInicio=Date.now();grabacionRecorder.start(1000);
        grabando = true;
        actualizarBotonesGrabacion();
        estadoReunion.textContent = "● Grabando reunión. Para detener usa el botón Detener.";
    } catch (error) {
        console.error("No fue posible iniciar la grabación integrada:", error);
        limpiarRecursosGrabacion();
        grabando = false;
        grabacionDeteniendose = false;
        actualizarBotonesGrabacion();

        if (error?.name === "NotAllowedError") {
            estadoReunion.textContent = "Grabación cancelada. Debes permitir compartir la pestaña para grabar.";
        } else {
            estadoReunion.textContent = "No fue posible iniciar la grabación: " + (error?.message || "error del navegador");
        }
    }
}

function detenerGrabacionLocal() {
    if (!grabacionRecorder || !grabando || grabacionDeteniendose) return grabacionFinalizada;
    try {
        grabacionDeteniendose = true;
        estadoReunion.textContent = "Deteniendo grabación y preparando el archivo...";
        if (grabacionRecorder.state !== "inactive") {
            grabacionRecorder.stop();
        }
    } catch (error) {
        console.error("No fue posible detener la grabación:", error);
        grabacionDeteniendose = false;
        estadoReunion.textContent = "No fue posible detener la grabación correctamente.";
        throw error;
    }
    return grabacionFinalizada;
}

function limpiarRecursosGrabacion() {
    try {
        grabacionPantallaStream?.getTracks?.().forEach(track => track.stop());
        grabacionMicrofonoStream?.getTracks?.().forEach(track => track.stop());
        grabacionStreamFinal?.getTracks?.().forEach(track => track.stop());
    } catch (_) {}

    try {
        if (grabacionAudioContext && grabacionAudioContext.state !== "closed") {
            grabacionAudioContext.close();
        }
    } catch (_) {}

    grabacionRecorder = null;
    grabacionPantallaStream = null;
    grabacionMicrofonoStream = null;
    grabacionAudioContext = null;
    grabacionStreamFinal = null;
}

function actualizarBotonesGrabacion() {
    btnGrabar.hidden = grabando;
    btnDetenerGrabacion.hidden = !grabando;
    btnGrabar.disabled = !conectadoSala || !grabacionNavegadorSoportada();
}

function renderizarGrabacionesLocales() {
    if (!listaGrabaciones) return;
    listaGrabaciones.innerHTML = grabacionesLocales.some(g=>!g.idServidor) ? grabacionesLocales.map((g,i) => g.idServidor?"":`
        <article class="recording-item"><strong>${escaparHTML(g.nombre)}</strong>
        <small>${formatearBytes(g.blob.size)} · ${formatearFechaHora(g.fecha)}</small>
        <button type="button" data-grabacion-local="${i}">Descargar de nuevo</button></article>`).join("")
        : '<p class="recordings-empty">Los videos guardados aparecen arriba; aquí verás las copias pendientes de guardar.</p>';
    listaGrabaciones.querySelectorAll('[data-grabacion-local]').forEach(b => b.addEventListener('click', () =>
        descargarGrabacionLocal(grabacionesLocales[Number(b.dataset.grabacionLocal)])));
}
function descargarGrabacionLocal(archivo) {
    const url = URL.createObjectURL(archivo.blob);
    const enlace = document.createElement("a");
    enlace.href = url; enlace.download = archivo.nombre;
    document.body.appendChild(enlace); enlace.click(); enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function copiarInvitacion() {
    const url = window.location.href;
    try {
        await navigator.clipboard.writeText(url);
        btnCopiarEnlace.textContent = "Enlace copiado";
        estadoReunion.textContent = esSalaGeneral ? "Invitación copiada. Los usuarios con sesión pueden entrar a la sala general." : "Invitación copiada. Solo administración y miembros asignados pueden entrar.";
        setTimeout(() => { btnCopiarEnlace.textContent = "Copiar invitación"; }, 2200);
    } catch (error) {
        window.prompt("Copia este enlace de reunión:", url);
    }
}

async function colgarVideollamada() {
    if (grabando) {
        const confirmarGrabacion = confirm(
            "Hay una grabación en curso. ¿Deseas detenerla y colgar la videollamada?"
        );
        if (!confirmarGrabacion) return;
        try { await detenerGrabacionLocal(); } catch (_) {}
    }

    saliendo = true;
    estadoReunion.textContent = "Saliendo de la videollamada...";

    try {
        await registrarSalida();
    } catch (_) {}

    try {
        await rtc?.salir();
    } catch (_) {}

    setTimeout(volverAlProyectoSinConfirmar, 250);
}

async function finalizarReunion() {
    if (!reunionActual?.puedeFinalizar) return;
    if (grabando) {
        alert("Detén la grabación antes de finalizar la reunión.");
        return;
    }

    if (!confirm("¿Finalizar la reunión para todos? Ya no aparecerá como reunión activa del proyecto.")) return;

    try {
        const respuesta = await fetch(`${API_REUNIONES}/${idReunion}/finalizar`, { method: "POST" });
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.mensaje || "No fue posible finalizar la reunión.");

        reunionActual = datos.reunion || reunionActual;
        saliendo = true;
        await registrarSalida();
        try { await rtc?.salir(); } catch (_) {}
        setTimeout(volverAlListadoProyectos, 500);
    } catch (error) {
        alert(error.message || "No fue posible finalizar la reunión.");
    }
}

async function volverAlProyecto() {
    if (!confirm("¿Deseas salir de la reunión y volver al proyecto?")) return;
    if (grabando) await detenerGrabacionLocal();
    saliendo = true;
    await registrarSalida();
    try { await rtc?.salir(); } catch (_) {}
    setTimeout(volverAlProyectoSinConfirmar, 400);
}

function volverAlListadoProyectos() {
    if (temporizador) clearInterval(temporizador);
    liberarJitsi();
    const params = new URLSearchParams();
    params.set("reunionFinalizada", "1");
    if (idProyecto) params.set("proyecto", idProyecto);
    window.location.replace("videollamadas.html");
}

function volverAlProyectoSinConfirmar() {
    if (temporizador) clearInterval(temporizador);
    liberarJitsi();
    window.location.href = idProyecto
        ? `detalle-proyecto.html?id=${encodeURIComponent(idProyecto)}`
        : "videollamadas.html";
}

function liberarJitsi() {
    rtc?.salir(true); pantallaCompartida?.getTracks().forEach(t => t.stop());
    camaraPropia?.stop(); camaraPropia=null;
    if (grabando && grabacionRecorder?.state !== "inactive") { try { grabacionRecorder.stop(); } catch (_) {} }
    if (!grabando) limpiarRecursosGrabacion();
}

function ocultarCarga() {
    meetingLoading?.classList.add("hidden");
}

function mostrarErrorConexion(mensaje) {
    estadoReunion.textContent = "Videollamada no disponible.";
    meetingLoading?.classList.remove("hidden");
    meetingLoading?.classList.add("error");
    if (meetingLoadingMessage) meetingLoadingMessage.textContent = mensaje;
}

function actualizarReunionEnURL(id) {
    const url = new URL(window.location.href);
    url.searchParams.delete("sala");
    url.searchParams.set("reunion", id);
    window.history.replaceState({}, "", url.toString());
}

function obtenerUsuarioActivo() {
    try { return JSON.parse(localStorage.getItem("usuarioActivo")) || null; }
    catch (_) { return null; }
}

function obtenerNombreUsuario(usuario) {
    if (!usuario) return "Usuario Oficina de Proyectos";
    const nombreCompleto = obtenerValor(usuario, ["nombreCompleto", "nombre_completo"], "");
    if (nombreCompleto) return nombreCompleto;
    const nombre = obtenerValor(usuario, ["nombre", "name"], "");
    const ap = obtenerValor(usuario, ["apellidoPaterno", "apellido_paterno", "apellido"], "");
    const am = obtenerValor(usuario, ["apellidoMaterno", "apellido_materno"], "");
    return [nombre, ap, am].filter(Boolean).join(" ").trim() || obtenerCorreoUsuario(usuario) || "Usuario Oficina de Proyectos";
}

function obtenerCorreoUsuario(usuario) {
    return obtenerValor(usuario, ["correo", "email", "correoElectronico"], "");
}

function obtenerParametroURL(nombre) {
    return new URLSearchParams(window.location.search).get(nombre);
}

function obtenerValor(objeto, llaves, valorDefault) {
    for (const llave of llaves) {
        if (objeto && objeto[llave] !== undefined && objeto[llave] !== null && objeto[llave] !== "") return objeto[llave];
    }
    return valorDefault;
}

function normalizarTexto(valor) {
    return String(valor || "").trim().toLowerCase();
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatearBytes(bytes) {
    const numero = Number(bytes || 0);
    if (!numero) return "0 MB";
    if (numero < 1024 * 1024) return (numero / 1024).toFixed(1) + " KB";
    return (numero / (1024 * 1024)).toFixed(1) + " MB";
}

function formatearFechaHora(valor) {
    if (!valor) return "";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return String(valor);
    return fecha.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
