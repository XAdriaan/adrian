const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const codigo=n=>fs.readFileSync(path.join(__dirname,'../js',n),'utf8');
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s});
function entorno(archivo,fetch){
 const elementos={},eventos={};const el=id=>elementos[id]||(elementos[id]={value:'',files:[],disabled:false,hidden:false,style:{},dataset:{},classList:{add(){},remove(){}},querySelectorAll:()=>[],addEventListener(){},reset(){this.reiniciado=true;}});
 const window={apiUrl:r=>r,location:{search:'?id=2&reunion=9',href:'http://localhost/reunion.html?id=2&reunion=9',replace(){}},history:{replaceState(){}},addEventListener(){}};
 const contexto=vm.createContext({window,document:{getElementById:el,addEventListener:(n,f)=>eventos[n]=f,querySelectorAll:()=>[]},
   localStorage:{getItem:k=>k==='usuarioActivo'?JSON.stringify({id:7,nombre:'Mi nombre'}):'token'},
   location:{href:'',hash:''},fetch,Response,Blob,TextEncoder,Uint8Array,URL,URLSearchParams,setTimeout(){},setInterval(){return 1;},clearInterval(){},console:{warn(){},error(){}},
   FileReader:class{readAsDataURL(){this.result='data:application/pdf;base64,JVBERg==';this.onload();}}});
 vm.runInContext(codigo(archivo),contexto);return {el,window,eventos,contexto,run:s=>vm.runInContext(s,contexto)};
}
test('asistencia cambia de mes sin mostrar la respuesta anterior retrasada',async()=>{
 let primero;let llamadas=0;
 const e=entorno('mi-estadia.js',()=>++llamadas===1?new Promise(r=>primero=r):Promise.resolve(json({registros:[{fecha:'2026-11-02',horasTrabajadas:2}]})));
 e.el('mesAsistencia').value='2026-10';const p=e.run('cargarAsistencia()');
 e.el('mesAsistencia').value='2026-11';await e.run('cargarAsistencia()');
 primero(json({registros:[{fecha:'2026-10-01',horasTrabajadas:20}]}));await p;
 assert.equal(e.run('estadia.registros[0].fecha'),'2026-11-02');
 assert.equal(e.el('descargarAsistencia').disabled,false);
});
test('fallo de asistencia deshabilita PDF y no conserva datos de otro periodo',async()=>{
 const e=entorno('mi-estadia.js',async()=>json({mensaje:'Sin conexión'},503));
 e.el('mesAsistencia').value='2026-10';e.run("estadia.registros=[{fecha:'2026-09-01'}]");await e.run('cargarAsistencia()');
 assert.equal(e.run('estadia.registros.length'),0);assert.equal(e.el('descargarAsistencia').disabled,true);
 assert.equal(e.el('mensajeAsistencia').textContent,'Sin conexión');
});
test('FO-EST-03 se entrega con identidad de sesión y muestra confirmación solo tras guardar',async()=>{
 const llamadas=[];const e=entorno('mi-estadia.js',async(url,opts)=>{llamadas.push({url,opts});return json(opts?{documento:{id:1}}:{documentos:[]},opts?201:200);});
 e.el('archivoFoEst03').files=[{name:'evaluacion.pdf',size:100}];e.el('observacionesFoEst03').value='  Revisar  ';
 await e.run('subirFoEst03({preventDefault(){}})');
 const body=JSON.parse(llamadas[0].opts.body);assert.equal(body.tipoDocumento,'FO-EST-03');
 assert.equal(body.idUsuario,undefined);assert.equal(body.observaciones,'Revisar');
 assert.equal(e.el('mensajeFoEst03').className,'pmo-message success');assert.equal(e.el('formFoEst03').reiniciado,true);
});
test('FO-EST-03 rechaza extensión y tamaño sin enviar ni mostrar éxito',async()=>{
 let llamadas=0;const e=entorno('mi-estadia.js',async()=>{llamadas++;return json({});});
 for(const file of [{name:'archivo.exe',size:10},{name:'formato.xlsx',size:5*1024*1024}]){
  e.el('archivoFoEst03').files=[file];await e.run('subirFoEst03({preventDefault(){}})');
  assert.equal(e.el('mensajeFoEst03').className,'pmo-message error');
 }
 assert.equal(llamadas,0);
});
test('fallo al entregar FO-EST-03 conserva el archivo para reintentar',async()=>{
 const e=entorno('mi-estadia.js',async()=>json({mensaje:'No se pudo guardar'},500));
 e.el('archivoFoEst03').files=[{name:'evaluacion.pdf',size:100}];await e.run('subirFoEst03({preventDefault(){}})');
 assert.equal(e.el('formFoEst03').reiniciado,undefined);assert.equal(e.el('subirFoEst03').disabled,false);
 assert.equal(e.el('mensajeFoEst03').textContent,'No se pudo guardar');
});
test('historial de FO-EST-03 filtra documentos ajenos aun cuando la sesión sea administrativa',async()=>{
 const e=entorno('mi-estadia.js',async()=>json({documentos:[{idUsuario:7,tipoDocumento:'FO-EST-03',nombreArchivo:'Propio.pdf'},
 {idUsuario:8,tipoDocumento:'FO-EST-03',nombreArchivo:'Ajeno.pdf'},{idUsuario:7,tipoDocumento:'Carta',nombreArchivo:'Carta.pdf'}]}));
 await e.run('cargarEntregasFoEst03()');assert.equal(e.run('estadia.archivos.length'),1);
 assert.match(e.el('entregasFoEst03').innerHTML,/Propio/);assert.doesNotMatch(e.el('entregasFoEst03').innerHTML,/Ajeno/);
});
test('pase de lista conserva dos jornadas del mismo día y registros del fin de semana',()=>{
 const e=entorno('estadia-formatos.js');const filas=e.window.EstadiaFormatos.filasAsistencia({mes:'2026-10',datos:{fechaInicio:'2026-10-01',fechaFin:'2026-10-06'},
 registros:[{fecha:'2026-10-02',horaEntrada:'13:00',horasTrabajadas:3},{fecha:'2026-10-02',horaEntrada:'09:00',horasTrabajadas:3},
 {fecha:'2026-10-03',horaEntrada:'10:00',incidente:'recuperacion'},{fecha:'2026-09-30',horaEntrada:'09:00'}]});
 assert.equal(filas.filter(f=>f.fecha==='2026-10-02').length,2);
 assert.equal(filas.find(f=>f.fecha==='2026-10-02').horaEntrada,'09:00');
 assert.equal(filas.some(f=>f.fecha==='2026-10-03'),true);assert.equal(filas.some(f=>f.fecha==='2026-09-30'),false);
 assert.equal(filas.find(f=>f.fecha==='2026-10-05').horaEntrada,undefined);
});
test('periodos inválidos del PDF se rechazan sin fechas inventadas',()=>{
 const e=entorno('estadia-formatos.js');assert.throws(()=>e.window.EstadiaFormatos.filasAsistencia({mes:'2026-13',datos:{},registros:[]}),/válido/);
});
test('unirse reutiliza reunión activa sin crear otra',async()=>{
 let llamadas=0;const e=entorno('videollamadas.js',async()=>{llamadas++;return json({});});
 e.run('salasVideollamadas=[{id:2,reunionActiva:{id:9}}]');const boton={textContent:'Unirme'};e.contexto.boton=boton;
 await e.run('abrirSalaVideollamada(2,boton)');assert.equal(llamadas,0);
 assert.equal(e.contexto.location.href,'reunion.html?id=2&reunion=9');
});
test('crear sala espera al servidor y utiliza el ID devuelto',async()=>{
 const llamadas=[];const e=entorno('videollamadas.js',async(url,opts)=>{llamadas.push({url,opts});return json({reunion:{id:12}},201);});
 e.run('salasVideollamadas=[{id:2,puedeCrear:true}]');e.contexto.boton={textContent:'Iniciar'};
 await e.run('abrirSalaVideollamada(2,boton)');assert.equal(llamadas[0].url,'/api/proyectos/2/reuniones');
 assert.equal(llamadas[0].opts.method,'POST');assert.equal(e.contexto.location.href,'reunion.html?id=2&reunion=12');
});
test('sala rechazada conserva la página y permite reintentar',async()=>{
 const e=entorno('videollamadas.js',async()=>json({mensaje:'No tienes acceso'},403));
 e.run('salasVideollamadas=[{id:2,puedeCrear:true}]');e.contexto.boton={textContent:'Iniciar'};
 await e.run('abrirSalaVideollamada(2,boton)');assert.equal(e.contexto.location.href,'');
 assert.equal(e.contexto.boton.disabled,false);assert.equal(e.el('mensajeSalas').textContent,'No tienes acceso');
});
test('la sala restaura la sesión antes de consultar proyecto o reunión',async()=>{
 let restaurada=false;const llamadas=[];
 const e=entorno('reunion.js',async url=>{assert.equal(restaurada,true);llamadas.push(url);
  return json(url.includes('/proyectos/')?{estado:'correcto',proyecto:{id:2,nombre:'Proyecto'}}:{estado:'correcto',reunion:{id:9,idProyecto:2,estado:'Activa',sala:'sala-test'}});});
 e.window.restaurarSesionPMO=async()=>{await Promise.resolve();restaurada=true;};
 e.window.PMOSalaWebRTC=class{constructor(opciones){this.opciones=opciones;}};
 await e.eventos.DOMContentLoaded();
 assert.equal(llamadas.join(','),'/api/reuniones/9,/api/proyectos/2');
 assert.equal(e.run('rtc.opciones.sala'),'9');
 assert.equal(e.el('btnEntrarSala').hidden,false);
});
test('enlace con reunión de otro proyecto no abre una sala equivocada',async()=>{
 const e=entorno('reunion.js',async()=>json({reunion:{id:9,idProyecto:77,estado:'Activa'}}));
 await assert.rejects(()=>e.run('cargarReunion()'),/no pertenece al proyecto/);
});
