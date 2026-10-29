(function(){
    'use strict';
    const numero=v=>Math.max(0,Number(v)||0),texto=v=>String(v??''),envolver=(ctx,v,ancho)=>{const lineas=[];let actual='';for(const palabra of texto(v).split(/\s+/)){const nueva=actual?actual+' '+palabra:palabra;if(actual&&ctx.measureText(nueva).width>ancho){lineas.push(actual);actual=palabra;}else actual=nueva;}if(actual)lineas.push(actual);return lineas;};
    function csv(datos){
        const celda=v=>{let s=texto(v);if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
        const filas=[['Alumno','Periodo','Año','Horas aprobadas de la semana','Horas aprobadas acumuladas','Meta de horas','Avance %','Tareas terminadas en la semana','Certificados revisados','Cursos requeridos','Pendientes del expediente']];
        for(const a of datos.alumnos||[])filas.push([a.nombre,a.periodoGrupo,a.anio,a.horasSemana,a.horasAprobadas,a.metaHoras,a.porcentajeHoras,a.tareasTerminadas,a.cursosDocumentados,a.totalCursos,(a.faltantes||[]).join('; ')]);
        return '\uFEFF'+filas.map(f=>f.map(celda).join(',')).join('\r\n');
    }
    async function logo(){try{return await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='img/logo-jjm-v36.svg';});}catch(_){return null;}}
    function pagina(ancho,alto){const canvas=document.createElement('canvas');canvas.width=ancho;canvas.height=alto;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No se pudo generar el PDF.');ctx.fillStyle='#fff';ctx.fillRect(0,0,ancho,alto);ctx.fillStyle='#142038';
        const escribir=(v,x,y,size=26,bold=false,align='left')=>{ctx.font=`${bold?'600':'400'} ${size}px Arial`;ctx.textAlign=align;ctx.fillText(texto(v),x,y);};return{canvas,ctx,escribir};}
    function imagen(p,ancho=792,alto=612){return {ancho:p.canvas.width,alto:p.canvas.height,puntosAncho:ancho,puntosAlto:alto,bytes:Uint8Array.from(atob(p.canvas.toDataURL('image/jpeg',.94).split(',')[1]),c=>c.charCodeAt(0))};}
    async function pdfReporte(datos){
        const alumnos=datos.alumnos||[],paginas=[],marca=await logo(),grupos=[];for(let i=0;i<alumnos.length;i+=10)grupos.push(alumnos.slice(i,i+10));if(!grupos.length)grupos.push([]);
        const total=alumnos.reduce((s,a)=>s+numero(a.horasSemana),0);
        grupos.forEach((grupo,indice)=>{const p=pagina(2200,1700),{ctx,escribir:t}=p;ctx.fillStyle='#142e3b';ctx.fillRect(100,70,290,140);if(marca){const escala=Math.min(260/marca.width,125/marca.height);ctx.drawImage(marca,113,76,marca.width*escala,marca.height*escala);}ctx.fillStyle='#142038';
            t('REPORTE SEMANAL DE ESTADÍA',2100,129,42,true,'right');t(`${texto(datos.desde)} — ${texto(datos.hasta)}`,2100,180,29,false,'right');ctx.strokeStyle='#345b89';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(100,240);ctx.lineTo(2100,240);ctx.stroke();
            t(`${alumnos.length} alumnos · ${total.toFixed(2)} horas aprobadas en la semana`,100,313,31,true);t('Cifras guardadas al generar el reporte. Las horas aprobadas pueden incluir regularizaciones administrativas.',100,363,22);
            const cols=[100,610,1030,1210,1420,1580,1780,2100],heads=['ALUMNO','PERIODO','SEMANA h','ACUMULADO h','META h','TAREAS','PENDIENTES'];
            ctx.fillStyle='#e1e7ee';ctx.fillRect(100,420,2000,65);ctx.fillStyle='#142038';heads.forEach((v,i)=>t(v,(cols[i]+cols[i+1])/2,462,22,true,'center'));
            grupo.forEach((a,i)=>{const y=485+i*80,values=[a.nombre,`${a.periodoGrupo} ${a.anio||''}`,numero(a.horasSemana).toFixed(2),numero(a.horasAprobadas).toFixed(2),numero(a.metaHoras).toFixed(0),numero(a.tareasTerminadas),(a.faltantes||[]).length];values.forEach((v,j)=>{ctx.font='400 23px Arial';envolver(ctx,v,cols[j+1]-cols[j]-25).slice(0,2).forEach((linea,k)=>t(linea,(cols[j]+cols[j+1])/2,y+31+k*27,23,false,'center'));});});
            const fin=485+grupo.length*80;ctx.strokeStyle='#53708d';ctx.lineWidth=1;for(const x of cols){ctx.beginPath();ctx.moveTo(x,420);ctx.lineTo(x,fin);ctx.stroke();}for(const y of [420,485,...grupo.map((_,i)=>485+(i+1)*80)]){ctx.beginPath();ctx.moveTo(100,y);ctx.lineTo(2100,y);ctx.stroke();}
            t('Consulta el panel de automatizaciones para revisar el detalle de los expedientes y sus pendientes.',100,1450,24);t(`Página ${indice+1} de ${grupos.length}`,2100,1610,22,false,'right');paginas.push(imagen(p));});
        return window.EstadiaFormatos.pdfDesdeJPEG(paginas);
    }
    async function pdfCarta(a){
        const p=pagina(1700,2200),{ctx,escribir:t}=p,marca=await logo();ctx.fillStyle='#142e3b';ctx.fillRect(130,90,275,130);if(marca){const escala=Math.min(245/marca.width,112/marca.height);ctx.drawImage(marca,145,98,marca.width*escala,marca.height*escala);}ctx.fillStyle='#142038';
        t('JJM TECNOLOGÍAS INNOVADORAS',1570,138,30,true,'right');t('Oficina de Proyectos',1570,184,27,false,'right');
        ctx.strokeStyle='#345b89';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(130,265);ctx.lineTo(1570,265);ctx.stroke();
        t('BORRADOR DE CARTA DE TERMINACIÓN',850,348,37,true,'center');t('PARA REVISIÓN ADMINISTRATIVA',850,401,28,true,'center');
        let y=535;const parrafo=v=>{ctx.font='400 29px Arial';for(const l of envolver(ctx,v,1440)){t(l,130,y,29);y+=45;}y+=30;};
        parrafo(`Institución: ${texto(a.universidad)}.`);parrafo('A quien corresponda:');
        parrafo(`Se prepara para revisión la constancia correspondiente a ${texto(a.nombre)}, matrícula ${texto(a.matricula)}, de la carrera de ${texto(a.carrera)}.`);
        parrafo(`Periodo de estadía: ${texto(a.fechaInicio)} al ${texto(a.fechaFin)} (${texto(a.periodoGrupo)}).`);
        parrafo(`El expediente registra ${numero(a.horasAprobadas).toFixed(2)} horas aprobadas, con una meta de ${numero(a.metaHoras).toFixed(0)} horas. Las cartas iniciales, los certificados y el seguimiento cumplen los requisitos configurados.`);
        parrafo('El responsable deberá revisar los datos, las horas y las evidencias antes de firmar y liberar la carta.');
        t('Asesor empresarial: '+texto(a.asesorEmpresarial),130,1700,25);t('Asesor académico: '+texto(a.asesorAcademico),130,1750,25);
        ctx.strokeStyle='#345b89';ctx.beginPath();ctx.moveTo(430,1930);ctx.lineTo(1270,1930);ctx.stroke();t('Firma y aprobación del responsable',850,1974,27,false,'center');
        t('Borrador generado a partir del expediente. Pendiente de revisión y liberación.',850,2100,20,false,'center');return window.EstadiaFormatos.pdfDesdeJPEG([imagen(p,612,792)]);
    }
    async function reporte(datos,formato){if(formato==='csv'){window.EstadiaFormatos.descargarBlob(new Blob([csv(datos)],{type:'text/csv;charset=utf-8'}),`Reporte_semanal_${datos.desde}_${datos.hasta}.csv`);return;}window.EstadiaFormatos.descargarBlob(await pdfReporte(datos),`Reporte_semanal_${datos.desde}_${datos.hasta}.pdf`);}
    async function carta(datos){window.EstadiaFormatos.descargarBlob(await pdfCarta(datos),`BORRADOR_terminacion_${numero(datos.idUsuario)}.pdf`);}
    window.AutomatizacionesFormatos={reporte,carta,csv,pdfReporte,pdfCarta};
})();
