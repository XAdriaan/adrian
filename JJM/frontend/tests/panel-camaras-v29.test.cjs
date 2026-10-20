const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/sala-panel-camaras.js'),'utf8');
function entorno(saved,blocked=false){
 class El{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.listeners={};this.style={setProperty:(k,v)=>this.style[k]=v};}setAttribute(){}focus(){}showModal(){this.open=true}close(){this.open=false}append(...n){this.children.push(...n)}insertBefore(n){this.children.unshift(n)}addEventListener(k,f){this.listeners[k]=f}}
 const grid=new El('grid'),panel=new El('panel'),video=new El('video');panel.append(video);let almacen=saved;
 const document={body:new El("body"),querySelector:s=>s==='.sala-distribucion'?grid:panel,createElement:t=>new El(t)};
 vm.runInNewContext(source,{document,localStorage:{getItem:()=>{if(blocked)throw Error();return almacen},setItem:(k,v)=>{if(blocked)throw Error();almacen=v}}});
 const dialogo=document.body.children[0],form=dialogo.children[0];return {grid,panel,video,dialogo,selector:form.children[0].children[0],rango:form.children[1].children[0],reset:form.children[2],guardado:()=>JSON.parse(almacen)};
}
test('mover y redimensionar conserva los nodos de video y recuerda la preferencia',()=>{const e=entorno(null);e.selector.value='izquierda';e.selector.listeners.change();e.rango.value='300';e.rango.listeners.input();assert.equal(e.grid.dataset.camaras,'izquierda');assert.equal(e.grid.style['--ancho-camaras'],'300px');assert.equal(e.panel.children[1],e.video);const otro=entorno(JSON.stringify(e.guardado()));assert.equal(otro.selector.value,'izquierda');assert.equal(otro.rango.value,'300');otro.reset.listeners.click();assert.equal(otro.grid.dataset.camaras,'derecha');});
test('preferencia inválida o almacenamiento bloqueado no impide usar las cámaras',()=>{const e=entorno('{"posicion":"xxx","tamano":99999}');assert.equal(e.grid.dataset.camaras,'derecha');assert.equal(e.rango.value,'360');assert.doesNotThrow(()=>entorno(null,true));});

test('el menú abre en un diálogo fuera del panel cuando las cámaras están abajo',()=>{const e=entorno('{"posicion":"abajo","tamano":210}');e.panel.children[0].children[0].listeners.click({preventDefault(){}});assert.equal(e.dialogo.open,true);assert.ok(!e.panel.children.includes(e.dialogo));e.selector.value='derecha';e.selector.listeners.change();assert.equal(e.grid.dataset.camaras,'derecha');e.dialogo.children[1].listeners.click();assert.equal(e.dialogo.open,false);});
