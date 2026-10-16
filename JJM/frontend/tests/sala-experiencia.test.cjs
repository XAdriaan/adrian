const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function entorno(){
 class Elemento{
  constructor(){this.listeners={};this.children=[];this.dataset={};this.hidden=true;this.attrs={};this.classList={toggle:(k,v)=>this.attrs[k]=v,add:k=>this.attrs[k]=true,remove:k=>this.attrs[k]=false};this.scrollHeight=0;this.scrollTop=0;this.clientHeight=100;}
  addEventListener(n,f){this.listeners[n]=f;}setAttribute(n,v){this.attrs[n]=v;}getAttribute(n){return this.attrs[n]||null;}append(...hijos){hijos.forEach(c=>{if(typeof c==='object')c.parent=this;this.children.push(c);});}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}get firstElementChild(){return this.children[0];}focus(){}play(){return Promise.resolve();}click(){return this.listeners.click?.();}
 }
 const elems={},el=id=>elems[id]||(elems[id]=new Elemento()),body=new Elemento(),handlers={},documentHandlers={},intervalos=[];el('oficinaDuranteLlamada').contentWindow={};
 const document={getElementById:el,createElement:()=>new Elemento(),createTextNode:text=>({textContent:text}),querySelector:()=>el('main'),querySelectorAll:()=>[],body,addEventListener(n,f){(documentHandlers[n] ||= []).push(f);},removeEventListener(n,f){documentHandlers[n]=(documentHandlers[n]||[]).filter(v=>v!==f);}};
 const window={addEventListener:(n,f)=>handlers[n]=f};const ctx=vm.createContext({window,document,location:{origin:'https://oficina.test'},localStorage:{getItem:()=> 'token'},setInterval:(fn,ms)=>{intervalos.push({fn,ms});return intervalos.length;},clearInterval(){},setTimeout:()=>1,clearTimeout(){},Date,URL,console,MediaStream:class{constructor(tracks){this.tracks=tracks;}getVideoTracks(){return this.tracks.filter(t=>t.kind==='video');}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/sala-experiencia.js'),'utf8'),ctx);
 const rtc={id:'yo',activa:true,medios:{},estadoLocal:{video:false,audio:false,mano:false},lista:[],peers:new Map(),estado:{},async publicarEstado(d){Object.assign(this.estadoLocal,d);},async interaccion(tipo,datos){this.ultima={tipo,datos};return{datos:{...datos,id:1,nombre:'Yo',origen:'yo',fecha:0}};}};
 const experiencia=new window.PMOExperienciaSala({rtc});return {el,ctx,rtc,experiencia,body,handlers,documentHandlers,intervalos};
}
test('resalta al hablante sin cambios rápidos por ruido o silencio',()=>{
 const {ctx}=entorno(),e=ctx.window.PMOElegirHablante;
 assert.equal(e([{id:'a',nivel:.01}],null,2000,0),null);
 assert.equal(e([{id:'a',nivel:.2}],null,2000,0),'a');
 assert.equal(e([{id:'b',nivel:.4}], 'a',2500,2000),'a');
 assert.equal(e([{id:'a',nivel:.2},{id:'b',nivel:.23}], 'a',4000,2000),'a');
 assert.equal(e([{id:'b',nivel:.4}], 'a',4000,2000),'b');
});
test('la presentación permanece en la vista principal aunque hable otro alumno',()=>{
 const {rtc,experiencia,el}=entorno();const pista={kind:'video',readyState:'live'},stream={getVideoTracks:()=>[pista]};rtc.lista=[{id:'presenta',nombre:'Docente',pantalla:true},{id:'habla',nombre:'Alumno',video:true}];rtc.peers.set('presenta',{pantallaVideo:{srcObject:stream}});experiencia.hablante='habla';experiencia.actualizar();assert.equal(el('videoPrincipal').srcObject,stream);assert.match(el('nombrePrincipal').textContent,/Docente.*Compartiendo/);
});
test('chat muestra texto literal, evita duplicados y cuenta únicamente mensajes nuevos ajenos',()=>{
 const {experiencia,el}=entorno(),dato={id:1,texto:'<script>alert(1)</script>',nombre:'<img>',origen:'otro',fecha:0};experiencia.mensaje(dato);experiencia.interaccion({tipo:'historial',datos:[dato]});assert.equal(el('mensajesSala').children.length,1);assert.equal(el('mensajesSala').children[0].children[1].textContent,dato.texto);assert.equal(el('chatNoLeidos').textContent,'1');experiencia.chat(true);assert.equal(el('chatNoLeidos').textContent,'');
});
test('levantar la mano publica el estado y el botón permite bajarla',async()=>{
 const {rtc,el}=entorno();await el('btnManoSala').click();assert.equal(rtc.estadoLocal.mano,true);assert.equal(el('btnManoSala').attrs['aria-pressed'],'true');await el('btnManoSala').click();assert.equal(rtc.estadoLocal.mano,false);
});
test('minimizar conserva los medios y abre la Oficina dentro del mismo documento',()=>{
 const {rtc,experiencia,el,body}=entorno();const pista={stop(){throw Error('No debe detenerse');}};rtc.medios.video=pista;experiencia.minimizar('dashboard.html');assert.equal(rtc.activa,true);assert.equal(rtc.medios.video,pista);assert.equal(el('oficinaDuranteLlamada').src,'dashboard.html');assert.equal(body.attrs['sala-minimizada'],true);experiencia.restaurar();assert.equal(el('oficinaDuranteLlamada').hidden,true);
});

test('abrir asistencia cambia el apartado del iframe conservando la misma llamada',()=>{
 const {rtc,experiencia,el,body}=entorno();const pista={stop(){throw Error('La navegación no debe detener los medios');}};
 rtc.medios.audio=pista;const frame=el('oficinaDuranteLlamada');frame.setAttribute('src','dashboard.html');frame.src='dashboard.html';
 experiencia.minimizar('asistencia.html',true);assert.equal(frame.src,'asistencia.html');assert.equal(frame.hidden,false);
 assert.equal(rtc.activa,true);assert.equal(rtc.medios.audio,pista);assert.equal(body.attrs['sala-minimizada'],true);
});
test('solo el iframe propio puede solicitar volver a la llamada',()=>{
 const {experiencia,el,handlers}=entorno();experiencia.minimizar('dashboard.html');handlers.message({origin:'https://otro.test',source:el('oficinaDuranteLlamada').contentWindow,data:{tipo:'pmo:volver-llamada'}});assert.equal(experiencia.minimizada,true);handlers.message({origin:'https://oficina.test',source:el('oficinaDuranteLlamada').contentWindow,data:{tipo:'pmo:volver-llamada'}});assert.equal(experiencia.minimizada,false);
});
test('un fallo del chat conserva el texto y vuelve a habilitar enviar',async()=>{
 const {rtc,el}=entorno();rtc.interaccion=async()=>{throw Error('No hay conexión');};el('textoChatSala').value='Mensaje pendiente';await el('formChatSala').listeners.submit({preventDefault(){}});assert.equal(el('textoChatSala').value,'Mensaje pendiente');assert.equal(el('btnEnviarChat').disabled,false);assert.equal(rtc.estado.textContent,'No hay conexión');
});
test('un navegador sin segmentación informa el problema sin apagar la cámara',async()=>{
 const {ctx}=entorno();vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/sala-fondos.js'),'utf8'),ctx);const fondo=new ctx.window.PMOFondosSala({alCambiar:async()=>{},alError(){}}),pista={readyState:'live',stop(){throw Error('No debe detener original');}};await assert.rejects(()=>fondo.iniciar(pista,'azul'),/no admite fondos/);assert.equal(pista.readyState,'live');
});

test('foto de cámara descarga PNG después de comprobar imagen activa',async()=>{const e=entorno();e.ctx.URL={createObjectURL:()=> 'blob:foto',revokeObjectURL(){}};let descargas=0,dibujos=0;const anterior=e.ctx.document.createElement;e.ctx.document.createElement=tipo=>tipo==='canvas'?{getContext:()=>({fillRect(){},drawImage(){dibujos++;},fillText(){}}),toBlob:cb=>cb(new Blob(['PNG'],{type:'image/png'}))}:Object.assign(anterior(),{click(){descargas++;}});e.rtc.videoLocal={videoWidth:640,videoHeight:360,readyState:4};e.rtc.estadoLocal.video=true;await e.experiencia.foto('camara');assert.equal(dibujos,1);assert.equal(descargas,1);assert.equal(e.el('estadoCapturaSala').textContent,'Imagen descargada.');assert.equal(e.el('btnFotoCamara').disabled,false);});
test('foto sin cámara lista no dice que se descargó y permite reintentar',async()=>{const e=entorno();e.ctx.document.createElement=()=>({getContext:()=>({fillRect(){}})});await e.experiencia.foto('camara');assert.match(e.el('estadoCapturaSala').textContent,/Activa tu cámara/);assert.equal(e.el('btnFotoCamara').disabled,false);});
test('captura de reunión avisa a los presentes antes de descargar',async()=>{const e=entorno();let aviso=false,descargada=false;e.ctx.URL={createObjectURL:()=> 'blob:reunion',revokeObjectURL(){}};const anterior=e.ctx.document.createElement;e.ctx.document.createElement=tipo=>tipo==='canvas'?{getContext:()=>({fillRect(){},fillText(){},drawImage(){}}),toBlob:cb=>cb(new Blob(['PNG']))}:Object.assign(anterior(),{click(){assert.equal(aviso,true);descargada=true;}});e.rtc.interaccion=async(tipo)=>{assert.equal(tipo,'captura');aviso=true;};await e.experiencia.foto('reunion');assert.equal(descargada,true);});

test('un gesto en la sala reanuda el audio remoto y conserva el micrófono silenciado',async()=>{
 const e=entorno();let reproducciones=0,reanudaciones=0,permisos=0;
 e.ctx.navigator={mediaDevices:{getUserMedia(){permisos++;throw Error('No debe solicitar micrófono para escuchar');}}};
 e.ctx.window.AudioContext=class{constructor(){this.state='suspended';}resume(){reanudaciones++;this.state='running';return Promise.resolve();}createMediaStreamSource(){return{connect(){},disconnect(){}};}createAnalyser(){return{connect(){},disconnect(){}};}close(){return Promise.resolve();}};
 const micro={kind:'audio',readyState:'live',enabled:false},remoto={kind:'audio',readyState:'live',enabled:true};
 e.rtc.medios.audio=micro;e.rtc.peers.set('otro',{stream:{getAudioTracks:()=>[remoto]},audioSalida:{paused:true,play(){reproducciones++;return Promise.resolve();}}});
 e.documentHandlers.pointerdown.forEach(fn=>fn({type:'pointerdown',button:0,target:{closest:()=>e.el('sala')}}));
 // La reproducción se solicita dentro del gesto, sin esperar un permiso.
 assert.equal(reproducciones,1);assert.equal(reanudaciones,1);
 await Promise.resolve();assert.equal(micro.enabled,false);assert.equal(e.rtc.estadoLocal.audio,false);assert.equal(permisos,0);
 e.experiencia.cerrar();assert.equal(e.documentHandlers.pointerdown.length,0);
});

test('el teclado también reintenta audio bloqueado y la recuperación conserva pausas ajenas',async()=>{
 const e=entorno();let intentos=0;const video={paused:true,play(){intentos++;return intentos===1?Promise.reject(Object.assign(Error('Autoplay bloqueado'),{name:'NotAllowedError'})):Promise.resolve();}};
 e.rtc.peers.set('otro',{stream:{getAudioTracks:()=>[{readyState:'live'}]},audioSalida:video});
 e.documentHandlers.keydown.forEach(fn=>fn({type:'keydown',key:'Enter',target:{closest:()=>e.el('sala')}}));
 await Promise.resolve();assert.equal(intentos,1);
 e.intervalos.find(i=>i.ms===5000).fn();assert.equal(intentos,2);
 video.paused=false;e.intervalos.find(i=>i.ms===5000).fn();assert.equal(intentos,2);
 e.rtc.activa=false;video.paused=true;e.intervalos.find(i=>i.ms===5000).fn();assert.equal(intentos,2);
});

test('los gestos fuera de la sala o teclas de escritura no reanudan el audio',()=>{
 const e=entorno();let intentos=0;e.experiencia.activarAudio=async()=>{intentos++;};
 e.documentHandlers.pointerdown.forEach(fn=>fn({type:'pointerdown',button:0,target:{closest:()=>null}}));
 e.documentHandlers.keydown.forEach(fn=>fn({type:'keydown',key:'a',target:{closest:()=>e.el('sala')}}));
 e.documentHandlers.keydown.forEach(fn=>fn({type:'keydown',key:'Enter',repeat:true,target:{closest:()=>e.el('sala')}}));
 assert.equal(intentos,0);
});

test('la escucha Web Audio conecta solo participantes remotos y silencia la salida duplicada',()=>{
 const e=entorno();let salidas=0;e.rtc.id='yo';e.rtc.usuario=7;e.rtc.medios.audio={readyState:'live'};
 e.rtc.peers.set('otro',{persona:{usuario:8},audioSalida:{muted:false},stream:{getAudioTracks:()=>[{readyState:'live'}]}});
 e.rtc.peers.set('mi-celular',{persona:{usuario:7},audioSalida:{muted:false},stream:{getAudioTracks:()=>[{readyState:'live'}]}});
 e.experiencia.audio={state:'running',destination:{},createMediaStreamSource:()=>({connect(){},disconnect(){}}),createAnalyser:()=>({connect(){salidas++;},disconnect(){}})};
 e.experiencia.actualizarAnalizadores();assert.equal(salidas,1);assert.equal(e.rtc.peers.get('otro').audioSalida.muted,true);assert.equal(e.rtc.usaWebAudio,true);
});
