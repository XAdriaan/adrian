const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function entorno(fetch=async()=>new Response('{}')) {
 class PC {
  constructor(){this.trans=[];this.signalingState='stable';this.candidatos=[];}
  addTransceiver(kind){const t={receiver:{track:{kind}},sender:{replaceTrack:async track=>t.pista=track},direction:'sendrecv'};this.trans.push(t);return t;}
  async createOffer(){return{type:'offer',sdp:'oferta'};}async createAnswer(){return{type:'answer',sdp:'respuesta'};}
  async setLocalDescription(d){this.localDescription={...d,toJSON:()=>d};}
  async setRemoteDescription(d){this.remoteDescription=d;if(!this.trans.length){this.addTransceiver('audio');this.addTransceiver('video');}}
  getTransceivers(){return this.trans;}async addIceCandidate(d){this.candidatos.push(d);}close(){this.cerrado=true;}
 }
 const window={apiUrl:p=>p,RTCPeerConnection:PC};const ctx=vm.createContext({window,RTCPeerConnection:PC,MediaStream:class{getTracks(){return[];}},fetch,setTimeout:()=>1,clearTimeout(){},Response,console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/sala-webrtc.js'),'utf8'),ctx);
 let cerradas=0;const estado={textContent:''};const sala=new window.PMOSalaWebRTC({sala:'general',contenedor:{querySelector:()=>null},estado,participantes:{},alCerrar:()=>cerradas++});
 sala.tarjeta=()=>({div:{remove(){}},video:{},avatar:{},conexion:{}});sala.config={iceServers:[]};sala.id='b';sala.activa=true;sala.generacion=1;
 return{sala,estado,PC,cerradas:()=>cerradas};
}
test('quien responde transmite sobre los canales ofrecidos sin dejar video en un solo sentido',async()=>{
 const {sala}=entorno();const emitidas=[];sala.enviar=async(...v)=>emitidas.push(v);sala.medios.audio={kind:'audio'};sala.medios.video={kind:'video'};
 await sala.sincronizar([{id:'a',nombre:'Otro'},{id:'b',nombre:'Tú'}]);const p=sala.peers.get('a');assert.equal(p.pc.trans.length,0);
 await sala.recibir({origen:'a',tipo:'offer',datos:{type:'offer',sdp:'oferta'}});
 assert.equal(p.pc.trans.length,2);assert.equal(p.pc.trans[0].pista,sala.medios.audio);assert.equal(p.pc.trans[1].pista,sala.medios.video);
 assert.equal(emitidas[0][1],'answer');
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
