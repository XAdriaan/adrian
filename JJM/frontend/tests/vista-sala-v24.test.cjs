const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const fuente = fs.readFileSync(path.join(__dirname, '../js/sala-experiencia.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../reunion.html'), 'utf8');
function cerca(actual, esperado) { assert.ok(Math.abs(actual - esperado) < .01, `${actual} debe ser ${esperado}`); }
function entorno({ ancho = 1000, alto = 600, videoAncho = 1920, videoAlto = 1080, fallaCompleta = false } = {}) {
    class Eventos {
        constructor() { this.listeners = new Map(); }
        addEventListener(nombre, fn) { const lista = this.listeners.get(nombre) || []; lista.push(fn); this.listeners.set(nombre, lista); }
        removeEventListener(nombre, fn) { this.listeners.set(nombre, (this.listeners.get(nombre) || []).filter(f => f !== fn)); }
        emitir(nombre, datos = {}) { return Promise.all((this.listeners.get(nombre) || []).map(fn => fn({ target: this, type: nombre, preventDefault() {}, ...datos }))); }
    }
    class El extends Eventos {
        constructor(id = '') {
            super(); this.id = id; this.children = []; this.dataset = {}; this.attrs = new Map(); this.hidden = true;
            this.style = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
            this.clientWidth = ancho; this.clientHeight = alto; this.scrollWidth = ancho; this.scrollHeight = alto; this.scrollLeft = this.scrollTop = 0;
            const clases = new Set(); this.classList = { add: k => clases.add(k), remove: k => clases.delete(k), contains: k => clases.has(k), toggle(k, estado) { const poner = estado ?? !clases.has(k); poner ? clases.add(k) : clases.delete(k); return poner; } };
        }
        setAttribute(k, v) { this.attrs.set(k, String(v)); } getAttribute(k) { return this.attrs.get(k) ?? null; }
        append(...nodos) { this.children.push(...nodos); } focus() {} play() { return Promise.resolve(); }
        click() { return this.emitir('click'); }
        getBoundingClientRect() { const width = Number.parseFloat(this.style.width) || this.clientWidth, height = Number.parseFloat(this.style.height) || this.clientHeight; return { x: 0, y: 0, left: 0, top: 0, width, height, right: width, bottom: height }; }
        scrollTo(x, y) { if (typeof x === 'object') { this.scrollLeft = x.left ?? this.scrollLeft; this.scrollTop = x.top ?? this.scrollTop; } else { this.scrollLeft = x; this.scrollTop = y; } }
    }
    const elementos = new Map(), el = id => { if (!elementos.has(id)) elementos.set(id, new El(id)); return elementos.get(id); };
    const document = new Eventos(); document.getElementById = el; document.body = new El('body'); document.documentElement = new El('html');
    document.querySelector = () => el('main'); document.querySelectorAll = () => []; document.createElement = tipo => new El(tipo); document.createTextNode = text => ({ textContent: text });
    document.fullscreenElement = null; document.fullscreenEnabled = true;
    const window = new Eventos(); window.innerWidth = ancho; window.innerHeight = alto;
    const cuadros = new Map(), observadores = []; let siguiente = 0, solicitudesCompleta = 0, salidasCompleta = 0, solicitudesMedios = 0;
    const raf = fn => { cuadros.set(++siguiente, fn); return siguiente; }, cancelarRaf = n => cuadros.delete(n);
    window.requestAnimationFrame = raf; window.cancelAnimationFrame = cancelarRaf;
    class Observador { constructor(fn) { this.fn = fn; observadores.push(this); } observe() {} disconnect() { this.desconectado = true; } }
    const video = el('videoPrincipal'); video.videoWidth = videoAncho; video.videoHeight = videoAlto; video.readyState = 4; video.hidden = false;
    const presentacion = el('presentacionPrincipal');
    presentacion.requestFullscreen = async () => { solicitudesCompleta++; if (fallaCompleta) throw Error('Pantalla completa no permitida'); document.fullscreenElement = presentacion; await document.emitir('fullscreenchange'); };
    document.exitFullscreen = async () => { salidasCompleta++; document.fullscreenElement = null; await document.emitir('fullscreenchange'); };
    const navigator = { mediaDevices: { getUserMedia() { solicitudesMedios++; throw Error('La vista no debe pedir medios'); }, getDisplayMedia() { solicitudesMedios++; throw Error('La vista no debe compartir otra pantalla'); } } };
    class Stream { constructor(pistas) { this.pistas = pistas; } getVideoTracks() { return this.pistas.filter(p => p.kind === 'video'); } getAudioTracks() { return this.pistas.filter(p => p.kind === 'audio'); } }
    const contexto = vm.createContext({ window, document, navigator, location: { origin: 'https://sala.local' }, localStorage: { getItem: () => 'token' },
        setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: raf, cancelAnimationFrame: cancelarRaf,
        ResizeObserver: Observador, MediaStream: Stream, Date, URL, console });
    vm.runInContext(fuente, contexto);
    const rtc = { id: 'yo', activa: true, medios: {}, estadoLocal: { video: false, audio: false, mano: false }, lista: [], peers: new Map(), estado: {}, salir() {} };
    const experiencia = new window.PMOExperienciaSala({ rtc });
    function flush() { for (let i = 0; cuadros.size && i < 20; i++) { const lote = [...cuadros.values()]; cuadros.clear(); lote.forEach(fn => fn()); } assert.equal(cuadros.size, 0, 'No debe dejar una animación de tamaño permanente'); }
    function presentador(id, pista = { id: 'pantalla-' + id, kind: 'video', readyState: 'live' }) {
        const stream = new Stream([pista]); rtc.peers.set(id, { pantallaVideo: { srcObject: stream }, video: { srcObject: null }, stream: new Stream([]) });
        rtc.lista = [{ id, nombre: id, pantalla: true, video: false }]; experiencia.actualizar(); flush(); return pista;
    }
    return { window, document, el, rtc, experiencia, flush, presentador, observadores,
        cuentaCompleta: () => solicitudesCompleta, salidasCompleta: () => salidasCompleta, cuentaMedios: () => solicitudesMedios };
}
function calcular(...args) { const e = entorno(); assert.equal(typeof e.window.PMOCalcularVistaPresentacion, 'function'); return e.window.PMOCalcularVistaPresentacion(...args); }
function lienzo(e, ancho, alto) { cerca(Number.parseFloat(e.el('lienzoPresentacion').style.width), ancho); cerca(Number.parseFloat(e.el('lienzoPresentacion').style.height), alto); }
test('contain respeta 16:9 y centra la imagen sin recortar dentro de la vista', () => {
    const r = calcular(1920, 1080, 1000, 600, 1); cerca(r.ancho, 1000); cerca(r.alto, 562.5); cerca(r.izquierda, 0); cerca(r.arriba, 18.75);
});
test('contenido vertical usa el alto disponible y conserva su relación de aspecto', () => {
    const r = calcular(1080, 1920, 1000, 600, 1); cerca(r.ancho, 337.5); cerca(r.alto, 600); cerca(r.izquierda, 331.25); cerca(r.arriba, 0);
});
test('zoom se limita a 1..3 y el contenido ampliado comienza en el origen para poder desplazarse', () => {
    const menor = calcular(1920, 1080, 1000, 600, -.5), mayor = calcular(1920, 1080, 1000, 600, 99);
    cerca(menor.ancho, 1000); cerca(mayor.ancho, 3000); cerca(mayor.alto, 1687.5); cerca(mayor.izquierda, 0); cerca(mayor.arriba, 0);
});
test('antes de metadata usa el área de vista y resize vuelve a calcular la escala base', () => {
    const sinMetadata = calcular(0, 0, 800, 450, 2); cerca(sinMetadata.ancho, 1600); cerca(sinMetadata.alto, 900);
    const ajustada = calcular(1920, 1080, 400, 400, 1); cerca(ajustada.ancho, 400); cerca(ajustada.alto, 225); cerca(ajustada.arriba, 87.5);
});
test('botones de zoom actualizan el lienzo y Ajustar restaura 100% sin pedir medios', async () => {
    const e = entorno(); for (const n of ['cambiarZoom', 'ajustarVista', 'actualizarTamanoVista', 'pantallaCompleta']) assert.equal(typeof e.experiencia[n], 'function', n);
    e.experiencia.actualizarTamanoVista(); e.flush(); lienzo(e, 1000, 562.5);
    await e.el('btnZoomAmpliar').click(); e.flush(); assert.notEqual(e.el('escalaPresentacion').textContent, '100%');
    assert.ok(Number.parseFloat(e.el('lienzoPresentacion').style.width) > 1000);
    await e.el('btnAjustarVista').click(); e.flush(); lienzo(e, 1000, 562.5); assert.equal(e.el('escalaPresentacion').textContent, '100%');
    await e.el('btnZoomReducir').click(); e.flush(); lienzo(e, 1000, 562.5); assert.equal(e.cuentaMedios(), 0); assert.equal(e.cuentaCompleta(), 0);
});
test('zoom incremental respeta ambos límites y reajuste elimina el desplazamiento anterior', () => {
    const e = entorno(); e.experiencia.cambiarZoom(20); e.flush(); lienzo(e, 3000, 1687.5); assert.equal(e.el('escalaPresentacion').textContent, '300%');
    e.el('escenarioPrincipal').scrollLeft = 550; e.el('escenarioPrincipal').scrollTop = 120;
    e.experiencia.ajustarVista(); e.flush(); lienzo(e, 1000, 562.5); assert.equal(e.el('escenarioPrincipal').scrollLeft, 0); assert.equal(e.el('escenarioPrincipal').scrollTop, 0);
    e.experiencia.cambiarZoom(-20); e.flush(); assert.equal(e.el('escalaPresentacion').textContent, '100%'); assert.equal(e.cuentaMedios(), 0);
});
test('resize de área conserva el zoom elegido y usa las nuevas dimensiones', () => {
    const e = entorno(); e.experiencia.cambiarZoom(1); e.flush(); lienzo(e, 2000, 1125);
    e.el('escenarioPrincipal').clientWidth = 640; e.el('escenarioPrincipal').clientHeight = 480;
    e.experiencia.actualizarTamanoVista(); e.flush(); lienzo(e, 1280, 720); assert.equal(e.el('escalaPresentacion').textContent, '200%');
});
test('metadata vertical sustituye el área provisional y permanece contenida', async () => {
    const e = entorno({ videoAncho: 0, videoAlto: 0 }); e.experiencia.actualizarTamanoVista(); e.flush(); lienzo(e, 1000, 600);
    e.el('videoPrincipal').videoWidth = 1080; e.el('videoPrincipal').videoHeight = 1920;
    await e.el('videoPrincipal').emitir('loadedmetadata'); e.flush(); lienzo(e, 337.5, 600); assert.equal(e.cuentaMedios(), 0);
});
test('cambiar de presentador o de pistas reinicia zoom y conservar la pista no lo reinicia', () => {
    const e = entorno(); e.presentador('uno'); e.experiencia.cambiarZoom(1); e.flush(); assert.equal(e.el('escalaPresentacion').textContent, '200%');
    e.experiencia.actualizar(); e.flush(); assert.equal(e.el('escalaPresentacion').textContent, '200%');
    e.presentador('dos'); assert.equal(e.el('escalaPresentacion').textContent, '100%');
    e.experiencia.cambiarZoom(1); e.flush(); e.presentador('dos', { id: 'pantalla-nueva', kind: 'video', readyState: 'live' });
    assert.equal(e.el('escalaPresentacion').textContent, '100%'); assert.equal(e.cuentaMedios(), 0);
});
test('pantalla completa requiere click explícito y el siguiente click restaura la vista', async () => {
    const e = entorno(); e.experiencia.actualizarTamanoVista(); e.flush(); assert.equal(e.cuentaCompleta(), 0);
    await e.el('btnPantallaCompleta').click(); e.flush(); assert.equal(e.cuentaCompleta(), 1); assert.equal(e.document.fullscreenElement, e.el('presentacionPrincipal'));
    assert.equal(e.el('btnPantallaCompleta').getAttribute('aria-pressed'), 'true');
    await e.el('btnPantallaCompleta').click(); e.flush(); assert.equal(e.salidasCompleta(), 1); assert.equal(e.document.fullscreenElement, null);
    assert.equal(e.el('btnPantallaCompleta').getAttribute('aria-pressed'), 'false'); assert.equal(e.cuentaMedios(), 0);
});
test('rechazo de pantalla completa se informa sin romper controles ni solicitar medios', async () => {
    const e = entorno({ fallaCompleta: true }); await assert.doesNotReject(e.el('btnPantallaCompleta').click()); e.flush();
    assert.equal(e.document.fullscreenElement, null); assert.match(String(e.rtc.estado.textContent), /pantalla completa|permitida/i);
    e.experiencia.ajustarVista(); e.flush(); lienzo(e, 1000, 562.5); assert.equal(e.cuentaMedios(), 0);
});
test('la prueba de micrófono permanece explícita y los dispositivos están plegados al entrar', () => {
    const detalles = html.match(/<details\b([^>]*\bid=["']dispositivosSala["'][^>]*)>/i); assert.ok(detalles, 'Existe el panel plegable de dispositivos');
    assert.doesNotMatch(detalles[1], /(?:^|\s)open(?:\s|=|$)/i); assert.match(html, /id=["']btnAbrirPruebaMicrofono["']/);
    assert.doesNotMatch(html, /\bid=["']btnEscuchar[^"']*["']/i); assert.match(html, /id=["']btnAjustarVista["']/);
});

test('no reescribe las dimensiones en cada actualización de la sala',()=>{
 const e=entorno();let cambios=0;const estilo=e.el('lienzoPresentacion').style;
 e.el('lienzoPresentacion').style=new Proxy(estilo,{set(obj,k,v){cambios++;obj[k]=v;return true;}});
 for(let i=0;i<20;i++)e.experiencia.actualizarTamanoVista();assert.equal(cambios,0);
 e.el('escenarioPrincipal').clientWidth=800;e.experiencia.actualizarTamanoVista();assert.ok(cambios>0);
});
test('el panel de fondos se cierra con su botón y al pulsar fuera',async()=>{
 const e=entorno();e.el('opcionesFondos').hidden=false;await e.el('btnCerrarFondos').click();assert.equal(e.el('opcionesFondos').hidden,true);
 e.el('opcionesFondos').hidden=false;await e.document.emitir('pointerdown',{target:{closest:()=>null}});assert.equal(e.el('opcionesFondos').hidden,true);
 e.el('opcionesFondos').hidden=false;await e.document.emitir('pointerdown',{target:{closest:()=>e.el('opcionesFondos')}});assert.equal(e.el('opcionesFondos').hidden,false);
});
