const API_PROYECTOS_REUNION = window.apiUrl("/api/proyectos");
const API_REUNIONES = window.apiUrl("/api/reuniones");

const nombreProyectoReunion = document.getElementById("nombreProyectoReunion");
const meetingTimer = document.getElementById("meetingTimer");
const contadorParticipantes = document.getElementById("contadorParticipantes");
const jitsiContainer = document.getElementById("jitsiContainer");
const meetingLoading = document.getElementById("meetingLoading");
const meetingLoadingMessage = document.getElementById("meetingLoadingMessage");
const meetingReconnect = document.getElementById("meetingReconnect");
const estadoReunion = document.getElementById("estadoReunion");
const btnCopiarEnlace = document.getElementById("btnCopiarEnlace");
const btnColgarReunion = document.getElementById("btnColgarReunion");
const btnVolverProyecto = document.getElementById("btnVolverProyecto");
const btnReconectar = document.getElementById("btnReconectar");
const btnGrabar = document.getElementById("btnGrabar");
const btnDetenerGrabacion = document.getElementById("btnDetenerGrabacion");
const btnFinalizarReunion = document.getElementById("btnFinalizarReunion");
const btnSeleccionarGrabacion = document.getElementById("btnSeleccionarGrabacion");
const archivoGrabacion = document.getElementById("archivoGrabacion");
const listaGrabaciones = document.getElementById("listaGrabaciones");
const uploadProgress = document.getElementById("uploadProgress");
const uploadProgressFill = document.getElementById("uploadProgressFill");
const uploadProgressText = document.getElementById("uploadProgressText");

let proyectoActual = null;
let reunionActual = null;
let jitsiApi = null;
let temporizador = null;
let saliendo = false;
let conectadoJitsi = false;
let grabando = false;
let reconectando = false;
let intentosReconexion = 0;
let participanteRegistrado = false;

// Grabación propia de Oficina de Proyectos.
// Se usa MediaRecorder desde la página padre para evitar la limitación de
// grabación local de Jitsi cuando meet.jit.si está embebido en un iframe
// de otro dominio.
let grabacionRecorder = null;
let grabacionChunks = [];
let grabacionPantallaStream = null;
let grabacionMicrofonoStream = null;
let grabacionAudioContext = null;
let grabacionStreamFinal = null;
let grabacionDeteniendose = false;

let usuarioActivo = null;
let tokenSesion = null;
let grabacionFinalizada = Promise.resolve();
const grabacionesLocales = [];
const idProyecto = obtenerParametroURL("id");
let idReunion = obtenerParametroURL("reunion");

document.addEventListener("DOMContentLoaded", async function () {
    if (window.restaurarSesionPMO) await window.restaurarSesionPMO();
    usuarioActivo = obtenerUsuarioActivo();
    tokenSesion = localStorage.getItem("sesionTokenPMO");
    if (!usuarioActivo || !tokenSesion) { window.location.replace("login.html"); return; }
    configurarEventos();
    btnGrabar.disabled = true;

    try {
        await cargarProyecto();
        await cargarReunion();

        if (!reunionActual || normalizarTexto(reunionActual.estado) !== "activa") {
            throw new Error("Esta reunión ya no se encuentra activa.");
        }

        idReunion = reunionActual.id;
        actualizarReunionEnURL(idReunion);
        btnFinalizarReunion.hidden = !reunionActual.puedeFinalizar;
        iniciarTemporizador();
        renderizarGrabacionesLocales();
        const enlaceJitsi = document.getElementById("abrirSalaJitsi");
        enlaceJitsi.href = "https://meet.jit.si/" + encodeURIComponent(reunionActual.sala);
        enlaceJitsi.hidden = false;
        iniciarVideollamada();
    } catch (error) {
        console.error("No fue posible preparar la reunión:", error);
        mostrarErrorConexion(error.message || "No fue posible abrir la reunión.");
    }
});

function configurarEventos() {
    btnCopiarEnlace?.addEventListener("click", copiarInvitacion);
    btnColgarReunion?.addEventListener("click", colgarVideollamada);
    btnVolverProyecto?.addEventListener("click", volverAlProyecto);
    btnReconectar?.addEventListener("click", function () {
        intentosReconexion = 0;
        reconectarVideollamada(true);
    });
    btnGrabar?.addEventListener("click", iniciarGrabacionLocal);
    btnDetenerGrabacion?.addEventListener("click", detenerGrabacionLocal);
    btnFinalizarReunion?.addEventListener("click", finalizarReunion);
    window.addEventListener("pagehide", function () {
        if (!saliendo) registrarSalida({ keepalive: true });
        liberarJitsi();
    });
}

async function cargarProyecto() {
    if (!idProyecto) throw new Error("No se recibió el proyecto de la reunión.");

    const respuesta = await fetch(`${API_PROYECTOS_REUNION}/${encodeURIComponent(idProyecto)}`);
    const cuerpo = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok || cuerpo.estado !== "correcto" || !cuerpo.proyecto) {
        throw new Error(cuerpo.mensaje || "No se pudo cargar el proyecto.");
    }

    proyectoActual = cuerpo.proyecto;
    nombreProyectoReunion.textContent = obtenerValor(
        proyectoActual,
        ["nombre", "name", "titulo"],
        "Proyecto sin nombre"
    );
}

async function cargarReunion() {
    let url;
    if (idReunion) {
        url = `${API_REUNIONES}/${encodeURIComponent(idReunion)}`;
    } else {
        url = `${API_PROYECTOS_REUNION}/${encodeURIComponent(idProyecto)}/reuniones/activa`;
    }

    const respuesta = await fetch(url);
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.mensaje || "No fue posible consultar la reunión.");

    reunionActual = datos.reunion || datos.reunionActiva || null;
    if (!reunionActual) {
        throw new Error("No hay una reunión activa en este proyecto.");
    }
    if (Number(reunionActual.idProyecto) !== Number(idProyecto)) {
        throw new Error("La reunión no pertenece al proyecto indicado. Abre la sala desde Videollamadas.");
    }
}

function iniciarVideollamada() {
    if (!jitsiContainer || !reunionActual) return;

    if (typeof window.JitsiMeetExternalAPI !== "function") {
        mostrarErrorConexion("No se pudo cargar Jitsi Meet. Revisa la conexión a Internet y vuelve a intentar.");
        return;
    }

    const nombreUsuario = obtenerNombreUsuario(usuarioActivo);
    const correoUsuario = obtenerCorreoUsuario(usuarioActivo);
    const nombreProyecto = obtenerValor(proyectoActual, ["nombre", "name", "titulo"], "Reunión de proyecto");

    conectadoJitsi = false;
    btnGrabar.disabled = true;
    meetingReconnect.hidden = true;
    meetingLoading.classList.remove("hidden", "error");
    meetingLoadingMessage.textContent = "Conectando a la misma sala activa del proyecto.";
    estadoReunion.textContent = "Conectando con la sala...";

    try {
        jitsiContainer.innerHTML = "";
        jitsiApi = new JitsiMeetExternalAPI("meet.jit.si", {
            roomName: reunionActual.sala,
            width: "100%",
            height: "100%",
            parentNode: jitsiContainer,
            lang: "es",
            userInfo: {
                displayName: nombreUsuario,
                email: correoUsuario || undefined
            },
            configOverwrite: {
                prejoinPageEnabled: true,
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                disableDeepLinking: true,
                subject: nombreProyecto,
                localRecording: {
                    disable: false,
                    notifyAllParticipants: true
                }
            },
            interfaceConfigOverwrite: {
                MOBILE_APP_PROMO: false,
                TILE_VIEW_MAX_COLUMNS: 4,
                VIDEO_LAYOUT_FIT: "both"
            }
        });

        registrarEventosJitsi(nombreUsuario, nombreProyecto);

        let interfazMostrada = false;
        const mostrarInterfaz = function () {
            if (interfazMostrada) return;
            interfazMostrada = true;
            ocultarCarga();
            estadoReunion.textContent = "Sala lista. Si Jitsi solicita autenticación al creador, complétala para continuar.";
        };

        try {
            const iframe = jitsiApi.getIFrame?.();
            iframe?.addEventListener("load", () => setTimeout(mostrarInterfaz, 600), { once: true });
        } catch (error) {
            console.warn("No se pudo observar la carga de Jitsi.", error);
        }

        setTimeout(mostrarInterfaz, 3500);
    } catch (error) {
        console.error("No se pudo inicializar Jitsi:", error);
        mostrarErrorConexion("No fue posible iniciar la videollamada. Usa Reconectar para volver a intentarlo.");
    }
}

function registrarEventosJitsi(nombreUsuario, nombreProyecto) {
    if (!jitsiApi) return;

    jitsiApi.addEventListener("videoConferenceJoined", async function () {
        conectadoJitsi = true;
        reconectando = false;
        intentosReconexion = 0;
        ocultarCarga();
        meetingReconnect.hidden = true;
        estadoReunion.textContent = "Conectado a la reunión.";
        btnGrabar.disabled = false;

        try {
            jitsiApi.executeCommand("displayName", nombreUsuario);
            jitsiApi.executeCommand("localSubject", nombreProyecto);
        } catch (error) {
            console.warn("No se pudo personalizar la reunión.", error);
        }

        actualizarContadorParticipantes();
        await registrarEntrada();
    });

    jitsiApi.addEventListener("participantJoined", actualizarContadorParticipantes);
    jitsiApi.addEventListener("participantLeft", actualizarContadorParticipantes);

    jitsiApi.addEventListener("audioMuteStatusChanged", evento => {
        estadoReunion.textContent = evento?.muted ? "Micrófono silenciado." : "Micrófono activo.";
    });
    jitsiApi.addEventListener("videoMuteStatusChanged", evento => {
        estadoReunion.textContent = evento?.muted ? "Cámara desactivada." : "Cámara activa.";
    });
    jitsiApi.addEventListener("screenSharingStatusChanged", evento => {
        estadoReunion.textContent = evento?.on ? "Compartiendo pantalla." : "La pantalla dejó de compartirse.";
    });
    jitsiApi.addEventListener("cameraError", () => {
        estadoReunion.textContent = "Jitsi no pudo acceder a la cámara. Revisa los permisos del navegador.";
    });
    jitsiApi.addEventListener("micError", () => {
        estadoReunion.textContent = "Jitsi no pudo acceder al micrófono. Revisa los permisos del navegador.";
    });

    const manejarDesconexion = async function () {
        conectadoJitsi = false;
        btnGrabar.disabled = true;
        await registrarSalida();
        if (!saliendo && normalizarTexto(reunionActual?.estado) === "activa") {
            programarReconexion();
        }
    };

    jitsiApi.addEventListener("videoConferenceLeft", manejarDesconexion);
    jitsiApi.addEventListener("readyToClose", manejarDesconexion);
}

async function registrarEntrada() {
    if (!idReunion || participanteRegistrado) return;
    try {
        const respuesta = await fetch(`${API_REUNIONES}/${idReunion}/unirse`, { method: "POST" });
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo registrar la entrada.");
        participanteRegistrado = true;
    } catch (error) {
        console.warn("No fue posible registrar la entrada a la reunión:", error);
    }
}

async function registrarSalida(opciones = {}) {
    if (!idReunion || !participanteRegistrado) return;
    participanteRegistrado = false;
    try {
        await fetch(`${API_REUNIONES}/${idReunion}/salir`, {
            method: "POST",
            keepalive: Boolean(opciones.keepalive)
        });
    } catch (error) {
        console.warn("No fue posible registrar la salida de la reunión.", error);
    }
}

function programarReconexion() {
    if (reconectando || saliendo) return;
    reconectando = true;
    intentosReconexion += 1;
    meetingReconnect.hidden = false;
    estadoReunion.textContent = "Conexión interrumpida. La sala sigue activa.";

    if (intentosReconexion <= 3) {
        const espera = Math.min(3000 * intentosReconexion, 9000);
        setTimeout(() => {
            if (!saliendo && reconectando) reconectarVideollamada(false);
        }, espera);
    }
}

function reconectarVideollamada(manual) {
    if (saliendo) return;
    reconectando = true;
    liberarJitsi();
    meetingReconnect.hidden = true;
    meetingLoading.classList.remove("hidden", "error");
    meetingLoadingMessage.textContent = manual
        ? "Reconectando a la reunión..."
        : `Reconectando automáticamente (intento ${intentosReconexion})...`;
    setTimeout(iniciarVideollamada, 500);
}

function actualizarContadorParticipantes() {
    if (!jitsiApi || !contadorParticipantes) return;
    try {
        const total = Number(jitsiApi.getNumberOfParticipants?.() || 0);
        contadorParticipantes.textContent = `${total} ${total === 1 ? "participante" : "participantes"}`;
    } catch (error) {
        console.warn("No se pudo actualizar el contador.", error);
    }
}

function iniciarTemporizador() {
    if (temporizador) clearInterval(temporizador);
    const inicio = reunionActual?.fechaInicio ? new Date(reunionActual.fechaInicio).getTime() : Date.now();

    const pintar = function () {
        const segundos = Math.max(0, Math.floor((Date.now() - inicio) / 1000));
        const horas = String(Math.floor(segundos / 3600)).padStart(2, "0");
        const minutos = String(Math.floor((segundos % 3600) / 60)).padStart(2, "0");
        const seg = String(segundos % 60).padStart(2, "0");
        meetingTimer.textContent = `${horas}:${minutos}:${seg}`;
    };

    pintar();
    temporizador = setInterval(pintar, 1000);
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
    if (!jitsiApi || !conectadoJitsi || grabando) return;

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
            if (evento.data && evento.data.size > 0) grabacionChunks.push(evento.data);
        });

        grabacionRecorder.addEventListener("error", evento => {
            console.error("Error de MediaRecorder:", evento.error || evento);
            estadoReunion.textContent = "Ocurrió un error durante la grabación.";
        });

        grabacionFinalizada = new Promise(resolve => {
            grabacionRecorder.addEventListener("stop", () => {
                try {
                    const blob = new Blob(grabacionChunks, { type: mimeType });
                    grabacionChunks = [];
                    if (!blob.size) throw new Error("La grabación no contiene video.");
                    const fecha = new Date().toISOString().replace(/[:.]/g, "-");
                    const archivo = { blob, nombre: `JJM_reunion_${idReunion}_${fecha}.webm`, fecha: new Date() };
                    grabacionesLocales.push(archivo);
                    descargarGrabacionLocal(archivo);
                    renderizarGrabacionesLocales();
                    estadoReunion.textContent = "Grabación lista. Guarda el archivo en tu equipo.";
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

        grabacionRecorder.start(1000);
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
    btnGrabar.disabled = !conectadoJitsi || !grabacionNavegadorSoportada();
}

function renderizarGrabacionesLocales() {
    if (!listaGrabaciones) return;
    listaGrabaciones.innerHTML = grabacionesLocales.length ? grabacionesLocales.map((g,i) => `
        <article class="recording-item"><strong>${escaparHTML(g.nombre)}</strong>
        <small>${formatearBytes(g.blob.size)} · ${formatearFechaHora(g.fecha)}</small>
        <button type="button" data-grabacion-local="${i}">Descargar de nuevo</button></article>`).join("")
        : '<p class="recordings-empty">Aquí aparecerán los videos que grabes durante esta sesión.</p>';
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
        estadoReunion.textContent = "Invitación copiada. Los miembros del proyecto también pueden entrar desde el detalle del proyecto.";
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
        jitsiApi?.executeCommand("hangup");
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
        try { jitsiApi?.executeCommand("hangup"); } catch (_) {}
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
    try { jitsiApi?.executeCommand("hangup"); } catch (_) {}
    setTimeout(volverAlProyectoSinConfirmar, 400);
}

function volverAlListadoProyectos() {
    if (temporizador) clearInterval(temporizador);
    liberarJitsi();
    const params = new URLSearchParams();
    params.set("reunionFinalizada", "1");
    if (idProyecto) params.set("proyecto", idProyecto);
    window.location.replace(`proyectos.html?${params.toString()}`);
}

function volverAlProyectoSinConfirmar() {
    if (temporizador) clearInterval(temporizador);
    liberarJitsi();
    window.location.href = idProyecto
        ? `detalle-proyecto.html?id=${encodeURIComponent(idProyecto)}`
        : "proyectos.html";
}

function liberarJitsi() {
    if (grabando && grabacionRecorder?.state !== "inactive") {
        try { grabacionRecorder.stop(); } catch (_) {}
    }
    limpiarRecursosGrabacion();
    if (!jitsiApi) return;
    try { jitsiApi.dispose(); } catch (error) { console.warn("No se pudo liberar Jitsi.", error); }
    jitsiApi = null;
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
