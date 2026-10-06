(() => {
    'use strict';
    const MAX=512*1024*1024,PARTE=4*1024*1024;
    const texto=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const fecha=v=>new Intl.DateTimeFormat('es-MX',{dateStyle:'long',timeZone:'America/Mexico_City'}).format(new Date(v));
    const llamadas=new Set();let datos=[],version=0,urlVideo=null,anterior=null;
    async function api(ruta,opciones={}) {
        const token=localStorage.getItem('sesionTokenPMO');if(!token)throw new Error('Inicia sesión para consultar los videos.');
        const c=new AbortController();llamadas.add(c);const timer=setTimeout(()=>c.abort(),60000);
        try{const r=await fetch(window.apiUrl(ruta),{...opciones,signal:c.signal});if(localStorage.getItem('sesionTokenPMO')!==token)throw new Error('Tu sesión cambió.');
            if(!r.ok){const d=await r.json().catch(()=>({}));const e=new Error(d.mensaje||d.detail||`No se pudo guardar o consultar el video (HTTP ${r.status}).`);e.status=r.status;throw e;}return r;
        }finally{clearTimeout(timer);llamadas.delete(c);}
    }
    async function subir(blob,meta,progreso=()=>{}) {
        if(!blob.size||blob.size>MAX)throw new Error('Cada grabación admite hasta 512 MB. Conserva la copia descargada.');
        const inicio=await (await api('/api/grabaciones/cargas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sala:String(meta.sala),titulo:meta.titulo})})).json();
        let parte=0;
        for(let offset=0;offset<blob.size;offset+=PARTE,parte++){
            const trozo=blob.slice(offset,offset+PARTE);
            const enviar=()=>api(`/api/grabaciones/cargas/${encodeURIComponent(inicio.id)}?parte=${parte}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:trozo});
            try{await enviar();}catch(e){if(e.status&&e.status<500)throw e;await enviar();}
            progreso(Math.min(100,Math.round((offset+trozo.size)/blob.size*100)));
        }
        const finalizar=()=>api(`/api/grabaciones/cargas/${encodeURIComponent(inicio.id)}/finalizar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({duracionSegundos:Math.max(0,Math.round(meta.duracionSegundos||0))})});
        let respuesta;try{respuesta=await finalizar();}catch(e){if(e.status&&e.status<500)throw e;respuesta=await finalizar();}
        const d=await respuesta.json();
        return d.grabacion;
    }
    function destinoSala(){const el=document.querySelector('[data-grabaciones-sala]');return el?.dataset.grabacionesSala||'';}
    async function cargar() {
        const cont=document.getElementById('grabacionesServidor');if(!cont)return;
        const actual=++version;cont.setAttribute('aria-busy','true');
        try{const sala=destinoSala(),d=await (await api('/api/grabaciones'+(sala?'?sala='+encodeURIComponent(sala):''))).json();if(actual!==version)return;datos=Array.isArray(d.grabaciones)?d.grabaciones:[];filtros();renderizar();}
        catch(e){if(actual===version){cont.replaceChildren();const p=document.createElement('p');p.className='pmo-message error';p.textContent=e.message;cont.append(p);}}
        finally{if(actual===version)cont.setAttribute('aria-busy','false');}
    }
    function filtros(){
        const mes=document.getElementById('mesGrabaciones');if(!mes)return;const elegido=mes.value;
        const meses=[...new Set(datos.map(d=>d.fecha.slice(0,7)))].sort().reverse();
        mes.innerHTML='<option value="">Todas las fechas</option>'+meses.map(m=>`<option value="${texto(m)}">${texto(new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-15T12:00:00Z')))}</option>`).join('');
        if(meses.includes(elegido))mes.value=elegido;
    }
    function renderizar(){
        const cont=document.getElementById('grabacionesServidor');if(!cont)return;const mes=document.getElementById('mesGrabaciones')?.value||'',sala=document.getElementById('tipoGrabaciones')?.value||'';
        const lista=datos.filter(d=>(!mes||d.fecha.startsWith(mes))&&(!sala||(sala==='general'?d.sala==='general':d.sala!=='general'))).sort((a,b)=>b.fecha.localeCompare(a.fecha));
        const grupos=new Map();for(const d of lista){const dia=fecha(d.fecha);if(!grupos.has(dia))grupos.set(dia,[]);grupos.get(dia).push(d);}
        cont.innerHTML=[...grupos].map(([dia,rs],i)=>`<details class="grabacion-fecha" ${i===0?'open':''}><summary>${texto(dia)} <span>${rs.length} ${rs.length===1?'video':'videos'}</span></summary><div class="grabacion-grid">${rs.map(d=>`<article class="grabacion-card"><span class="grabacion-icon" aria-hidden="true">▶</span><div><strong>${texto(d.titulo)}</strong><small>${d.sala==='general'?'Sala general':'Sala de proyecto'} · ${texto(new Date(d.fecha).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',timeZone:'America/Mexico_City'}))}</small><small>${(d.bytes/1024/1024).toFixed(1)} MB · ${Math.floor(d.duracionSegundos/60)} min ${d.duracionSegundos%60} s</small></div><div class="grabacion-acciones"><button class="pmo-button" type="button" data-ver-video="${texto(d.id)}">Ver video</button><button class="pmo-button secondary" type="button" data-descargar-video="${texto(d.id)}">Descargar</button></div></article>`).join('')}</div></details>`).join('')||'<div class="pmo-empty">Aquí aparecerán las grabaciones guardadas de tus salas. Inicia una videollamada y pulsa Grabar.</div>';
        cont.querySelectorAll('[data-ver-video]').forEach(b=>b.addEventListener('click',()=>abrir(b.dataset.verVideo,b,false)));
        cont.querySelectorAll('[data-descargar-video]').forEach(b=>b.addEventListener('click',()=>abrir(b.dataset.descargarVideo,b,true)));
    }
    function cerrar(){version++;const dialog=document.getElementById('reproductorGrabacion'),video=dialog?.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();}if(urlVideo){URL.revokeObjectURL(urlVideo);urlVideo=null;}dialog?.close();anterior?.focus();}
    async function abrir(id,boton,descargar){
        const d=datos.find(v=>v.id===id);if(!d)return;const textoBoton=boton.textContent;boton.disabled=true;boton.textContent='Cargando…';const actual=++version;
        try{const r=await api(`/api/grabaciones/${encodeURIComponent(id)}/video`),blob=await r.blob();if(actual!==version)return;
            if(descargar){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`JJM_${d.fecha.slice(0,10)}_${d.id}.webm`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
            else {cerrar();urlVideo=URL.createObjectURL(blob);anterior=boton;const dialog=document.getElementById('reproductorGrabacion');dialog.querySelector('h2').textContent=d.titulo;dialog.querySelector('video').src=urlVideo;dialog.showModal();}
        }catch(e){const aviso=document.getElementById('avisoGrabaciones');if(aviso){aviso.hidden=false;aviso.textContent=e.message;}}
        finally{boton.disabled=false;boton.textContent=textoBoton;}
    }
    function preparar(){
        if(!document.getElementById('grabacionesServidor'))return;
        const dialog=document.createElement('dialog');dialog.id='reproductorGrabacion';dialog.className='grabacion-dialog';dialog.innerHTML='<header><h2>Grabación</h2><button type="button" aria-label="Cerrar grabación">×</button></header><video controls playsinline preload="metadata"></video>';
        document.body.append(dialog);dialog.querySelector('button').addEventListener('click',cerrar);dialog.addEventListener('cancel',e=>{e.preventDefault();cerrar();});
        document.getElementById('actualizarGrabaciones')?.addEventListener('click',cargar);document.getElementById('mesGrabaciones')?.addEventListener('change',renderizar);document.getElementById('tipoGrabaciones')?.addEventListener('change',renderizar);
        cargar();
    }
    function limpiar(){version++;llamadas.forEach(c=>c.abort());cerrar();datos=[];document.getElementById('grabacionesServidor')?.replaceChildren();}
    window.addEventListener('pagehide',limpiar);window.addEventListener('pmo:sesion-cerrada',limpiar);
    window.addEventListener('storage',e=>{if(e.key==='sesionTokenPMO'||e.key===null)limpiar();});
    window.PMOGrabaciones={subir,cargar,preparar};
    document.addEventListener('DOMContentLoaded',async()=>{const u=await window.restaurarSesionPMO?.();if(u&&document.querySelector('[data-grabaciones-auto="false"]')===null)preparar();},{once:true});
})();
