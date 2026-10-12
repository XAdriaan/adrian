(function () {
    const menu = document.querySelector('.menu-toggle');
    const nav = document.getElementById('public-nav');
    menu?.addEventListener('click', () => {
        const abierto = menu.getAttribute('aria-expanded') !== 'true';
        menu.setAttribute('aria-expanded', String(abierto)); nav?.classList.toggle('open', abierto);
    });
    nav?.addEventListener('click', event => {
        if (event.target.closest('a')) { nav.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); }
    });
    const botones = Array.from(document.querySelectorAll('[data-filter]'));
    const servicios = Array.from(document.querySelectorAll('[data-category]'));
    botones.forEach(boton => boton.addEventListener('click', () => {
        const filtro = boton.dataset.filter; let cantidad = 0;
        servicios.forEach(servicio => {
            servicio.hidden = filtro !== 'todos' && !servicio.dataset.category.split(' ').includes(filtro);
            if (!servicio.hidden) cantidad++;
        });
        botones.forEach(item => { const activo = item === boton; item.classList.toggle('selected', activo); item.setAttribute('aria-pressed', String(activo)); });
        document.querySelector('.filter-message').textContent = `${cantidad} servicios disponibles.`;
    }));
})();
