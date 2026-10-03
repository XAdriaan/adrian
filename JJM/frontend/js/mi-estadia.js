const API_MI_ESTADIA = window.apiUrl("/api/seguimiento-estadia/mi-seguimiento");
const API_REGISTROS_HORAS_ESTADIA = window.apiUrl("/api/registros-horas");
let registrosAsistencia = [];

document.addEventListener("DOMContentLoaded", async function () {
    configurarMesAsistencia();
    document.getElementById("mesAsistencia")?.addEventListener("change", renderizarAsistencia);
    await Promise.allSettled([cargarMiEstadia(), cargarAsistencia()]);
});

async function cargarMiEstadia() {
    try {
        const r = await fetch(API_MI_ESTADIA);
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.mensaje || "No fue posible consultar tu seguimiento.");
        render(d.seguimiento || {}, d.documentos || {});
    } catch (e) {
        console.error(e);
        const estado = document.getElementById("estadoDocumental");
        if (estado) {
            estado.className = "status-banner warn";
            estado.textContent = e.message;
        }
    }
}

function render(s, docs) {
    const completos = docs.completos === true;
    const estado = document.getElementById("estadoDocumental");
    estado.className = `status-banner ${completos ? "ok" : "warn"}`;
    estado.textContent = completos
        ? "Tu documentación está completa. La administración puede continuar con el cierre de tu estadía."
        : "Tu expediente todavía tiene documentos pendientes. Puedes seguir registrando asistencia y trabajando en tu proyecto mientras se completa.";

    document.getElementById("documentosGrid").innerHTML = `
        <div class="metric"><small>Carta de presentación</small><strong>${docs.cartaPresentacion ? "Aceptada ✓" : "Pendiente"}</strong></div>
        <div class="metric"><small>Carta de aceptación</small><strong>${docs.cartaAceptacion ? "Liberada ✓" : "Pendiente"}</strong></div>
        <div class="metric"><small>Carta de término</small><strong>${docs.cartaTermino ? "Liberada ✓" : "Pendiente"}</strong></div>`;

    const asesor = document.getElementById("asesorBox");
    if (s.asesorNombre) {
        asesor.innerHTML = `<div class="advisor-icon">👤</div><div><strong>${escapeHtml(s.asesorNombre)}</strong><small>${escapeHtml(s.asesorCorreo || "Asesor Empresarial")}</small></div>`;
    } else {
        asesor.innerHTML = '<div class="advisor-icon">👤</div><div><strong>Pendiente de asignación</strong><small>La administración todavía no ha asignado un asesor empresarial.</small></div>';
    }

    pintar("Empresa", s.empresa === true, s.fechaEmpresa, completos);
    pintar("Satisfaccion", s.satisfaccion === true, s.fechaSatisfaccion, completos);
    pintarFoEst03(s.foEst03 === true, s.fechaFoEst03);
}

function pintar(nombre, hecho, fecha, completos) {
    const badge = document.getElementById("badge" + nombre);
    const texto = document.getElementById("texto" + nombre);
    if (hecho) {
        badge.className = "badge done";
        badge.textContent = "Contestado ✓";
        texto.textContent = `La administración ya contestó este formulario${fecha ? " el " + new Date(fecha).toLocaleDateString("es-MX") : ""}.`;
        return;
    }
    if (!completos) {
        badge.className = "badge locked";
        badge.textContent = "Bloqueado";
        texto.textContent = "Pendiente de completar la documentación requerida.";
        return;
    }
    badge.className = "badge pending";
    badge.textContent = "Pendiente";
    texto.textContent = "La documentación ya está completa. El formulario está pendiente de ser contestado por la administración.";
}

function pintarFoEst03(hecho, fecha) {
    const badge = document.getElementById("badgeFoEst03");
    const texto = document.getElementById("textoFoEst03");
    if (!badge || !texto) return;
    if (hecho) {
        badge.className = "badge done";
        badge.textContent = "Evaluado ✓";
        texto.textContent = `La administración registró la evaluación FO-EST-03${fecha ? " el " + new Date(fecha).toLocaleDateString("es-MX") : ""}. Puedes descargar el formato oficial cuando lo necesites.`;
    } else {
        badge.className = "badge available";
        badge.textContent = "Disponible · pendiente de evaluación";
        texto.textContent = "Formato oficial para la lista de cotejo del proyecto y Actitud-SER. Incluye criterios de entregas parciales y evaluación de puntualidad, responsabilidad, ética, iniciativa y liderazgo.";
    }
}

async function cargarAsistencia() {
    try {
        const r = await fetch(API_REGISTROS_HORAS_ESTADIA);
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.mensaje || "No fue posible consultar los pases de lista.");
        registrosAsistencia = Array.isArray(d.registros) ? d.registros : [];
        renderizarAsistencia();
    } catch (e) {
        console.error(e);
        const tbody = document.getElementById("tablaAsistenciaBody");
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="attendance-empty">${escapeHtml(e.message || "No fue posible consultar la asistencia.")}</td></tr>`;
    }
}

function configurarMesAsistencia() {
    const control = document.getElementById("mesAsistencia");
    if (!control) return;
    const hoy = new Date();
    control.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function renderizarAsistencia() {
    const mes = document.getElementById("mesAsistencia")?.value || "";
    const registros = registrosAsistencia
        .filter(r => String(r.fecha || "").slice(0, 7) === mes)
        .sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")));

    const dias = new Set(registros.map(r => String(r.fecha || "").slice(0, 10)).filter(Boolean)).size;
    const horas = registros.reduce((t, r) => t + numero(r.horasTrabajadas), 0);
    const completos = registros.filter(r => r.horaEntrada && r.horaSalida).length;
    const resumen = document.getElementById("resumenAsistencia");
    if (resumen) resumen.innerHTML = `
        <div class="metric"><small>Días con pase de lista</small><strong>${dias}</strong></div>
        <div class="metric"><small>Jornadas con entrada y salida</small><strong>${completos}</strong></div>
        <div class="metric"><small>Horas registradas en el mes</small><strong>${horas.toFixed(2)} h</strong></div>`;

    const tbody = document.getElementById("tablaAsistenciaBody");
    if (!tbody) return;
    if (!registros.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="attendance-empty">No hay pases de lista registrados para este mes.</td></tr>';
        return;
    }

    tbody.innerHTML = registros.map(r => `
        <tr>
            <td>${escapeHtml(formatearFecha(r.fecha))}</td>
            <td>${escapeHtml(formatearHora(r.horaEntrada))}</td>
            <td>${escapeHtml(formatearHora(r.horaSalida))}</td>
            <td>${numero(r.horasTrabajadas).toFixed(2)} h</td>
            <td>${escapeHtml(formatearIncidente(r.incidente))}</td>
            <td>${escapeHtml(r.estadoValidacion || "Pendiente")}</td>
        </tr>`).join("");
}

function formatearFecha(v) {
    if (!v) return "—";
    const partes = String(v).slice(0, 10).split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : String(v);
}
function formatearHora(v) { return v ? String(v).slice(0, 5) : "—"; }
function formatearIncidente(v) {
    const mapa = { normal: "Normal", justificado: "No laborado con justificación", no_justificado: "No laborado sin justificación", recuperacion: "Recuperación", festivo: "Festivo", fin_semana: "Fin de semana" };
    return mapa[String(v || "").toLowerCase()] || (v || "Normal");
}
function numero(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function escapeHtml(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
