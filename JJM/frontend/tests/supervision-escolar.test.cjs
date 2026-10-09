const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const codigo = archivo => fs.readFileSync(path.join(__dirname, '../js', archivo), 'utf8');
const json = (datos, status = 200) => new Response(JSON.stringify(datos), {status});
function entorno(fetch) {
    const elementos = {};
    const el = id => elementos[id] ||= {value:'', hidden:false, disabled:false, innerHTML:'', textContent:'', scrollIntoView(){}, addEventListener(){}};
    const contexto = vm.createContext({window:{apiUrl:r=>r},document:{getElementById:el,addEventListener(){}},fetch,console});
    vm.runInContext(codigo('periodos.js'), contexto);
    vm.runInContext(codigo('supervision-escolar.js'), contexto);
    return {el, run:s=>vm.runInContext(s, contexto)};
}
test('supervision filtra por año, periodo y matrícula sin asignar fecha a alumnos pendientes', async () => {
    const e = entorno(async()=>json({alumnos:[
        {idUsuario:10,nombre:'Adrián',matricula:'ABC',fechaInicio:'2026-09-01',totalDocumentos:2},
        {idUsuario:11,nombre:'Rodrigo',fechaInicio:'2027-09-01',totalDocumentos:1},
        {idUsuario:12,nombre:'Pendiente',fechaRegistro:'2026-09-01'}]}));
    await e.run('cargarAlumnosEscolar()');
    assert.equal(e.el('totalAlumnosEscolar').textContent,3);
    assert.equal(e.el('totalPeriodoEscolar').textContent,2);
    e.el('anioEscolar').value='2026'; e.el('periodoEscolar').value='septiembre-diciembre'; e.el('buscarEscolar').value='adrian';
    e.run('renderizarAlumnosEscolar()');
    assert.match(e.el('alumnosEscolar').innerHTML,/Adrián/);
    assert.doesNotMatch(e.el('alumnosEscolar').innerHTML,/Rodrigo|Pendiente/);
    e.el('anioEscolar').value=''; e.el('periodoEscolar').value='sin-periodo'; e.el('buscarEscolar').value='';
    e.run('renderizarAlumnosEscolar()'); assert.match(e.el('alumnosEscolar').innerHTML,/Pendiente/);
});
test('un error de acceso o servidor se muestra y no se convierte en cero alumnos', async () => {
    let fallo=false;
    const e=entorno(async()=>fallo?json({mensaje:'Sin acceso'},403):json({alumnos:[{idUsuario:10,nombre:'Alumno'}]}));
    await e.run('cargarAlumnosEscolar()'); fallo=true; await e.run('cargarAlumnosEscolar()');
    assert.equal(e.el('mensajeEscolar').textContent,'Sin acceso');
    assert.equal(e.el('totalAlumnosEscolar').textContent,'—');
    assert.doesNotMatch(e.el('alumnosEscolar').innerHTML,/No hay alumnos/);
    assert.equal(e.el('actualizarEscolar').disabled,false);
});
test('al cambiar de alumno una respuesta retrasada no reemplaza el expediente actual', async () => {
    let resolver;
    const detalle=id=>({alumno:{nombre:'Alumno '+id},documentos:[],certificados:[]});
    const e=entorno(async ruta=>ruta.endsWith('/10')?new Promise(r=>resolver=r):json(detalle(11)));
    const primera=e.run('abrirExpedienteEscolar(10)');
    await e.run('abrirExpedienteEscolar(11)'); resolver(json(detalle(10))); await primera;
    assert.equal(e.el('nombreExpedienteEscolar').textContent,'Alumno 11');
});
test('el expediente escapa datos de alumnos y solo ofrece consulta de documentos', async () => {
    const e=entorno(async()=>json({alumno:{nombre:'Alumno',matricula:'<script>robo</script>'},
        documentos:[{id:20,nombreArchivo:'<img src=x>',estado:'Pendiente'}],certificados:[]}));
    await e.run('abrirExpedienteEscolar(10)');
    assert.match(e.el('datosExpedienteEscolar').innerHTML,/&lt;script&gt;/);
    assert.doesNotMatch(e.el('documentosEscolar').innerHTML,/<img|Aceptar|Rechazar|Eliminar|data-documento="undefined"/);
    assert.match(e.el('documentosEscolar').innerHTML,/Descargar/);
});
test('directivo tiene enlace de supervisión y no adquiere permisos administrativos ni exige matrícula propia', () => {
    const contexto=vm.createContext({window:{}, document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},
        localStorage:{getItem:()=>null},console});
    vm.runInContext(codigo('permisos-globales.js'),contexto);
    contexto.usuario={rol:'Directivo escolar',permisos:['roles.gestionar','documentos.validar']};
    assert.equal(vm.runInContext('tienePermisoGlobal(usuario,"supervision.ver")',contexto),true);
    assert.equal(vm.runInContext('tienePermisoGlobal(usuario,"roles.gestionar")',contexto),false);
    assert.equal(vm.runInContext('esAdministradorGlobal(usuario)',contexto),false);
    assert.equal(vm.runInContext('debeCompletarDatosAcademicosGlobal(usuario,"supervision-escolar.html",false)',contexto),false);
});
test('el login de directivo abre supervisión sin pedirle un expediente de alumno', async () => {
    let submit; const navegaciones=[], llamadas=[], storage=new Map();
    const el={loginForm:{addEventListener:(evento,fn)=>submit=fn},email:{value:'directivo@example.invalid'},password:{value:'clave-de-prueba'},
        'error-message':{style:{}},'success-message':{style:{}},btnLogin:{}};
    const contexto=vm.createContext({window:{apiUrl:r=>r,location:{search:'',replace:r=>navegaciones.push(r)}},
        document:{getElementById:id=>el[id]||null},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},sessionStorage:{setItem(){}},
        fetch:async ruta=>{llamadas.push(ruta);return json({usuario:{id:7,rol:'Directivo escolar'},token:'token'});},
        setTimeout:(fn,ms)=>{if(ms===350)queueMicrotask(fn);return 1;},clearTimeout(){},AbortController,URLSearchParams,console});
    vm.runInContext(codigo('login.js'),contexto); await submit({preventDefault(){}}); await Promise.resolve();
    assert.deepEqual(navegaciones,['supervision-escolar.html']);
    assert.deepEqual(llamadas,['/api/auth/login']);
});
