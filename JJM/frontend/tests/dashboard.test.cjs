const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const codigo = fs.readFileSync(path.join(__dirname, '../js/dashboard.js'), 'utf8');
const json = (datos, status = 200) => new Response(JSON.stringify(datos), { status });

function dashboard(rol, opciones = {}) {
    const llamadas = [];
    const usuario = { id: 7, rol, nombre: 'Usuario de prueba' };
    const elementos = {
        mensajeDashboard: { style: {}, className: '' }, textoMensajeDashboard: {},
        totalTareas: {}, totalProyectosActivos: {}, totalAlertas: {}, totalHoras: {}
    };
    const contexto = vm.createContext({
        window: { apiUrl: ruta => `https://oficina.example.invalid${ruta}`,
            PMOPermisos: { tiene: () => opciones.proyectosGlobales === true } },
        document: { addEventListener() {}, getElementById: id => elementos[id] || null },
        localStorage: { getItem: key => key === 'usuarioActivo' ? JSON.stringify(usuario) : null },
        console: { warn() {}, error() {} },
        fetch: async url => {
            const ruta = new URL(url).pathname;
            llamadas.push(ruta);
            if (ruta === '/api/proyectos') return json({ proyectos: [{ id: 1, nombre: 'Proyecto' }] });
            if (ruta === '/api/tareas') return json({ tareas: [{ id: 2, idMiembro: 42, titulo: 'Tarea' }] });
            if (ruta === '/api/miembros/mi-sesion') {
                if (opciones.sinMiembro) return json({ estado: 'error',
                    mensaje: 'El usuario activo no tiene un registro de miembro vinculado.' }, 404);
                if (opciones.rutaAusente) return json({ status: 404 }, 404);
                return json({ miembro: { id: 42, idUsuario: 7, nombreCompleto: 'Usuario de prueba' } });
            }
            if (ruta === '/api/miembros') {
                return rol === 'Administrador' ? json({ miembros: [{ id: 42, idUsuario: 7 }] })
                    : json({ mensaje: 'Solo un administrador puede consultar el equipo completo.' }, 403);
            }
            if (ruta === '/api/registros-horas') return opciones.falloHoras
                ? json({ mensaje: 'Servicio no disponible.' }, 500) : json({ registros: [] });
            throw new Error(`Consulta inesperada: ${ruta}`);
        }
    });
    vm.runInContext(codigo, contexto);
    return { contexto, llamadas, elementos,
        cargar: () => vm.runInContext('cargarDashboard()', contexto) };
}

test('colaborador carga el Dashboard sin pedir el equipo administrativo ni mostrar aviso', async () => {
    const e = dashboard('Colaborador');
    await e.cargar();
    assert.ok(e.llamadas.includes('/api/miembros/mi-sesion'));
    assert.equal(e.llamadas.includes('/api/miembros'), false);
    assert.equal(e.elementos.mensajeDashboard.style.display, 'none');
    assert.equal(String(e.elementos.totalTareas.textContent), '1');
    assert.equal(vm.runInContext('obtenerIdMiembroUsuarioActivo()', e.contexto), 42);
});

test('administrador conserva la consulta al equipo completo', async () => {
    const e = dashboard('Administrador');
    await e.cargar();
    assert.ok(e.llamadas.includes('/api/miembros'));
    assert.equal(e.llamadas.includes('/api/miembros/mi-sesion'), false);
    assert.equal(e.elementos.mensajeDashboard.style.display, 'none');
});

test('ver todos los proyectos no autoriza pedir el equipo completo', async () => {
    const e = dashboard('Supervisor', { proyectosGlobales: true });
    await e.cargar();
    assert.equal(e.llamadas.includes('/api/miembros'), false);
    assert.ok(e.llamadas.includes('/api/miembros/mi-sesion'));
    assert.equal(e.elementos.mensajeDashboard.style.display, 'none');
});

test('usuario de consulta no pide el control de horas restringido', async () => {
    const e = dashboard('Cliente');
    await e.cargar();
    assert.equal(e.llamadas.includes('/api/registros-horas'), false);
    assert.equal(e.elementos.mensajeDashboard.style.display, 'none');
});

test('ausencia de miembro no es una caída, pero una ruta inexistente sí se informa', async () => {
    const e = dashboard('Colaborador', { sinMiembro: true });
    await e.cargar();
    assert.equal(e.elementos.mensajeDashboard.style.display, 'none');
    const ruta = dashboard('Colaborador', { rutaAusente: true });
    await ruta.cargar();
    assert.equal(ruta.elementos.mensajeDashboard.style.display, 'flex');
    assert.match(ruta.elementos.textoMensajeDashboard.textContent, /registro de equipo/);
});

test('un fallo real indica qué información no se pudo actualizar', async () => {
    const e = dashboard('Colaborador', { falloHoras: true });
    await e.cargar();
    assert.equal(e.elementos.mensajeDashboard.style.display, 'flex');
    assert.match(e.elementos.textoMensajeDashboard.textContent, /actualizar horas/);
    assert.equal(String(e.elementos.totalTareas.textContent), '1');
});
