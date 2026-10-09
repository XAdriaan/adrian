const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const codigo=nombre=>fs.readFileSync(path.join(__dirname,'../js/'+nombre),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json'}});
function presencia(rol='Colaborador',fetch=async()=>json({aplicable:true,contando:true,segundos:60,segundosHastaCierre:10})){
    let token='token';const eventos={},intervalos=[],llamadas=[];
    const window={crypto:{randomUUID:()=> 'pagina-prueba'},apiUrl:p=>'https://oficina.test'+p,obtenerTokenSesionPMO:()=>token,
        addEventListener:(n,f)=>eventos[n]=f,dispatchEvent(){},fetch:async(url,init)=>{llamadas.push({url,init});return fetch(url,init);}};
    vm.runInNewContext(codigo('asistencia-automatica.js'),{window,Event,AbortController,Date,Math,setTimeout,clearTimeout,
        setInterval:(fn,ms)=>intervalos.push({fn,ms}),localStorage:{getItem:()=>JSON.stringify({rol})}});
    return {window,eventos,intervalos,llamadas,cerrarSesion:()=>token=''};
}
test('presencia envía identidad de pestaña, nunca horas del navegador, y pausa al cerrar',async()=>{
    const e=presencia();await tick();assert.equal(e.llamadas.length,1);
    assert.deepEqual(JSON.parse(e.llamadas[0].init.body),{pagina:'pagina-prueba'});
    assert.equal(e.llamadas[0].init.headers.Authorization,'Bearer token');
    e.eventos.pagehide();await tick();assert.ok(e.llamadas[1].url.endsWith('/salida'));assert.equal(e.llamadas[1].init.keepalive,true);
    e.intervalos[0].fn();await tick();assert.equal(e.llamadas.length,2);
    e.eventos.pageshow();await tick();assert.equal(e.llamadas.length,3);
});
test('profesores y directivos no generan presencia y los errores no se muestran como horas guardadas',async()=>{
    for(const rol of ['Administrador','Directivo escolar','Asesor Académico']){const e=presencia(rol);await tick();assert.equal(e.llamadas.length,0);}
    const e=presencia('Colaborador',async()=>json({mensaje:'sin servicio'},503));await tick();
    assert.equal(e.window.asistenciaAutomaticaPMO.estado().error,true);assert.equal(e.window.asistenciaAutomaticaPMO.segundosVisibles(),null);
    e.intervalos[1].fn();await tick();assert.equal(e.llamadas.length,1,'no reintenta cada segundo');
});
function cartas(){
    const documentos=[],escrituras=[];
    const datos={nombreCompleto:'Alumno',matricula:'123',universidad:'UT',carrera:'TI',cuatrimestre:'9',fechaInicio:'2026-05-01',fechaFin:'2026-08-31'};
    const window={};const contexto={window,document:{addEventListener(){}},documentosPMO:documentos,
        puedeValidarDocumentos:()=>true,obtenerDatosAcademicosMiembroDocumentos:m=>m.datos,
        obtenerNombreMiembroDocumentos:m=>m.nombre, generarCartaAceptacionPDFBase64:async()=> 'pdf',
        convertirCartaHTMLaPDFBase64:async()=> 'pdf',generarDocumentoPersonalizadoHTML:()=> 'html',
        guardarDocumentoBackend:async doc=>{escrituras.push(doc);return {documento:{...doc,id:escrituras.length}};}};
    vm.runInNewContext(codigo('cartas-lote.js'),contexto);
    return {api:window.CartasLotePMO,documentos,escrituras,datos};
}
test('un lote libera varios alumnos, informa datos incompletos y continúa después de un fallo',async()=>{
    const e=cartas(),alumnos=[{idUsuario:1,nombre:'Uno',datos:e.datos},{idUsuario:2,nombre:'Dos',datos:{}},{idUsuario:3,nombre:'Tres',datos:e.datos}];
    const progreso=[];const r=await e.api.ejecutarLote(alumnos,'Carta de término',(n,total)=>progreso.push([n,total]));
    assert.deepEqual(Array.from(r,x=>x.estado),['Liberada','Pendiente','Liberada']);assert.equal(e.escrituras.length,2);
    assert.deepEqual(progreso,[[1,3],[2,3],[3,3]]);
    const repetido=await e.api.ejecutarLote(alumnos,'Carta de término');assert.equal(e.escrituras.length,2);
    assert.equal(repetido[0].estado,'Ya liberada');assert.equal(repetido[2].estado,'Ya liberada');
});
test('una carta de otro periodo no impide liberar la del periodo seleccionado',async()=>{
    const e=cartas();e.documentos.push({id:22,idUsuario:1,tipoDocumento:'Carta de aceptación',estado:'Liberada',generadoAutomaticamente:true,
        datosAcademicos:{fechaInicio:'2026-01-01',fechaFin:'2026-04-30'}});
    await e.api.generarParaAlumno({idUsuario:1,nombre:'Uno',datos:e.datos},'Carta de aceptación');
    assert.equal(e.escrituras.length,1);assert.equal(e.escrituras[0].datosAcademicos.fechaInicio,'2026-05-01');
});
test('MAY-AGO y SEP-DIC se clasifican aun sin fecha, sin inventar periodo a datos pendientes',()=>{
    const window={};vm.runInNewContext(codigo('periodos.js'),{window,Date});
    assert.equal(window.PMOPeriodos.clasificar({periodoEstadia:'MAY - AGO 2026'}).clave,'mayo-agosto');
    assert.equal(window.PMOPeriodos.clasificar({periodoEstadia:'SEP-DIC'}).clave,'septiembre-diciembre');
    assert.equal(window.PMOPeriodos.clasificar({fechaRegistro:'2026-05-01'}).clave,'');
});
test('padrón conserva mayo-agosto y cuentas sin miembro, separando alumnos sin periodo',async()=>{
    const window={apiUrl:p=>p,location:{}};
    const alumno={idUsuario:33,nombre:'Alumno anterior',rol:'Colaborador',estado:'Inactivo',matricula:'33',
        periodoEstadia:'MAY-AGO 2026',fechaInicio:'2026-05-01',fechaFin:'2026-08-31'};
    const document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
    const contexto=vm.createContext({window,document,Date,Map,Set,console:{log(){},error(){},warn(){}},
        localStorage:{getItem:k=>k==='usuarioActivo'?JSON.stringify({id:15,rol:'Superadministrador'}):null},
        fetch:async url=>json(url==='/api/miembros'?{miembros:[{id:1,idUsuario:1,nombreCompleto:'Alumno pendiente',rol:'Colaborador'}]}
            :url==='/api/supervision-escolar'?{alumnos:[alumno]}
            :{datos:String(url).endsWith('/33')?alumno:{}})});
    vm.runInContext(codigo('periodos.js'),contexto);vm.runInContext(codigo('documentos.js'),contexto);
    await vm.runInContext('cargarMiembrosDocumentos()',contexto);
    await vm.runInContext('cargarDatosAcademicosDocumentosBackend()',contexto);
    const mayo=vm.runInContext("filtroPeriodoDocumentos='mayo-agosto';filtroAnioDocumentos='2026';obtenerAlumnosFiltradosDocumentos().map(a=>a.idUsuario)",contexto);
    assert.deepEqual(Array.from(mayo),[33]);
    const pendientes=vm.runInContext("filtroPeriodoDocumentos='sin-periodo';filtroAnioDocumentos='';obtenerAlumnosFiltradosDocumentos().map(a=>a.idUsuario)",contexto);
    assert.deepEqual(Array.from(pendientes),[1]);
});
