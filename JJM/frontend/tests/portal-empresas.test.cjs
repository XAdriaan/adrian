const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const codigo = nombre => fs.readFileSync(path.join(__dirname,'../js',nombre),'utf8');
const json = (datos,status=200) => new Response(JSON.stringify(datos),{status,headers:{'Content-Type':'application/json'}});
const turno = () => new Promise(resolve => setImmediate(resolve));
class Elemento {
    constructor(value='') { this.value=value; this.hidden=false; this.disabled=false; this.textContent=''; this.innerHTML=''; this.type='password'; this.dataset={}; this.eventos={}; this.attrs={}; this.clases=new Set(); this.classList={toggle:(c,on)=>{on?this.clases.add(c):this.clases.delete(c);},remove:c=>this.clases.delete(c)}; }
    addEventListener(nombre,fn) { this.eventos[nombre]=fn; }
    setAttribute(nombre,v) { this.attrs[nombre]=v; }
    getAttribute(nombre) { return this.attrs[nombre]; }
    focus() { this.enfocado=true; }
    reset() { this.reiniciado=true; }
    ejecutar(nombre,event={}) { return this.eventos[nombre]({preventDefault(){},...event}); }
}
function almacen() { const datos=new Map(); return {datos,getItem:k=>datos.get(k)||null,setItem:(k,v)=>datos.set(k,String(v)),removeItem:k=>datos.delete(k)}; }

test('la portada pública conserva el acceso y no redirige ni consulta datos privados',()=>{
    const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
    assert.doesNotMatch(html,/http-equiv=["']refresh|api-config|asistencia-automatica/i);
    assert.match(html,/href="login.html"/); assert.match(html,/href="registro-empresa.html"/);
    assert.match(html,/Ejemplo ilustrativo|ejemplo ilustrativo/); assert.match(html,/pmi.org\/standards\/pmbok/);
});
test('los filtros públicos incluyen servicios compartidos y actualizan su estado accesible',()=>{
    const filtros=['todos','empresa','estadia'].map(filter=>Object.assign(new Elemento(),{dataset:{filter}}));
    const tarjetas=['empresa','estadia','empresa estadia'].map(category=>Object.assign(new Elemento(),{dataset:{category}}));
    const menu=new Elemento(),nav=new Elemento(),mensaje=new Elemento();
    vm.runInNewContext(codigo('portal-publico.js'),{document:{querySelector:s=>s==='.menu-toggle'?menu:mensaje,getElementById:()=>nav,querySelectorAll:s=>s==='[data-filter]'?filtros:tarjetas}});
    filtros[2].ejecutar('click'); assert.deepEqual(tarjetas.map(t=>t.hidden),[true,false,false]);
    assert.equal(mensaje.textContent,'2 servicios disponibles.'); assert.equal(filtros[2].attrs['aria-pressed'],'true');
    menu.ejecutar('click'); assert.equal(menu.attrs['aria-expanded'],'true');
    nav.ejecutar('click',{target:{closest:()=>({})}}); assert.equal(menu.attrs['aria-expanded'],'false');
});
function registro(fetch) {
    const ids=['registroEmpresaForm','registroEmpresaMensaje','registrarEmpresaBtn','empresa','nombre','apellido','correo','telefono','contrasena','confirmar'];
    const elementos=Object.fromEntries(ids.map(id=>[id,new Elemento()]));
    Object.assign(elementos.empresa,{value:'Empresa de prueba'}); elementos.nombre.value='Ana'; elementos.apellido.value='Prueba'; elementos.correo.value=' Empresa@Example.invalid '; elementos.contrasena.value=elementos.confirmar.value='Clave-test-123';
    const storage=almacen();
    vm.runInNewContext(codigo('registro-empresa.js'),{document:{getElementById:id=>elementos[id],querySelectorAll:()=>[]},window:{location:{search:'?servicio=soluciones'}},sessionStorage:storage,URLSearchParams,TextEncoder,AbortController,setTimeout,clearTimeout,fetch});
    return {elementos,storage,enviar:()=>elementos.registroEmpresaForm.ejecutar('submit')};
}
test('el registro valida las contraseñas antes de llamar al servidor',async()=>{
    let llamadas=0; const e=registro(async()=>{llamadas++;return json({});});
    e.elementos.confirmar.value='Otra'; await e.enviar(); assert.equal(llamadas,0); assert.match(e.elementos.registroEmpresaMensaje.textContent,/no coinciden/);
    e.elementos.contrasena.value=e.elementos.confirmar.value='é'.repeat(37); await e.enviar(); assert.equal(llamadas,0); assert.match(e.elementos.registroEmpresaMensaje.textContent,/72 bytes/);
});
test('el registro evita solicitudes simultáneas y no permite elegir rol ni empresa existente',async()=>{
    let resolver; const llamadas=[]; const e=registro((url,init)=>{llamadas.push({url,init});return new Promise(r=>resolver=r);});
    const solicitud=e.enviar(); await e.enviar(); assert.equal(llamadas.length,1);
    const datos=JSON.parse(llamadas[0].init.body); assert.equal(datos.correo,'empresa@example.invalid');
    assert.equal(datos.rol,undefined); assert.equal(datos.idOrganizacion,undefined); assert.equal(e.elementos.registrarEmpresaBtn.disabled,true);
    resolver(json({estado:'correcto'},201)); await solicitud;
    assert.equal(e.elementos.registroEmpresaForm.hidden,true); assert.equal(e.elementos.registrarEmpresaBtn.disabled,false);
    assert.deepEqual([...e.storage.datos.entries()],[['servicioEmpresaPMO','soluciones']]);
});
test('un correo empresarial ya registrado muestra el rechazo y permite corregir el formulario',async()=>{
    const e=registro(async()=>json({mensaje:'Ese correo ya tiene una cuenta.'},409)); await e.enviar();
    assert.equal(e.elementos.registroEmpresaForm.hidden,false); assert.equal(e.elementos.registrarEmpresaBtn.disabled,false);
    assert.match(e.elementos.registroEmpresaMensaje.textContent,/ya tiene una cuenta/);
});
function portal(fetch,{rol='Empresa',token='token-test'}={}) {
    const elementos={},documento={hidden:false,getElementById:id=>elementos[id]||(elementos[id]=new Elemento()),addEventListener:(n,fn)=>documento[n]=fn};
    const navegaciones=[],storage=almacen(); let intervalo;
    const contexto={document:documento,fetch,AbortController,setTimeout,clearTimeout,sessionStorage:storage,setInterval:(fn,ms)=>{assert.equal(ms,30000);intervalo=fn;},window:{apiUrl:r=>r,obtenerTokenSesionPMO:()=>token,restaurarSesionPMO:async()=>({id:42,rol}),limpiarSesionPMO(){},location:{replace:r=>navegaciones.push(r)}}};
    vm.runInNewContext(codigo('empresa.js'),contexto);
    return {elementos,documento,navegaciones,storage,pulso:()=>intervalo()};
}
const listaEmpresa={empresa:{nombre:'Empresa de prueba'},consultadoEn:'2026-10-09T21:00:00Z',proyectos:[]};
test('una cuenta sin sesión vuelve al acceso y una cuenta escolar no consulta proyectos empresariales',async()=>{
    let consultas=0; const fetch=async()=>{consultas++;return json(listaEmpresa);};
    const ausente=portal(fetch,{token:null}); await turno(); assert.deepEqual(ausente.navegaciones,['login.html']);
    const escolar=portal(fetch,{rol:'Colaborador'}); await turno(); assert.equal(consultas,0); assert.equal(escolar.elementos.empresaNuevo.disabled,true);
});
test('el portal consulta la identidad del token y escapa los datos de proyectos y tareas',async()=>{
    const rutas=[]; const e=portal(async ruta=>{rutas.push(ruta);return json({...listaEmpresa,proyectos:[{id:9,nombre:'<img src=x onerror=alert(1)>',codigo:'EMP-42',estado:'Ejecución',prioridad:'Alta',avance:150,fechaInicio:'2026-09-01',fechaFin:'2026-12-01',descripcion:'Primera\nSegunda'}]});});
    await turno(); assert.deepEqual(rutas,['/api/empresas/proyectos']);
    const html=e.elementos.empresaProyectos.innerHTML; assert.match(html,/&lt;img/); assert.doesNotMatch(html,/<img/); assert.match(html,/100.00%/); assert.match(html,/Primera<br>Segunda/);
    assert.equal(e.elementos.nombreEmpresa.textContent,'Empresa de prueba');
});
test('el seguimiento solo se actualiza automáticamente mientras el portal está visible',async()=>{
    let consultas=0; const e=portal(async()=>{consultas++;return json(listaEmpresa);}); await turno();
    e.documento.hidden=true; e.pulso(); await turno(); assert.equal(consultas,1);
    e.documento.hidden=false; e.pulso(); await turno(); assert.equal(consultas,2);
});
test('la propuesta empresarial envía datos de solicitud sin avance ni organización elegidos por el cliente',async()=>{
    const llamadas=[]; const e=portal(async(ruta,init={})=>{llamadas.push({ruta,init});return json(init.method==='POST'?{mensaje:'Propuesta guardada'}:listaEmpresa);}); await turno();
    const campo=(id,v)=>{(e.elementos[id]||(e.elementos[id]=new Elemento())).value=v;};
    campo('proyectoNombre','  Proyecto de prueba  '); campo('proyectoObjetivo','  Objetivo de prueba  '); campo('proyectoInicio','2026-10-10'); campo('proyectoFin','2026-10-09'); campo('proyectoServicio','soluciones'); campo('proyectoPrioridad','Media');
    await e.elementos.empresaProyectoForm.ejecutar('submit'); assert.equal(llamadas.length,1);
    campo('proyectoFin','2026-12-10'); await e.elementos.empresaProyectoForm.ejecutar('submit');
    const datos=JSON.parse(llamadas.find(l=>l.init.method==='POST').init.body);
    assert.equal(datos.nombre,'Proyecto de prueba'); assert.equal(datos.servicio,'soluciones');
    assert.equal(datos.idOrganizacion,undefined); assert.equal(datos.avance,undefined); assert.equal(datos.idUsuario,undefined);
    assert.equal(e.elementos.empresaNuevoPanel.hidden,true); assert.equal(e.elementos.empresaProyectoForm.reiniciado,true);
});
