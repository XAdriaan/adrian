const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const fuente=fs.readFileSync(path.join(__dirname,'../js/grabaciones.js'),'utf8');
function cliente(fetch){const window={apiUrl:p=>p,addEventListener(){}};vm.runInNewContext(fuente,{window,fetch,localStorage:{getItem:()=> 'sesion-prueba'},document:{addEventListener(){}},AbortController,setTimeout,clearTimeout});return window.PMOGrabaciones;}
const respuesta=d=>({ok:true,json:async()=>d});
const video=new Blob([new Uint8Array(4*1024*1024+7)]);
test('un corte de red reenvía la misma parte antes de continuar y confirma al finalizar',async()=>{
 const enviados=[];let corte=true;
 const api=cliente(async(r,o)=>{if(r==='/api/grabaciones/cargas')return respuesta({id:'carga-1'});if(r.endsWith('/finalizar'))return respuesta({grabacion:{id:'video-1'}});enviados.push([r,o.body.size]);if(corte){corte=false;throw new TypeError('Corte de red');}return respuesta({});});
 const guardada=await api.subir(video,{sala:'general',titulo:'Reunión',duracionSegundos:5});assert.equal(guardada.id,'video-1');assert.deepEqual(enviados.map(x=>x[0]),['/api/grabaciones/cargas/carga-1?parte=0','/api/grabaciones/cargas/carga-1?parte=0','/api/grabaciones/cargas/carga-1?parte=1']);assert.equal(enviados[0][1],enviados[1][1]);
});
test('un rechazo de permisos interrumpe la carga sin anunciar un video guardado',async()=>{
 let partes=0,finalizar=0;const api=cliente(async r=>{if(r==='/api/grabaciones/cargas')return respuesta({id:'carga-1'});if(r.endsWith('/finalizar'))finalizar++;partes++;return {ok:false,status:403,json:async()=>({mensaje:'Permiso retirado'})};});
 await assert.rejects(api.subir(video,{sala:'9',titulo:'Privada'}),/Permiso retirado/);assert.equal(partes,1);assert.equal(finalizar,0);
});
test('una confirmación perdida se recupera reintentando la finalización del mismo video',async()=>{
 const ids=[];let fin=0;const api=cliente(async r=>{if(r==='/api/grabaciones/cargas')return respuesta({id:'carga-1'});if(r.endsWith('/finalizar')){ids.push(r);if(fin++===0)throw new TypeError('Confirmación perdida');return respuesta({grabacion:{id:'video-1'}});}return respuesta({});});
 assert.equal((await api.subir(new Blob(['prueba']),{sala:'general',titulo:'Reunión'})).id,'video-1');assert.equal(fin,2);assert.equal(ids[0],ids[1]);
});
