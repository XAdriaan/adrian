const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const codigo = fs.readFileSync(path.join(__dirname, '../js/widgets-movibles.js'), 'utf8');
function entorno({ storage = new Map(), usuario = 7, ancho = 900, alto = 650, lecturaBloqueada = false, escrituraBloqueada = false } = {}) {
    storage.set('usuarioActivo', JSON.stringify({ id: usuario })); storage.set('sesionTokenPMO', 'token-' + usuario);
    class Eventos {
        constructor() { this.listeners = new Map(); }
        addEventListener(nombre, fn, captura = false) { const lista = this.listeners.get(nombre) || []; lista.push({ fn, captura }); this.listeners.set(nombre, lista); }
        removeEventListener(nombre, fn) { this.listeners.set(nombre, (this.listeners.get(nombre) || []).filter(h => h.fn !== fn)); }
        emitir(nombre, datos = {}) {
            const e = { type: nombre, target: this, detail: 1, ...datos, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.inmediata = true; this.stopped = true; } };
            const lista = [...(this.listeners.get(nombre) || [])].sort((a, b) => Number(!!b.captura) - Number(!!a.captura));
            for (const h of lista) { if (e.inmediata) break; h.fn(e); } return e;
        }
    }
    class El extends Eventos {
        constructor(tipo = 'div') { super(); this.tipo = tipo; this.attrs = new Map(); this.style = {}; this.children = []; this.isConnected = false; }
        append(...nodos) { for (const n of nodos) { n.parent = this; n.isConnected = this.isConnected; this.children.push(n); } }
        getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
        setAttribute(n, v) { this.attrs.set(n, String(v)); }
        removeAttribute(n) { this.attrs.delete(n); if (n === 'style') this.style = {}; }
        remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); }
        setPointerCapture(id) { this.capturado = id; } releasePointerCapture() { this.capturado = null; }
        getBoundingClientRect() {
            const n = v => Number.parseFloat(v), c = this.tipo === 'button' ? this.parent : this;
            const left = Number.isFinite(n(c.style.left)) ? n(c.style.left) : c.origen?.x || 0;
            const top = Number.isFinite(n(c.style.top)) ? n(c.style.top) : c.origen?.y || 0;
            const width = Math.min(this.ancho || 120, Number.isFinite(n(this.style.maxWidth)) ? n(this.style.maxWidth) : Infinity);
            const height = Math.min(this.alto || 42, Number.isFinite(n(this.style.maxHeight)) ? n(this.style.maxHeight) : Infinity);
            return { left, top, width, height, right: left + width, bottom: top + height };
        }
    }
    const window = new Eventos(); window.innerWidth = ancho; window.innerHeight = alto;
    window.visualViewport = new Eventos(); Object.assign(window.visualViewport, { width: ancho, height: alto, offsetLeft: 0, offsetTop: 0 });
    const body = new El(); body.isConnected = true;
    const document = { body, documentElement: { clientWidth: ancho, clientHeight: alto }, createElement: tipo => new El(tipo) };
    const observadores = [];
    class Observador { constructor(fn) { this.fn = fn; this.nodos = []; observadores.push(this); } observe(n) { this.nodos.push(n); } disconnect() { this.desconectado = true; } }
    const localStorage = { getItem(k) { if (lecturaBloqueada && k.startsWith('pmo-widget')) throw Error('Bloqueado'); return storage.get(k) ?? null; },
        setItem(k, v) { if (escrituraBloqueada && k.startsWith('pmo-widget')) throw Error('Sin espacio'); storage.set(k, String(v)); }, removeItem: k => storage.delete(k) };
    const contexto = vm.createContext({ window, document, localStorage, MutationObserver: Observador, ResizeObserver: Observador, Date, console });
    const cargar = () => vm.runInContext(codigo, contexto);
    function widget(id = 'ardia', x = 750, y = 590) {
        const capa = new El(), boton = new El('button'), panel = new El('section'); capa.origen = { x, y }; boton.ancho = 120; boton.alto = 42;
        panel.ancho = 390; panel.alto = 510; panel.hidden = true; capa.append(boton, panel); body.append(capa); boton.isConnected = panel.isConnected = true;
        let clicks = 0; boton.addEventListener('click', () => { clicks++; panel.hidden = !panel.hidden; capa.__pmoMovible?.actualizar(); });
        return { id, capa, boton, panel, idUsuario: usuario, clicks: () => clicks };
    }
    return { window, storage, localStorage, observadores, widget, cargar };
}
function arrastrar(w, dx, dy, tipo = 'mouse', cancelar = false) {
    const r = w.boton.getBoundingClientRect(); const p = { pointerId: 1, pointerType: tipo, clientX: r.left + 8, clientY: r.top + 8, button: 0, isPrimary: true };
    w.boton.emitir('pointerdown', p); w.boton.emitir('pointermove', { ...p, clientX: p.clientX + dx, clientY: p.clientY + dy });
    w.boton.emitir(cancelar ? 'pointercancel' : 'pointerup', { ...p, clientX: p.clientX + dx, clientY: p.clientY + dy });
}
function dentro(w, e) {
    const p = w.panel.getBoundingClientRect(), v = e.window.visualViewport;
    assert.ok(p.left >= v.offsetLeft + 8, 'borde izquierdo'); assert.ok(p.top >= v.offsetTop + 8, 'borde superior');
    assert.ok(p.right <= v.offsetLeft + v.width - 8, 'borde derecho'); assert.ok(p.bottom <= v.offsetTop + v.height - 8, 'borde inferior');
}
test('mouse mueve y guarda, el click del drag no abre y el siguiente click normal sí', () => {
    const e = entorno(); e.cargar(); const w = e.widget(); e.window.PMOWidgetsMovibles.vincular(w);
    arrastrar(w, -200, -100); const p = JSON.parse(e.storage.get('pmo-widget-pos:v1:7:ardia'));
    assert.equal(p.x, 550); assert.equal(p.y, 490); assert.equal(w.boton.capturado, null);
    const click = w.boton.emitir('click'); assert.equal(click.defaultPrevented, true); assert.equal(w.clicks(), 0);
    arrastrar(w, 0, 0); w.boton.emitir('click'); assert.equal(w.clicks(), 1); assert.equal(w.panel.hidden, false); dentro(w, e);
});
test('touch y movimiento mínimo conservan el click y no guardan una posición accidental', () => {
    const e = entorno(); e.cargar(); const w = e.widget(); e.window.PMOWidgetsMovibles.vincular(w);
    arrastrar(w, 3, 2, 'touch'); w.boton.emitir('click'); assert.equal(w.clicks(), 1); assert.equal(e.storage.has('pmo-widget-pos:v1:7:ardia'), false);
    arrastrar(w, -120, -60, 'touch'); assert.equal(JSON.parse(e.storage.get('pmo-widget-pos:v1:7:ardia')).x, 630);
});
test('ambos paneles permanecen dentro del viewport en las cuatro esquinas y pantalla pequeña', () => {
    for (const id of ['ardia', 'avisos']) for (const [x, y] of [[0, 0], [900, 0], [0, 700], [900, 700]]) {
        const e = entorno({ ancho: 280, alto: 360 }); e.cargar(); const w = e.widget(id, x, y); e.window.PMOWidgetsMovibles.vincular(w);
        w.boton.emitir('click'); dentro(w, e); const b = w.boton.getBoundingClientRect(); assert.ok(b.right <= 272); assert.ok(b.bottom <= 352);
    }
});
test('resize, teclado virtual y zoom visual limitan botón y panel sin perderlos', () => {
    const e = entorno(); e.cargar(); const w = e.widget(); e.window.PMOWidgetsMovibles.vincular(w); w.boton.emitir('click');
    Object.assign(e.window.visualViewport, { width: 250, height: 300, offsetLeft: 70, offsetTop: 35 });
    e.window.visualViewport.emitir('resize'); dentro(w, e); const b = w.boton.getBoundingClientRect(); assert.ok(b.right <= 312); assert.ok(b.bottom <= 327);
    e.window.emitir('resize'); dentro(w, e);
});
test('posición persiste al cargar otra página y cada usuario/widget tiene su propia preferencia', () => {
    const e = entorno(); e.cargar(); const w = e.widget(); e.window.PMOWidgetsMovibles.vincular(w); arrastrar(w, -200, -100);
    const nueva = entorno({ storage: e.storage }); nueva.cargar(); const mismo = nueva.widget(); nueva.window.PMOWidgetsMovibles.vincular(mismo);
    assert.equal(mismo.boton.getBoundingClientRect().left, 550);
    const avisos = nueva.widget('avisos', 300, 80); nueva.window.PMOWidgetsMovibles.vincular(avisos); assert.equal(avisos.boton.getBoundingClientRect().left, 300);
    const otra = entorno({ storage: e.storage, usuario: 8 }); otra.cargar(); const ajeno = otra.widget(); otra.window.PMOWidgetsMovibles.vincular(ajeno);
    assert.equal(ajeno.boton.getBoundingClientRect().left, 750); assert.equal(otra.storage.has('pmo-widget-pos:v1:8:ardia'), false);
});
test('Alt+flechas mueve, Alt+Inicio restaura y Ctrl+K/Escape permanecen disponibles', () => {
    const e = entorno(); e.cargar(); const w = e.widget(); e.window.PMOWidgetsMovibles.vincular(w);
    assert.equal(w.boton.emitir('keydown', { key: 'ArrowLeft', altKey: true }).defaultPrevented, true); assert.equal(w.boton.getBoundingClientRect().left, 740);
    assert.equal(w.boton.emitir('keydown', { key: 'k', ctrlKey: true }).defaultPrevented, undefined); assert.equal(w.boton.emitir('keydown', { key: 'Escape' }).defaultPrevented, undefined);
    w.boton.emitir('keydown', { key: 'Home', altKey: true }); assert.equal(w.boton.getBoundingClientRect().left, 750); assert.equal(e.storage.has('pmo-widget-pos:v1:7:ardia'), false);
});
test('cancelar arrastre vuelve al punto inicial y no escribe preferencias', () => {
    const e = entorno(); e.cargar(); const w = e.widget(); e.window.PMOWidgetsMovibles.vincular(w); arrastrar(w, -100, -80, 'touch', true);
    assert.equal(w.boton.getBoundingClientRect().left, 750); assert.equal(e.storage.has('pmo-widget-pos:v1:7:ardia'), false);
});
test('datos inválidos y storage bloqueado permiten mover sin romper el widget', () => {
    for (const valor of ['{', '{"x":"20","y":40}', '{"x":null,"y":-20}']) {
        const storage = new Map([['pmo-widget-pos:v1:7:ardia', valor]]), e = entorno({ storage }); e.cargar(); const w = e.widget();
        assert.doesNotThrow(() => e.window.PMOWidgetsMovibles.vincular(w)); assert.equal(w.boton.getBoundingClientRect().left, 750);
    }
    const e = entorno({ lecturaBloqueada: true, escrituraBloqueada: true }); e.cargar(); const w = e.widget();
    assert.doesNotThrow(() => { e.window.PMOWidgetsMovibles.vincular(w); arrastrar(w, -200, -100); }); assert.equal(w.boton.getBoundingClientRect().left, 550);
    assert.equal(w.capa.children.at(-1).textContent, 'Ubicación ajustada durante esta página.');
});
test('helper tardío consume montajes pendientes y eventos async una sola vez', () => {
    const e = entorno(), w = e.widget(), eliminado = e.widget('avisos'); eliminado.capa.remove();
    e.window.PMOWidgetsMoviblesPendientes = [w, eliminado]; e.cargar(); assert.ok(w.capa.__pmoMovible); assert.equal(eliminado.capa.__pmoMovible, undefined);
    assert.equal(e.window.PMOWidgetsMoviblesPendientes.length, 0); const n = w.capa.children.length;
    e.window.emitir('pmo:widget-montado', { detail: w }); assert.equal(w.capa.children.length, n);
    const nuevo = e.widget('avisos'); e.window.emitir('pmo:widget-montado', { detail: nuevo }); assert.ok(nuevo.capa.__pmoMovible);
});
test('cambio de usuario y logout desconectan observadores/listeners y conservan preferencias del dueño', () => {
    const e = entorno(); e.cargar(); const w = e.widget(); e.window.PMOWidgetsMovibles.vincular(w); arrastrar(w, -200, -100);
    const guardada = e.storage.get('pmo-widget-pos:v1:7:ardia'); e.storage.set('usuarioActivo', JSON.stringify({ id: 8 })); e.storage.set('sesionTokenPMO', 'token-8');
    e.window.emitir('storage', { key: 'usuarioActivo' }); assert.equal(w.capa.__pmoMovible, undefined); assert.equal(w.capa.hidden, true);
    assert.equal(w.boton.listeners.get('pointerdown').length, 0); assert.ok(e.observadores.every(o => o.desconectado)); assert.equal(e.storage.get('pmo-widget-pos:v1:7:ardia'), guardada);
    const otro = e.widget('avisos'); otro.idUsuario = 8; e.window.PMOWidgetsMovibles.vincular(otro); e.window.emitir('pmo:sesion-cerrada');
    assert.equal(otro.capa.__pmoMovible, undefined); assert.equal(otro.panel.hidden, true); assert.equal(otro.boton.attrs.get('aria-expanded'), 'false');
});
test('sesión cambia durante arrastre y no guarda bajo otra identidad', () => {
    const e = entorno(); e.cargar(); const w = e.widget(); e.window.PMOWidgetsMovibles.vincular(w);
    w.boton.emitir('pointerdown', { pointerId: 1, clientX: 760, clientY: 600 });
    e.storage.set('sesionTokenPMO', 'otra'); w.boton.emitir('pointermove', { pointerId: 1, clientX: 500, clientY: 300 });
    assert.equal(w.capa.__pmoMovible, undefined); assert.equal(e.storage.has('pmo-widget-pos:v1:7:ardia'), false);
});
test('quitar un widget del DOM libera la captura y limpia su enlace al actualizar', () => {
    const e = entorno(); e.cargar(); const w = e.widget(); e.window.PMOWidgetsMovibles.vincular(w);
    w.boton.emitir('pointerdown', { pointerId: 1, clientX: 760, clientY: 600 }); w.capa.remove(); e.window.emitir('resize');
    assert.equal(w.boton.capturado, null); assert.equal(w.capa.__pmoMovible, undefined); assert.ok(e.observadores.every(o => o.desconectado));
});
