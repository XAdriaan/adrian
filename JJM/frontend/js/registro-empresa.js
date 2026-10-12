(function () {
    const formulario = document.getElementById('registroEmpresaForm'), mensaje = document.getElementById('registroEmpresaMensaje'), boton = document.getElementById('registrarEmpresaBtn');
    const valor = id => document.getElementById(id).value;
    const servicio = new URLSearchParams(window.location.search).get('servicio');
    if (['planeacion','seguimiento','soluciones','formacion','cierre'].includes(servicio)) {
        try { sessionStorage.setItem('servicioEmpresaPMO',servicio); } catch (_) {}
    }
    let pendiente = false;
    const mostrar = (texto, correcto = false) => { mensaje.textContent = texto; mensaje.hidden = false; mensaje.classList.toggle('success', correcto); };
    document.querySelectorAll('[data-password]').forEach(item => item.addEventListener('click', () => {
        const campo = document.getElementById(item.dataset.password), visible = campo.type === 'password';
        campo.type = visible ? 'text' : 'password'; item.textContent = visible ? 'Ocultar' : 'Mostrar'; item.setAttribute('aria-pressed', String(visible));
    }));
    formulario.addEventListener('submit', async event => {
        event.preventDefault(); if (pendiente) return; mensaje.hidden = true;
        if (valor('contrasena') !== valor('confirmar')) { mostrar('Las contraseñas no coinciden.'); return; }
        if (new TextEncoder().encode(valor('contrasena')).length > 72) { mostrar('La contraseña es demasiado larga. Utiliza un máximo de 72 bytes.'); return; }
        if (![valor('empresa'), valor('nombre'), valor('apellido')].every(v => v.trim())) { mostrar('Completa el nombre de la empresa y los datos del contacto.'); return; }
        pendiente = true; boton.disabled = true; boton.textContent = 'Creando la cuenta…';
        const controlador = new AbortController(), tiempo = setTimeout(() => controlador.abort(), 20000);
        try {
            const respuesta = await fetch('/api/auth/registro-empresa', {method:'POST', signal:controlador.signal, headers:{'Content-Type':'application/json'}, body:JSON.stringify({empresa:valor('empresa').trim(),nombre:valor('nombre').trim(),apellido:valor('apellido').trim(),correo:valor('correo').trim().toLowerCase(),telefono:valor('telefono').trim(),contrasena:valor('contrasena')})});
            const datos = await respuesta.json();
            if (!respuesta.ok) throw new Error(datos.mensaje || datos.detail || datos.message || 'No se pudo crear la cuenta empresarial.');
            mostrar('Empresa registrada correctamente. Inicia sesión para registrar tu proyecto.', true); formulario.reset(); formulario.hidden = true;
        } catch (error) { mostrar(error.name === 'AbortError' ? 'El servidor tardó en responder. Comprueba si ya se creó tu cuenta antes de volver a enviarla.' : error.message); }
        finally { clearTimeout(tiempo); pendiente = false; boton.disabled = false; boton.textContent = 'Crear cuenta empresarial ↗'; }
    });
})();
