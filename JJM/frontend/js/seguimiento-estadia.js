const API_SEGUIMIENTO = window.apiUrl("/api/seguimiento-estadia");
const API_MIEMBROS_SEGUIMIENTO = window.apiUrl("/api/miembros");
const selectUsuario = document.getElementById("selectUsuario");
const estadoUsuario = document.getElementById("estadoUsuario");
const datosUsuario = document.getElementById("datosUsuario");
const panelGestion = document.getElementById("panelGestion");
const selectAsesor = document.getElementById("selectAsesor");
const inputEmpresa = document.getElementById("inputEmpresa");
const inputSatisfaccion = document.getElementById("inputSatisfaccion");
const btnGuardar = document.getElementById("btnGuardarConfiguracion");
const linkEmpresa = document.getElementById("linkEmpresa");
const linkSatisfaccion = document.getElementById("linkSatisfaccion");
const btnEmpresa = document.getElementById("btnEncuestaEmpresa");
const btnSatisfaccion = document.getElementById("btnEncuestaSatisfaccion");
const estadoEmpresa = document.getElementById("estadoEncuestaEmpresa");
const estadoSatisfaccion = document.getElementById("estadoEncuestaSatisfaccion");
const btnFoEst03 = document.getElementById("btnFoEst03");
const estadoFoEst03 = document.getElementById("estadoFoEst03");
const bloqueoEmpresa = document.getElementById("bloqueoEmpresa");
const bloqueoSatisfaccion = document.getElementById("bloqueoSatisfaccion");
const bloqueoFoEst03 = document.getElementById("bloqueoFoEst03");
let usuarios = [], asesores = [], seguimientos = {}, detalleActual = null;

document.addEventListener("DOMContentLoaded", async () => {
    const usuario = leerUsuario();
    if (!usuario) return location.replace("login.html");
    if (!puedeVer()) return location.replace("dashboard.html");
    await cargarInicial();
    selectUsuario.addEventListener("change", cargarSeleccionado);
    btnGuardar.addEventListener("click", guardarConfiguracion);
    btnEmpresa.addEventListener("click", () => alternarFormulario("empresa"));
    btnSatisfaccion.addEventListener("click", () => alternarFormulario("satisfaccion"));
    btnFoEst03?.addEventListener("click", () => alternarFormulario("foEst03"));
});
function leerUsuario(){try{return JSON.parse(localStorage.getItem("usuarioActivo"))||null}catch{return null}}
function normalizar(v){return String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function puedeVer(){return !!(window.PMOPermisos&&window.PMOPermisos.tiene("seguimiento.ver"))}
function puedeActualizar(){return !!(window.PMOPermisos&&window.PMOPermisos.tiene("seguimiento.actualizar"))}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
async function jsonFetch(url,opciones){const r=await fetch(url,opciones);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.mensaje||"No fue posible completar la operación.");return d}
async function cargarInicial(){
    try{
        const [m,s]=await Promise.all([jsonFetch(API_MIEMBROS_SEGUIMIENTO),jsonFetch(API_SEGUIMIENTO)]);
        const miembros=Array.isArray(m.miembros)?m.miembros:[];
        usuarios=miembros.map(x=>({id:x.idUsuario||x.usuarioId||x.usuario?.id,nombre:x.nombreCompleto||x.nombre||x.correo||"Usuario",correo:x.correo||x.usuario?.correo||"",rol:x.rolSistema||x.usuario?.rol?.nombre||""})).filter(x=>x.id!=null&&(!x.rol||normalizar(x.rol)==="colaborador"));
        asesores=Array.isArray(s.asesores)?s.asesores:[];seguimientos=s.seguimientos||{};
        usuarios.sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"));
        selectUsuario.innerHTML='<option value="">Selecciona un alumno...</option>'+usuarios.map(u=>`<option value="${esc(u.id)}">${esc(u.nombre)}${u.correo?" — "+esc(u.correo):""}</option>`).join("");
        selectAsesor.innerHTML='<option value="">Sin asesor asignado</option>'+asesores.map(a=>`<option value="${esc(a.id)}">${esc(a.nombre)}${a.correo?" — "+esc(a.correo):""}</option>`).join("");
        aplicarModoLectura();
    }catch(e){console.error(e);alert(e.message)}
}
function aplicarModoLectura(){const editar=puedeActualizar();[selectAsesor,inputEmpresa,inputSatisfaccion,btnGuardar].forEach(x=>x.disabled=!editar);if(!editar){btnGuardar.title="Tu rol tiene acceso de consulta únicamente."}}
async function cargarSeleccionado(){
    const id=selectUsuario.value;if(!id){estadoUsuario.className="status-banner warn";estadoUsuario.textContent="Selecciona un alumno para consultar su seguimiento.";datosUsuario.style.display="none";panelGestion.style.display="none";detalleActual=null;return}
    try{const d=await jsonFetch(`${API_SEGUIMIENTO}/usuario/${id}`);detalleActual={seguimiento:d.seguimiento||{},documentos:d.documentos||{}};renderActual()}catch(e){console.error(e);alert(e.message)}
}
function renderActual(){
    const id=selectUsuario.value,u=usuarios.find(x=>String(x.id)===String(id))||{},s=detalleActual?.seguimiento||{},docs=detalleActual?.documentos||{},listos=docs.completos===true;
    datosUsuario.style.display="grid";panelGestion.style.display="block";
    datosUsuario.innerHTML=`<div class="metric"><small>Alumno</small><strong>${esc(u.nombre)}</strong></div><div class="metric"><small>Correo</small><strong>${esc(u.correo||"—")}</strong></div><div class="metric"><small>Carta de presentación</small><strong>${docs.cartaPresentacion?"Aceptada":"Pendiente"}</strong></div><div class="metric"><small>Carta de aceptación</small><strong>${docs.cartaAceptacion?"Liberada":"Pendiente"}</strong></div><div class="metric"><small>Carta de término</small><strong>${docs.cartaTermino?"Liberada":"Pendiente"}</strong></div>`;
    const faltan=[];if(!docs.cartaPresentacion)faltan.push("carta de presentación aceptada");if(!docs.cartaAceptacion)faltan.push("carta de aceptación liberada");if(!docs.cartaTermino)faltan.push("carta de término liberada");
    estadoUsuario.className=`status-banner ${listos?"ok":"warn"}`;estadoUsuario.textContent=listos?"Documentación completa. Ya se pueden abrir y contestar los formularios individuales de este alumno.":"Los formularios permanecen bloqueados. Falta: "+faltan.join(", ")+".";
    selectAsesor.value=s.idAsesorEmpresarial??"";inputEmpresa.value=s.urlEmpresa||"";inputSatisfaccion.value=s.urlSatisfaccion||"";
    actualizarFormulario("empresa",s.empresa===true,s.fechaEmpresa,inputEmpresa.value,linkEmpresa,btnEmpresa,estadoEmpresa,bloqueoEmpresa,listos);
    actualizarFormulario("satisfaccion",s.satisfaccion===true,s.fechaSatisfaccion,inputSatisfaccion.value,linkSatisfaccion,btnSatisfaccion,estadoSatisfaccion,bloqueoSatisfaccion,listos);
    actualizarFoEst03(s.foEst03===true,s.fechaFoEst03);
}
function actualizarFormulario(tipo,hecho,fecha,url,link,boton,estado,bloqueo,listos){
    const puedeAbrir=listos&&/^https?:\/\//i.test(url||"");link.href=puedeAbrir?url:"#";link.classList.toggle("disabled",!puedeAbrir);
    boton.classList.toggle("done",hecho);boton.textContent=hecho?"✓ Contestado — desmarcar":"Marcar como contestado";boton.disabled=!puedeActualizar()||!listos||(!hecho&&!/^https?:\/\//i.test(url||""));
    estado.textContent=hecho?`Contestado por administración${fecha?" el "+new Date(fecha).toLocaleDateString("es-MX"):""}`:"Pendiente";
    if(!listos)bloqueo.textContent="Bloqueado hasta que las tres cartas requeridas estén liberadas.";else if(!url)bloqueo.textContent="Agrega y guarda el enlace individual para habilitar este formulario.";else bloqueo.textContent="";
}
function payloadActual(){const s=detalleActual?.seguimiento||{};return{urlEmpresa:inputEmpresa.value.trim()||null,urlSatisfaccion:inputSatisfaccion.value.trim()||null,idAsesorEmpresarial:selectAsesor.value?Number(selectAsesor.value):null,empresa:s.empresa===true,satisfaccion:s.satisfaccion===true,foEst03:s.foEst03===true,fechaEmpresa:s.fechaEmpresa||null,fechaSatisfaccion:s.fechaSatisfaccion||null,fechaFoEst03:s.fechaFoEst03||null}}
async function guardarConfiguracion(){if(!puedeActualizar())return alert("Tu rol solo puede consultar el seguimiento.");const id=selectUsuario.value;if(!id)return alert("Selecciona un alumno.");try{const d=await jsonFetch(`${API_SEGUIMIENTO}/usuario/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payloadActual())});detalleActual={seguimiento:d.seguimiento||{},documentos:d.documentos||detalleActual.documentos};seguimientos[String(id)]=detalleActual.seguimiento;renderActual();alert("Enlaces y asesor guardados correctamente.")}catch(e){alert(e.message)}}
function actualizarFoEst03(hecho,fecha){if(!btnFoEst03||!estadoFoEst03)return;btnFoEst03.classList.toggle("done",hecho);btnFoEst03.textContent=hecho?"✓ Evaluado — desmarcar":"Marcar como evaluado";btnFoEst03.disabled=!puedeActualizar();estadoFoEst03.textContent=hecho?`Evaluado por administración${fecha?" el "+new Date(fecha).toLocaleDateString("es-MX"):""}`:"Pendiente de evaluación";if(bloqueoFoEst03)bloqueoFoEst03.textContent="El archivo oficial puede descargarse en cualquier momento."}
async function alternarFormulario(tipo){if(!puedeActualizar())return alert("Tu rol solo puede consultar el seguimiento.");const id=selectUsuario.value;if(!id)return;const p=payloadActual();let clave,fecha;if(tipo==="foEst03"){clave="foEst03";fecha="fechaFoEst03";}else{if(!detalleActual?.documentos?.completos)return alert("Primero deben estar liberadas la carta de presentación, la carta de aceptación y la carta de término.");clave=tipo==="empresa"?"empresa":"satisfaccion";fecha=tipo==="empresa"?"fechaEmpresa":"fechaSatisfaccion";}p[clave]=!Boolean(p[clave]);p[fecha]=p[clave]?new Date().toISOString():null;try{const d=await jsonFetch(`${API_SEGUIMIENTO}/usuario/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});detalleActual={seguimiento:d.seguimiento||{},documentos:d.documentos||detalleActual.documentos};renderActual()}catch(e){alert(e.message)}}
