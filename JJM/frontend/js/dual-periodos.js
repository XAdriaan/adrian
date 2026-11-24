(function(root){
 'use strict';
 const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
 const duraciones={Bimestral:2,Trimestral:3,Cuatrimestral:4,Semestral:6};
 const universidades={UAM:'Universidad Autónoma Metropolitana',UPT:'Universidad Politécnica de Tecámac',UTT:'Universidad Tecnológica de Tecámac',IPN:'Instituto Politécnico Nacional',UNAM:'Universidad Nacional Autónoma de México'};
 const pad=n=>String(n).padStart(2,'0');
 function periodos(tipo,anio){const n=duraciones[tipo];anio=Number(anio);if(!n||!Number.isInteger(anio)||anio<2000||anio>2100)return [];return Array.from({length:12/n},(_,i)=>{const desde=i*n,hasta=desde+n-1,ultimo=new Date(Date.UTC(anio,hasta+1,0)).getUTCDate();return {numero:i+1,inicio:`${anio}-${pad(desde+1)}-01`,fin:`${anio}-${pad(hasta+1)}-${ultimo}`,nombre:`${meses[desde]} – ${meses[hasta]} ${anio}`,meses:Array.from({length:n},(_,j)=>`${anio}-${pad(desde+j+1)}`)};});}
 function mesesPeriodo(inicio,fin){if(!/^\d{4}-\d{2}-\d{2}$/.test(inicio||'')||!/^\d{4}-\d{2}-\d{2}$/.test(fin||''))return [];let [a,m]=inicio.split('-').map(Number);const to=fin.slice(0,7),r=[];while(`${a}-${pad(m)}`<=to&&r.length<120){r.push({valor:`${a}-${pad(m)}`,nombre:meses[m-1]+' '+a});if(++m===13){m=1;a++;}}return r;}
 const api={meses,duraciones,universidades,periodos,mesesPeriodo};root.DualPeriodos=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
