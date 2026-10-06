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
    function filasAsistencia({mes, registros, datos}) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new Error('Selecciona un periodo válido.');
        const [anio, numeroMes] = mes.split('-').map(Number);
        const fechas = new Set();
        const inicio = String(datos.fechaInicio || '').slice(0, 10);
        const fin = String(datos.fechaFin || '').slice(0, 10);
        const ultimo = new Date(anio, numeroMes, 0).getDate();
        for (let dia=1; dia<=ultimo; dia++) {
            const fecha = `${mes}-${String(dia).padStart(2,'0')}`;
            const semana = new Date(anio,numeroMes-1,dia,12).getDay();
            if (semana>0 && semana<6 && (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || fecha>=inicio)
                && (!/^\d{4}-\d{2}-\d{2}$/.test(fin) || fecha<=fin)) fechas.add(fecha);
        }
        const propios = registros.filter(r => String(r.fecha || '').startsWith(mes));
        propios.forEach(r => fechas.add(String(r.fecha).slice(0,10)));
        return [...fechas].sort().flatMap(fecha => {
            const jornadas = propios.filter(r => String(r.fecha).slice(0,10)===fecha)
                .sort((a,b) => String(a.horaEntrada || '').localeCompare(String(b.horaEntrada || '')));
            return jornadas.length ? jornadas.map(r => ({...r,fecha})) : [{fecha}];
        });
    }
    function pdfDesdeJPEG(paginas) {
        const partes=[], offsets=[0]; let offset=0;
        const encoder=new TextEncoder();
        const texto=s=>{const b=encoder.encode(s);partes.push(b);offset+=b.length;};
        const bytes=b=>{partes.push(b);offset+=b.length;};
        const objeto=n=>{offsets[n]=offset;texto(`${n} 0 obj\n`);};
        const ids=paginas.map((_,i)=>3+i*3), total=3+paginas.length*3;
        texto('%PDF-1.4\n%ProjectSphere\n');
        objeto(1);texto('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
        objeto(2);texto(`<< /Type /Pages /Kids [${ids.map(id=>id+' 0 R').join(' ')}] /Count ${paginas.length} >>\nendobj\n`);
        paginas.forEach((p,i)=>{
            const id=ids[i];
            objeto(id);texto(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>\nendobj\n`);
            objeto(id+1);texto(`<< /Type /XObject /Subtype /Image /Width ${p.ancho} /Height ${p.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`);
            bytes(p.bytes);texto('\nendstream\nendobj\n');
            const c='q\n792 0 0 612 0 0 cm\n/Im0 Do\nQ\n';
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
        if (!filas.length) throw new Error('El mes no contiene días dentro del periodo de estadía. Selecciona otro mes.');
        const paginas=[];
        let logo=null;
        try { logo=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='img/LOGO-J2M.png';}); } catch (_) {}
        const cortes=[];
        for(let i=0;i<filas.length;i+=24)cortes.push(filas.slice(i,i+24));
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
            const columnas=[75,277,891,1003,1247,1534,1779,2110];
            const encabezados=['FECHA','NOMBRE','PISO','HORA ENTRADA','FIRMA','HORA SALIDA','FIRMA'];
            const y=374,alto=38;
            ctx.fillStyle='#e3e7e6';ctx.fillRect(75,y,2035,45);ctx.fillStyle='#161616';
            encabezados.forEach((s,i)=>text(s,(columnas[i]+columnas[i+1])/2,y+29,19,true,'center'));
            grupo.forEach((r,i)=>{
                const py=y+45+i*alto;
                if(String(r.incidente).toLowerCase()==='recuperacion'){ctx.fillStyle='#daeff5';ctx.fillRect(75,py,2035,alto);ctx.fillStyle='#161616';}
                const fecha=String(r.fecha).split('-').reverse().join('/');
                const codigo={justificado:'1',no_justificado:'2',recuperacion:'3'}[String(r.incidente||'').toLowerCase()]||'';
                const values=[fecha,nombre,contexto.datos.piso||'',String(r.horaEntrada||'').slice(0,5),codigo,String(r.horaSalida||'').slice(0,5),''];
                values.forEach((v,j)=>{ctx.font='400 18px Arial';const lineas=envolver(ctx,v,columnas[j+1]-columnas[j]-15);text(lineas[0]||'',(columnas[j]+columnas[j+1])/2,py+25,18,false,'center');});
            });
            const bottom=y+45+grupo.length*alto;
            ctx.strokeStyle='#333';ctx.lineWidth=1;
            columnas.forEach(x=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,bottom);ctx.stroke();});
            [y,y+45,...grupo.map((_,i)=>y+45+(i+1)*alto)].forEach(py=>{ctx.beginPath();ctx.moveTo(75,py);ctx.lineTo(2110,py);ctx.stroke();});
            const sy=bottom+48;
            text('SIMBOLOGÍA DE INCIDENCIAS',75,sy,19,true);
            text('1 - No laborado con justificación     2 - No laborado sin justificación     3 - Recuperación del día no laborado',75,sy+33,18);
            const firmay=Math.max(sy+70,1390),roles=[['Estudiante',nombre,contexto.datos.universidad||''],['Asesor empresarial',contexto.datos.asesorEmpresarial||'','JJM Tecnologías Innovadoras, S.A. de C.V.'],['Representante de la empresa','','JJM Tecnologías Innovadoras, S.A. de C.V.']];
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
    window.EstadiaFormatos={descargarAsistencia,descargarBlob,generarAsistencia,filasAsistencia,pdfDesdeJPEG};
})();
