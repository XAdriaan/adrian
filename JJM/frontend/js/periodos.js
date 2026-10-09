(() => {
    'use strict';
    const grupos=['enero-abril','mayo-agosto','septiembre-diciembre'];
    const nombres=['Enero–Abril','Mayo–Agosto','Septiembre–Diciembre'];
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    function clasificar(datos={}) {
        const texto=String(datos.periodoEstadia||datos.periodo_estadia||datos.periodo||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const aliases={ene:1,enero:1,feb:2,febrero:2,mar:3,marzo:3,abr:4,abril:4,may:5,mayo:5,jun:6,junio:6,jul:7,julio:7,ago:8,agosto:8,sep:9,sept:9,set:9,septiembre:9,setiembre:9,oct:10,octubre:10,nov:11,noviembre:11,dic:12,diciembre:12};
        const primero=texto.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sept|sep|set|oct|nov|dic)\b/);
        let mes=primero?aliases[primero[0]]:0;
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
