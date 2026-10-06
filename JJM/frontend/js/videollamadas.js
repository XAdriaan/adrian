let salasVideollamadas = [];
document.addEventListener('DOMContentLoaded', async () => {
    if (window.restaurarSesionPMO) await window.restaurarSesionPMO();
    if (!localStorage.getItem('sesionTokenPMO')) { location.replace('login.html'); return; }
    document.getElementById('actualizarSalas').addEventListener('click', cargarSalasVideollamadas);
    document.getElementById('buscarSala').addEventListener('input', renderSalasVideollamadas);
    await cargarSalasVideollamadas();
});
async function cargarSalasVideollamadas() {
    const boton = document.getElementById('actualizarSalas'); boton.disabled = true;
    try {
        const r = await fetch(window.apiUrl('/api/reuniones'));
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.mensaje || `No se pudieron consultar las salas (HTTP ${r.status}).`);
        salasVideollamadas = Array.isArray(d.proyectos) ? d.proyectos : [];
        document.getElementById('mensajeSalas').hidden = true;
        renderSalasVideollamadas();
    } catch (e) {
        mostrarErrorSalas(e.message);
        document.getElementById('salasProyectos').innerHTML = '<div class="pmo-empty">No se pudieron actualizar las salas. Pulsa Actualizar salas para reintentar.</div>';
    } finally { boton.disabled = false; }
}
function renderSalasVideollamadas() {
    const normalizar = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const busqueda = normalizar(document.getElementById('buscarSala').value);
    const salas = salasVideollamadas.filter(s => normalizar(s.nombre).includes(busqueda));
    const activas = salasVideollamadas.filter(s => s.reunionActiva).length;
    document.getElementById('resumenSalas').textContent = `${salasVideollamadas.length} proyectos · ${activas} ${activas === 1 ? 'sala abierta' : 'salas abiertas'}`;
    const lista = document.getElementById('salasProyectos');
    lista.innerHTML = salas.map(s => `<article class="video-card"><div class="video-card-top"><span class="video-card-icon" aria-hidden="true">▶</span><span class="pmo-status ${s.reunionActiva ? 'active' : ''}">${s.reunionActiva ? 'Sala abierta' : 'Lista para iniciar'}</span></div><h3>${escapeSala(s.nombre)}</h3><p>${s.reunionActiva ? 'Tu equipo puede unirse a la misma sala.' : 'Inicia una conversación con los miembros de este proyecto.'}</p><div class="video-card-actions"><button class="pmo-button ${s.reunionActiva ? '' : 'secondary'}" type="button" data-proyecto-video="${Number(s.id)}" ${!s.reunionActiva && !s.puedeCrear ? 'disabled' : ''}>${s.reunionActiva ? 'Unirme a la llamada' : 'Iniciar videollamada'} ↗</button><a href="detalle-proyecto.html?id=${Number(s.id)}">Ver proyecto</a></div></article>`).join('') || `<div class="pmo-empty"><strong>${salasVideollamadas.length ? 'No encontramos ese proyecto.' : 'Todavía no tienes salas de proyecto.'}</strong>${salasVideollamadas.length ? 'Prueba con otro nombre.' : 'Las salas aparecen al estar asignado a un proyecto.'}</div>`;
    lista.querySelectorAll('[data-proyecto-video]').forEach(b => b.addEventListener('click', () => abrirSalaVideollamada(Number(b.dataset.proyectoVideo),b)));
    const historial = salasVideollamadas.flatMap(p => (p.reuniones || []).map(r => ({...r,proyectoNombre:p.nombre})))
        .sort((a,b) => String(b.fechaInicio || '').localeCompare(String(a.fechaInicio || ''))).slice(0,12);
    document.getElementById('historialSalas').innerHTML = historial.map(r => `<div class="video-history-row"><div><strong>${escapeSala(r.titulo || r.proyectoNombre)}</strong><small>${escapeSala(r.proyectoNombre)} · ${escapeSala(fechaSala(r.fechaInicio))}</small></div><span class="pmo-status ${String(r.estado).toLowerCase() === 'activa' ? 'active' : ''}">${escapeSala(r.estado || 'Finalizada')}</span></div>`).join('') || '<div class="pmo-empty">Las reuniones que inicies aparecerán aquí.</div>';
}
async function abrirSalaVideollamada(id, boton) {
    const sala = salasVideollamadas.find(p => Number(p.id) === id);
    if (!sala) return;
    const texto = boton.textContent; boton.disabled = true; boton.textContent = 'Preparando sala…';
    try {
        let reunion = sala.reunionActiva;
        if (!reunion) {
            const r = await fetch(window.apiUrl(`/api/proyectos/${id}/reuniones`), {method:'POST'});
            const d = await r.json().catch(() => ({}));
            if (!r.ok || !d.reunion) throw new Error(d.mensaje || 'No se pudo iniciar la reunión.');
            reunion = d.reunion;
        }
        location.href = `reunion.html?id=${encodeURIComponent(id)}&reunion=${encodeURIComponent(reunion.id)}`;
    } catch (e) { mostrarErrorSalas(e.message); boton.disabled = false; boton.textContent = texto; }
}
function mostrarErrorSalas(texto){const e=document.getElementById('mensajeSalas');e.hidden=false;e.className='pmo-message error';e.textContent=texto;}
function escapeSala(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function fechaSala(v){if(!v)return 'Fecha pendiente';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});}
