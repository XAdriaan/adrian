const API_MIEMBROS = window.apiUrl("/api/miembros");
const API_ROLES_ASIGNABLES = window.apiUrl("/api/roles/asignables");
const API_ASIGNAR_ROL = window.apiUrl("/api/roles/usuario");

let miembrosEquipo = [];
let rolesAsignables = [];
let usuarioActivo = obtenerUsuarioActivo();
let modoFormularioMiembro = "editar";

const contenedorEquipo = document.getElementById("contenedorEquipo");
const buscarMiembro = document.getElementById("buscarMiembro");
const filtroRol = document.getElementById("filtroRol");
const filtroEstado = document.getElementById("filtroEstado");
const permisoEquipo = document.getElementById("permisoEquipo");
const btnNuevoMiembro = document.getElementById("btnNuevoMiembro");

const modalMiembro = document.getElementById("modalMiembro");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelar = document.getElementById("btnCancelar");
const formMiembro = document.getElementById("formMiembro");
const tituloModal = document.getElementById("tituloModal");
const btnGuardarMiembro = document.getElementById("btnGuardarMiembro");
const idMiembro = document.getElementById("idMiembro");
const avisoCuentaMiembro = document.getElementById("avisoCuentaMiembro");

const nombreMiembro = document.getElementById("nombreMiembro");
const correoMiembro = document.getElementById("correoMiembro");
const telefonoMiembro = document.getElementById("telefonoMiembro");
const rolMiembro = document.getElementById("rolMiembro");
const grupoRolSistema = document.getElementById("grupoRolSistema");
const rolSistemaMiembro = document.getElementById("rolSistemaMiembro");
const notaRolSistema = document.getElementById("notaRolSistema");
const seniorityMiembro = document.getElementById("seniorityMiembro");
const horasMiembro = document.getElementById("horasMiembro");
const estadoMiembro = document.getElementById("estadoMiembro");
const habilidadesMiembro = document.getElementById("habilidadesMiembro");
const notasMiembro = document.getElementById("notasMiembro");

document.addEventListener("DOMContentLoaded", async function () {
    usuarioActivo = obtenerUsuarioActivo();
    configurarEventos();
    configurarPermisosVisuales();

    if (!esAdministrador()) {
        mostrarAccesoRestringido();
        return;
    }

    if (puedeAsignarRoles()) {
        await cargarRolesAsignables();
    }

    await cargarMiembrosDesdeAPI();
});

function configurarEventos() {
    buscarMiembro?.addEventListener("input", mostrarMiembros);
    filtroRol?.addEventListener("change", mostrarMiembros);
    filtroEstado?.addEventListener("change", mostrarMiembros);
    btnNuevoMiembro?.addEventListener("click", abrirNuevoMiembro);
    btnCerrarModal?.addEventListener("click", cerrarModal);
    btnCancelar?.addEventListener("click", cerrarModal);

    modalMiembro?.addEventListener("click", function (event) {
        if (event.target === modalMiembro) cerrarModal();
    });

    formMiembro?.addEventListener("submit", function (event) {
        event.preventDefault();
        guardarFormularioMiembro();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modalMiembro?.classList.contains("show")) {
            cerrarModal();
        }
    });
}

/* =========================================================
   SESIÓN Y PERMISOS
========================================================= */

function obtenerUsuarioActivo() {
    try {
        return JSON.parse(localStorage.getItem("usuarioActivo")) || null;
    } catch (error) {
        console.error("No fue posible leer la sesión del usuario:", error);
        return null;
    }
}

function obtenerIdUsuarioActivo() {
    if (!usuarioActivo) return null;
    return usuarioActivo.id || usuarioActivo.idUsuario || usuarioActivo.id_usuario || null;
}

function obtenerRolCompatibilidadPermisos() {
    try {
        const usuario = JSON.parse(localStorage.getItem("usuarioActivo") || "null") || {};
        return usuario.rol?.nombre || usuario.rol || usuario.rolNombre || usuario.nombreRol || "";
    } catch (e) {
        return "";
    }
}

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function esAdministrador() {
    if (window.PMOPermisos && window.PMOPermisos.tiene("equipo.ver")) return true;
    const rol = normalizarTexto(obtenerRolCompatibilidadPermisos());
    return ["superadministrador", "administrador", "admin pmo", "admin_pmo", "administrador pmo"].includes(rol);
}

function puedeEditarEquipo() {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene("equipo.editar"));
}

function puedeAsignarRoles() {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene("usuarios.asignar_rol"));
}

function obtenerHeadersSesion() {
    const idUsuario = obtenerIdUsuarioActivo();
    return idUsuario ? { "X-Usuario-Id": String(idUsuario) } : {};
}

function configurarPermisosVisuales() {
    if (btnNuevoMiembro) {
        btnNuevoMiembro.hidden = !puedeEditarEquipo();
    }

    if (!permisoEquipo) return;

    if (!usuarioActivo) {
        permisoEquipo.innerHTML = '<span class="permission-readonly">No hay una sesión activa. Inicia sesión nuevamente.</span>';
        return;
    }

    if (esAdministrador()) {
        let texto = "Modo consulta del equipo.";
        if (puedeEditarEquipo()) texto = "Puedes agregar y editar integrantes del equipo.";
        if (puedeEditarEquipo() && puedeAsignarRoles()) texto += " También puedes administrar sus roles de acceso.";
        permisoEquipo.innerHTML = `<span class="permission-admin">${escaparHTML(texto)}</span>`;
        return;
    }

    permisoEquipo.innerHTML = '<span class="permission-readonly">Acceso restringido: este módulo solo está disponible para administradores.</span>';
}

function mostrarAccesoRestringido() {
    if (!contenedorEquipo) return;
    contenedorEquipo.innerHTML = `
        <div class="empty-state">
            <h3>Acceso restringido</h3>
            <p>El módulo global de equipo solo puede ser consultado por un administrador.</p>
        </div>`;
}

/* =========================================================
   ROLES
========================================================= */

async function cargarRolesAsignables() {
    if (!rolSistemaMiembro || !puedeAsignarRoles()) return;

    try {
        const respuesta = await fetch(API_ROLES_ASIGNABLES, { headers: obtenerHeadersSesion() });
        const datos = await obtenerRespuestaJSON(respuesta);
        if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudieron cargar los roles.");

        rolesAsignables = Array.isArray(datos.roles) ? datos.roles : [];
        rolSistemaMiembro.innerHTML = rolesAsignables
            .map(r => `<option value="${Number(r.id)}">${escaparHTML(r.nombre || "Rol")}</option>`)
            .join("");
    } catch (error) {
        console.error("No fue posible cargar los roles asignables:", error);
        rolSistemaMiembro.innerHTML = '<option value="">No disponible</option>';
    }
}

function actualizarFiltroRoles() {
    if (!filtroRol) return;
    const actual = filtroRol.value || "todos";
    const nombres = new Set();

    rolesAsignables.forEach(r => {
        if (r?.nombre) nombres.add(String(r.nombre).trim());
    });

    miembrosEquipo.forEach(m => {
        const nombre = m.rolSistema || m.rolOperativo || m.rol;
        if (nombre) nombres.add(String(nombre).trim());
    });

    filtroRol.innerHTML = '<option value="todos">Todos los roles</option>' +
        [...nombres]
            .sort((a, b) => a.localeCompare(b, "es"))
            .map(nombre => `<option value="${escaparHTML(nombre)}">${escaparHTML(nombre)}</option>`)
            .join("");

    if ([...filtroRol.options].some(o => o.value === actual)) filtroRol.value = actual;
}

/* =========================================================
   CARGAR Y NORMALIZAR MIEMBROS
========================================================= */

async function cargarMiembrosDesdeAPI() {
    mostrarCargando();

    if (!usuarioActivo) {
        mostrarErrorCarga("No se encontró una sesión activa. Cierra sesión e inicia nuevamente.");
        return;
    }

    try {
        const respuesta = await fetch(API_MIEMBROS, { headers: obtenerHeadersSesion() });
        const datos = await obtenerRespuestaJSON(respuesta);
        if (!respuesta.ok) throw new Error(datos.mensaje || "No fue posible cargar los miembros del equipo.");

        miembrosEquipo = Array.isArray(datos.miembros)
            ? datos.miembros.map(normalizarMiembro)
            : [];

        localStorage.setItem("miembrosEquipo", JSON.stringify(miembrosEquipo));
        actualizarFiltroRoles();
        mostrarMiembros();
    } catch (error) {
        console.error("Error al cargar miembros:", error);
        mostrarErrorCarga(error.message || "No fue posible cargar el equipo desde MySQL.");
    }
}

function normalizarMiembro(miembro) {
    const idUsuario = miembro.idUsuario || miembro.usuarioId || miembro.id_usuario || miembro.usuario?.id || null;
    const tieneCuenta = typeof miembro.tieneCuentaAcceso === "boolean"
        ? miembro.tieneCuentaAcceso
        : !!idUsuario;

    return {
        id: miembro.id || miembro.idMiembro || miembro.id_miembro || null,
        idUsuario,
        tieneCuentaAcceso: tieneCuenta,
        nombreCompleto: miembro.nombreCompleto || miembro.nombre || "Sin nombre",
        correo: miembro.correo || miembro.email || "",
        telefono: miembro.telefono || "",
        rol: miembro.rol || miembro.rolOperativo || "Colaborador",
        rolOperativo: miembro.rolOperativo || miembro.rol || "Colaborador",
        idRolSistema: miembro.idRolSistema || miembro.id_rol_sistema || null,
        rolSistema: miembro.rolSistema || miembro.rol_sistema || null,
        seniority: miembro.seniority || "Junior",
        horasDisponibles: Number(miembro.horasDisponibles ?? miembro.horas ?? 0),
        habilidades: miembro.habilidades || "",
        notas: miembro.notas || "",
        estado: normalizarEstado(miembro.estado),
        fechaCreacion: miembro.fechaCreacion || ""
    };
}

function normalizarEstado(valor) {
    const estado = normalizarTexto(valor);
    if (estado === "inactivo") return "Inactivo";
    if (estado === "baja") return "Baja";
    return "Activo";
}

/* =========================================================
   LISTADO Y ESTADOS VISUALES
========================================================= */

function mostrarCargando() {
    if (!contenedorEquipo) return;
    contenedorEquipo.innerHTML = `
        <div class="empty-state">
            <h3>Cargando miembros...</h3>
            <p>Consultando la información registrada en MySQL.</p>
        </div>`;
}

function mostrarErrorCarga(mensaje) {
    if (!contenedorEquipo) return;
    contenedorEquipo.innerHTML = `
        <div class="empty-state">
            <h3>No fue posible cargar el equipo</h3>
            <p>${escaparHTML(mensaje)}</p>
        </div>`;
}

function claseEstado(estado) {
    const n = normalizarTexto(estado);
    if (n === "baja") return "baja";
    if (n === "inactivo") return "inactive";
    return "active";
}

function mostrarMiembros() {
    if (!contenedorEquipo) return;
    if (!esAdministrador()) {
        mostrarAccesoRestringido();
        return;
    }

    let lista = miembrosEquipo.slice();
    const texto = normalizarTexto(buscarMiembro?.value || "");
    const rol = filtroRol?.value || "todos";
    const estado = filtroEstado?.value || "todos";

    if (texto) {
        lista = lista.filter(m => [
            m.nombreCompleto,
            m.correo,
            m.telefono,
            m.rolSistema,
            m.rolOperativo,
            m.seniority,
            m.estado
        ].some(valor => normalizarTexto(valor).includes(texto)));
    }

    if (rol !== "todos") {
        lista = lista.filter(m => normalizarTexto(m.rolSistema || m.rolOperativo || m.rol) === normalizarTexto(rol));
    }

    if (estado !== "todos") {
        lista = lista.filter(m => normalizarTexto(m.estado) === normalizarTexto(estado));
    }

    if (!lista.length) {
        contenedorEquipo.innerHTML = `
            <div class="empty-state">
                <h3>No hay integrantes que coincidan</h3>
                <p>Modifica los filtros o agrega un nuevo integrante.</p>
            </div>`;
        return;
    }

    contenedorEquipo.innerHTML = "";

    lista.forEach(miembro => {
        const estadoClase = claseEstado(miembro.estado);
        const card = document.createElement("article");
        card.className = `team-card team-card-status-${estadoClase}`;

        const acceso = miembro.tieneCuentaAcceso
            ? `<span class="access-badge linked">Cuenta vinculada</span>`
            : `<span class="access-badge standalone">Sin cuenta de acceso</span>`;

        card.innerHTML = `
            <div class="team-card-header">
                <div class="team-avatar avatar-${estadoClase}">${escaparHTML(obtenerIniciales(miembro.nombreCompleto))}</div>
                <div class="team-card-title">
                    <div class="team-title-row">
                        <h3>${escaparHTML(miembro.nombreCompleto)}</h3>
                        <span class="member-status ${estadoClase}"><span class="status-dot"></span>${escaparHTML(miembro.estado)}</span>
                    </div>
                    <p>${escaparHTML(miembro.correo || "Sin correo registrado")}</p>
                    ${acceso}
                </div>
            </div>

            <div class="team-info">
                <p><strong>Rol de acceso:</strong> ${miembro.tieneCuentaAcceso ? escaparHTML(miembro.rolSistema || "Sin rol") : "No aplica"}</p>
                <p><strong>Rol operativo:</strong> ${escaparHTML(miembro.rolOperativo || "Sin rol")}</p>
                <p><strong>Seniority:</strong> ${escaparHTML(miembro.seniority)}</p>
                <p><strong>Horas disponibles:</strong> ${Number(miembro.horasDisponibles || 0)}h/sem</p>
                ${miembro.telefono ? `<p><strong>Teléfono:</strong> ${escaparHTML(miembro.telefono)}</p>` : ""}
            </div>

            ${miembro.habilidades ? `<div class="team-skills"><strong>Habilidades:</strong><p>${escaparHTML(miembro.habilidades)}</p></div>` : ""}
            ${miembro.notas ? `<div class="team-skills"><strong>Notas:</strong><p>${escaparHTML(miembro.notas)}</p></div>` : ""}

            <div class="team-actions">
                <button type="button" class="btn-history-member" onclick="verHistorialHorasMiembro(${Number(miembro.id)})">🕘 Ver historial de horas</button>
                ${(puedeEditarEquipo() || (puedeAsignarRoles() && miembro.tieneCuentaAcceso))
                    ? `<button type="button" onclick="editarMiembro(${Number(miembro.id)})">Editar</button>`
                    : ""}
            </div>`;

        contenedorEquipo.appendChild(card);
    });
}

/* =========================================================
   ALTA DE INTEGRANTE SIN REGISTRO
========================================================= */

function abrirNuevoMiembro() {
    if (!puedeEditarEquipo()) {
        alert("No tienes permiso para agregar integrantes.");
        return;
    }

    modoFormularioMiembro = "crear";
    formMiembro?.reset();
    if (idMiembro) idMiembro.value = "";
    if (tituloModal) tituloModal.textContent = "Agregar integrante";

    establecerIdentidadEditable(true);
    if (grupoRolSistema) grupoRolSistema.hidden = true;

    if (avisoCuentaMiembro) {
        avisoCuentaMiembro.hidden = false;
        avisoCuentaMiembro.className = "member-account-note full info";
        avisoCuentaMiembro.innerHTML = `
            <strong>Perfil local:</strong>
            puedes agregarlo sin registro público. El sistema también creará su usuario interno para que pueda seleccionarse en formularios, proyectos y otros módulos.`;
    }

    if (rolMiembro) rolMiembro.value = "Colaborador";
    if (seniorityMiembro) seniorityMiembro.value = "Junior";
    if (horasMiembro) horasMiembro.value = "0";
    if (estadoMiembro) estadoMiembro.value = "Activo";

    habilitarCamposAdministrativos(true);
    if (btnGuardarMiembro) btnGuardarMiembro.textContent = "Agregar integrante";
    modalMiembro?.classList.add("show");
    setTimeout(() => nombreMiembro?.focus(), 0);
}

/* =========================================================
   EDITAR INTEGRANTE
========================================================= */

function editarMiembro(id) {
    const miembro = miembrosEquipo.find(item => String(item.id) === String(id));
    if (!miembro) {
        alert("No se encontró el integrante seleccionado.");
        return;
    }

    if (!puedeEditarEquipo() && !(puedeAsignarRoles() && miembro.tieneCuentaAcceso)) {
        alert("No tienes permiso para editar este integrante.");
        return;
    }

    modoFormularioMiembro = "editar";
    if (tituloModal) tituloModal.textContent = "Editar integrante";
    if (idMiembro) idMiembro.value = miembro.id;
    if (nombreMiembro) nombreMiembro.value = miembro.nombreCompleto || "";
    if (correoMiembro) correoMiembro.value = miembro.correo || "";
    if (telefonoMiembro) telefonoMiembro.value = miembro.telefono || "";
    if (rolMiembro) rolMiembro.value = miembro.rolOperativo || "Colaborador";
    if (seniorityMiembro) seniorityMiembro.value = miembro.seniority || "Junior";
    if (horasMiembro) horasMiembro.value = Number(miembro.horasDisponibles || 0);
    if (estadoMiembro) estadoMiembro.value = normalizarEstado(miembro.estado);
    if (habilidadesMiembro) habilidadesMiembro.value = miembro.habilidades || "";
    if (notasMiembro) notasMiembro.value = miembro.notas || "";

    const identidadEditable = puedeEditarEquipo() && !miembro.tieneCuentaAcceso;
    establecerIdentidadEditable(identidadEditable);
    habilitarCamposAdministrativos(puedeEditarEquipo());

    if (avisoCuentaMiembro) {
        avisoCuentaMiembro.hidden = false;
        if (miembro.tieneCuentaAcceso) {
            avisoCuentaMiembro.className = "member-account-note full linked";
            avisoCuentaMiembro.innerHTML = '<strong>Cuenta vinculada:</strong> nombre, correo y teléfono se administran desde el perfil del usuario.';
        } else {
            avisoCuentaMiembro.className = "member-account-note full standalone";
            avisoCuentaMiembro.innerHTML = '<strong>Perfil interno:</strong> este integrante fue creado por administración y cuenta con un usuario interno reutilizable en los demás módulos.';
        }
    }

    if (grupoRolSistema) grupoRolSistema.hidden = !miembro.tieneCuentaAcceso;
    if (rolSistemaMiembro) {
        rolSistemaMiembro.disabled = !puedeAsignarRoles();
        const idRol = miembro.idRolSistema != null ? String(miembro.idRolSistema) : "";
        if (idRol && ![...rolSistemaMiembro.options].some(o => o.value === idRol)) {
            const opcion = document.createElement("option");
            opcion.value = idRol;
            opcion.textContent = miembro.rolSistema || "Rol actual";
            rolSistemaMiembro.appendChild(opcion);
        }
        rolSistemaMiembro.value = idRol;
    }

    if (notaRolSistema && miembro.tieneCuentaAcceso) {
        notaRolSistema.textContent = puedeAsignarRoles()
            ? "Este rol controla qué módulos y acciones puede utilizar el usuario."
            : "No tienes permiso para cambiar el rol de acceso.";
    }

    if (btnGuardarMiembro) btnGuardarMiembro.textContent = "Guardar cambios";
    modalMiembro?.classList.add("show");
}

function establecerIdentidadEditable(editable) {
    [nombreMiembro, correoMiembro, telefonoMiembro].forEach(campo => {
        if (!campo) return;
        campo.readOnly = !editable;
        campo.classList.toggle("readonly-field", !editable);
    });
}

function habilitarCamposAdministrativos(habilitados) {
    [rolMiembro, seniorityMiembro, horasMiembro, estadoMiembro, habilidadesMiembro, notasMiembro].forEach(campo => {
        if (campo) campo.disabled = !habilitados;
    });
}

async function guardarFormularioMiembro() {
    if (modoFormularioMiembro === "crear") {
        await crearMiembro();
    } else {
        await guardarCambiosMiembro();
    }
}

async function crearMiembro() {
    if (!puedeEditarEquipo()) {
        alert("No tienes permiso para agregar integrantes.");
        return;
    }

    const datos = {
        nombreCompleto: nombreMiembro?.value.trim() || "",
        correo: correoMiembro?.value.trim() || null,
        telefono: telefonoMiembro?.value.trim() || null,
        rol: rolMiembro?.value || "Colaborador",
        seniority: seniorityMiembro?.value || "Junior",
        horasDisponibles: Number(horasMiembro?.value || 0),
        estado: estadoMiembro?.value || "Activo",
        habilidades: habilidadesMiembro?.value.trim() || "",
        notas: notasMiembro?.value.trim() || ""
    };

    if (!datos.nombreCompleto) {
        alert("Escribe el nombre completo del integrante.");
        nombreMiembro?.focus();
        return;
    }

    if (datos.horasDisponibles < 0) {
        alert("Las horas disponibles no pueden ser negativas.");
        return;
    }

    bloquearGuardar(true);
    try {
        const respuesta = await fetch(API_MIEMBROS, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...obtenerHeadersSesion() },
            body: JSON.stringify(datos)
        });
        const resultado = await obtenerRespuestaJSON(respuesta);
        if (!respuesta.ok) throw new Error(resultado.mensaje || "No fue posible agregar el integrante.");

        cerrarModal();
        await cargarMiembrosDesdeAPI();
        alert(resultado.mensaje || "Integrante agregado correctamente.");
    } catch (error) {
        console.error("Error al crear integrante:", error);
        alert(error.message || "Ocurrió un error al agregar el integrante.");
    } finally {
        bloquearGuardar(false);
    }
}

async function guardarCambiosMiembro() {
    const id = idMiembro?.value || "";
    const miembro = miembrosEquipo.find(item => String(item.id) === String(id));
    if (!miembro) {
        alert("No se encontró el integrante seleccionado.");
        return;
    }

    bloquearGuardar(true);
    try {
        let mensaje = "Cambios guardados correctamente.";

        if (puedeEditarEquipo()) {
            const datosActualizacion = {
                rol: rolMiembro?.value || miembro.rolOperativo || "Colaborador",
                seniority: seniorityMiembro?.value || "Junior",
                horasDisponibles: Number(horasMiembro?.value || 0),
                habilidades: habilidadesMiembro?.value.trim() || "",
                notas: notasMiembro?.value.trim() || "",
                estado: estadoMiembro?.value || "Activo"
            };

            if (!miembro.tieneCuentaAcceso) {
                datosActualizacion.nombreCompleto = nombreMiembro?.value.trim() || "";
                datosActualizacion.correo = correoMiembro?.value.trim() || null;
                datosActualizacion.telefono = telefonoMiembro?.value.trim() || null;
            }

            if (datosActualizacion.horasDisponibles < 0) throw new Error("Las horas disponibles no pueden ser negativas.");

            const respuesta = await fetch(`${API_MIEMBROS}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...obtenerHeadersSesion() },
                body: JSON.stringify(datosActualizacion)
            });
            const datos = await obtenerRespuestaJSON(respuesta);
            if (!respuesta.ok) throw new Error(datos.mensaje || "No fue posible actualizar el integrante.");
            mensaje = datos.mensaje || mensaje;
        }

        if (puedeAsignarRoles() && miembro.tieneCuentaAcceso && rolSistemaMiembro?.value && miembro.idUsuario) {
            const nuevoRol = Number(rolSistemaMiembro.value);
            if (String(nuevoRol) !== String(miembro.idRolSistema || "")) {
                const respuestaRol = await fetch(`${API_ASIGNAR_ROL}/${miembro.idUsuario}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", ...obtenerHeadersSesion() },
                    body: JSON.stringify({ idRol: nuevoRol })
                });
                const datosRol = await obtenerRespuestaJSON(respuestaRol);
                if (!respuestaRol.ok) throw new Error(datosRol.mensaje || "No fue posible asignar el rol del sistema.");
                mensaje = datosRol.mensaje || mensaje;
            }
        }

        cerrarModal();
        await cargarMiembrosDesdeAPI();
        alert(mensaje);
    } catch (error) {
        console.error("Error al actualizar integrante:", error);
        alert(error.message || "Ocurrió un error al actualizar el integrante.");
    } finally {
        bloquearGuardar(false);
    }
}

function bloquearGuardar(bloqueado) {
    if (!btnGuardarMiembro) return;
    btnGuardarMiembro.disabled = bloqueado;
    btnGuardarMiembro.textContent = bloqueado
        ? "Guardando..."
        : (modoFormularioMiembro === "crear" ? "Agregar integrante" : "Guardar cambios");
}

function cerrarModal() {
    modalMiembro?.classList.remove("show");
    formMiembro?.reset();
    if (idMiembro) idMiembro.value = "";
    if (avisoCuentaMiembro) avisoCuentaMiembro.hidden = true;
    if (grupoRolSistema) grupoRolSistema.hidden = false;
    modoFormularioMiembro = "editar";
    establecerIdentidadEditable(false);
}

/* =========================================================
   HISTORIAL
========================================================= */

function verHistorialHorasMiembro(id) {
    if (!esAdministrador()) {
        alert("Solo un administrador puede consultar el historial de otros integrantes.");
        return;
    }
    if (!id) {
        alert("No se encontró el identificador del integrante.");
        return;
    }
    window.location.href = `detalle-miembro-horas.html?id=${encodeURIComponent(id)}`;
}

/* =========================================================
   UTILIDADES
========================================================= */

async function obtenerRespuestaJSON(respuesta) {
    try {
        return await respuesta.json();
    } catch (error) {
        return {};
    }
}

function obtenerIniciales(nombre) {
    const partes = String(nombre || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (!partes.length) return "??";
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
