(function(){
    'use strict';
    const clave='pmo-microfono-preferido';
    function elegido(){try{return localStorage.getItem(clave)||'';}catch(_){return '';}}
    function elegir(id){try{localStorage.setItem(clave,id||'');}catch(_){}}
    async function dispositivos(){return navigator.mediaDevices?.enumerateDevices?(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput'):[];}
    function mensaje(e){
        if(['NotAllowedError','SecurityError'].includes(e?.name))return 'Permite el micrófono en el candado del navegador. En Windows, revisa Configuración → Privacidad y seguridad → Micrófono y permite el acceso a aplicaciones de escritorio.';
        if(e?.name==='NotFoundError')return 'El navegador no detecta una entrada de audio. En Windows abre Configuración → Sistema → Sonido → Entrada, selecciona tu micrófono y prueba que reciba sonido. Después pulsa Buscar micrófonos y Probar. Si no aparece allí, conecta o habilita el dispositivo.';
        if(['NotReadableError','AbortError'].includes(e?.name))return 'Windows no pudo abrir el micrófono. Cierra otras aplicaciones que lo estén usando y comprueba Sonido → Entrada y los permisos de micrófono.';
        if(e?.name==='TimeoutError')return 'Terminó la espera del micrófono. Revisa el permiso del navegador y pulsa Probar de nuevo.';
        return e?.message||'No se pudo abrir el micrófono.';
    }
    async function obtener(id=elegido()){
        if(!navigator.mediaDevices?.getUserMedia)throw Error('Abre la plataforma con HTTPS en Edge o Chrome para utilizar el micrófono.');
        let vencido=false,timer;
        const pedir=async audio=>{const s=await navigator.mediaDevices.getUserMedia({audio,video:false});if(vencido){s.getTracks().forEach(t=>t.stop());throw Object.assign(Error('Permiso tardío.'),{name:'TimeoutError'});}if(!s.getAudioTracks().length){s.getTracks().forEach(t=>t.stop());throw Object.assign(Error('Sin pista de audio.'),{name:'NotFoundError'});}return s;};
        const trabajo=(async()=>{
            try{return await pedir({...(id?{deviceId:{exact:id}}:{}),echoCancellation:true,noiseSuppression:true,autoGainControl:true});}
            catch(e){if(vencido||!['OverconstrainedError','NotFoundError'].includes(e.name))throw e;
                try{const s=await pedir(true);elegir('');return s;}
                catch(otro){if(vencido||!['NotFoundError','OverconstrainedError'].includes(otro.name))throw otro;const ds=await dispositivos();const alternativa=ds.find(d=>d.deviceId&&d.deviceId!==id&&d.deviceId!=='default');if(!alternativa)throw otro;if(vencido)throw Object.assign(Error("Prueba terminada."),{name:"TimeoutError"});const s=await pedir({deviceId:{exact:alternativa.deviceId}});elegir(alternativa.deviceId);return s;}
            }
        })();
        try{return await Promise.race([trabajo,new Promise((_,reject)=>{timer=setTimeout(()=>{vencido=true;reject(Object.assign(Error('El permiso tardó demasiado.'),{name:'TimeoutError'}));},20000);})]);}finally{clearTimeout(timer);}
    }
    async function llenar(selector,idActual){if(!selector?.replaceChildren)return;const ds=await dispositivos(),id=idActual||selector.value||elegido();selector.replaceChildren();const porDefecto=document.createElement('option');porDefecto.value='';porDefecto.textContent='Micrófono predeterminado';selector.append(porDefecto);ds.forEach((d,i)=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||`Micrófono ${i+1}`;selector.append(o);});if(ds.some(d=>d.deviceId===id))selector.value=id;return ds;}
    async function nivel(pista,alNivel){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('La prueba de nivel no está disponible.');const c=new AC();try{await c.resume();const fuente=c.createMediaStreamSource(new MediaStream([pista])),a=c.createAnalyser();a.fftSize=512;fuente.connect(a);const datos=new Uint8Array(512);const timer=setInterval(()=>{a.getByteTimeDomainData(datos);const rms=Math.sqrt(datos.reduce((s,v)=>s+((v-128)/128)**2,0)/datos.length);alNivel(Math.min(100,Math.round(rms*450)));},100);return ()=>{clearInterval(timer);fuente.disconnect();c.close().catch(()=>{});};}catch(e){c.close().catch(()=>{});throw e;}}
    window.PMOMicrofono={obtener,dispositivos,elegido,elegir,mensaje,llenar,nivel};
})();
