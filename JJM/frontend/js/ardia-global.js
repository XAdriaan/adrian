(() => {
    'use strict';
    if (window.PMOArdia) return;
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
        {nombre:'Cursos',url:'cursos.html',claves:'cursos recursos aprender'}
    ];
    let panel, mensajes, input, accesos, boton, enviar, reconocer, leyendo = false, ocupado = false;
    function cuenta() { try { return JSON.parse(localStorage.getItem('usuarioActivo') || 'null'); } catch (_) { return null; } }
    function mensaje(texto, propia = false) {
        const div = document.createElement('div'); div.className = 'ardia-mensaje' + (propia?' propio':'');
        div.textContent = texto; mensajes.append(div); mensajes.scrollTop = mensajes.scrollHeight;
        if (!propia && leyendo && window.speechSynthesis) { speechSynthesis.cancel(); const voz = new SpeechSynthesisUtterance(texto); voz.lang='es-MX'; speechSynthesis.speak(voz); }
    }
    function enlaces(lista) {
        accesos.replaceChildren();
        for (const r of lista) { const a = document.createElement('a'); a.href=r.url; a.textContent=r.nombre+' ↗'; accesos.append(a); }
    }
    function buscar(texto) {
        const n=normalizar(texto).trim();
        return !n ? [rutas[4],rutas[5],rutas[6],rutas[7]] : rutas.filter(r=>normalizar(r.nombre+' '+r.claves).includes(n)
            || n.split(/\s+/).filter(w=>w.length>2).some(w=>normalizar(r.claves).includes(w)));
    }
    async function obtener(ruta) {
        const controlador = new AbortController(); const timer=setTimeout(()=>controlador.abort(),10000);
        try { const r=await fetch(window.apiUrl(ruta),{signal:controlador.signal}); const d=await r.json().catch(()=>({}));
            if(!r.ok)throw new Error(d.mensaje || 'No se pudo consultar el servidor.'); return d;
        } finally {clearTimeout(timer);}
    }
    async function responder(texto) {
        const n=normalizar(texto), coincidencias=buscar(texto); enlaces(coincidencias.slice(0,5));
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
        if (ocupado || !texto.trim()) return; ocupado=true; enviar.disabled=true; input.value=''; mensaje(texto,true);
        try { mensaje(await responder(texto)); }
        catch(e) { mensaje(e.name==='AbortError'?'El servidor tardó demasiado. Intenta de nuevo en unos segundos.':e.message+' Puedes usar los accesos rápidos mientras reintentas.'); }
        finally {ocupado=false;enviar.disabled=false;input.focus();}
    }
    function abrir() {panel.hidden=false;boton.setAttribute('aria-expanded','true');input.focus();}
    function cerrar() {panel.hidden=true;boton.setAttribute('aria-expanded','false');window.speechSynthesis?.cancel?.();reconocer?.stop();boton.focus();}
    function montar() {
        const css=document.createElement('link');css.rel='stylesheet';css.href='css/ardia-global.css?v=20261005-diseno-v8';document.head.append(css);
        const widget=document.createElement('div');widget.className='ardia-global';
        widget.innerHTML=`<button class="ardia-lanzador" id="ardia-abrir" type="button" aria-expanded="false" aria-controls="ardia-panel" aria-label="Abrir Ard.IA y accesos rápidos"><span aria-hidden="true">✦</span> Ard.IA <kbd>Ctrl K</kbd></button>
        <section class="ardia-panel" id="ardia-panel" role="dialog" aria-label="Ard.IA y accesos rápidos" hidden><header><div><strong>Ard.IA</strong><small>Tu asistente y accesos rápidos</small></div><button type="button" id="ardia-cerrar" aria-label="Cerrar asistente">×</button></header><div class="ardia-mensajes" id="ardia-mensajes" role="log" aria-live="polite"></div><nav class="ardia-accesos" id="ardia-accesos" aria-label="Accesos sugeridos"></nav><form id="ardia-form"><label class="ardia-sr" for="ardia-input">Pregunta o busca un apartado</label><input id="ardia-input" type="search" name="pmo-assistant-query" autocomplete="off" data-lpignore="true" data-1p-ignore="true" placeholder="Pregunta o busca un apartado…" maxlength="500"><button id="ardia-enviar" type="submit" aria-label="Enviar pregunta">↑</button></form><footer><button id="ardia-voz" type="button" aria-pressed="false">Leer respuestas</button><button id="ardia-mic" type="button" hidden>Dictar</button><span>Ctrl K · Escape para cerrar</span></footer></section>`;
        document.body.append(widget);panel=document.getElementById('ardia-panel');mensajes=document.getElementById('ardia-mensajes');input=document.getElementById('ardia-input');accesos=document.getElementById('ardia-accesos');boton=document.getElementById('ardia-abrir');enviar=document.getElementById('ardia-enviar');
        boton.addEventListener('click',()=>panel.hidden?abrir():cerrar());document.getElementById('ardia-cerrar').addEventListener('click',cerrar);
        document.getElementById('ardia-form').addEventListener('submit',e=>{e.preventDefault();preguntar(input.value);});input.addEventListener('input',()=>enlaces(buscar(input.value).slice(0,6)));
        document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();abrir();}else if(e.key==='Escape'&&!panel.hidden)cerrar();});
        const voz=document.getElementById('ardia-voz');voz.disabled=!window.speechSynthesis;
        voz.addEventListener('click',()=>{leyendo=!leyendo;voz.setAttribute('aria-pressed',String(leyendo));voz.textContent=leyendo?'Silenciar voz':'Leer respuestas';if(!leyendo)window.speechSynthesis?.cancel();});
        const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
        if(SR){const mic=document.getElementById('ardia-mic');mic.hidden=false;reconocer=new SR();reconocer.lang='es-MX';reconocer.onresult=e=>{input.value=e.results[0][0].transcript;enlaces(buscar(input.value).slice(0,6));input.focus();};reconocer.onend=()=>{mic.textContent='Dictar';};reconocer.onerror=()=>mensaje('No se pudo usar el micrófono. Revisa el permiso del navegador o escribe tu pregunta.');mic.addEventListener('click',()=>{try{reconocer.start();mic.textContent='Escuchando…';}catch(_){reconocer.stop();}});}
        mensaje('Hola. Puedes buscar cualquier apartado o preguntarme por tu asistencia, FO-EST-03 y videollamadas.');enlaces(buscar(''));
        window.PMOArdia={abrir,cerrar};
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',montar,{once:true});else montar();
})();
