const API = window.apiUrl('/api/datos-registro');

let usuarioActivo = null;
let usuarioObjetivo = null;
let tipoActual = 'Alumno';
let usuarios = [];

const $ = id => document.getElementById(id);

const campos = [
    'nombreCompleto',
    'matricula',
    'cuatrimestre',
    'universidad',
    'carrera',
    'grupo',
    'correoInstitucional',
    'telefono',
    'area',
    'periodoEstadia',
    'fechaInicio',
    'fechaFin',
    'responsableEmpresa',
    'titulo',
    'nombreCompletoAsesor',
    'puestoCargo',
    'institucion',
    'telefonoConmutadorTrabajo',
    'extensionTrabajo',
    'telefonoDirecto',
    'celular',
    'email',
    'horarioDisponibilidad'
];

const getId = u =>
    u?.id ||
    u?.idUsuario ||
    u?.id_usuario ||
    null;

const headers = () => ({
    'X-Usuario-Id': String(getId(usuarioActivo) || '')
});


function rol(u) {
    if (!u) return '';

    if (typeof u.rol === 'object') {
        return u.rol?.nombre || '';
    }

    return u.rol || u.rolNombre || '';
}


function norm(v) {
    return String(v || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}


function esAdmin() {
    return !!(
        window.PMOPermisos?.tiene?.('datos_academicos.ver_otros')
    ) || [
        'administrador',
        'superadministrador',
        'admin pmo',
        'administrador pmo'
    ].includes(norm(rol(usuarioActivo)));
}


function setVal(id, v) {
    if ($(id)) {
        $(id).value = v ?? '';
    }
}


function val(id) {
    return $(id)?.value?.trim() || '';
}


function obtenerNombreUsuario(u) {
    if (!u) return '';

    return [
        u.nombre,
        u.apellidoPaterno,
        u.apellidoMaterno
    ]
        .filter(Boolean)
        .join(' ');
}


function inferirTipo(u) {
    const r = norm(rol(u));

    if (
        r === 'estudiante' ||
        r === 'alumno'
    ) {
        return 'Alumno';
    }

    if (
        r === 'asesor academico'
    ) {
        return 'Asesor Académico';
    }

    if (
        r === 'asesor empresarial'
    ) {
        return 'Asesor Empresarial';
    }

    return 'Alumno';
}


/* =========================================================
   NOMBRE DEL TIPO
   ========================================================= */

function nombreTipo(tipo) {

    if (tipo === 'Asesor Académico') {
        return 'Asesor Académico';
    }

    if (tipo === 'Asesor Empresarial') {
        return 'Asesor Empresarial';
    }

    return 'Alumno / Estudiante';
}


/* =========================================================
   MOSTRAR LA SECCIÓN CORRESPONDIENTE
   ========================================================= */

function setTipo(t) {

    tipoActual = t || 'Alumno';

    if ($('tipoPersona')) {
        $('tipoPersona').value = tipoActual;
    }

    /*
     * Mostrar solamente la sección correspondiente.
     */
    $('seccionAlumno')?.classList.toggle(
        'hidden',
        tipoActual !== 'Alumno'
    );

    $('seccionAsesor')?.classList.toggle(
        'hidden',
        tipoActual === 'Alumno'
    );

    /*
     * Cambiar título del asesor.
     */
    if ($('tituloAsesor')) {

        if (tipoActual === 'Asesor Académico') {

            $('tituloAsesor').textContent =
                'Datos del Asesor Académico';

        } else if (tipoActual === 'Asesor Empresarial') {

            $('tituloAsesor').textContent =
                'Datos del Asesor Empresarial';

        } else {

            $('tituloAsesor').textContent =
                'Datos del asesor';
        }
    }

    /*
     * Mostrar el tipo de registro.
     */
    const info = $('tipoRegistroInfo');

    if (info) {

        info.textContent =
            `Datos de registro: ${nombreTipo(tipoActual)}`;

        info.classList.remove('hidden');
    }

    /*
     * Desactivar los campos que no corresponden.
     */
    document
        .querySelectorAll('#seccionAlumno input')
        .forEach(input => {

            input.disabled =
                tipoActual !== 'Alumno';

        });

    document
        .querySelectorAll('#seccionAsesor input')
        .forEach(input => {

            input.disabled =
                tipoActual === 'Alumno';

        });
}


/* =========================================================
   CONFIGURAR LOS BOTONES DE TIPO
   ========================================================= */

function configurarTiposPorRol() {

    const tipoPermitido =
        inferirTipo(usuarioObjetivo);

    document
        .querySelectorAll('.tipo-tab')
        .forEach(boton => {

            /*
             * Si es administrador puede ver
             * los tres tipos.
             */
            if (esAdmin()) {

                boton.classList.remove('hidden');
                boton.disabled = false;

            } else {

                /*
                 * Usuario normal:
                 * solamente puede ver su propio tipo.
                 */
                const esSuTipo =
                    boton.dataset.tipo === tipoPermitido;

                boton.classList.toggle(
                    'hidden',
                    !esSuTipo
                );

                boton.disabled =
                    !esSuTipo;
            }
        });

    /*
     * El tipo se establece automáticamente
     * según el rol.
     */
    setTipo(tipoPermitido);
}


/* =========================================================
   CARGAR USUARIOS PARA ADMINISTRADOR
   ========================================================= */

async function cargarUsuarios() {

    if (!esAdmin()) {
        return;
    }

    try {

        const r = await fetch(
            `${API}/usuarios`,
            {
                headers: headers()
            }
        );

        const d = await r.json();

        if (!r.ok) {

            throw Error(
                d.mensaje ||
                'No se pudieron cargar las personas.'
            );
        }

        usuarios =
            d.usuarios || [];

        $('adminSelector')
            ?.classList
            .remove('hidden');

        $('personaRegistro').innerHTML =
            '<option value="">Selecciona una persona...</option>' +

            usuarios
                .map(u => `
                    <option value="${u.id}">
                        ${esc(
                            u.nombre ||
                            obtenerNombreUsuario(u)
                        )}
                        —
                        ${esc(
                            rol(u) ||
                            'Sin rol'
                        )}
                    </option>
                `)
                .join('');

    } catch (e) {

        console.error(
            'Error al cargar usuarios:',
            e
        );
    }
}


/* =========================================================
   CARGAR DATOS
   ========================================================= */

async function cargar() {

    const id =
        getId(usuarioObjetivo);

    if (!id) {
        return;
    }

    try {

        const r = await fetch(
            `${API}/usuario/${id}`,
            {
                headers: headers()
            }
        );

        const d = await r.json();

        if (!r.ok) {

            throw Error(
                d.mensaje ||
                'No se pudieron cargar los datos.'
            );
        }

        const x =
            d.datos || {};

        /*
         * IMPORTANTE:
         *
         * El tipo SIEMPRE se determina
         * mediante el rol del usuario.
         *
         * NO usamos x.tipoPersona
         * para decidir qué formulario mostrar.
         */
        const tipo =
            inferirTipo(usuarioObjetivo);

        setTipo(tipo);

        /*
         * Configurar los botones según
         * el rol de la persona.
         */
        configurarTiposPorRol();

        /*
         * Cargar los datos guardados.
         */
        campos.forEach(c => {

            setVal(
                c,
                x[c]
            );

        });

        /*
         * Si no existe nombre completo del alumno,
         * tomarlo directamente del usuario.
         */
        if (
            !val('nombreCompleto') &&
            !x.nombreCompleto
        ) {

            setVal(
                'nombreCompleto',
                obtenerNombreUsuario(
                    usuarioObjetivo
                )
            );
        }

        /*
         * Si no existe nombre del asesor,
         * tomarlo directamente del usuario.
         */
        if (
            !val('nombreCompletoAsesor')
        ) {

            setVal(
                'nombreCompletoAsesor',
                obtenerNombreUsuario(
                    usuarioObjetivo
                )
            );
        }

    } catch (e) {

        console.error(
            'Error al cargar datos:',
            e
        );

        /*
         * Si ocurre algún error al consultar
         * los datos, todavía determinamos
         * el formulario mediante el rol.
         */
        const tipo =
            inferirTipo(usuarioObjetivo);

        setTipo(tipo);

        configurarTiposPorRol();
    }
}


/* =========================================================
   LEER DATOS DEL FORMULARIO
   ========================================================= */

function leer() {

    const d = {
        tipoPersona: tipoActual
    };

    /*
     * DATOS DEL ALUMNO
     */
    if (tipoActual === 'Alumno') {

        [
            'nombreCompleto',
            'matricula',
            'cuatrimestre',
            'universidad',
            'carrera',
            'grupo',
            'correoInstitucional',
            'telefono',
            'area',
            'periodoEstadia',
            'fechaInicio',
            'fechaFin',
            'responsableEmpresa'
        ].forEach(k => {

            d[k] =
                val(k);

        });

    }

    /*
     * DATOS DEL ASESOR
     */
    else {

        d.nombreCompleto =
            val('nombreCompletoAsesor');

        [
            'titulo',
            'puestoCargo',
            'institucion',
            'telefonoConmutadorTrabajo',
            'extensionTrabajo',
            'telefonoDirecto',
            'celular',
            'email',
            'horarioDisponibilidad'
        ].forEach(k => {

            d[k] =
                val(k);

        });
    }

    return d;
}


/* =========================================================
   GUARDAR
   ========================================================= */

async function guardar(e) {

    e.preventDefault();

    /*
     * El administrador debe seleccionar
     * una persona.
     */
    if (
        esAdmin() &&
        !getId(usuarioObjetivo)
    ) {

        alert(
            'Selecciona una persona.'
        );

        return;
    }

    const d =
        leer();

    /*
     * Nombre obligatorio.
     */
    if (!d.nombreCompleto) {

        alert(
            'El nombre completo es obligatorio.'
        );

        return;
    }

    /*
     * Institución obligatoria
     * para asesores.
     */
    if (
        tipoActual !== 'Alumno' &&
        !d.institucion
    ) {

        alert(
            'La institución es obligatoria para un asesor.'
        );

        return;
    }

    /*
     * Validar fechas del alumno.
     */
    if (
        tipoActual === 'Alumno' &&
        d.fechaInicio &&
        d.fechaFin &&
        d.fechaFin < d.fechaInicio
    ) {

        alert(
            'La fecha de término no puede ser anterior a la fecha de inicio.'
        );

        return;
    }

    const id =
        getId(usuarioObjetivo);

    try {

        const r = await fetch(
            `${API}/usuario/${id}`,
            {
                method: 'PUT',

                headers: {
                    'Content-Type':
                        'application/json',

                    ...headers()
                },

                body:
                    JSON.stringify(d)
            }
        );

        const x =
            await r.json();

        if (!r.ok) {

            throw Error(
                x.mensaje ||
                'No se pudieron guardar los datos.'
            );
        }

        alert(
            x.mensaje ||
            'Datos guardados correctamente.'
        );


        /* =================================================
           ACTUALIZAR USUARIO ACTIVO
           ================================================= */

        usuarioActivo =
            JSON.parse(
                localStorage.getItem(
                    'usuarioActivo'
                ) || 'null'
            ) ||
            usuarioActivo;


        /*
         * Si los datos guardados pertenecen
         * al usuario que inició sesión,
         * actualizar la información local.
         */
        if (
            id === getId(usuarioActivo)
        ) {

            /*
             * Actualizar nombre.
             */
            if (x.datos) {

                usuarioActivo.nombreCompleto =
                    x.datos.nombreCompleto ||
                    usuarioActivo.nombreCompleto;
            }


            /*
             * MARCAR LOS DATOS DE REGISTRO
             * COMO COMPLETOS.
             *
             * Esto evita que
             * permisos-globales.js vuelva
             * a mandar al usuario a
             * datos-academicos.html.
             */
            usuarioActivo.datosAcademicosCompletos =
                true;

            usuarioActivo.perfilAcademicoCompletado =
                true;


            /*
             * Guardar la sesión actualizada.
             */
            localStorage.setItem(
                'usuarioActivo',
                JSON.stringify(
                    usuarioActivo
                )
            );


            /*
             * Guardar también una copia local
             * de los datos completos.
             */
            localStorage.setItem(
                `datosAcademicosPMO_${id}`,
                JSON.stringify({
                    ...d,
                    completo: true,
                    datosAcademicosCompletos: true,
                    perfilAcademicoCompletado: true
                })
            );
        }

    } catch (err) {

        console.error(
            'Error al guardar:',
            err
        );

        alert(
            err.message
        );
    }
}


/* =========================================================
   ESCAPAR TEXTO
   ========================================================= */

function esc(v) {

    return String(v ?? '')
        .replace(
            /[&<>'"]/g,
            c => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[c])
        );
}


/* =========================================================
   INICIALIZAR PÁGINA
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        /*
         * Obtener usuario de la sesión.
         */
        usuarioActivo =
            JSON.parse(
                localStorage.getItem(
                    'usuarioActivo'
                ) || 'null'
            );


        /*
         * Si no existe sesión,
         * regresar al login.
         */
        if (!usuarioActivo) {

            location.href =
                'login.html';

            return;
        }


        /*
         * Inicialmente la persona objetivo
         * es quien inició sesión.
         */
        usuarioObjetivo =
            usuarioActivo;


        /*
         * Configurar inmediatamente
         * el tipo según el rol.
         */
        setTipo(
            inferirTipo(
                usuarioActivo
            )
        );

        configurarTiposPorRol();


        /* =================================================
           BOTONES DE TIPO
           ================================================= */

        document
            .querySelectorAll('.tipo-tab')
            .forEach(boton => {

                boton.addEventListener(
                    'click',
                    () => {

                        /*
                         * Solo un administrador
                         * puede cambiar manualmente
                         * el tipo.
                         */
                        if (!esAdmin()) {
                            return;
                        }

                        setTipo(
                            boton.dataset.tipo
                        );
                    }
                );
            });


        /* =================================================
           SELECTOR DE PERSONA PARA ADMINISTRADOR
           ================================================= */

        $('personaRegistro')
            ?.addEventListener(
                'change',
                async () => {

                    const idSeleccionado =
                        $('personaRegistro').value;

                    usuarioObjetivo =
                        usuarios.find(
                            u =>
                                String(u.id) ===
                                String(idSeleccionado)
                        ) || null;

                    if (usuarioObjetivo) {

                        await cargar();
                    }
                });


        /* =================================================
           FORMULARIO
           ================================================= */

        $('formDatosRegistro')
            ?.addEventListener(
                'submit',
                guardar
            );


        /* =================================================
           BOTÓN VOLVER
           ================================================= */

        $('btnVolver')
            ?.addEventListener(
                'click',
                () => {

                    location.href =
                        'dashboard.html';

                });


        /* =================================================
           CARGAR USUARIOS
           ================================================= */

        await cargarUsuarios();


        /* =================================================
           CARGAR DATOS DEL USUARIO
           ================================================= */

        await cargar();

    }
);