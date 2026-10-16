(() => {
    'use strict';
    const el=id=>document.getElementById(id);
    function calcularVistaPresentacion(videoAncho,videoAlto,ancho,alto,zoom=1){
        const w=Math.max(0,Number(ancho)||0),h=Math.max(0,Number(alto)||0);
        const vw=Number(videoAncho)>0?Number(videoAncho):w,vh=Number(videoAlto)>0?Number(videoAlto):h;
        const factor=Math.min(3,Math.max(1,Number(zoom)||1));
        const escala=vw>0&&vh>0?Math.min(w/vw,h/vh)*factor:0;
        const resultado={ancho:vw*escala,alto:vh*escala};
        return {...resultado,izquierda:Math.max(0,(w-resultado.ancho)/2),arriba:Math.max(0,(h-resultado.alto)/2)};
    }
    function elegirHablante(niveles,anterior,ahora,cambio){
        const activos=niveles.filter(p=>p.nivel>.025).sort((a,b)=>b.nivel-a.nivel);
        if(!activos.length)return anterior;
        const actual=activos.find(p=>p.id===anterior),primero=activos[0];
        if(primero.id===anterior)return anterior;
        if(ahora-cambio<1200 || (actual && primero.nivel<actual.nivel*1.5))return anterior;
        return primero.id;
    }
    class ExperienciaSala {
        constructor({rtc,alFotoCamara}){
            this.rtc=rtc;this.alFotoCamara=alFotoCamara;this.analizadores=new Map();this.mensajes=new Set();this.noLeidos=0;this.cambio=0;this.minimizada=false;
            this.video=el('videoPrincipal');this.avatar=el('avatarPrincipal');
            this.zoomPresentacion=1;this.limpiarVista=[];this.identidadVista=null;
            this.enlazar();this.vigilar();
            this.enlazarVista();
        }
        error(e){this.rtc.estado.textContent=e.message || 'No se pudo completar la acción.';}
        enlazarVista(){
            const escuchar=(n,tipo,fn)=>{if(!n?.addEventListener)return;n.addEventListener(tipo,fn);this.limpiarVista.push(()=>n.removeEventListener?.(tipo,fn));};
            escuchar(el('btnZoomAmpliar'),'click',()=>this.cambiarZoom(.25));
            escuchar(el('btnZoomReducir'),'click',()=>this.cambiarZoom(-.25));
            escuchar(el('btnAjustarVista'),'click',()=>this.ajustarVista());
            escuchar(el('btnPantallaCompleta'),'click',()=>this.pantallaCompleta());
            escuchar(this.video,'loadedmetadata',()=>this.actualizarTamanoVista());
            escuchar(this.video,'resize',()=>this.actualizarTamanoVista());
            escuchar(window,'resize',()=>this.actualizarTamanoVista());
            escuchar(document,'fullscreenchange',()=>{
                const completa=document.fullscreenElement===el('presentacionPrincipal'),b=el('btnPantallaCompleta');
                b?.setAttribute('aria-pressed',String(completa));
                b?.setAttribute('aria-label',completa?'Salir de pantalla completa':'Pantalla completa');
                if(b)b.title=completa?'Salir de pantalla completa':'Pantalla completa';
                this.actualizarTamanoVista();
            });
            const area=el('escenarioPrincipal');
            escuchar(area,'pointerdown',e=>{
                if(this.zoomPresentacion<=1||e.pointerType==='touch'||e.button!==0)return;
                this.panVista={id:e.pointerId,x:e.clientX,y:e.clientY,left:area.scrollLeft,top:area.scrollTop};
                area.setPointerCapture?.(e.pointerId);area.classList.add('sala-arrastrando-vista');
            });
            escuchar(area,'pointermove',e=>{
                const inicio=this.panVista;if(!inicio||e.pointerId!==inicio.id)return;e.preventDefault();
                area.scrollLeft=inicio.left-(e.clientX-inicio.x);area.scrollTop=inicio.top-(e.clientY-inicio.y);
            });
            const finPan=e=>{if(!this.panVista||e.pointerId!==this.panVista.id)return;this.panVista=null;area.releasePointerCapture?.(e.pointerId);area.classList.remove('sala-arrastrando-vista');};
            escuchar(area,'pointerup',finPan);escuchar(area,'pointercancel',finPan);
            escuchar(area,'keydown',e=>{
                if(e.ctrlKey||e.metaKey||e.altKey)return;
                if(e.key==='+'||e.key==='='){e.preventDefault();this.cambiarZoom(.25);}
                else if(e.key==='-'){e.preventDefault();this.cambiarZoom(-.25);}
                else if(e.key==='0'){e.preventDefault();this.ajustarVista();}
            });
            this.observadorVista=typeof ResizeObserver==='function'?new ResizeObserver(()=>this.actualizarTamanoVista()):null;
            if(area)this.observadorVista?.observe(area);
            this.actualizarTamanoVista();
        }
        dimensionesVista(zoom=this.zoomPresentacion){
            const area=el('escenarioPrincipal');
            return calcularVistaPresentacion(this.video.videoWidth,this.video.videoHeight,area?.clientWidth,area?.clientHeight,zoom);
        }
        actualizarTamanoVista(){
            const area=el('escenarioPrincipal'),lienzo=el('lienzoPresentacion');if(!area||!lienzo?.style)return;
            const d=this.dimensionesVista();
            lienzo.style.width=d.ancho+'px';lienzo.style.height=d.alto+'px';
            lienzo.style.marginLeft=d.izquierda+'px';lienzo.style.marginTop=d.arriba+'px';
            area.classList.toggle('sala-vista-ampliada',this.zoomPresentacion>1);
            area.scrollLeft=Math.max(0,Math.min(area.scrollLeft||0,Math.max(0,d.ancho-area.clientWidth)));
            area.scrollTop=Math.max(0,Math.min(area.scrollTop||0,Math.max(0,d.alto-area.clientHeight)));
            if(el('escalaPresentacion'))el('escalaPresentacion').textContent=Math.round(this.zoomPresentacion*100)+'%';
            if(el('btnZoomReducir'))el('btnZoomReducir').disabled=this.zoomPresentacion<=1;
            if(el('btnZoomAmpliar'))el('btnZoomAmpliar').disabled=this.zoomPresentacion>=3;
        }
        cambiarZoom(delta){
            const area=el('escenarioPrincipal'),antes=this.dimensionesVista();
            const x=((area?.scrollLeft||0)+(area?.clientWidth||0)/2-antes.izquierda)/(antes.ancho||1);
            const y=((area?.scrollTop||0)+(area?.clientHeight||0)/2-antes.arriba)/(antes.alto||1);
            this.zoomPresentacion=Math.min(3,Math.max(1,this.zoomPresentacion+(Number(delta)||0)));
            this.actualizarTamanoVista();const ahora=this.dimensionesVista();
            if(area){area.scrollLeft=Math.max(0,Math.min(x*ahora.ancho+ahora.izquierda-area.clientWidth/2,Math.max(0,ahora.ancho-area.clientWidth)));
                area.scrollTop=Math.max(0,Math.min(y*ahora.alto+ahora.arriba-area.clientHeight/2,Math.max(0,ahora.alto-area.clientHeight)));}
        }
        ajustarVista(){this.zoomPresentacion=1;const area=el('escenarioPrincipal');if(area){area.scrollLeft=0;area.scrollTop=0;}this.actualizarTamanoVista();}
        async pantallaCompleta(){
            const panel=el('presentacionPrincipal');
            try{
                if(document.fullscreenElement===panel)await document.exitFullscreen?.();
                else{
                    if(!panel?.requestFullscreen)throw new Error('Este navegador no permite la pantalla completa. Puedes ampliar con +.');
                    await panel.requestFullscreen();
                }
                this.actualizarTamanoVista();
            }catch(e){this.error(e);}
        }
        enlazar(){
            el('btnChatSala').addEventListener('click',()=>this.chat());el('btnCerrarChat').addEventListener('click',()=>this.chat(false));
            for(const [boton,panel] of [['btnReaccionesSala','opcionesReacciones'],['btnFondosSala','opcionesFondos'],['btnCapturasSala','opcionesCapturas']])el(boton).addEventListener('click',()=>{
                const abrir=el(panel).hidden;this.cerrarOpciones();el(panel).hidden=!abrir;el(boton).setAttribute('aria-expanded',String(abrir));
            });
            document.querySelectorAll('[data-reaccion]').forEach(b=>b.addEventListener('click',async()=>{
                if(b.disabled)return;b.disabled=true;try{await this.rtc.interaccion('reaccion',{emoji:b.dataset.reaccion});this.cerrarOpciones();}catch(e){this.error(e);}finally{b.disabled=false;}
            }));
            el('btnManoSala').addEventListener('click',async()=>{
                const b=el('btnManoSala');b.disabled=true;
                try{await this.rtc.publicarEstado({mano:!this.rtc.estadoLocal.mano});b.setAttribute('aria-pressed',String(this.rtc.estadoLocal.mano));b.textContent=this.rtc.estadoLocal.mano?'✋ Bajar la mano':'✋ Levantar la mano';}catch(e){this.error(e);}finally{b.disabled=false;}
            });
            el('formChatSala').addEventListener('submit',async e=>{
                e.preventDefault();const boton=el('btnEnviarChat'),campo=el('textoChatSala'),texto=campo.value.trim();if(!texto||boton.disabled)return;
                boton.disabled=true;try{const r=await this.rtc.interaccion('chat',{texto});this.mensaje(r.datos,false);campo.value='';}catch(error){this.error(error);}finally{boton.disabled=false;}
            });
            el('btnRestaurarSala').addEventListener('click',()=>this.restaurar());
            el('btnSalirMini').addEventListener('click',()=>el('btnColgarReunion').click());
            el('btnFotoCamara').addEventListener('click',()=>this.foto('camara'));el('btnFotoReunion').addEventListener('click',()=>this.foto('reunion'));
            el('oficinaDuranteLlamada').addEventListener('load',()=>{
                if(!localStorage.getItem('sesionTokenPMO')){this.rtc.salir();window.location.replace('login.html');}
            });
            window.addEventListener('message',e=>{
                const frame=el('oficinaDuranteLlamada');if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.tipo!=='pmo:volver-llamada')return;
                this.restaurar();this.rtc.estado.textContent='Tu llamada sigue activa. Para cambiar de sala, sal de esta llamada primero.';
            });
            window.addEventListener('storage',e=>{if(e.key==='sesionTokenPMO'&&!e.newValue){this.rtc.salir();window.location.replace('login.html');}});
            document.addEventListener('keydown',e=>{if(e.key==='Escape'){this.cerrarOpciones();const menu=el('masOpcionesSala');if(menu?.open){menu.open=false;menu.querySelector('summary')?.focus();}}});
            el('masOpcionesSala')?.addEventListener('click',e=>{if(e.target.closest('button'))el('masOpcionesSala').open=false;});
            // La interacción habitual con la sala permite reintentar el audio
            // bloqueado por el navegador sin encender el micrófono del usuario.
            this.gestoAudio=e=>{
                if(!this.rtc.activa || !e.target?.closest?.('.meeting-app, .sala-opciones'))return;
                if(e.type==='keydown' && (e.repeat || !['Enter',' '].includes(e.key)))return;
                if(e.type==='pointerdown' && e.button!=null && e.button!==0)return;
                this.activarAudio().catch(()=>{});
            };
            document.addEventListener('pointerdown',this.gestoAudio,true);
            document.addEventListener('keydown',this.gestoAudio,true);
        }
        cerrarOpciones(){for(const [b,p] of [['btnReaccionesSala','opcionesReacciones'],['btnFondosSala','opcionesFondos'],['btnCapturasSala','opcionesCapturas']]){el(p).hidden=true;el(b).setAttribute('aria-expanded','false');}}
        chat(abrir=el('panelChatSala').hidden){
            el('panelChatSala').hidden=!abrir;el('btnChatSala').setAttribute('aria-expanded',String(abrir));document.querySelector('.meeting-main').classList.toggle('con-chat',abrir);
            if(abrir){el('panelGrabaciones').hidden=true;document.querySelector('.meeting-main').classList.remove('con-panel');el('btnPanelGrabaciones').setAttribute('aria-expanded','false');this.noLeidos=0;el('chatNoLeidos').textContent='';el('textoChatSala').focus();}
        }
        mensaje(dato,contar=true){
            if(!dato || this.mensajes.has(dato.id))return;this.mensajes.add(dato.id);
            const item=document.createElement('article');item.className='sala-mensaje';const nombre=document.createElement('strong'),texto=document.createElement('p'),hora=document.createElement('time');
            nombre.textContent=dato.nombre || 'Participante';texto.textContent=String(dato.texto||'');hora.textContent=new Date(dato.fecha).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});item.append(nombre,texto,hora);
            const lista=el('mensajesSala'),abajo=lista.scrollHeight-lista.scrollTop-lista.clientHeight<80;lista.append(item);while(lista.children.length>100)lista.firstElementChild.remove();if(abajo)lista.scrollTop=lista.scrollHeight;
            if(contar&&el('panelChatSala').hidden&&dato.origen!==this.rtc.id){el('chatNoLeidos').textContent=String(++this.noLeidos);}
        }
        interaccion(e){
            if(e.tipo==='camara-control'){
                const aviso=el('avisoCamaraObligatoria');if(!aviso)return;
                aviso.hidden=!e.datos.obligatoria||!e.datos.aviso;
                if(!aviso.hidden){const n=e.datos.aviso,resto=Number(e.datos.segundosRestantes)||0;
                    el('textoAvisoCamara').textContent=`Aviso ${n} de 3: enciende tu cámara. La llamada se cerrará en ${Math.floor(resto/60)}:${String(resto%60).padStart(2,'0')} si sigue apagada. Basta encenderla en uno de tus dos dispositivos.`;
                }return;
            }
            if(e.tipo==='historial'){for(const dato of e.datos)this.mensaje(dato,false);return;}
            if(e.tipo==='chat'){this.mensaje(e.datos);return;}
            const capa=el('reaccionesSala'),aviso=document.createElement('div');aviso.className='sala-reaccion';
            if(e.tipo==='reaccion'){const emoji=document.createElement('b');emoji.textContent=e.datos.emoji;aviso.append(emoji,document.createTextNode(e.datos.nombre));}
            else if(e.tipo==='captura')aviso.textContent=`📷 ${e.datos.nombre} tomó una captura de la reunión.`;else return;
            capa.append(aviso);while(capa.children.length>5)capa.firstElementChild.remove();setTimeout(()=>aviso.remove(),5500);
        }
        async activarAudio(){
            // play() y resume() se solicitan durante el gesto, antes del await.
            this.reproducirAudioRemoto();
            const Audio=window.AudioContext || window.webkitAudioContext;
            if(Audio&&!this.audio)this.audio=new Audio();await this.audio?.resume().catch(()=>{});this.actualizarAnalizadores();
        }
        reproducirAudioRemoto(){
            if(!this.rtc.activa)return;
            for(const p of this.rtc.peers.values()){
                if(p.audioSalida?.paused && p.stream?.getAudioTracks?.().some(t=>t.readyState==='live')){
                    try{p.audioSalida.play().catch(()=>{});}catch(_){}
                }
            }
        }
        actualizarAnalizadores(){
            const funcionando=this.audio?.state==='running';
            this.rtc.usaWebAudio=!!funcionando;
            const pistas=new Map();if(this.rtc.medios.audio?.readyState==='live')pistas.set(this.rtc.id,this.rtc.medios.audio);
            for(const [id,p] of this.rtc.peers){const t=p.stream.getAudioTracks?.()[0];if(t?.readyState==='live')pistas.set(id,t);}
            for(const [id,a] of this.analizadores)if(pistas.get(id)!==a.pista||!funcionando){a.fuente.disconnect();a.analizador.disconnect();this.analizadores.delete(id);}
            for(const [id,pista] of pistas)if(funcionando&&!this.analizadores.has(id)){
                let fuente,analizador;
                try{
                    fuente=this.audio.createMediaStreamSource(new MediaStream([pista]));analizador=this.audio.createAnalyser();analizador.fftSize=512;fuente.connect(analizador);
                    // Cada conexión remota debe oírse, incluso si comparte la cuenta.
                    const salida=id!==this.rtc.id;if(salida)analizador.connect(this.audio.destination);
                    this.analizadores.set(id,{pista,fuente,analizador,salida,datos:new Float32Array(512)});
                }catch(_){fuente?.disconnect();analizador?.disconnect();}
            }
            // Silenciar la salida HTML solo después de conectar una alternativa funcional.
            for(const [id,p] of this.rtc.peers)if(p.audioSalida)p.audioSalida.muted=!!(funcionando&&this.analizadores.get(id)?.salida);
        }

        vigilar(){
            this.timer=setInterval(()=>{
                if(!this.rtc.activa){for(const a of this.analizadores.values())a.fuente.disconnect();this.analizadores.clear();return;}
                this.actualizarAnalizadores();const niveles=[];
                for(const [id,a] of this.analizadores){
                    const persona=id===this.rtc.id?this.rtc.estadoLocal:this.rtc.peers.get(id)?.persona;
                    if(!persona?.audio||!a.pista.enabled)continue;a.analizador.getFloatTimeDomainData(a.datos);const nivel=Math.sqrt(a.datos.reduce((s,v)=>s+v*v,0)/a.datos.length);niveles.push({id,nivel});
                }
                const elegido=elegirHablante(niveles,this.hablante,Date.now(),this.cambio);
                if(elegido!==this.hablante){this.hablante=elegido;this.cambio=Date.now();}
                for(const p of this.rtc.lista){const div=p.id===this.rtc.id?document.querySelector('[data-propia]'):this.rtc.peers.get(p.id)?.div;if(div)div.dataset.hablando=String(niveles.some(n=>n.id===p.id&&n.nivel>.025));}
                this.actualizar();
            },250);
            this.reproduccion=setInterval(()=>{if(!this.rtc.activa)return;this.reproducirAudioRemoto();if(this.audio?.state==='suspended')this.audio.resume().catch(()=>{});},5000);
        }
        actualizar(){
            const lista=this.rtc.lista,propia={id:this.rtc.id,nombre:'Tú',...this.rtc.estadoLocal};
            const presenta=lista.find(p=>p.pantalla),destacada=presenta || lista.find(p=>p.id===this.hablante) || lista.find(p=>p.id!==this.rtc.id&&p.video) || lista.find(p=>p.video) || propia;
            const peer=this.rtc.peers.get(destacada.id);let fuente;
            if(presenta)fuente=presenta.id===this.rtc.id?null:peer?.pantallaVideo.srcObject;
            else fuente=destacada.id===this.rtc.id?this.rtc.videoLocal?.srcObject:peer?.video.srcObject;
            // Mantener el mismo objeto evita reiniciar el video cada 250 ms.
            const pistas=fuente?.getVideoTracks?.() || [];const actuales=this.video.srcObject?.getVideoTracks?.() || [];
            const cambiaPistas=pistas.length!==actuales.length || pistas.some(t=>!actuales.includes(t));
            if(cambiaPistas || this.identidadVista!==destacada.id){this.identidadVista=destacada.id;this.ajustarVista();}
            if(cambiaPistas){this.video.srcObject=fuente || null;this.video.play().catch(()=>{});}
            const visible=!!(pistas.some(t=>t.readyState==='live') && (presenta || destacada.video));this.video.hidden=!visible;this.avatar.hidden=visible;this.avatar.textContent=presenta?.id===this.rtc.id?'Estás compartiendo pantalla. Abre el documento o la ventana que vas a presentar. La vista previa se oculta aquí para evitar el efecto espejo.':String(destacada.nombre||'JJM').slice(0,1).toUpperCase();
            this.avatar.classList.toggle('sala-compartiendo-propia',presenta?.id===this.rtc.id);
            el('nombrePrincipal').textContent=`${destacada.proyectos?destacada.proyectos+' · ':''}${destacada.nombre||'Participante'}${presenta?' · Compartiendo pantalla':destacada.id===this.hablante?' · Hablando':''}`;
            el('tituloPresentacion').textContent=presenta?'Pantalla compartida':this.hablante?'Participante que habla':'Vista principal';
            this.actualizarTamanoVista();
        }
        minimizar(url,navegar=false){
            if(!this.rtc.activa){this.error(new Error('Entra a la sala para mantenerla abierta mientras navegas.'));return;}
            const frame=el('oficinaDuranteLlamada');this.cerrarOpciones();this.chat(false);
            if(document.fullscreenElement===el('presentacionPrincipal'))document.exitFullscreen?.().catch(()=>{});
            if(navegar||!frame.getAttribute('src'))frame.src=url||'dashboard.html';frame.hidden=false;this.minimizada=true;document.body.classList.add('sala-minimizada');el('btnRestaurarSala').hidden=false;
        }
        restaurar(){el('oficinaDuranteLlamada').hidden=true;this.minimizada=false;document.body.classList.remove('sala-minimizada');el('btnRestaurarSala').hidden=true;this.actualizar();}
        async foto(tipo){
            const b=el(tipo==='camara'?'btnFotoCamara':'btnFotoReunion');if(b.disabled)return;b.disabled=true;const aviso=el('estadoCapturaSala');
            try{
                if(!this.rtc.activa)throw new Error('Entra a la llamada antes de tomar una foto.');
                const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=tipo==='reunion'?Math.max(900,Math.ceil(this.rtc.lista.length/2)*80+90):900;const c=canvas.getContext('2d');c.fillStyle='#081225';c.fillRect(0,0,1600,canvas.height);
                if(tipo==='camara'){
                    const v=this.rtc.videoLocal;if(!this.rtc.estadoLocal.video||!v?.videoWidth)throw new Error('Activa tu cámara y espera a que aparezca la imagen.');this.pintarVideo(c,v,0,0,1600,900);
                }else{
                    await this.rtc.interaccion('captura',{});
                    c.fillStyle='#e6efff';c.font='bold 24px sans-serif';c.fillText('JJM · Oficina de Proyectos',26,37);c.font='16px sans-serif';c.fillText(new Date().toLocaleString('es-MX'),1180,37);
                    const personas=this.rtc.lista,columnas=personas.length>5?2:1,filas=Math.max(1,Math.ceil(personas.length/columnas)),alto=Math.min(160,Math.floor((canvas.height-90-(filas-1)*10)/filas)),ancho=columnas===2?210:350;
                    for(const [i,p] of personas.entries()){
                        const x=20+(i%columnas)*(ancho+10),y=65+Math.floor(i/columnas)*(alto+10),v=p.id===this.rtc.id?this.rtc.videoLocal:this.rtc.peers.get(p.id)?.video;
                        this.pintarVideo(c,p.video?v:null,x,y,ancho,alto);c.fillStyle='#081225df';c.fillRect(x,y+alto-25,ancho,25);c.fillStyle='#fff';c.font='13px sans-serif';c.fillText(`${p.mano?'✋ ':''}${p.nombre}`.slice(0,29),x+8,y+alto-8);
                    }
                    const izquierda=columnas===2?465:390;this.pintarVideo(c,!this.video.hidden?this.video:null,izquierda,65,1580-izquierda,810);c.fillStyle='#fff';c.font='16px sans-serif';c.fillText(el('nombrePrincipal').textContent,izquierda+15,865);
                }
                const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error('No se pudo crear la imagen.');
                const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`JJM_${tipo}_${new Date().toISOString().replace(/[:.]/g,'-')}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);aviso.textContent='Imagen descargada.';
            }catch(e){aviso.textContent=e.message;}finally{b.disabled=false;}
        }
        pintarVideo(c,v,x,y,w,h){
            c.fillStyle='#193453';c.fillRect(x,y,w,h);if(!v?.videoWidth || v.readyState<2){c.fillStyle='#aec9ef';c.font='22px sans-serif';c.fillText('JJM',x+w/2-22,y+h/2);return;}
            const escala=Math.min(w/v.videoWidth,h/v.videoHeight);c.drawImage(v,x+(w-v.videoWidth*escala)/2,y+(h-v.videoHeight*escala)/2,v.videoWidth*escala,v.videoHeight*escala);
        }
        cerrar(){clearInterval(this.timer);clearInterval(this.reproduccion);document.removeEventListener('pointerdown',this.gestoAudio,true);document.removeEventListener('keydown',this.gestoAudio,true);this.limpiarVista.forEach(fn=>fn());this.observadorVista?.disconnect();this.panVista=null;for(const a of this.analizadores.values())a.fuente.disconnect();this.analizadores.clear();this.audio?.close().catch(()=>{});}
    }
    window.PMOExperienciaSala=ExperienciaSala;window.PMOElegirHablante=elegirHablante;window.PMOCalcularVistaPresentacion=calcularVistaPresentacion;
})();
