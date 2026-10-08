const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function entorno(getUserMedia){
 const elems={},el=id=>elems[id]||(elems[id]={dataset:{},disabled:false,hidden:false,setAttribute(n,v){this[n]=v},querySelector:()=>null});
 const ctx=vm.createContext({window:{apiUrl:v=>v,location:{search:'?general=1'}},document:{getElementById:el,addEventListener(){}},navigator:{mediaDevices:{getUserMedia}},URLSearchParams,console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/reunion.js'),'utf8'),ctx);
 ctx.sala={activa:true,generacion:1,medios:{audio:null,video:null},actualizarVistaLocal(){},async cambiar(tipo,pista){this.medios[tipo]=pista}};
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
test('compartir pantalla está disponible para el participante y al detener recupera su cámara',async()=>{
 const e=entorno(),camara=track('video'),pantalla=track('video');
 e.ctx.camara=camara;e.run('camaraPropia=camara;rtc.medios.video=camara');
 e.ctx.navigator.mediaDevices.getDisplayMedia=async()=>({getVideoTracks:()=>[pantalla],getTracks:()=>[pantalla]});
 await e.run('compartirPantalla()');assert.equal(e.ctx.sala.medios.video,pantalla);assert.equal(e.el('btnPantalla')['aria-pressed'],'true');assert.equal(e.el('btnCamara').disabled,true);
 await e.run('compartirPantalla()');assert.equal(pantalla.readyState,'ended');assert.equal(e.ctx.sala.medios.video,camara);assert.equal(e.el('btnPantalla')['aria-pressed'],'false');assert.equal(e.el('btnCamara').disabled,false);
});

test('silenciar el micrófono también silencia su copia de grabación sin detener la pista de la sala',async()=>{
 const e=entorno(),pista=track('audio'),copia=track('audio');
 e.ctx.pista=pista;e.ctx.copia=copia;e.run('rtc.medios.audio=pista;grabacionMicrofonoStream={getAudioTracks:()=>[copia]}');
 await e.run("activarMedio('audio',btnMicrofono)");assert.equal(pista.enabled,false);assert.equal(copia.enabled,false);assert.equal(pista.readyState,'live');
});
