const API_MI_ESTADIA = window.apiUrl('/api/seguimiento-estadia/mi-seguimiento');
const estadia = { seguimiento: {}, datos: {}, registros: [], archivos: [], calendario:[], asistenciaLista: false, consultaAsistencia: 0 };
const elEstadia = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
    if (window.restaurarSesionPMO) await window.restaurarSesionPMO();
    if (!localStorage.getItem('sesionTokenPMO')) { location.replace('login.html'); return; }
    const hoy = new Date();
    elEstadia('mesAsistencia').value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    document.querySelectorAll('[data-seccion]').forEach(b => b.addEventListener('click', () => {
        location.hash = b.dataset.seccion;
    }));
    window.addEventListener('hashchange', mostrarSeccionEstadia);
    mostrarSeccionEstadia();
    elEstadia('mesAsistencia').addEventListener('change', cargarAsistencia);
    elEstadia('proyectoAsistencia')?.addEventListener('change',cargarAsistencia);
    elEstadia('actualizarEstadia').addEventListener('click', actualizarEstadia);
    elEstadia('descargarAsistencia').addEventListener('click', descargarAsistencia);
    elEstadia('formFoEst03').addEventListener('submit', subirFoEst03);
    await actualizarEstadia();
    try{const r=await obtenerEstadiaJSON(window.apiUrl('/api/proyectos'));elEstadia('proyectoAsistencia').innerHTML='<option value="">Calendario general</option>'+(r.proyectos||[]).map(p=>`<option value="${Number(p.id)}">${escapeEstadia(p.nombre)}</option>`).join('');}catch(_){}
});

function mostrarSeccionEstadia() {
    const destino = ['expediente', 'pasesLista', 'foEst03'].includes(location.hash.slice(1))
        ? location.hash.slice(1) : 'expediente';
    document.querySelectorAll('.estadia-section').forEach(s => { s.hidden = s.id !== destino; });
    document.querySelectorAll('[data-seccion]').forEach(b => {
        if (b.dataset.seccion === destino) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
    });
}

async function obtenerEstadiaJSON(url, opciones) {
    const respuesta = await fetch(url, opciones);
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.mensaje || `No se pudo completar la consulta (HTTP ${respuesta.status}).`);
    return datos;
}

async function actualizarEstadia() {
    const boton = elEstadia('actualizarEstadia');
    boton.disabled = true;
    try { await Promise.allSettled([cargarMiEstadia(), cargarAsistencia(), cargarEntregasFoEst03(), cargarAcademicosEstadia()]); }
    finally { boton.disabled = false; }
}

async function cargarMiEstadia() {
    try {
        const d = await obtenerEstadiaJSON(API_MI_ESTADIA);
        estadia.seguimiento = d.seguimiento || {};
        renderEstadia(d.seguimiento || {}, d.documentos || {});
    } catch (e) { mensajeEstadia('estadoDocumental', e.message, 'error'); }
}

async function cargarAcademicosEstadia() {
    try {
        const d = await obtenerEstadiaJSON(window.apiUrl('/api/datos-registro/mi-sesion'));
        estadia.datos = d.datos || d.datosAcademicos || {};
    } catch (e) { estadia.datos = {}; console.warn('Datos académicos para el formato:', e.message); }
    const u = usuarioEstadia();
    elEstadia('nombreEstudiante').textContent = estadia.datos.nombreCompleto || nombreEstadia(u);
}

function renderEstadia(s, docs) {
    const documentos = [['Carta de presentación', docs.cartaPresentacion], ['Carta de aceptación', docs.cartaAceptacion], ['Carta de término', docs.cartaTermino]];
    const aprobados = documentos.filter(([, listo]) => listo === true).length;
    elEstadia('progresoTexto').textContent = `${aprobados} de 3 documentos aprobados`;
    elEstadia('progresoDocumentos').style.width = `${aprobados / 3 * 100}%`;
    mensajeEstadia('estadoDocumental', aprobados === 3 ? 'Tu documentación está completa. Consulta el avance de tus evaluaciones.'
        : 'Continúa con tu proyecto y registra tu asistencia mientras se completa la revisión del expediente.', aprobados === 3 ? 'success' : '');
    elEstadia('documentosGrid').innerHTML = documentos.map(([nombre, listo], i) => `<article class="document-step ${listo ? 'done' : ''}"><span class="document-step-number">${listo ? '✓' : '0' + (i + 1)}</span><h3>${nombre}</h3><p>${listo ? 'Documento aprobado en tu expediente.' : 'Pendiente de aprobación.'}</p><a href="documentos.html">${listo ? 'Consultar documento' : 'Ir a mis documentos'} ↗</a></article>`).join('');
    elEstadia('asesorBox').innerHTML = `<strong>${escapeEstadia(s.asesorNombre || 'Pendiente de asignación')}</strong><p class="pmo-muted">${escapeEstadia(s.asesorCorreo || 'Consulta tu asignación con la administración.')}</p>`;
    [['Empresa', s.empresa, s.fechaEmpresa], ['Satisfaccion', s.satisfaccion, s.fechaSatisfaccion]].forEach(([nombre, hecho, fecha]) => {
        elEstadia('badge' + nombre).className = 'pmo-status ' + (hecho ? 'active' : 'pending');
        elEstadia('badge' + nombre).textContent = hecho ? 'Completada' : 'Pendiente';
        elEstadia('texto' + nombre).textContent = hecho ? `Revisada${fecha ? ' · ' + fechaEstadia(fecha) : ''}` : 'Evaluación pendiente por la administración';
    });
    elEstadia('badgeFoEst03').className = 'pmo-status ' + (s.foEst03 ? 'active' : 'pending');
    elEstadia('badgeFoEst03').textContent = s.foEst03 ? 'Evaluación completada' : 'Pendiente de evaluación';
    elEstadia('textoFoEst03').textContent = s.foEst03 ? `Evaluación registrada${s.fechaFoEst03 ? ' el ' + fechaEstadia(s.fechaFoEst03) : ''}.` : 'La entrega del documento y su evaluación se consultan por separado.';
}

async function cargarAsistencia() {
    const consulta = ++estadia.consultaAsistencia;
    estadia.asistenciaLista = false;
    elEstadia('descargarAsistencia').disabled = true;
    const periodo = elEstadia('mesAsistencia').value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
        mensajeEstadia('mensajeAsistencia', 'Selecciona un mes válido.', 'error'); return;
    }
    try {
        const [anio, mes] = periodo.split('-');
        const d = await obtenerEstadiaJSON(window.apiUrl(`/api/registros-horas/mi-asistencia?anio=${anio}&mes=${mes}`));
        const proyecto=elEstadia('proyectoAsistencia')?.value;
        const calendario=proyecto?await obtenerEstadiaJSON(window.apiUrl(`/api/canales/proyectos/${Number(proyecto)}/calendario?mes=${periodo}`)):{dias:[]};
        if (consulta !== estadia.consultaAsistencia) return;
        estadia.registros = (Array.isArray(d.registros) ? d.registros : []).filter(r => String(r.fecha || '').startsWith(periodo));
        estadia.calendario=calendario.dias||[];
        estadia.asistenciaLista = true;
        elEstadia('mensajeAsistencia').hidden = true;
        estadia.horasAprobadasCorte=Number(d.horasAprobadasCorte||0);
        renderizarAsistencia();
    } catch (e) {
        if (consulta !== estadia.consultaAsistencia) return;
        estadia.registros = [];
        elEstadia('resumenAsistencia').innerHTML = '';
        elEstadia('tablaAsistenciaBody').innerHTML = '<tr><td colspan="7">No se pudo actualizar la asistencia.</td></tr>';
        mensajeEstadia('mensajeAsistencia', e.message, 'error');
    } finally { if (consulta === estadia.consultaAsistencia) elEstadia('descargarAsistencia').disabled = !estadia.asistenciaLista; }
}

function renderizarAsistencia() {
    const registros = window.EstadiaFormatos.filasAsistencia({mes:elEstadia('mesAsistencia').value,registros:estadia.registros,datos:estadia.datos,calendario:estadia.calendario});
    const dias = new Set(estadia.registros.filter(r=>String(r.fecha).slice(0,7)===elEstadia('mesAsistencia').value).map(r => String(r.fecha).slice(0,10))).size;
    const horas = registros.reduce((s,r) => s + numeroEstadia(r.horasTrabajadas), 0);
    const resumen = window.EstadiaFormatos.resumenAsistencia({mes:elEstadia('mesAsistencia').value,registros:estadia.registros,horasAprobadasCorte:estadia.horasAprobadasCorte});
    elEstadia('resumenAsistencia').innerHTML = `<div class="metric"><small>Días registrados</small><strong>${dias}</strong></div><div class="metric"><small>Horas del mes</small><strong>${resumen.horasMes.toFixed(2)} h</strong></div><div class="metric"><small>Aprobadas del mes</small><strong>${resumen.aprobadasMes.toFixed(2)} h</strong></div>${resumen.tieneRegularizacion?`<div class="metric"><small>Aprobadas del 01/09 al 12/10/2026</small><strong>${resumen.aprobadasCorte.toFixed(2)} h</strong></div><p>Regularización administrativa: horario reconocido de 07:00 a 17:00. Las conexiones reales se conservan en Control de horas.</p>`:''}`;
    elEstadia('tablaAsistenciaBody').innerHTML = registros.length ? registros.map(r => `<tr><td>${escapeEstadia(fechaEstadia(r.fecha))}</td><td>${r.laboral?'Laboral':'No laboral'}</td><td>${escapeEstadia(horaEstadia(r.horaEntrada))}</td><td>${escapeEstadia(horaEstadia(r.horaSalida))}</td><td>${r.horasTrabajadas==null?'—':numeroEstadia(r.horasTrabajadas).toFixed(2)+' h'}</td><td>${escapeEstadia(r.motivoDia||incidenteEstadia(r.incidente))}</td><td><span class="pmo-status ${r.estadoValidacion === 'Aprobado' ? 'active' : 'pending'}">${escapeEstadia(r.estadoValidacion || 'Sin registro')}</span></td></tr>`).join('') : '<tr><td colspan="7">Este mes no contiene días de tu periodo de estadía.</td></tr>';
}

async function descargarAsistencia() {
    if (!estadia.asistenciaLista) return;
    const boton = elEstadia('descargarAsistencia'); boton.disabled = true;
    try {
        await cargarAsistencia();
        if(!estadia.asistenciaLista)throw new Error('Actualiza la asistencia antes de descargar el formato.');
        await window.EstadiaFormatos.descargarAsistencia({ mes: elEstadia('mesAsistencia').value,
            horasAprobadasCorte:estadia.horasAprobadasCorte,
            calendario:estadia.calendario,
            registros: estadia.registros, datos: { ...estadia.datos, asesorEmpresarial: estadia.seguimiento.asesorNombre || estadia.datos.asesorEmpresarial },
            nombre: estadia.datos.nombreCompleto || nombreEstadia(usuarioEstadia()) });
    } catch (e) { mensajeEstadia('mensajeAsistencia', e.message || 'No se pudo generar el PDF.', 'error'); }
    finally { boton.disabled = !estadia.asistenciaLista; }
}

async function cargarEntregasFoEst03() {
    try {
        const d = await obtenerEstadiaJSON(window.apiUrl('/api/documentos'));
        const u = usuarioEstadia(); const id = u?.id || u?.idUsuario;
        estadia.archivos = (Array.isArray(d.documentos) ? d.documentos : []).filter(d =>
            String(d.idUsuario) === String(id) && String(d.tipoDocumento || '').toUpperCase().replace(/[^A-Z0-9]/g,'').includes('FOEST03'));
        renderEntregasFoEst03();
    } catch (e) { elEstadia('entregasFoEst03').innerHTML = `<div class="pmo-message error">${escapeEstadia(e.message)}</div>`; }
}

function renderEntregasFoEst03() {
    elEstadia('entregasFoEst03').innerHTML = estadia.archivos.length ? estadia.archivos.map((d,i) => `<div class="fo-delivery"><div><strong>${escapeEstadia(d.nombreArchivo)}</strong><small>${escapeEstadia(fechaEstadia(d.fechaSubida))}${d.observaciones ? ' · ' + escapeEstadia(d.observaciones) : ''}</small></div><div class="fo-delivery-actions"><span class="pmo-status ${/acept|aprob|liber/i.test(d.estado) ? 'active' : 'pending'}">${escapeEstadia(d.estado || 'Pendiente')}</span><button class="pmo-button secondary" type="button" data-entrega="${i}">Descargar</button></div></div>`).join('') : '<div class="pmo-empty"><strong>Tu primera entrega empieza aquí.</strong>Descarga el formato, complétalo y envíalo a revisión.</div>';
    elEstadia('entregasFoEst03').querySelectorAll('[data-entrega]').forEach(b => b.addEventListener('click', () => {
        const d = estadia.archivos[Number(b.dataset.entrega)];
        try {
            const base64 = String(d.archivoBase64 || '').replace(/^data:[^,]*,/, '');
            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            const mime = /\.pdf$/i.test(d.nombreArchivo) ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            window.EstadiaFormatos.descargarBlob(new Blob([bytes], {type:mime}), d.nombreArchivo);
        } catch (e) { mensajeEstadia('mensajeFoEst03', 'No se pudo descargar esta entrega.', 'error'); }
    }));
}

async function subirFoEst03(evento) {
    evento.preventDefault();
    const archivo = elEstadia('archivoFoEst03').files?.[0];
    if (!archivo || !/\.(xlsx|pdf)$/i.test(archivo.name)) { mensajeEstadia('mensajeFoEst03', 'Selecciona un archivo Excel (.xlsx) o PDF.', 'error'); return; }
    if (archivo.size > 4 * 1024 * 1024) { mensajeEstadia('mensajeFoEst03', 'El archivo debe pesar como máximo 4 MB.', 'error'); return; }
    const boton = elEstadia('subirFoEst03'); boton.disabled = true;
    try {
        const archivoBase64 = await new Promise((resolve,reject) => { const r = new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(new Error('No se pudo leer el archivo.')); r.readAsDataURL(archivo); });
        await obtenerEstadiaJSON(window.apiUrl('/api/documentos'), {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
            tipoDocumento:'FO-EST-03', nombreArchivo:archivo.name, archivoBase64,
            mimeType:/\.pdf$/i.test(archivo.name) ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            observaciones:elEstadia('observacionesFoEst03').value.trim(), generadoAutomaticamente:false
        })});
        mensajeEstadia('mensajeFoEst03', 'Tu FO-EST-03 quedó guardado y enviado a revisión.', 'success');
        elEstadia('formFoEst03').reset();
        await cargarEntregasFoEst03();
    } catch (e) { mensajeEstadia('mensajeFoEst03', e.message, 'error'); }
    finally { boton.disabled = false; }
}

function mensajeEstadia(id, texto, tipo='') { const e=elEstadia(id); e.hidden=false; e.className='pmo-message '+tipo; e.textContent=texto; }
function usuarioEstadia(){try{return JSON.parse(localStorage.getItem('usuarioActivo'))||{};}catch{return {};}}
function nombreEstadia(u){return u.nombreCompleto || [u.nombre,u.apellidoPaterno,u.apellidoMaterno].filter(Boolean).join(' ') || 'Mi estadía';}
function numeroEstadia(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function fechaEstadia(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:'—';}
function horaEstadia(v){return v?String(v).slice(0,5):'—';}
function incidenteEstadia(v){return {normal:'Normal',justificado:'Con justificación',no_justificado:'Sin justificación',recuperacion:'Recuperación',festivo:'Festivo',fin_semana:'Fin de semana'}[String(v||'').toLowerCase()]||v||'Normal';}
function escapeEstadia(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
