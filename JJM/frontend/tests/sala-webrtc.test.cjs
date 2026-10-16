const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function entorno(fetch=async()=>new Response('{}')) {
 class PC {
  constructor(){this.trans=[];this.signalingState='stable';this.candidatos=[];}
  addTransceiver(kind){const t={receiver:{track:{kind}},sender:{replaceTrack:async track=>t.pista=track},direction:'sendrecv'};this.trans.push(t);return t;}
  async createOffer(opciones){this.opcionesOferta=opciones;return{type:'offer',sdp:'oferta'};}async createAnswer(){return{type:'answer',sdp:'respuesta'};}
  async setLocalDescription(d){this.localDescription={...d,toJSON:()=>d};}
  async setRemoteDescription(d){this.remoteDescription=d;if(!this.trans.length){this.addTransceiver('audio');this.addTransceiver('video');this.addTransceiver('video');}}
  getTransceivers(){return this.trans;}async addIceCandidate(d){this.candidatos.push(d);}close(){this.cerrado=true;}
 }
 const window={apiUrl:p=>p,RTCPeerConnection:PC};const document={createElement:()=>({play:()=>Promise.resolve(),pause(){}})};const ctx=vm.createContext({window,document,AbortController,RTCPeerConnection:PC,MediaStream:class{constructor(tracks=[]){this.tracks=tracks;}getTracks(){return this.tracks;}addTrack(t){this.tracks.push(t);}},fetch,setTimeout:()=>1,clearTimeout(){},Response,console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/sala-webrtc.js'),'utf8'),ctx);
 let cerradas=0;const estado={textContent:''};const sala=new window.PMOSalaWebRTC({sala:'general',contenedor:{querySelector:()=>null},estado,participantes:{},alCerrar:()=>cerradas++});
 sala.tarjeta=()=>({div:{remove(){},append(){}},video:{play:()=>Promise.resolve()},avatar:{},conexion:{},etiqueta:{}});sala.config={iceServers:[]};sala.id='b';sala.activa=true;sala.generacion=1;
 return{sala,estado,PC,ctx,cerradas:()=>cerradas};
}
test('quien responde transmite sobre los canales ofrecidos sin dejar video en un solo sentido',async()=>{
 const {sala}=entorno();const emitidas=[];sala.enviar=async(...v)=>emitidas.push(v);sala.medios.audio={kind:'audio'};sala.medios.video={kind:'video'};sala.medios.pantalla={kind:'video'};
 await sala.sincronizar([{id:'a',nombre:'Otro'},{id:'b',nombre:'Tú'}]);const p=sala.peers.get('a');assert.equal(p.pc.trans.length,0);
 await sala.recibir({origen:'a',tipo:'offer',datos:{type:'offer',sdp:'oferta'}});
 assert.equal(p.pc.trans.length,3);assert.equal(p.pc.trans[0].pista,sala.medios.audio);assert.equal(p.pc.trans[1].pista,sala.medios.video);assert.equal(p.pc.trans[2].pista,sala.medios.pantalla);
 assert.equal(emitidas[0][1],'answer');
});
test('compartir pantalla utiliza otro canal y mantiene cámara y audio del participante',async()=>{
 const {sala}=entorno();sala.id='a';sala.enviar=async()=>{};await sala.sincronizar([{id:'a'},{id:'b'}]);const p=sala.peers.get('b');sala.actualizarVistaLocal=()=>{};
 const camara={kind:'video'},pantalla={kind:'video'},audio={kind:'audio'};await sala.cambiar('video',camara);await sala.cambiar('audio',audio);await sala.cambiar('pantalla',pantalla);
 assert.equal(p.pc.trans[0].pista,audio);assert.equal(p.pc.trans[1].pista,camara);assert.equal(p.pc.trans[2].pista,pantalla);
 await sala.cambiar('pantalla',null);assert.equal(p.pc.trans[1].pista,camara);assert.equal(p.pc.trans[2].pista,null);
});
test('ICE se reinicia automáticamente sin cerrar micrófono ni cámara',async()=>{
 const {sala,ctx}=entorno();sala.id='a';sala.enviar=async()=>{};await sala.sincronizar([{id:'a'},{id:'b'}]);const p=sala.peers.get('b');p.pc.connectionState='failed';let callback;ctx.setTimeout=fn=>{callback=fn;return 1;};
 sala.programarRecuperacion('b');await callback();assert.equal(p.pc.opcionesOferta.iceRestart,true);assert.equal(sala.activa,true);assert.notEqual(p.pc.cerrado,true);
});
test('la pérdida temporal del servicio no expulsa después de cinco intentos',async()=>{
 const {sala}=entorno(async()=>new Response('{}',{status:503}));for(let i=0;i<7;i++)await sala.ciclo(1);assert.equal(sala.activa,true);assert.equal(sala.fallos,7);
});
test('un tercer dispositivo no inicia un ciclo que robe la llamada repetidamente',async()=>{
 const {sala}=entorno(async()=>new Response(JSON.stringify({mensaje:'Ya tienes dos dispositivos conectados.'}),{status:409}));await sala.ciclo(1);assert.equal(sala.activa,false);
});
test('una sesión de sala caducada se recupera conservando sus pistas y su estado',async()=>{
 const {sala}=entorno();sala.api=async accion=>accion==='entrar'?{conexion:'nueva',participantes:[{id:'nueva'}]}:{};sala.contenedor.replaceChildren=()=>{};sala.actualizarVistaLocal=()=>{};
 const micro={kind:'audio',enabled:true},camara={kind:'video',enabled:true};sala.medios.audio=micro;sala.medios.video=camara;sala.estadoLocal={audio:true,video:true,pantalla:false,mano:true};
 await sala.recuperarSesion(1);assert.equal(sala.id,'nueva');assert.equal(sala.medios.audio,micro);assert.equal(sala.medios.video,camara);assert.equal(sala.estadoLocal.mano,true);
});
test('guarda candidatos tempranos y los aplica al recibir la descripción remota',async()=>{
 const {sala}=entorno();sala.enviar=async()=>{};await sala.sincronizar([{id:'a'},{id:'b'}]);const p=sala.peers.get('a');
 await sala.recibir({origen:'a',tipo:'candidate',datos:{candidate:'candidato'}});assert.equal(p.pc.candidatos.length,0);
 await sala.recibir({origen:'a',tipo:'offer',datos:{type:'offer',sdp:'oferta'}});assert.equal(p.pc.candidatos.length,1);assert.equal(p.pendientes.length,0);
});
test('retirar permisos cierra conexiones y medios, y permite volver a la pantalla de entrada',async()=>{
 const {sala,cerradas,estado}=entorno(async()=>new Response('{}',{status:403}));await sala.sincronizar([{id:'a'},{id:'b'}]);const pc=sala.peers.get('a').pc;let detenido=false;sala.medios.audio={stop(){detenido=true;}};
 await sala.ciclo(1);assert.equal(sala.activa,false);assert.equal(pc.cerrado,true);assert.equal(detenido,true);assert.equal(cerradas(),1);assert.match(estado.textContent,/acceso/);
});
test('una respuesta atrasada de otra conexión no reabre la sala ni añade participantes',async()=>{
 let resolver;const {sala}=entorno(()=>new Promise(r=>resolver=r));const p=sala.ciclo(1);sala.activa=false;sala.generacion++;resolver(new Response(JSON.stringify({participantes:[{id:'x'}],eventos:[]})));await p;
 assert.equal(sala.peers.size,0);
});
test('salir o retirar un participante cierra su canal y las señales no pasan a otra sala',async()=>{
 const llamadas=[];const {sala}=entorno(async(url,opts)=>{llamadas.push({url,opts});return new Response('{}');});await sala.sincronizar([{id:'a'},{id:'b'}]);const pc=sala.peers.get('a').pc;await sala.sincronizar([{id:'b'}]);assert.equal(pc.cerrado,true);
 await sala.enviar('c','candidate',{candidate:'prueba'});assert.equal(llamadas[0].url,'/api/videollamadas/general/senal');assert.equal(JSON.parse(llamadas[0].opts.body).conexion,'b');
 await sala.salir();await assert.rejects(()=>sala.enviar('c','candidate',{}),/cerrada/);
});

test('un participante desconectado no bloquea la cámara ni el envío al resto de la sala',async()=>{
 const {sala,estado}=entorno();let recibida,preview=0;
 sala.actualizarVistaLocal=()=>preview++;
 sala.peers.set('fuera',{videoSender:{replaceTrack:async()=>{throw new Error('Conexión cerrada')}}});
 sala.peers.set('dentro',{videoSender:{replaceTrack:async pista=>recibida=pista}});
 const pista={kind:'video',readyState:'live',enabled:true};
 await sala.cambiar('video',pista);assert.equal(recibida,pista);assert.equal(sala.medios.video,pista);assert.equal(preview,1);
 assert.match(estado.textContent,/dispositivo está activo.*Reconectar/);
});

test('la vista local mantiene el mismo flujo al actualizar controles sin cambiar pistas',()=>{
 const {sala}=entorno();const pista={kind:'video',readyState:'live',enabled:true};const stream={getTracks:()=>[pista]};let cambios=0,reproducciones=0;
 const local={muted:false,paused:false,hidden:false,play(){reproducciones++;return Promise.resolve();},get srcObject(){return stream;},set srcObject(v){cambios++;}};
 sala.videoLocal=local;sala.avatarLocal={};sala.medios.video=pista;
 sala.actualizarVistaLocal();sala.actualizarVistaLocal();assert.equal(cambios,0);assert.equal(reproducciones,0);assert.equal(local.hidden,false);assert.equal(local.muted,true);assert.equal(local.playsInline,true);
});

test('un cambio de pista que nunca responde no deja pendientes los controles de cámara',async()=>{
 const {sala,estado,ctx}=entorno();sala.actualizarVistaLocal=()=>{};ctx.setTimeout=fn=>{queueMicrotask(fn);return 1;};ctx.clearTimeout=()=>{};
 sala.peers.set('sin-respuesta',{videoSender:{replaceTrack:()=>new Promise(()=>{})}});
 const pista={kind:'video',readyState:'live',enabled:true};await sala.cambiar('video',pista);
 assert.equal(sala.medios.video,pista);assert.match(estado.textContent,/dispositivo está activo/);
});

test('el audio remoto se reproduce en una salida independiente aunque su cámara esté apagada',async()=>{
 const {sala}=entorno();sala.id='a';sala.enviar=async()=>{};
 await sala.sincronizar([{id:'a',usuario:7},{id:'b',usuario:8,nombre:'Alumno',proyectos:'PWEB',video:false}]);
 const p=sala.peers.get('b');let reproducciones=0;p.audioSalida.play=async()=>{reproducciones++;};
 const track={kind:'audio',readyState:'live'};p.pc.ontrack({track,transceiver:p.pc.trans[0]});
 assert.equal(reproducciones,1);assert.equal(p.video.hidden,true);assert.equal(p.audioSalida.srcObject.getTracks()[0],track);assert.equal(p.audioSalida.muted,false);assert.equal(p.etiqueta.textContent,'PWEB · Alumno');
});
test('el segundo dispositivo propio transmite pero no reproduce su propia voz como eco',async()=>{
 const {sala}=entorno();sala.id='a';sala.enviar=async()=>{};
 await sala.sincronizar([{id:'a',usuario:7},{id:'b',usuario:7,nombre:'Misma cuenta'}]);const p=sala.peers.get('b');
 p.pc.ontrack({track:{kind:'audio',readyState:'live'},transceiver:p.pc.trans[0]});assert.equal(p.audioSalida.muted,true);
 const micro={kind:'audio',enabled:true};await sala.cambiar('audio',micro);assert.equal(p.pc.trans[0].pista,micro);
});
