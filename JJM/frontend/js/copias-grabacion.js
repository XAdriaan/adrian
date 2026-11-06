(() => {
    'use strict';
    function cuenta() {
        const u = JSON.parse(localStorage.getItem('usuarioActivo') || '{}');
        const id = u?.id || u?.idUsuario || u?.id_usuario;
        if (!id || !localStorage.getItem('sesionTokenPMO')) throw Error('Inicia sesión para ver tus copias.');
        return String(id);
    }
    let conexion;
    function base() {
        if (!conexion) conexion = new Promise((resolve,reject) => {
            const abrir = indexedDB.open('jjm-videos-locales', 1);
            abrir.onupgradeneeded = () => {
                abrir.result.createObjectStore('fichas',{keyPath:'id'}).createIndex('usuario','usuario');
                abrir.result.createObjectStore('videos');
            };
            abrir.onsuccess = () => resolve(abrir.result);
            abrir.onerror = () => reject(abrir.error);
        }).catch(e => { conexion = null; throw e; });
        return conexion;
    }
    async function guardar(archivo) {
        const usuario = cuenta(), db = await base();
        const {blob,...meta} = archivo;
        await new Promise((resolve,reject) => {
            const tx = db.transaction(['videos','fichas'],'readwrite');
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error);
            tx.objectStore('fichas').put({...meta,usuario});
            tx.objectStore('videos').put(blob,meta.id);
        });
        await mostrar(document.querySelector('[data-grabaciones-sala]')?.dataset.grabacionesSala || '');
    }
    function resultado(peticion) {
        return new Promise((resolve,reject) => {
            peticion.onsuccess = () => resolve(peticion.result);
            peticion.onerror = () => reject(peticion.error);
        });
    }
    async function mostrar(sala) {
        const cont = document.getElementById('copiasGrabacion');
        if (!cont) return;
        try {
            const usuario = cuenta(), db = await base();
            const fichas = await resultado(db.transaction('fichas').objectStore('fichas').index('usuario').getAll(usuario));
            if (cuenta() !== usuario) return;
            cont.replaceChildren();
            const lista = fichas.filter(f => !sala || f.sala === sala).sort((a,b) => b.fecha-a.fecha);
            if (!lista.length) return;
            const titulo = document.createElement('h3');
            titulo.textContent = 'Guardadas en este navegador';
            cont.append(titulo);
            for (const f of lista) {
                const fila = document.createElement('article'), nombre = document.createElement('strong');
                fila.className = 'grabacion-card';
                nombre.textContent = f.titulo + ' · ' + new Date(f.fecha).toLocaleString('es-MX');
                fila.append(nombre);
                const accion = (etiqueta, ejecutar) => {
                    const boton = document.createElement('button');
                    boton.type = 'button'; boton.className = 'pmo-button secondary'; boton.textContent = etiqueta;
                    boton.onclick = async () => {
                        boton.disabled = true;
                        try {
                            if (cuenta() !== usuario) return;
                            const blob = await resultado(db.transaction('videos').objectStore('videos').get(f.id));
                            if (cuenta() !== usuario || !blob) throw Error('Copia local no disponible.');
                            await ejecutar(blob);
                        } catch(e) { document.getElementById('avisoGrabaciones').hidden=false; document.getElementById('avisoGrabaciones').textContent=e.message; }
                        finally { boton.disabled = false; }
                    };
                    fila.append(boton);
                };
                accion('Ver copia', blob => {
                    const dialog = document.createElement('dialog'), video = document.createElement('video'), cerrar = document.createElement('button');
                    const url = URL.createObjectURL(blob);
                    dialog.className='grabacion-dialog'; video.controls=true; video.playsInline=true; video.src=url;
                    cerrar.textContent='Cerrar'; cerrar.onclick=()=>dialog.close();
                    dialog.onclose=()=>{video.pause(); URL.revokeObjectURL(url); dialog.remove();};
                    dialog.append(cerrar,video); document.body.append(dialog); dialog.showModal();
                });
                accion('Descargar', blob => {
                    const a=document.createElement('a'),url=URL.createObjectURL(blob);
                    a.href=url; a.download=f.nombre; a.click(); setTimeout(()=>URL.revokeObjectURL(url),60000);
                });
                accion('Guardar en servidor',async blob => {
                    await window.PMOGrabaciones.subir(blob,f);
                    await window.PMOGrabaciones.cargar();
                });
                cont.append(fila);
            }
        } catch(e) { cont.textContent = 'Copias de este navegador no disponibles.'; }
    }
    window.PMOCopias={guardar,mostrar};
})();