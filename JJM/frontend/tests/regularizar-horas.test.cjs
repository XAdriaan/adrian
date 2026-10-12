const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const codigo=fs.readFileSync(path.join(__dirname,'../js/regularizar-horas.js'),'utf8'),tick=()=>new Promise(r=>setImmediate(r));
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json'}});
function entorno(fetch){const elementos={},rutas=[];const document={getElementById:id=>elementos[id]||(elementos[id]={disabled:false,hidden:false,eventos:{},addEventListener(n,fn){this.eventos[n]=fn}})};const window={apiUrl:r=>r,obtenerTokenSesionPMO:()=>true,restaurarSesionPMO:async()=>({id:15,rol:'Superadministrador'}),location:{replace(){}}};vm.runInNewContext(codigo,{document,window,fetch:async(...args)=>{rutas.push(args);return fetch(...args)},AbortController,setTimeout,clearTimeout});return{elementos,rutas};}
const vista={alumnos:[{idUsuario:10,nombre:'<script>prueba</script>',horasExistentes:4.5,horasPorReconocer:295.5,objetivoHoras:300}]};
test('muestra alumnos y diferencias antes de permitir la regularización sin enviar fechas ni horas del cliente',async()=>{
 const e=entorno(async()=>json(vista));await tick();assert.equal(e.rutas[0][0],'/api/regularizacion-horas');assert.equal(e.elementos.regularizacionAplicar.disabled,false);assert.match(e.elementos.regularizacionFilas.innerHTML,/295.50 h/);assert.match(e.elementos.regularizacionFilas.innerHTML,/&lt;script&gt;/);assert.doesNotMatch(e.elementos.regularizacionFilas.innerHTML,/<script>/);
});
test('un grupo ya completo o un rechazo de permisos no permiten aplicar cambios',async()=>{
 const e=entorno(async()=>json({alumnos:[{nombre:'Alumno',horasExistentes:300,horasPorReconocer:0}]}));await tick();assert.equal(e.elementos.regularizacionAplicar.disabled,true);assert.match(e.elementos.regularizacionEstado.textContent,/ya están completas/);
 const denegado=entorno(async()=>json({mensaje:'Solo administración.'},403));await tick();assert.equal(denegado.elementos.regularizacionAplicar.disabled,true);assert.match(denegado.elementos.regularizacionError.textContent,/administración/);
});
test('evita dos solicitudes simultáneas y confirma el resultado recibido del servidor',async()=>{
 let resolver;const e=entorno(async(r,init={})=>init.method==='POST'?new Promise(r=>resolver=r):json(vista));await tick();const aplicar=e.elementos.regularizacionAplicar.eventos.click();await e.elementos.regularizacionAplicar.eventos.click();assert.equal(e.rutas.filter(r=>r[1].method==='POST').length,1);
 const solicitud=e.rutas.find(r=>r[1].method==='POST');assert.equal(solicitud[1].body,undefined);resolver(json({alumnos:1,registrosCreados:30,horasReconocidas:295.5}));await aplicar;assert.match(e.elementos.regularizacionEstado.textContent,/Regularización aplicada.*295.50/);
});
test('el total del contador combina el día reconocido y el historial una sola vez',()=>{
 const fuente=fs.readFileSync(path.join(__dirname,'../js/control-horas.js'),'utf8');const inicio=fuente.indexOf('function actualizarContadorAutomatico()');const fin=fuente.indexOf('window.addEventListener("pmo:asistencia"',inicio);const horasHoy={},horasTotales={};
 const registrosHoras=[{idMiembro:11,fecha:'2026-09-01',horasTrabajadas:290},{id:1,idMiembro:11,fecha:'2026-10-12',horasTrabajadas:1},{id:2,idMiembro:11,fecha:'2026-10-12',horasTrabajadas:9}];
 const horasAprobadas={}; const ctx=vm.createContext({window:{asistenciaAutomaticaPMO:{esAlumno:()=>true,estado:()=>({idMiembro:11,idRegistro:1,fecha:'2026-10-12',contando:false}),segundosVisibles:()=>36000,formato:()=> '10:00:00'}},registrosHoras,horasHoy,horasTotales,horasAprobadas,textoJornada:null});vm.runInContext(fuente.slice(inicio,fin),ctx);vm.runInContext('actualizarContadorAutomatico()',ctx);
 assert.equal(horasTotales.textContent,'300.00h');assert.equal(horasHoy.textContent,'10:00:00 / 10:00:00');
 ctx.registrosHoras=[];ctx.window.asistenciaAutomaticaPMO.estado=()=>({idMiembro:11,fecha:'2026-10-12',segundos:36000,horasAcumuladas:300,horasAprobadasAcumuladas:300,contando:false});vm.runInContext('actualizarContadorAutomatico()',ctx);assert.equal(horasTotales.textContent,'300.00h','el total se actualiza aunque los registros cargados en la página todavía sean anteriores al ajuste');assert.equal(horasAprobadas.textContent,'300.00h');
});
test('permite reparar las aprobaciones y el formato aunque las 300 horas ya estén registradas',async()=>{
 const e=entorno(async()=>json({alumnos:[{nombre:'Alumno',horasExistentes:300,horasPorReconocer:0,horasPorAprobar:4.5,diasPorIdentificar:1}]}));await tick();assert.equal(e.elementos.regularizacionAplicar.disabled,false);assert.match(e.elementos.regularizacionEstado.textContent,/Por aprobar: 4.50/);
});
