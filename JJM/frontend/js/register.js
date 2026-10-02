const API_URL = window.apiUrl("/api/auth");

const registerForm = document.getElementById("registerForm");
const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");
const btnRegistrar = document.getElementById("btnRegistrar");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const nombre = document.getElementById("nombre").value.trim();
        const apellido = document.getElementById("apellido").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const telefono = obtenerValorCampo("telefono");
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        ocultarMensajes();

        if (
            nombre === "" ||
            apellido === "" ||
            email === "" ||
            password === "" ||
            confirmPassword === ""
        ) {
            mostrarError("Todos los campos obligatorios deben estar completos.");
            return;
        }

        if (!validarCorreo(email)) {
            mostrarError("Ingresa un correo electrónico válido.");
            return;
        }

        if (telefono && !validarTelefonoBasico(telefono)) {
            mostrarError("Ingresa un teléfono válido o deja el campo vacío.");
            return;
        }

        if (password.length < 8) {
            mostrarError("La contraseña debe tener mínimo 8 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            mostrarError("Las contraseñas no coinciden.");
            return;
        }

        const datosRegistro = {
            nombre: nombre,
            apellidoPaterno: apellido,
            apellidoMaterno: "",
            correo: email,
            telefono: telefono,
            contrasena: password,
            rol: "Colaborador"
        };

        bloquearBotonRegistro(true);

        try {
            const respuesta = await fetch(`${API_URL}/registro`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(datosRegistro)
            });

            const datos = await obtenerRespuestaJSON(respuesta);

            if (!respuesta.ok) {
                mostrarError(
                    datos.mensaje ||
                    "No se pudo crear la cuenta. Intenta nuevamente."
                );
                return;
            }

            guardarMarcaRegistroAcademicoPendiente(email);

            mostrarExito(
                "Cuenta creada correctamente. Redirigiendo al inicio de sesión..."
            );

            registerForm.reset();

            setTimeout(function () {
                window.location.href = "login.html?success=1";
            }, 1400);

        } catch (error) {
            console.error("Error al registrar usuario:", error);

            mostrarError(
                "No fue posible conectar con el servidor. " +
                "Verifica que el backend de Java esté ejecutándose."
            );
        } finally {
            bloquearBotonRegistro(false);
        }
    });
}

function obtenerValorCampo(idCampo) {
    const campo = document.getElementById(idCampo);

    return campo
        ? campo.value.trim()
        : "";
}

function guardarMarcaRegistroAcademicoPendiente(correo) {
    if (!correo) {
        return;
    }

    /*
     * Esta marca permite que el flujo posterior de inicio de sesión
     * solicite datos académicos al colaborador cuando todavía no
     * complete su expediente.
     */
    try {
        const pendientes = JSON.parse(
            localStorage.getItem("datosAcademicosPendientesPMO")
        ) || {};

        pendientes[correo] = true;

        localStorage.setItem(
            "datosAcademicosPendientesPMO",
            JSON.stringify(pendientes)
        );
    } catch (error) {
        console.warn(
            "No fue posible registrar la marca de datos académicos pendientes:",
            error
        );
    }
}

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

function bloquearBotonRegistro(estaBloqueado) {
    if (!btnRegistrar) {
        return;
    }

    btnRegistrar.disabled = estaBloqueado;

    btnRegistrar.textContent = estaBloqueado
        ? "Creando cuenta..."
        : "Crear cuenta";
}

function validarCorreo(email) {
    const expresion = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return expresion.test(email);
}

function validarTelefonoBasico(telefono) {
    const limpio = String(telefono)
        .replace(/\s+/g, "")
        .replace(/-/g, "")
        .replace(/\(/g, "")
        .replace(/\)/g, "");

    return /^[0-9+]{8,18}$/.test(limpio);
}

function mostrarError(mensaje) {
    if (!errorMessage || !successMessage) {
        alert(mensaje);
        return;
    }

    errorMessage.textContent = mensaje;
    errorMessage.style.display = "block";

    successMessage.style.display = "none";
    successMessage.textContent = "";
}

function mostrarExito(mensaje) {
    if (!successMessage || !errorMessage) {
        alert(mensaje);
        return;
    }

    successMessage.textContent = mensaje;
    successMessage.style.display = "block";

    errorMessage.style.display = "none";
    errorMessage.textContent = "";
}

function ocultarMensajes() {
    if (errorMessage) {
        errorMessage.style.display = "none";
        errorMessage.textContent = "";
    }

    if (successMessage) {
        successMessage.style.display = "none";
        successMessage.textContent = "";
    }
}
