(() => {
    'use strict';
    const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const numero=v=>Number(v||0).toLocaleString('es-MX',{maximumFractionDigits:2});
    const s={lista:[],admin:false,id:null,tab:'resumen',detalle:null,opciones:null,editando:null,consulta:0,mes:''};
    const actual=()=>s.lista.find(f=>Number(f.id)===s.id);
    const campo=(k,v)=>`<dt>${esc(k)}</dt><dd>${esc(v||'Pendiente de registrar')}</dd>`;
    const card=(titulo,contenido)=>`<article class="dual-card"><h3>${esc(titulo)}</h3>${contenido}</article>`;
    const link=(url,nombre)=>`<a class="dual-link" href="${url}">${esc(nombre)} ↗</a>`;
    async function api(path='',options={}) {
        const r=await fetch(window.apiUrl('/api/dual'+path),options);
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw Error(d.mensaje||d.detail||d.message||`No se pudo completar la operación (${r.status}).`);
        return d;
    }
    const json=d=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
    function mensaje(texto,error=false){$('mensaje').textContent=texto;$('mensaje').classList.toggle('error',error);$('mensaje').hidden=!texto;}
    function metricas(){
        const activos=s.lista.filter(f=>f.estado==='Activo').length;
        // Cada expediente tiene su propio periodo; no sumar horas de alumnos con varios proyectos.
        const items=[['Expedientes',s.lista.length],['Alumnos',new Set(s.lista.map(f=>f.alumno)).size],['En curso',activos],['Universidades',new Set(s.lista.map(f=>f.universidad)).size]];
        $('metricas').innerHTML=items.map(([t,n])=>`<div class="dual-metric"><span>${t}</span><strong>${n}</strong></div>`).join('');
    }
    function filtrar(){
        const normal=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const q=normal($('buscar').value),estado=$('filtro').value;
        const lista=s.lista.filter(f=>(!estado||f.estado===estado)&&normal([f.nombre,f.matricula,f.proyecto_nombre,f.codigo,f.universidad].join(' ')).includes(q));
        $('selector').innerHTML=lista.map(f=>`<option value="${Number(f.id)}">${esc(f.nombre)} · ${esc(f.proyecto_nombre)}</option>`).join('')||'<option value="">Sin resultados</option>';
        if(!lista.some(f=>Number(f.id)===s.id))s.id=lista.length?Number(lista[0].id):null;
        $('selector').value=s.id||'';
        $('expediente').hidden=!s.id;$('vacio').hidden=!!s.id;
        $('vacio').querySelector('h2').textContent=s.lista.length?'No hay expedientes con esos filtros':'Aún no hay expedientes Dual';
        cargarDetalle();
    }
    async function cargar(){
        $('actualizar').disabled=true;
        try{const d=await api();s.lista=d.expedientes||[];s.admin=d.puedeGestionar===true;$('nuevo').hidden=!s.admin;$('editar').hidden=!s.admin;metricas();mensaje('');filtrar();}
        catch(e){mensaje(e.message,true);}
        finally{$('actualizar').disabled=false;}
    }
    async function cargarDetalle(){
        const turno=++s.consulta;s.detalle=null;
        if(!s.id)return;
        const f=actual();$('nombre').textContent=f.nombre;$('clave').textContent=f.codigo||'EXPEDIENTE DUAL';$('subtitulo').textContent=`${f.proyecto_nombre} · ${f.universidad} · ${f.estado}`;
        $('contenido').innerHTML='<p role="status">Consultando expediente…</p>';
        try{const d=await api('/'+s.id+'?mes='+s.mes);if(turno!==s.consulta)return;s.detalle=d;render();}
        catch(e){if(turno===s.consulta)$('contenido').innerHTML=`<div class="dual-message error" role="alert">${esc(e.message)} <button id="reintentarDetalle">Reintentar</button></div>`;$('reintentarDetalle')?.addEventListener('click',cargarDetalle);}
    }
    function tabla(headers,rows){return rows.length?`<div class="dual-table-wrap"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p class="muted">No hay registros en este periodo.</p>';}
    function render(){
        if(!s.detalle)return;
        const f=actual(),d=s.detalle,p=Number(f.proyecto),horas=Number(f.horas||0),meta=Number(f.meta),pct=Math.min(100,Math.round(horas/meta*100));
        const asesor=id=>d.asesores.find(a=>Number(a.id)===Number(id))?.nombre||'Pendiente de asignar';
        let html='';
        if(s.tab==='resumen')html=card('Avance de horas',`<div class="dual-number">${numero(horas)} <small>/ ${numero(meta)} h</small></div><div class="dual-progress" role="progressbar" aria-label="Horas aprobadas" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div><span class="dual-chip">${pct}% de la meta</span><p>${horas>=meta?'Meta de horas alcanzada. La administración puede revisar el cierre.':`Faltan ${numero(Math.max(0,meta-horas))} horas aprobadas.`}</p><p class="muted">Asistencia aprobada del alumno entre ${esc(f.inicio)} y ${esc(f.fin)}, en todos sus proyectos. No suma las horas declaradas en reportes ni duplica registros.</p>`)+card('Tu ruta Dual',`<dl>${campo('Estado',f.estado)}${campo('Periodo',f.inicio+' → '+f.fin)}${campo('Horario',f.entrada+' – '+f.salida)}${campo('Universidad',f.universidad)}${campo('Empresa',f.empresa)}${campo('Convenio',f.convenio)}</dl>`);
        if(s.tab==='convenios')html=card('Cliente, empresa y universidad',`<dl>${campo('Cliente / fundación',f.cliente)}${campo('Empresa formadora',f.empresa)}${campo('Universidad',f.universidad)}${campo('Convenio',f.convenio)}${campo('Vigencia del periodo',f.inicio+' → '+f.fin)}</dl>`)+card('Documentos del convenio',`<ul class="dual-list">${d.documentos.map(a=>`<li>${esc(a.nombre)}<small>${esc(a.fecha)}</small><button data-documento="${Number(a.id)}">Descargar PDF</button></li>`).join('')||'<li>Sin documentos cargados.</li>'}</ul>${s.admin?'<form id="subirDocumento"><label>Agregar convenio o anexo PDF (hasta 4 MB)<input type="file" id="pdfDual" accept=".pdf,application/pdf" required></label><button class="primary">Guardar documento</button></form>':'<p class="muted">La administración incorpora los documentos del convenio.</p>'}`);
        if(s.tab==='formacion')html=card('Trayectoria académica',`<dl>${campo('Alumno',f.nombre)}${campo('Matrícula',f.matricula)}${campo('Universidad',f.universidad)}${campo('Carrera',f.carrera)}${campo('Generación',f.generacion)}${campo('Cuatrimestre',f.cuatrimestre)}</dl>`)+card('Materias y objetivos',`<ul class="dual-list">${String(f.materias||'').split('\n').filter(x=>x.trim()).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>La administración puede agregar las materias al editar el expediente.</li>'}</ul><p class="muted">Registra actividades y acuerdos por materia en Seguimiento.</p>`);
        if(s.tab==='proyectos')html=card('Proyecto asignado',`<span class="dual-chip">${esc(f.codigo)}</span><h2>${esc(f.proyecto_nombre)}</h2><p>${esc(f.nombre)}</p><div class="dual-actions">${link('detalle-proyecto.html?id='+p,'Abrir proyecto')}${link('canales-proyectos.html?id='+p,'Canal y archivos')}${link('videollamadas.html','Videollamadas')}</div><p class="muted">Las tareas, entregas y videos permanecen en sus apartados del proyecto, según tus permisos.</p>`)+card('Acompañamiento',`<dl>${campo('Asesor empresa',asesor(f.asesor_empresa))}${campo('Asesor universidad',asesor(f.asesor_universidad))}${campo('Empresa',f.empresa)}${campo('Universidad',f.universidad)}</dl>`);
        if(s.tab==='reportes')html=`<article class="dual-card dual-full"><div class="dual-inline"><label>Mes de consulta<input id="mesDual" type="month" value="${s.mes}"></label>${link('canales-proyectos.html?id='+p+'#diario','Reporte diario del proyecto')}${link('control-horas.html','Control de horas')}<button id="exportar">Descargar resumen CSV</button></div><p class="muted">Datos del periodo del expediente. Las horas solo cuentan cuando están aprobadas; los reportes conservan su estado original.</p></article>`+card('Asistencia del alumno',tabla(['Fecha','Entrada','Salida','Horas','Validación'],d.asistencia.map(h=>[h.fecha,h.hora_entrada,h.hora_salida,h.horas_trabajadas,h.estado_validacion])))+card('Reportes diarios del proyecto',tabla(['Fecha','Actividad','Resultado','Estado'],d.reportes.map(r=>[r.fecha,r.actividad,r.resultado,r.estado])));
        if(s.tab==='seguimiento')html=card('Registrar seguimiento',`<form id="notaDual"><label>Tipo<select name="tipo"><option>Seguimiento</option><option>Materia</option><option>Acuerdo</option><option>Incidencia</option></select></label><label>Actividad, materia o acuerdo<textarea name="detalle" rows="5" maxlength="4000" required placeholder="Describe el avance, la materia relacionada y el siguiente paso."></textarea></label><button class="primary">Guardar seguimiento</button></form>`)+card('Bitácora empresa · universidad',`<p class="muted">Últimos 100 movimientos, con fecha y autor.</p><ul class="dual-list">${d.notas.map(n=>`<li><span class="dual-chip">${esc(n.tipo)}</span><p>${esc(n.detalle)}</p><small>${esc(n.autor)} · ${esc(n.fecha)}</small></li>`).join('')||'<li>Sin seguimientos registrados.</li>'}</ul>`);
        $('contenido').innerHTML='<div class="dual-grid">'+html+'</div>';
        $('mesDual')?.addEventListener('change',e=>{if(e.target.value){s.mes=e.target.value;cargarDetalle();}});
        $('notaDual')?.addEventListener('submit',e=>enviarNota(e));
        $('subirDocumento')?.addEventListener('submit',e=>subirDocumento(e));
        $('exportar')?.addEventListener('click',exportar);
        document.querySelectorAll('[data-documento]').forEach(b=>b.addEventListener('click',()=>descargar(b)));
    }
    async function enviarNota(e){e.preventDefault();const form=e.target,b=form.querySelector('button');b.disabled=true;try{await api('/'+s.id+'/seguimiento',json(Object.fromEntries(new FormData(form))));mensaje('Seguimiento guardado.');await cargarDetalle();}catch(err){mensaje(err.message,true);}finally{b.disabled=false;}}
    async function subirDocumento(e){e.preventDefault();const f=$('pdfDual').files[0],b=e.target.querySelector('button');if(!f||f.size>4194304){mensaje('Selecciona un PDF de hasta 4 MB.',true);return;}b.disabled=true;try{const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(f);});await api('/'+s.id+'/documentos',json({nombre:f.name,base64}));mensaje('Documento guardado.');await cargarDetalle();}catch(err){mensaje(err.message||'No se pudo leer el PDF.',true);}finally{b.disabled=false;}}
    function guardarBlob(blob,nombre){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=nombre;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    async function descargar(b){b.disabled=true;try{const r=await fetch(window.apiUrl('/api/dual/'+s.id+'/documentos/'+Number(b.dataset.documento)));if(!r.ok)throw Error('No se pudo descargar el documento.');guardarBlob(await r.blob(),'convenio-dual-'+b.dataset.documento+'.pdf');}catch(e){mensaje(e.message,true);}finally{b.disabled=false;}}
    function exportar(){const f=actual(),rows=[['Alumno','Proyecto','Mes','Meta','Horas aprobadas del periodo'],[f.nombre,f.proyecto_nombre,s.mes,f.meta,f.horas],[],['Asistencia'],['Fecha','Entrada','Salida','Horas','Estado'],...s.detalle.asistencia.map(h=>[h.fecha,h.hora_entrada,h.hora_salida,h.horas_trabajadas,h.estado_validacion]),[],['Reportes diarios'],['Fecha','Actividad','Resultado','Estado'],...s.detalle.reportes.map(r=>[r.fecha,r.actividad,r.resultado,r.estado])];const csv=rows.map(row=>row.map(v=>{let t=String(v??'');if(/^[=+@\-\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');guardarBlob(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),'dual-'+s.id+'-'+s.mes+'.csv');}
    function proyectosAlumno(seleccion){const form=$('formDual'),alumno=Number(form.elements.alumno.value);form.elements.proyecto.innerHTML='<option value="">Selecciona el proyecto</option>'+s.opciones.proyectos.filter(p=>Number(p.alumno)===alumno).map(p=>`<option value="${Number(p.id)}">${esc(p.codigo)} · ${esc(p.nombre)}</option>`).join('');if(seleccion)form.elements.proyecto.value=seleccion;}
    async function editor(nuevo){
        try{s.opciones=await api('/opciones');const form=$('formDual');form.reset();s.editando=nuevo?null:s.id;$('tituloEditor').textContent=nuevo?'Nuevo expediente Dual':'Editar expediente Dual';$('errorEditor').textContent='';
            form.elements.alumno.innerHTML='<option value="">Selecciona el alumno</option>'+s.opciones.alumnos.map(a=>`<option value="${Number(a.id)}">${esc(a.nombre)}</option>`).join('');
            const asesores='<option value="">Sin asignar</option>'+s.opciones.asesores.map(a=>`<option value="${Number(a.id)}">${esc(a.nombre)}</option>`).join('');form.elements.asesorEmpresa.innerHTML=asesores;form.elements.asesorUniversidad.innerHTML=asesores;
            if(!nuevo){const f=actual();for(const [k,v] of Object.entries(f)){if(form.elements.namedItem(k))form.elements.namedItem(k).value=v??'';}form.elements.asesorEmpresa.value=f.asesor_empresa||'';form.elements.asesorUniversidad.value=f.asesor_universidad||'';proyectosAlumno(f.proyecto);}
            else{form.elements.cliente.value='Fundación Ai-Koi, A.C.';form.elements.empresa.value='JJM Tecnologías Innovadoras';proyectosAlumno();}
            form.elements.alumno.disabled=!nuevo;form.elements.proyecto.disabled=!nuevo;
            $('editor').showModal();
        }catch(e){mensaje(e.message,true);}
    }
    async function guardar(e){e.preventDefault();const form=e.target,d=Object.fromEntries(new FormData(form)),b=form.querySelector('[type=submit]');for(const k of ['alumno','proyecto','meta'])d[k]=Number(form.elements[k].value);for(const k of ['asesorEmpresa','asesorUniversidad'])d[k]=d[k]?Number(d[k]):null;b.disabled=true;$('errorEditor').textContent='';try{const opciones=json(d);if(s.editando)opciones.method='PUT';const r=await api(s.editando?'/'+s.editando:'',opciones);s.id=Number(r.id);$('editor').close();$('buscar').value='';$('filtro').value='';await cargar();mensaje('Expediente guardado. Las horas y reportes se consultan automáticamente.');}catch(err){$('errorEditor').textContent=err.message;}finally{b.disabled=false;}}
    document.addEventListener('DOMContentLoaded',async()=>{
        if(window.restaurarSesionPMO)await window.restaurarSesionPMO();if(!localStorage.getItem('sesionTokenPMO')){location.replace('login.html');return;}
        const hoy=new Date();s.mes=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0');
        $('actualizar').addEventListener('click',cargar);$('buscar').addEventListener('input',filtrar);$('filtro').addEventListener('change',filtrar);$('selector').addEventListener('change',()=>{s.id=Number($('selector').value)||null;cargarDetalle();});
        document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{s.tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(t=>t.removeAttribute('aria-current'));b.setAttribute('aria-current','page');render();}));
        $('nuevo').addEventListener('click',()=>editor(true));$('editar').addEventListener('click',()=>editor(false));$('cerrarEditor').addEventListener('click',()=>$('editor').close());$('cancelarEditor').addEventListener('click',()=>$('editor').close());$('formDual').addEventListener('submit',guardar);
        $('formDual').elements.alumno.addEventListener('change',()=>{const form=$('formDual'),a=s.opciones.alumnos.find(x=>Number(x.id)===Number(form.elements.alumno.value));for(const k of ['matricula','universidad','carrera','cuatrimestre'])form.elements[k].value=a?.[k]||'';proyectosAlumno();});
        await cargar();
    });
})();
