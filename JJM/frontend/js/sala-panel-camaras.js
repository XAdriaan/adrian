(() => {
    'use strict';
    const distribucion = document.querySelector('.sala-distribucion');
    const panel = document.querySelector('.sala-alumnos');
    if (!distribucion || !panel) return;
    const clave = 'jjm.panel-camaras.v1';
    const posiciones = ['derecha', 'izquierda', 'arriba', 'abajo'];
    let preferencia = { posicion: 'derecha', tamano: 210 };
    try {
        const guardada = JSON.parse(localStorage.getItem(clave));
        if (posiciones.includes(guardada?.posicion)) preferencia.posicion = guardada.posicion;
        if (Number.isFinite(guardada?.tamano)) preferencia.tamano = Math.max(140, Math.min(360, guardada.tamano));
    } catch (_) { /* El panel también funciona cuando el almacenamiento no está disponible. */ }
    const opciones = document.createElement('details');
    opciones.className = 'camaras-preferencias';
    const resumen = document.createElement('summary');
    resumen.textContent = 'Mover cámaras';
    const formulario = document.createElement('div');
    const etiqueta = document.createElement('label');
    etiqueta.textContent = 'Posición';
    const selector = document.createElement('select');
    for (const posicion of posiciones) {
        const opcion = document.createElement('option');
        opcion.value = posicion;
        opcion.textContent = posicion[0].toUpperCase() + posicion.slice(1);
        selector.append(opcion);
    }
    selector.value = preferencia.posicion;
    etiqueta.append(selector);
    const medida = document.createElement('label');
    medida.textContent = 'Tamaño de las cámaras';
    const rango = document.createElement('input');
    rango.type = 'range'; rango.min = '140'; rango.max = '360'; rango.step = '10';
    rango.value = String(preferencia.tamano);
    medida.append(rango);
    const restaurar = document.createElement('button');
    restaurar.type = 'button'; restaurar.textContent = 'Restablecer';
    formulario.append(etiqueta, medida, restaurar);
    const dialogo = document.createElement('dialog');
    dialogo.className = 'camaras-dialogo';
    dialogo.setAttribute('aria-label', 'Organizar cámaras');
    const cerrar = document.createElement('button');
    cerrar.type = 'button'; cerrar.textContent = 'Cerrar';
    dialogo.append(formulario, cerrar);
    document.body.append(dialogo);
    resumen.addEventListener('click', e => { e.preventDefault(); dialogo.showModal(); });
    cerrar.addEventListener('click', () => dialogo.close());
    dialogo.addEventListener('close', () => resumen.focus());
    opciones.append(resumen);
    panel.insertBefore(opciones, panel.firstChild);
    function aplicar() {
        distribucion.dataset.camaras = preferencia.posicion;
        distribucion.style.setProperty('--ancho-camaras', preferencia.tamano + 'px');
        distribucion.style.setProperty('--alto-camaras', Math.round(preferencia.tamano * .65) + 'px');
        try { localStorage.setItem(clave, JSON.stringify(preferencia)); } catch (_) {}
    }
    selector.addEventListener('change', () => { preferencia.posicion = selector.value; aplicar(); });
    rango.addEventListener('input', () => { preferencia.tamano = Number(rango.value); aplicar(); });
    restaurar.addEventListener('click', () => {
        preferencia = { posicion: 'derecha', tamano: 210 };
        selector.value = preferencia.posicion; rango.value = String(preferencia.tamano); aplicar();
    });
    // Sólo cambia la distribución CSS: los videos y sus conexiones conservan sus nodos.
    aplicar();
})();
