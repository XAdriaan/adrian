const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const codigo = n => fs.readFileSync(path.join(__dirname, '../js', n), 'utf8');
const json = d => new Response(JSON.stringify(d));

function pagina(archivo, rol = 'Asesor Empresarial', permisos = ['proyectos.ver_todos']) {
    const usuario = {id: 7, idMiembro: 42, nombre: 'Asesor', rol, estado: 'Activo'};
    const elementos = {}, llamadas = [];
    const el = id => elementos[id] ||= {style: {}, value: '', innerHTML: '', textContent: '',
        addEventListener() {}, querySelectorAll: () => [], classList: {add() {}, remove() {}}};
    const contexto = vm.createContext({window: {apiUrl: r => r,
            PMOPermisos: {tiene: p => permisos.includes(p), esAdministradorReal: () => rol === 'Administrador'},
            dispatchEvent() {}, location: {}},
        document: {getElementById: el, addEventListener() {}, querySelectorAll: () => []},
        localStorage: {getItem: k => k === 'usuarioActivo' ? JSON.stringify(usuario) : null},
        CustomEvent: class {}, console, fetch: async r => {llamadas.push(r); return json({miembros: [{id: 42, idUsuario: 7}]});}});
    vm.runInContext(codigo(archivo), contexto);
    return {el, llamadas, contexto, run: s => vm.runInContext(s, contexto)};
}

test('asesor ve consulta global sin botones administrativos ni editar proyectos ajenos', async () => {
    const e = pagina('proyectos.js', '  Asesor   Empresarial ', ['proyectos.ver_todos', 'proyectos.crear', 'proyectos.editar']);
    assert.equal(e.run('esAdministrador()'), false);
    assert.equal(e.run('puedeConsultarTodosProyectos()'), true);
    assert.equal(e.run('puedeCrearProyecto()'), false);
    assert.equal(e.run('puedeEditarProyecto({idResponsable: 99})'), false);
    assert.equal(e.run('puedeEditarProyecto({idResponsable: 42})'), true);
    e.run('configurarPermisosVisuales()');
    assert.equal(e.el('btnNuevoProyecto').style.display, 'none');
    assert.match(e.el('permisoProyectos').innerHTML, /todos los proyectos.*actividades/);
    assert.match(e.el('permisoProyectos').innerHTML, /videollamadas/);
    await e.run('cargarMiembros()');
    assert.deepEqual(e.llamadas, ['/api/miembros']);
});

test('asesor abre reuniones ajenas sin obtener creación de tareas ni gestión de miembros', () => {
    const e = pagina('detalle-proyecto.js');
    e.run('proyectoActual = {id: 10, idResponsable: 99}; miembrosProyecto = []');
    assert.equal(e.run('puedeCrearReunionProyecto()'), true);
    assert.equal(e.run('puedeCrearTareasEnProyecto()'), false);
    assert.equal(e.run('puedeGestionarMiembrosProyecto()'), false);
    e.run('miembrosProyecto = [{idMiembro: 42}]');
    assert.equal(e.run('puedeCrearTareasEnProyecto()'), true);
});

test('tener lectura global no convierte a Supervisor en administrador ni le permite iniciar reuniones ajenas', () => {
    const e = pagina('detalle-proyecto.js', 'Supervisor');
    assert.equal(e.run('esAdministrador()'), false);
    assert.equal(e.run('puedeCrearReunionProyecto()'), false);
    const p = pagina('proyectos.js', 'Supervisor');
    assert.equal(p.run('puedeConsultarTodosProyectos()'), true);
    assert.equal(p.run('puedeCrearProyecto()'), false);
});

test('administrador conserva creación autorizada y alumnos solo pueden abrir reuniones propias', () => {
    const admin = pagina('proyectos.js', 'Administrador', ['proyectos.crear']);
    assert.equal(admin.run('puedeCrearProyecto()'), true);
    const alumno = pagina('detalle-proyecto.js', 'Colaborador');
    assert.equal(alumno.run('puedeCrearReunionProyecto()'), false);
    alumno.run('miembrosProyecto = [{idMiembro: 42}]');
    assert.equal(alumno.run('puedeCrearReunionProyecto()'), true);
});

test('Dashboard de asesor muestra tareas de todos sin convertir horas privadas en resumen administrativo', async () => {
    const e = pagina('dashboard.js');
    e.run(`tareasDashboard = [{id: 1, idMiembro: 99}, {id: 2, idMiembro: 42}];
        registrosHorasDashboard = [{id: 1, idMiembro: 99}, {id: 2, idMiembro: 42}];
        miembrosDashboard = [{id: 42, idUsuario: 7}];`);
    assert.equal(e.run('obtenerTareasVisibles().length'), 2);
    assert.equal(e.run('obtenerRegistrosVisibles().length'), 1);
    assert.equal(e.run('esAdministrador()'), false);
    await e.run('obtenerMiembrosParaDashboard()');
    assert.deepEqual(e.llamadas, ['/api/miembros']);
    e.run('configurarEncabezadoDashboard()');
    assert.match(e.el('descripcionDashboard').textContent, /Supervisa todos los proyectos/);
});

test('asesor puede abrir Proyectos y Videollamadas sin completar expediente académico propio', () => {
    const e = pagina('permisos-globales.js', 'Asesor Empresarial', []);
    assert.equal(e.run(`esAsesorEmpresarialGlobal({rol: 'Asesor de empresa', estado: 'Activo'})`), true);
    assert.equal(e.run(`esAsesorEmpresarialGlobal({rol: 'Asesor Empresarial', estado: 'Inactivo'})`), false);
    for (const ruta of ['proyectos.html', 'videollamadas.html']) {
        assert.equal(e.run(`debeCompletarDatosAcademicosGlobal({rol:'Asesor Empresarial'}, '${ruta}', false)`), false);
    }
    assert.equal(e.run(`esAdministradorGlobal({rol:'Asesor Empresarial', permisos:['proyectos.ver_todos']})`), false);
});

test('login de asesor abre Dashboard sin pedir matrícula ni fechas académicas', async () => {
    let submit;
    const llamadas = [], navegaciones = [], storage = new Map();
    const elementos = {loginForm: {addEventListener: (_, fn) => submit = fn},
        email: {value: 'asesor@example.invalid'}, password: {value: 'clave-de-prueba'},
        'error-message': {style: {}}, 'success-message': {style: {}}, btnLogin: {}};
    const contexto = vm.createContext({window: {apiUrl: r => r, location: {search: '', replace: r => navegaciones.push(r)}},
        document: {getElementById: id => elementos[id] || null},
        localStorage: {getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v)}, sessionStorage: {setItem() {}},
        fetch: async r => {llamadas.push(r); return json({usuario: {id: 7, rol: 'Asesor Empresarial'}, token: 'token'});},
        setTimeout: (fn, ms) => {if (ms === 350) queueMicrotask(fn); return 1;}, clearTimeout() {},
        AbortController, URLSearchParams, console});
    vm.runInContext(codigo('login.js'), contexto);
    await submit({preventDefault() {}}); await Promise.resolve();
    assert.deepEqual(llamadas, ['/api/auth/login']);
    assert.deepEqual(navegaciones, ['dashboard.html']);
});

test('directorio de videollamadas permite iniciar sala ajena y unirse a activa con flags del servidor', async () => {
    const e = pagina('videollamadas.js');
    const salas = [], llamadas = [];
    e.run(`salasVideollamadas = [{id:10, nombre:'Proyecto ajeno', puedeCrear:true, reuniones:[]},
        {id:20, nombre:'Otro proyecto', puedeCrear:true, reunionActiva:{id:30}, reuniones:[]}];`);
    e.run('renderSalasVideollamadas()');
    assert.match(e.el('salasProyectos').innerHTML, /Iniciar videollamada/);
    assert.match(e.el('salasProyectos').innerHTML, /Unirme a la llamada/);
    e.contexto.capturas = salas;
    e.contexto.peticiones = llamadas;
    e.contexto.respuesta = () => json({reunion: {id: 21}});
    e.run('window.parent = window; window.abrirSalaPMO = r => capturas.push(r); fetch = async r => {peticiones.push(r); return respuesta();};');
    await e.run(`abrirSalaVideollamada(10, {textContent:'Iniciar', disabled:false})`);
    await e.run(`abrirSalaVideollamada(20, {textContent:'Unirme', disabled:false})`);
    assert.deepEqual(llamadas, ['/api/proyectos/10/reuniones']);
    assert.deepEqual(salas, ['reunion.html?id=10&reunion=21', 'reunion.html?id=20&reunion=30']);
});
