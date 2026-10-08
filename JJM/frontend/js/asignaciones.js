(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let datos = null;
    let ocupado = false;
    function aviso(texto, error = false) {
        $('mensajeAsignaciones').textContent = texto;
        $('mensajeAsignaciones').className = 'pmo-message' + (error ? ' error' : '');
        $('mensajeAsignaciones').hidden = !texto;
    }
    function dibujar() {
        if (!datos) return;
        const q = $('buscarAsignacion').value.trim().toLocaleLowerCase('es');
        const filas = datos.proyectos.filter(p => [p.equipo, p.proyecto, p.alumnoPDF, ...p.alumnos.map(a => a.nombre)].join(' ').toLocaleLowerCase('es').includes(q));
        const asignados = datos.proyectos.filter(p => p.alumnos.length).length;
        $('resumenAsignaciones').innerHTML = `<span>${datos.proyectos.length} proyectos</span><span>${asignados} con alumno</span><span>${datos.proyectos.length - asignados} por confirmar</span>`;
        $('listaAsignaciones').innerHTML = filas.length ? filas.map(p => `<article class="asignacion-fila"><div><span class="pmo-eyebrow">EQUIPO ${esc(p.equipo)}</span> <span class="asignacion-estado ${p.alumnos.length ? '' : 'pendiente'}">${esc(p.estado)}</span><h2>${esc(p.proyecto)}</h2><p>Alumno en el PDF: <strong>${esc(p.alumnoPDF || 'No indicado')}</strong></p><p>Cuenta asignada: <strong>${esc(p.alumnos.map(a => a.nombre).join(', ') || 'Por confirmar')}</strong></p><p>${Number(p.tareas)} tareas · ${Number(p.tareasSinAsignar)} sin responsable</p>${p.proyectoId ? `<a href="detalle-proyecto.html?id=${Number(p.proyectoId)}">Ver proyecto y tareas →</a>` : '<p>Sincroniza para crear el proyecto.</p>'}</div><form class="asignacion-confirmacion" data-codigo="${esc(p.codigo)}"><label for="alumno-${esc(p.equipo)}">Confirmar alumno de una cuenta existente</label><select id="alumno-${esc(p.equipo)}" name="idMiembro" required><option value="">Selecciona una cuenta</option>${datos.alumnosDisponibles.map(a => `<option value="${Number(a.id)}">${esc(a.nombre)}</option>`).join('')}</select><button type="submit" class="pmo-button secondary" ${ocupado || !p.proyectoId ? 'disabled' : ''}>Vincular alumno y tareas pendientes</button><small>Se asignan las tareas sin responsable. Las que ya tienen responsable se conservan.</small></form></article>`).join('') : '<p class="pmo-empty">No hay coincidencias.</p>';
    }
    async function consultar(ruta = '', opciones = {}) {
        if (ocupado) return;
        ocupado = true; $('sincronizarCatalogo').disabled = true; aviso('');
        document.querySelectorAll('.asignacion-confirmacion button').forEach(b => b.disabled = true);
        try {
            const r = await fetch(window.apiUrl('/api/asignaciones-catalogo' + ruta), opciones);
            let respuesta; try { respuesta = await r.json(); } catch (_) { throw new Error(`El servidor no devolvió las asignaciones (HTTP ${r.status}).`); }
            if (!r.ok || respuesta.estado !== 'correcto') throw new Error(respuesta.mensaje || `No se pudieron consultar las asignaciones (HTTP ${r.status}).`);
            datos = respuesta;
            if (opciones.method === 'POST') aviso('Asignaciones guardadas. Las cuentas vinculadas pueden consultar sus proyectos y tareas.');
        } catch (e) {
            aviso(e.message, true);
            if (!datos) $('listaAsignaciones').innerHTML = '<p class="pmo-empty">No se pudieron cargar las asignaciones.</p>';
        } finally { ocupado = false; $('sincronizarCatalogo').disabled = false; dibujar(); }
    }
    document.addEventListener('DOMContentLoaded', () => {
        $('buscarAsignacion').addEventListener('input', dibujar);
        $('sincronizarCatalogo').addEventListener('click', () => consultar('/sincronizar', {method:'POST'}));
        $('listaAsignaciones').addEventListener('submit', e => {
            const form = e.target.closest('form[data-codigo]'); if (!form) return;
            e.preventDefault(); const id = Number(form.elements.idMiembro.value);
            if (!Number.isSafeInteger(id) || id < 1) return;
            consultar('/' + encodeURIComponent(form.dataset.codigo) + '/alumno', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idMiembro:id})});
        });
        consultar();
    });
})();
