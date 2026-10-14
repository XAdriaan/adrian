(() => {
    'use strict';
    if (window.PMOWidgetsMovibles) return;
    const enlaces = new Map(), margen = 8;
    const limitar = (valor, min, max) => Math.min(Math.max(valor, min), Math.max(min, max));
    function cuenta() {
        try { return JSON.parse(localStorage.getItem('usuarioActivo') || 'null'); } catch (_) { return null; }
    }
    function vista() {
        const v = window.visualViewport;
        return { x: v?.offsetLeft || 0, y: v?.offsetTop || 0,
            ancho: v?.width || window.innerWidth || document.documentElement.clientWidth,
            alto: v?.height || window.innerHeight || document.documentElement.clientHeight };
    }
    function vincular({ id, capa, boton, panel, idUsuario } = {}) {
        if (!id || !capa || !boton || !panel || capa.isConnected === false) return null;
        if (enlaces.has(capa)) return enlaces.get(capa);
        const usuario = String(idUsuario ?? cuenta()?.id ?? ''), token = localStorage.getItem('sesionTokenPMO');
        if (!usuario || !token || String(cuenta()?.id ?? '') !== usuario) return null;
        const clave = `pmo-widget-pos:v1:${encodeURIComponent(usuario)}:${id}`;
        const estilos = [capa.getAttribute('style'), boton.getAttribute('style'), panel.getAttribute('style')];
        const titulo = boton.getAttribute('title'), descripcion = boton.getAttribute('aria-describedby');
        const ayuda = document.createElement('span');
        ayuda.id = `pmo-widget-ayuda-${id}`; ayuda.setAttribute('role', 'status'); ayuda.setAttribute('aria-live', 'polite');
        ayuda.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
        ayuda.textContent = 'Arrastra para mover. La ubicación se guarda para tu usuario. Alt + flechas para mover; Alt + Inicio para restaurar.';
        capa.append(ayuda); boton.title = ayuda.textContent;
        boton.setAttribute('aria-describedby', [descripcion, ayuda.id].filter(Boolean).join(' '));
        boton.style.touchAction = 'none'; boton.style.userSelect = 'none'; boton.style.cursor = 'grab';
        panel.style.position = 'fixed'; panel.style.right = 'auto'; panel.style.bottom = 'auto';
        panel.style.margin = '0'; panel.style.boxSizing = 'border-box'; panel.style.overflowY = 'auto';
        let posicion = null, inicio = null, suprimirClick = false, hasta = 0, destruido = false;
        const vigente = () => !destruido && capa.isConnected !== false && localStorage.getItem('sesionTokenPMO') === token && String(cuenta()?.id ?? '') === usuario;
        function ajustarPanel() {
            if (panel.hidden || !vigente()) return;
            const v = vista(), b = boton.getBoundingClientRect();
            const debajo = Math.max(0, v.y + v.alto - margen - b.bottom - margen);
            const arriba = Math.max(0, b.top - margen - v.y - margen);
            panel.style.maxWidth = `${Math.max(0, v.ancho - 2 * margen)}px`;
            panel.style.maxHeight = `${Math.max(40, Math.max(debajo, arriba))}px`;
            const p = panel.getBoundingClientRect();
            const x = limitar(b.right - p.width, v.x + margen, v.x + v.ancho - p.width - margen);
            const y = limitar(debajo >= p.height || debajo >= arriba ? b.bottom + margen : b.top - p.height - margen,
                v.y + margen, v.y + v.alto - p.height - margen);
            panel.style.left = `${Math.round(x)}px`; panel.style.top = `${Math.round(y)}px`;
        }
        function mover(x, y) {
            const v = vista(), b = boton.getBoundingClientRect();
            posicion = { x: limitar(x, v.x + margen, v.x + v.ancho - b.width - margen),
                y: limitar(y, v.y + margen, v.y + v.alto - b.height - margen) };
            capa.style.left = `${Math.round(posicion.x)}px`; capa.style.top = `${Math.round(posicion.y)}px`;
            capa.style.right = 'auto'; capa.style.bottom = 'auto'; capa.style.width = 'max-content';
            ajustarPanel();
        }
        function guardar() {
            if (!vigente() || !posicion) return;
            try { localStorage.setItem(clave, JSON.stringify(posicion)); ayuda.textContent = 'Ubicación guardada para tu usuario.'; } catch (_) { ayuda.textContent = 'Ubicación ajustada durante esta página.'; }
        }
        function actualizar() {
            if (!vigente()) { destruir(); capa.hidden = true; return; }
            const b = boton.getBoundingClientRect();
            mover(posicion?.x ?? b.left, posicion?.y ?? b.top);
        }
        function restaurar() {
            try { localStorage.removeItem(clave); } catch (_) {}
            if (estilos[0] === null) capa.removeAttribute('style'); else capa.setAttribute('style', estilos[0]);
            posicion = null; actualizar(); ayuda.textContent = 'Ubicación inicial restaurada.';
        }
        function empezar(e) {
            if (!vigente()) { destruir(); capa.hidden = true; return; }
            if (e.isPrimary === false || (e.button !== undefined && e.button !== 0)) return;
            suprimirClick = false;
            const b = boton.getBoundingClientRect();
            inicio = { puntero: e.pointerId, x: e.clientX, y: e.clientY, izquierda: b.left, arriba: b.top, arrastrando: false };
            try { boton.setPointerCapture(e.pointerId); } catch (_) {}
        }
        function arrastrar(e) {
            if (!inicio || inicio.puntero !== e.pointerId) return;
            if (!vigente()) { destruir(); return; }
            const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y;
            if (!inicio.arrastrando && Math.hypot(dx, dy) < (e.pointerType === 'touch' ? 9 : 6)) return;
            inicio.arrastrando = true; e.preventDefault(); boton.style.cursor = 'grabbing';
            mover(inicio.izquierda + dx, inicio.arriba + dy);
        }
        function terminar(e) {
            if (!inicio || inicio.puntero !== e.pointerId) return;
            const anterior = inicio; inicio = null; boton.style.cursor = 'grab';
            if (anterior.arrastrando) {
                suprimirClick = true; hasta = Date.now() + 500;
                if (e.type === 'pointercancel') mover(anterior.izquierda, anterior.arriba); else guardar();
            }
            try { boton.releasePointerCapture(e.pointerId); } catch (_) {}
        }
        function click(e) {
            if (!vigente()) { destruir(); capa.hidden = true; e.preventDefault(); e.stopImmediatePropagation(); return; }
            if (suprimirClick && Date.now() < hasta && e.detail !== 0) { e.preventDefault(); e.stopImmediatePropagation(); }
            suprimirClick = false;
        }
        function teclado(e) {
            if (!e.altKey || e.ctrlKey || e.metaKey || !vigente()) return;
            const direcciones = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
            if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); restaurar(); return; }
            const d = direcciones[e.key]; if (!d) return;
            e.preventDefault(); e.stopPropagation(); const b = boton.getBoundingClientRect(), paso = e.shiftKey ? 40 : 10;
            mover(b.left + d[0] * paso, b.top + d[1] * paso); guardar();
        }
        function destruir() {
            if (destruido) return; destruido = true;
            try { if (inicio) boton.releasePointerCapture(inicio.puntero); } catch (_) {} inicio = null;
            boton.removeEventListener('pointerdown', empezar); boton.removeEventListener('pointermove', arrastrar);
            boton.removeEventListener('pointerup', terminar); boton.removeEventListener('pointercancel', terminar);
            boton.removeEventListener('click', click, true); boton.removeEventListener('keydown', teclado);
            observador?.disconnect(); tamanos?.disconnect(); ayuda.remove();
            [capa, boton, panel].forEach((n, i) => estilos[i] === null ? n.removeAttribute('style') : n.setAttribute('style', estilos[i]));
            if (titulo === null) boton.removeAttribute('title'); else boton.setAttribute('title', titulo);
            if (descripcion === null) boton.removeAttribute('aria-describedby'); else boton.setAttribute('aria-describedby', descripcion);
            panel.hidden = true; boton.setAttribute('aria-expanded', 'false'); enlaces.delete(capa); delete capa.__pmoMovible;
        }
        boton.addEventListener('pointerdown', empezar); boton.addEventListener('pointermove', arrastrar);
        boton.addEventListener('pointerup', terminar); boton.addEventListener('pointercancel', terminar);
        boton.addEventListener('click', click, true); boton.addEventListener('keydown', teclado);
        const observador = typeof MutationObserver === 'function' ? new MutationObserver(ajustarPanel) : null;
        observador?.observe(panel, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true, characterData: true });
        const tamanos = typeof ResizeObserver === 'function' ? new ResizeObserver(actualizar) : null;
        tamanos?.observe(boton); tamanos?.observe(panel);
        const control = { actualizar, restaurar, destruir }; enlaces.set(capa, control); capa.__pmoMovible = control;
        try {
            const guardada = JSON.parse(localStorage.getItem(clave) || 'null');
            if (Number.isFinite(guardada?.x) && Number.isFinite(guardada?.y)) posicion = guardada;
        } catch (_) {}
        actualizar(); return control;
    }
    function actualizarTodo() { for (const control of [...enlaces.values()]) control.actualizar(); }
    function cerrarSesion() { for (const control of [...enlaces.values()]) control.destruir(); }
    function montarPendientes() {
        const pendientes = window.PMOWidgetsMoviblesPendientes || []; window.PMOWidgetsMoviblesPendientes = [];
        for (const opciones of pendientes) vincular(opciones);
    }
    window.PMOWidgetsMovibles = { vincular, montarPendientes };
    window.addEventListener('resize', actualizarTodo); window.visualViewport?.addEventListener('resize', actualizarTodo);
    window.visualViewport?.addEventListener('scroll', actualizarTodo);
    window.addEventListener('storage', e => { if (e.key === null || e.key === 'usuarioActivo' || e.key === 'sesionTokenPMO') actualizarTodo(); });
    window.addEventListener('pmo:sesion-cerrada', cerrarSesion); window.addEventListener('pagehide', cerrarSesion);
    window.addEventListener('pmo:widget-montado', e => vincular(e.detail));
    montarPendientes();
})();
