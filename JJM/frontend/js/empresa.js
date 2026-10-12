(function () {
    const buscar = id => document.getElementById(id);
    const escapar = texto => String(texto ?? '').replace(/[&<>"']/g, letra => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[letra]));
    const fecha = texto => texto ? String(texto).slice(0,10).split('-').reverse().join('/') : 'Sin fecha';
    const mensaje = (texto, correcto = false) => { buscar('empresaMensaje').textContent = texto; buscar('empresaMensaje').hidden = !texto; buscar('empresaMensaje').classList.toggle('success',correcto); };
    let cargando = false, enviando = false, autenticado = false, detalleActivo = null, secuenciaDetalle = 0;
    async function api(ruta, opciones = {}) {
        const controlador = new AbortController(), tiempo = setTimeout(() => controlador.abort(),20000);
        try {
            const respuesta = await fetch(window.apiUrl(ruta),{...opciones,signal:controlador.signal}), datos = await respuesta.json();
            if (!respuesta.ok) throw new Error(datos.mensaje || datos.detail || datos.message || 'No se pudo consultar el proyecto.');
            return datos;
        } finally { clearTimeout(tiempo); }
    }
    async function cargar() {
        if (!autenticado || cargando) return; cargando = true; buscar('empresaActualizar').disabled = true;
        try {
            const datos = await api('/api/empresas/proyectos');
            buscar('nombreEmpresa').textContent = datos.empresa.nombre;
            buscar('empresaConsulta').textContent = `Última consulta: ${new Date(datos.consultadoEn).toLocaleTimeString('es-MX')}. Se actualiza cada 30 segundos mientras estés aquí.`;
            const lista = Array.isArray(datos.proyectos) ? datos.proyectos : [];
            buscar('empresaProyectos').innerHTML = lista.length ? lista.map(p => {
                const avance = Math.min(100,Math.max(0,Number(p.avance)||0));
                return `<article class="company-project"><span class="project-state">${escapar(p.estado||'Propuesto')}</span><h2>${escapar(p.nombre)}</h2><p class="project-meta">${escapar(p.codigo)} · Prioridad ${escapar(p.prioridad)}</p><p>${escapar(p.descripcion).replace(/\n/g,'<br>')}</p><p class="project-meta">${fecha(p.fechaInicio)} — ${fecha(p.fechaFin)}</p><div class="project-progress"><span>Avance registrado</span><strong>${avance.toFixed(2)}%</strong></div><progress max="100" value="${avance}" aria-label="Avance de ${escapar(p.nombre)}"></progress><button class="button secondary" data-proyecto="${Number(p.id)}">Consultar seguimiento ↗</button></article>`;
            }).join('') : '<p class="empty-state">Todavía no tienes proyectos registrados. Pulsa «Registrar proyecto» para compartir lo que necesita tu empresa.</p>';
            if (detalleActivo !== null) await detalle(detalleActivo);
        } catch (error) { buscar('empresaConsulta').textContent = 'No fue posible actualizar. Los datos visibles corresponden a la última consulta correcta.'; mensaje(error.message); }
        finally { cargando = false; buscar('empresaActualizar').disabled = false; }
    }
    async function detalle(id) {
        detalleActivo = id; const secuencia = ++secuenciaDetalle;
        try {
            const datos = await api(`/api/empresas/proyectos/${id}`);
            if (secuencia !== secuenciaDetalle || detalleActivo !== id) return;
            buscar('empresaDetalle').hidden = false; buscar('empresaDetalleTitulo').textContent = datos.proyecto.nombre;
            buscar('empresaDetalleTexto').textContent = 'Actividades y estados registrados por el equipo de la Oficina de Proyectos.';
            buscar('empresaTareas').innerHTML = datos.tareas.length ? datos.tareas.map(t => `<li><strong>${escapar(t.titulo)}</strong><small>${escapar(t.estado||'Pendiente')} · Fecha prevista: ${fecha(t.fechaLimite)}</small></li>`).join('') : '<li>La propuesta todavía no tiene actividades registradas por el equipo.</li>';
        } catch (error) { if (secuencia === secuenciaDetalle) mensaje(error.message); }
    }
    buscar('empresaActualizar').addEventListener('click',cargar);
    buscar('empresaNuevo').addEventListener('click',() => {
        if (!autenticado) return;
        try {
            const servicio = sessionStorage.getItem('servicioEmpresaPMO');
            if (['planeacion','seguimiento','soluciones','formacion','cierre'].includes(servicio)) buscar('proyectoServicio').value = servicio;
            sessionStorage.removeItem('servicioEmpresaPMO');
        } catch (_) {}
        buscar('empresaNuevoPanel').hidden = false; buscar('proyectoNombre').focus();
    });
    buscar('cerrarNuevoProyecto').addEventListener('click',() => buscar('empresaNuevoPanel').hidden = true);
    buscar('cerrarDetalleProyecto').addEventListener('click',() => { detalleActivo = null; secuenciaDetalle++; buscar('empresaDetalle').hidden = true; });
    buscar('empresaProyectos').addEventListener('click',event => { const boton = event.target.closest('[data-proyecto]'); if (boton) detalle(Number(boton.dataset.proyecto)); });
    buscar('empresaSalir').addEventListener('click',async () => {
        autenticado = false; try { await api('/api/auth/logout',{method:'POST'}); } catch (_) {}
        window.limpiarSesionPMO(); window.location.replace('login.html');
    });
    buscar('empresaProyectoForm').addEventListener('submit',async event => {
        event.preventDefault(); if (enviando || !autenticado) return;
        const inicio = buscar('proyectoInicio').value, fin = buscar('proyectoFin').value;
        if (fin < inicio) { mensaje('La fecha final debe ser igual o posterior al inicio.'); return; }
        const nombre = buscar('proyectoNombre').value.trim(), objetivo = buscar('proyectoObjetivo').value.trim();
        if (!nombre || !objetivo) { mensaje('Completa el nombre y el objetivo del proyecto.'); return; }
        enviando = true; buscar('empresaGuardarProyecto').disabled = true;
        try {
            const datos = await api('/api/empresas/proyectos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre,objetivo,servicio:buscar('proyectoServicio').value,prioridad:buscar('proyectoPrioridad').value,fechaInicio:inicio,fechaFin:fin})});
            mensaje(datos.mensaje,true); buscar('empresaProyectoForm').reset(); buscar('empresaNuevoPanel').hidden = true; await cargar();
        } catch (error) { mensaje(error.name === 'AbortError' ? 'El servidor tardó en responder. Actualiza tus proyectos antes de volver a enviar la propuesta.' : error.message); }
        finally { enviando = false; buscar('empresaGuardarProyecto').disabled = false; }
    });
    document.addEventListener('visibilitychange',() => { if (!document.hidden) cargar(); });
    setInterval(() => { if (!document.hidden) cargar(); },30000);
    (async () => {
        if (!window.obtenerTokenSesionPMO()) { window.location.replace('login.html'); return; }
        const usuario = await window.restaurarSesionPMO();
        if (!usuario) { mensaje('No se pudo confirmar tu sesión. Revisa tu conexión y vuelve a iniciar sesión.'); return; }
        if (String(usuario.rol?.nombre || usuario.rol || '').trim().toLowerCase() !== 'empresa') {
            buscar('empresaProyectos').innerHTML = '<p class="empty-state">Este espacio requiere una cuenta empresarial. <a href="dashboard.html">Volver a mi espacio de trabajo</a> o <a href="registro-empresa.html">registrar una empresa</a>.</p>';
            buscar('empresaNuevo').disabled = true; buscar('empresaActualizar').disabled = true; return;
        }
        autenticado = true; buscar('empresaNuevo').disabled = false; await cargar();
    })();
})();
