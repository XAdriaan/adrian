(function () {
    const el=id=>document.getElementById(id), escapar=texto=>String(texto??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const formato=s=>[Math.floor(s/3600),Math.floor(s%3600/60),Math.floor(s%60)].map(n=>String(n).padStart(2,'0')).join(':');
    const registrado=p=>!!p.asistenciaRegistrada||p.idRegistro!=null;
    let personas=[],recibido=0,pendiente=false,autorizado=false,version=0;
    const hoy=()=>{const partes=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(tipo=>partes.find(p=>p.type===tipo).value).join('-');};
    el('monitorFecha').value=hoy();
    function pintar() {
        const filtro=el('monitorFiltro').value,busqueda=el('monitorBuscar').value.trim().toLocaleLowerCase('es-MX');
        const visibles=personas.filter(p=>(!busqueda || `${p.nombre} ${p.rol}`.toLocaleLowerCase('es-MX').includes(busqueda)) && (filtro==='todos'||filtro==='alumnos'&&p.alumno||filtro==='online'&&p.conectado||filtro==='sin-asistencia'&&p.alumno&&!registrado(p)));
        el('monitorConectados').textContent=personas.filter(p=>p.conectado).length;
        el('monitorAlumnos').textContent=personas.filter(p=>p.alumno&&registrado(p)).length;
        el('monitorContando').textContent=personas.filter(p=>p.contando).length;
        el('monitorFilas').innerHTML=visibles.length?visibles.map(p=>`<tr><td><strong>${escapar(p.nombre)}</strong><small>${escapar(p.rol)} · ${escapar(p.estado)}</small></td><td><span class="asistencia-badge ${p.conectado?'online':''}">${p.conectado?'Conectado':'Desconectado'}</span></td><td>${escapar(p.entrada||'Sin entrada registrada')}</td><td>${p.alumno?`<strong class="asistencia-digital" data-segundos="${Number(p.segundos)||0}" data-contando="${!!p.contando}" data-vigencia="${Math.max(0,Number(p.vigenciaSegundos??30))}" data-cierre="${Math.max(0,Number(p.segundosHastaCierre??30))}">${formato(Number(p.segundos)||0)}</strong><small>${p.contando?'En curso':registrado(p)?'Registradas o reconocidas':'Sin asistencia automática'}</small>`:'<small>Cuenta de supervisión o empresa</small>'}</td><td>${p.ultimaConexion?escapar(new Date(p.ultimaConexion).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})):'Sin conexión registrada'}</td><td>${escapar(p.apartado?.replace(/\.html$/,'').replace(/-/g,' ')||'—')}</td></tr>`).join(''):'<tr><td colspan="6">No hay cuentas que coincidan con el filtro.</td></tr>';
        reloj();
    }
    function reloj() {
        const extra=Math.min(30,Math.max(0,(Date.now()-recibido)/1000));
        document.querySelectorAll('[data-segundos]').forEach(n=>{
            const limite=Math.min(extra,Number(n.dataset.vigencia??30),Number(n.dataset.cierre??30));
            n.textContent=formato(Math.min(36000,Number(n.dataset.segundos)+(n.dataset.contando==='true'?limite:0)));
        });
    }
    async function cargar() {
        if (!autorizado || pendiente) return;
        pendiente=true; el('monitorActualizar').disabled=true; const epoca=version,fecha=el('monitorFecha').value;
        const control=new AbortController(),limite=setTimeout(()=>control.abort(),15000);
        try {
            const respuesta=await fetch(window.apiUrl('/api/presencia/monitor?fecha='+encodeURIComponent(fecha)),{signal:control.signal}),datos=await respuesta.json();
            if (epoca!==version) return;
            if (!respuesta.ok) throw Object.assign(new Error(datos.mensaje||datos.detail||datos.message||'No se pudo consultar la asistencia.'),{status:respuesta.status});
            personas=Array.isArray(datos.personas)?datos.personas:[];recibido=Date.now();el('monitorError').hidden=true;
            el('monitorEstado').textContent=`Última consulta: ${new Date(datos.consultadoEn).toLocaleTimeString('es-MX')}. Se actualiza cada 30 segundos; los relojes avanzan cada segundo.`;pintar();
        } catch(error) {
            if(epoca!==version)return;personas=personas.map(p=>({...p,contando:false}));el('monitorError').hidden=false;el('monitorError').textContent=error.name==='AbortError'?'El servidor tardó en responder. Pulsa Actualizar para reintentar.':error.message;
            if([401,403].includes(error.status)){personas=[];el('monitorFilas').innerHTML='<tr><td colspan="6">No se confirmó acceso a la asistencia.</td></tr>';autorizado=false;}
            else {pintar();el('monitorEstado').textContent='Los datos visibles corresponden a la última consulta correcta. Relojes pausados hasta volver a confirmar.';}
        } finally {clearTimeout(limite);pendiente=false;el('monitorActualizar').disabled=false;if(epoca!==version)cargar();}
    }
    el('monitorActualizar').addEventListener('click',cargar);el('monitorFecha').addEventListener('change',()=>{version++;personas=[];pintar();cargar();});
    el('monitorBuscar').addEventListener('input',pintar);el('monitorFiltro').addEventListener('change',pintar);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)cargar();});
    setInterval(()=>{if(!document.hidden)cargar();},30000);setInterval(reloj,1000);
    (async()=>{if(!window.obtenerTokenSesionPMO()){window.location.replace('login.html');return;}const u=await window.restaurarSesionPMO();if(!u){el('monitorEstado').textContent='No se pudo confirmar tu sesión. Vuelve a iniciar sesión.';return;}const enlace=el('monitorRegularizar');if(enlace)enlace.hidden=!['superadministrador','administrador','admin pmo','admin_pmo','administrador pmo'].includes(String(u.rol?.nombre||u.rol||'').trim().toLowerCase());autorizado=true;await cargar();})();
})();
