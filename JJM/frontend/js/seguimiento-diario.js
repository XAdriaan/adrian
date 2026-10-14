(function(){
    'use strict';
    const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const numero=v=>Math.max(0,Number(v)||0);
    let datos=null,global=false,iniciado=false,pendiente=false,version=0;
    function reloj(v){const s=Math.floor(numero(v));return [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(x=>String(x).padStart(2,'0')).join(':');}
    function filtradas(){const periodo=el('autoPeriodo').value,anio=el('autoAnio').value,buscar=el('autoBuscar').value.trim().toLowerCase();return(datos?.filas||[]).filter(f=>(!periodo||f.periodo===periodo)&&(!anio||String(f.anio)===anio)&&(!buscar||String(f.nombre||'').toLowerCase().includes(buscar)));}
    function nivel(f){if(f.estadoReporte==='Observado'||f.fueraPlazo||f.reporteVencido)return'urgente';return f.entregado?'entregado':f.puedeReportar?'listo':'preparacion';}
    function render(){
        const filas=filtradas(),alumnos=new Set(filas.map(f=>f.idUsuario)),proyectos=new Set(filas.map(f=>f.idProyecto));
        el('autoDiaResumen').innerHTML=[[alumnos.size,'Alumnos'],[proyectos.size,'Proyectos'],[filas.filter(f=>f.reporteExigible&&!f.entregado).length,'Reportes pendientes'],[filas.filter(f=>f.entregado).length,'Reportes entregados'],[filas.reduce((n,f)=>n+numero(f.tareasVencidas),0),'Tareas vencidas']].map(([n,t])=>`<div><strong>${n}</strong><span>${t}</span></div>`).join('');
        el('autoDiaFilas').innerHTML=filas.length?filas.map(f=>`<tr><td><strong>${esc(f.nombre)}</strong><small>${esc(f.periodo)} · ${esc(f.anio||'Año pendiente')}</small></td><td><a href="canales-proyectos.html?id=${numero(f.idProyecto)}">${esc(f.proyecto)}</a></td><td><strong class="auto-tiempo">${reloj(f.segundos)}</strong><small>${esc(f.jornada)}</small></td><td><span class="auto-estado auto-estado-${nivel(f)}">${esc(f.estadoReporte)}</span>${f.fueraPlazo?'<small>Primera entrega fuera del plazo</small>':''}</td><td><span class="auto-estado auto-estado-${numero(f.tareasVencidas)>0?'urgente':'preparacion'}">${numero(f.tareasVencidas)} vencidas</span><small>${numero(f.proximasEntregas)} próximas entregas</small></td><td><a class="auto-dia-accion" href="canales-proyectos.html?id=${numero(f.idProyecto)}#diario">${f.puedeReportar?'Entregar reporte':f.entregado?'Consultar reporte':'Abrir proyecto'} →</a></td></tr>`).join(''):'<tr><td colspan="6">No hay asignaciones activas para estos filtros.</td></tr>';
        el('autoDiaEstado').textContent=`Corte del ${datos.fecha} · Hora de Ciudad de México · Actualizado ${String(datos.actualizado).slice(11,19)}. Se actualiza cada minuto.`;
        el('autoDiaCsv').disabled=filas.length===0;
    }
    async function actualizar(){
        if(!iniciado||pendiente||document.hidden)return;pendiente=true;const consulta=++version,token=window.obtenerTokenSesionPMO();
        if(!token){pendiente=false;el('autoDiaEstado').textContent='Inicia sesión para consultar el seguimiento.';return;}
        try {const r=await fetch(window.apiUrl('/api/automatizaciones/seguimiento-diario?global='+global)),d=await r.json();
            if(consulta!==version||window.obtenerTokenSesionPMO()!==token)return;
            if(!r.ok)throw new Error(d.mensaje||d.detail||'No se pudo actualizar el seguimiento del día.');
            datos=d;render();
        }catch(e){el('autoDiaEstado').textContent=e.message||'No se pudo actualizar el seguimiento. Se conserva la última consulta.';}
        finally{pendiente=false;}
    }
    function celda(v){let s=String(v??'');if(/^[=+\-@]/.test(s.trimStart())||/^[\t\r]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"';}
    function csv(filas,fecha){return '\uFEFF'+[['Fecha','Alumno','Proyecto','Periodo','Jornada HH:MM:SS','Estado de jornada','Reporte','Entrega fuera de plazo','Tareas vencidas','Próximas entregas'],...filas.map(f=>[fecha,f.nombre,f.proyecto,f.periodo,reloj(f.segundos),f.jornada,f.estadoReporte,f.fueraPlazo?'Sí':'No',numero(f.tareasVencidas),numero(f.proximasEntregas)])].map(r=>r.map(celda).join(',')).join('\r\n');}
    function descargar(){if(!datos||!filtradas().length)return;const url=URL.createObjectURL(new Blob([csv(filtradas(),datos.fecha)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='JJM-seguimiento-'+datos.fecha+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    function iniciar(esGlobal){if(iniciado)return;iniciado=true;global=esGlobal===true;
        el('autoDiaTitulo').textContent=global?'Seguimiento del día':'Mi jornada y entregas de hoy';
        el('autoDiaCsv').addEventListener('click',descargar);el('autoActualizar').addEventListener('click',actualizar);
        for(const id of ['autoPeriodo','autoAnio','autoBuscar'])el(id).addEventListener(id==='autoBuscar'?'input':'change',()=>{if(datos)render();});
        window.addEventListener('focus',actualizar);document.addEventListener('visibilitychange',()=>{if(!document.hidden)actualizar();});
        setInterval(actualizar,60_000);actualizar();
    }
    window.SeguimientoDiario={iniciar,csv,reloj};
})();
