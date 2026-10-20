(() => {
 'use strict';
 const el=id=>document.getElementById(id),proyecto=Number(new URLSearchParams(location.search).get('id'));
 const token=localStorage.getItem('sesionTokenPMO');let miembros=[],ocupada=false;
 async function pedir(ruta,opciones={}){
  if(localStorage.getItem('sesionTokenPMO')!==token)throw Error('Tu sesión cambió. Vuelve a entrar al proyecto.');
  const c=new AbortController(),limite=setTimeout(()=>c.abort(),110000);
  try{const r=await fetch(window.apiUrl(ruta),{...opciones,signal:c.signal});const d=await r.json().catch(()=>({}));
   if(localStorage.getItem('sesionTokenPMO')!==token)throw Error('Tu sesión cambió. Vuelve a entrar al proyecto.');
   if(!r.ok)throw Error(d.mensaje||d.detail||'No se pudo completar la operación.');return d;
  }finally{clearTimeout(limite);}
 }
 const base=`/api/canales/proyectos/${proyecto}/plan-ia`;
 function campo(form,titulo,tipo,valor,max){const l=document.createElement('label');l.textContent=titulo;const c=document.createElement(tipo==='textarea'?'textarea':'input');if(tipo!=='textarea')c.type=tipo;c.value=valor??'';if(max)c.maxLength=max;c.required=true;l.append(c);form.append(l);return c;}
 function mostrar(plan){
  const cont=el('propuestaIa');cont.replaceChildren();const h=document.createElement('h2');h.textContent=plan.objetivo;cont.append(h);
  const nota=document.createElement('p');nota.textContent='Estas tareas aún no están guardadas. Las horas son estimaciones; no se suman a la asistencia.';cont.append(nota);
  for(const t of plan.tareas){
   const form=document.createElement('form');
   const titulo=campo(form,'Título','text',t.titulo,200),descripcion=campo(form,'Descripción y entregable','textarea',`${t.descripcion}\nEntregable: ${t.entregable}\nAceptación: ${t.criterioAceptacion}`,4000),horas=campo(form,'Horas estimadas','number',t.horasEstimadas);horas.min='1';horas.max='80';horas.step='1';
   const l=document.createElement('label');l.textContent='Responsable';const responsable=document.createElement('select');responsable.required=true;
   const vacia=document.createElement('option');vacia.value='';vacia.textContent='Selecciona un integrante';responsable.append(vacia);
   for(const m of miembros){if(m.miembroEstado!=='Activo')continue;const o=document.createElement('option');o.value=m.idMiembro;o.textContent=m.miembroNombre;responsable.append(o);}l.append(responsable);form.append(l);
   const boton=document.createElement('button');boton.type='submit';boton.textContent='Guardar esta tarea';const estado=document.createElement('p');estado.setAttribute('role','status');form.append(boton,estado);
   form.addEventListener('submit',async e=>{e.preventDefault();if(boton.disabled||ocupada)return;boton.disabled=true;ocupada=true;el('generarIa').disabled=true;
    try{await pedir('/api/tareas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idProyecto:proyecto,idMiembroAsignado:Number(responsable.value),titulo:titulo.value.trim(),descripcion:descripcion.value.trim(),horasEstimadas:Number(horas.value),horasRegistradas:0,estado:'Pendiente',prioridad:'Media'})});estado.textContent='Tarea guardada en el proyecto.';for(const c of form.querySelectorAll('input,textarea,select'))c.disabled=true;boton.textContent='Guardada';
    }catch(error){estado.textContent=error.message+' Revisa Mis tareas antes de volver a guardar si la conexión se interrumpió.';boton.disabled=false;}finally{ocupada=false;el('generarIa').disabled=false;}
   });cont.append(form);
  }
  if(plan.riesgos?.length){const h=document.createElement('h2');h.textContent='Puntos que debes revisar';const lista=document.createElement('ul');for(const riesgo of plan.riesgos){const li=document.createElement('li');li.textContent=riesgo;lista.append(li);}cont.append(h,lista);}
 }
 el('generarPlan').addEventListener('submit',async e=>{e.preventDefault();if(ocupada)return;if(el('propuestaIa').children.length&&!confirm('¿Reemplazar la propuesta visible? Las tareas ya guardadas se conservan.'))return;ocupada=true;el('generarIa').disabled=true;el('estadoIa').textContent='Preparando propuesta en el servidor. Puede tardar alrededor de un minuto…';
  try{const plan=await pedir(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({objetivo:el('objetivoIa').value})});mostrar(plan);el('estadoIa').textContent='Propuesta lista para revisar.';}catch(error){el('estadoIa').textContent=error.name==='AbortError'?'La propuesta tardó demasiado. Intenta con un objetivo más pequeño.':error.message;}finally{ocupada=false;el('generarIa').disabled=false;}
 });
 (async()=>{try{if(!token||!Number.isInteger(proyecto)||proyecto<1)throw Error('Entra a Plan con IA desde uno de tus proyectos.');el('volverProyecto').href=`canales-proyectos.html?id=${proyecto}`;const c=await pedir(base);el('configuracionIa').textContent=c.mensaje;if(!c.configurada)return;const m=await pedir(`/api/miembros-proyecto/proyecto/${proyecto}`);miembros=m.miembros||[];el('generarIa').disabled=false;}catch(e){el('configuracionIa').textContent=e.message;}})();
})();
