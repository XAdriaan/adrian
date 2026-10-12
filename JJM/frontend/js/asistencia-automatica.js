/* Un pulso de conexión por pestaña; el servidor decide qué segundos se registran. */
(function () {
    if (window.__asistenciaAutomaticaIniciada) return;
    window.__asistenciaAutomaticaIniciada = true;
    const pagina = window.crypto?.randomUUID?.() || `pagina_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let pendiente = false, abandonando = false, tokenAnterior = '', datos = null, recibido = 0, conectado = false;
    function usuario() { try { return JSON.parse(localStorage.getItem('usuarioActivo') || 'null'); } catch (_) { return null; } }
    function rol() { const u=usuario(); return String(u?.rol?.nombre || u?.rol || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(); }
    function esAlumno() { return ['colaborador','alumno','alumna','estudiante','estudiante pmo'].includes(rol()); }
    function puedeSupervisar() { return ['superadministrador','administrador','admin pmo','admin_pmo','administrador pmo','directivo escolar','directivo','asesor academico','asesor empresarial','asesor de empresa'].includes(rol()); }
    function formato(segundos) { const s=Math.max(0,Math.floor(Number(segundos)||0)); return [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(v=>String(v).padStart(2,'0')).join(':'); }
    function ruta() { const nombre=String(window.location?.pathname || '/').split('/').pop(); return /^[a-z0-9-]{1,60}\.html$/i.test(nombre) ? nombre : '/'; }
    function esAcceso() { return ['login.html','register.html','registro-empresa.html','index.html','/'].includes(ruta()); }
    function notificar() { window.dispatchEvent(new Event('pmo:asistencia')); pintar(); }
    function segundosVisibles() {
        if (!datos) return null;
        const extra = datos.contando && !datos.error ? Math.min(Number(datos.vigenciaSegundos ?? 90),Number(datos.segundosHastaCierre ?? 90),Math.max(0,(Date.now()-recibido)/1000)) : 0;
        return Math.min(36000,Math.max(0,Number(datos.segundos||0)+extra));
    }
    function pintar() {
        if (typeof document === 'undefined' || !document.body || esAcceso() || !window.obtenerTokenSesionPMO()) return;
        let barra=document.getElementById('pmoAsistenciaBarra');
        if (!barra) {
            const principal=document.querySelector('.main-content') || document.querySelector('.empresa-main'), pie=document.querySelector('.meeting-footer');
            if (!principal && !pie) return;
            barra=document.createElement('section'); barra.id='pmoAsistenciaBarra'; barra.className='pmo-asistencia-barra'; barra.setAttribute('aria-label','Conexión y asistencia');
            barra.innerHTML='<div><strong id="pmoAsistenciaTitulo">Confirmando conexión…</strong><p id="pmoAsistenciaMensaje"></p></div><div class="pmo-reloj"><strong id="pmoAsistenciaReloj">00:00:00</strong><small>horas : minutos : segundos</small><progress id="pmoAsistenciaProgreso" max="36000" value="0" aria-label="Avance de las diez horas diarias"></progress></div><a id="pmoAsistenciaEnlace" href="asistencia.html">Ver asistencia de todos ↗</a>';
            if (principal) principal.prepend(barra); else { barra.classList.add('pmo-asistencia-compacta'); pie.append(barra); }
        }
        const s=segundosVisibles(), contando=!!datos?.contando && !datos?.error && Date.now()-recibido < Number(datos?.vigenciaSegundos ?? 90)*1000;
        const reloj=document.getElementById('pmoAsistenciaReloj'); reloj.textContent=formato(s); reloj.parentElement.hidden=!esAlumno();
        document.getElementById('pmoAsistenciaProgreso').value=s||0;
        document.getElementById('pmoAsistenciaTitulo').textContent=datos?.error ? 'Conexión pendiente de confirmar' : esAlumno() ? contando ? 'Asistencia en curso · Meta diaria: 10 horas' : 'Asistencia pausada' : conectado ? 'Conectado a la Oficina de Proyectos' : 'Confirmando conexión…';
        document.getElementById('pmoAsistenciaMensaje').textContent=datos?.mensaje || 'Tu conexión se registra automáticamente. Horario escolar: lunes a viernes de 07:00 a 17:00.';
        document.getElementById('pmoAsistenciaEnlace').hidden=!puedeSupervisar(); barra.dataset.contando=String(contando);
        const titulo=document.getElementById('tituloJornada'), texto=document.getElementById('textoJornada');
        if (titulo && texto && esAlumno()) { titulo.textContent=contando?'Asistencia automática en curso':'Asistencia automática'; texto.textContent=`${formato(s)} de 10:00:00 hoy. ${datos?.mensaje||'Confirmando tu conexión…'}`; }
    }
    function publicarError(mensaje) { conectado=false; datos={...(datos||{segundos:0}),error:true,contando:false,mensaje}; notificar(); }
    async function sincronizar() {
        const token=window.obtenerTokenSesionPMO(); if (pendiente || abandonando || !token) return;
        tokenAnterior=token; pendiente=true;
        const controlador=new AbortController(), limite=setTimeout(()=>controlador.abort(),15000);
        try {
            const respuesta=await window.fetch(window.apiUrl('/api/presencia/pulso'),{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({pagina,ruta:ruta()}),signal:controlador.signal});
            const resultado=await respuesta.json();
            if (window.obtenerTokenSesionPMO()!==token || abandonando) return;
            if (!respuesta.ok) throw new Error(resultado.mensaje || (respuesta.status===404?'La actualización de asistencia aún no está activa en el servidor.':'No se pudo confirmar la asistencia.'));
            datos=resultado.asistencia; recibido=Date.now(); conectado=resultado.conectado; notificar();
        } catch (error) { if (window.obtenerTokenSesionPMO()===token && !abandonando) publicarError(error.message || 'No se pudo confirmar la conexión. El tiempo sin conexión no se registra.'); }
        finally { clearTimeout(limite); pendiente=false; }
    }
    function salir() {
        const token=window.obtenerTokenSesionPMO(); if (!token || abandonando) return; abandonando=true;
        window.fetch(window.apiUrl('/api/presencia/salida'),{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({pagina,ruta:ruta()})}).catch(()=>{});
    }
    window.asistenciaAutomaticaPMO={esAlumno,sincronizar,salir,formato,segundosVisibles,estado:()=>datos};
    window.addEventListener('pagehide',salir);
    window.addEventListener('pageshow',()=>{abandonando=false;sincronizar();});
    window.addEventListener('online',sincronizar);
    window.addEventListener('offline',()=>publicarError('Sin conexión: el reloj está pausado hasta confirmar tu asistencia con el servidor.'));
    window.addEventListener('pmo:antes-cerrar-sesion',salir);
    window.addEventListener('pmo:sesion-cerrada',()=>{datos=null;tokenAnterior='';conectado=false;if(typeof document!=='undefined')document.getElementById('pmoAsistenciaBarra')?.remove();notificar();});
    window.addEventListener('storage',()=>{if(window.obtenerTokenSesionPMO()!==tokenAnterior){datos=null;abandonando=false;}sincronizar();});
    if (typeof document!=='undefined') document.addEventListener('click',event=>{const a=event.target.closest?.('a');if(String(a?.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()==='cerrar sesion')salir();},true);
    setInterval(sincronizar,30000);
    setInterval(()=>{if(window.obtenerTokenSesionPMO()!==tokenAnterior)sincronizar();pintar();},1000);
    sincronizar();
})();
