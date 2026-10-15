const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const fuente = fs.readFileSync(path.join(__dirname, '../js/asistencia-automatica.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

function entorno(rol = 'Colaborador') {
    let token = '', ahora = 1_000_000;
    let respuesta = {perfilAlumno: true, aplicable: true, modoContinuo: true, finalizada: true,
        puedeIniciar: true, puedeReanudar: true, contando: false, segundos: 7200,
        limiteSegundos: 36000, idRegistro: 51, idMiembro: 11, motivoCierre: 'CAMBIO_PERFIL'};
    let accion = null;
    const controles = {}, eventos = {}, intervalos = [], peticiones = [];
    const usuario = {id: 10, rol};
    function control(id) {
        return controles[id] || (controles[id] = {hidden: false, disabled: false, textContent: '',
            value: 0, dataset: {}, parentElement: {hidden: false}, classList: {add() {}}});
    }
    const document = {body: {}, getElementById: control, querySelector() {return null;}, addEventListener() {}};
    class Reloj extends Date {static now() {return ahora;}}
    const window = {location: {pathname: '/dashboard.html', href: 'dashboard.html'},
        crypto: {randomUUID: () => 'pagina-prueba'}, apiUrl: url => url,
        obtenerTokenSesionPMO: () => token, dispatchEvent() {},
        addEventListener: (nombre, fn) => eventos[nombre] = fn, confirm: () => true,
        fetch: async (url, opciones) => {
            peticiones.push({url, opciones});
            if (url.includes('/asistencia-automatica/') && accion) return accion();
            return new Response(JSON.stringify(url.includes('/presencia/')
                ? {asistencia: respuesta, conectado: true} : respuesta));
        }};
    vm.runInNewContext(fuente, {window, document, Date: Reloj, Event, AbortController,
        localStorage: {getItem: key => key === 'usuarioActivo' ? JSON.stringify(usuario) : token},
        setTimeout: () => 1, clearTimeout() {}, setInterval: (fn, ms) => intervalos.push({fn, ms}), console});
    token = 'token';
    return {window, api: window.asistenciaAutomaticaPMO, control, eventos, peticiones,
        datos: datos => respuesta = datos, respuesta: () => respuesta, accion: fn => accion = fn,
        token: valor => token = valor, rol: valor => usuario.rol = valor,
        avanzar: segundos => ahora += segundos * 1000,
        pintar: () => intervalos.find(i => i.ms === 1000).fn()};
}

test('volver a Colaborador muestra Continuar incluso si la jornada continua figura finalizada', async () => {
    const e = entorno('Asesor Empresarial');
    await e.api.sincronizar();
    assert.equal(e.api.esAlumno(), true, 'El perfil actual del servidor corrige el rol guardado antes del cambio.');
    assert.equal(e.control('pmoIniciarJornada').parentElement.hidden, false);
    assert.equal(e.control('pmoIniciarJornada').hidden, false);
    assert.equal(e.control('pmoIniciarJornada').disabled, false);
    assert.equal(e.control('pmoIniciarJornada').textContent, 'Continuar mi jornada');
    assert.equal(e.control('pmoAsistenciaTitulo').textContent, 'Continúa tu jornada de hoy');
    assert.equal(e.control('pmoAsistenciaReloj').textContent, '02:00:00');
});

test('continuar confirma el mismo registro y conserva el acumulado antes de avanzar desde ahora', async () => {
    const e = entorno(); await e.api.sincronizar();
    e.avanzar(1800);
    assert.equal(e.api.segundosVisibles(), 7200, 'No acredita el intervalo detenido.');
    const nueva = {...e.respuesta(), finalizada: false, puedeIniciar: false, puedeReanudar: false,
        puedeFinalizar: true, contando: true, vigenciaSegundos: 7200, segundosHastaCierre: 7200};
    e.accion(async () => new Response(JSON.stringify(nueva)));
    await e.control('pmoIniciarJornada').onclick();
    assert.equal(e.peticiones.at(-1).url, '/api/asistencia-automatica/iniciar');
    assert.equal(e.peticiones.at(-1).opciones.method, 'POST');
    assert.equal(e.peticiones.at(-1).opciones.body, undefined, 'El navegador no envía segundos ni identificadores que puedan reescribir el historial.');
    assert.equal(e.api.estado().idRegistro, 51);
    assert.equal(e.api.segundosVisibles(), 7200);
    assert.equal(e.window.location.href, 'dashboard.html', 'Continuar mantiene la página actual.');
    assert.equal(e.control('pmoIniciarJornada').hidden, true);
    e.avanzar(61); e.pintar();
    assert.equal(e.control('pmoAsistenciaReloj').textContent, '02:01:01');
});

test('continuar no duplica solicitudes mientras se confirma y una respuesta fallida no borra horas', async () => {
    const e = entorno(); await e.api.sincronizar();
    let resolver;
    e.accion(() => new Promise(resolve => resolver = resolve));
    const primera = e.api.iniciar(true);
    assert.equal(e.control('pmoIniciarJornada').disabled, true);
    await e.api.iniciar(true);
    assert.equal(e.peticiones.filter(p => p.url.endsWith('/iniciar')).length, 1);
    resolver(new Response(JSON.stringify({mensaje: 'La jornada necesita revisión.'}), {status: 409}));
    await primera;
    assert.equal(e.api.estado().idRegistro, 51);
    assert.equal(e.api.segundosVisibles(), 7200);
    assert.equal(e.api.estado().contando, false);
    assert.equal(e.control('pmoAsistenciaTitulo').textContent, 'Conexión pendiente de confirmar', 'Un error al continuar no anuncia una jornada activa.');
    assert.equal(e.control('pmoIniciarJornada').disabled, false);
    assert.equal(e.window.location.href, 'dashboard.html');
});

test('meta alcanzada o cierre no reanudable no ofrece continuar y no fabrica nuevo tiempo', async () => {
    for (const segundos of [7200, 36000]) {
        const e = entorno();
        e.datos({...e.respuesta(), segundos, puedeReanudar: false, puedeIniciar: false});
        await e.api.sincronizar();
        assert.equal(e.control('pmoIniciarJornada').hidden, true);
        assert.equal(e.control('pmoIniciarJornada').disabled, true);
        e.avanzar(1000);
        assert.equal(e.api.segundosVisibles(), segundos);
    }
});

test('el perfil del servidor evita mostrar jornada escolar con un rol local de Colaborador obsoleto', async () => {
    const e = entorno();
    e.datos({perfilAlumno: false, aplicable: false, contando: false, segundos: 7200});
    await e.api.sincronizar();
    assert.equal(e.api.esAlumno(), false);
    assert.equal(e.control('pmoIniciarJornada').parentElement.hidden, true);
    assert.equal(e.control('pmoAsistenciaReloj').parentElement.hidden, true);
    e.token('nueva-sesion'); e.rol('Asesor Empresarial');
    assert.equal(e.api.esAlumno(), false, 'El perfil de una respuesta anterior nunca se aplica a otro token.');
});

test('en servidores anteriores sin perfilAlumno sigue funcionando el rol de la sesión', async () => {
    const e = entorno();
    const d = {...e.respuesta()}; delete d.perfilAlumno; e.datos(d);
    await e.api.sincronizar(); assert.equal(e.api.esAlumno(), true);
});

test('Control de horas ofrece la misma acción de continuidad sin tocar estadísticas ni registros', () => {
    const codigo = fs.readFileSync(path.join(__dirname, '../js/control-horas.js'), 'utf8');
    const inicio = codigo.indexOf('function actualizarEstadoJornada()');
    const fin = codigo.indexOf('    let registrosParaBuscar = registrosHoras;', inicio);
    const bloque = codigo.slice(inicio, fin) + '\n}';
    const btnCheckIn = {}, btnCheckOut = {}, btnRegistrarHoras = {}, textoJornada = {}, jornadaStatus = {};
    const estado = {puedeReanudar: true, puedeIniciar: false, puedeFinalizar: false, contando: false,
        segundos: 7200, mensaje: 'Continúa conservando las horas de hoy.'};
    const ctx = {window: {asistenciaAutomaticaPMO: {esAlumno: () => true, estado: () => estado}},
        btnCheckIn, btnCheckOut, btnRegistrarHoras, textoJornada, jornadaStatus};
    vm.runInNewContext(bloque + '\nactualizarEstadoJornada();', ctx);
    assert.equal(btnCheckIn.textContent, 'Continuar mi jornada');
    assert.equal(btnCheckIn.disabled, false);
    assert.equal(btnCheckOut.disabled, true);
    assert.equal(btnRegistrarHoras.hidden, true);
    assert.equal(estado.segundos, 7200);
});

test('una confirmación de jornada de otra sesión no reemplaza los datos ni redirige al usuario', async () => {
    const e = entorno(); await e.api.sincronizar();
    let resolver; e.accion(() => new Promise(resolve => resolver = resolve));
    const solicitud = e.api.iniciar(true);
    e.token('otro-token');
    resolver(new Response(JSON.stringify({...e.respuesta(), finalizada: false, contando: true})));
    await solicitud; await tick();
    assert.equal(e.api.estado().finalizada, true);
    assert.equal(e.api.estado().segundos, 7200);
    assert.equal(e.window.location.href, 'dashboard.html');
});
