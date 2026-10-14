(function(){
    'use strict';
    let pendiente=false;
    async function actualizar(){
        const token=window.obtenerTokenSesionPMO?.();if(!token||pendiente||document.hidden)return;
        let usuario;try{usuario=JSON.parse(localStorage.getItem('usuarioActivo')||'null');}catch(_){return;}
        const rol=String(usuario?.rol?.nombre||usuario?.rol||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
        if(!['superadministrador','administrador','admin pmo','admin_pmo','administrador pmo','directivo escolar','directivo','asesor academico','asesor empresarial','colaborador','alumno','alumna','estudiante','estudiante pmo'].includes(rol))return;
        const menu=document.querySelector('.sidebar-menu');if(!menu)return;
        let enlace=document.getElementById('pmoAutomatizacionesEnlace');if(!enlace){enlace=document.createElement('a');enlace.id='pmoAutomatizacionesEnlace';enlace.href='automatizaciones.html';enlace.textContent='Avance y automatizaciones';menu.appendChild(enlace);}
        pendiente=true;
        try{const r=await fetch(window.apiUrl('/api/automatizaciones/mis-recordatorios'));if(!r.ok)return;const d=await r.json();if(window.obtenerTokenSesionPMO()!==token)return;
            const cantidad=(d.recordatorios||[]).filter(a=>a.estado==='Abierto').length;enlace.textContent='Avance y automatizaciones'+(cantidad?` · ${cantidad} avisos`:'');
        }catch(_){}finally{pendiente=false;}
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(actualizar,1500);});else setTimeout(actualizar,1500);
    setInterval(actualizar,60000);
    window.addEventListener('focus',actualizar);
})();
