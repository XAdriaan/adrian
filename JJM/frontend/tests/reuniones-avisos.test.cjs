const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function entorno({iframe=false,entregas=false}={}){
 class El{constructor(){this.children=[];this.listeners={};this.attrs={};}append(...a){this.children.push(...a);}replaceChildren(...a){this.children=a;}setAttribute(n,v){this.attrs[n]=v;}addEventListener(n,f){this.listeners[n]=f;}remove(){}}
 const storage=new Map([['usuarioActivo',JSON.stringify({id:7,rol:'Colaborador'})]]),window={obtenerTokenSesionPMO:()=> 'token',apiUrl:r=>r,addEventListener(){},abrirSalaPMO:r=>window.destino=r};window.parent=iframe?{}:window;
 let solicitudes=0,permisos=0;class Notificacion{static permission='default';static async requestPermission(){permisos++;return 'granted';}}
 window.Notification=Notificacion;
 const doc={readyState:'loading',head:new El(),body:new El(),createElement:()=>new El(),addEventListener(){}};
 const ctx=vm.createContext({window,document:doc,Notification:Notificacion,AbortController,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async(r)=>{solicitudes++;if(r.includes('mis-recordatorios'))return new Response(JSON.stringify({recordatorios:entregas?[{id:12,clave:'diario-falta-2-7-2026-10-13-7',estado:'Abierto',titulo:'Reporte diario pendiente',descripcion:'Entrega tu evidencia',enlace:'canales-proyectos.html?id=2#diario'}]:[]}));return new Response(JSON.stringify({avisos:[{id:3,idProyecto:2,idReunion:9,proyecto:'<img onerror=x>',titulo:'Reunión'}]}));},Response,setInterval:()=>1,setTimeout:()=>1,clearTimeout(){},console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/reuniones-avisos.js'),'utf8'),ctx);return{window,doc,solicitudes:()=>solicitudes,permisos:()=>permisos,storage};
}
test('avisos nuevos muestran el proyecto como texto y no solicitan permiso automáticamente',async()=>{
 const e=entorno();await e.window.PMOAvisosReuniones.actualizar();const panel=e.doc.body.children[0].children[1],item=panel.children.find(c=>c.children?.some(h=>h.textContent==='<img onerror=x>'));
 assert.equal(item.children[0].textContent,'<img onerror=x>');assert.equal(e.permisos(),0);assert.equal(panel.hidden,false);item.children[2].listeners.click();assert.equal(e.window.destino,'reunion.html?id=2&reunion=9');
});
test('un aviso ya presentado no vuelve a abrir el panel en cada revisión',async()=>{
 const e=entorno();await e.window.PMOAvisosReuniones.actualizar();const panel=e.doc.body.children[0].children[1];panel.hidden=true;await e.window.PMOAvisosReuniones.actualizar();assert.equal(panel.hidden,true);assert.equal(e.solicitudes(),4);
});
test('el iframe no duplica la consulta ni las notificaciones de la llamada principal',()=>{
 const e=entorno({iframe:true});assert.equal(e.window.PMOAvisosReuniones,undefined);assert.equal(e.solicitudes(),0);
});

test('alertas de entregas aparecen con acceso al canal y se marcan en su endpoint propio',async()=>{const e=entorno({entregas:true});await e.window.PMOAvisosReuniones.actualizar();const panel=e.doc.body.children[0].children[1],item=panel.children.find(c=>c.children?.some(h=>h.textContent==='Reporte diario pendiente'));assert.equal(item.children[2].href,'canales-proyectos.html?id=2#diario');await item.children[3].listeners.click();assert.equal(panel.children.some(c=>c.children?.some(h=>h.textContent==='Reporte diario pendiente')),false);});
