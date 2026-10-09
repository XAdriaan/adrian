const API_URL = window.apiUrl("/api/auth");

const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");
const btnLogin = document.getElementById("btnLogin");
const passwordInputLogin = document.getElementById("password");
const togglePasswordLogin = document.getElementById("togglePassword");

togglePasswordLogin?.addEventListener("click", function () {
    const visible = passwordInputLogin.type === "password";
    passwordInputLogin.type = visible ? "text" : "password";
    const etiqueta = visible ? "Ocultar contraseña" : "Mostrar contraseña";
    togglePasswordLogin.setAttribute("aria-label", etiqueta);
    togglePasswordLogin.setAttribute("aria-pressed", String(visible));
    togglePasswordLogin.title = etiqueta;
    togglePasswordLogin.classList.toggle("is-visible", visible);
});

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    ocultarMensajes();

    if (email === "" || password === "") {
        mostrarError("Debes ingresar correo y contraseña.");
        return;
    }

    if (!validarCorreo(email)) {
        mostrarError("Ingresa un correo electrónico válido.");
        return;
    }

    const datosLogin = {
        correo: email,
        contrasena: password
    };

    bloquearBotonLogin(true);
    let abriendoEspacio = false;
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 20000);

    try {
        const respuesta = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosLogin),
            signal: controlador.signal
        });

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            mostrarError(
                datos.mensaje ||
                (respuesta.status === 401 ? "Correo o contraseña incorrectos." :
                    `El servidor de acceso no respondió correctamente (HTTP ${respuesta.status}). Espera unos segundos y vuelve a intentar.`)
            );
            return;
        }

        if (!datos.usuario) {
            mostrarError("El servidor no devolvió la información del usuario.");
            return;
        }

        if (!datos.token) {
            mostrarError("El servidor no devolvió un token de sesión válido.");
            return;
        }

        localStorage.setItem("usuarioActivo", JSON.stringify(datos.usuario));
        localStorage.setItem("sesionTokenPMO", datos.token);
        try { sessionStorage.setItem("ardia-bienvenida", String(datos.usuario.id)); } catch (_) {}

        const rolLogin = String(datos.usuario.rol?.nombre || datos.usuario.rol || "").trim().toLowerCase();
        const esDirectivoLogin = ["directivo escolar", "directivo"].includes(rolLogin);
        const expedienteCompleto = esDirectivoLogin || await datosAcademicosCompletos(datos.usuario);
        if (localStorage.getItem("sesionTokenPMO") !== datos.token) {
            mostrarError("El servidor no confirmó tu sesión. Inicia sesión nuevamente.");
            return;
        }
        mostrarExito("Inicio de sesión correcto. Abriendo tu espacio...");
        abriendoEspacio = true;

        // Siempre deja entrar a la plataforma. Si faltan datos académicos,
        // el Dashboard/menú mostrará el acceso para completarlos sin romper
        // el inicio de sesión ni generar ciclos de redirección.
        setTimeout(function () {
            window.location.replace(esDirectivoLogin ? "supervision-escolar.html"
                : (expedienteCompleto ? "dashboard.html" : "dashboard.html?completarDatos=1"));
        }, 350);

    } catch (error) {
        console.error("Error al iniciar sesión:", error);

        mostrarError(
            error.name === "AbortError" ? "El servidor tardó demasiado en responder. Inténtalo nuevamente." :
                "No fue posible iniciar sesión. Revisa tu conexión y vuelve a intentarlo."
        );
    } finally {
        clearTimeout(temporizador);
        if (!abriendoEspacio) bloquearBotonLogin(false);
    }
});

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

function bloquearBotonLogin(estaBloqueado) {
    if (!btnLogin) return;

    btnLogin.disabled = estaBloqueado;
    btnLogin.textContent = estaBloqueado
        ? "Ingresando..."
        : "Iniciar sesión";
}

function validarCorreo(email) {
    const expresion = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return expresion.test(email);
}

function mostrarError(mensaje) {
    errorMessage.textContent = mensaje;
    errorMessage.style.display = "block";

    successMessage.style.display = "none";
    successMessage.textContent = "";
}

function mostrarExito(mensaje) {
    successMessage.textContent = mensaje;
    successMessage.style.display = "block";

    errorMessage.style.display = "none";
    errorMessage.textContent = "";
}

function ocultarMensajes() {
    errorMessage.style.display = "none";
    successMessage.style.display = "none";

    errorMessage.textContent = "";
    successMessage.textContent = "";
}

const parametrosLogin = new URLSearchParams(window.location.search);

if (parametrosLogin.get("success") === "1") {
    mostrarExito("Cuenta creada correctamente. Ahora inicia sesión.");
}
if (parametrosLogin.get("sesion") === "expirada") {
    mostrarError("Tu sesión venció. Inicia sesión nuevamente.");
}

/* =========================================================
   REDIRECCIÓN A DATOS ACADÉMICOS
========================================================= */
function obtenerIdUsuarioLogin(usuario) {
    if (!usuario) return null;
    return usuario.id || usuario.idUsuario || usuario.id_usuario || null;
}

async function datosAcademicosCompletos(usuario) {
    const idUsuario = obtenerIdUsuarioLogin(usuario);
    if (!idUsuario) return false;

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 4000);
    try {
        const respuesta = await fetch(window.apiUrl("/api/datos-registro/mi-sesion"), {
            signal: controlador.signal
        });
        if (!respuesta.ok) return false;
        const datos = await respuesta.json();
        if (datos?.datos) {
            localStorage.setItem(`datosAcademicosPMO_${idUsuario}`, JSON.stringify(datos.datos));
        }
        return datos?.completo === true;
    } catch (error) {
        console.warn("No fue posible consultar el expediente académico.", error);
        return false;
    } finally {
        clearTimeout(temporizador);
    }
}


/* =========================================================
   RECUPERACIÓN DE CONTRASEÑA POR CORREO REAL
========================================================= */
const modalRecuperarPasswordLogin = document.getElementById("modalRecuperarPasswordLogin");
const linkRecuperarPassword = document.getElementById("linkRecuperarPassword");
const btnCerrarRecuperarLogin = document.getElementById("btnCerrarRecuperarLogin");
const formSolicitarRecuperacionLogin = document.getElementById("formSolicitarRecuperacionLogin");
const formValidarCodigoLogin = document.getElementById("formValidarCodigoLogin");
const formCambiarPasswordLogin = document.getElementById("formCambiarPasswordLogin");
const correoRecuperacionLogin = document.getElementById("correoRecuperacionLogin");
const codigoRecuperacionLogin = document.getElementById("codigoRecuperacionLogin");
const nuevaPasswordLogin = document.getElementById("nuevaPasswordLogin");
const confirmarPasswordLogin = document.getElementById("confirmarPasswordLogin");
const textoCodigoRecuperacionLogin = document.getElementById("textoCodigoRecuperacionLogin");

let correoRecuperacionActualLogin = "";
let codigoRecuperacionValidadoLogin = "";

function mostrarPasoRecuperacionLogin(paso) {
    document.querySelectorAll(".recover-login-step").forEach(function (elemento) {
        elemento.classList.toggle("active", elemento.dataset.step === paso);
    });
}

function abrirRecuperacionLogin() {
    correoRecuperacionActualLogin = "";
    codigoRecuperacionValidadoLogin = "";
    mostrarPasoRecuperacionLogin("correo");

    const correoLogin = document.getElementById("email")?.value?.trim() || "";
    if (correoRecuperacionLogin && correoLogin) {
        correoRecuperacionLogin.value = correoLogin;
    }

    modalRecuperarPasswordLogin?.classList.add("show");
}

function cerrarRecuperacionLogin() {
    modalRecuperarPasswordLogin?.classList.remove("show");
}

linkRecuperarPassword?.addEventListener("click", function (event) {
    event.preventDefault();
    abrirRecuperacionLogin();
});

btnCerrarRecuperarLogin?.addEventListener("click", cerrarRecuperacionLogin);

modalRecuperarPasswordLogin?.addEventListener("click", function (event) {
    if (event.target === modalRecuperarPasswordLogin) {
        cerrarRecuperacionLogin();
    }
});

formSolicitarRecuperacionLogin?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const correo = correoRecuperacionLogin?.value.trim().toLowerCase() || "";
    if (!validarCorreo(correo)) {
        alert("Ingresa un correo electrónico válido.");
        return;
    }

    const boton = document.getElementById("btnEnviarCodigoLogin");
    if (boton) {
        boton.disabled = true;
        boton.textContent = "Enviando...";
    }

    try {
        const respuesta = await fetch(`${API_URL}/recuperacion/solicitar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correo: correo })
        });
        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            alert(datos.mensaje || "No fue posible enviar el código de recuperación.");
            return;
        }

        correoRecuperacionActualLogin = correo;
        if (textoCodigoRecuperacionLogin) {
            textoCodigoRecuperacionLogin.textContent =
                `Enviamos un código de 6 dígitos a ${correo}. Revisa también correo no deseado.`;
        }
        if (codigoRecuperacionLogin) codigoRecuperacionLogin.value = "";
        mostrarPasoRecuperacionLogin("codigo");
        codigoRecuperacionLogin?.focus();
    } catch (error) {
        console.error("Error al enviar recuperación:", error);
        alert("No fue posible conectar con el servidor de recuperación.");
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = "Enviar código";
        }
    }
});

formValidarCodigoLogin?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const codigo = codigoRecuperacionLogin?.value.trim() || "";
    if (!/^\d{6}$/.test(codigo)) {
        alert("Ingresa el código de 6 dígitos.");
        return;
    }

    const boton = document.getElementById("btnValidarCodigoLogin");
    if (boton) {
        boton.disabled = true;
        boton.textContent = "Validando...";
    }

    try {
        const respuesta = await fetch(`${API_URL}/recuperacion/validar-codigo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                correo: correoRecuperacionActualLogin,
                codigo: codigo
            })
        });
        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            alert(datos.mensaje || "El código no es correcto.");
            return;
        }

        codigoRecuperacionValidadoLogin = codigo;
        if (nuevaPasswordLogin) nuevaPasswordLogin.value = "";
        if (confirmarPasswordLogin) confirmarPasswordLogin.value = "";
        mostrarPasoRecuperacionLogin("password");
        nuevaPasswordLogin?.focus();
    } catch (error) {
        console.error("Error al validar recuperación:", error);
        alert("No fue posible validar el código.");
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = "Validar código";
        }
    }
});

formCambiarPasswordLogin?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nueva = nuevaPasswordLogin?.value || "";
    const confirmar = confirmarPasswordLogin?.value || "";

    if (nueva.length < 6) {
        alert("La nueva contraseña debe tener al menos 6 caracteres.");
        return;
    }
    if (nueva !== confirmar) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    const boton = document.getElementById("btnCambiarPasswordLogin");
    if (boton) {
        boton.disabled = true;
        boton.textContent = "Guardando...";
    }

    try {
        const respuesta = await fetch(`${API_URL}/recuperacion/cambiar-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                correo: correoRecuperacionActualLogin,
                codigo: codigoRecuperacionValidadoLogin,
                nuevaContrasena: nueva
            })
        });
        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            alert(datos.mensaje || "No fue posible cambiar la contraseña.");
            return;
        }

        const inputEmail = document.getElementById("email");
        if (inputEmail) inputEmail.value = correoRecuperacionActualLogin;
        cerrarRecuperacionLogin();
        mostrarExito(datos.mensaje || "Contraseña actualizada correctamente.");
    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        alert("No fue posible cambiar la contraseña.");
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = "Guardar contraseña";
        }
    }
});
