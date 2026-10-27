(() => {
 'use strict';
 const el=id=>document.getElementById(id);
 async function api(method,body){const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);try{const r=await fetch(window.apiUrl('/api/avisos-moviles'),{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:c.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.mensaje||'No se pudo registrar el dispositivo.');return d;}finally{clearTimeout(t);}}
 function clave(s){const raw=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
 async function activar(){const b=el('activarAvisosMoviles'),estado=el('estadoAvisosMoviles');b.disabled=true;
  try{if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('Este navegador no admite avisos. En iPhone agrega primero esta página a la pantalla de inicio y ábrela desde allí.');
   const permiso=await Notification.requestPermission();if(permiso!=='granted')throw Error('Activa el permiso de notificaciones de este sitio en los ajustes del navegador.');
   estado.textContent='Registrando este dispositivo…';const d=await api('GET');await navigator.serviceWorker.register('/avisos-sw.js',{scope:'/'});const reg=await navigator.serviceWorker.ready;
   const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:clave(d.clavePublica)});
   const respuesta=await api('POST',sub.toJSON());estado.textContent=respuesta.mensaje+' Lunes a viernes a las 7:00 a. m., hora de Ciudad de México.';el('desactivarAvisosMoviles').hidden=false;
  }catch(e){estado.textContent=e.name==='AbortError'?'El servidor tardó demasiado. Reintenta.':e.message;}finally{b.disabled=false;}
 }
 async function desactivar(){const b=el('desactivarAvisosMoviles');b.disabled=true;try{const reg=await navigator.serviceWorker.getRegistration('/'),sub=await reg?.pushManager.getSubscription();if(sub){await api('DELETE',{endpoint:sub.endpoint});await sub.unsubscribe();}el('estadoAvisosMoviles').textContent='Avisos desactivados en este dispositivo.';b.hidden=true;}catch(e){el('estadoAvisosMoviles').textContent=e.message;}finally{b.disabled=false;}}
 document.addEventListener('DOMContentLoaded',()=>{el('activarAvisosMoviles')?.addEventListener('click',activar);el('desactivarAvisosMoviles')?.addEventListener('click',desactivar);});
})();
