const API_PROYECTOS = window.apiUrl("/api/proyectos");
const API_ORGANIZACIONES = window.apiUrl("/api/organizaciones");
const API_MIEMBROS = window.apiUrl("/api/miembros");
const API_MIEMBRO_SESION = window.apiUrl("/api/miembros/mi-sesion");
const API_GESTION_PROYECTOS = window.apiUrl("/api/proyectos/gestion");
let carpetasProyecto = [];
let carpetaActual = null;

let proyectos = [];
let organizaciones = [];
let miembrosEquipo = [];
let usuarioActivo = obtenerUsuarioActivo();

const contenedorProyectos = document.getElementById("contenedorProyectos");
const buscarProyecto = document.getElementById("buscarProyecto");
const filtroEstado = document.getElementById("filtroEstado");
const permisoProyectos = document.getElementById("permisoProyectos");

const btnNuevoProyecto = document.getElementById("btnNuevoProyecto");
const modalProyecto = document.getElementById("modalProyecto");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelar = document.getElementById("btnCancelar");
const formProyecto = document.getElementById("formProyecto");
const tituloModal = document.getElementById("tituloModal");
const btnGuardarProyecto = document.getElementById("btnGuardarProyecto");

const idProyecto = document.getElementById("idProyecto");
const nombreProyecto = document.getElementById("nombreProyecto");
const codigoProyecto = document.getElementById("codigoProyecto");
const organizacionProyecto = document.getElementById("organizacionProyecto");
const responsableProyecto = document.getElementById("responsableProyecto");
const clienteProyecto = document.getElementById("clienteProyecto");
const estadoProyecto = document.getElementById("estadoProyecto");
const prioridadProyecto = document.getElementById("prioridadProyecto");
const fechaInicioProyecto = document.getElementById("fechaInicioProyecto");
const fechaFinProyecto = document.getElementById("fechaFinProyecto");
const descripcionProyecto = document.getElementById("descripcionProyecto");
const carpetaProyecto = document.getElementById("carpetaProyecto");
const contenedorCarpetas = document.getElementById("contenedorCarpetas");
const contadorCarpetas = document.getElementById("contadorCarpetas");
const btnNuevaCarpeta = document.getElementById("btnNuevaCarpeta");
const btnImportarProyecto = document.getElementById("btnImportarProyecto");
const archivoImportarProyecto = document.getElementById("archivoImportarProyecto");

document.addEventListener("DOMContentLoaded", async function () {
    usuarioActivo = obtenerUsuarioActivo();

    configurarEventos();
    configurarPermisosVisuales();

    /*
     * Organizaciones:
     * - Solo Administrador puede consultar /api/organizaciones.
     *
     * Miembros:
     * - Administrador consulta /api/miembros.
     * - Responsable/colaborador consulta /api/miembros/mi-sesion.
     */
    if (esAdministrador()) {
        await Promise.all([
            cargarOrganizaciones(),
            cargarMiembros()
        ]);
    } else {
        organizaciones = [];
        cargarOpcionesOrganizaciones();

        await cargarMiembros();
    }

    await cargarCarpetas();
    await cargarProyectos();

    configurarPermisosVisuales();
});

/* =========================================================
   SESIÓN Y PERMISOS
========================================================= */

function obtenerUsuarioActivo() {
    try {
        return JSON.parse(localStorage.getItem("usuarioActivo")) || null;
    } catch (error) {
        console.error("No fue posible leer la sesión activa:", error);
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
    if (window.PMOPermisos && window.PMOPermisos.tiene("proyectos.ver_todos")) return true;

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


function tienePermisoProyecto(clave) {
    return !!(window.PMOPermisos && window.PMOPermisos.tiene(clave));
}

function obtenerIdMiembroActivoDesdeSesion() {
    if (!usuarioActivo) {
        return null;
    }

    return usuarioActivo.idMiembro ||
        usuarioActivo.miembroId ||
        usuarioActivo.id_miembro ||
        usuarioActivo.idMiembroEquipo ||
        null;
}

function obtenerIdMiembroActivo() {
    const idDesdeSesion = obtenerIdMiembroActivoDesdeSesion();

    if (idDesdeSesion) {
        return idDesdeSesion;
    }

    const idUsuario = obtenerIdUsuarioActivo();

    if (!idUsuario || !Array.isArray(miembrosEquipo)) {
        return null;
    }

    const miembroEncontrado = miembrosEquipo.find(function (miembro) {
        return String(
            miembro.idUsuario ||
            miembro.usuarioId ||
            miembro.id_usuario ||
            ""
        ) === String(idUsuario);
    });

    if (!miembroEncontrado) {
        return null;
    }

    return miembroEncontrado.id ||
        miembroEncontrado.idMiembro ||
        miembroEncontrado.id_miembro ||
        null;
}

function puedeCrearProyecto() {
    return esAdministrador() && tienePermisoProyecto("proyectos.crear");
}

function puedeEditarProyecto(proyecto) {
    if (esAdministrador()) {
        return tienePermisoProyecto("proyectos.editar");
    }

    if (!proyecto) {
        return false;
    }

    const idMiembroActivo = obtenerIdMiembroActivo();

    if (!idMiembroActivo) {
        return false;
    }

    return String(proyecto.idResponsable) ===
        String(idMiembroActivo);
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

function configurarPermisosVisuales() {
    if (btnNuevoProyecto) {
        btnNuevoProyecto.style.display = puedeCrearProyecto()
            ? "inline-block"
            : "none";
    }

    if (!permisoProyectos) {
        return;
    }

    if (!usuarioActivo) {
        permisoProyectos.innerHTML = `
            <span class="permission-readonly">
                No hay una sesión activa. Inicia sesión para consultar proyectos.
            </span>
        `;
        return;
    }

    if (esAdministrador()) {
        const capacidades = [];
        if (puedeCrearProyecto()) capacidades.push("crear");
        if (tienePermisoProyecto("proyectos.editar")) capacidades.push("editar");

        const detalle = capacidades.length
            ? `Además puedes ${capacidades.join(" y ")} proyectos.`
            : "Modo solo lectura: no puedes crear ni editar proyectos.";

        permisoProyectos.innerHTML = `
            <span class="permission-admin">
                Acceso global: puedes consultar todos los proyectos. ${detalle}
            </span>
        `;
        return;
    }

    permisoProyectos.innerHTML = `
        <span class="permission-readonly">
            Solo se muestran los proyectos donde estás asignado como integrante.
            Si eres responsable de un proyecto, podrás editarlo.
        </span>
    `;
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    if (btnNuevoProyecto) {
        btnNuevoProyecto.addEventListener(
            "click",
            abrirModalNuevoProyecto
        );
    }

    if (btnCerrarModal) {
        btnCerrarModal.addEventListener(
            "click",
            cerrarModalProyecto
        );
    }

    if (btnCancelar) {
        btnCancelar.addEventListener(
            "click",
            cerrarModalProyecto
        );
    }

    if (modalProyecto) {
        modalProyecto.addEventListener("click", function (event) {
            if (event.target === modalProyecto) {
                cerrarModalProyecto();
            }
        });
    }

    if (formProyecto) {
        formProyecto.addEventListener("submit", function (event) {
            event.preventDefault();
            guardarProyecto();
        });
    }
    btnNuevaCarpeta?.addEventListener("click", crearCarpetaUI);
    btnImportarProyecto?.addEventListener("click", () => archivoImportarProyecto?.click());
    archivoImportarProyecto?.addEventListener("change", importarProyectoUI);

    if (buscarProyecto) {
        buscarProyecto.addEventListener(
            "input",
            renderizarProyectos
        );
    }

    if (filtroEstado) {
        filtroEstado.addEventListener(
            "change",
            renderizarProyectos
        );
    }
}

async function cargarCarpetas() {
    if (!esAdministrador()) { carpetasProyecto=[]; renderizarCarpetas(); return; }
    try {
        const r=await fetch(`${API_GESTION_PROYECTOS}/carpetas`,{headers:obtenerHeadersSesion()});
        const d=await obtenerRespuestaJSON(r); if(!r.ok) throw new Error(d.mensaje||"No se pudieron cargar las carpetas.");
        carpetasProyecto=Array.isArray(d.carpetas)?d.carpetas:[];
        renderizarCarpetas(); cargarOpcionesCarpetas();
    } catch(e){console.error(e); carpetasProyecto=[]; renderizarCarpetas(); cargarOpcionesCarpetas();}
}
function cargarOpcionesCarpetas(){if(!carpetaProyecto)return;const actual=carpetaProyecto.value||"";carpetaProyecto.innerHTML='<option value="">Sin carpeta</option>'+carpetasProyecto.map(c=>`<option value="${c.id}">${escaparHTML(c.nombre)}</option>`).join('');if([...carpetaProyecto.options].some(o=>o.value===actual))carpetaProyecto.value=actual;}
function renderizarCarpetas(){if(!contenedorCarpetas)return;contadorCarpetas.textContent=`${carpetasProyecto.length} carpeta${carpetasProyecto.length===1?'':'s'}`;contenedorCarpetas.innerHTML=`<div class="folder-card ${carpetaActual===null?'active':''}" data-folder="all"><h3>📁 Todos los proyectos</h3><p>Mostrar el portafolio completo.</p><small>${proyectos.length} proyectos</small></div>`+carpetasProyecto.map(c=>`<div class="folder-card ${String(carpetaActual)===String(c.id)?'active':''}" data-folder="${c.id}"><h3>📁 ${escaparHTML(c.nombre)}</h3><p>${escaparHTML(c.descripcion||'Sin descripción')}</p><small>${Array.isArray(c.proyectos)?c.proyectos.length:0} proyectos</small><div class="folder-actions"><button type="button" data-edit-folder="${c.id}">Editar</button><button type="button" data-delete-folder="${c.id}">Eliminar</button></div></div>`).join('');contenedorCarpetas.querySelectorAll('[data-folder]').forEach(x=>x.addEventListener('click',e=>{if(e.target.closest('button'))return;carpetaActual=x.dataset.folder==='all'?null:Number(x.dataset.folder);renderizarCarpetas();renderizarProyectos()}));contenedorCarpetas.querySelectorAll('[data-edit-folder]').forEach(b=>b.addEventListener('click',()=>editarCarpetaUI(Number(b.dataset.editFolder))));contenedorCarpetas.querySelectorAll('[data-delete-folder]').forEach(b=>b.addEventListener('click',()=>eliminarCarpetaUI(Number(b.dataset.deleteFolder))));}
async function crearCarpetaUI(){if(!esAdministrador())return alert('Solo un administrador puede crear carpetas.');const nombre=prompt('Nombre de la nueva carpeta:');if(!nombre?.trim())return;const descripcion=prompt('Descripción (opcional):')||'';try{const r=await fetch(`${API_GESTION_PROYECTOS}/carpetas`,{method:'POST',headers:{'Content-Type':'application/json',...obtenerHeadersSesion()},body:JSON.stringify({nombre:nombre.trim(),descripcion})});const d=await obtenerRespuestaJSON(r);if(!r.ok)throw Error(d.mensaje||'No se pudo crear la carpeta.');await cargarCarpetas();alert(d.mensaje||'Carpeta creada.');}catch(e){alert(e.message)}}
async function editarCarpetaUI(id){const c=carpetasProyecto.find(x=>String(x.id)===String(id));if(!c)return;const nombre=prompt('Nombre de la carpeta:',c.nombre);if(!nombre?.trim())return;const descripcion=prompt('Descripción:',c.descripcion||'')||'';try{const r=await fetch(`${API_GESTION_PROYECTOS}/carpetas/${id}`,{method:'PUT',headers:{'Content-Type':'application/json',...obtenerHeadersSesion()},body:JSON.stringify({nombre:nombre.trim(),descripcion})});const d=await obtenerRespuestaJSON(r);if(!r.ok)throw Error(d.mensaje||'No se pudo editar.');await cargarCarpetas();}catch(e){alert(e.message)}}
async function eliminarCarpetaUI(id){if(!confirm('¿Eliminar la carpeta? Debe estar vacía.'))return;try{const r=await fetch(`${API_GESTION_PROYECTOS}/carpetas/${id}`,{method:'DELETE',headers:obtenerHeadersSesion()});const d=await obtenerRespuestaJSON(r);if(!r.ok)throw Error(d.mensaje||'No se pudo eliminar.');if(String(carpetaActual)===String(id))carpetaActual=null;await cargarCarpetas();renderizarProyectos();}catch(e){alert(e.message)}}
async function moverProyectoUI(id,idCarpeta){try{const r=await fetch(`${API_GESTION_PROYECTOS}/proyecto/${id}/carpeta`,{method:'PUT',headers:{'Content-Type':'application/json',...obtenerHeadersSesion()},body:JSON.stringify({idCarpeta:idCarpeta?Number(idCarpeta):null})});const d=await obtenerRespuestaJSON(r);if(!r.ok)throw Error(d.mensaje||'No se pudo mover el proyecto.');await cargarCarpetas();await cargarProyectos();}catch(e){alert(e.message)}}
async function nuevoAlcanceUI(id){const p=proyectos.find(x=>String(x.id)===String(id));if(!p)return;const nombre=prompt('Nombre del nuevo alcance:',`${p.nombre} - Nuevo alcance`);if(!nombre?.trim())return;const codigo=prompt('Código del nuevo alcance (opcional):','');let carpeta='';try{carpeta=prompt('ID de carpeta destino (opcional):','')||'';}catch(e){}try{const r=await fetch(`${API_GESTION_PROYECTOS}/proyecto/${id}/alcance`,{method:'POST',headers:{'Content-Type':'application/json',...obtenerHeadersSesion()},body:JSON.stringify({nombre:nombre.trim(),codigo:codigo.trim()||null,idCarpeta:carpeta?Number(carpeta):null})});const d=await obtenerRespuestaJSON(r);if(!r.ok)throw Error(d.mensaje||'No se pudo crear el alcance.');await cargarCarpetas();await cargarProyectos();alert(d.mensaje||'Nuevo alcance creado.');}catch(e){alert(e.message)}}
async function exportarProyectoUI(id){try{const r=await fetch(`${API_GESTION_PROYECTOS}/proyecto/${id}/exportar`,{headers:obtenerHeadersSesion()});const d=await r.json();if(!r.ok)throw Error(d.mensaje||'No se pudo exportar.');const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`proyecto-${id}-${(d.nombre||'exportado').replace(/[^a-z0-9_-]+/gi,'_')}.json`;a.click();URL.revokeObjectURL(a.href);}catch(e){alert(e.message)}}
async function importarProyectoUI(){const file=archivoImportarProyecto?.files?.[0];if(!file)return;try{const d=JSON.parse(await file.text());const idCarpeta=prompt('ID de carpeta destino (opcional):','')||'';if(idCarpeta)d.idCarpeta=Number(idCarpeta);const r=await fetch(`${API_GESTION_PROYECTOS}/importar`,{method:'POST',headers:{'Content-Type':'application/json',...obtenerHeadersSesion()},body:JSON.stringify(d)});const x=await obtenerRespuestaJSON(r);if(!r.ok)throw Error(x.mensaje||'No se pudo importar.');await cargarCarpetas();await cargarProyectos();alert(x.mensaje||'Proyecto importado.');}catch(e){alert(e.message)}finally{if(archivoImportarProyecto)archivoImportarProyecto.value='';}}

/* =========================================================
   CARGA DE DATOS
========================================================= */

async function cargarProyectos() {
    mostrarCargando();

    const idUsuario = obtenerIdUsuarioActivo();

    if (!idUsuario) {
        proyectos = [];

        mostrarErrorCarga(
            "No se encontró una sesión activa. Cierra sesión e inicia nuevamente."
        );

        return;
    }

    try {
        const respuesta = await fetch(
            API_PROYECTOS,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible cargar los proyectos."
            );
        }

        proyectos = Array.isArray(datos.proyectos)
            ? datos.proyectos.map(normalizarProyecto)
            : [];

        localStorage.setItem(
            "proyectos",
            JSON.stringify(proyectos)
        );

        renderizarProyectos();

    } catch (error) {
        console.error("Error al cargar proyectos:", error);

        proyectos = [];

        mostrarErrorCarga(
            error.message ||
            "No fue posible cargar los proyectos desde MySQL."
        );
    }
}

async function cargarOrganizaciones() {
    /*
     * El backend ya protege /api/organizaciones solo para Administrador.
     * Por eso, los demás roles no deben intentar cargar este catálogo global.
     */
    if (!esAdministrador()) {
        organizaciones = [];
        cargarOpcionesOrganizaciones();
        return;
    }

    try {
        const respuesta = await fetch(
            API_ORGANIZACIONES,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No se pudieron cargar las organizaciones."
            );
        }

        organizaciones = Array.isArray(datos.organizaciones)
            ? datos.organizaciones
            : [];

        cargarOpcionesOrganizaciones();

    } catch (error) {
        console.error("Error al cargar organizaciones:", error);

        organizaciones = [];
        cargarOpcionesOrganizaciones();
    }
}

async function cargarMiembros() {
    try {
        const respuesta = await fetch(
            esAdministrador()
                ? API_MIEMBROS
                : API_MIEMBRO_SESION,
            {
                headers: obtenerHeadersSesion()
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No se pudieron cargar los miembros."
            );
        }

        if (esAdministrador()) {
            miembrosEquipo = Array.isArray(datos.miembros)
                ? datos.miembros
                : [];
        } else {
            miembrosEquipo = datos.miembro
                ? [datos.miembro]
                : [];
        }

        cargarOpcionesResponsables();

    } catch (error) {
        console.error("Error al cargar miembros:", error);

        miembrosEquipo = [];
        cargarOpcionesResponsables();
    }
}

function normalizarProyecto(proyecto) {
    return {
        id: proyecto.id,
        idOrganizacion: proyecto.idOrganizacion || null,
        idResponsable: proyecto.idResponsable || null,
        idCarpeta: proyecto.idCarpeta || null,

        nombre: proyecto.nombre || "",
        codigo: proyecto.codigo || "",
        descripcion: proyecto.descripcion || "",
        clienteArea: proyecto.clienteArea || "",

        tipoProyecto: proyecto.tipoProyecto || "Normal",
        estado: proyecto.estado || "Propuesto",
        prioridad: proyecto.prioridad || "Media",

        fechaInicio: proyecto.fechaInicio || "",
        fechaFin: proyecto.fechaFin || "",

        porcentajeAvance: Number(
            proyecto.porcentajeAvance || 0
        ),

        organizacionNombre: proyecto.organizacionNombre || "",
        responsableNombre: proyecto.responsableNombre || "",

        fechaCreacion: proyecto.fechaCreacion || "",
        fechaActualizacion: proyecto.fechaActualizacion || ""
    };
}

/* =========================================================
   OPCIONES DEL FORMULARIO
========================================================= */

function cargarOpcionesOrganizaciones() {
    if (!organizacionProyecto) {
        return;
    }

    organizacionProyecto.innerHTML = `
        <option value="">Sin organización asignada</option>
    `;

    organizaciones.forEach(function (organizacion) {
        const opcion = document.createElement("option");

        opcion.value = organizacion.id;
        opcion.textContent = organizacion.nombre || "Sin nombre";

        organizacionProyecto.appendChild(opcion);
    });
}

function cargarOpcionesResponsables() {
    if (!responsableProyecto) {
        return;
    }

    responsableProyecto.innerHTML = `
        <option value="">Sin responsable asignado</option>
    `;

    miembrosEquipo
        .filter(function (miembro) {
            return normalizarTexto(miembro.estado) === "activo";
        })
        .forEach(function (miembro) {
            const opcion = document.createElement("option");

            opcion.value = miembro.id ||
                miembro.idMiembro ||
                miembro.id_miembro;

            opcion.textContent =
                miembro.nombreCompleto ||
                "Miembro sin nombre";

            responsableProyecto.appendChild(opcion);
        });
}

/* =========================================================
   RENDERIZADO
========================================================= */

function mostrarCargando() {
    if (!contenedorProyectos) {
        return;
    }

    contenedorProyectos.innerHTML = `
        <div class="empty-state">
            <h3>Cargando proyectos...</h3>
            <p>Consultando la información permitida para tu sesión.</p>
        </div>
    `;
}

function mostrarErrorCarga(mensaje) {
    if (!contenedorProyectos) {
        return;
    }

    contenedorProyectos.innerHTML = `
        <div class="empty-state">
            <h3>No fue posible cargar los proyectos</h3>
            <p>${escaparHTML(mensaje)}</p>
        </div>
    `;
}

function renderizarProyectos() {
    if (!contenedorProyectos) {
        return;
    }

    let lista = proyectos.slice();

    const busqueda = buscarProyecto
        ? buscarProyecto.value.trim().toLowerCase()
        : "";

    const estadoFiltro = filtroEstado
        ? filtroEstado.value
        : "todos";

    if (busqueda !== "") {
        lista = lista.filter(function (proyecto) {
            return (
                String(proyecto.nombre || "")
                    .toLowerCase()
                    .includes(busqueda) ||

                String(proyecto.codigo || "")
                    .toLowerCase()
                    .includes(busqueda) ||

                String(proyecto.organizacionNombre || "")
                    .toLowerCase()
                    .includes(busqueda) ||

                String(proyecto.clienteArea || "")
                    .toLowerCase()
                    .includes(busqueda) ||

                String(proyecto.responsableNombre || "")
                    .toLowerCase()
                    .includes(busqueda) ||

                String(proyecto.alumnosAsignadosTexto || "")
                    .toLowerCase()
                    .includes(busqueda)
            );
        });
    }

    if (estadoFiltro !== "todos") {
        lista = lista.filter(function (proyecto) {
            return proyecto.estado === estadoFiltro;
        });
    }
    if (carpetaActual !== null) {
        lista = lista.filter(function (proyecto) { return String(proyecto.idCarpeta || "") === String(carpetaActual); });
    }

    lista.sort(function (a, b) {
        const oficialA = a.catalogoOficial ? 0 : 1;
        const oficialB = b.catalogoOficial ? 0 : 1;

        if (oficialA !== oficialB) {
            return oficialA - oficialB;
        }

        if (a.catalogoOficial && b.catalogoOficial) {
            return String(a.equipoSepDic2026 || "")
                .localeCompare(String(b.equipoSepDic2026 || ""), "es", { numeric: true });
        }

        return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    });

    contenedorProyectos.innerHTML = "";

    if (lista.length === 0) {
        const mensaje = esAdministrador()
            ? "Cuando se creen proyectos, aparecerán en este apartado."
            : "Aún no tienes proyectos asignados. Un administrador debe agregarte desde el detalle de un proyecto.";

        contenedorProyectos.innerHTML = `
            <div class="empty-state">
                <h3>No hay proyectos disponibles</h3>
                <p>${escaparHTML(mensaje)}</p>
            </div>
        `;

        return;
    }

    lista.forEach(function (proyecto) {
        const card = document.createElement("article");

        card.className = "project-card";

        const botonEditar = puedeEditarProyecto(proyecto)
            ? `
                <button
                    type="button"
                    onclick="editarProyecto(${proyecto.id})">
                    Editar
                </button>
              `
            : "";

        card.innerHTML = `
            <div class="project-card-header">
                <div>
                    <span class="project-type ${proyecto.catalogoOficial ? "project-type-official" : ""}">
                        ${escaparHTML(
                            proyecto.catalogoOficial
                                ? `Proyecto oficial Sep-Dic 2026 · Equipo ${proyecto.equipoSepDic2026 || "—"}`
                                : (proyecto.tipoProyecto === "Avanzado"
                                    ? "Proyecto avanzado"
                                    : "Proyecto general")
                        )}
                    </span>

                    <h3>${escaparHTML(proyecto.nombre)}</h3>

                    <p>
                        ${escaparHTML(
                            proyecto.organizacionNombre ||
                            proyecto.clienteArea ||
                            "Sin organización o área asignada"
                        )}
                    </p>
                </div>

                <span class="badge ${obtenerColorEstado(proyecto.estado)}">
                    ${escaparHTML(proyecto.estado)}
                </span>
            </div>

            <div class="project-info">
                <p>
                    <strong>Código:</strong>
                    ${escaparHTML(proyecto.codigo || "—")}
                </p>

                <p>
                    <strong>Responsable:</strong>
                    ${escaparHTML(proyecto.responsableNombre || "—")}
                </p>

                <p class="project-assigned-student">
                    <strong>Alumno(s) asignado(s):</strong>
                    ${escaparHTML(proyecto.alumnosAsignadosTexto || "Pendiente de vincular")}
                </p>

                <p>
                    <strong>Prioridad:</strong>
                    ${escaparHTML(proyecto.prioridad)}
                </p>

                <p>
                    <strong>Inicio:</strong>
                    ${formatearFecha(proyecto.fechaInicio)}
                </p>

                <p>
                    <strong>Fin:</strong>
                    ${formatearFecha(proyecto.fechaFin)}
                </p>
            </div>

            <div class="project-progress">
                <div class="progress-info">
                    <span>Avance</span>
                    <strong>
                        ${Number(proyecto.porcentajeAvance || 0)}%
                    </strong>
                </div>

                <div class="progress-bar">
                    <div
                        class="progress-fill"
                        style="width: ${Number(
                            proyecto.porcentajeAvance || 0
                        )}%;">
                    </div>
                </div>
            </div>

            <div class="project-actions">
                <button
                    type="button"
                    class="btn-detail"
                    onclick="verDetalleProyecto(${proyecto.id})">
                    Ver detalle
                </button>

                ${botonEditar}
                ${esAdministrador() ? `<button type="button" onclick="nuevoAlcanceUI(${proyecto.id})">Nuevo alcance</button><button type="button" onclick="exportarProyectoUI(${proyecto.id})">Exportar</button>` : ""}
                ${esAdministrador() ? `<select class="select-carpeta-card" onchange="moverProyectoUI(${proyecto.id},this.value)"><option value="">Sin carpeta</option>${carpetasProyecto.map(c=>`<option value="${c.id}" ${String(proyecto.idCarpeta)===String(c.id)?'selected':''}>${escaparHTML(c.nombre)}</option>`).join('')}</select>` : ""}
            </div>
        `;

        contenedorProyectos.appendChild(card);
    });
}

/* =========================================================
   CREAR Y EDITAR
========================================================= */

function abrirModalNuevoProyecto() {
    if (!puedeCrearProyecto()) {
        alert("Solo un administrador puede crear proyectos.");
        return;
    }

    if (formProyecto) {
        formProyecto.reset();
    }

    if (idProyecto) {
        idProyecto.value = "";
    }

    if (tituloModal) {
        tituloModal.textContent = "Nuevo Proyecto";
    }

    if (estadoProyecto) {
        estadoProyecto.value = "Propuesto";
    }

    if (prioridadProyecto) {
        prioridadProyecto.value = "Media";
    }

    cargarOpcionesOrganizaciones();
    cargarOpcionesResponsables();
    cargarOpcionesCarpetas();
    if (carpetaProyecto) carpetaProyecto.value = "";

    if (modalProyecto) {
        modalProyecto.classList.add("show");
    }
}

function editarProyecto(id) {
    const proyecto = proyectos.find(function (item) {
        return String(item.id) === String(id);
    });

    if (!proyecto) {
        alert("No se encontró el proyecto.");
        return;
    }

    if (!puedeEditarProyecto(proyecto)) {
        alert(
            "Solo el administrador o el responsable del proyecto puede editar este proyecto."
        );
        return;
    }

    cargarOpcionesOrganizaciones();
    cargarOpcionesResponsables();

    if (tituloModal) {
        tituloModal.textContent = "Editar Proyecto";
    }

    if (idProyecto) {
        idProyecto.value = proyecto.id;
    }

    if (nombreProyecto) {
        nombreProyecto.value =
            proyecto.catalogoOficial
                ? (proyecto.nombreInterno || proyecto.nombre || "")
                : (proyecto.nombre || "");
    }

    if (codigoProyecto) {
        codigoProyecto.value = proyecto.codigo || "";
    }

    if (organizacionProyecto) {
        organizacionProyecto.value =
            proyecto.idOrganizacion || "";
    }
    if (carpetaProyecto) carpetaProyecto.value = proyecto.idCarpeta || "";

    if (responsableProyecto) {
        responsableProyecto.value =
            proyecto.idResponsable || "";
    }

    if (clienteProyecto) {
        clienteProyecto.value =
            proyecto.clienteArea || "";
    }

    if (estadoProyecto) {
        estadoProyecto.value =
            proyecto.estado || "Propuesto";
    }

    if (prioridadProyecto) {
        prioridadProyecto.value =
            proyecto.prioridad || "Media";
    }

    if (fechaInicioProyecto) {
        fechaInicioProyecto.value =
            proyecto.fechaInicio || "";
    }

    if (fechaFinProyecto) {
        fechaFinProyecto.value =
            proyecto.fechaFin || "";
    }

    if (descripcionProyecto) {
        descripcionProyecto.value =
            proyecto.descripcion || "";
    }

    /*
     * Si edita el responsable del proyecto y no es administrador,
     * se bloquean visualmente los campos administrativos.
     * El backend también conserva estos valores por seguridad.
     */
    if (!esAdministrador()) {
        if (organizacionProyecto) {
            organizacionProyecto.disabled = true;
        }

        if (responsableProyecto) {
            responsableProyecto.disabled = true;
        }
    } else {
        if (organizacionProyecto) {
            organizacionProyecto.disabled = false;
        }

        if (responsableProyecto) {
            responsableProyecto.disabled = false;
        }
    }

    if (modalProyecto) {
        modalProyecto.classList.add("show");
    }
}

async function guardarProyecto() {
    const id = idProyecto
        ? idProyecto.value
        : "";

    const esEdicion = id !== "";

    const proyectoOriginal = esEdicion
        ? proyectos.find(function (item) {
            return String(item.id) === String(id);
        })
        : null;

    if (esEdicion && !puedeEditarProyecto(proyectoOriginal)) {
        alert(
            "Solo el administrador o el responsable del proyecto puede guardar cambios."
        );
        return;
    }

    if (!esEdicion && !puedeCrearProyecto()) {
        alert("Solo un administrador puede crear proyectos.");
        return;
    }

    const nombre = nombreProyecto
        ? nombreProyecto.value.trim()
        : "";

    if (nombre === "") {
        alert("Ingresa el nombre del proyecto.");

        if (nombreProyecto) {
            nombreProyecto.focus();
        }

        return;
    }

    const fechaInicio = fechaInicioProyecto
        ? fechaInicioProyecto.value
        : "";

    const fechaFin = fechaFinProyecto
        ? fechaFinProyecto.value
        : "";

    if (
        fechaInicio !== "" &&
        fechaFin !== "" &&
        fechaFin < fechaInicio
    ) {
        alert(
            "La fecha final no puede ser anterior a la fecha de inicio."
        );
        return;
    }

    const idUsuario = obtenerIdUsuarioActivo();

    if (!idUsuario) {
        alert(
            "No se encontró una sesión válida. Cierra sesión e inicia nuevamente."
        );
        return;
    }

    const datosProyecto = {
        idOrganizacion:
            organizacionProyecto &&
            organizacionProyecto.value
                ? Number(organizacionProyecto.value)
                : null,

        idResponsable:
            responsableProyecto &&
            responsableProyecto.value
                ? Number(responsableProyecto.value)
                : null,

        nombre: nombre,

        codigo: codigoProyecto
            ? codigoProyecto.value.trim()
            : "",

        descripcion: descripcionProyecto
            ? descripcionProyecto.value.trim()
            : "",

        clienteArea: clienteProyecto
            ? clienteProyecto.value.trim()
            : "",

        tipoProyecto: proyectoOriginal
            ? proyectoOriginal.tipoProyecto || "Normal"
            : "Normal",

        estado: estadoProyecto
            ? estadoProyecto.value
            : "Propuesto",

        prioridad: prioridadProyecto
            ? prioridadProyecto.value
            : "Media",

        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null
    };

    /*
     * Si no es administrador, aunque sea responsable:
     * - no puede cambiar responsable;
     * - no puede cambiar organización;
     * - no puede cambiar tipo de proyecto.
     */
    if (!esAdministrador() && proyectoOriginal) {
        datosProyecto.idResponsable =
            proyectoOriginal.idResponsable || null;

        datosProyecto.idOrganizacion =
            proyectoOriginal.idOrganizacion || null;

        datosProyecto.tipoProyecto =
            proyectoOriginal.tipoProyecto || "Normal";
    }

    bloquearGuardar(true);

    try {
        const respuesta = await fetch(
            esEdicion
                ? `${API_PROYECTOS}/${id}`
                : API_PROYECTOS,
            {
                method: esEdicion ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Usuario-Id": String(idUsuario)
                },
                body: JSON.stringify(datosProyecto)
            }
        );

        const datos = await obtenerRespuestaJSON(respuesta);

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No fue posible guardar el proyecto."
            );
        }

        if (esAdministrador() && carpetaProyecto && datos.proyecto?.id) {
            await moverProyectoUI(datos.proyecto.id, carpetaProyecto.value || null);
        }
        cerrarModalProyecto();
        await cargarCarpetas();
        await cargarProyectos();

        alert(
            datos.mensaje ||
            "Proyecto guardado correctamente."
        );

    } catch (error) {
        console.error("Error al guardar proyecto:", error);

        alert(
            error.message ||
            "Ocurrió un error al guardar el proyecto."
        );
    } finally {
        bloquearGuardar(false);
    }
}

function cerrarModalProyecto() {
    if (modalProyecto) {
        modalProyecto.classList.remove("show");
    }

    if (formProyecto) {
        formProyecto.reset();
    }

    if (idProyecto) {
        idProyecto.value = "";
    }

    if (organizacionProyecto) {
        organizacionProyecto.disabled = false;
    }

    if (responsableProyecto) {
        responsableProyecto.disabled = false;
    }
}

function bloquearGuardar(estaBloqueado) {
    if (!btnGuardarProyecto) {
        return;
    }

    btnGuardarProyecto.disabled = estaBloqueado;

    btnGuardarProyecto.textContent = estaBloqueado
        ? "Guardando..."
        : "Guardar Proyecto";
}

/* =========================================================
   DETALLE
========================================================= */

function verDetalleProyecto(id) {
    const proyecto = proyectos.find(function (item) {
        return String(item.id) === String(id);
    });

    if (!proyecto) {
        alert(
            "No tienes permiso para abrir este proyecto o ya no está disponible."
        );
        return;
    }

    window.location.href =
        "detalle-proyecto.html?id=" + proyecto.id;
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

function obtenerColorEstado(estado) {
    const texto = normalizarTexto(estado);

    if (
        texto.includes("cerrado") ||
        texto.includes("completado") ||
        texto.includes("finalizado")
    ) {
        return "green";
    }

    if (
        texto.includes("ejecucion") ||
        texto.includes("progreso") ||
        texto.includes("monitoreo")
    ) {
        return "orange";
    }

    if (
        texto.includes("cancelado") ||
        texto.includes("bloqueado") ||
        texto.includes("riesgo")
    ) {
        return "red";
    }

    if (
        texto.includes("inicio") ||
        texto.includes("planificacion") ||
        texto.includes("propuesto")
    ) {
        return "blue";
    }

    return "gray";
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "—";
    }

    const partes = String(fecha)
        .split("T")[0]
        .split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}