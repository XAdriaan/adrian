(() => {
    'use strict';
    class FondosSala {
        constructor({alCambiar,alError}){this.alCambiar=alCambiar;this.alError=alError;this.modo='ninguno';this.generacion=0;this.activa=false;}
        async preparar(){
            if(this.trabajador)return;
            if(!window.Worker || !window.OffscreenCanvas || !window.createImageBitmap || !HTMLCanvasElement.prototype.captureStream)throw new Error('Este navegador no admite fondos. Actualiza Chrome o Edge; tu cámara puede funcionar sin efecto.');
            const worker=new Worker('js/sala-fondos-worker.js?v=20');this.trabajador=worker;
            try{
                await new Promise((resolver,rechazar)=>{
                    const limite=setTimeout(()=>rechazar(new Error('El fondo tardó demasiado en cargar. Intenta otra vez.')),25000);
                    worker.onerror=()=>{clearTimeout(limite);rechazar(new Error('No se pudo cargar el motor de fondos. Tu cámara sigue disponible sin efecto.'));};
                    worker.onmessage=({data})=>{if(data.tipo==='listo'){clearTimeout(limite);resolver();}else if(data.tipo==='error'){clearTimeout(limite);rechazar(new Error(data.mensaje));}};
                    worker.postMessage({tipo:'iniciar'});
                });
            }catch(e){worker.terminate();this.trabajador=null;throw e;}
            worker.onmessage=({data})=>{
                if(data.epoca!==this.generacion)return;
                this.ocupado=false;clearTimeout(this.esperaMascara);
                if(data.tipo==='error'){this.fallar(new Error(data.mensaje));return;}
                if(data.tipo!=='mascara'||!this.activa)return;
                const m=this.mascara;m.width=data.ancho;m.height=data.alto;
                const pix=m.getContext('2d').createImageData(m.width,m.height);
                for(let i=0;i<data.valores.length;i++){const p=i*4;pix.data[p]=255;pix.data[p+1]=255;pix.data[p+2]=255;pix.data[p+3]=Math.round(Math.max(0,Math.min(1,(data.valores[i]-.25)/.5))*255);}
                m.getContext('2d').putImageData(pix,0,0);this.tieneMascara=true;
            };
            worker.onerror=()=>this.fallar(new Error('El motor de fondos se interrumpió. Se recuperó la cámara sin efecto.'));
        }
        async iniciar(pista,modo=this.modo){
            this.detener();this.original=pista;this.modo=modo;
            if(modo==='ninguno'){await this.alCambiar(pista);return;}
            const epoca=++this.generacion;
            await this.preparar();if(epoca!==this.generacion || pista.readyState!=='live')return;
            this.video=document.createElement('video');this.video.muted=true;this.video.playsInline=true;this.video.srcObject=new MediaStream([pista]);
            await this.video.play();if(epoca!==this.generacion){this.video.srcObject=null;return;}
            this.canvas=document.createElement('canvas');this.canvas.width=640;this.canvas.height=360;
            this.mascara=document.createElement('canvas');this.persona=document.createElement('canvas');this.persona.width=640;this.persona.height=360;
            this.reducido=document.createElement('canvas');this.reducido.width=256;this.reducido.height=144;
            this.activa=true;this.ocupado=false;this.tieneMascara=false;this.dibujar();
            this.flujo=this.canvas.captureStream(20);this.pista=this.flujo.getVideoTracks()[0];this.pista.enabled=pista.enabled;
            await this.alCambiar(this.pista);this.ciclo(epoca);
        }
        dibujar(){
            const c=this.canvas.getContext('2d'),w=this.canvas.width,h=this.canvas.height;c.clearRect(0,0,w,h);
            // Nunca transmitir el cuarto antes de que el modelo entregue su primera máscara.
            if(this.modo==='desenfoque'){c.filter='blur(18px)';c.drawImage(this.video,-20,-20,w+40,h+40);c.filter='none';}
            else if(this.modo==='personalizado'&&this.imagen){const escala=Math.max(w/this.imagen.width,h/this.imagen.height);c.drawImage(this.imagen,(w-this.imagen.width*escala)/2,(h-this.imagen.height*escala)/2,this.imagen.width*escala,this.imagen.height*escala);}
            else{const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,this.modo==='bosque'?'#1b4e45':'#102443');g.addColorStop(1,this.modo==='bosque'?'#769572':'#386baa');c.fillStyle=g;c.fillRect(0,0,w,h);if(this.modo==='oficina'){c.fillStyle='#ffffff18';c.fillRect(40,40,180,260);c.fillRect(420,45,150,160);c.fillStyle='#edf4ff';c.font='bold 32px sans-serif';c.fillText('JJM',450,285);c.font='14px sans-serif';c.fillText('Oficina de Proyectos',380,310);}}
            if(!this.tieneMascara || !this.original.enabled)return;
            const p=this.persona.getContext('2d');p.clearRect(0,0,w,h);p.globalCompositeOperation='source-over';p.drawImage(this.video,0,0,w,h);p.globalCompositeOperation='destination-in';p.drawImage(this.mascara,0,0,w,h);p.globalCompositeOperation='source-over';c.drawImage(this.persona,0,0);
        }
        ciclo(epoca){
            if(!this.activa || this.generacion!==epoca)return;
            if(this.original.readyState!=='live'){this.detener();return;}
            this.dibujar();
            if(!this.ocupado && this.original.enabled && this.video.readyState>=2){
                this.ocupado=true;this.reducido.getContext('2d').drawImage(this.video,0,0,256,144);
                createImageBitmap(this.reducido).then(imagen=>{
                    if(!this.activa||this.generacion!==epoca){imagen.close();return;}
                    this.esperaMascara=setTimeout(()=>this.fallar(new Error('El fondo dejó de responder. Se recuperó la cámara sin efecto.')),5000);
                    this.trabajador.postMessage({tipo:'fotograma',epoca,tiempo:performance.now(),imagen},[imagen]);
                }).catch(e=>this.fallar(e));
            }
            this.timer=setTimeout(()=>this.ciclo(epoca),65);
        }
        async cargarImagen(archivo){
            if(!archivo || !['image/jpeg','image/png','image/webp'].includes(archivo.type) || archivo.size>5*1024*1024)throw new Error('Elige JPG, PNG o WebP de hasta 5 MB.');
            const imagen=await createImageBitmap(archivo);if(imagen.width>8192||imagen.height>8192){imagen.close();throw new Error('La imagen es demasiado grande. Máximo 8192 píxeles por lado.');}
            this.imagen?.close();this.imagen=imagen;
        }
        fallar(error){const original=this.original;this.detener();this.trabajador?.terminate();this.trabajador=null;this.modo='ninguno';this.alCambiar(original?.readyState==='live'?original:null).catch(()=>{});this.alError(error);}
        detener(){++this.generacion;this.activa=false;clearTimeout(this.timer);clearTimeout(this.esperaMascara);this.pista?.stop();this.pista=null;this.flujo=null;if(this.video){this.video.pause();this.video.srcObject=null;}}
        cerrar(){this.detener();this.trabajador?.terminate();this.trabajador=null;this.imagen?.close();this.imagen=null;}
    }
    window.PMOFondosSala=FondosSala;
})();
