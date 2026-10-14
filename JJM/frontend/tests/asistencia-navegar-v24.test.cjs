const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const fuente=fs.readFileSync(path.join(__dirname,'../js/asistencia-automatica.js'),'utf8');
function entorno({activa=true,superior=true,principal=false,pie=true,rol='Asesor Empresarial'}={}){
 const elementos=new Map(),intervalos=[],rutas=[],peticiones=[];let ahora=1000000,token='token';
 class El{
  constructor(){this.children=[];this.dataset={};this.hidden=false;this.attrs={};this.clases=new Set();this.classList={add:c=>this.clases.add(c)};}
  set id(v){this._id=v;elementos.set(v,this);}get id(){return this._id;}
  set innerHTML(v){this.html=v;for(const m of v.matchAll(/id="([^"]+)"/g)){const n=new El();n.id=m[1];n.parentElement=new El();const href=v.slice(m.index).match(/^[^>]*href="([^"]+)"/);if(href)n.href=href[1];}}
  setAttribute(k,v){this.attrs[k]=v;}append(n){n.parentElement=this;this.children.push(n);}prepend(n){n.parentElement=this;this.children.unshift(n);}remove(){elementos.delete(this.id);}
 }
 const encabezado=new El(),contenido=new El(),footer=new El(),document={body:new El(),createElement:()=>new El(),getElementById:id=>elementos.get(id)||null,addEventListener(){},querySelector:s=>s==='.sala-asistencia-superior'&&superior?encabezado:s==='.main-content'&&principal?contenido:s==='.meeting-footer'&&pie?footer:null};
 const window={location:{pathname:'/reunion.html',href:'reunion.html'},crypto:{randomUUID:()=> 'pagina-padre'},apiUrl:r=>r,obtenerTokenSesionPMO:()=>token,PMOLlamadaActiva:()=>activa,PMONavegarEnLlamada:url=>{rutas.push(url);return true;},dispatchEvent(){},addEventListener(){},confirm:()=>true,
  fetch:async(url,opciones)=>{peticiones.push({url,opciones});return new Response(JSON.stringify({conectado:true,asistencia:{modoContinuo:true,contando:true,segundos:3600,limiteSegundos:36000,vigenciaSegundos:28800,segundosHastaCierre:28800}}));}};
 class Reloj extends Date{static now(){return ahora;}}
 vm.runInNewContext(fuente,{window,document,Date:Reloj,Event,AbortController,Response,setTimeout:()=>1,clearTimeout(){},setInterval:(fn,ms)=>{intervalos.push({fn,ms});return intervalos.length;},localStorage:{getItem:k=>k==='usuarioActivo'?JSON.stringify({id:7,rol}):token},console});
 const click=()=>{const evento={preventDefault(){this.defaultPrevented=true;}};elementos.get('pmoAsistenciaEnlace').onclick(evento);return evento;};
 return{window,elementos,encabezado,contenido,footer,rutas,peticiones,intervalos,click,avanzar:s=>ahora+=s*1000,setActiva:v=>activa=v};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('Ver asistencia de todos conserva una llamada activa y navega solo dentro de la Oficina',async()=>{
 const e=entorno();await tick();const evento=e.click();assert.equal(evento.defaultPrevented,true);assert.deepEqual(e.rutas,['asistencia.html']);assert.equal(e.window.location.href,'reunion.html');
 assert.equal(e.elementos.get('pmoAsistenciaEnlace').href,'asistencia.html');assert.equal(e.elementos.get('pmoAsistenciaEnlace').hidden,false);assert.equal(e.peticiones.length,1);
});
test('fuera de llamada el enlace conserva su navegación normal y comprueba el estado al pulsar',async()=>{
 const e=entorno({activa:false});await tick();assert.equal(e.click().defaultPrevented,undefined);assert.deepEqual(e.rutas,[]);
 e.setActiva(true);assert.equal(e.click().defaultPrevented,true);assert.deepEqual(e.rutas,['asistencia.html']);
 e.setActiva(false);assert.equal(e.click().defaultPrevented,undefined);assert.equal(e.rutas.length,1);
});
test('la barra compacta se coloca en el encabezado de sala antes del contenido o pie',async()=>{
 const e=entorno({principal:true});await tick();const barra=e.elementos.get('pmoAsistenciaBarra');assert.equal(e.encabezado.children[0],barra);assert.equal(barra.clases.has('pmo-asistencia-compacta'),true);assert.equal(e.footer.children.length,0);assert.equal(e.contenido.children.length,0);
});
test('el pie anterior y las páginas habituales siguen siendo montajes válidos',async()=>{
 const pie=entorno({superior:false});await tick();assert.equal(pie.footer.children[0],pie.elementos.get('pmoAsistenciaBarra'));assert.equal(pie.elementos.get('pmoAsistenciaBarra').clases.has('pmo-asistencia-compacta'),true);
 const principal=entorno({superior:false,principal:true,pie:false});await tick();assert.equal(principal.contenido.children[0],principal.elementos.get('pmoAsistenciaBarra'));assert.equal(principal.elementos.get('pmoAsistenciaBarra').clases.has('pmo-asistencia-compacta'),false);
});
test('abrir la Oficina conserva la interpolación del contador padre y el pulso de30 segundos',async()=>{
 const e=entorno({rol:'Colaborador'});await tick();assert.equal(e.window.asistenciaAutomaticaPMO.segundosVisibles(),3600);assert.equal(e.elementos.get('pmoAsistenciaReloj').textContent,'01:00:00');
 e.click();e.avanzar(125);e.intervalos.find(t=>t.ms===1000).fn();assert.equal(e.window.asistenciaAutomaticaPMO.segundosVisibles(),3725);assert.equal(e.elementos.get('pmoAsistenciaReloj').textContent,'01:02:05');
 assert.equal(e.peticiones.length,1,'No consulta por cada tick');await e.intervalos.find(t=>t.ms===30000).fn();assert.equal(e.peticiones.length,2);assert.equal(e.peticiones[1].url,'/api/presencia/pulso');
 assert.deepEqual(JSON.parse(e.peticiones[1].opciones.body),{pagina:'pagina-padre',ruta:'reunion.html'});assert.equal(e.window.location.href,'reunion.html');
});
test('una carga tardía del helper no abandona una llamada activa ni filtra el token en la URL',async()=>{
 const e=entorno();await tick();delete e.window.PMONavegarEnLlamada;assert.doesNotThrow(()=>e.click());assert.equal(e.window.location.href,'reunion.html');assert.equal(e.elementos.get('pmoAsistenciaEnlace').href,'asistencia.html');
});
