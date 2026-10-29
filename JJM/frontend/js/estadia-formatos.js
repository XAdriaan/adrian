/* Generación local del pase de lista, sin dependencias de CDN. */
(function () {
    'use strict';
    function descargarBlob(blob, nombre) {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url; enlace.download = String(nombre || 'documento').replace(/[\\/:*?"<>|]/g, '_');
        document.body.appendChild(enlace); enlace.click(); enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    const origen='Regularización administrativa Septiembre-Diciembre 2026 (01/09/2026 a 12/10/2026).';
    const valido=r=>String(r.estadoValidacion||'').toLowerCase()!=='rechazado';
    const horas=r=>Math.max(0,Number(r.horasTrabajadas)||0);
    function regularizado(r) {
        const fecha=String(r.fecha||'').slice(0,10),dia=new Date(fecha+'T12:00:00').getDay();
        return valido(r)&&fecha>='2026-09-01'&&fecha<='2026-10-13'&&dia>=1&&dia<=5
            && (r.regularizacionAdministrativa===true || (String(r.descripcion||'').includes(origen)||String(r.descripcion||'').includes('Reconocimiento administrativo autorizado Sep-Dic 2026 (01/09/2026 a 13/10/2026).')));
    }
    function agruparRegistros(registros) {
        const fechas=new Map();
        registros.forEach(r=>{const f=String(r.fecha||'').slice(0,10);if(!fechas.has(f))fechas.set(f,[]);fechas.get(f).push(r);});
        return [...fechas.entries()].sort(([a],[b])=>a.localeCompare(b)).flatMap(([fecha,lista])=>{
            const validos=lista.filter(valido);
            if(!validos.some(regularizado))return lista.slice().sort((a,b)=>String(a.horaEntrada||'').localeCompare(String(b.horaEntrada||'')));
            // El horario reconocido se proyecta; los tiempos de conexión originales siguen en el historial.
            return [{fecha,regularizacionAdministrativa:true,horaEntrada:'07:00',horaSalida:'17:00',
                horasTrabajadas:validos.reduce((s,r)=>s+horas(r),0),
                horasAprobadas:validos.filter(r=>String(r.estadoValidacion).toLowerCase()==='aprobado').reduce((s,r)=>s+horas(r),0),
                estadoValidacion:validos.every(r=>String(r.estadoValidacion).toLowerCase()==='aprobado')?'Aprobado':'Pendiente',
                incidente:'normal'}];
        });
    }
    function resumenAsistencia({mes,registros,horasAprobadasCorte}) {
        const mesLista=registros.filter(r=>valido(r)&&String(r.fecha||'').startsWith(mes));
        const aprobados=mesLista.filter(r=>String(r.estadoValidacion).toLowerCase()==='aprobado');
        const corte=registros.filter(r=>{const f=String(r.fecha||'').slice(0,10),dia=new Date(f+'T12:00:00').getDay();
            return f>='2026-09-01'&&f<='2026-10-13'&&dia>=1&&dia<=5&&String(r.estadoValidacion).toLowerCase()==='aprobado';});
        return {horasMes:mesLista.reduce((s,r)=>s+horas(r),0),aprobadasMes:aprobados.reduce((s,r)=>s+horas(r),0),
            aprobadasCorte:horasAprobadasCorte==null?corte.reduce((s,r)=>s+horas(r),0):Math.max(0,Number(horasAprobadasCorte)||0),
            tieneRegularizacion:registros.some(regularizado)};
    }
    function filasAsistencia({mes, registros, datos,calendario=[],mostrarNoLaborales=true}) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new Error('Selecciona un periodo válido.');
        const [anio, numeroMes] = mes.split('-').map(Number);
        const fechas = new Set();
        const inicio = String(datos.fechaInicio || '').slice(0, 10);
        const fin = String(datos.fechaFin || '').slice(0, 10);
        const ultimo = new Date(anio, numeroMes, 0).getDate();
        const marcas=new Map(calendario.map(d=>[String(d.fecha).slice(0,10),d]));
        for (let dia=1; dia<=ultimo; dia++) {
            const fecha = `${mes}-${String(dia).padStart(2,'0')}`;
            const semana = new Date(anio,numeroMes-1,dia,12).getDay();
            if ((mostrarNoLaborales || semana>0 && semana<6) && (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || fecha>=inicio)
                && (!/^\d{4}-\d{2}-\d{2}$/.test(fin) || fecha<=fin)) fechas.add(fecha);
        }
        const propios = agruparRegistros(registros.filter(r => String(r.fecha || '').startsWith(mes)));
        propios.forEach(r => fechas.add(String(r.fecha).slice(0,10)));
        return [...fechas].sort().flatMap(fecha => {
            const marca=marcas.get(fecha),semana=new Date(fecha+'T12:00:00').getDay();
            const laboral=marca?marca.laboral===true||Number(marca.laboral)===1:semana>0&&semana<6;
            const jornadas = propios.filter(r => String(r.fecha).slice(0,10)===fecha)
                .sort((a,b) => String(a.horaEntrada || '').localeCompare(String(b.horaEntrada || '')));
            return jornadas.length ? jornadas.map(r => ({...r,fecha,laboral,motivoDia:marca?.motivo||''})) : [{fecha,laboral,motivoDia:marca?.motivo||''}];
        });
    }
    function pdfDesdeJPEG(paginas) {
        const partes=[], offsets=[0]; let offset=0;
        const encoder=new TextEncoder();
        const texto=s=>{const b=encoder.encode(s);partes.push(b);offset+=b.length;};
        const bytes=b=>{partes.push(b);offset+=b.length;};
        const objeto=n=>{offsets[n]=offset;texto(`${n} 0 obj\n`);};
        const ids=paginas.map((_,i)=>3+i*3), total=3+paginas.length*3;
        texto('%PDF-1.4\n%JJM Oficina de Proyectos\n');
        objeto(1);texto('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
        objeto(2);texto(`<< /Type /Pages /Kids [${ids.map(id=>id+' 0 R').join(' ')}] /Count ${paginas.length} >>\nendobj\n`);
        paginas.forEach((p,i)=>{
            const id=ids[i];
            const ancho=p.puntosAncho||792,alto=p.puntosAlto||612;
            objeto(id);texto(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>\nendobj\n`);
            objeto(id+1);texto(`<< /Type /XObject /Subtype /Image /Width ${p.ancho} /Height ${p.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`);
            bytes(p.bytes);texto('\nendstream\nendobj\n');
            const c=`q\n${ancho} 0 0 ${alto} 0 0 cm\n/Im0 Do\nQ\n`;
            objeto(id+2);texto(`<< /Length ${encoder.encode(c).length} >>\nstream\n${c}endstream\nendobj\n`);
        });
        const xref=offset;texto(`xref\n0 ${total}\n0000000000 65535 f \n`);
        for(let i=1;i<total;i++)texto(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
        texto(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
        return new Blob(partes,{type:'application/pdf'});
    }
    function envolver(ctx, texto, ancho) {
        const lineas=[];let actual='';
        for(const palabra of String(texto||'').split(/\s+/)){
            const intento=actual?actual+' '+palabra:palabra;
            if(ctx.measureText(intento).width>ancho && actual){lineas.push(actual);actual=palabra;}else actual=intento;
        }
        if(actual)lineas.push(actual);return lineas;
    }
    async function generarAsistencia(contexto) {
        const filas=filasAsistencia(contexto);
        const resumen=resumenAsistencia(contexto);
        if (!filas.length) throw new Error('El mes no contiene días dentro del periodo de estadía. Selecciona otro mes.');
        const paginas=[];
        let logo=null;
        try { logo=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='img/logo-jjm-v35.svg';}); } catch (_) {}
        const cortes=[];
        for(let i=0;i<filas.length;i+=21)cortes.push(filas.slice(i,i+21));
        cortes.forEach((grupo,indice)=>{
            const canvas=document.createElement('canvas');canvas.width=2200;canvas.height=1700;
            const ctx=canvas.getContext('2d');if(!ctx)throw new Error('El navegador no permite generar este formato.');
            ctx.fillStyle='#fff';ctx.fillRect(0,0,2200,1700);ctx.fillStyle='#161616';
            const text=(s,x,y,size=22,bold=false,align='left')=>{ctx.font=`${bold?'600':'400'} ${size}px Arial`;ctx.textAlign=align;ctx.fillText(String(s??''),x,y);};
            // El logo original es claro: la placa mantiene su legibilidad sobre papel blanco.
            ctx.fillStyle='#102c36';ctx.fillRect(75,56,250,116);
            if(logo){const r=Math.min(225/logo.width,101/logo.height);ctx.drawImage(logo,87,62,logo.width*r,logo.height*r);}
            ctx.fillStyle='#161616';text('ÁREA: OFICINA DE PROYECTOS',2110,91,24,true,'right');
            text('PROPÓSITO: SEGUIMIENTO DE ASISTENCIAS DEL COLABORADOR',2110,129,20,false,'right');
            ctx.strokeStyle='#477c86';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(75,191);ctx.lineTo(2110,191);ctx.stroke();
            text('LISTA DE ASISTENCIA PERSONAL DE JJM TECNOLOGÍAS INNOVADORAS, S.A. DE C.V.',1100,238,27,true,'center');
            const nombre=contexto.nombre||'Nombre del estudiante';
            text('NOMBRE: '+nombre,75,294,21,true);
            const mesTexto=new Date(Number(contexto.mes.slice(0,4)),Number(contexto.mes.slice(5))-1,1,12).toLocaleDateString('es-MX',{month:'long',year:'numeric'});
            text('PERIODO: '+mesTexto,2110,294,20,false,'right');
            text('INSTITUCIÓN: '+(contexto.datos.universidad||'________________________________'),75,331,20);
            if(contexto.proyecto)text('PROYECTO: '+envolver(ctx,contexto.proyecto.nombre,980)[0],2110,331,18,false,'right');
            text(`HORAS DEL MES: ${resumen.horasMes.toFixed(2)} h    |    APROBADAS DEL MES: ${resumen.aprobadasMes.toFixed(2)} h`,75,374,21,true);
            if(resumen.tieneRegularizacion)text(`APROBADAS DEL 01/09/2026 AL 13/10/2026: ${resumen.aprobadasCorte.toFixed(2)} h`,2110,374,21,true,'right');
            const columnas=[75,267,792,855,1045,1235,1420,1610,1795,1950,2110];
            const encabezados=['FECHA','NOMBRE','PISO','DÍA','ENTRADA','FIRMA','SALIDA','FIRMA','HORAS','APROB.'];
            const y=415,alto=38;
            ctx.fillStyle='#e3e7e6';ctx.fillRect(75,y,2035,45);ctx.fillStyle='#161616';
            encabezados.forEach((s,i)=>text(s,(columnas[i]+columnas[i+1])/2,y+29,19,true,'center'));
            grupo.forEach((r,i)=>{
                const py=y+45+i*alto;
                if(String(r.incidente).toLowerCase()==='recuperacion'){ctx.fillStyle='#daeff5';ctx.fillRect(75,py,2035,alto);ctx.fillStyle='#161616';}
                if(r.laboral===false){ctx.fillStyle='#e8e8e8';ctx.fillRect(75,py,2035,alto);ctx.fillStyle='#161616';}
                const fecha=String(r.fecha).split('-').reverse().join('/');
                const aprobadas=r.horasAprobadas??(String(r.estadoValidacion).toLowerCase()==='aprobado'?horas(r):0);
                const values=[fecha,nombre,contexto.datos.piso||'3',r.laboral===false?'No laboral':'Laboral',String(r.horaEntrada||'').slice(0,5),'',String(r.horaSalida||'').slice(0,5),'',
                    r.horasTrabajadas==null?'':horas(r).toFixed(2),r.horasTrabajadas==null?'':Number(aprobadas).toFixed(2)];
                values.forEach((v,j)=>{ctx.font='400 18px Arial';const lineas=envolver(ctx,v,columnas[j+1]-columnas[j]-15);text(lineas[0]||'',(columnas[j]+columnas[j+1])/2,py+25,18,false,'center');});
            });
            const bottom=y+45+grupo.length*alto;
            ctx.strokeStyle='#333';ctx.lineWidth=1;
            columnas.forEach(x=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,bottom);ctx.stroke();});
            [y,y+45,...grupo.map((_,i)=>y+45+(i+1)*alto)].forEach(py=>{ctx.beginPath();ctx.moveTo(75,py);ctx.lineTo(2110,py);ctx.stroke();});
            const sy=bottom+36;
            text('SIMBOLOGÍA DE INCIDENCIAS',75,sy,19,true);
            text('1 - No laborado con justificación     2 - No laborado sin justificación     3 - Recuperación del día no laborado',75,sy+33,18);
            text('DÍA: Laboral / No laboral según el calendario. Las marcas no modifican las horas aprobadas.',75,sy+59,17);
            if(resumen.tieneRegularizacion) {
                text('Regularización administrativa: 07:00-17:00 en días hábiles del 01/09 al 13/10/2026.',75,sy+90,19,true);
                text('Horario reconocido por administración. Las conexiones reales se conservan en el historial; firmas por recabar.',75,sy+117,18);
            }
            const firmay=Math.max(sy+(resumen.tieneRegularizacion?145:80),1430),roles=[['Estudiante',nombre,contexto.datos.universidad||''],['Asesor empresarial',contexto.datos.asesorEmpresarial||'','JJM Tecnologías Innovadoras, S.A. de C.V.'],['Representante de la empresa','','JJM Tecnologías Innovadoras, S.A. de C.V.']];
            roles.forEach(([rol,nombreFirma,org],i)=>{
                const x=75+i*686;ctx.strokeRect(x,firmay,663,174);text('Vo.Bo.',x+331,firmay+27,18,false,'center');
                ctx.beginPath();ctx.moveTo(x+28,firmay+85);ctx.lineTo(x+635,firmay+85);ctx.stroke();
                text(nombreFirma,x+331,firmay+111,18,false,'center');text(rol,x+331,firmay+137,18,true,'center');
                text(envolver(ctx,org,620)[0]||'',x+331,firmay+160,15,false,'center');
            });
            text(`Página ${indice+1} de ${cortes.length}`,2110,1641,16,false,'right');
            const b64=canvas.toDataURL('image/jpeg',.94).split(',')[1];
            paginas.push({ancho:canvas.width,alto:canvas.height,bytes:Uint8Array.from(atob(b64),c=>c.charCodeAt(0))});
        });
        return pdfDesdeJPEG(paginas);
    }
    async function descargarAsistencia(contexto){const blob=await generarAsistencia(contexto);descargarBlob(blob,`Lista_Asistencia_${contexto.mes}.pdf`);}
    window.EstadiaFormatos={descargarAsistencia,descargarBlob,generarAsistencia,filasAsistencia,pdfDesdeJPEG,agruparRegistros,resumenAsistencia};
})();
