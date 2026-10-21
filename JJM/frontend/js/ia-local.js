(() => {
'use strict';
async function consultar(datos){
 const token=localStorage.getItem('sesionTokenPMO');if(!token)throw Error('Inicia sesión para usar la IA.');
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),110000);
 try{const r=await fetch(window.apiUrl('/api/ia-local'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(datos),signal:abort.signal});const d=await r.json();
 if(token!==localStorage.getItem('sesionTokenPMO'))throw Error('La sesión cambió. Vuelve a consultar.');
 if(!r.ok)throw Error(d.mensaje||'No se pudo consultar Ollama.');return d;
 }finally{clearTimeout(timer);}
}
function abrir(tipo='asistente',contexto={}){
 const dialogo=document.createElement('dialog');dialogo.className='ia-local-dialogo';dialogo.setAttribute('aria-label','Ayuda con IA local');
 const titulo=document.createElement('h2');titulo.textContent=tipo==='reunion'?'Resumen del chat con Ard.IA':tipo==='reporte'?'Borrador de reporte con Ard.IA':'Ayuda con Ard.IA';
 const aviso=document.createElement('p');aviso.textContent=tipo==='reunion'?'Se resumen los mensajes disponibles del chat, no el audio ni los archivos. Revisa acuerdos y tareas antes de usarlos.':'Describe los datos reales. La IA propone un borrador; tú decides qué usar.';
 const etiqueta=document.createElement('label');etiqueta.textContent='¿Qué necesitas?';const entrada=document.createElement('textarea');entrada.maxLength=4000;entrada.value=contexto.texto||(tipo==='reunion'?'Resume el chat e identifica acuerdos, tareas propuestas y pendientes.':'');etiqueta.append(entrada);
 const generar=document.createElement('button');generar.textContent='Generar con IA local';const cerrar=document.createElement('button');cerrar.textContent='Cerrar';cerrar.onclick=()=>dialogo.close();
 const resultado=document.createElement('pre');resultado.setAttribute('role','status');
 const copiar=document.createElement('button');copiar.textContent='Copiar borrador';copiar.hidden=true;copiar.onclick=async()=>{try{await navigator.clipboard.writeText(resultado.textContent);copiar.textContent='Copiado';}catch(_){copiar.textContent='Selecciona y copia el texto';}};
 generar.onclick=async()=>{if(!entrada.value.trim()){entrada.focus();return;}generar.disabled=true;copiar.hidden=true;resultado.textContent='Preparando borrador en tu servidor…';
 try{const d=await consultar({tipo,texto:entrada.value,sala:contexto.sala,conexion:contexto.conexion});if(!dialogo.isConnected)return;resultado.textContent=d.aviso+'\n\n'+d.respuesta;copiar.hidden=false;}
 catch(e){resultado.textContent=e.name==='AbortError'?'La IA tardó demasiado. Reintenta con menos contenido.':e.message;}finally{generar.disabled=false;}};
 dialogo.append(titulo,aviso,etiqueta,generar,cerrar,resultado,copiar);document.body.append(dialogo);dialogo.addEventListener('close',()=>dialogo.remove());dialogo.showModal();entrada.focus();
}
window.PMOIALocal={consultar,abrir};
function montar(){const form=document.getElementById('formReporteDiario');if(form&&!document.getElementById('iaReporte')){const b=document.createElement('button');b.id='iaReporte';b.type='button';b.className='pmo-button secondary';b.textContent='Preparar borrador con IA';b.onclick=()=>abrir('reporte',{texto:['actividadReporteDiario','resultadoReporteDiario','bloqueosReporteDiario'].map(id=>document.getElementById(id)?.value||'').filter(Boolean).join('\n').slice(0,4000)});form.before(b);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',montar);else montar();
})();
