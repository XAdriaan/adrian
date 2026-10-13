(() => {
    'use strict';
    function lineas(c,t,ancho){const lista=[];for(const bloque of String(t||'').split('\n')){let l='';for(const palabra of bloque.split(/\s+/)){if(c.measureText(l+' '+palabra).width>ancho&&l){lista.push(l);l='';}let parte='';for(const caracter of palabra){if(c.measureText(parte+caracter).width>ancho&&parte){lista.push(parte);parte='';}parte+=caracter;}l+=(l?' ':'')+parte;}lista.push(l);}return lista;}
    async function generarACT({mes,datos,proyecto,actividades=[],registros=[]}){
        if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes))throw Error('Selecciona un mes válido.');
        const paginas=[];let logo;try{logo=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src='img/LOGO-J2M.png';});}catch(_){}
        const filas=actividades.filter(a=>String(a.fecha).startsWith(mes)).sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));let canvas,c,y=0,n=0;
        const columnas=[75,335,1170,1650,1840,2035,2125];
        const texto=(s,x,py,size=21,bold=false,align='left')=>{c.font=`${bold?'600':'400'} ${size}px Arial`;c.fillStyle='#161616';c.textAlign=align;c.fillText(String(s??''),x,py);};
        function guardar(){const b64=canvas.toDataURL('image/jpeg',.94).split(',')[1];paginas.push({ancho:2200,alto:1700,bytes:Uint8Array.from(atob(b64),v=>v.charCodeAt(0))});}
        function nueva(){canvas=document.createElement('canvas');canvas.width=2200;canvas.height=1700;c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,2200,1700);n++;if(logo){c.fillStyle='#102c36';c.fillRect(75,55,235,110);const r=Math.min(215/logo.width,90/logo.height);c.drawImage(logo,85,65,logo.width*r,logo.height*r);}texto(datos.universidad||'Institución por registrar',1130,82,25,true,'center');texto('REPORTE MENSUAL DE PROYECTOS Y ACTIVIDADES ASIGNADAS',1130,132,27,true,'center');texto('ACT · '+mes,2115,178,20,true,'right');texto('1. DATOS GENERALES',75,225,23,true);texto('ÁREA: OFICINA DE PROYECTOS · JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.',75,265,21);
            c.font='400 21px Arial';const nombreProyecto=lineas(c,proyecto.nombre,1990);nombreProyecto.slice(0,2).forEach((t,i)=>texto((i===0?'PROYECTO: ':'')+t,75,308+i*26,21));texto('CÓDIGO: '+(proyecto.codigo||'Sin código'),75,380,20);texto('ASIGNADO(A): '+(datos.nombreCompleto||'Pendiente'),520,380,20,true);texto('MATRÍCULA: '+(datos.matricula||'Pendiente'),2110,380,20,false,'right');texto('FECHA INICIO: '+(datos.fechaInicio||'Pendiente')+'     FECHA FIN: '+(datos.fechaFin||'Pendiente'),75,422,20);texto('2. ACTIVIDADES · PERFIL: ESTUDIANTE',75,475,22,true);c.fillStyle='#dfe4e7';c.fillRect(75,500,2050,60);c.strokeStyle='#333';c.lineWidth=1;const headers=['FECHA / FASE','ACTIVIDAD Y RESULTADO','UBICACIÓN / EVIDENCIA','REVISIÓN','HORAS','PLAZO'];headers.forEach((t,i)=>{c.font='600 18px Arial';lineas(c,t,columnas[i+1]-columnas[i]-16).forEach((l,j)=>texto(l,(columnas[i]+columnas[i+1])/2,525+j*22,18,true,'center'));});y=560;}
        nueva();
        const fuentes=filas.length?filas:[{fecha:'',fase:'Sin reportes del mes',actividad:'No hay actividades entregadas para este alumno y periodo.',resultado:'',horas:null,estado:'Sin reporte'}];
        for(const r of fuentes){
            const contenido=[String(r.fecha||'')+'\n'+String(r.fase||''),String(r.actividad||'')+'\nResultado: '+String(r.resultado||'')+(r.bloqueos?'\nBloqueos: '+r.bloqueos:''),String(r.evidencia||'')+(r.id_archivo?'\nArchivo compartido #'+r.id_archivo:''),String(r.estado||'Pendiente'),r.horas==null?'':Number(r.horas).toFixed(2),r.fuera_plazo?'Fuera':'En plazo'];
            c.font='400 19px Arial';const env=contenido.map((s,i)=>lineas(c,s,columnas[i+1]-columnas[i]-22));const max=Math.max(...env.map(l=>l.length));
            // Dividir filas extensas entre páginas para no perder texto ni bloquear el formato.
            for(let inicio=0;inicio<max;){let disponibles=Math.floor((1290-y-20)/25);if(disponibles<2){texto('Continuación de actividades',75,1510,18);texto('Página '+n,2110,1630,17,false,'right');guardar();nueva();disponibles=Math.floor((1290-y-20)/25);}
                const cantidad=Math.min(disponibles,max-inicio),alto=Math.max(70,cantidad*25+20);c.fillStyle='#fff';c.fillRect(75,y,2050,alto);c.strokeStyle='#333';c.strokeRect(75,y,2050,alto);columnas.slice(1,-1).forEach(x=>{c.beginPath();c.moveTo(x,y);c.lineTo(x,y+alto);c.stroke();});env.forEach((ls,i)=>ls.slice(inicio,inicio+cantidad).forEach((l,j)=>texto(l,columnas[i]+10,y+25+j*25,19)));y+=alto;inicio+=cantidad;
            }
        }
        if(y>1170){texto('Página '+n,2110,1630,17,false,'right');guardar();nueva();}
        const declaradas=filas.reduce((s,r)=>s+(Number(r.horas)||0),0),validadas=filas.filter(r=>r.estado==='Aprobado').reduce((s,r)=>s+(Number(r.horas)||0),0),asistencia=registros.filter(r=>r.estadoValidacion==='Aprobado').reduce((s,r)=>s+(Number(r.horasTrabajadas)||0),0);
        texto('HORAS DECLARADAS EN ACTIVIDADES: '+declaradas.toFixed(2)+' h',75,y+50,22,true);texto('HORAS DE ACTIVIDADES REVISADAS: '+validadas.toFixed(2)+' h',75,y+88,22,true);texto('HORAS APROBADAS EN ASISTENCIA DEL MES (TODOS LOS PROYECTOS): '+asistencia.toFixed(2)+' h',75,y+126,21);texto('META ACADÉMICA: '+(datos.horasComprometidas||'Pendiente')+' h · Declaraciones y asistencia se verifican por separado.',75,y+160,19);texto('No se generan firmas ni se duplica el conteo de horas al entregar este reporte.',75,y+194,18);
        for(const [i,rol] of ['Elaboró · Estudiante','Revisó · Asesor empresarial','Recibió y aprobó · Administración'].entries()){const x=75+i*690;c.strokeStyle='#333';c.strokeRect(x,1430,660,160);c.beginPath();c.moveTo(x+25,1510);c.lineTo(x+635,1510);c.stroke();texto(rol,x+330,1550,19,true,'center');if(i===0)texto(datos.nombreCompleto||'',x+330,1575,17,false,'center');}
        texto('Página '+n,2110,1630,17,false,'right');guardar();return window.EstadiaFormatos.pdfDesdeJPEG(paginas);
    }
    window.CanalFormatos={generarACT};
})();
