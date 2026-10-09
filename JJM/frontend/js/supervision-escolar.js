"use strict";
let alumnosEscolar = [];
let secuenciaListaEscolar = 0;
let secuenciaDetalleEscolar = 0;
const escolarEl = id => document.getElementById(id);
const escolarTexto = valor => String(valor ?? "").trim();
const escolarNormalizar = valor => escolarTexto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const escolarEscapar = valor => escolarTexto(valor).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
const escolarPeriodo = alumno => window.PMOPeriodos.clasificar(alumno);

function mensajeEscolar(texto = "") {
    escolarEl("mensajeEscolar").textContent = texto;
    escolarEl("mensajeEscolar").hidden = !texto;
}

async function consultarEscolar(ruta) {
    const respuesta = await fetch(window.apiUrl(`/api/supervision-escolar${ruta}`));
    let datos;
    try { datos = await respuesta.json(); } catch (_) { throw new Error("El servidor no devolvió una respuesta válida."); }
    if (!respuesta.ok) throw new Error(datos.mensaje || `No se pudo consultar la supervisión (HTTP ${respuesta.status}).`);
    return datos;
}

async function cargarAlumnosEscolar() {
    const secuencia = ++secuenciaListaEscolar;
    ++secuenciaDetalleEscolar;
    escolarEl("expedienteEscolar").hidden = true;
    escolarEl("actualizarEscolar").disabled = true;
    escolarEl("alumnosEscolar").innerHTML = '<tr><td colspan="5">Cargando alumnos…</td></tr>';
    mensajeEscolar();
    try {
        const datos = await consultarEscolar("");
        if (secuencia !== secuenciaListaEscolar) return;
        if (!Array.isArray(datos.alumnos)) throw new Error("El servidor no devolvió el listado de alumnos.");
        alumnosEscolar = datos.alumnos;
        const anio = escolarEl("anioEscolar").value;
        const anios = [...new Set(alumnosEscolar.map(a => escolarPeriodo(a).anio).filter(Boolean))].sort().reverse();
        escolarEl("anioEscolar").innerHTML = '<option value="">Todos los años</option>' + anios.map(a => `<option value="${escolarEscapar(a)}">${escolarEscapar(a)}</option>`).join("");
        escolarEl("anioEscolar").value = anios.includes(anio) ? anio : "";
        escolarEl("totalAlumnosEscolar").textContent = alumnosEscolar.length;
        escolarEl("totalPeriodoEscolar").textContent = alumnosEscolar.filter(a => escolarPeriodo(a).clave).length;
        escolarEl("totalDocumentosEscolar").textContent = alumnosEscolar.reduce((n, a) => n + (Number(a.totalDocumentos) || 0), 0);
        renderizarAlumnosEscolar();
    } catch (error) {
        if (secuencia !== secuenciaListaEscolar) return;
        alumnosEscolar = [];
        for (const id of ["totalAlumnosEscolar", "totalPeriodoEscolar", "totalDocumentosEscolar"]) escolarEl(id).textContent = "—";
        escolarEl("alumnosEscolar").innerHTML = '<tr><td colspan="5">No se pudo cargar el listado. Pulsa Actualizar para reintentar.</td></tr>';
        mensajeEscolar(error.message);
    } finally {
        if (secuencia === secuenciaListaEscolar) escolarEl("actualizarEscolar").disabled = false;
    }
}

function renderizarAlumnosEscolar() {
    const buscar = escolarNormalizar(escolarEl("buscarEscolar").value);
    const periodo = escolarEl("periodoEscolar").value;
    const anio = escolarEl("anioEscolar").value;
    const lista = alumnosEscolar.filter(a => {
        const p = escolarPeriodo(a);
        return (!buscar || escolarNormalizar([a.nombre, a.correo, a.matricula].join(" ")).includes(buscar))
            && (!periodo || (periodo === "sin-periodo" ? !p.clave : p.clave === periodo))
            && (!anio || p.anio === anio);
    });
    escolarEl("alumnosEscolar").innerHTML = lista.length ? lista.map(a => {
        const p = escolarPeriodo(a);
        return `<tr><td><strong>${escolarEscapar(a.nombre)}</strong><small>${escolarEscapar(a.correo)}</small><small>Matrícula: ${escolarEscapar(a.matricula || "Sin registrar")}</small><small>${escolarEscapar(a.estado)}</small></td><td>${escolarEscapar(p.nombre)}${p.anio ? `<small>${escolarEscapar(p.anio)}</small>` : ""}</td><td>${Number(a.totalDocumentos) || 0}</td><td>${Number(a.cursosCompletados) || 0} de ${Number(a.totalCursos) || 26}</td><td><button type="button" data-alumno="${escolarEscapar(a.idUsuario)}">Ver expediente</button></td></tr>`;
    }).join("") : '<tr><td colspan="5">No hay alumnos para los filtros seleccionados.</td></tr>';
}

async function abrirExpedienteEscolar(id) {
    const secuencia = ++secuenciaDetalleEscolar;
    escolarEl("expedienteEscolar").hidden = true;
    mensajeEscolar("Cargando expediente…");
    try {
        const datos = await consultarEscolar(`/alumnos/${encodeURIComponent(id)}`);
        if (secuencia !== secuenciaDetalleEscolar) return;
        if (!datos.alumno || !Array.isArray(datos.documentos) || !Array.isArray(datos.certificados))
            throw new Error("El servidor no devolvió un expediente válido.");
        const a = datos.alumno;
        escolarEl("nombreExpedienteEscolar").textContent = a.nombre || "Expediente del alumno";
        escolarEl("datosExpedienteEscolar").innerHTML = [["Correo", a.correo], ["Matrícula", a.matricula],
            ["Universidad", a.universidad], ["Carrera", a.carrera], ["Cuatrimestre", a.cuatrimestre],
            ["Periodo", a.periodoEstadia], ["Fecha de inicio", a.fechaInicio], ["Fecha de término", a.fechaFin],
            ["Avance de cursos", `${Number(a.cursosCompletados) || 0} de ${Number(a.totalCursos) || 26}`]]
            .map(([titulo, valor]) => `<div><dt>${titulo}</dt><dd>${escolarEscapar(valor || "Sin registrar")}</dd></div>`).join("");
        escolarEl("documentosEscolar").innerHTML = datos.documentos.length ? datos.documentos.map(d =>
            `<tr><td>${escolarEscapar(d.tipoDocumento)}</td><td>${escolarEscapar(d.nombreArchivo)}</td><td>${escolarEscapar(d.estado)}</td><td>${escolarEscapar(d.fechaSubida || "Sin registrar")}</td><td>${escolarEscapar(d.observaciones || "—")}</td><td><button type="button" data-documento="${escolarEscapar(d.id)}" data-nombre="${escolarEscapar(d.nombreArchivo || "documento.pdf")}">Descargar</button></td></tr>`).join("")
            : '<tr><td colspan="6">El alumno todavía no tiene documentos registrados.</td></tr>';
        escolarEl("certificadosEscolar").innerHTML = datos.certificados.length ? datos.certificados.map(c =>
            `<tr><td>${escolarEscapar(c.nombreCurso)}</td><td>${escolarEscapar(c.nombreArchivo || "Sin registrar")}</td><td>${escolarEscapar(c.fechaCompletado || "Sin registrar")}</td><td>${c.completado === true ? "Completado" : "Pendiente"}</td></tr>`).join("")
            : '<tr><td colspan="4">El alumno todavía no tiene certificados de cursos registrados.</td></tr>';
        escolarEl("expedienteEscolar").hidden = false;
        mensajeEscolar();
        escolarEl("expedienteEscolar").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        if (secuencia === secuenciaDetalleEscolar) mensajeEscolar(error.message);
    }
}

async function descargarDocumentoEscolar(boton) {
    boton.disabled = true;
    try {
        const respuesta = await fetch(window.apiUrl(`/api/supervision-escolar/documentos/${encodeURIComponent(boton.dataset.documento)}`));
        if (!respuesta.ok) {
            const datos = await respuesta.json();
            throw new Error(datos.mensaje || "No se pudo descargar el documento.");
        }
        const url = URL.createObjectURL(await respuesta.blob());
        const enlace = document.createElement("a");
        enlace.href = url; enlace.download = boton.dataset.nombre; enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { mensajeEscolar(error.message); }
    finally { boton.disabled = false; }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!localStorage.getItem("sesionTokenPMO")) { window.location.replace("login.html"); return; }
    const usuario = await window.restaurarSesionPMO();
    if (!usuario) { mensajeEscolar("No se pudo confirmar la sesión. Vuelve a iniciar sesión."); return; }
    escolarEl("indicadorRolEscolar").textContent = usuario.rol?.nombre || usuario.rol || "Dirección escolar";
    escolarEl("actualizarEscolar").addEventListener("click", cargarAlumnosEscolar);
    for (const id of ["buscarEscolar", "periodoEscolar", "anioEscolar"]) escolarEl(id).addEventListener(id === "buscarEscolar" ? "input" : "change", renderizarAlumnosEscolar);
    escolarEl("alumnosEscolar").addEventListener("click", e => {
        const boton = e.target.closest("button[data-alumno]");
        if (boton) abrirExpedienteEscolar(boton.dataset.alumno);
    });
    escolarEl("documentosEscolar").addEventListener("click", e => {
        const boton = e.target.closest("button[data-documento]");
        if (boton) descargarDocumentoEscolar(boton);
    });
    await cargarAlumnosEscolar();
});
