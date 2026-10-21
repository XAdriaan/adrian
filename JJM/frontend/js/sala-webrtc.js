(() => {
    'use strict';
    class SalaWebRTC {
        constructor({sala, contenedor, estado, participantes, alCerrar, alActualizar, alInteraccion}) {
            Object.assign(this, {sala, contenedor, estado, participantes, alCerrar, alActualizar, alInteraccion});
            this.peers = new Map(); this.medios = {audio:null, video:null, pantalla:null}; this.desde = 0;
            this.lista = []; this.estadoLocal = {mano:false,audio:false,video:false,pantalla:false};
            this.generacion = 0; this.activa = false; this.cadenas = new Map();
        }
        async api(accion, opciones = {}) {
            const controlador=new AbortController(),limite=setTimeout(()=>controlador.abort(),15000);
            try {
                const r = await fetch(window.apiUrl(`/api/videollamadas/${this.sala}/${accion}`), {...opciones,signal:controlador.signal});
                const d = await r.json().catch(() => ({}));
                if (!r.ok) { const e = new Error(d.mensaje || d.detail || (r.status === 403 ? 'No tienes acceso a esta sala.' : 'No fue posible conectar con la sala.')); e.status = r.status; throw e; }
                return d;
            }finally{clearTimeout(limite);}
        }
        async entrar() {
            if (this.activa) return;
            if (!window.RTCPeerConnection) throw new Error('Tu navegador no admite videollamadas. Usa Chrome, Edge o Firefox actualizado.');
            const epoca = ++this.generacion;
            const r = await fetch(window.apiUrl('/api/videollamadas/configuracion'));
            if (!r.ok) throw new Error('No se pudo confirmar tu sesión. Inicia sesión de nuevo.');
            this.config = await r.json();
            const d = await this.api('entrar', {method:'POST'});
            if (epoca !== this.generacion) { await this.api('salir',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conexion:d.conexion})}).catch(()=>{}); return; }
            this.id = d.conexion; this.activa = true; this.desde = 0;
            this.estadoLocal = {mano:false,audio:false,video:false,pantalla:false};
            this.contenedor.replaceChildren(); this.tarjeta(this.id, 'Tú', true);
            this.estado.textContent = 'Estás en la sala. Activa el micrófono o la cámara cuando quieras.';
            await this.sincronizar(d.participantes || []); this.ciclo(epoca);
        }
        tarjeta(id, nombre, propia = false) {
            const div = document.createElement('article'); div.className = 'rtc-persona'; div.dataset.conexion = id;
            const video = document.createElement('video'); video.autoplay = true; video.playsInline = true; video.muted = true;
            const avatar = document.createElement('span'); avatar.className = 'rtc-avatar'; avatar.textContent = String(nombre || 'JJM').trim().slice(0,1).toUpperCase();
            const etiqueta = document.createElement('strong'); etiqueta.textContent = nombre || 'Participante';
            const conexion = document.createElement('small'); conexion.className = 'rtc-estado'; conexion.textContent = propia ? 'Tu conexión' : 'Conectando…';
            div.append(video, avatar, etiqueta, conexion); this.contenedor.append(div);
            if (propia) { div.dataset.propia = 'true'; this.videoLocal = video; this.avatarLocal = avatar; }
            video.addEventListener('loadeddata', () => { avatar.hidden = propia
                ? !!(this.medios.video?.enabled && this.medios.video?.readyState === 'live') : video.videoWidth > 0; });
            return {div, video, avatar, conexion, etiqueta};
        }
        async sincronizar(lista) {
            if (!this.activa) return;
            const epoca = this.generacion;
            this.lista = lista;this.usuario=lista.find(p=>p.id===this.id)?.usuario||this.usuario;
            const ids = new Set(lista.map(p => p.id));
            for (const [id,p] of this.peers) if (!ids.has(id)) { clearTimeout(p.recuperacion);p.pc.close();if(p.audioSalida){p.audioSalida.pause();p.audioSalida.srcObject=null;} p.div.remove(); this.peers.delete(id); this.cadenas.delete(id); }
            for (const persona of lista) {
                if (!this.activa || this.generacion !== epoca) return;
                if (persona.id === this.id || this.peers.has(persona.id)) continue;
                const pc = new RTCPeerConnection({iceServers:this.config.iceServers || []});
                const p = {...this.tarjeta(persona.id, persona.nombre), pc, pendientes:[], stream:new MediaStream(),persona};
                p.audioSalida=document.createElement('audio');p.audioSalida.autoplay=true;p.audioSalida.playsInline=true;p.div.append(p.audioSalida);
                this.peers.set(persona.id, p);
                if (this.id < persona.id) {
                    p.audio = pc.addTransceiver('audio', {direction:'sendrecv'}).sender;
                    p.videoSender = pc.addTransceiver('video', {direction:'sendrecv'}).sender;
                    p.pantallaSender = pc.addTransceiver('video', {direction:'sendrecv'}).sender;
                    if (this.medios.audio) await p.audio.replaceTrack(this.medios.audio);
                    if (this.medios.video) await p.videoSender.replaceTrack(this.medios.video);
                    if (this.medios.pantalla) await p.pantallaSender.replaceTrack(this.medios.pantalla);
                }
                if (!this.activa || this.generacion !== epoca) return;
                pc.onicecandidate = e => { if (e.candidate && this.activa) this.enviar(persona.id,'candidate',e.candidate.toJSON()).catch(()=>this.programarRecuperacion(persona.id)); };
                p.pantallaStream = new MediaStream();
                p.pantallaVideo = document.createElement('video'); p.pantallaVideo.autoplay=true; p.pantallaVideo.playsInline=true; p.pantallaVideo.muted=true;
                pc.ontrack = e => {
                    const pantalla = pc.getTransceivers().indexOf(e.transceiver) === 2;
                    const flujo = pantalla ? p.pantallaStream : p.stream;
                    const video = pantalla ? p.pantallaVideo : p.video;
                    if (!flujo.getTracks().includes(e.track)) flujo.addTrack(e.track); video.srcObject=flujo;
                    if(e.track.kind==='audio'){
                        p.audioSalida.srcObject=new MediaStream([e.track]);
                        p.audioSalida.muted=false;
                        p.audioSalida.play().catch(()=>{this.estado.textContent='Toca Entrar o cualquier control de la sala para habilitar la escucha.';});
                    }
                    video.play().catch(()=>{});
                    e.track.onunmute = () => { video.play().catch(() => { this.estado.textContent = 'Toca la sala o usa sus controles para reanudar el audio.'; }); this.alActualizar?.(); };
                    e.track.onended = () => this.alActualizar?.(); this.alActualizar?.();
                };
                pc.onconnectionstatechange = () => {
                    p.conexion.textContent = ({connected:'Conectado',connecting:'Conectando…',disconnected:'Conexión interrumpida',failed:'No se pudo conectar',closed:'Desconectado'})[pc.connectionState] || 'Preparando…';
                    if (['failed','disconnected'].includes(pc.connectionState)) this.programarRecuperacion(persona.id);
                    if(pc.connectionState==='connected'){clearTimeout(p.recuperacion);p.recuperacion=null;p.reintentos=0;p.video.play().catch(()=>{});}
                    this.actualizarEstadoConexion();
                };
                pc.oniceconnectionstatechange=()=>{if(['failed','disconnected'].includes(pc.iceConnectionState))this.programarRecuperacion(persona.id);};
                // Un solo iniciador por pareja evita ofertas simultáneas.
                // Una oferta perdida no debe cerrar la sala ni impedir conectar al resto.
                // ICE puede quedarse en «new» si nunca recibió la oferta/respuesta.
                this.programarRecuperacion(persona.id);
                if (this.id < persona.id) {
                    try { await this.ofertar(persona.id); }
                    catch (_) { this.programarRecuperacion(persona.id); }
                }
            }
            this.participantes.textContent = `${lista.length} ${lista.length === 1 ? 'participante' : 'participantes'}`;
            for (const persona of lista) {
                const p=this.peers.get(persona.id); if(!p)continue; p.persona=persona;
                if(p.div.dataset){p.div.dataset.mano=String(!!persona.mano);p.div.dataset.audio=String(!!persona.audio);}
                p.etiqueta.textContent=(persona.proyectos?persona.proyectos+' · ':'')+persona.nombre;p.etiqueta.title=p.etiqueta.textContent;
                p.video.hidden=!persona.video; p.avatar.hidden=!!persona.video && p.video.videoWidth>0;
            }
            const propia=lista.find(p=>p.id===this.id),etiqueta=this.contenedor.querySelector?.('[data-propia] strong');
            if(propia&&etiqueta){etiqueta.textContent=(propia.proyectos?propia.proyectos+' · ':'')+propia.nombre+' (Tú)';etiqueta.title=etiqueta.textContent;}
            this.actualizarEstadoConexion();this.alActualizar?.();
        }
        actualizarEstadoConexion() {
            if(!this.activa)return;
            const todos=[...this.peers.values()],pendientes=todos.filter(p=>p.pc?.connectionState!=='connected');
            const conectados=todos.length-pendientes.length;
            const nombres=pendientes.map(p=>String(p.persona?.nombre||'Participante').slice(0,45)).slice(0,2).join(', ');
            const sinRuta=pendientes.some(p=>(p.reintentos||0)>=3)&&!this.config.relayDisponible;
            const texto=!todos.length?'Estás en la sala. Esperando a otros participantes.':!pendientes.length
                ?`Conexión activa con los ${todos.length} participantes remotos.`
                :`${conectados} de ${todos.length} participantes remotos conectados. ${sinRuta?'Sin conexión':'Conectando'} con ${nombres}${pendientes.length>2?' y otros':''}.${sinRuta?' Falta configurar TURN para las redes que no logran conexión directa.':''}`;
            if(this.ultimoEstadoConexion!==texto){this.ultimoEstadoConexion=texto;this.estado.textContent=texto;}
        }
        serializar(id, tarea) {
            const anterior=this.cadenas.get(id)||Promise.resolve();
            const siguiente=anterior.catch(()=>{}).then(tarea);
            this.cadenas.set(id,siguiente);
            siguiente.finally(()=>{if(this.cadenas.get(id)===siguiente)this.cadenas.delete(id);}).catch(()=>{});
            return siguiente;
        }
        ofertar(id, reiniciar=false) {
            return this.serializar(id,()=>this.ofertarAhora(id,reiniciar));
        }
        async ofertarAhora(id, reiniciar=false) {
            const p = this.peers.get(id); if (!p)return;
            if(reiniciar && p.pc.signalingState==='have-local-offer')await p.pc.setLocalDescription({type:'rollback'});
            if(p.pc.signalingState !== 'stable')return;
            await p.pc.setLocalDescription(await p.pc.createOffer(reiniciar?{iceRestart:true}:undefined));
            await this.enviar(id, 'offer', p.pc.localDescription.toJSON());
        }
        programarRecuperacion(id){
            const p=this.peers.get(id);if(!p?.pc||p.recuperacion||!this.activa)return;
            p.recuperacion=setTimeout(async()=>{
                p.recuperacion=null;if(!this.activa||this.peers.get(id)!==p||p.pc.connectionState==='connected')return;
                p.reintentos=(p.reintentos||0)+1;
                this.actualizarEstadoConexion();
                try{if(this.id<id)await this.ofertar(id,true);else await this.enviar(id,'reiniciar',{});}catch(_){}
                this.actualizarEstadoConexion();
                this.programarRecuperacion(id);
            },Math.min(30000,10000*Math.max(1,p.reintentos||1)));
        }
        enviar(destino, tipo, datos) {
            if (!this.activa || !this.id) return Promise.reject(new Error('La sala está cerrada.'));
            return this.api('senal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conexion:this.id,destino,tipo,datos})});
        }
        recibir(e) {
            return this.serializar(e.origen,()=>this.recibirAhora(e));
        }
        async recibirAhora(e) {
            if (['chat','reaccion','captura'].includes(e.tipo)) { this.alInteraccion?.(e); return; }
            const p = this.peers.get(e.origen); if (!p) return;
            if(e.tipo==='reiniciar'){if(this.id<e.origen)await this.ofertarAhora(e.origen,true);return;}
            if (e.tipo === 'candidate') {
                if (p.pc.remoteDescription) await p.pc.addIceCandidate(e.datos); else p.pendientes.push(e.datos);
            } else {
                await p.pc.setRemoteDescription(e.datos);
                // Un candidato antiguo o rechazado no debe impedir enviar la respuesta SDP.
                for (const candidato of p.pendientes.splice(0)) {
                    try { await p.pc.addIceCandidate(candidato); } catch (_) {}
                }
                if (e.tipo === 'offer') {
                    // Responder sobre las secciones recibidas; crear otras dejaría video en un solo sentido.
                    for (const [indice, transceptor] of p.pc.getTransceivers().entries()) {
                        transceptor.direction = 'sendrecv';
                        const tipo = indice === 2 ? 'pantalla' : transceptor.receiver.track.kind;
                        if (tipo === 'audio') p.audio = transceptor.sender;
                        if (tipo === 'video') p.videoSender = transceptor.sender;
                        if (tipo === 'pantalla') p.pantallaSender = transceptor.sender;
                        if (this.medios[tipo]) await transceptor.sender.replaceTrack(this.medios[tipo]);
                    }
                    await p.pc.setLocalDescription(await p.pc.createAnswer());
                    await this.enviar(e.origen,'answer',p.pc.localDescription.toJSON());
                }
            }
        }
        async ciclo(epoca) {
            if (!this.activa || this.generacion !== epoca) return;
            try {
                const d = await this.api(`eventos?conexion=${encodeURIComponent(this.id)}&desde=${this.desde}`);
                if (!this.activa || this.generacion !== epoca) return;
                await this.sincronizar(d.participantes || []);
                this.alInteraccion?.({tipo:'camara-control',datos:d.camaraControl||{}});
                this.alInteraccion?.({tipo:'historial',datos:d.chat || []});
                if (!this.activa || this.generacion !== epoca) return;
                for (const e of d.eventos || []) {try{await this.recibir(e);}catch(_){this.programarRecuperacion(e.origen);}this.desde = e.secuencia;}
                this.fallos = 0;
            } catch (e) {
                if (!this.activa || this.generacion !== epoca) return;
                this.fallos = (this.fallos || 0) + 1;
                if ([401,403].includes(e.status) || (e.status===409&&e.message.includes('dos dispositivos'))) {
                    await this.salir(); this.estado.textContent = e.message + ' Pulsa Entrar a la sala para reintentar.'; this.alCerrar?.(); return;
                }
                if(e.status===409){
                    try{await this.recuperarSesion(epoca);this.fallos=0;}catch(error){if([401,403].includes(error.status)){await this.salir();this.estado.textContent=error.message;this.alCerrar?.();return;}}
                }
                this.estado.textContent = 'Se interrumpió la conexión. Intentando recuperar la sala…';
            }
            if (this.activa && this.generacion === epoca) this.timer = setTimeout(() => this.ciclo(epoca), Math.min(15000,1200*Math.max(1,this.fallos||0)));
        }
        async recuperarSesion(epoca){
            await this.api('salir',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conexion:this.id})}).catch(()=>{});
            const datos=await this.api('entrar',{method:'POST'});
            if(!this.activa||this.generacion!==epoca){await this.api('salir',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conexion:datos.conexion})}).catch(()=>{});return;}
            for(const p of this.peers.values()){clearTimeout(p.recuperacion);p.pc.close();if(p.audioSalida){p.audioSalida.pause();p.audioSalida.srcObject=null;}}this.peers.clear();
            this.id=datos.conexion;this.desde=0;this.contenedor.replaceChildren();this.tarjeta(this.id,'Tú',true);this.actualizarVistaLocal();
            await this.publicarEstado();await this.sincronizar(datos.participantes.map(p=>p.id===this.id?{...p,...this.estadoLocal}:p));
        }
        async cambiar(tipo, pista) {
            this.medios[tipo] = pista;
            this.actualizarVistaLocal();
            const resultados = await Promise.allSettled([...this.peers.entries()].map(([id,p]) => this.serializar(id,async () => {
                let tiempo;
                try {
                    await Promise.race([(tipo === 'audio' ? p.audio : tipo === 'pantalla' ? p.pantallaSender : p.videoSender)?.replaceTrack(pista),
                        new Promise((_,rechazar)=>{tiempo=setTimeout(()=>rechazar(new Error('El participante no respondió al cambio de dispositivo.')),4000);})]);
                    const sender=tipo==='audio'?p.audio:tipo==='pantalla'?p.pantallaSender:p.videoSender;
                    if(pista && tipo!=='audio' && sender?.getParameters && sender.setParameters){
                        const parametros=sender.getParameters();if(parametros.encodings?.length){parametros.encodings[0].maxBitrate=tipo==='pantalla'?1200000:450000;parametros.encodings[0].maxFramerate=tipo==='pantalla'?20:20;sender.setParameters(parametros).catch(()=>{});}
                    }
                } catch (error) { this.programarRecuperacion(id); throw error; }
                finally { clearTimeout(tiempo); }
            })));
            if (resultados.some(r => r.status === 'rejected')) this.estado.textContent =
                'Tu dispositivo está activo. Un participante perdió la conexión; puede pulsar Reconectar.';
        }
        interaccion(tipo, datos) {
            if(!this.activa)return Promise.reject(new Error('Entra a la sala primero.'));
            return this.api('interaccion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conexion:this.id,tipo,datos})});
        }
        async publicarEstado(cambios={}) {
            const estado={...this.estadoLocal,...cambios};
            const respuesta=await this.interaccion('estado',estado);
            this.estadoLocal=estado; this.lista=this.lista.map(p=>p.id===this.id?{...p,...estado}:p); this.alActualizar?.();
            return respuesta;
        }
        actualizarVistaLocal() {
            const local = this.videoLocal;
            if (!local) return;
            const pistas=[this.medios.audio,this.medios.video].filter(t=>t?.readyState==='live');
            const anteriores=local.srcObject?.getTracks?.() || [];
            const cambio=pistas.length!==anteriores.length || pistas.some(t=>!anteriores.includes(t));
            if(cambio)local.srcObject=pistas.length?new MediaStream(pistas):null;
            local.muted = true;
            local.autoplay = true; local.playsInline = true;
            const visible = this.medios.video?.readyState === 'live' && this.medios.video.enabled;
            local.hidden = !visible;
            if (this.avatarLocal) this.avatarLocal.hidden = !!visible;
            if (visible && (cambio || local.paused)) local.play().catch(() => {
                this.estado.textContent='La cámara está disponible. Toca la sala para reanudar la reproducción, o vuelve a seleccionar tu cámara.';
            });
        }
        async salir(keepalive = false) {
            ++this.generacion; this.activa = false; clearTimeout(this.timer);
            for (const p of this.peers.values()){clearTimeout(p.recuperacion);p.pc.close();if(p.audioSalida){p.audioSalida.pause();p.audioSalida.srcObject=null;}} this.peers.clear();
            for (const t of Object.values(this.medios)) t?.stop(); this.medios = {audio:null,video:null,pantalla:null}; this.lista=[];
            const id = this.id; this.id = null;
            if (id) await this.api('salir',{method:'POST',keepalive,headers:{'Content-Type':'application/json'},body:JSON.stringify({conexion:id})}).catch(()=>{});
        }
    }
    window.PMOSalaWebRTC = SalaWebRTC;
})();
