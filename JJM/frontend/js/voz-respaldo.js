(() => {
    'use strict';
    const FRECUENCIA = 12000, MUESTRAS = 3072;
    class VozRespaldo {
        constructor(sala, audio) {
            this.sala = sala;
            this.audio = audio;
            this.salidas = new Map();
            this.bloque = new Int16Array(MUESTRAS);
            this.indice = 0;
            this.fase = 0;
            this.cola = [];
        }
        pendiente(p) {
            return p && p.pc.connectionState !== 'connected' && Date.now()-p.creado >= 5000;
        }
        destinos() {
            return [...this.sala.peers].filter(([,p])=>this.pendiente(p)).map(([id])=>id);
        }
        actualizar() {
            const pista=this.sala.medios.audio;
            if(!pista?.enabled || pista.readyState!=='live' || !this.destinos().length) {
                this.desconectarEntrada();
            } else if(this.pista!==pista && this.audio.state==='running') {
                this.desconectarEntrada();
                this.pista=pista;
                this.fuente=this.audio.createMediaStreamSource(new MediaStream([pista]));
                this.procesador=this.audio.createScriptProcessor(4096,1,1);
                this.procesador.onaudioprocess=e=>this.capturar(e.inputBuffer.getChannelData(0));
                // La salida de procesamiento queda en silencio; nunca monitoriza el micrófono local.
                this.fuente.connect(this.procesador);
                this.procesador.connect(this.audio.destination);
            }
            for(const [id,salida] of this.salidas) {
                if(!this.pendiente(this.sala.peers.get(id)))this.cerrarSalida(id,salida);
            }
        }
        capturar(datos) {
            if(!this.sala.activa || this.pista!==this.sala.medios.audio || !this.pista?.enabled)return;
            for(const valor of datos) {
                this.fase+=FRECUENCIA;
                if(this.fase<this.audio.sampleRate)continue;
                this.fase-=this.audio.sampleRate;
                this.bloque[this.indice++]=Math.round(Math.max(-1,Math.min(1,valor))*32767);
                if(this.indice!==MUESTRAS)continue;
                this.indice=0;
                const destinos=this.destinos();
                if(!destinos.length)continue;
                const pcm=btoa(String.fromCharCode(...new Uint8Array(this.bloque.buffer)));
                if(this.cola.length>=2)this.cola.shift();
                this.cola.push({conexion:this.sala.id,destinos,pcm});
                this.enviar();
            }
        }
        async enviar() {
            if(this.enviando)return;
            this.enviando=true;
            try {
                while(this.cola.length && this.sala.activa && this.pista?.enabled){
                    const bloque=this.cola.shift();
                    if(bloque.conexion!==this.sala.id)continue;
                    await this.sala.api('voz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bloque)});
                }
            } catch (_) { this.cola.length=0; }
            finally { this.enviando=false; }
        }
        recibir(fragmentos) {
            if(this.audio.state!=='running')return;
            for(const {origen,pcm} of fragmentos) {
                const p=this.sala.peers.get(origen);
                if(!this.pendiente(p) || !p.persona.audio || pcm?.length!==8192)continue;
                const bytes=Uint8Array.from(atob(pcm),c=>c.charCodeAt(0));
                const datos=new Int16Array(bytes.buffer), buffer=this.audio.createBuffer(1,datos.length,FRECUENCIA);
                const canal=buffer.getChannelData(0);
                for(let i=0;i<datos.length;i++)canal[i]=datos[i]/32768;
                let salida=this.salidas.get(origen);
                if(!salida){salida={fin:0,nodos:new Set()};this.salidas.set(origen,salida);}
                const ahora=this.audio.currentTime;
                if(salida.fin>ahora+1.5)continue;
                const nodo=this.audio.createBufferSource();
                nodo.buffer=buffer;nodo.connect(this.audio.destination);salida.nodos.add(nodo);
                nodo.onended=()=>{salida.nodos.delete(nodo);nodo.disconnect();};
                const inicio=Math.max(ahora+0.025,salida.fin);nodo.start(inicio);salida.fin=inicio+buffer.duration;
                p.ultimoAudioServidor=Date.now();p.conexion.textContent='Voz por servidor';
            }
        }
        desconectarEntrada() {
            if(this.procesador){this.procesador.onaudioprocess=null;this.procesador.disconnect();}
            this.fuente?.disconnect();this.fuente=null;this.procesador=null;this.pista=null;
            this.indice=0;this.fase=0;this.cola.length=0;
        }
        cerrarSalida(id,salida) {
            for(const nodo of salida.nodos)nodo.stop();
            this.salidas.delete(id);
        }
        cerrar() {
            this.desconectarEntrada();
            for(const [id,salida] of this.salidas)this.cerrarSalida(id,salida);
        }
    }
    window.PMOVozRespaldo=VozRespaldo;
})();