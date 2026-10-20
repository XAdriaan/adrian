const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('la IA sólo crea una tarea después de revisar y guardar, usando el proyecto y responsable elegidos',async()=>{
 class E{constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.value='';}append(...n){this.children.push(...n)}replaceChildren(...n){this.children=n}setAttribute(){}addEventListener(k,f){this.listeners[k]=f}querySelectorAll(){return this.children.flatMap(n=>n.tag==='label'?n.children:[])} }
 const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,new E());return elements.get(id)};
 const calls=[];const plan={objetivo:'Inventario <script>',tareas:[{titulo:'Modelo',descripcion:'Describir',entregable:'Diagrama',criterioAceptacion:'Revisado',horasEstimadas:8}],riesgos:['Confirmar alcance']};
 const fetch=async(url,opts={})=>{calls.push({url,...opts});let data=url.includes('miembros-proyecto')?{miembros:[{idMiembro:12,miembroNombre:'Ana',miembroEstado:'Activo'}]}:opts.method==='POST'?url==='/api/tareas'?{estado:'correcto'}:plan:{configurada:true,mensaje:'Lista'};return {ok:true,json:async()=>data};};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/plan-ia.js'),'utf8'),{document:{getElementById:el,createElement:t=>new E(t)},location:{search:'?id=8'},window:{apiUrl:x=>x},localStorage:{getItem:()=> 'sesion'},fetch,URLSearchParams,AbortController,setTimeout,clearTimeout,confirm:()=>true});
 await new Promise(r=>setImmediate(r));el('objetivoIa').value='Preparar el inventario';await el('generarPlan').listeners.submit({preventDefault(){}});
 assert.equal(calls.filter(c=>c.url==='/api/tareas').length,0);
 const form=el('propuestaIa').children.find(c=>c.tag==='form');form.children[3].children[0].value='12';await form.listeners.submit({preventDefault(){}});
 const save=calls.find(c=>c.url==='/api/tareas'),body=JSON.parse(save.body);assert.equal(body.idProyecto,8);assert.equal(body.idMiembroAsignado,12);assert.equal(body.horasRegistradas,0);assert.equal(body.titulo,'Modelo');
 await form.listeners.submit({preventDefault(){}});assert.equal(calls.filter(c=>c.url==='/api/tareas').length,1);
 assert.equal(el('propuestaIa').children[0].textContent,'Inventario <script>');
});
