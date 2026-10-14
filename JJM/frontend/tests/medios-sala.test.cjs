const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function entorno(getUserMedia){
 const elems={},el=id=>elems[id]||(elems[id]={dataset:{},listeners:{},disabled:false,hidden:false,setAttribute(n,v){this[n]=v},querySelector:()=>null,addEventListener(n,f){this.listeners[n]=f}});
 const ctx=vm.createContext({window:{apiUrl:v=>v,location:{search:'?general=1'},addEventListener(){}},document:{getElementById:id=>id==='btnEscuchar'?null:el(id),addEventListener(){}},navigator:{mediaDevices:{getUserMedia}},URLSearchParams,setTimeout,clearTimeout,console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/reunion.js'),'utf8'),ctx);
 ctx.sala={activa:true,generacion:1,medios:{audio:null,video:null,pantalla:null},estadoLocal:{},actualizarVistaLocal(){},async publicarEstado(c){Object.assign(this.estadoLocal,c);},async cambiar(tipo,pista){this.medios[tipo]=pista}};
 vm.runInContext('rtc=sala',ctx);
 return{ctx,el,run:s=>vm.runInContext(s,ctx)};
}
const track=kind=>({kind,readyState:'live',enabled:true,addEventListener(){},stop(){this.readyState='ended'}});
test('activar y silenciar el micrófono cambia el estado visible sin repetir el permiso',async()=>{
 let peticiones=0;const pista=track('audio');const e=entorno(async()=>{peticiones++;return{getAudioTracks:()=>[pista],getTracks:()=>[pista]}});
 await e.run("activarMedio('audio',btnMicrofono)");assert.equal(e.el('btnMicrofono')['aria-pressed'],'true');assert.match(e.el('estadoDispositivos').textContent,/Micrófono activo/);
 await e.run("activarMedio('audio',btnMicrofono)");assert.equal(peticiones,1);assert.equal(pista.enabled,false);assert.equal(e.el('btnMicrofono')['aria-pressed'],'false');
});
test('un permiso bloqueado informa el dispositivo exacto y no anuncia cámara encendida',async()=>{
 const e=entorno(async()=>{throw Object.assign(new Error('denegado'),{name:'NotAllowedError'})});
 await e.run("activarMedio('video',btnCamara)");assert.equal(e.el('btnCamara')['aria-pressed'],'false');assert.equal(e.el('btnCamara').disabled,false);assert.match(e.el('avisoMedios').textContent,/permiso.*cámara.*candado/);
});
test('una autorización tardía no activa la cámara después de salir y volver a entrar',async()=>{
 let resolver;const pista=track('video'),e=entorno(()=>new Promise(r=>resolver=r));
 const operacion=e.run("activarMedio('video',btnCamara)");e.ctx.sala.generacion=2;
 resolver({getTracks:()=>[pista],getVideoTracks:()=>[pista]});await operacion;
 assert.equal(pista.readyState,'ended');assert.equal(e.ctx.sala.medios.video,null);assert.equal(e.el('btnCamara')['aria-pressed'],'false');
});
test('la cámara deja de cargar si el permiso no responde y detiene una autorización posterior al plazo',async()=>{
 let resolver,reloj;const pista=track('video'),e=entorno(()=>new Promise(r=>resolver=r));
 e.ctx.setTimeout=(fn,ms)=>{assert.equal(ms,20000);reloj=fn;return 1};e.ctx.clearTimeout=()=>{};
 const operacion=e.run("activarMedio('video',btnCamara)");assert.equal(e.el('btnCamara').disabled,true);reloj();await operacion;
 assert.equal(e.el('btnCamara').disabled,false);assert.match(e.el('avisoMedios').textContent,/espera.*terminó/);assert.equal(e.ctx.sala.medios.video,null);
 resolver({getTracks:()=>[pista],getVideoTracks:()=>[pista]});await new Promise(r=>setImmediate(r));assert.equal(pista.readyState,'ended');
});
test('la cámara utiliza el dispositivo elegido y muestra su estado al recibir una señal',async()=>{
 let solicitud;const pista=track('video'),e=entorno(async opciones=>{solicitud=opciones;return{getVideoTracks:()=>[pista],getTracks:()=>[pista]}});
 e.el('selectorCamara').value='camara-usb';await e.run("activarMedio('video',btnCamara)");
 assert.equal(solicitud.video.deviceId.exact,'camara-usb');assert.equal(e.el('btnCamara')['aria-pressed'],'true');assert.equal(e.el('btnCamara').disabled,false);
});
test('compartir pantalla mantiene la cámara y al detener libera únicamente la presentación',async()=>{
 const e=entorno(),camara=track('video'),pantalla=track('video');
 e.ctx.camara=camara;e.run('camaraPropia=camara;rtc.medios.video=camara');
 e.ctx.navigator.mediaDevices.getDisplayMedia=async()=>({getVideoTracks:()=>[pantalla],getTracks:()=>[pantalla]});
 await e.run('compartirPantalla()');assert.equal(e.ctx.sala.medios.pantalla,pantalla);assert.equal(e.ctx.sala.medios.video,camara);assert.equal(e.el('btnPantalla')['aria-pressed'],'true');assert.equal(e.el('btnCamara').disabled,false);
 await e.run('compartirPantalla()');assert.equal(pantalla.readyState,'ended');assert.equal(e.ctx.sala.medios.video,camara);assert.equal(e.el('btnPantalla')['aria-pressed'],'false');assert.equal(e.el('btnCamara').disabled,false);
});
test('un segundo presentador recibe un aviso y su captura se detiene sin apagar la cámara',async()=>{
 const e=entorno(),camara=track('video'),pantalla=track('video');e.ctx.camara=camara;e.run('camaraPropia=camara;rtc.medios.video=camara');e.ctx.sala.publicarEstado=async()=>{throw new Error('Otra persona está presentando.');};
 e.ctx.navigator.mediaDevices.getDisplayMedia=async()=>({getVideoTracks:()=>[pantalla],getTracks:()=>[pantalla]});await e.run('compartirPantalla()');assert.equal(pantalla.readyState,'ended');assert.equal(camara.readyState,'live');assert.equal(e.ctx.sala.medios.pantalla,null);assert.match(e.el('avisoMedios').textContent,/Otra persona/);
});

test('silenciar el micrófono también silencia su copia de grabación sin detener la pista de la sala',async()=>{
 const e=entorno(),pista=track('audio'),copia=track('audio');
 e.ctx.pista=pista;e.ctx.copia=copia;e.run('rtc.medios.audio=pista;grabacionMicrofonoStream={getAudioTracks:()=>[copia]}');
 await e.run("activarMedio('audio',btnMicrofono)");assert.equal(pista.enabled,false);assert.equal(copia.enabled,false);assert.equal(pista.readyState,'live');
});

test('la sala configura sus controles sin el botón Activar audio',()=>{
 const e=entorno();assert.doesNotThrow(()=>e.run('configurarEventos()'));
 assert.equal(e.ctx.document.getElementById('btnEscuchar'),null);
 assert.equal(typeof e.el('btnEntrarSala').listeners.click,'function');
 assert.equal(typeof e.el('btnMicrofono').listeners.click,'function');
 assert.equal(typeof e.el('btnCamara').listeners.click,'function');
 assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../reunion.html'),'utf8'),/btnEscuchar|>Activar audio</);
});

test('Probar micrófono abre los dispositivos sin solicitar ni encender el micrófono',()=>{
 let solicitudes=0;const e=entorno(()=>{solicitudes++;throw Error('No se debe pedir permiso al abrir el apartado');});
 e.el('selectorMicrofono').focus=()=>{};e.el('pruebaMicrofonoSala').scrollIntoView=()=>{};
 e.run('configurarEventos()');assert.equal(e.el('dispositivosSala').open,undefined);
 e.el('btnAbrirPruebaMicrofono').listeners.click();assert.equal(e.el('dispositivosSala').open,true);
 assert.equal(e.el('btnAbrirPruebaMicrofono')['aria-expanded'],'true');assert.equal(solicitudes,0);assert.equal(e.ctx.sala.medios.audio,null);
 e.el('dispositivosSala').open=false;e.el('dispositivosSala').listeners.toggle();assert.equal(e.el('btnAbrirPruebaMicrofono')['aria-expanded'],'false');
});

test('el control de cámara reanuda la escucha antes de esperar el permiso sin activar micrófono',async()=>{
 let resolver,reanudaciones=0;const e=entorno(()=>new Promise(r=>resolver=r)),pista=track('video');
 e.ctx.experiencia={activarAudio(){reanudaciones++;return Promise.resolve();},actualizar(){}};
 e.run('experienciaSala=experiencia');
 const pendiente=e.run("activarMedio('video',btnCamara)");assert.equal(reanudaciones,1);assert.equal(e.ctx.sala.medios.audio,null);
 resolver({getVideoTracks:()=>[pista],getTracks:()=>[pista]});await pendiente;
 assert.equal(e.ctx.sala.medios.audio,null);assert.equal(e.el('btnMicrofono')['aria-pressed'],'false');
});
