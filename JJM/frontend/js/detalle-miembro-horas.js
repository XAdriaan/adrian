const API_REGISTROS_HORAS =
    window.apiUrl("/api/registros-horas");

const API_MIEMBROS =
    window.apiUrl("/api/miembros");

const API_MIEMBRO_SESION =
    window.apiUrl("/api/miembros/mi-sesion");

const CLAVE_FIRMA_ENCARGADO =
    "firmaEncargadoPMO";

const CLAVE_FIRMA_MIGUEL =
    "firmaMiguelPMO";

const CLAVE_FIRMA_JULIO =
    "firmaJulioPMO";

let usuarioActivo = obtenerUsuarioActivo();
let idMiembroConsultado = null;
let registrosHistorial = [];
let datosMiembro = null;
let firmaTemporalSeleccionada = null;
let encargadoFirmaSeleccionado = "miguel";

/* =========================================================
   ELEMENTOS DE LA PÁGINA
========================================================= */

const tituloPagina =
    document.getElementById("tituloPagina");

const subtituloPagina =
    document.getElementById("subtituloPagina");

const nombreMiembro =
    document.getElementById("nombreMiembro");

const correoMiembro =
    document.getElementById("correoMiembro");

const rolMiembro =
    document.getElementById("rolMiembro");

const estadoMiembro =
    document.getElementById("estadoMiembro");

const avatarMiembro =
    document.getElementById("avatarMiembro");

const mesFiltro =
    document.getElementById("mesFiltro");

const anioFiltro =
    document.getElementById("anioFiltro");

const btnFiltrar =
    document.getElementById("btnFiltrar");

const btnActualizar =
    document.getElementById("btnActualizar");

const btnRegresar =
    document.getElementById("btnRegresar");

const btnDescargarFormato =
    document.getElementById("btnDescargarFormato");

const btnFirmaEncargado =
    document.getElementById("btnFirmaEncargado");

const tablaHistorialHoras =
    document.getElementById("tablaHistorialHoras");

const horasRegistradas =
    document.getElementById("horasRegistradas");

const horasAprobadas =
    document.getElementById("horasAprobadas");

const horasPendientes =
    document.getElementById("horasPendientes");

const horasRechazadas =
    document.getElementById("horasRechazadas");

const textoPeriodo =
    document.getElementById("textoPeriodo");

const contadorRegistros =
    document.getElementById("contadorRegistros");

/* =========================================================
   ELEMENTOS DEL MODAL DE FIRMA
========================================================= */

const modalFirmaEncargado =
    document.getElementById("modalFirmaEncargado");

const btnCerrarModalFirma =
    document.getElementById("btnCerrarModalFirma");

const btnCancelarFirma =
    document.getElementById("btnCancelarFirma");

const btnGuardarFirma =
    document.getElementById("btnGuardarFirma");

const btnEliminarFirma =
    document.getElementById("btnEliminarFirma");

const inputFirmaEncargado =
    document.getElementById("inputFirmaEncargado");

const vistaFirma =
    document.getElementById("vistaFirma");

const textoSinFirma =
    document.getElementById("textoSinFirma");

const nombreArchivoFirma =
    document.getElementById("nombreArchivoFirma");

/* =========================================================
   INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
    usuarioActivo = obtenerUsuarioActivo();

    configurarFiltrosFecha();
    configurarEventos();
    configurarOpcionesAdministrador();

    idMiembroConsultado =
        obtenerIdMiembroDesdeURL();

    await resolverMiembroConsultado();

    if (!idMiembroConsultado) {
        mostrarErrorGeneral(
            "No fue posible identificar el integrante para consultar su historial."
        );
        return;
    }

    await cargarHistorialHoras();
});

/* =========================================================
   SESIÓN Y ROL
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

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function esAdministrador() {
    const rol = normalizarTexto(obtenerNombreRolUsuario());

    return (
        rol === "administrador" ||
        rol === "admin pmo" ||
        rol === "admin_pmo" ||
        rol === "administrador pmo"
    );
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

/* =========================================================
   INTEGRANTE DE LA URL O DEL USUARIO ACTIVO
========================================================= */

function obtenerIdMiembroDesdeURL() {
    const parametros = new URLSearchParams(
        window.location.search
    );

    const valor =
        parametros.get("idMiembro") ||
        parametros.get("id");

    if (!valor) {
        return null;
    }

    const id = Number(valor);

    return Number.isNaN(id)
        ? null
        : id;
}

async function resolverMiembroConsultado() {
    /*
     * Administrador:
     * usa el integrante indicado en la URL.
     *
     * Colaborador:
     * puede usar su propio id en URL o, si no existe,
     * intenta encontrar su perfil relacionado con usuarioActivo.
     */

    if (idMiembroConsultado) {
        await obtenerMiembroConsultado();
        return;
    }

    if (esAdministrador()) {
        return;
    }

    try {
        const respuesta = await fetch(
            API_MIEMBRO_SESION,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible identificar tu perfil de integrante."
            );
        }

        const miembroPropio = datos.miembro || null;

        if (!miembroPropio) {
            throw new Error(
                "No se encontró un integrante asociado a tu sesión."
            );
        }

        idMiembroConsultado =
            miembroPropio.id ||
            miembroPropio.idMiembro ||
            miembroPropio.id_miembro ||
            null;

        datosMiembro = miembroPropio;

        actualizarCabeceraMiembro();

    } catch (error) {
        console.error(
            "Error al resolver integrante actual:",
            error
        );

        mostrarErrorGeneral(
            error.message ||
            "No fue posible identificar el integrante de la sesión."
        );
    }
}

/* =========================================================
   CONFIGURACIÓN DE INTERFAZ
========================================================= */

function configurarOpcionesAdministrador() {
    /*
     * El botón de firma jamás se muestra a colaboradores.
     */
    if (btnFirmaEncargado) {
        btnFirmaEncargado.style.display =
            esAdministrador()
                ? "inline-flex"
                : "none";
    }
}

function configurarFiltrosFecha() {
    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth() + 1;

    if (mesFiltro) {
        mesFiltro.value = String(mesActual);
    }

    if (!anioFiltro) {
        return;
    }

    anioFiltro.innerHTML = "";

    for (
        let anio = anioActual + 1;
        anio >= anioActual - 5;
        anio--
    ) {
        const opcion = document.createElement("option");

        opcion.value = String(anio);
        opcion.textContent = String(anio);

        if (anio === anioActual) {
            opcion.selected = true;
        }

        anioFiltro.appendChild(opcion);
    }
}

function configurarEventos() {
    if (btnFiltrar) {
        btnFiltrar.addEventListener(
            "click",
            cargarHistorialHoras
        );
    }

    if (btnActualizar) {
        btnActualizar.addEventListener(
            "click",
            async function () {
                await obtenerMiembroConsultado();
                await cargarHistorialHoras();
            }
        );
    }

    if (btnRegresar) {
        btnRegresar.addEventListener(
            "click",
            function () {
                window.history.back();
            }
        );
    }

    if (btnDescargarFormato) {
        btnDescargarFormato.addEventListener(
            "click",
            mostrarAvisoDescarga
        );
    }

    if (btnFirmaEncargado) {
        btnFirmaEncargado.addEventListener(
            "click",
            abrirModalFirma
        );
    }

    if (btnCerrarModalFirma) {
        btnCerrarModalFirma.addEventListener(
            "click",
            cerrarModalFirma
        );
    }

    if (btnCancelarFirma) {
        btnCancelarFirma.addEventListener(
            "click",
            cerrarModalFirma
        );
    }

    if (modalFirmaEncargado) {
        modalFirmaEncargado.addEventListener(
            "click",
            function (event) {
                if (event.target === modalFirmaEncargado) {
                    cerrarModalFirma();
                }
            }
        );
    }

    if (inputFirmaEncargado) {
        inputFirmaEncargado.addEventListener(
            "change",
            leerFirmaSeleccionada
        );
    }

    if (btnGuardarFirma) {
        btnGuardarFirma.addEventListener(
            "click",
            guardarFirmaEncargado
        );
    }

    if (btnEliminarFirma) {
        btnEliminarFirma.addEventListener(
            "click",
            eliminarFirmaEncargado
        );
    }
}

/* =========================================================
   CONSULTAR INFORMACIÓN DEL INTEGRANTE
========================================================= */

async function obtenerMiembroConsultado() {
    if (!idMiembroConsultado) {
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_REGISTROS_HORAS}/miembro/${idMiembroConsultado}`,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible consultar al integrante."
            );
        }

        datosMiembro = datos.miembro || null;

        actualizarCabeceraMiembro();

    } catch (error) {
        console.error(
            "Error al obtener integrante:",
            error
        );

        datosMiembro = null;

        if (nombreMiembro) {
            nombreMiembro.textContent =
                "Integrante no disponible";
        }

        if (correoMiembro) {
            correoMiembro.textContent =
                error.message ||
                "No fue posible consultar la información del integrante.";
        }
    }
}

/* =========================================================
   CARGAR HISTORIAL DE MYSQL
========================================================= */

async function cargarHistorialHoras() {
    if (!idMiembroConsultado) {
        return;
    }

    mostrarCargaTabla();

    const mes = mesFiltro
        ? mesFiltro.value
        : "";

    const anio = anioFiltro
        ? anioFiltro.value
        : "";

    try {
        const respuesta = await fetch(
            `${API_REGISTROS_HORAS}/miembro/${idMiembroConsultado}?mes=${encodeURIComponent(mes)}&anio=${encodeURIComponent(anio)}`,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar el historial de horas."
            );
        }

        registrosHistorial = Array.isArray(datos.registros)
            ? datos.registros
            : [];

        if (datos.miembro) {
            datosMiembro = datos.miembro;
            actualizarCabeceraMiembro();
        }

        actualizarTextoPeriodo();
        actualizarEstadisticas();
        mostrarHistorial();

    } catch (error) {
        console.error(
            "Error al cargar historial:",
            error
        );

        registrosHistorial = [];

        actualizarEstadisticas();

        mostrarErrorTabla(
            error.message ||
            "No fue posible cargar el historial."
        );
    }
}

/* =========================================================
   CABECERA DEL INTEGRANTE
========================================================= */

function actualizarCabeceraMiembro() {
    if (!datosMiembro) {
        return;
    }

    const nombre =
        datosMiembro.nombreCompleto ||
        datosMiembro.nombre ||
        "Integrante sin nombre";

    const correo =
        datosMiembro.correo ||
        "Correo no disponible";

    const rol =
        datosMiembro.rol ||
        "Sin rol asignado";

    const estado =
        datosMiembro.estado ||
        "Sin estado";

    if (nombreMiembro) {
        nombreMiembro.textContent = nombre;
    }

    if (correoMiembro) {
        correoMiembro.textContent = correo;
    }

    if (rolMiembro) {
        rolMiembro.textContent = rol;
    }

    if (estadoMiembro) {
        estadoMiembro.textContent = estado;
        estadoMiembro.className =
            obtenerClaseEstadoMiembro(estado);
    }

    if (avatarMiembro) {
        avatarMiembro.textContent =
            obtenerIniciales(nombre);
    }

    if (tituloPagina) {
        tituloPagina.textContent = esAdministrador()
            ? "Historial de horas del integrante"
            : "Mi historial de horas";
    }

    if (subtituloPagina) {
        subtituloPagina.textContent = esAdministrador()
            ? "Consulta de jornadas y registros de tiempo del integrante seleccionado."
            : "Consulta de tus jornadas y registros de horas.";
    }
}

/* =========================================================
   ESTADÍSTICAS
========================================================= */

function actualizarEstadisticas() {
    const totalRegistrado = registrosHistorial.reduce(
        function (total, registro) {
            return total + Number(
                registro.horasTrabajadas || 0
            );
        },
        0
    );

    const totalAprobado = sumarHorasPorEstado(
        "aprobado"
    );

    const totalPendiente = sumarHorasPorEstado(
        "pendiente"
    );

    const totalRechazado = sumarHorasPorEstado(
        "rechazado"
    );

    if (horasRegistradas) {
        horasRegistradas.textContent =
            totalRegistrado.toFixed(2) + "h";
    }

    if (horasAprobadas) {
        horasAprobadas.textContent =
            totalAprobado.toFixed(2) + "h";
    }

    if (horasPendientes) {
        horasPendientes.textContent =
            totalPendiente.toFixed(2) + "h";
    }

    if (horasRechazadas) {
        horasRechazadas.textContent =
            totalRechazado.toFixed(2) + "h";
    }

    if (contadorRegistros) {
        const total = registrosHistorial.length;

        contadorRegistros.textContent =
            `${total} ${
                total === 1
                    ? "registro"
                    : "registros"
            }`;
    }
}

function sumarHorasPorEstado(estadoBuscado) {
    return registrosHistorial
        .filter(function (registro) {
            return String(
                registro.estadoValidacion || ""
            )
                .trim()
                .toLowerCase() === estadoBuscado;
        })
        .reduce(function (total, registro) {
            return total + Number(
                registro.horasTrabajadas || 0
            );
        }, 0);
}

/* =========================================================
   TABLA DE HISTORIAL
========================================================= */

function mostrarHistorial() {
    if (!tablaHistorialHoras) {
        return;
    }

    tablaHistorialHoras.innerHTML = "";

    if (registrosHistorial.length === 0) {
        tablaHistorialHoras.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    No hay registros de horas para el periodo seleccionado.
                </td>
            </tr>
        `;

        return;
    }

    registrosHistorial
        .slice()
        .sort(function (a, b) {
            return convertirFechaRegistro(b) -
                convertirFechaRegistro(a);
        })
        .forEach(function (registro) {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>
                    ${escaparHTML(
                        formatearFecha(registro.fecha)
                    )}
                </td>

                <td>
                    <span class="type-badge ${
                        obtenerClaseTipoRegistro(
                            registro.tipoRegistro
                        )
                    }">
                        ${escaparHTML(
                            registro.tipoRegistro ||
                            "Manual"
                        )}
                    </span>
                </td>

                <td>
                    ${escaparHTML(
                        construirProyectoTarea(registro)
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        registro.descripcion ||
                        "Sin descripción"
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        formatearHorario(
                            registro.horaEntrada,
                            registro.horaSalida
                        )
                    )}
                </td>

                <td class="text-right">
                    <strong>
                        ${Number(
                            registro.horasTrabajadas || 0
                        ).toFixed(2)}h
                    </strong>
                </td>

                <td>
                    <span class="badge ${
                        obtenerClaseValidacion(
                            registro.estadoValidacion
                        )
                    }">
                        ${escaparHTML(
                            registro.estadoValidacion ||
                            "Pendiente"
                        )}
                    </span>
                </td>
            `;

            tablaHistorialHoras.appendChild(fila);
        });
}

function construirProyectoTarea(registro) {
    const proyecto =
        registro.proyectoNombre ||
        "Sin proyecto";

    const tarea =
        registro.tareaTitulo ||
        "";

    return tarea
        ? `${proyecto} · ${tarea}`
        : proyecto;
}

/* =========================================================
   DESCARGA DE FORMATOS
========================================================= */

function mostrarAvisoDescarga() {
    descargarAsistenciaPersonalPDF();
}

function descargarAsistenciaPersonalPDF() {
    if (!datosMiembro) {
        alert("Primero carga la información del integrante.");
        return;
    }

    const mes = Number(mesFiltro?.value || new Date().getMonth() + 1);
    const anio = Number(anioFiltro?.value || new Date().getFullYear());
    const nombre = datosMiembro.nombreCompleto || datosMiembro.nombre || "Colaborador";
    const institucion = "Universidad Politécnica de Tecámac";
    const periodo = obtenerPeriodoActual();
    const filas = construirFilasAsistenciaPersonal(mes, anio, nombre);
    const firmasEncargados = obtenerFirmasEncargados();

    const contenido = `
        <section class="asistencia-oficial">
            ${encabezadoAsistenciaPersonal(false)}

            <h2 class="titulo-asistencia">LISTA DE ASISTENCIA PERSONAL DE JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.</h2>

            <div class="datos-asistencia">
                <span><strong>NOMBRE:</strong> ${escaparHTML(nombre)}</span>
                <span><strong>INSTITUCIÓN:</strong> ${escaparHTML(institucion)}</span>
                <span><strong>MES:</strong> ${escaparHTML(obtenerNombreMes(mes))}</span>
                <span><strong>AÑO:</strong> ${escaparHTML(anio)}</span>
            </div>

            <table class="tabla-asistencia">
                <thead>
                    <tr>
                        <th>FECHA</th>
                        <th>NOMBRE</th>
                        <th>PISO</th>
                        <th>HORA ENTRADA</th>
                        <th>FIRMA</th>
                        <th>HORA SALIDA</th>
                        <th>FIRMA</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>

            <div class="simbolos">
                <h3>SIMBOLOGÍA DE LOS INCIDENTES</h3>
                <p>1 ------ NO LABORADO CON JUSTIFICACIÓN</p>
                <p>2 ------ NO LABORADO SIN JUSTIFICACIÓN</p>
                <p>3 ------ RECUPERACIÓN DEL DÍA NO LABORADO</p>
            </div>

            <table class="tabla-firmas">
                <tr>
                    <td>
                        <p>Vo.Bo.</p>
                        <br><br>
                        <strong>${escaparHTML(nombre)}</strong><br>
                        Estudiante / Colaborador<br>
                        UNIVERSIDAD POLITÉCNICA DE TECÁMAC
                    </td>
                    <td>
                        <p>Vo.Bo.</p>
                        ${firmasEncargados.miguel?.imagenBase64 ? `<img src="${firmasEncargados.miguel.imagenBase64}" class="firma-img">` : "<br><br>"}
                        <strong>Miguel Ángel Hernández Herrera</strong><br>
                        Asesor Empresarial<br>
                        JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.
                    </td>
                    <td>
                        <p>Vo.Bo.</p>
                        ${firmasEncargados.julio?.imagenBase64 ? `<img src="${firmasEncargados.julio.imagenBase64}" class="firma-img">` : "<br><br>"}
                        <strong>Julio Lara García</strong><br>
                        CEO y Fundador<br>
                        JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.
                    </td>
                </tr>
            </table>
        </section>
    `;

    abrirDocumentoAsistenciaImprimible(
        `asistencia_personal_${normalizarNombreArchivo(nombre)}_${mes}_${anio}.pdf`,
        contenido
    );
}

function construirFilasAsistenciaPersonal(mes, anio, nombre) {
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const registrosPorFecha = {};

    registrosHistorial.forEach(function (registro) {
        if (!registro.fecha) {
            return;
        }

        registrosPorFecha[registro.fecha] = registro;
    });

    const filas = [];

    for (let dia = 1; dia <= ultimoDia; dia++) {
        const fecha = new Date(anio, mes - 1, dia);
        const esFinSemana = fecha.getDay() === 0 || fecha.getDay() === 6;

        if (esFinSemana) {
            continue;
        }

        const claveFecha =
            `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

        const registro = registrosPorFecha[claveFecha];
        const incidente = normalizarTexto(registro?.incidente || "");

        let entrada = registro?.horaEntrada ? formatearHora(registro.horaEntrada) : "";
        let salida = registro?.horaSalida ? formatearHora(registro.horaSalida) : "";
        let clase = "";

        if (incidente === "justificado") {
            clase = "incidente-justificado";
        }

        if (incidente === "no_justificado") {
            clase = "incidente-no-justificado";
        }

        if (incidente === "recuperacion") {
            clase = "incidente-recuperacion";
        }

        filas.push(`
            <tr class="${clase}">
                <td>${formatearFecha(claveFecha)}</td>
                <td>${escaparHTML(nombre)}</td>
                <td>3</td>
                <td>${escaparHTML(entrada)}</td>
                <td></td>
                <td>${escaparHTML(salida)}</td>
                <td></td>
            </tr>
        `);
    }

    return filas.join("");
}

function encabezadoAsistenciaPersonal() {
    return `
        <header class="encabezado-asistencia">
            <img src="img/LOGO-J2M.png" alt="Logo JJM" class="logo-oficial">
            <div>
                <h3>ÁREA: OFICINA DE PROYECTOS</h3>
                <h3>PROPÓSITO: SEGUIMIENTO DE ASISTENCIAS DEL COLABORADOR</h3>
            </div>
        </header>
    `;
}

function abrirDocumentoAsistenciaImprimible(titulo, contenidoHTML) {
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
                    font-size: 12px;
                }
                .encabezado-asistencia {
                    display: grid;
                    grid-template-columns: 130px 1fr;
                    align-items: center;
                    border-bottom: 2px solid #111827;
                    margin-bottom: 14px;
                    padding-bottom: 8px;
                }
                .encabezado-asistencia div {
                    text-align: right;
                }
                .logo-oficial {
                    width: 110px;
                    max-height: 90px;
                    object-fit: contain;
                }
                .titulo-asistencia {
                    text-align: center;
                    font-size: 18px;
                    margin: 14px 0;
                }
                .datos-asistencia {
                    display: grid;
                    grid-template-columns: 2fr 2fr 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 14px;
                    font-size: 13px;
                }
                .tabla-asistencia {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 18px;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 6px;
                    text-align: center;
                    vertical-align: middle;
                }
                th {
                    background: #d9d9d9;
                    font-weight: 700;
                }
                .incidente-justificado td:nth-child(n+4) {
                    border-top: 2px dashed #1d4ed8;
                }
                .incidente-no-justificado td:nth-child(n+4) {
                    border-top: 2px dashed #dc2626;
                }
                .incidente-recuperacion {
                    background: #a7d8e4;
                }
                .simbolos {
                    margin-top: 14px;
                    font-size: 12px;
                }
                .simbolos h3 {
                    margin-bottom: 6px;
                }
                .simbolos p {
                    margin: 3px 0;
                }
                .tabla-firmas {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 36px;
                }
                .tabla-firmas td {
                    height: 130px;
                    text-align: center;
                    vertical-align: bottom;
                    width: 33.33%;
                }
                .firma-img {
                    max-width: 150px;
                    max-height: 55px;
                    display: block;
                    margin: 4px auto 8px;
                    object-fit: contain;
                }
                @media print {
                    @page {
                        size: landscape;
                        margin: 10mm;
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

function normalizarNombreArchivo(nombre) {
    return String(nombre || "documento")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

/* =========================================================
   FIRMA DEL ENCARGADO
========================================================= */

function abrirModalFirma() {
    if (!esAdministrador()) {
        return;
    }

    firmaTemporalSeleccionada = null;

    if (inputFirmaEncargado) {
        inputFirmaEncargado.value = "";
    }

    crearSelectorFirmaEncargado();
    cargarFirmaGuardadaEnVista();

    if (modalFirmaEncargado) {
        modalFirmaEncargado.classList.add("show");
    }
}

function cerrarModalFirma() {
    if (modalFirmaEncargado) {
        modalFirmaEncargado.classList.remove("show");
    }

    firmaTemporalSeleccionada = null;

    if (inputFirmaEncargado) {
        inputFirmaEncargado.value = "";
    }
}

function leerFirmaSeleccionada(event) {
    const archivo = event.target.files?.[0];

    if (!archivo) {
        return;
    }

    const formatosPermitidos = [
        "image/png",
        "image/jpeg",
        "image/jpg"
    ];

    if (!formatosPermitidos.includes(archivo.type)) {
        alert(
            "Selecciona una imagen válida en formato PNG, JPG o JPEG."
        );

        inputFirmaEncargado.value = "";
        return;
    }

    const limiteBytes = 2 * 1024 * 1024;

    if (archivo.size > limiteBytes) {
        alert(
            "La imagen de firma no debe superar 2 MB."
        );

        inputFirmaEncargado.value = "";
        return;
    }

    const lector = new FileReader();

    lector.onload = function (resultado) {
        firmaTemporalSeleccionada = {
            nombre: archivo.name,
            tipo: archivo.type,
            tamano: archivo.size,
            imagenBase64: resultado.target.result,
            fechaActualizacion: new Date().toISOString(),
            idUsuarioEncargado: obtenerIdUsuarioActivo()
        };

        mostrarFirmaEnVista(
            firmaTemporalSeleccionada.imagenBase64,
            firmaTemporalSeleccionada.nombre
        );
    };

    lector.readAsDataURL(archivo);
}

function guardarFirmaEncargado() {
    if (!esAdministrador()) {
        alert(
            "Solo un administrador puede registrar la firma del encargado."
        );
        return;
    }

    if (!firmaTemporalSeleccionada) {
        alert(
            "Selecciona una imagen de firma antes de guardar."
        );
        return;
    }

    try {
        localStorage.setItem(
            obtenerClaveFirmaActual(),
            JSON.stringify({
                ...firmaTemporalSeleccionada,
                encargado: encargadoFirmaSeleccionado,
                nombreEncargado: obtenerNombreEncargadoFirma(encargadoFirmaSeleccionado)
            })
        );

        alert(
            "Firma de " + obtenerNombreEncargadoFirma(encargadoFirmaSeleccionado) +
            " guardada correctamente. Quedará disponible para los documentos generados desde este navegador."
        );

        cerrarModalFirma();

    } catch (error) {
        console.error(
            "No fue posible guardar la firma:",
            error
        );

        alert(
            "No fue posible guardar la firma. " +
            "Verifica que la imagen sea más pequeña."
        );
    }
}

function eliminarFirmaEncargado() {
    if (!esAdministrador()) {
        return;
    }

    const firmaGuardada = obtenerFirmaGuardada();

    if (!firmaGuardada) {
        alert(
            "No hay una firma registrada para este encargado."
        );
        return;
    }

    if (!confirm(
        "¿Deseas eliminar la firma de " + obtenerNombreEncargadoFirma(encargadoFirmaSeleccionado) + "?"
    )) {
        return;
    }

    localStorage.removeItem(obtenerClaveFirmaActual());

    firmaTemporalSeleccionada = null;

    if (inputFirmaEncargado) {
        inputFirmaEncargado.value = "";
    }

    mostrarFirmaEnVista(null, null);

    alert(
        "Firma eliminada correctamente."
    );
}

function obtenerFirmaGuardada() {
    try {
        let firma = localStorage.getItem(obtenerClaveFirmaActual());

        /* Compatibilidad: si antes solo había una firma general, se toma como firma de Miguel. */
        if (!firma && encargadoFirmaSeleccionado === "miguel") {
            firma = localStorage.getItem(CLAVE_FIRMA_ENCARGADO);
        }

        return firma ? JSON.parse(firma) : null;

    } catch (error) {
        console.error(
            "No fue posible leer la firma guardada:",
            error
        );

        return null;
    }
}

function obtenerFirmasEncargados() {
    return {
        miguel: obtenerFirmaPorClave(CLAVE_FIRMA_MIGUEL) || obtenerFirmaPorClave(CLAVE_FIRMA_ENCARGADO),
        julio: obtenerFirmaPorClave(CLAVE_FIRMA_JULIO)
    };
}

function obtenerFirmaPorClave(clave) {
    try {
        const firma = localStorage.getItem(clave);
        return firma ? JSON.parse(firma) : null;
    } catch (error) {
        return null;
    }
}

function obtenerClaveFirmaActual() {
    return encargadoFirmaSeleccionado === "julio"
        ? CLAVE_FIRMA_JULIO
        : CLAVE_FIRMA_MIGUEL;
}

function obtenerNombreEncargadoFirma(tipo) {
    return tipo === "julio"
        ? "Julio Lara García"
        : "Miguel Ángel Hernández Herrera";
}

function crearSelectorFirmaEncargado() {
    if (!modalFirmaEncargado) {
        return;
    }

    let selectorExistente = document.getElementById("selectEncargadoFirma");

    if (selectorExistente) {
        selectorExistente.value = encargadoFirmaSeleccionado;
        return;
    }

    const areaCarga = modalFirmaEncargado.querySelector(".signature-upload-area");

    if (!areaCarga) {
        return;
    }

    const grupo = document.createElement("div");
    grupo.className = "signature-upload-area";
    grupo.style.marginBottom = "14px";

    grupo.innerHTML = `
        <label for="selectEncargadoFirma">Firma que deseas configurar</label>
        <select id="selectEncargadoFirma" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;">
            <option value="miguel">Miguel Ángel Hernández Herrera - Asesor Empresarial</option>
            <option value="julio">Julio Lara García - CEO y Fundador</option>
        </select>
    `;

    areaCarga.parentNode.insertBefore(grupo, areaCarga);

    selectorExistente = document.getElementById("selectEncargadoFirma");

    selectorExistente.addEventListener("change", function () {
        encargadoFirmaSeleccionado = selectorExistente.value || "miguel";
        firmaTemporalSeleccionada = null;

        if (inputFirmaEncargado) {
            inputFirmaEncargado.value = "";
        }

        cargarFirmaGuardadaEnVista();
    });
}

function cargarFirmaGuardadaEnVista() {
    crearSelectorFirmaEncargado();
    const firmaGuardada = obtenerFirmaGuardada();

    if (!firmaGuardada?.imagenBase64) {
        mostrarFirmaEnVista(null, null);
        return;
    }

    mostrarFirmaEnVista(
        firmaGuardada.imagenBase64,
        firmaGuardada.nombre
    );
}

function mostrarFirmaEnVista(imagenBase64, nombreArchivo) {
    if (imagenBase64) {
        if (vistaFirma) {
            vistaFirma.src = imagenBase64;
            vistaFirma.style.display = "block";
        }

        if (textoSinFirma) {
            textoSinFirma.style.display = "none";
        }

        if (nombreArchivoFirma) {
            nombreArchivoFirma.textContent =
                nombreArchivo ||
                "Firma registrada.";
        }

        return;
    }

    if (vistaFirma) {
        vistaFirma.src = "";
        vistaFirma.style.display = "none";
    }

    if (textoSinFirma) {
        textoSinFirma.style.display = "inline";
    }

    if (nombreArchivoFirma) {
        nombreArchivoFirma.textContent =
            "Ningún archivo seleccionado.";
    }
}

/* =========================================================
   PERIODO Y CLASES
========================================================= */

function actualizarTextoPeriodo() {
    if (!textoPeriodo) {
        return;
    }

    textoPeriodo.textContent =
        `Registros correspondientes a ${obtenerPeriodoActual()}.`;
}

function obtenerPeriodoActual() {
    const mes = Number(mesFiltro?.value || 0);
    const anio = anioFiltro?.value || "";

    return `${obtenerNombreMes(mes)} de ${anio}`;
}

function obtenerClaseValidacion(estado) {
    const valor = String(estado || "")
        .trim()
        .toLowerCase();

    if (valor === "aprobado") {
        return "green";
    }

    if (valor === "rechazado") {
        return "red";
    }

    return "yellow";
}

function obtenerClaseTipoRegistro(tipo) {
    return String(tipo || "")
        .trim()
        .toLowerCase() === "jornada"
        ? "type-jornada"
        : "type-manual";
}

function obtenerClaseEstadoMiembro(estado) {
    const valor = String(estado || "")
        .trim()
        .toLowerCase();

    if (valor === "activo") {
        return "member-status active";
    }

    if (valor === "inactivo") {
        return "member-status inactive";
    }

    return "member-status";
}

/* =========================================================
   UTILIDADES
========================================================= */

function obtenerNombreMes(numeroMes) {
    const meses = [
        "",
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

    return meses[numeroMes] ||
        "el periodo seleccionado";
}

function obtenerIniciales(nombre) {
    const palabras = String(nombre || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (palabras.length === 0) {
        return "--";
    }

    if (palabras.length === 1) {
        return palabras[0]
            .slice(0, 2)
            .toUpperCase();
    }

    return (
        palabras[0][0] +
        palabras[1][0]
    ).toUpperCase();
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

function formatearHora(hora) {
    return hora
        ? String(hora).slice(0, 5)
        : "—";
}

function formatearHorario(entrada, salida) {
    if (entrada && salida) {
        return `${formatearHora(entrada)} - ${formatearHora(salida)}`;
    }

    if (entrada && !salida) {
        return `${formatearHora(entrada)} - Jornada abierta`;
    }

    return "Sin horario";
}

function convertirFechaRegistro(registro) {
    const fecha = registro.fecha || "";
    const hora = registro.horaEntrada || "00:00:00";

    const tiempo = new Date(
        `${fecha}T${hora}`
    ).getTime();

    return Number.isNaN(tiempo)
        ? 0
        : tiempo;
}

function mostrarCargaTabla() {
    if (!tablaHistorialHoras) {
        return;
    }

    tablaHistorialHoras.innerHTML = `
        <tr>
            <td colspan="7" class="empty-table">
                Cargando historial de horas...
            </td>
        </tr>
    `;
}

function mostrarErrorTabla(mensaje) {
    if (!tablaHistorialHoras) {
        return;
    }

    tablaHistorialHoras.innerHTML = `
        <tr>
            <td colspan="7" class="empty-table">
                ${escaparHTML(mensaje)}
            </td>
        </tr>
    `;
}

function mostrarErrorGeneral(mensaje) {
    if (tituloPagina) {
        tituloPagina.textContent =
            "No fue posible cargar el historial";
    }

    if (subtituloPagina) {
        subtituloPagina.textContent = mensaje;
    }

    mostrarErrorTabla(mensaje);
}

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}