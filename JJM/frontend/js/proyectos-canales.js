(function(){
    let datos=[];const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    function pintar(){const n=document.getElementById('canalesEnProyectos');if(!n)return;const q=String(document.getElementById('buscarCanalProyecto').value||'').toLowerCase();n.innerHTML=datos.filter(p=>String((p.claveAsignada||'')+' '+p.nombre).toLowerCase().includes(q)).sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre),'es',{numeric:true})).map(p=>`<a href="canales-proyectos.html?id=${Number(p.id)}"><span>#</span><span>${esc(p.claveAsignada||p.etiquetaCorta||p.nombre)}</span></a>`).join('')||'<p>No hay canales disponibles.</p>';}
    window.addEventListener('pmo:proyectos-canales',e=>{datos=Array.isArray(e.detail)?e.detail:[];pintar();});
    document.addEventListener('DOMContentLoaded',()=>{document.getElementById('buscarCanalProyecto')?.addEventListener('input',pintar);const link=document.getElementById('abrirCanalProyecto'),id=Number(new URLSearchParams(location.search).get('id'));if(link&&id>0)link.href='canales-proyectos.html?id='+id;});
})();
