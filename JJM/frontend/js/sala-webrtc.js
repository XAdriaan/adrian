(() => {
    'use strict';
    class SalaWebRTC {
        constructor({sala, contenedor, estado, participantes, alCerrar}) {
            Object.assign(this, {sala, contenedor, estado, participantes, alCerrar});
            this.peers = new Map(); this.medios = {audio:null, video:null}; this.desde = 0;
            this.generacion = 0; this.activa = false; this.cadenas = new Map();
        }
        async api(accion, opciones = {}) {
            const r = await fetch(window.apiUrl(`/api/videollamadas/${this.sala}/${accion}`), opciones);
            const d = await r.json().catch(() => ({}));
            if (!r.ok) { const e = new Error(d.mensaje || d.detail || (r.status === 403 ? 'No tienes acceso a esta sala.' : 'No fue posible conectar con la sala.')); e.status = r.status; throw e; }
            return d;
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
            this.contenedor.replaceChildren(); this.tarjeta(this.id, 'Tú', true);
            this.estado.textContent = 'Estás en la sala. Activa el micrófono o la cámara cuando quieras.';
            await this.sincronizar(d.participantes || []); this.ciclo(epoca);
        }
        tarjeta(id, nombre, propia = false) {
            const div = document.createElement('article'); div.className = 'rtc-persona'; div.dataset.conexion = id;
            const video = document.createElement('video'); video.autoplay = true; video.playsInline = true; video.muted = propia;
            const avatar = document.createElement('span'); avatar.className = 'rtc-avatar'; avatar.textContent = String(nombre || 'JJM').trim().slice(0,1).toUpperCase();
            const etiqueta = document.createElement('strong'); etiqueta.textContent = nombre || 'Participante';
            const conexion = document.createElement('small'); conexion.className = 'rtc-estado'; conexion.textContent = propia ? 'Tu conexión' : 'Conectando…';
            div.append(video, avatar, etiqueta, conexion); this.contenedor.append(div);
            if (propia) { div.dataset.propia = 'true'; this.videoLocal = video; this.avatarLocal = avatar; }
            video.addEventListener('loadeddata', () => { avatar.hidden = propia
                ? !!(this.medios.video?.enabled && this.medios.video?.readyState === 'live') : video.videoWidth > 0; });
            return {div, video, avatar, conexion};
        }
        async sincronizar(lista) {
            if (!this.activa) return;
            const epoca = this.generacion;
            const ids = new Set(lista.map(p => p.id));
            for (const [id,p] of this.peers) if (!ids.has(id)) { p.pc.close(); p.div.remove(); this.peers.delete(id); this.cadenas.delete(id); }
            for (const persona of lista) {
                if (!this.activa || this.generacion !== epoca) return;
                if (persona.id === this.id || this.peers.has(persona.id)) continue;
                const pc = new RTCPeerConnection({iceServers:this.config.iceServers || []});
                const p = {...this.tarjeta(persona.id, persona.nombre), pc, pendientes:[], stream:new MediaStream()};
                this.peers.set(persona.id, p);
                if (this.id < persona.id) {
                    p.audio = pc.addTransceiver('audio', {direction:'sendrecv'}).sender;
                    p.videoSender = pc.addTransceiver('video', {direction:'sendrecv'}).sender;
                    if (this.medios.audio) await p.audio.replaceTrack(this.medios.audio);
                    if (this.medios.video) await p.videoSender.replaceTrack(this.medios.video);
                }
                if (!this.activa || this.generacion !== epoca) return;
                pc.onicecandidate = e => { if (e.candidate && this.activa) this.enviar(persona.id,'candidate',e.candidate.toJSON()).catch(()=>{}); };
                pc.ontrack = e => { if (!p.stream.getTracks().includes(e.track)) p.stream.addTrack(e.track); p.video.srcObject = p.stream;
                    e.track.onunmute = () => { p.video.play().catch(() => { this.estado.textContent = 'Pulsa Activar audio para escuchar a los participantes.'; }); }; };
                pc.onconnectionstatechange = () => {
                    p.conexion.textContent = ({connected:'Conectado',connecting:'Conectando…',disconnected:'Conexión interrumpida',failed:'No se pudo conectar',closed:'Desconectado'})[pc.connectionState] || 'Preparando…';
                    if (pc.connectionState === 'failed') this.estado.textContent = this.config.relayDisponible
                    ? 'No se pudo conectar con un participante. Usa Reconectar.'
                    : 'La red bloqueó la conexión con un participante. El administrador debe configurar TURN para esta red.'; };
                // Un solo iniciador por pareja evita ofertas simultáneas.
                if (this.id < persona.id) await this.ofertar(persona.id);
            }
            this.participantes.textContent = `${lista.length} ${lista.length === 1 ? 'participante' : 'participantes'}`;
        }
        async ofertar(id) {
            const p = this.peers.get(id); if (!p || p.pc.signalingState !== 'stable') return;
            await p.pc.setLocalDescription(await p.pc.createOffer());
            await this.enviar(id, 'offer', p.pc.localDescription.toJSON());
        }
        enviar(destino, tipo, datos) {
            if (!this.activa || !this.id) return Promise.reject(new Error('La sala está cerrada.'));
            return this.api('senal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conexion:this.id,destino,tipo,datos})});
        }
        async recibir(e) {
            const p = this.peers.get(e.origen); if (!p) return;
            if (e.tipo === 'candidate') {
                if (p.pc.remoteDescription) await p.pc.addIceCandidate(e.datos); else p.pendientes.push(e.datos);
            } else {
                await p.pc.setRemoteDescription(e.datos);
                for (const candidato of p.pendientes.splice(0)) await p.pc.addIceCandidate(candidato);
                if (e.tipo === 'offer') {
                    // Responder sobre las secciones recibidas; crear otras dejaría video en un solo sentido.
                    for (const transceptor of p.pc.getTransceivers()) {
                        transceptor.direction = 'sendrecv';
                        const tipo = transceptor.receiver.track.kind;
                        if (tipo === 'audio') p.audio = transceptor.sender;
                        if (tipo === 'video') p.videoSender = transceptor.sender;
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
                if (!this.activa || this.generacion !== epoca) return;
                for (const e of d.eventos || []) { await this.recibir(e); this.desde = e.secuencia; }
                this.fallos = 0;
            } catch (e) {
                if (!this.activa || this.generacion !== epoca) return;
                this.fallos = (this.fallos || 0) + 1;
                if ([401,403,409].includes(e.status) || this.fallos >= 5) {
                    await this.salir(); this.estado.textContent = e.message + ' Pulsa Entrar a la sala para reintentar.'; this.alCerrar?.(); return;
                }
                this.estado.textContent = 'Se interrumpió la conexión. Intentando recuperar la sala…';
            }
            if (this.activa && this.generacion === epoca) this.timer = setTimeout(() => this.ciclo(epoca), 1200);
        }
        async cambiar(tipo, pista) {
            this.medios[tipo] = pista;
            this.actualizarVistaLocal();
            const resultados = await Promise.allSettled([...this.peers.values()].map(p =>
                (tipo === 'audio' ? p.audio : p.videoSender)?.replaceTrack(pista)));
            if (resultados.some(r => r.status === 'rejected')) this.estado.textContent =
                'Tu dispositivo está activo. Un participante perdió la conexión; puede pulsar Reconectar.';
        }
        actualizarVistaLocal() {
            const local = this.videoLocal;
            if (!local) return;
            local.srcObject = new MediaStream(Object.values(this.medios).filter(t => t?.readyState === 'live'));
            local.muted = true;
            const visible = this.medios.video?.readyState === 'live' && this.medios.video.enabled;
            local.hidden = !visible;
            if (this.avatarLocal) this.avatarLocal.hidden = !!visible;
            if (visible) local.play().catch(() => {});
        }
        async salir(keepalive = false) {
            ++this.generacion; this.activa = false; clearTimeout(this.timer);
            for (const p of this.peers.values()) p.pc.close(); this.peers.clear();
            for (const t of Object.values(this.medios)) t?.stop(); this.medios = {audio:null,video:null};
            const id = this.id; this.id = null;
            if (id) await this.api('salir',{method:'POST',keepalive,headers:{'Content-Type':'application/json'},body:JSON.stringify({conexion:id})}).catch(()=>{});
        }
    }
    window.PMOSalaWebRTC = SalaWebRTC;
})();
