(() => {
    'use strict';
    const grupos=['enero-abril','mayo-agosto','septiembre-diciembre'];
    const nombres=['Enero–Abril','Mayo–Agosto','Septiembre–Diciembre'];
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    function clasificar(datos={}) {
        const texto=String(datos.periodoEstadia||datos.periodo||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const primero=texto.match(new RegExp(meses.join('|')));
        let mes=primero?meses.indexOf(primero[0])+1:0;
        const inicio=String(datos.fechaInicio||datos.fecha_inicio||''),match=/^(\d{4})-(\d{2})-(\d{2})/.exec(inicio);
        const valida=match&&Number(match[2])>=1&&Number(match[2])<=12&&Number(match[3])>=1&&Number(match[3])<=new Date(Date.UTC(Number(match[1]),Number(match[2]),0)).getUTCDate();
        if(!mes&&valida)mes=Number(match[2]);
        const anioTexto=/\b(20\d{2})\b/.exec(texto);
        const anio=anioTexto?anioTexto[1]:(valida?match[1]:'');
        const indice=mes?Math.floor((mes-1)/4):-1;
        return {clave:indice>=0?grupos[indice]:'',nombre:indice>=0?nombres[indice]:'Sin periodo académico',anio};
    }
    window.PMOPeriodos={clasificar,grupos,nombres};
})();
