const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const codigo=fs.readFileSync(path.join(__dirname,'../js/asistencia-monitor.js'),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
const json=(datos,status=200)=>new Response(JSON.stringify(datos),{status,headers:{'Content-Type':'application/json'}});
function entorno(fetch,token=true){
 const elementos={},documento={hidden:false,getElementById:id=>elementos[id]||(elementos[id]={value:id==='monitorFiltro'?'todos':'',hidden:false,dataset:{},eventos:{},addEventListener(n,f){this.eventos[n]=f}}),querySelectorAll:()=>[],addEventListener(){}};
 const rutas=[],intervalos=[],navegaciones=[];
 const window={apiUrl:r=>r,obtenerTokenSesionPMO:()=>token,restaurarSesionPMO:async()=>({id:15,rol:'Superadministrador'}),location:{replace:r=>navegaciones.push(r)}};
 vm.runInNewContext(codigo,{document:documento,window,fetch:async(...args)=>{rutas.push(args);return fetch(...args)},Intl,Date,setTimeout,clearTimeout,AbortController,setInterval:(fn,ms)=>intervalos.push({fn,ms})});
 return {elementos,documento,rutas,intervalos,navegaciones};
}
const resultado={consultadoEn:'2026-10-12T15:00:00Z',personas:[{idUsuario:10,nombre:'<img src=x onerror=alert(1)>',rol:'Colaborador',estado:'Activo',alumno:true,contando:true,conectado:true,segundos:3610,idRegistro:9,entrada:'07:00:00',apartado:'dashboard.html',ultimaConexion:'2026-10-12T15:00:00Z'},{idUsuario:15,nombre:'Profesor de prueba',rol:'Superadministrador',estado:'Activo',alumno:false,contando:false,conectado:false,segundos:0}]};
test('el panel separa las conexiones de las horas escolares y escapa nombres',async()=>{
 const e=entorno(async()=>json(resultado));await tick();
 assert.match(e.rutas[0][0],/^\/api\/presencia\/monitor\?fecha=\d{4}-\d{2}-\d{2}$/);assert.equal(e.elementos.monitorConectados.textContent,1);assert.equal(e.elementos.monitorContando.textContent,1);
 assert.match(e.elementos.monitorFilas.innerHTML,/01:00:10/);assert.match(e.elementos.monitorFilas.innerHTML,/&lt;img/);assert.doesNotMatch(e.elementos.monitorFilas.innerHTML,/<img/);
 e.elementos.monitorFiltro.value='online';e.elementos.monitorFiltro.eventos.change();assert.doesNotMatch(e.elementos.monitorFilas.innerHTML,/Profesor de prueba/);
});
test('el panel no disfraza un rechazo de permisos como cero alumnos',async()=>{
 const e=entorno(async()=>json({mensaje:'Acceso reservado a administración.'},403));await tick();assert.equal(e.elementos.monitorError.hidden,false);assert.match(e.elementos.monitorError.textContent,/Acceso reservado/);assert.match(e.elementos.monitorFilas.innerHTML,/No se confirmó acceso/);
 const llamadas=e.rutas.length;e.intervalos.find(i=>i.ms===30000).fn();await tick();assert.equal(e.rutas.length,llamadas);
});
test('el panel no consulta sin sesión ni hace consultas automáticas si la página está oculta',async()=>{
 const ausente=entorno(async()=>json(resultado),false);await tick();assert.deepEqual(ausente.navegaciones,['login.html']);assert.equal(ausente.rutas.length,0);
 const e=entorno(async()=>json(resultado));await tick();e.documento.hidden=true;e.intervalos.find(i=>i.ms===30000).fn();await tick();assert.equal(e.rutas.length,1);
 e.intervalos.find(i=>i.ms===1000).fn();assert.equal(e.rutas.length,1);
});
