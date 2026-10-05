/* =========================================================
   PERFIL PMO
   Versión corregida con sesión, verificación por Gmail,
   preferencias y cierre seguro de sesión.
========================================================= */

const profileMenuButtons =
    document.querySelectorAll(".profile-menu-btn");
const profileSections =
    document.querySelectorAll(".profile-section");

const formPerfil =
    document.getElementById("formPerfil");
const nombrePerfil =
    document.getElementById("nombrePerfil");
const apellidoPaternoPerfil = document.getElementById("apellidoPaternoPerfil");
const apellidoMaternoPerfil = document.getElementById("apellidoMaternoPerfil");
const usuarioPerfil =
    document.getElementById("usuarioPerfil");
const descripcionPerfil =
    document.getElementById("descripcionPerfil");

const fotoPerfil =
    document.getElementById("fotoPerfil");
const fotoPerfilPreview =
    document.getElementById("fotoPerfilPreview");
const avatarPreview =
    document.getElementById("avatarPreview");

const formPreferencias =
    document.getElementById("formPreferencias");
const idiomaPerfil =
    document.getElementById("idiomaPerfil");
const zonaHorariaPerfil =
    document.getElementById("zonaHorariaPerfil");

const correoPerfil =
    document.getElementById("correoPerfil");
const passwordActualPerfil =
    document.getElementById("passwordActualPerfil");
const btnActualizarCorreo =
    document.getElementById("btnActualizarCorreo");

const btnConfigurarAuth =
    document.getElementById("btnConfigurarAuth");
const estadoAutenticacionTexto =
    document.getElementById("estadoAutenticacionTexto");

const modalAuth =
    document.getElementById("modalAuth");
const btnCerrarAuth =
    document.getElementById("btnCerrarAuth");
const authMethodCards =
    document.querySelectorAll(".auth-method-card");

const modalCodigo =
    document.getElementById("modalCodigo");
const btnCerrarCodigo =
    document.getElementById("btnCerrarCodigo");
const btnCancelarCodigo =
    document.getElementById("btnCancelarCodigo");
const formCodigoAuth =
    document.getElementById("formCodigoAuth");
const codigoAuthTexto =
    document.getElementById("codigoAuthTexto");
const codigoAuthInputs =
    document.querySelectorAll(".codigo-auth-input");

const btnOlvidePassword =
    document.getElementById("btnOlvidePassword");
const modalRecuperarPassword =
    document.getElementById("modalRecuperarPassword");
const btnCerrarRecuperar =
    document.getElementById("btnCerrarRecuperar");
const btnCancelarRecuperar =
    document.getElementById("btnCancelarRecuperar");
const btnVolverCorreo =
    document.getElementById("btnVolverCorreo");
const btnCancelarNuevaPassword =
    document.getElementById("btnCancelarNuevaPassword");

const formEnviarCodigoPassword =
    document.getElementById("formEnviarCodigoPassword");
const formValidarCodigoPassword =
    document.getElementById("formValidarCodigoPassword");
const formNuevaPassword =
    document.getElementById("formNuevaPassword");

const correoRecuperacion =
    document.getElementById("correoRecuperacion");
const codigoRecuperacionTexto =
    document.getElementById("codigoRecuperacionTexto");
const nuevaPasswordRecuperacion =
    document.getElementById("nuevaPasswordRecuperacion");
const confirmarPasswordRecuperacion =
    document.getElementById("confirmarPasswordRecuperacion");
const codigoRecuperacionInputs =
    document.querySelectorAll(".codigo-recuperacion-input");

let usuarioActivoPerfil = obtenerUsuarioActivoPerfil();

let codigoAuthGenerado = "";
let metodoAuthSeleccionado = "";
let codigoRecuperacionGenerado = "";
let intervaloRelojPerfil = null;

document.addEventListener("DOMContentLoaded", async function () {
    if (window.restaurarSesionPMO) await window.restaurarSesionPMO();
    usuarioActivoPerfil = obtenerUsuarioActivoPerfil();

    if (!usuarioActivoPerfil) {
        window.location.replace("login.html");
        return;
    }

    configurarNavegacionPerfil();
    cargarPerfil();
    configurarPerfil();
    configurarCambioCorreoBackend();
    configurarPreferencias();
    aplicarPreferenciasVisuales();
    iniciarRelojPerfil();
    configurarAutenticacion();
    configurarRecuperacionPassword();
    configurarCierreSesionPerfil();
});

/* =========================================================
   SESIÓN
========================================================= */

function obtenerUsuarioActivoPerfil() {
    try {
        return JSON.parse(
            localStorage.getItem("usuarioActivo")
        ) || null;
    } catch (error) {
        console.error("No fue posible leer usuarioActivo:", error);
        return null;
    }
}

function guardarUsuarioActivoPerfil(usuario) {
    localStorage.setItem(
        "usuarioActivo",
        JSON.stringify(usuario)
    );
}

function obtenerIdUsuarioPerfil() {
    if (!usuarioActivoPerfil) {
        return "anonimo";
    }

    return usuarioActivoPerfil.id ||
        usuarioActivoPerfil.idUsuario ||
        usuarioActivoPerfil.id_usuario ||
        "anonimo";
}

function obtenerNombreSesionPerfil() {
    if (!usuarioActivoPerfil) {
        return "";
    }

    return usuarioActivoPerfil.nombreCompleto ||
        construirNombreCompletoPerfil(usuarioActivoPerfil) ||
        usuarioActivoPerfil.nombre ||
        "";
}

function obtenerCorreoSesionPerfil() {
    if (!usuarioActivoPerfil) {
        return "";
    }

    return usuarioActivoPerfil.correo ||
        usuarioActivoPerfil.email ||
        "";
}

function obtenerRolSesionPerfil() {
    if (!usuarioActivoPerfil) {
        return "";
    }

    if (
        usuarioActivoPerfil.rol &&
        typeof usuarioActivoPerfil.rol === "object"
    ) {
        return usuarioActivoPerfil.rol.nombre || "";
    }

    return usuarioActivoPerfil.rol ||
        usuarioActivoPerfil.rolNombre ||
        usuarioActivoPerfil.nombreRol ||
        "";
}

function construirNombreCompletoPerfil(usuario) {
    const partes = [
        usuario.nombre,
        usuario.apellidoPaterno,
        usuario.apellidoMaterno
    ].filter(function (parte) {
        return parte && String(parte).trim();
    });

    return partes.join(" ").trim();
}

function obtenerClavePerfil() {
    return `perfilUsuarioPMO_${obtenerIdUsuarioPerfil()}`;
}

/* =========================================================
   NAVEGACIÓN DE SECCIONES
========================================================= */

function configurarNavegacionPerfil() {
    profileMenuButtons.forEach(function (boton) {
        boton.addEventListener("click", function () {
            const section =
                boton.getAttribute("data-section");

            profileMenuButtons.forEach(function (btn) {
                btn.classList.remove("active");
            });

            profileSections.forEach(function (seccion) {
                seccion.classList.remove("active");
            });

            boton.classList.add("active");

            const seccionActiva =
                document.getElementById(
                    "section-" + section
                );

            if (seccionActiva) {
                seccionActiva.classList.add("active");
            }
        });
    });
}

/* =========================================================
   PERFIL GENERAL
========================================================= */

function obtenerPerfil() {
    try {
        return JSON.parse(
            localStorage.getItem(obtenerClavePerfil())
        ) || {};
    } catch (error) {
        return {};
    }
}

function guardarPerfilStorage(perfil) {
    localStorage.setItem(
        obtenerClavePerfil(),
        JSON.stringify(perfil)
    );

    localStorage.setItem(
        `perfilUsuario_${obtenerIdUsuarioPerfil()}`,
        JSON.stringify(perfil)
    );
}

function cargarPerfil() {
    const perfil = obtenerPerfil();

    if (nombrePerfil) {
        nombrePerfil.value =
            usuarioActivoPerfil?.nombre ||
            "";
    }
    if (apellidoPaternoPerfil) apellidoPaternoPerfil.value = usuarioActivoPerfil?.apellidoPaterno || "";
    if (apellidoMaternoPerfil) apellidoMaternoPerfil.value = usuarioActivoPerfil?.apellidoMaterno || "";

    if (usuarioPerfil) {
        usuarioPerfil.value =
            perfil.usuario ||
            obtenerCorreoSesionPerfil().split("@")[0] ||
            "";
    }

    if (descripcionPerfil) {
        descripcionPerfil.value =
            perfil.descripcion ||
            `Rol en la plataforma: ${obtenerRolSesionPerfil() || "Usuario"}.`;
    }

    if (correoPerfil) {
        correoPerfil.value =
            obtenerCorreoSesionPerfil() ||
            perfil.correo ||
            "";
    }

    if (idiomaPerfil) {
        idiomaPerfil.value =
            perfil.idioma ||
            usuarioActivoPerfil?.idioma ||
            "es";
    }

    if (zonaHorariaPerfil) {
        zonaHorariaPerfil.value =
            perfil.zonaHoraria ||
            "America/Mexico_City";
    }

    if (perfil.foto && fotoPerfilPreview && avatarPreview) {
        fotoPerfilPreview.src = perfil.foto;
        avatarPreview.classList.add("has-image");
    }

    actualizarEstadoAutenticacion();
    bloquearCamposDeReferencia();
}

function bloquearCamposDeReferencia() {
    if (passwordActualPerfil) {
        passwordActualPerfil.value = "";
        passwordActualPerfil.placeholder =
            "Ingresa tu contraseña para cambiar el correo";
    }
}

function configurarPerfil() {
    if (formPerfil) {
        formPerfil.addEventListener("submit", guardarInformacionPerfilBackend);
    }

    if (fotoPerfil) {
        fotoPerfil.addEventListener("change", function () {
            const archivo = fotoPerfil.files[0];

            if (!archivo) {
                return;
            }

            if (!archivo.type.startsWith("image/")) {
                alert("Selecciona un archivo de imagen válido.");
                fotoPerfil.value = "";
                return;
            }

            const lector = new FileReader();

            lector.onload = function (event) {
                const perfil = obtenerPerfil();

                perfil.foto = event.target.result;
                perfil.fechaActualizacion =
                    new Date().toISOString();

                guardarPerfilStorage(perfil);

                if (fotoPerfilPreview && avatarPreview) {
                    fotoPerfilPreview.src = perfil.foto;
                    avatarPreview.classList.add("has-image");
                }
            };

            lector.readAsDataURL(archivo);
        });
    }
}

async function guardarInformacionPerfilBackend(event) {
    event.preventDefault();

    const nombre = nombrePerfil
        ? nombrePerfil.value.trim().replace(/\s+/g, " ")
        : "";
    const apellidoPaterno = apellidoPaternoPerfil?.value.trim() || "";
    const apellidoMaterno = apellidoMaternoPerfil?.value.trim() || "";
    const nombreCompleto = [nombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ");

    if (!nombre) {
        alert("Ingresa tu nombre completo.");
        if (nombrePerfil) nombrePerfil.focus();
        return;
    }

    if ([nombre, apellidoPaterno, apellidoMaterno].some(parte => parte.length > 100)) {
        alert("Cada parte del nombre puede tener hasta 100 caracteres.");
        if (nombrePerfil) nombrePerfil.focus();
        return;
    }
    if (nombreCompleto.length > 180) {
        alert("El nombre completo no puede superar 180 caracteres.");
        return;
    }

    const botonGuardar = formPerfil
        ? formPerfil.querySelector('button[type="submit"]')
        : null;
    const textoOriginal = botonGuardar ? botonGuardar.textContent : "";

    if (botonGuardar) {
        botonGuardar.disabled = true;
        botonGuardar.textContent = "Guardando...";
    }

    try {
        const respuesta = await fetch(`${API_AUTH_PERFIL}/perfil/nombre`, {
            method: "PUT",
            headers: obtenerHeadersPerfilJSON(),
            body: JSON.stringify({ nombre, apellidoPaterno, apellidoMaterno })
        });

        const datos = await obtenerRespuestaJSONPerfil(respuesta);

        if (!respuesta.ok) {
            alert(datos.mensaje || "No fue posible actualizar el nombre.");
            return;
        }

        if (datos.usuario) {
            usuarioActivoPerfil = datos.usuario;
            guardarUsuarioActivoPerfil(datos.usuario);
        } else if (usuarioActivoPerfil) {
            usuarioActivoPerfil.nombreCompleto = nombreCompleto;
            guardarUsuarioActivoPerfil(usuarioActivoPerfil);
        }

        const perfil = obtenerPerfil();
        perfil.nombre = datos.usuario?.nombreCompleto || nombreCompleto;
        perfil.usuario = usuarioPerfil ? usuarioPerfil.value.trim() : "";
        perfil.descripcion = descripcionPerfil ? descripcionPerfil.value.trim() : "";
        perfil.fechaActualizacion = new Date().toISOString();
        guardarPerfilStorage(perfil);

        if (nombrePerfil) {
            nombrePerfil.value = datos.usuario?.nombre || nombre;
        }

        alert(datos.mensaje || "Información de perfil guardada correctamente.");
    } catch (error) {
        console.error("Error al actualizar nombre:", error);
        alert("No fue posible conectar con el backend para actualizar el nombre.");
    } finally {
        if (botonGuardar) {
            botonGuardar.disabled = false;
            botonGuardar.textContent = textoOriginal;
        }
    }
}

function actualizarSesionDesdePerfil(perfil) {
    if (!usuarioActivoPerfil) {
        return;
    }

    if (perfil.nombre) {
        usuarioActivoPerfil.nombreCompleto = perfil.nombre;
    }

    if (perfil.correo) {
        usuarioActivoPerfil.correo = perfil.correo;
    }

    if (perfil.idioma) {
        usuarioActivoPerfil.idioma = perfil.idioma;
    }

    guardarUsuarioActivoPerfil(usuarioActivoPerfil);
}

/* =========================================================
   CAMBIO REAL DE CORREO EN BACKEND
========================================================= */

function configurarCambioCorreoBackend() {
    if (!btnActualizarCorreo) {
        return;
    }

    btnActualizarCorreo.addEventListener("click", actualizarCorreoPerfilBackend);
}

async function actualizarCorreoPerfilBackend() {
    if (!correoPerfil || !passwordActualPerfil) {
        return;
    }

    const nuevoCorreo = correoPerfil.value.trim().toLowerCase();
    const contrasenaActual = passwordActualPerfil.value;
    const correoActual = String(obtenerCorreoSesionPerfil() || "").trim().toLowerCase();

    if (!nuevoCorreo) {
        alert("Ingresa el nuevo correo electrónico.");
        correoPerfil.focus();
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoCorreo)) {
        alert("Ingresa un correo electrónico válido.");
        correoPerfil.focus();
        return;
    }

    if (!contrasenaActual) {
        alert("Ingresa tu contraseña actual para autorizar el cambio.");
        passwordActualPerfil.focus();
        return;
    }

    if (nuevoCorreo === correoActual) {
        alert("Ese correo ya está asociado a tu cuenta.");
        return;
    }

    const textoOriginal = btnActualizarCorreo.textContent;
    btnActualizarCorreo.disabled = true;
    btnActualizarCorreo.textContent = "Actualizando...";

    try {
        const respuesta = await fetch(`${API_AUTH_PERFIL}/perfil/correo`, {
            method: "PUT",
            headers: obtenerHeadersPerfilJSON(),
            body: JSON.stringify({
                correo: nuevoCorreo,
                contrasenaActual: contrasenaActual
            })
        });

        const datos = await obtenerRespuestaJSONPerfil(respuesta);

        if (!respuesta.ok) {
            alert(datos.mensaje || "No fue posible actualizar el correo.");
            return;
        }

        if (datos.usuario) {
            usuarioActivoPerfil = datos.usuario;
            guardarUsuarioActivoPerfil(datos.usuario);
        } else if (usuarioActivoPerfil) {
            usuarioActivoPerfil.correo = nuevoCorreo;
            usuarioActivoPerfil.autenticacionActiva = false;
            usuarioActivoPerfil.metodoAutenticacion = null;
            usuarioActivoPerfil.fechaAutenticacion = null;
            guardarUsuarioActivoPerfil(usuarioActivoPerfil);
        }

        const perfil = obtenerPerfil();
        perfil.correo = nuevoCorreo;
        perfil.autenticacionActiva = false;
        perfil.metodoAutenticacion = null;
        perfil.fechaAutenticacion = null;
        perfil.fechaActualizacion = new Date().toISOString();
        guardarPerfilStorage(perfil);

        correoPerfil.value = nuevoCorreo;
        passwordActualPerfil.value = "";
        actualizarEstadoAutenticacion();

        alert((datos.mensaje || "Correo actualizado correctamente.") +
            " A partir de ahora inicia sesión con el nuevo correo.");

    } catch (error) {
        console.error("Error al actualizar correo:", error);
        alert("No fue posible conectar con el backend para actualizar el correo.");
    } finally {
        btnActualizarCorreo.disabled = false;
        btnActualizarCorreo.textContent = textoOriginal;
    }
}

/* =========================================================
   PREFERENCIAS
========================================================= */

function configurarPreferencias() {
    if (formPreferencias) {
        formPreferencias.addEventListener("submit", function (event) {
            event.preventDefault();

            const perfil = obtenerPerfil();

            perfil.idioma =
                idiomaPerfil ? idiomaPerfil.value : "es";
            perfil.zonaHoraria =
                zonaHorariaPerfil
                    ? zonaHorariaPerfil.value
                    : "America/Mexico_City";
            perfil.fechaActualizacionPreferencias =
                new Date().toISOString();

            guardarPerfilStorage(perfil);
            actualizarSesionDesdePerfil(perfil);

            if (typeof guardarIdiomaGlobalPMO === "function") {
                guardarIdiomaGlobalPMO(perfil.idioma);
            }

            aplicarPreferenciasVisuales();
            iniciarRelojPerfil();

            alert("Preferencias de hora e idioma guardadas correctamente.");
        });
    }

    if (idiomaPerfil) {
        idiomaPerfil.addEventListener("change", function () {
            const perfil = obtenerPerfil();
            perfil.idioma = idiomaPerfil.value || "es";
            guardarPerfilStorage(perfil);
            actualizarSesionDesdePerfil(perfil);

            if (typeof guardarIdiomaGlobalPMO === "function") {
                guardarIdiomaGlobalPMO(perfil.idioma);
            }

            aplicarPreferenciasVisuales();
        });
    }

    if (zonaHorariaPerfil) {
        zonaHorariaPerfil.addEventListener("change", function () {
            const perfil = obtenerPerfil();
            perfil.zonaHoraria = zonaHorariaPerfil.value || "America/Mexico_City";
            guardarPerfilStorage(perfil);
            iniciarRelojPerfil();
        });
    }
}


function obtenerLocalePerfil() {
    const perfil = obtenerPerfil();
    const idioma = perfil.idioma || usuarioActivoPerfil?.idioma || "es";

    const locales = {
        es: "es-MX",
        en: "en-US",
        zh: "zh-CN",
        hi: "hi-IN",
        ar: "ar-SA",
        fr: "fr-FR",
        ru: "ru-RU",
        pt: "pt-BR",
        de: "de-DE",
        ja: "ja-JP",
        ko: "ko-KR",
        it: "it-IT",
        tr: "tr-TR"
    };

    return locales[idioma] || "es-MX";
}

function obtenerNombreIdiomaPerfil(idioma) {
    const nombres = {
        es: "Español",
        en: "Inglés",
        zh: "Chino mandarín",
        hi: "Hindi",
        ar: "Árabe",
        fr: "Francés",
        ru: "Ruso",
        pt: "Portugués",
        de: "Alemán",
        ja: "Japonés",
        ko: "Coreano",
        it: "Italiano",
        tr: "Turco"
    };

    return nombres[idioma] || "Español";
}

function obtenerNombreZonaHorariaPerfil(zonaHoraria) {
    const nombres = {
        "America/Mexico_City": "Ciudad de México",
        "America/Tijuana": "Tijuana",
        "America/Cancun": "Cancún",
        "America/New_York": "Nueva York",
        "Europe/Madrid": "Madrid"
    };

    return nombres[zonaHoraria] || zonaHoraria || "Ciudad de México";
}

function crearPanelHoraIdioma() {
    let panel = document.getElementById("panelHoraIdiomaActivo");

    if (panel) {
        return panel;
    }

    const seccionHora = document.getElementById("section-hora");
    const tarjeta = seccionHora
        ? seccionHora.querySelector(".profile-card")
        : null;

    if (!tarjeta) {
        return null;
    }

    panel = document.createElement("div");
    panel.id = "panelHoraIdiomaActivo";
    panel.className = "security-grid";
    panel.style.marginTop = "22px";

    panel.innerHTML = `
        <article class="security-box">
            <div>
                <h3 id="tituloIdiomaActivo">Idioma activo</h3>
                <p id="textoIdiomaActivo">—</p>
            </div>
        </article>

        <article class="security-box">
            <div>
                <h3 id="tituloZonaActiva">Zona horaria activa</h3>
                <p id="textoZonaActiva">—</p>
            </div>
        </article>

        <article class="security-box">
            <div>
                <h3 id="tituloHoraActual">Hora actual</h3>
                <p id="textoHoraActual">—</p>
            </div>
        </article>

        <article class="security-box">
            <div>
                <h3 id="tituloFechaActual">Fecha local</h3>
                <p id="textoFechaActual">—</p>
            </div>
        </article>
    `;

    tarjeta.appendChild(panel);
    return panel;
}

function actualizarPanelHoraIdioma() {
    const perfil = obtenerPerfil();
    const idioma = perfil.idioma || usuarioActivoPerfil?.idioma || "es";
    const zonaHoraria = perfil.zonaHoraria || "America/Mexico_City";
    const locale = obtenerLocalePerfil();
    const ahora = new Date();

    crearPanelHoraIdioma();

    actualizarTextoPorId(
        "textoIdiomaActivo",
        obtenerNombreIdiomaPerfil(idioma)
    );

    actualizarTextoPorId(
        "textoZonaActiva",
        obtenerNombreZonaHorariaPerfil(zonaHoraria)
    );

    try {
        actualizarTextoPorId(
            "textoHoraActual",
            new Intl.DateTimeFormat(locale, {
                timeZone: zonaHoraria,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }).format(ahora)
        );

        actualizarTextoPorId(
            "textoFechaActual",
            new Intl.DateTimeFormat(locale, {
                timeZone: zonaHoraria,
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }).format(ahora)
        );
    } catch (error) {
        actualizarTextoPorId("textoHoraActual", "Zona horaria no válida");
        actualizarTextoPorId("textoFechaActual", "Revisa la configuración");
    }
}

function iniciarRelojPerfil() {
    crearPanelHoraIdioma();
    actualizarPanelHoraIdioma();

    if (intervaloRelojPerfil) {
        clearInterval(intervaloRelojPerfil);
    }

    intervaloRelojPerfil = setInterval(
        actualizarPanelHoraIdioma,
        1000
    );
}

function aplicarPreferenciasVisuales() {
    const perfil = obtenerPerfil();
    const idioma = perfil.idioma || usuarioActivoPerfil?.idioma || "es";

    document.documentElement.lang = idioma;
    actualizarPanelHoraIdioma();

    const textos = obtenerTextosPerfilPorIdioma(idioma);

    actualizarTextoSelector(".page-header h1", textos.tituloPerfil);
    actualizarTextoSelector(".page-header p", textos.descripcionPerfil);

    actualizarTextoBotonSeccion("general", textos.menuGeneral);
    actualizarTextoBotonSeccion("datos", textos.menuDatos);
    actualizarTextoBotonSeccion("hora", textos.menuHora);
    actualizarTextoBotonSeccion("politicas", textos.menuPoliticas);
    actualizarTextoBotonSeccion("contactos", textos.menuContactos);

    actualizarTextoSelector("#section-hora .section-title h2", textos.tituloHoraIdioma);
    actualizarTextoSelector("#section-hora .section-title p", textos.descripcionHoraIdioma);
    actualizarTextoLabel("idiomaPerfil", textos.labelIdioma);
    actualizarTextoLabel("zonaHorariaPerfil", textos.labelZonaHoraria);

    const botonGuardarPreferencias = formPreferencias
        ? formPreferencias.querySelector("button[type='submit']")
        : null;

    if (botonGuardarPreferencias) {
        botonGuardarPreferencias.textContent = textos.botonGuardarPreferencias;
    }

    actualizarTextoPorId("tituloIdiomaActivo", textos.idiomaActivo);
    actualizarTextoPorId("tituloZonaActiva", textos.zonaActiva);
    actualizarTextoPorId("tituloHoraActual", textos.horaActual);
    actualizarTextoPorId("tituloFechaActual", textos.fechaLocal);
}

function obtenerTextosPerfilPorIdioma(idioma) {
    const diccionario = {
        es: {
            tituloPerfil: "Perfil",
            descripcionPerfil: "Administra tu información personal, seguridad, preferencias y políticas de uso.",
            menuGeneral: "Información general",
            menuDatos: "Datos y seguridad",
            menuHora: "Hora e idioma",
            menuPoliticas: "Condiciones y políticas",
            menuContactos: "Contactos",
            tituloHoraIdioma: "Hora e idioma",
            descripcionHoraIdioma: "Configura las preferencias regionales de la plataforma.",
            labelIdioma: "Idioma",
            labelZonaHoraria: "Zona horaria",
            botonGuardarPreferencias: "Guardar preferencias",
            idiomaActivo: "Idioma activo",
            zonaActiva: "Zona horaria activa",
            horaActual: "Hora actual",
            fechaLocal: "Fecha local"
        },
        en: {
            tituloPerfil: "Profile",
            descripcionPerfil: "Manage your personal information, security, preferences, and usage policies.",
            menuGeneral: "General information",
            menuDatos: "Data and security",
            menuHora: "Time and language",
            menuPoliticas: "Terms and policies",
            menuContactos: "Contacts",
            tituloHoraIdioma: "Time and language",
            descripcionHoraIdioma: "Configure the platform regional preferences.",
            labelIdioma: "Language",
            labelZonaHoraria: "Time zone",
            botonGuardarPreferencias: "Save preferences",
            idiomaActivo: "Active language",
            zonaActiva: "Active time zone",
            horaActual: "Current time",
            fechaLocal: "Local date"
        },
        pt: {
            tituloPerfil: "Perfil",
            descripcionPerfil: "Gerencie suas informações pessoais, segurança, preferências e políticas de uso.",
            menuGeneral: "Informações gerais",
            menuDatos: "Dados e segurança",
            menuHora: "Hora e idioma",
            menuPoliticas: "Termos e políticas",
            menuContactos: "Contatos",
            tituloHoraIdioma: "Hora e idioma",
            descripcionHoraIdioma: "Configure as preferências regionais da plataforma.",
            labelIdioma: "Idioma",
            labelZonaHoraria: "Fuso horário",
            botonGuardarPreferencias: "Salvar preferências",
            idiomaActivo: "Idioma ativo",
            zonaActiva: "Fuso horário ativo",
            horaActual: "Hora atual",
            fechaLocal: "Data local"
        },
        fr: {
            tituloPerfil: "Profil",
            descripcionPerfil: "Gérez vos informations personnelles, la sécurité, les préférences et les politiques d’utilisation.",
            menuGeneral: "Informations générales",
            menuDatos: "Données et sécurité",
            menuHora: "Heure et langue",
            menuPoliticas: "Conditions et politiques",
            menuContactos: "Contacts",
            tituloHoraIdioma: "Heure et langue",
            descripcionHoraIdioma: "Configurez les préférences régionales de la plateforme.",
            labelIdioma: "Langue",
            labelZonaHoraria: "Fuseau horaire",
            botonGuardarPreferencias: "Enregistrer",
            idiomaActivo: "Langue active",
            zonaActiva: "Fuseau horaire actif",
            horaActual: "Heure actuelle",
            fechaLocal: "Date locale"
        },
        de: {
            tituloPerfil: "Profil",
            descripcionPerfil: "Verwalte persönliche Informationen, Sicherheit, Einstellungen und Nutzungsrichtlinien.",
            menuGeneral: "Allgemeine Informationen",
            menuDatos: "Daten und Sicherheit",
            menuHora: "Zeit und Sprache",
            menuPoliticas: "Bedingungen und Richtlinien",
            menuContactos: "Kontakte",
            tituloHoraIdioma: "Zeit und Sprache",
            descripcionHoraIdioma: "Konfiguriere die regionalen Einstellungen der Plattform.",
            labelIdioma: "Sprache",
            labelZonaHoraria: "Zeitzone",
            botonGuardarPreferencias: "Einstellungen speichern",
            idiomaActivo: "Aktive Sprache",
            zonaActiva: "Aktive Zeitzone",
            horaActual: "Aktuelle Uhrzeit",
            fechaLocal: "Lokales Datum"
        },
        it: {
            tituloPerfil: "Profilo",
            descripcionPerfil: "Gestisci informazioni personali, sicurezza, preferenze e politiche d’uso.",
            menuGeneral: "Informazioni generali",
            menuDatos: "Dati e sicurezza",
            menuHora: "Ora e lingua",
            menuPoliticas: "Termini e politiche",
            menuContactos: "Contatti",
            tituloHoraIdioma: "Ora e lingua",
            descripcionHoraIdioma: "Configura le preferenze regionali della piattaforma.",
            labelIdioma: "Lingua",
            labelZonaHoraria: "Fuso orario",
            botonGuardarPreferencias: "Salva preferenze",
            idiomaActivo: "Lingua attiva",
            zonaActiva: "Fuso orario attivo",
            horaActual: "Ora attuale",
            fechaLocal: "Data locale"
        }
    };

    return diccionario[idioma] || diccionario.es;
}

function actualizarTextoSelector(selector, texto) {
    const elemento = document.querySelector(selector);

    if (elemento && texto) {
        elemento.textContent = texto;
    }
}

function actualizarTextoPorId(id, texto) {
    const elemento = document.getElementById(id);

    if (elemento && texto !== undefined) {
        elemento.textContent = texto;
    }
}

function actualizarTextoBotonSeccion(seccion, texto) {
    const boton = document.querySelector(
        `.profile-menu-btn[data-section="${seccion}"]`
    );

    if (boton && texto) {
        boton.textContent = texto;
    }
}

function actualizarTextoLabel(idControl, texto) {
    const etiqueta = document.querySelector(`label[for="${idControl}"]`);

    if (etiqueta && texto) {
        etiqueta.textContent = texto;
    }
}

/* =========================================================
   AUTENTICACIÓN SIMULADA
========================================================= */

function configurarAutenticacion() {
    if (btnConfigurarAuth) {
        btnConfigurarAuth.addEventListener("click", function () {
            abrirModal(modalAuth);
        });
    }

    if (btnCerrarAuth) {
        btnCerrarAuth.addEventListener("click", function () {
            cerrarModal(modalAuth);
        });
    }

    if (btnCerrarCodigo) {
        btnCerrarCodigo.addEventListener("click", function () {
            cerrarModal(modalCodigo);
        });
    }

    if (btnCancelarCodigo) {
        btnCancelarCodigo.addEventListener("click", function () {
            cerrarModal(modalCodigo);
        });
    }

    authMethodCards.forEach(function (card) {
        card.addEventListener("click", function () {
            metodoAuthSeleccionado =
                card.getAttribute("data-method");
            iniciarVerificacionAuth(metodoAuthSeleccionado);
        });
    });

    if (formCodigoAuth) {
        formCodigoAuth.addEventListener("submit", function (event) {
            event.preventDefault();
            validarCodigoAuth();
        });
    }

    configurarInputsCodigo(codigoAuthInputs);
}

function iniciarVerificacionAuth(metodo) {
    codigoAuthGenerado = generarCodigo();

    cerrarModal(modalAuth);

    if (codigoAuthTexto) {
        codigoAuthTexto.textContent =
            `Código de prueba: ${codigoAuthGenerado}. Ingresa el código para activar la autenticación por ${obtenerNombreMetodo(metodo)}.`;
    }

    limpiarInputs(codigoAuthInputs);
    abrirModal(modalCodigo);

    if (codigoAuthInputs.length > 0) {
        codigoAuthInputs[0].focus();
    }
}

function validarCodigoAuth() {
    const codigoIngresado =
        obtenerCodigoInputs(codigoAuthInputs);

    if (codigoIngresado !== codigoAuthGenerado) {
        alert("El código ingresado no es correcto.");
        return;
    }

    const perfil = obtenerPerfil();

    perfil.autenticacionActiva = true;
    perfil.metodoAutenticacion = metodoAuthSeleccionado;
    perfil.fechaAutenticacion =
        new Date().toISOString();

    guardarPerfilStorage(perfil);

    cerrarModal(modalCodigo);
    actualizarEstadoAutenticacion();

    alert("Autenticación configurada correctamente.");
}

function actualizarEstadoAutenticacion() {
    const perfil = obtenerPerfil();

    if (!estadoAutenticacionTexto) {
        return;
    }

    if (perfil.autenticacionActiva) {
        estadoAutenticacionTexto.textContent =
            `Autenticación activa mediante ${obtenerNombreMetodo(perfil.metodoAutenticacion)}.`;
    } else {
        estadoAutenticacionTexto.textContent =
            "La autenticación adicional no está configurada.";
    }
}

function obtenerNombreMetodo(metodo) {
    if (metodo === "correo") {
        return "correo electrónico";
    }

    return "correo electrónico";
}

/* =========================================================
   RECUPERACIÓN DE CONTRASEÑA SIMULADA
========================================================= */

function configurarRecuperacionPassword() {
    if (btnOlvidePassword) {
        btnOlvidePassword.addEventListener(
            "click",
            abrirModalRecuperacion
        );
    }

    if (btnCerrarRecuperar) {
        btnCerrarRecuperar.addEventListener(
            "click",
            cerrarModalRecuperacion
        );
    }

    if (btnCancelarRecuperar) {
        btnCancelarRecuperar.addEventListener(
            "click",
            cerrarModalRecuperacion
        );
    }

    if (btnCancelarNuevaPassword) {
        btnCancelarNuevaPassword.addEventListener(
            "click",
            cerrarModalRecuperacion
        );
    }

    if (btnVolverCorreo) {
        btnVolverCorreo.addEventListener("click", function () {
            mostrarPasoRecuperacion("correo");
        });
    }

    if (formEnviarCodigoPassword) {
        formEnviarCodigoPassword.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                enviarCodigoRecuperacion();
            }
        );
    }

    if (formValidarCodigoPassword) {
        formValidarCodigoPassword.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                validarCodigoRecuperacion();
            }
        );
    }

    if (formNuevaPassword) {
        formNuevaPassword.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                guardarNuevaPassword();
            }
        );
    }

    configurarInputsCodigo(codigoRecuperacionInputs);
}

function abrirModalRecuperacion() {
    limpiarFormularioRecuperacion();

    if (correoRecuperacion) {
        correoRecuperacion.value =
            correoPerfil?.value ||
            obtenerCorreoSesionPerfil();
    }

    mostrarPasoRecuperacion("correo");
    abrirModal(modalRecuperarPassword);
}

function cerrarModalRecuperacion() {
    limpiarFormularioRecuperacion();
    cerrarModal(modalRecuperarPassword);
}

function mostrarPasoRecuperacion(paso) {
    const pasos = document.querySelectorAll(".recover-step");

    pasos.forEach(function (step) {
        step.classList.remove("active");

        if (step.getAttribute("data-step") === paso) {
            step.classList.add("active");
        }
    });
}

function enviarCodigoRecuperacion() {
    const correo =
        correoRecuperacion
            ? correoRecuperacion.value.trim()
            : "";

    if (!correo) {
        alert("Ingresa un correo electrónico.");
        return;
    }

    codigoRecuperacionGenerado = generarCodigo();

    if (codigoRecuperacionTexto) {
        codigoRecuperacionTexto.textContent =
            `Código de prueba: ${codigoRecuperacionGenerado}. Ingresa el código enviado a ${correo}.`;
    }

    limpiarInputs(codigoRecuperacionInputs);
    mostrarPasoRecuperacion("codigo");

    if (codigoRecuperacionInputs.length > 0) {
        codigoRecuperacionInputs[0].focus();
    }
}

function validarCodigoRecuperacion() {
    const codigoIngresado =
        obtenerCodigoInputs(codigoRecuperacionInputs);

    if (codigoIngresado !== codigoRecuperacionGenerado) {
        alert("El código ingresado no es correcto.");
        return;
    }

    mostrarPasoRecuperacion("nueva");
}

function guardarNuevaPassword() {
    const nueva =
        nuevaPasswordRecuperacion
            ? nuevaPasswordRecuperacion.value
            : "";

    const confirmar =
        confirmarPasswordRecuperacion
            ? confirmarPasswordRecuperacion.value
            : "";

    if (nueva.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    if (nueva !== confirmar) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    const perfil = obtenerPerfil();

    perfil.passwordSimulada = true;
    perfil.fechaCambioPassword =
        new Date().toISOString();

    if (correoRecuperacion && correoRecuperacion.value.trim()) {
        perfil.correo = correoRecuperacion.value.trim();

        if (correoPerfil) {
            correoPerfil.value = perfil.correo;
        }
    }

    guardarPerfilStorage(perfil);
    actualizarSesionDesdePerfil(perfil);

    cerrarModalRecuperacion();

    alert(
        "Contraseña actualizada en modo demostración. Para producción se requiere endpoint backend de cambio de contraseña."
    );
}

function limpiarFormularioRecuperacion() {
    if (formEnviarCodigoPassword) {
        formEnviarCodigoPassword.reset();
    }

    if (formValidarCodigoPassword) {
        formValidarCodigoPassword.reset();
    }

    if (formNuevaPassword) {
        formNuevaPassword.reset();
    }

    limpiarInputs(codigoRecuperacionInputs);

    codigoRecuperacionGenerado = "";
}

/* =========================================================
   CIERRE DE SESIÓN
========================================================= */

function configurarCierreSesionPerfil() {
    const enlacesCerrar =
        document.querySelectorAll(
            '.sidebar-footer a[href="login.html"]'
        );

    enlacesCerrar.forEach(function (enlace) {
        enlace.addEventListener("click", function () {
            localStorage.removeItem("usuarioActivo");
        });
    });
}

/* =========================================================
   FUNCIONES GENERALES
========================================================= */

function abrirModal(modal) {
    if (modal) {
        modal.classList.add("show");
    }
}

function cerrarModal(modal) {
    if (modal) {
        modal.classList.remove("show");
    }
}

function generarCodigo() {
    return String(
        Math.floor(100000 + Math.random() * 900000)
    );
}

function configurarInputsCodigo(inputs) {
    inputs.forEach(function (input, index) {
        input.addEventListener("input", function () {
            input.value =
                input.value.replace(/\D/g, "");

            if (input.value && inputs[index + 1]) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", function (event) {
            if (
                event.key === "Backspace" &&
                !input.value &&
                inputs[index - 1]
            ) {
                inputs[index - 1].focus();
            }
        });

        input.addEventListener("paste", function (event) {
            event.preventDefault();

            const texto = (
                event.clipboardData ||
                window.clipboardData
            ).getData("text");

            const digitos = texto
                .replace(/\D/g, "")
                .slice(0, inputs.length)
                .split("");

            digitos.forEach(function (digito, posicion) {
                if (inputs[posicion]) {
                    inputs[posicion].value = digito;
                }
            });

            const siguiente = Math.min(
                digitos.length,
                inputs.length - 1
            );

            if (inputs[siguiente]) {
                inputs[siguiente].focus();
            }
        });
    });
}

function obtenerCodigoInputs(inputs) {
    let codigo = "";

    inputs.forEach(function (input) {
        codigo += input.value;
    });

    return codigo;
}

function limpiarInputs(inputs) {
    inputs.forEach(function (input) {
        input.value = "";
    });
}


/* =========================================================
   OVERRIDE FINAL: VERIFICACIÓN Y RECUPERACIÓN CON BACKEND
========================================================= */

const API_AUTH_PERFIL = window.apiUrl("/api/auth");

function obtenerHeadersPerfilJSON() {
    return {
        "Content-Type": "application/json",
        "X-Usuario-Id": String(obtenerIdUsuarioPerfil())
    };
}

async function iniciarVerificacionAuth(metodo) {
    metodoAuthSeleccionado = metodo;

    metodo = "correo";
    metodoAuthSeleccionado = "correo";

    cerrarModal(modalAuth);

    try {
        const respuesta = await fetch(`${API_AUTH_PERFIL}/verificacion/solicitar`, {
            method: "POST",
            headers: obtenerHeadersPerfilJSON(),
            body: JSON.stringify({ metodo: metodo })
        });

        const datos = await obtenerRespuestaJSONPerfil(respuesta);

        if (!respuesta.ok) {
            alert(datos.mensaje || "No fue posible generar el código de verificación.");
            return;
        }

        codigoAuthGenerado = "";

        if (codigoAuthTexto) {
            codigoAuthTexto.textContent =
                "Se envió un código de 6 dígitos a tu correo electrónico. Revisa tu bandeja de entrada y correo no deseado.";
        }

        limpiarInputs(codigoAuthInputs);
        abrirModal(modalCodigo);

        if (codigoAuthInputs.length > 0) {
            codigoAuthInputs[0].focus();
        }

    } catch (error) {
        console.error("Error al solicitar verificación:", error);
        alert("No fue posible conectar con el backend de verificación.");
    }
}

async function validarCodigoAuth() {
    const codigoIngresado =
        obtenerCodigoInputs(codigoAuthInputs);

    if (!codigoIngresado || codigoIngresado.length !== 6) {
        alert("Ingresa el código de 6 dígitos.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_AUTH_PERFIL}/verificacion/validar`, {
            method: "POST",
            headers: obtenerHeadersPerfilJSON(),
            body: JSON.stringify({
                metodo: metodoAuthSeleccionado,
                codigo: codigoIngresado
            })
        });

        const datos = await obtenerRespuestaJSONPerfil(respuesta);

        if (!respuesta.ok) {
            alert(datos.mensaje || "El código ingresado no es correcto.");
            return;
        }

        if (datos.usuario) {
            usuarioActivoPerfil = datos.usuario;
            guardarUsuarioActivoPerfil(datos.usuario);
        }

        const perfil = obtenerPerfil();

        perfil.autenticacionActiva = true;
        perfil.metodoAutenticacion = metodoAuthSeleccionado;
        perfil.fechaAutenticacion = new Date().toISOString();

        guardarPerfilStorage(perfil);

        cerrarModal(modalCodigo);
        actualizarEstadoAutenticacion();

        alert(datos.mensaje || "Autenticación configurada correctamente.");

    } catch (error) {
        console.error("Error al validar verificación:", error);
        alert("No fue posible conectar con el backend de verificación.");
    }
}

function actualizarEstadoAutenticacion() {
    const perfil = obtenerPerfil();

    if (!estadoAutenticacionTexto) {
        return;
    }

    const activaBackend =
        usuarioActivoPerfil &&
        (
            usuarioActivoPerfil.autenticacionActiva === true ||
            usuarioActivoPerfil.autenticacionActiva === "true"
        );

    const metodoBackend = usuarioActivoPerfil?.metodoAutenticacion;

    if (activaBackend && metodoBackend === "correo") {
        estadoAutenticacionTexto.textContent =
            "Autenticación activa mediante correo electrónico.";
    } else {
        estadoAutenticacionTexto.textContent =
            "La autenticación por correo no está configurada.";
    }
}

async function enviarCodigoRecuperacion() {
    const correo =
        correoRecuperacion
            ? correoRecuperacion.value.trim()
            : "";

    if (!correo) {
        alert("Ingresa un correo electrónico.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_AUTH_PERFIL}/recuperacion/solicitar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ correo: correo })
        });

        const datos = await obtenerRespuestaJSONPerfil(respuesta);

        if (!respuesta.ok) {
            alert(datos.mensaje || "No fue posible generar el código.");
            return;
        }

        codigoRecuperacionGenerado = "";

        if (codigoRecuperacionTexto) {
            codigoRecuperacionTexto.textContent =
                `Se envió un código de recuperación a ${correo}. Revisa también la carpeta de correo no deseado.`;
        }

        limpiarInputs(codigoRecuperacionInputs);
        mostrarPasoRecuperacion("codigo");

        if (codigoRecuperacionInputs.length > 0) {
            codigoRecuperacionInputs[0].focus();
        }

    } catch (error) {
        console.error("Error al solicitar código de recuperación:", error);
        alert("No fue posible conectar con el backend de recuperación.");
    }
}

async function validarCodigoRecuperacion() {
    const codigoIngresado =
        obtenerCodigoInputs(codigoRecuperacionInputs);

    const correo =
        correoRecuperacion
            ? correoRecuperacion.value.trim()
            : "";

    if (!codigoIngresado || codigoIngresado.length !== 6) {
        alert("Ingresa el código de 6 dígitos.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_AUTH_PERFIL}/recuperacion/validar-codigo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                correo: correo,
                codigo: codigoIngresado
            })
        });

        const datos = await obtenerRespuestaJSONPerfil(respuesta);

        if (!respuesta.ok) {
            alert(datos.mensaje || "El código ingresado no es correcto.");
            return;
        }

        codigoRecuperacionGenerado = codigoIngresado;
        mostrarPasoRecuperacion("nueva");

    } catch (error) {
        console.error("Error al validar código de recuperación:", error);
        alert("No fue posible conectar con el backend de recuperación.");
    }
}

async function guardarNuevaPassword() {
    const nueva =
        nuevaPasswordRecuperacion
            ? nuevaPasswordRecuperacion.value
            : "";

    const confirmar =
        confirmarPasswordRecuperacion
            ? confirmarPasswordRecuperacion.value
            : "";

    const correo =
        correoRecuperacion
            ? correoRecuperacion.value.trim()
            : "";

    if (nueva.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    if (nueva !== confirmar) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_AUTH_PERFIL}/recuperacion/cambiar-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                correo: correo,
                codigo: codigoRecuperacionGenerado,
                nuevaContrasena: nueva
            })
        });

        const datos = await obtenerRespuestaJSONPerfil(respuesta);

        if (!respuesta.ok) {
            alert(datos.mensaje || "No fue posible actualizar la contraseña.");
            return;
        }

        cerrarModalRecuperacion();

        alert(datos.mensaje || "Contraseña actualizada correctamente.");

    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        alert("No fue posible conectar con el backend de recuperación.");
    }
}

async function guardarIdiomaPerfilBackend(idioma) {
    if (!idioma || !usuarioActivoPerfil) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_AUTH_PERFIL}/perfil/idioma`, {
            method: "PUT",
            headers: obtenerHeadersPerfilJSON(),
            body: JSON.stringify({ idioma: idioma })
        });

        const datos = await obtenerRespuestaJSONPerfil(respuesta);

        if (respuesta.ok && datos.usuario) {
            usuarioActivoPerfil = datos.usuario;
            guardarUsuarioActivoPerfil(datos.usuario);
        }
    } catch (error) {
        console.warn("No fue posible guardar idioma en backend:", error);
    }
}

async function obtenerRespuestaJSONPerfil(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}


document.addEventListener("DOMContentLoaded", function () {
    if (idiomaPerfil) {
        idiomaPerfil.addEventListener("change", function () {
            guardarIdiomaPerfilBackend(idiomaPerfil.value);
        });
    }

    if (formPreferencias) {
        formPreferencias.addEventListener("submit", function () {
            if (idiomaPerfil) {
                guardarIdiomaPerfilBackend(idiomaPerfil.value);
            }
        });
    }
});
