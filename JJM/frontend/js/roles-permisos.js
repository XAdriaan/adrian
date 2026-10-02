const API_ROLES = window.apiUrl("/api/roles");
const API_PERMISOS = window.apiUrl("/api/roles/permisos");

let rolesPMO = [];
let permisosPMO = [];

const contenedorRoles = document.getElementById("contenedorRoles");
const estadoRoles = document.getElementById("estadoRoles");
const buscarRol = document.getElementById("buscarRol");
const btnNuevoRol = document.getElementById("btnNuevoRol");
const modalRol = document.getElementById("modalRol");
const formRol = document.getElementById("formRol");
const idRol = document.getElementById("idRol");
const nombreRol = document.getElementById("nombreRol");
const descripcionRol = document.getElementById("descripcionRol");
const tituloModalRol = document.getElementById("tituloModalRol");
const contenedorPermisos = document.getElementById("contenedorPermisos");
const btnCerrarRol = document.getElementById("btnCerrarRol");
const btnCancelarRol = document.getElementById("btnCancelarRol");
const btnGuardarRol = document.getElementById("btnGuardarRol");
const btnLimpiarPermisos = document.getElementById("btnLimpiarPermisos");
const btnSeleccionarLectura = document.getElementById("btnSeleccionarLectura");

const PERMISOS_LECTURA = new Set([
    "dashboard.ver","proyectos.ver_todos","tareas.ver_todas","horas.ver_todas",
    "equipo.ver","organizaciones.ver","reportes.ver","reportes.exportar",
    "encuestas.ver_todas","documentos.ver_todos","seguimiento.ver",
    "datos_academicos.ver_otros","cursos.ver_todos"
]);

document.addEventListener("DOMContentLoaded", async function () {
    if (!(window.PMOPermisos && window.PMOPermisos.esSuperadmin())) {
        window.location.replace("dashboard.html");
        return;
    }

    configurarEventos();
    await Promise.all([cargarPermisos(), cargarRoles()]);
    renderRoles();
});

function configurarEventos() {
    btnNuevoRol?.addEventListener("click", () => abrirModalRol());
    btnCerrarRol?.addEventListener("click", cerrarModalRol);
    btnCancelarRol?.addEventListener("click", cerrarModalRol);
    buscarRol?.addEventListener("input", renderRoles);
    formRol?.addEventListener("submit", guardarRol);
    btnLimpiarPermisos?.addEventListener("click", () => marcarPermisos(new Set()));
    btnSeleccionarLectura?.addEventListener("click", () => {
        const ids = new Set(permisosPMO.filter(p => PERMISOS_LECTURA.has(p.clave)).map(p => Number(p.id)));
        marcarPermisos(ids);
    });
    modalRol?.addEventListener("click", e => { if (e.target === modalRol) cerrarModalRol(); });
}

async function cargarRoles() {
    const respuesta = await fetch(API_ROLES);
    const datos = await json(respuesta);
    if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudieron cargar los roles.");
    rolesPMO = Array.isArray(datos.roles) ? datos.roles : [];
}

async function cargarPermisos() {
    const respuesta = await fetch(API_PERMISOS);
    const datos = await json(respuesta);
    if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudieron cargar los permisos.");
    permisosPMO = Array.isArray(datos.permisos) ? datos.permisos : [];
    renderPermisos();
}

function renderRoles() {
    const q = normalizar(buscarRol?.value || "");
    const lista = rolesPMO.filter(r => !q || normalizar(`${r.nombre} ${r.descripcion || ""}`).includes(q));
    estadoRoles.textContent = `${lista.length} rol${lista.length === 1 ? "" : "es"}`;

    if (!lista.length) {
        contenedorRoles.innerHTML = '<div class="roles-empty">No se encontraron roles.</div>';
        return;
    }

    contenedorRoles.innerHTML = lista.map(r => {
        const root = Number(r.id) === 9;
        const admin = Number(r.id) === 1;
        const permisos = Array.isArray(r.permisos) ? r.permisos : [];
        const puedeEditar = r.editable === true;
        const puedeEliminar = r.protegido !== true;
        return `
            <article class="role-card">
                <div class="role-card-head">
                    <div><h3>${escapeHtml(r.nombre || "Rol")}</h3></div>
                    <span class="role-badge ${root ? "root" : ""}">${root ? "RAÍZ" : (admin ? "ADMIN" : (r.protegido ? "BASE" : "PERSONALIZADO"))}</span>
                </div>
                <p>${escapeHtml(r.descripcion || "Sin descripción.")}</p>
                <div class="role-stats">
                    <span class="role-stat">${permisos.length} permisos</span>
                    <span class="role-stat">ID ${Number(r.id)}</span>
                </div>
                <div class="role-actions">
                    ${puedeEditar ? `<button class="btn-secondary" type="button" onclick="editarRol(${Number(r.id)})">Editar permisos</button>` : '<button class="btn-secondary" type="button" disabled>Protegido</button>'}
                    ${puedeEliminar ? `<button class="btn-danger" type="button" onclick="eliminarRol(${Number(r.id)})">Eliminar</button>` : ""}
                </div>
            </article>`;
    }).join("");
}

function renderPermisos() {
    const grupos = {};
    permisosPMO.forEach(p => {
        const grupo = p.grupo || "General";
        (grupos[grupo] ||= []).push(p);
    });

    contenedorPermisos.innerHTML = Object.entries(grupos).map(([grupo, permisos]) => `
        <section class="permission-group">
            <h4>${escapeHtml(grupo)}</h4>
            ${permisos.map(p => `
                <label class="permission-item">
                    <input type="checkbox" name="permisoRol" value="${Number(p.id)}" data-clave="${escapeHtml(p.clave || "")}">
                    <span><strong>${escapeHtml(p.nombre || p.clave)}</strong><small>${escapeHtml(p.descripcion || "")}</small></span>
                </label>`).join("")}
        </section>`).join("");
}

function abrirModalRol(rol = null) {
    formRol.reset();
    idRol.value = rol?.id || "";
    nombreRol.value = rol?.nombre || "";
    descripcionRol.value = rol?.descripcion || "";
    tituloModalRol.textContent = rol ? `Editar: ${rol.nombre}` : "Nuevo rol";

    const claves = new Set(Array.isArray(rol?.permisos) ? rol.permisos : []);
    document.querySelectorAll('input[name="permisoRol"]').forEach(input => {
        input.checked = claves.has(input.dataset.clave);
    });

    modalRol.classList.add("show");
    modalRol.setAttribute("aria-hidden", "false");
}

function cerrarModalRol() {
    modalRol.classList.remove("show");
    modalRol.setAttribute("aria-hidden", "true");
}

function editarRol(id) {
    const rol = rolesPMO.find(r => Number(r.id) === Number(id));
    if (!rol || rol.editable !== true) return;
    abrirModalRol(rol);
}

async function guardarRol(event) {
    event.preventDefault();
    const id = idRol.value ? Number(idRol.value) : null;
    const permisos = [...document.querySelectorAll('input[name="permisoRol"]:checked')].map(i => Number(i.value));
    const payload = { nombre: nombreRol.value.trim(), descripcion: descripcionRol.value.trim(), permisos };
    if (!payload.nombre) { alert("Escribe un nombre para el rol."); return; }

    btnGuardarRol.disabled = true;
    btnGuardarRol.textContent = "Guardando...";
    try {
        const respuesta = await fetch(id ? `${API_ROLES}/${id}` : API_ROLES, {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const datos = await json(respuesta);
        if (!respuesta.ok) throw new Error(datos.mensaje || "No fue posible guardar el rol.");
        await cargarRoles();
        renderRoles();
        cerrarModalRol();
        alert(datos.mensaje || "Rol guardado correctamente.");
    } catch (error) {
        alert(error.message || "No fue posible guardar el rol.");
    } finally {
        btnGuardarRol.disabled = false;
        btnGuardarRol.textContent = "Guardar rol";
    }
}

async function eliminarRol(id) {
    const rol = rolesPMO.find(r => Number(r.id) === Number(id));
    if (!rol || rol.protegido === true) return;
    if (!confirm(`¿Eliminar el rol "${rol.nombre}"?`)) return;
    try {
        const respuesta = await fetch(`${API_ROLES}/${id}`, { method: "DELETE" });
        const datos = await json(respuesta);
        if (!respuesta.ok) throw new Error(datos.mensaje || "No fue posible eliminar el rol.");
        await cargarRoles();
        renderRoles();
        alert(datos.mensaje || "Rol eliminado.");
    } catch (error) {
        alert(error.message || "No fue posible eliminar el rol.");
    }
}

function marcarPermisos(ids) {
    document.querySelectorAll('input[name="permisoRol"]').forEach(input => {
        input.checked = ids.has(Number(input.value));
    });
}

function normalizar(v) {
    return String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
async function json(r) { try { return await r.json(); } catch { return {}; } }

window.editarRol = editarRol;
window.eliminarRol = eliminarRol;
