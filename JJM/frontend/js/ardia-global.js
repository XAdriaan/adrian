(() => {
    'use strict';
    const pagina = window.location.pathname.split('/').pop();
    if (window.PMOArdia || ['', 'index.html', 'login.html', 'register.html'].includes(pagina)) return;
    const normalizar = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const rutas = [
        {nombre:'Inicio',url:'dashboard.html',claves:'dashboard inicio resumen'},
        {nombre:'Mis proyectos',url:'proyectos.html',claves:'proyectos proyecto'},
        {nombre:'Mis tareas',url:'tablero-tareas.html',claves:'tareas tablero pendientes'},
        {nombre:'Mi seguimiento de estadía',url:'mi-estadia.html',claves:'estadia seguimiento expediente'},
        {nombre:'Pases de lista',url:'mi-estadia.html#pasesLista',claves:'pases lista asistencia faltas'},
        {nombre:'FO-EST-03',url:'mi-estadia.html#foEst03',claves:'fo est 03 foest03 fo-est-03 formato evaluacion'},
        {nombre:'Sala general',url:'reunion.html?general=1',claves:'general sala todos llamada'},
        {nombre:'Videollamadas por proyecto',url:'videollamadas.html',claves:'videollamadas videollamada reuniones reunion equipo'},
        {nombre:'Control de horas',url:'control-horas.html',claves:'horas jornada entrada salida'},
        {nombre:'Mi perfil',url:'perfil.html',claves:'perfil cuenta nombre contrasena'},
        {nombre:'Datos académicos',url:'datos-academicos.html',claves:'datos academicos escuela matricula'},
        {nombre:'Mis documentos',url:'documentos.html',claves:'documentos cartas archivos'},
        {nombre:'Cursos',url:'cursos.html',claves:'cursos recursos aprender'},
        {nombre:'Alumnos y proyectos',url:'asignaciones.html',claves:'alumnos proyectos asignaciones catalogo',admin:true}
    ];
    let panel, mensajes, input, accesos, boton, enviar, reconocer, widget, estado, usuario, token;
    let leyendo = false, ocupado = false, ultimaRespuesta = '', gesto = false, escuchando = false, destruido = false;
    const consultas = new Set();
    function vigente() {
        if(destruido)return false;
        if(localStorage.getItem('sesionTokenPMO')!==token){destruir();return false;}
        return true;
    }
    function destruir() {
        if(destruido)return;destruido=true;consultas.forEach(c=>c.abort());consultas.clear();
        window.speechSynthesis?.cancel();reconocer?.abort();widget?.remove();
        document.removeEventListener('keydown',teclado);window.removeEventListener('storage',cambioSesion);
        window.removeEventListener('pmo:sesion-cerrada',destruir);delete window.PMOArdia;
    }
    function cambioSesion(e){if(e.key===null||e.key==='sesionTokenPMO')vigente();}
    function hablar(texto) {
        if(!vigente()||!leyendo||!gesto||panel.hidden||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
        try {
        window.speechSynthesis.cancel();const voz=new window.SpeechSynthesisUtterance(texto.slice(0,2000));voz.lang='es-MX';
        const voces=window.speechSynthesis.getVoices();voz.voice=voces.find(v=>/^es-MX$/i.test(v.lang))||voces.find(v=>/^es/i.test(v.lang))||null;
        voz.onstart=()=>{if(vigente()){estado.textContent='Ard.IA está hablando';widget.classList.add('hablando');}};
        voz.onend=()=>{if(vigente()){estado.textContent='Lista para ayudarte';widget.classList.remove('hablando');}};
        voz.onerror=e=>{if(vigente()){widget.classList.remove('hablando');if(!['interrupted','canceled'].includes(e.error))estado.textContent='Pulsa Escuchar respuesta para activar el audio.';}};
        window.speechSynthesis.speak(voz);
        } catch (_) {
            widget.classList.remove('hablando');
            estado.textContent='La voz no está disponible en este navegador. Puedes seguir consultando por texto.';
        }
    }
    function cuenta() { try { return JSON.parse(localStorage.getItem('usuarioActivo') || 'null'); } catch (_) { return null; } }
    function mensaje(texto, propia = false) {
        if(!vigente())return;
        const div = document.createElement('div'); div.className = 'ardia-mensaje' + (propia?' propio':'');
        div.textContent = texto; mensajes.append(div); mensajes.scrollTop = mensajes.scrollHeight;
        while(mensajes.children.length>30)mensajes.firstElementChild.remove();
        if (!propia) { ultimaRespuesta=texto;hablar(texto); }
    }
    function enlaces(lista) {
        if(!vigente())return;
        accesos.replaceChildren();
        for (const r of lista.filter(r=>!r.admin || window.PMOPermisos?.esAdministradorReal())) { const a = document.createElement('a'); a.href=r.url; a.textContent=r.nombre+' ↗'; accesos.append(a); }
    }
    function buscar(texto) {
        const n=normalizar(texto).trim();
        return !n ? [rutas[4],rutas[5],rutas[6],rutas[7]] : rutas.filter(r=>normalizar(r.nombre+' '+r.claves).includes(n)
            || n.split(/\s+/).filter(w=>w.length>2).some(w=>normalizar(r.claves).includes(w)));
    }
    async function obtener(ruta) {
        if(!vigente())throw new Error('Sesión cerrada.');
        const controlador = new AbortController();consultas.add(controlador); const timer=setTimeout(()=>controlador.abort(),10000);
        try { const r=await fetch(window.apiUrl(ruta),{signal:controlador.signal}); const d=await r.json().catch(()=>({}));
            if(!vigente())throw new Error('Sesión cerrada.');
            if(r.status===401){destruir();throw new Error('Inicia sesión nuevamente.');}
            if(!r.ok)throw new Error(d.mensaje || 'No se pudo consultar el servidor.'); return d;
        } finally {clearTimeout(timer);consultas.delete(controlador);}
    }
    async function responder(texto) {
        const n=normalizar(texto), coincidencias=buscar(texto); enlaces(coincidencias.slice(0,5));
        if (/mi proyecto|proyecto.*tareas|tareas.*proyecto/.test(n)) {
            const [p,t]=await Promise.all([obtener('/api/proyectos'),obtener('/api/tareas')]);
            const proyectos=p.proyectos||[],tareas=t.tareas||[];
            enlaces([rutas[1],rutas[2]]);
            if (!proyectos.length) return 'Tu cuenta todavía no tiene proyectos vinculados. Pide a Administración revisar Alumnos y proyectos y confirmar tu cuenta activa.';
            const pendientes=tareas.filter(t=>normalizar(t.estado)!=='completada');
            return `Puedes consultar ${proyectos.length} proyecto${proyectos.length===1?'':'s'}: ${proyectos.map(p=>p.nombre).slice(0,3).join('; ')}. Hay ${pendientes.length} tareas pendientes de completar en tus proyectos. Abre Mis tareas para consultar responsables, fechas y avances.`;
        }
        if (/asignacion|alumno.*proyecto|proyecto.*alumno/.test(n)) {
            if (window.PMOPermisos?.esAdministradorReal()) {
                enlaces([rutas[13]]);return 'Abre Administración → Alumnos y proyectos. Sincronizar asignaciones vincula los nombres completos coincidentes del PDF. Para los pendientes selecciona la cuenta correcta y pulsa Vincular alumno y tareas pendientes. Las tareas con responsable conservan su asignación.';
            }
            enlaces([rutas[1],rutas[2]]);return 'Tu proyecto y sus tareas aparecen en Proyectos y Mis tareas. Si falta la asignación, Administración debe confirmar tu cuenta en Alumnos y proyectos.';
        }
        if (/\b(hoy|resumen|hacer)\b/.test(n)) {
            const hoy=new Date(),fecha=[hoy.getFullYear(),String(hoy.getMonth()+1).padStart(2,'0'),String(hoy.getDate()).padStart(2,'0')].join('-');
            const ds=await Promise.allSettled([obtener(`/api/registros-horas/mi-asistencia?anio=${hoy.getFullYear()}&mes=${hoy.getMonth()+1}`),obtener('/api/seguimiento-estadia/mi-seguimiento')]);
            const partes=['Tu resumen de hoy:'];
            if(ds[0].status==='fulfilled'){const rs=(ds[0].value.registros||[]).filter(r=>String(r.fecha).slice(0,10)===fecha);partes.push(`• ${rs.reduce((s,r)=>s+(Number(r.horasTrabajadas)||0),0).toFixed(2)} horas registradas hoy. ${rs.some(r=>!r.horaSalida)?'Tienes una jornada abierta.':'Puedes iniciar una jornada desde Control de horas.'}`);}else partes.push('• No pude consultar tus horas. Puedes reintentar.');
            partes.push(ds[1].status==='fulfilled'?(ds[1].value.seguimiento?.foEst03?'• Tu FO-EST-03 está registrado.':'• Tu FO-EST-03 está pendiente de registrar.'):'• No pude consultar tu expediente.');
            enlaces([rutas[8],rutas[5],rutas[2]]);return partes.join('\n');
        }
        if (/graba/.test(n)) {enlaces([{nombre:'Grabaciones',url:'videollamadas.html#grabaciones'},rutas[7]]);return 'Las grabaciones están en Videollamadas → Grabaciones, ordenadas por fecha. Dentro de una sala pulsa Grabar y selecciona esta pestaña con audio. Al detener se guarda el video para verlo después.';}
        if (/compartir.*pantalla|pantalla.*compartir/.test(n)) {enlaces([rutas[6],rutas[7]]);return 'Cualquier participante autorizado puede compartir pantalla. Entra a la sala, pulsa Compartir pantalla y elige una pestaña, ventana o pantalla. El botón cambia a Dejar de compartir mientras está activa. Al detener vuelve tu cámara.';}
        if (/microfono|camara|no.*(oye|escucha|ve)/.test(n)) {enlaces([rutas[7]]);return 'Dentro de la sala los botones indican Micrófono activo o apagado y Cámara encendida o apagada. Pulsa el que quieras activar y permite el acceso en el navegador. Si el permiso está bloqueado, abre el candado junto a la dirección y revisa Cámara y Micrófono. Si Windows dice que está ocupado, cierra otras aplicaciones de llamadas.';}
        if (/periodo|alumnos/.test(n)) {enlaces([rutas[11],rutas[10]]);return 'Administración organiza los expedientes en Enero–Abril, Mayo–Agosto y Septiembre–Diciembre. Se usa el periodo académico registrado; si falta, la fecha de inicio de estadía. Los alumnos sin datos aparecen en Sin periodo.';}
        if (/^(hola|buenos dias|buenas|ayuda|que puedes)/.test(n)) return 'Soy Ard.IA, tu asistente de JJM. Puedo abrir apartados, consultar tu asistencia y ayudarte con tu expediente y las salas. Escribe «llévame a pases de lista» o «cuántas horas tengo este mes».';
        if (/\b(abrir|abre|ir|lleva|acceder|entrar|donde|buscar)\b/.test(n) && coincidencias.length)
            return 'Tienes los accesos debajo. Pulsa el apartado que necesitas para abrirlo directamente.';
        if (!cuenta() || !localStorage.getItem('sesionTokenPMO')) { enlaces([{nombre:'Iniciar sesión',url:'login.html',claves:''}]); return 'Inicia sesión en JJM para consultar tus datos y entrar a las salas.'; }
        if (/horas|asistencia|pase|lista|falta/.test(n)) {
            const hoy=new Date(), d=await obtener(`/api/registros-horas/mi-asistencia?anio=${hoy.getFullYear()}&mes=${hoy.getMonth()+1}`);
            const rs=Array.isArray(d.registros)?d.registros:[], horas=rs.reduce((s,r)=>s+(Number(r.horasTrabajadas)||0),0), dias=new Set(rs.map(r=>String(r.fecha).slice(0,10))).size;
            enlaces([rutas[4],rutas[8]]); return `Este mes tienes ${dias} días con asistencia registrada y ${horas.toFixed(2)} horas. Puedes consultar tus jornadas y descargar el pase de lista desde Mi seguimiento de estadía.`;
        }
        if (/fo.?est|fo est|formato|evaluacion/.test(n)) {
            const d=await obtener('/api/seguimiento-estadia/mi-seguimiento'), s=d.seguimiento||{};
            enlaces([rutas[5],rutas[3]]); return s.foEst03 ? 'Tu evaluación FO-EST-03 ya está registrada. Desde el apartado puedes consultar las entregas y descargar el formato oficial.' : 'Tu evaluación FO-EST-03 está pendiente. Descarga el formato oficial, complétalo y sube tu entrega desde Mi seguimiento de estadía → FO-EST-03.';
        }
        if (/llamada|sala|reunion|proyecto/.test(n)) {
            const d=await obtener('/api/reuniones'), ps=Array.isArray(d.proyectos)?d.proyectos:[];
            enlaces([rutas[6],rutas[7]]);return `La sala general está abierta para todos los usuarios con sesión. Tienes acceso a ${ps.length} salas de proyecto${ps.length ? ': '+ps.slice(0,4).map(p=>p.nombre).join(', ') : ''}. Las salas de proyecto permiten entrar a administración y miembros asignados.`;
        }
        if (coincidencias.length) return 'Puedes abrir esos apartados desde los accesos debajo. También puedo consultar tu asistencia del mes, el estado del FO-EST-03 y las salas disponibles.';
        enlaces([rutas[4],rutas[5],rutas[6],rutas[7]]);return 'Puedo ayudarte a moverte por JJM y consultar tu información. Prueba «mis horas de este mes», «mi FO-EST-03» o «mis salas». Para un problema de acceso, dime qué apartado falla y qué mensaje aparece.';
    }
    async function preguntar(texto) {
        if (!vigente() || ocupado || !texto.trim()) return; gesto=true;ocupado=true; enviar.disabled=true; input.value=''; mensaje(texto,true);estado.textContent='Consultando tu información…';panel.setAttribute('aria-busy','true');
        try { mensaje(await responder(texto)); }
        catch(e) { mensaje(e.name==='AbortError'?'El servidor tardó demasiado. Intenta de nuevo en unos segundos.':e.message+' Puedes usar los accesos rápidos mientras reintentas.'); }
        finally {if(vigente()){ocupado=false;enviar.disabled=false;panel.setAttribute('aria-busy','false');if(!leyendo)estado.textContent='Lista para ayudarte';if(!panel.hidden)input.focus({preventScroll:true});}}
    }
    function abrir(desdeUsuario=true) {if(!vigente())return;panel.hidden=false;boton.setAttribute('aria-expanded','true');if(desdeUsuario){gesto=true;hablar(ultimaRespuesta);}input.focus({preventScroll:true});}
    function cerrar() {panel.hidden=true;boton.setAttribute('aria-expanded','false');window.speechSynthesis?.cancel?.();reconocer?.abort();widget.classList.remove('hablando');boton.focus();}
    function teclado(e){if(!vigente())return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();abrir();}else if(e.key==='Escape'&&!panel.hidden)cerrar();}
    function montar() {
        if(!document.querySelector('link[href^="css/ardia-global.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='css/ardia-global.css?v=20261005-v10';document.head.append(css);}
        widget=document.createElement('div');widget.className='ardia-global';
        widget.innerHTML=`<button class="ardia-lanzador" id="ardia-abrir" type="button" aria-expanded="false" aria-controls="ardia-panel" aria-label="Abrir Ard.IA y accesos rápidos"><span aria-hidden="true">✦</span> Ard.IA <kbd>Ctrl K</kbd></button>
        <section class="ardia-panel" id="ardia-panel" role="dialog" aria-label="Ard.IA y accesos rápidos" hidden><header><div><strong>Ard.IA</strong><small>Tu asistente y accesos rápidos</small></div><button type="button" id="ardia-cerrar" aria-label="Cerrar asistente">×</button></header><div class="ardia-mensajes" id="ardia-mensajes" role="log" aria-live="polite"></div><nav class="ardia-accesos" id="ardia-accesos" aria-label="Accesos sugeridos"></nav><form id="ardia-form"><label class="ardia-sr" for="ardia-input">Pregunta o busca un apartado</label><input id="ardia-input" type="search" name="pmo-assistant-query" autocomplete="off" data-lpignore="true" data-1p-ignore="true" placeholder="Pregunta o busca un apartado…" maxlength="500"><button id="ardia-enviar" type="submit" aria-label="Enviar pregunta">↑</button></form><footer><button id="ardia-voz" type="button" aria-pressed="false">Leer respuestas</button><button id="ardia-mic" type="button" hidden>Dictar</button><span>Ctrl K · Escape para cerrar</span></footer></section>`;
        document.body.append(widget);panel=document.getElementById('ardia-panel');mensajes=document.getElementById('ardia-mensajes');input=document.getElementById('ardia-input');accesos=document.getElementById('ardia-accesos');boton=document.getElementById('ardia-abrir');enviar=document.getElementById('ardia-enviar');
        boton.addEventListener('click',()=>panel.hidden?abrir():cerrar());document.getElementById('ardia-cerrar').addEventListener('click',cerrar);
        document.getElementById('ardia-form').addEventListener('submit',e=>{e.preventDefault();preguntar(input.value);});input.addEventListener('input',()=>enlaces(buscar(input.value).slice(0,6)));
        estado=panel.querySelector('header small');estado.setAttribute('role','status');
        const sugerencias=document.createElement('details');sugerencias.className='ardia-sugerencias';sugerencias.open=true;
        const tituloPreguntas=document.createElement('summary');tituloPreguntas.textContent='Preguntas predeterminadas';sugerencias.append(tituloPreguntas);
        const preguntas=document.createElement('div');preguntas.className='ardia-preguntas';preguntas.setAttribute('aria-label','Preguntas rápidas');
        for(const [titulo,pregunta]of [['Mi día','Mi resumen de hoy'],['Mi proyecto','Mi proyecto y mis tareas'],['Mis horas','Mis horas de este mes'],['Pase de lista','Mi pase de lista'],['FO-EST-03','Mi FO-EST-03'],['Mis salas','Mis salas de videollamadas'],['Compartir pantalla','Cómo compartir pantalla'],['Cámara y micrófono','Cómo activar cámara y micrófono'],['Grabaciones','Dónde veo las grabaciones']]){const b=document.createElement('button');b.type='button';b.textContent=titulo;b.addEventListener('click',()=>preguntar(pregunta));preguntas.append(b);}
        sugerencias.append(preguntas);mensajes.after(sugerencias);
        document.addEventListener('keydown',teclado);window.addEventListener('storage',cambioSesion);window.addEventListener('pmo:sesion-cerrada',destruir);window.addEventListener('pagehide',destruir,{once:true});
        const voz=document.getElementById('ardia-voz');voz.disabled=!window.speechSynthesis||!window.SpeechSynthesisUtterance;
        leyendo=localStorage.getItem(`ardia-voz-${usuario.id}`)==='1';
        const actualizarVoz=()=>{voz.setAttribute('aria-pressed',String(leyendo));voz.textContent=leyendo?'Silenciar voz':'Activar voz';};actualizarVoz();
        voz.addEventListener('click',()=>{if(!vigente())return;gesto=true;leyendo=!leyendo;localStorage.setItem(`ardia-voz-${usuario.id}`,leyendo?'1':'0');actualizarVoz();if(leyendo)hablar(ultimaRespuesta);else window.speechSynthesis?.cancel();});
        const repetir=document.createElement('button');repetir.type='button';repetir.textContent='Escuchar respuesta';repetir.disabled=voz.disabled;voz.after(repetir);
        repetir.addEventListener('click',()=>{if(!vigente())return;gesto=true;leyendo=true;actualizarVoz();hablar(ultimaRespuesta);});
        const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
        if(SR){const mic=document.getElementById('ardia-mic');mic.hidden=false;mic.textContent='Hablar';mic.setAttribute('aria-pressed','false');reconocer=new SR();reconocer.lang='es-MX';reconocer.continuous=false;reconocer.interimResults=false;reconocer.onresult=e=>{if(vigente()&&!panel.hidden)preguntar(e.results[0][0].transcript);};reconocer.onend=()=>{escuchando=false;mic.textContent='Hablar';mic.setAttribute('aria-pressed','false');};reconocer.onerror=e=>{if(e.error!=='aborted')mensaje('No se pudo usar el micrófono. Revisa el permiso del navegador o escribe tu pregunta.');};mic.addEventListener('click',()=>{if(!vigente()||ocupado)return;if(escuchando){reconocer.stop();return;}gesto=true;window.speechSynthesis?.cancel();try{reconocer.start();escuchando=true;mic.textContent='Dejar de escuchar';mic.setAttribute('aria-pressed','true');estado.textContent='Te escucho…';}catch(_){estado.textContent='Espera un momento y pulsa Hablar otra vez.';}});}
        mensaje(`Hola, ${usuario.nombreCompleto||usuario.nombre||'bienvenido'}. Soy Ard.IA. Ya estás dentro de JJM. Puedo consultar tus horas, tu seguimiento y tus salas, o llevarte al apartado que necesitas. Pulsa Escuchar respuesta para oírme.`);enlaces(buscar(''));estado.textContent='Lista para ayudarte';
        window.PMOArdia={abrir,cerrar,preguntar};
        if(sessionStorage.getItem('ardia-bienvenida')===String(usuario.id)){sessionStorage.removeItem('ardia-bienvenida');abrir(false);}
    }
    async function iniciar(){token=localStorage.getItem('sesionTokenPMO');if(!token||typeof window.restaurarSesionPMO!=='function')return;usuario=await window.restaurarSesionPMO();if(!usuario?.id||localStorage.getItem('sesionTokenPMO')!==token)return;montar();}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
