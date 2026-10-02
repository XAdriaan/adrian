const API_PROGRESO_CURSOS = window.apiUrl("/api/cursos/progreso");

const cursos = [
    {
        id: 1,
        nombre: "Advanced Gas Turbine Engine Technologies: Fueling the Future of Power"
    },
    {
        id: 2,
        nombre: "Advanced Manufacturing: Driving the Next Industrial Revolution"
    },
    {
        id: 3,
        nombre: "An Introduction to Tech Diplomacy"
    },
    {
        id: 4,
        nombre: "Beyond Mach 5: Hypersonics Opportunities and Challenges"
    },
    {
        id: 5,
        nombre: "Connecting Worlds: The Evolution and Impact of Advanced Communication Technologies (5G/6G)"
    },
    {
        id: 6,
        nombre: "Cosmic Opportunities: Technologies for Sustained Presence in Space"
    },
    {
        id: 7,
        nombre: "Cryptography: Technologies for Securing Data and Communications"
    },
    {
        id: 8,
        nombre: "Cybersecurity: Securing Information in a Globally Distributed Economy"
    },
    {
        id: 9,
        nombre: "Deepfakes Decoded: Navigating Disinformation in the Digital Age"
    },
    {
        id: 10,
        nombre: "Emerging Tech: Leading in an Interconnected Landscape"
    },
    {
        id: 11,
        nombre: "Energy Transition: The Challenge of Our Century"
    },
    {
        id: 12,
        nombre: "Engineering the Future: The Revolutionary World of Robotics"
    },
    {
        id: 13,
        nombre: "Genomic Insights: Opportunities & Risks of Statistical Genetics"
    },
    {
        id: 14,
        nombre: "Navigating Tomorrow: Exploring the Frontiers of Autonomous Systems"
    },
    {
        id: 15,
        nombre: "Optimizing Interactions: Human-Machine Interfaces"
    },
    {
        id: 16,
        nombre: "Preparing for the Next Pandemic: Risks and Opportunities in Synthetic Biology"
    },
    {
        id: 17,
        nombre: "Quantum Revolution: Computing Beyond Classical Limits"
    },
    {
        id: 18,
        nombre: "Reimagining Power: The Next Era of Nuclear Technologies"
    },
    {
        id: 19,
        nombre: "Securing Global Food Supplies: Innovations in Agriculture Technology"
    },
    {
        id: 20,
        nombre: "The Challenge of Scale: Semiconductor Innovation and Manufacturing"
    },
    {
        id: 21,
        nombre: "Transforming Money: Opportunities & Risks With Digital Currencies"
    },
    {
        id: 22,
        nombre: "Understanding Neural Networks: Foundations of AI"
    },
    {
        id: 23,
        nombre: "Course 1: Transformational Leadership for Tech Diplomacy"
    },
    {
        id: 24,
        nombre: "Course 2: The Power of Trust for Transformation"
    },
    {
        id: 25,
        nombre: "Course 3: Fueling Innovation"
    },
    {
        id: 26,
        nombre: "Course 4: Adopting a Diplomatic Approach"
    }
];

function obtenerUsuarioActivoCursos() {
    try {
        return JSON.parse(localStorage.getItem("usuarioActivo")) || null;
    } catch (error) {
        return null;
    }
}

function obtenerIdUsuarioCursos() {
    const usuario = obtenerUsuarioActivoCursos();
    return usuario?.id || usuario?.idUsuario || usuario?.id_usuario || usuario?.correo || "sin_usuario";
}

function obtenerNombreUsuarioCursos() {
    const usuario = obtenerUsuarioActivoCursos() || {};
    return usuario.nombreCompleto || [usuario.nombre, usuario.apellidoPaterno, usuario.apellidoMaterno].filter(Boolean).join(" ") || usuario.correo || "Usuario";
}

function obtenerCorreoUsuarioCursos() {
    const usuario = obtenerUsuarioActivoCursos() || {};
    return usuario.correo || usuario.email || "";
}

function esAdministradorCursos() {
    if (window.PMOPermisos && window.PMOPermisos.tiene("cursos.ver_todos")) return true;

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


function obtenerClaveCursosUsuario() {
    return `certificadosCursos_${obtenerIdUsuarioCursos()}`;
}

function cargarCertificadosCursosUsuario() {
    const claveUsuario = obtenerClaveCursosUsuario();
    try {
        const guardados = JSON.parse(localStorage.getItem(claveUsuario));
        if (Array.isArray(guardados)) return guardados;

        // Compatibilidad con la versión anterior que usaba una clave global.
        const legacy = JSON.parse(localStorage.getItem("certificadosCursos"));
        if (Array.isArray(legacy) && legacy.length && !esAdministradorCursos()) {
            localStorage.setItem(claveUsuario, JSON.stringify(legacy));
            return legacy;
        }
    } catch (error) {
        console.warn("No fue posible cargar el progreso de cursos:", error);
    }
    return [];
}

async function cargarProgresoCursosBackend() {
    try {
        const respuesta = await fetch(`${API_PROGRESO_CURSOS}/mi-sesion`);
        const cuerpo = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(cuerpo.mensaje || "No se pudo cargar el progreso de cursos.");
        certificadosCursos = Array.isArray(cuerpo.certificados) ? cuerpo.certificados : [];
        localStorage.setItem(obtenerClaveCursosUsuario(), JSON.stringify(certificadosCursos));
        return true;
    } catch (error) {
        console.warn("Cursos: usando respaldo local.", error);
        certificadosCursos = cargarCertificadosCursosUsuario();
        return false;
    }
}

async function registrarProgresoUsuarioCursos() {
    const respuesta = await fetch(`${API_PROGRESO_CURSOS}/mi-sesion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificados: certificadosCursos, total: cursos.length })
    });
    const cuerpo = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(cuerpo.mensaje || "No se pudo guardar el progreso de cursos.");
    return cuerpo;
}

let certificadosCursos = cargarCertificadosCursosUsuario();

const contenedorCursos = document.getElementById("contenedorCursos");
const buscarCurso = document.getElementById("buscarCurso");
const filtroEstadoCurso = document.getElementById("filtroEstadoCurso");

const textoProgresoCursos = document.getElementById("textoProgresoCursos");
const porcentajeCursos = document.getElementById("porcentajeCursos");
const barraProgresoCursos = document.getElementById("barraProgresoCursos");
const panelMonitoreoCursos = document.getElementById("panelMonitoreoCursos");
const tablaMonitoreoCursos = document.getElementById("tablaMonitoreoCursos");
const resumenMonitoreoCursos = document.getElementById("resumenMonitoreoCursos");
const btnActualizarMonitoreoCursos = document.getElementById("btnActualizarMonitoreoCursos");

const modalCurso = document.getElementById("modalCurso");
const btnCerrarModalCurso = document.getElementById("btnCerrarModalCurso");
const btnCancelarCurso = document.getElementById("btnCancelarCurso");
const btnEliminarCertificado = document.getElementById("btnEliminarCertificado");

const tituloCursoModal = document.getElementById("tituloCursoModal");
const estadoCursoModal = document.getElementById("estadoCursoModal");
const certificadoActualBox = document.getElementById("certificadoActualBox");
const certificadoActualTexto = document.getElementById("certificadoActualTexto");

const formCertificadoCurso = document.getElementById("formCertificadoCurso");
const idCursoSeleccionado = document.getElementById("idCursoSeleccionado");
const archivoCertificado = document.getElementById("archivoCertificado");
const fechaCertificado = document.getElementById("fechaCertificado");
const notasCertificado = document.getElementById("notasCertificado");

document.addEventListener("DOMContentLoaded", async function () {
    if (!obtenerUsuarioActivoCursos()) {
        window.location.replace("login.html");
        return;
    }
    configurarEventosCursos();
    await cargarProgresoCursosBackend();
    renderizarCursos();
    actualizarProgresoCursos();
    configurarMonitoreoAdministrativoCursos();
    await renderizarMonitoreoAdministrativoCursos();
});

function configurarMonitoreoAdministrativoCursos() {
    if (!esAdministradorCursos()) {
        if (panelMonitoreoCursos) panelMonitoreoCursos.style.display = "none";
        return;
    }

    if (panelMonitoreoCursos) panelMonitoreoCursos.style.display = "block";

    if (btnActualizarMonitoreoCursos) {
        btnActualizarMonitoreoCursos.addEventListener("click", () => renderizarMonitoreoAdministrativoCursos());
    }
}

async function renderizarMonitoreoAdministrativoCursos() {
    if (!esAdministradorCursos() || !tablaMonitoreoCursos) return;

    let lista = [];
    try {
        const respuesta = await fetch(API_PROGRESO_CURSOS);
        const cuerpo = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(cuerpo.mensaje || "No se pudo cargar el monitoreo.");
        lista = Array.isArray(cuerpo.progresos) ? cuerpo.progresos : [];
        const registros = {};
        lista.forEach(item => registros[String(item.idUsuario)] = item);
        localStorage.setItem("cursoProgresoUsuariosPMO", JSON.stringify(registros));
    } catch (error) {
        console.warn("Monitoreo de cursos: usando respaldo local.", error);
        try { lista = Object.values(JSON.parse(localStorage.getItem("cursoProgresoUsuariosPMO") || "{}")); }
        catch (_) { lista = []; }
    }

    const completados = lista.filter(item => Number(item.porcentaje) >= 100).length;
    const enProceso = lista.filter(item => Number(item.porcentaje) > 0 && Number(item.porcentaje) < 100).length;
    const sinAvance = lista.filter(item => Number(item.porcentaje) === 0).length;

    if (resumenMonitoreoCursos) {
        resumenMonitoreoCursos.innerHTML = `
            <div class="monitor-kpi"><strong>${lista.length}</strong><span>Colaboradores con seguimiento</span></div>
            <div class="monitor-kpi"><strong>${completados}</strong><span>Cursos completos al 100%</span></div>
            <div class="monitor-kpi"><strong>${enProceso}</strong><span>Colaboradores en proceso · ${sinAvance} sin avance</span></div>`;
    }

    if (!lista.length) {
        tablaMonitoreoCursos.innerHTML = `<tr><td colspan="6" class="empty-row">Todavía no hay progreso de cursos registrado para otros usuarios.</td></tr>`;
        return;
    }

    tablaMonitoreoCursos.innerHTML = lista
        .sort((a,b) => Number(b.porcentaje || 0) - Number(a.porcentaje || 0))
        .map(item => {
            const total = Number(item.total || cursos.length);
            const hechos = Math.min(Number(item.cursosCompletados ?? item.completados?.length ?? 0), total);
            const porcentaje = Number(item.porcentaje ?? Math.round((hechos / total) * 100));
            const faltantes = Math.max(total - hechos, 0);
            const completo = porcentaje >= 100;
            return `<tr>
                <td><strong>${escaparHTMLCurso(item.nombre || "Usuario")}</strong></td>
                <td>${escaparHTMLCurso(item.correo || "—")}</td>
                <td>${hechos} / ${total}</td>
                <td><div class="course-progress-mini"><strong>${Math.round(porcentaje)}%</strong><div class="bar"><div class="fill" style="width:${Math.round(porcentaje)}%"></div></div></div></td>
                <td>${faltantes}</td>
                <td><span class="course-monitor-status ${completo ? "complete" : "progress"}">${completo ? "Completado" : "Pendiente"}</span></td>
            </tr>`;
        }).join("");
}

function escaparHTMLCurso(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, function(caracter) {
        return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[caracter];
    });
}

function configurarEventosCursos() {
    if (buscarCurso) {
        buscarCurso.addEventListener("input", renderizarCursos);
    }

    if (filtroEstadoCurso) {
        filtroEstadoCurso.addEventListener("change", renderizarCursos);
    }

    if (btnCerrarModalCurso) {
        btnCerrarModalCurso.addEventListener("click", cerrarModalCurso);
    }

    if (btnCancelarCurso) {
        btnCancelarCurso.addEventListener("click", cerrarModalCurso);
    }

    if (modalCurso) {
        modalCurso.addEventListener("click", function (event) {
            if (event.target === modalCurso) {
                cerrarModalCurso();
            }
        });
    }

    if (formCertificadoCurso) {
        formCertificadoCurso.addEventListener("submit", async function (event) {
            event.preventDefault();
            try { await guardarCertificadoCurso(); }
            catch (error) { alert(error.message || "No fue posible guardar el progreso del curso."); }
        });
    }

    if (btnEliminarCertificado) {
        btnEliminarCertificado.addEventListener("click", () => eliminarCertificadoCurso().catch(error => alert(error.message || "No fue posible eliminar el certificado.")));
    }
}

function renderizarCursos() {
    if (!contenedorCursos) return;

    let lista = cursos.slice();

    const busqueda = buscarCurso ? buscarCurso.value.trim().toLowerCase() : "";
    const filtro = filtroEstadoCurso ? filtroEstadoCurso.value : "todos";

    if (busqueda !== "") {
        lista = lista.filter(function (curso) {
            return curso.nombre.toLowerCase().includes(busqueda);
        });
    }

    if (filtro === "completados") {
        lista = lista.filter(function (curso) {
            return cursoCompletado(curso.id);
        });
    }

    if (filtro === "pendientes") {
        lista = lista.filter(function (curso) {
            return !cursoCompletado(curso.id);
        });
    }

    contenedorCursos.innerHTML = "";

    if (lista.length === 0) {
        contenedorCursos.innerHTML = `
            <div class="empty-state">
                <h3>No se encontraron cursos</h3>
                <p>Intenta con otro filtro o búsqueda.</p>
            </div>
        `;
        return;
    }

    lista.forEach(function (curso) {
        const completado = cursoCompletado(curso.id);

        const card = document.createElement("article");
        card.className = completado ? "course-card completed" : "course-card";

        card.innerHTML = `
            <div>
                <div class="course-number">${curso.id}</div>
                <h3>${curso.nombre}</h3>
            </div>

            <div class="course-footer">
                <span class="course-status ${completado ? "completed" : ""}">
                    ${completado ? "Certificado subido" : "Pendiente"}
                </span>

                <button type="button" class="course-btn">
                    ${completado ? "Ver certificado" : "Subir certificado"}
                </button>
            </div>
        `;

        card.addEventListener("click", function () {
            abrirModalCurso(curso.id);
        });

        contenedorCursos.appendChild(card);
    });
}

function abrirModalCurso(idCurso) {
    const curso = cursos.find(function (item) {
        return Number(item.id) === Number(idCurso);
    });

    if (!curso || !modalCurso || !formCertificadoCurso) return;

    formCertificadoCurso.reset();

    const certificado = obtenerCertificadoCurso(idCurso);

    idCursoSeleccionado.value = curso.id;
    tituloCursoModal.textContent = curso.nombre;

    const hoy = new Date().toISOString().split("T")[0];

    if (fechaCertificado) {
        fechaCertificado.value = certificado ? certificado.fechaCompletado : hoy;
    }

    if (notasCertificado) {
        notasCertificado.value = certificado ? certificado.notas : "";
    }

    if (certificado) {
        estadoCursoModal.textContent = "Curso completado";
        certificadoActualBox.classList.add("completed");
        certificadoActualTexto.textContent = `Certificado subido: ${certificado.nombreArchivo} · Fecha: ${formatearFecha(certificado.fechaCompletado)}`;

        if (btnEliminarCertificado) {
            btnEliminarCertificado.style.display = "inline-block";
        }

        if (archivoCertificado) {
            archivoCertificado.removeAttribute("required");
        }
    } else {
        estadoCursoModal.textContent = "Pendiente de certificado";
        certificadoActualBox.classList.remove("completed");
        certificadoActualTexto.textContent = "No hay certificado subido para este curso.";

        if (btnEliminarCertificado) {
            btnEliminarCertificado.style.display = "none";
        }

        if (archivoCertificado) {
            archivoCertificado.setAttribute("required", "required");
        }
    }

    modalCurso.classList.add("show");
}

function cerrarModalCurso() {
    if (!modalCurso || !formCertificadoCurso) return;

    modalCurso.classList.remove("show");
    formCertificadoCurso.reset();
}

async function guardarCertificadoCurso() {
    const idCurso = Number(idCursoSeleccionado.value);

    if (!idCurso) {
        alert("No se encontró el curso seleccionado.");
        return;
    }

    const curso = cursos.find(function (item) {
        return Number(item.id) === Number(idCurso);
    });

    if (!curso) {
        alert("No se encontró el curso.");
        return;
    }

    const certificadoExistente = obtenerCertificadoCurso(idCurso);
    const archivo = archivoCertificado.files[0];

    if (!archivo && !certificadoExistente) {
        alert("Selecciona un archivo de certificado.");
        return;
    }

    if (!fechaCertificado.value) {
        alert("Selecciona la fecha de completado.");
        return;
    }

    const certificado = {
        idCurso: idCurso,
        nombreCurso: curso.nombre,
        nombreArchivo: archivo ? archivo.name : certificadoExistente.nombreArchivo,
        tipoArchivo: archivo ? archivo.type : certificadoExistente.tipoArchivo,
        tamanoArchivo: archivo ? archivo.size : certificadoExistente.tamanoArchivo,
        fechaCompletado: fechaCertificado.value,
        notas: notasCertificado.value.trim(),
        completado: true,
        fechaRegistro: certificadoExistente ? certificadoExistente.fechaRegistro : new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    };

    certificadosCursos = certificadosCursos.filter(function (item) {
        return Number(item.idCurso) !== idCurso;
    });

    certificadosCursos.push(certificado);

    await guardarCertificadosCursos();

    cerrarModalCurso();
    renderizarCursos();
    actualizarProgresoCursos();

    alert("Certificado guardado correctamente.");
}

async function eliminarCertificadoCurso() {
    const idCurso = Number(idCursoSeleccionado.value);

    if (!idCurso) return;

    const confirmar = confirm("¿Deseas eliminar el certificado de este curso?");

    if (!confirmar) return;

    certificadosCursos = certificadosCursos.filter(function (item) {
        return Number(item.idCurso) !== idCurso;
    });

    await guardarCertificadosCursos();

    cerrarModalCurso();
    renderizarCursos();
    actualizarProgresoCursos();

    alert("Certificado eliminado correctamente.");
}

function actualizarProgresoCursos() {
    const completados = certificadosCursos.filter(function (item) {
        return item.completado === true;
    }).length;

    const total = cursos.length;
    const porcentaje = Math.round((completados / total) * 100);

    if (textoProgresoCursos) {
        textoProgresoCursos.textContent = completados + " de " + total + " certificados subidos";
    }

    if (porcentajeCursos) {
        porcentajeCursos.textContent = porcentaje + "%";
    }

    if (barraProgresoCursos) {
        barraProgresoCursos.style.width = porcentaje + "%";
    }
}

function cursoCompletado(idCurso) {
    return certificadosCursos.some(function (item) {
        return Number(item.idCurso) === Number(idCurso) && item.completado === true;
    });
}

function obtenerCertificadoCurso(idCurso) {
    return certificadosCursos.find(function (item) {
        return Number(item.idCurso) === Number(idCurso);
    });
}

async function guardarCertificadosCursos() {
    await registrarProgresoUsuarioCursos();
    localStorage.setItem(obtenerClaveCursosUsuario(), JSON.stringify(certificadosCursos));
    localStorage.setItem("certificadosCursos", JSON.stringify(certificadosCursos));
}

function formatearFecha(fecha) {
    if (!fecha) return "—";

    const partes = fecha.split("-");

    if (partes.length !== 3) return fecha;

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}