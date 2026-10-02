const API_PROYECTOS_PMBOK8 = window.apiUrl ? window.apiUrl("/api/proyectos") : "/api/proyectos";

document.addEventListener("DOMContentLoaded", function () {
    const boton = document.getElementById("btnActualizarPmbok");
    if (boton) boton.addEventListener("click", cargarResumenPmbok8);
    cargarResumenPmbok8();
});

function obtenerUsuarioPmbok8() {
    try { return JSON.parse(localStorage.getItem("usuarioActivo") || "null"); }
    catch (e) { return null; }
}
function obtenerIdUsuarioPmbok8() {
    const u = obtenerUsuarioPmbok8();
    return u?.id || u?.idUsuario || u?.id_usuario || null;
}
function normalizarPmbok8(valor) {
    return String(valor || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function clasificarAreaEnfoquePmbok8(estado) {
    const e = normalizarPmbok8(estado);
    if (["inicio","iniciacion","propuesto"].includes(e)) return "inicio";
    if (["planificacion","planning"].includes(e)) return "planificacion";
    if (["ejecucion","executing"].includes(e)) return "ejecucion";
    if (["monitoreo","monitoreo y control","monitoring and controlling"].includes(e)) return "monitoreo";
    if (["cierre","cerrado","closing"].includes(e)) return "cierre";
    return "otro";
}
async function cargarResumenPmbok8() {
    const ids = {inicio:"focusInicio",planificacion:"focusPlanificacion",ejecucion:"focusEjecucion",monitoreo:"focusMonitoreo",cierre:"focusCierre"};
    const conteos = {inicio:0,planificacion:0,ejecucion:0,monitoreo:0,cierre:0};
    try {
        const idUsuario = obtenerIdUsuarioPmbok8();
        const respuesta = await fetch(API_PROYECTOS_PMBOK8, {headers:idUsuario ? {"X-Usuario-Id": String(idUsuario)} : {}});
        if (!respuesta.ok) throw new Error("No fue posible consultar la cartera.");
        const cuerpo = await respuesta.json();
        const proyectos = Array.isArray(cuerpo) ? cuerpo : (Array.isArray(cuerpo.proyectos) ? cuerpo.proyectos : []);
        proyectos.forEach(p => { const clave = clasificarAreaEnfoquePmbok8(p.estado); if (conteos[clave] != null) conteos[clave]++; });
    } catch (error) {
        console.warn("Resumen PMBOK 8 sin datos de cartera:", error);
    }
    Object.entries(ids).forEach(([clave,id]) => { const el=document.getElementById(id); if(el) el.textContent=conteos[clave]; });
}