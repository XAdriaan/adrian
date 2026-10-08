const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
function entorno(fetch) {
 const elementos = {}, callbacks = {};
 const el = id => elementos[id] ||= {value:'', hidden:false, disabled:false, innerHTML:'', addEventListener(n,fn){this[n]=fn;}};
 const contexto = vm.createContext({document:{getElementById:el, querySelectorAll:()=>[], addEventListener:(n,fn)=>callbacks[n]=fn},window:{apiUrl:x=>x},fetch,console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/asignaciones.js'),'utf8'),contexto);
 return {el, callbacks};
}
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s});
const datos={estado:'correcto', proyectos:[{equipo:'08',codigo:'JJM-SD26-08',proyectoId:8,proyecto:'Punto de Venta',alumnoPDF:'Emily',alumnos:[],tareas:10,tareasSinAsignar:10,estado:'Pendiente de confirmar'}],alumnosDisponibles:[{id:8,nombre:'Emily <script>prueba</script>'}]};
const esperar = ()=>new Promise(r=>setImmediate(r));
test('consulta sin modificar asignaciones y escapa nombres antes de mostrarlos',async()=>{
 let llamadas=[];const e=entorno(async(u,o)=>{llamadas.push([u,o]);return json(datos);});
 e.callbacks.DOMContentLoaded();await esperar();
 assert.equal(llamadas.length,1);assert.equal(llamadas[0][1].method,undefined);
 assert.match(e.el('listaAsignaciones').innerHTML,/&lt;script&gt;/);assert.doesNotMatch(e.el('listaAsignaciones').innerHTML,/<script>/);
 assert.match(e.el('listaAsignaciones').innerHTML,/10 sin responsable/);
 e.el('buscarAsignacion').value='no-existe';e.el('buscarAsignacion').input();assert.match(e.el('listaAsignaciones').innerHTML,/No hay coincidencias/);
});
test('fallo de API muestra el error sin anunciar asignaciones guardadas',async()=>{
 const e=entorno(async()=>json({estado:'error',mensaje:'Solo Administración'},403));e.callbacks.DOMContentLoaded();await esperar();
 assert.equal(e.el('mensajeAsignaciones').textContent,'Solo Administración');assert.match(e.el('listaAsignaciones').innerHTML,/No se pudieron cargar/);
 assert.equal(e.el('sincronizarCatalogo').disabled,false);
});
test('confirmación envía únicamente la cuenta seleccionada y evita envíos simultáneos',async()=>{
 let llamadas=[],resolver;const e=entorno(async(u,o)=>{llamadas.push([u,o]);return o.method==='POST'?new Promise(r=>resolver=r):json(datos);});
 e.callbacks.DOMContentLoaded();await esperar();
 const form={dataset:{codigo:'JJM-SD26-08'},elements:{idMiembro:{value:'8'}}},evento={preventDefault(){},target:{closest:()=>form}};
 e.el('listaAsignaciones').submit(evento);e.el('listaAsignaciones').submit(evento);
 assert.equal(llamadas.length,2);assert.deepEqual(JSON.parse(llamadas[1][1].body),{idMiembro:8});assert.match(llamadas[1][0],/JJM-SD26-08\/alumno$/);
 resolver(json({...datos,proyectos:[{...datos.proyectos[0],alumnos:[{id:8,nombre:'Emily Cuenta'}],estado:'Asignado',tareasSinAsignar:0}]}));await esperar();
 assert.match(e.el('mensajeAsignaciones').textContent,/guardadas/);assert.match(e.el('listaAsignaciones').innerHTML,/Emily Cuenta/);
});
