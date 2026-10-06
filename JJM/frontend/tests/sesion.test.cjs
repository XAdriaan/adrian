const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const codigoApi = fs.readFileSync(path.join(__dirname, '../js/api-config.js'), 'utf8');
const codigoLogin = fs.readFileSync(path.join(__dirname, '../js/login.js'), 'utf8');
const json = (datos, status = 200) => new Response(JSON.stringify(datos), {
    status, headers: { 'Content-Type': 'application/json' }
});

function entorno(fetch, almacen = { sesionTokenPMO: 'token-actual', usuarioActivo: '{}' }) {
    const storage = new Map(Object.entries(almacen));
    const navegaciones = [];
    const window = {
        location: { origin: 'https://oficina.jjmti.com.mx',
            href: 'https://oficina.jjmti.com.mx/dashboard.html',
            pathname: '/dashboard.html', search: '',
            replace: ruta => navegaciones.push(ruta) }, fetch, dispatchEvent() {}
    };
    const contexto = vm.createContext({ window, URL, URLSearchParams, Headers, Request,
        AbortController, Event, sessionStorage: {getItem:()=>null,setItem(){},removeItem(){}}, setTimeout, clearTimeout, console: { warn() {}, error() {} },
        localStorage: { getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
    vm.runInContext(codigoApi, contexto);
    return { window, contexto, storage, navegaciones };
}

test('envía el token solo a la API configurada y conserva headers de Request', async () => {
    const llamadas = [];
    const e = entorno(async (input, init) => { llamadas.push(init); return json({}); });
    await e.window.fetch(new Request('https://oficina.jjmti.com.mx/api/proyectos', {
        headers: { 'X-Prueba': 'preservado' }
    }));
    assert.equal(llamadas[0].headers.get('Authorization'), 'Bearer token-actual');
    assert.equal(llamadas[0].headers.get('X-Prueba'), 'preservado');
    await e.window.fetch(new URL('https://oficina.jjmti.com.mx/api/tareas'));
    assert.equal(llamadas[1].headers.get('Authorization'), 'Bearer token-actual');
    await e.window.fetch('https://oficina.jjmti.com.mx.example.invalid/api/tareas');
    await e.window.fetch('/dashboard.html');
    assert.equal(llamadas[2].headers.has('Authorization'), false);
    assert.equal(llamadas[3].headers.has('Authorization'), false);
});

test('una respuesta atrasada no borra una sesión nueva', async () => {
    let responder;
    const e = entorno(() => new Promise(resolve => { responder = resolve; }));
    const solicitud = e.window.fetch('/api/tareas');
    e.storage.set('sesionTokenPMO', 'token-nuevo');
    responder(json({ mensaje: 'La sesión no existe o venció.' }, 401));
    await solicitud;
    assert.equal(e.storage.get('sesionTokenPMO'), 'token-nuevo');
    assert.equal(e.navegaciones.length, 0);
});

test('una sesión vencida confirmada limpia la identidad y vuelve al login', async () => {
    const e = entorno(async () => json({ mensaje: 'La sesión no existe o venció.' }, 401));
    await e.window.fetch('/api/tareas');
    assert.equal(e.storage.has('sesionTokenPMO'), false);
    assert.equal(e.storage.has('usuarioActivo'), false);
    assert.deepEqual(e.navegaciones, ['login.html?sesion=expirada']);
});

test('un error funcional o del servidor conserva la sesión', async () => {
    const e = entorno(async () => json({ mensaje: 'No se puede realizar esta operación.' }, 401));
    await e.window.fetch('/api/tareas');
    assert.equal(e.storage.get('sesionTokenPMO'), 'token-actual');
    e.window.fetch = async () => json({ mensaje: 'Servicio temporalmente no disponible.' }, 503);
    assert.equal(await e.window.restaurarSesionPMO(), null);
    assert.equal(e.storage.get('sesionTokenPMO'), 'token-actual');
});

test('restaura una sola vez las consultas simultáneas y descarta identidad sin token', async () => {
    let llamadas = 0;
    const e = entorno(async () => { llamadas++; return json({ usuario: { id: 7 } }); });
    await Promise.all([e.window.restaurarSesionPMO(), e.window.restaurarSesionPMO()]);
    assert.equal(llamadas, 1);
    assert.equal(JSON.parse(e.storage.get('usuarioActivo')).id, 7);
    const sinToken = entorno(async () => json({}), { usuarioActivo: '{"id":7}' });
    assert.equal(sinToken.storage.has('usuarioActivo'), false);
});

function prepararLogin(fetch) {
    const e = entorno(fetch, {});
    e.window.location.pathname = '/login.html';
    e.window.location.href = 'https://oficina.jjmti.com.mx/login.html';
    let submit;
    const elementos = {
        loginForm: { addEventListener: (evento, callback) => { submit = callback; } },
        email: { value: 'prueba@example.invalid' }, password: { value: 'clave-de-prueba' },
        'error-message': { style: {}, textContent: '' },
        'success-message': { style: {}, textContent: '' }, btnLogin: { disabled: false }
    };
    e.contexto.document = { getElementById: id => elementos[id] || null };
    e.contexto.fetch = e.window.fetch;
    // Adelanta solo los plazos del expediente y de navegación.
    e.contexto.setTimeout = (callback, ms) => {
        if (ms === 4000 || ms === 350) { queueMicrotask(callback); return 0; }
        return setTimeout(callback, ms);
    };
    vm.runInContext(codigoLogin, e.contexto);
    return { ...e, elementos, submit: () => submit({ preventDefault() {} }) };
}

test('login entra aunque el expediente no responda y conserva la sesión', async () => {
    const e = prepararLogin(async (input, opciones) => {
        if (String(input).endsWith('/login')) return json({ usuario: { id: 7 }, token: 'token-valido' });
        return new Promise((_, reject) => {
            const abortar = () => reject(Object.assign(new Error('timeout'), { name: 'AbortError' }));
            if (opciones.signal.aborted) abortar();
            else opciones.signal.addEventListener('abort', abortar, { once: true });
        });
    });
    await e.submit();
    assert.equal(e.storage.get('sesionTokenPMO'), 'token-valido');
    assert.deepEqual(e.navegaciones, ['dashboard.html?completarDatos=1']);
    assert.equal(e.elementos.btnLogin.disabled, true);
});

test('login distingue credenciales rechazadas de fallos del servidor', async () => {
    const e = prepararLogin(async () => json({ mensaje: 'Correo o contraseña incorrectos.' }, 401));
    await e.submit();
    assert.equal(e.elementos['error-message'].textContent, 'Correo o contraseña incorrectos.');
    assert.equal(e.storage.has('sesionTokenPMO'), false);
    assert.equal(e.elementos.btnLogin.disabled, false);
    assert.equal(e.navegaciones.length, 0);
});

test('login no anuncia éxito cuando el servidor rechaza la nueva sesión', async () => {
    const e = prepararLogin(async input => String(input).endsWith('/login')
        ? json({ usuario: { id: 7 }, token: 'token-valido' })
        : json({ mensaje: 'La sesión no existe o venció.' }, 401));
    await e.submit();
    assert.equal(e.navegaciones.length, 0);
    assert.equal(e.storage.has('sesionTokenPMO'), false);
    assert.equal(e.elementos.btnLogin.disabled, false);
    assert.match(e.elementos['error-message'].textContent, /no confirmó tu sesión/);
});
