(function(){
    'use strict';
    if(window.parent!==window||window.__avisosReuniones)return;window.__avisosReuniones=true;
    let pendiente=false,lista=[],usuarioAnterior='',tokenAnterior='',timer,panel,boton,capa;
    const el=(tipo,texto)=>{const e=document.createElement(tipo);if(texto)e.textContent=texto;return e;};
    function limpiar(){capa?.__pmoMovible?.destruir();capa?.remove();capa=panel=boton=null;lista=[];}
    function preparar(){
        if(capa)return;
        const estilo=el('style');estilo.textContent='.pmo-reuniones-avisos{position:fixed;z-index:180;right:18px;top:86px;font:13px Segoe UI,sans-serif;color:#edf4ff}.pmo-reuniones-avisos button{font:inherit;cursor:pointer;background:#1e4d9a;color:white;border:1px solid #7da3e0;border-radius:9px;padding:9px 13px}.pmo-reuniones-panel{width:min(330px,calc(100vw - 32px));max-height:60vh;overflow:auto;border:1px solid #536e98;background:#10233e;padding:14px;border-radius:12px;box-shadow:0 12px 35px #0007;margin-top:7px}.pmo-reuniones-panel[hidden]{display:none!important}.pmo-reuniones-panel article{border-top:1px solid #385477;padding:12px 0;display:flex;flex-direction:column;gap:8px}.pmo-reuniones-panel h2{font-size:16px;margin:0 0 10px}.pmo-reuniones-panel p{line-height:1.4;margin:0}.pmo-reuniones-panel .pmo-aviso-leer{background:#1a334f}.pmo-reuniones-panel .pmo-permiso{width:100%;margin:10px 0}.pmo-reuniones-panel small{color:#bed0e9;line-height:1.5;display:block}';document.head.append(estilo);
        capa=el('div');capa.className='pmo-reuniones-avisos';boton=el('button','🔔 Avisos');boton.type='button';boton.setAttribute('aria-expanded','false');boton.setAttribute('aria-controls','pmoAvisosReunionesPanel');
        panel=el('section');panel.id='pmoAvisosReunionesPanel';panel.className='pmo-reuniones-panel';panel.hidden=true;capa.append(boton,panel);document.body.append(capa);boton.addEventListener('click',()=>{panel.hidden=!panel.hidden;boton.setAttribute('aria-expanded',String(!panel.hidden));pintar();});
        const movible={id:'avisos',capa,boton,panel,idUsuario:usuarioAnterior};if(window.PMOWidgetsMovibles)window.PMOWidgetsMovibles.vincular(movible);else (window.PMOWidgetsMoviblesPendientes ||= []).push(movible);
    }
    function clave(){return 'pmoReunionesVistas:'+usuarioAnterior;}
    function pintar(){
        if(!panel)return;boton.textContent='🔔 Avisos'+(lista.length?` · ${lista.length}`:'');panel.replaceChildren(el('h2','Reuniones y entregas'));
        if(!lista.length)panel.append(el('p','No tienes avisos pendientes.'));
        for(const dato of lista){
            if(dato.entrega){const item=el('article'),titulo=el('strong',dato.titulo),texto=el('p',dato.descripcion),abrir=el('a','Abrir seguimiento ↗'),visto=el('button','Marcar como leído');abrir.href=/^canales-proyectos\.html\?id=\d+#diario$/.test(dato.enlace)?dato.enlace:'automatizaciones.html';visto.type='button';visto.className='pmo-aviso-leer';visto.addEventListener('click',async()=>{visto.disabled=true;try{const r=await fetch(window.apiUrl(`/api/automatizaciones/recordatorios/${Number(dato.idAviso)}/leido`),{method:'POST'});if(!r.ok)throw Error();lista=lista.filter(a=>a.id!==dato.id);pintar();}catch(_){visto.textContent='No se guardó. Reintentar';}finally{visto.disabled=false;}});item.append(titulo,texto,abrir,visto);panel.append(item);continue;}
            const item=el('article'),titulo=el('strong',dato.proyecto || 'Proyecto'),texto=el('p',dato.titulo||'Reunión activa'),unir=el('button','Unirme'),visto=el('button','Marcar como leído');unir.type=visto.type='button';visto.className='pmo-aviso-leer';
            unir.addEventListener('click',()=>{const id=Number(dato.idProyecto),reunion=Number(dato.idReunion);if(Number.isSafeInteger(id)&&id>0&&Number.isSafeInteger(reunion)&&reunion>0)window.abrirSalaPMO(`reunion.html?id=${id}&reunion=${reunion}`);});
            visto.addEventListener('click',async()=>{visto.disabled=true;try{const r=await fetch(window.apiUrl(`/api/reuniones/avisos/${Number(dato.id)}/leido`),{method:'POST'});if(r.ok){lista=lista.filter(a=>a.id!==dato.id);pintar();}else visto.textContent='No se guardó. Reintentar';}catch(_){visto.textContent='No se guardó. Reintentar';}finally{visto.disabled=false;}});item.append(titulo,texto,unir,visto);panel.append(item);
        }
        if(window.Notification){
            const activadas=Notification.permission==='granted'&&localStorage.getItem('pmoReunionesNavegador:'+usuarioAnterior)==='si';
            const permiso=el('button',activadas?'Notificaciones del navegador activadas':'Activar notificaciones del navegador');permiso.className='pmo-permiso';permiso.type='button';permiso.disabled=activadas;
            permiso.addEventListener('click',async()=>{const p=await Notification.requestPermission();localStorage.setItem('pmoReunionesNavegador:'+usuarioAnterior,p==='granted'?'si':'no');pintar();});panel.append(permiso);
        }
        panel.append(el('small','Se revisan cada 15 segundos mientras la Oficina está abierta. Al volver a entrar aparecen las reuniones que siguen activas.'));
        capa.__pmoMovible?.actualizar();
    }
    function nueva(dato){
        if(window.Notification && Notification.permission==='granted' && localStorage.getItem('pmoReunionesNavegador:'+usuarioAnterior)==='si'){
            try{const aviso=new Notification(dato.entrega?'Entrega pendiente en JJM':'Nueva reunión de proyecto',{body:dato.entrega?String(dato.titulo)+' · '+String(dato.descripcion):String(dato.proyecto||'Tu proyecto')+' · '+String(dato.titulo||'La reunión está abierta'),tag:'jjm-aviso-'+dato.id});aviso.onclick=()=>{window.focus();panel.hidden=false;pintar();aviso.close();};}catch(_){}
        }
    }
    async function actualizar(){
        const token=window.obtenerTokenSesionPMO?.();if(!token){limpiar();return;}if(pendiente)return;
        let u;try{u=JSON.parse(localStorage.getItem('usuarioActivo')||'null');}catch(_){limpiar();return;}if(!u?.id){limpiar();return;}
        if(usuarioAnterior!==String(u.id)||tokenAnterior!==token){limpiar();usuarioAnterior=String(u.id);tokenAnterior=token;}
        const rol=String(u.rol?.nombre||u.rol||'').toLowerCase();if(rol==='empresa'){limpiar();return;}
        pendiente=true;const controlador=new AbortController(),limite=setTimeout(()=>controlador.abort(),10000);
        try{
            const r=await fetch(window.apiUrl('/api/reuniones/mis-avisos'),{signal:controlador.signal});if(!r.ok)return;const d=await r.json();if(token!==window.obtenerTokenSesionPMO())return;
            let entregas=[];try{const er=await fetch(window.apiUrl('/api/automatizaciones/mis-recordatorios'),{signal:controlador.signal});if(er.ok){const ed=await er.json();entregas=(ed.recordatorios||[]).filter(a=>String(a.clave||'').startsWith('diario-')&&a.estado==='Abierto').map(a=>({...a,idAviso:a.id,id:'entrega-'+a.id,entrega:true}));}}catch(_){}if(token!==window.obtenerTokenSesionPMO())return;preparar();lista=[...(Array.isArray(d.avisos)?d.avisos:[]),...entregas];let vistos;try{vistos=JSON.parse(localStorage.getItem(clave())||'[]');}catch(_){vistos=[];}if(!Array.isArray(vistos))vistos=[];
            const nuevos=lista.filter(a=>!vistos.includes(a.id));for(const a of nuevos)nueva(a);
            if(nuevos.length){panel.hidden=false;boton.setAttribute('aria-expanded','true');}
            localStorage.setItem(clave(),JSON.stringify([...new Set([...vistos,...lista.map(a=>a.id)])].slice(-500)));pintar();
        }catch(_){}finally{pendiente=false;clearTimeout(limite);}
    }
    window.PMOAvisosReuniones={actualizar};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',actualizar);else actualizar();timer=setInterval(actualizar,15000);
    window.addEventListener('storage',e=>{if(e.key===null||e.key==='sesionTokenPMO'||e.key==='usuarioActivo')limpiar();});
    window.addEventListener('pmo:sesion-cerrada',limpiar);
})();
