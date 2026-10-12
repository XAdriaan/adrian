(function(){
    const el=id=>document.getElementById(id),escapar=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let pendiente=false,habilitado=false;
    async function api(ruta,opciones={}){const controlador=new AbortController(),limite=setTimeout(()=>controlador.abort(),60000);try{const r=await fetch(window.apiUrl(ruta),{...opciones,signal:controlador.signal}),d=await r.json();if(!r.ok)throw new Error(d.mensaje||d.detail||d.message||'No se pudo completar la regularización.');return d;}finally{clearTimeout(limite);}}
    function error(e){el('regularizacionError').hidden=false;el('regularizacionError').textContent=e.name==='AbortError'?'El servidor tardó en responder. Actualiza esta página para comprobar el resultado antes de repetir la operación.':e.message;}
    async function cargar(){
        el('regularizacionAplicar').disabled=true;habilitado=false;
        try{const d=await api('/api/regularizacion-horas'),alumnos=Array.isArray(d.alumnos)?d.alumnos:[];
            el('regularizacionFilas').innerHTML=alumnos.length?alumnos.map(a=>`<tr><td>${escapar(a.nombre)}</td><td>${Number(a.horasExistentes).toFixed(2)} h</td><td>${Number(a.horasPorReconocer).toFixed(2)} h</td><td>${Number(a.horasPorAprobar||0).toFixed(2)} h</td><td>300.00 h</td></tr>`).join(''):'<tr><td colspan="5">No hay alumnos con el periodo Septiembre–Diciembre de 2026 identificado en sus datos académicos.</td></tr>';
            const faltantes=alumnos.reduce((s,a)=>s+Number(a.horasPorReconocer||0),0);el('regularizacionEstado').textContent=`${alumnos.length} alumnos. Total por reconocer: ${faltantes.toFixed(2)} horas.`;
            const aprobar=alumnos.reduce((s,a)=>s+Number(a.horasPorAprobar||0),0),identificar=alumnos.reduce((s,a)=>s+Number(a.diasPorIdentificar||0),0);
            el('regularizacionEstado').textContent+=` Por aprobar: ${aprobar.toFixed(2)} horas. Días por identificar en el formato: ${identificar}.`;
            habilitado=alumnos.length>0&&(faltantes>0||aprobar>0||identificar>0);el('regularizacionAplicar').disabled=!habilitado;
            if(alumnos.length&&!habilitado)el('regularizacionEstado').textContent='Las horas de los alumnos ya están completas y aprobadas. El formato ya incluye el horario reconocido.';
        }catch(e){error(e);el('regularizacionEstado').textContent='No se pudo confirmar el grupo ni sus horas.';}
    }
    el('regularizacionAplicar').addEventListener('click',async()=>{
        if(pendiente||!habilitado)return;pendiente=true;el('regularizacionAplicar').disabled=true;el('regularizacionError').hidden=true;el('regularizacionEstado').textContent='Reconociendo las horas del periodo…';
        try{const d=await api('/api/regularizacion-horas/aplicar',{method:'POST'});await cargar();el('regularizacionEstado').textContent=`Regularización aplicada: ${d.alumnos} alumnos, ${d.registrosCreados} registros nuevos y ${Number(d.horasReconocidas).toFixed(2)} horas reconocidas; ${Number(d.horasAprobadas||0).toFixed(2)} horas anteriores aprobadas. Cada alumno tiene aprobado el objetivo de 300 horas del corte.`;}
        catch(e){error(e);el('regularizacionEstado').textContent='Comprueba el resultado actualizando esta página.';habilitado=false;el('regularizacionAplicar').disabled=true;}
        finally{pendiente=false;}
    });
    (async()=>{if(!window.obtenerTokenSesionPMO()){window.location.replace('login.html');return;}const u=await window.restaurarSesionPMO();if(!u){el('regularizacionEstado').textContent='Vuelve a iniciar sesión para confirmar tu acceso.';return;}await cargar();})();
})();
