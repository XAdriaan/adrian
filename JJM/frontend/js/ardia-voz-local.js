(() => {
'use strict';
class VozLocal {
 constructor({vigente,estado,alTexto}){this.vigente=vigente;this.estado=estado;this.alTexto=alTexto;this.generacion=0;this.escuchando=false;}
 async disponible(){if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)throw Error('Este dispositivo no ofrece lectura en voz alta. Puedes seguir por texto.');return true;}
 detener(){this.generacion++;window.speechSynthesis?.cancel();this.reconocer?.abort();this.reconocer=null;this.escuchando=false;this.frase=null;}
 hablar(texto){this.detener();const g=this.generacion;if(!this.vigente())return;
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){this.estado('Tu navegador no ofrece lectura en voz alta. Usa la respuesta escrita.');return;}
  const partes=String(texto||'').slice(0,16000).match(/[^.!?\n]{1,200}(?:[.!?\n]|$)|[^.!?\n]{1,200}/g)||[];
  const siguiente=()=>{if(g!==this.generacion||!this.vigente())return;const parte=partes.shift();if(!parte){this.frase=null;this.estado('Lista para ayudarte');return;}
   const frase=new window.SpeechSynthesisUtterance(parte);this.frase=frase;frase.lang='es-MX';frase.rate=1;
   const voces=window.speechSynthesis.getVoices();frase.voice=voces.find(v=>v.localService&&/^es/i.test(v.lang))||voces.find(v=>/^es/i.test(v.lang))||null;
   frase.onend=siguiente;frase.onerror=()=>{if(g===this.generacion){this.estado('No se pudo leer la respuesta. Revisa el volumen y pulsa Escuchar respuesta.');this.detener();}};
   this.estado('Ard.IA está hablando · voz del dispositivo');window.speechSynthesis.speak(frase);
  };siguiente();
 }
 escuchar(){if(this.escuchando){this.reconocer?.stop();return;}this.detener();if(!this.vigente())return;const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){this.estado('El dictado no está disponible. Escribe tu pregunta; puedes escuchar la respuesta.');return;}
  const g=this.generacion,r=new R();this.reconocer=r;r.lang='es-MX';r.continuous=false;r.interimResults=false;
  r.onresult=e=>{if(g===this.generacion&&this.vigente()){const texto=Array.from(e.results).map(x=>x[0].transcript).join(' ');this.escuchando=false;this.estado('Pregunta recibida');this.alTexto(texto);}};
  r.onerror=e=>{if(g===this.generacion){this.escuchando=false;this.estado(e.error==='not-allowed'?'Permite el micrófono en el navegador para dictar.':'No se reconoció la voz. Puedes escribir tu pregunta.');}};
  r.onend=()=>{if(g===this.generacion){this.escuchando=false;this.estado('Lista para ayudarte');}};
  try{r.start();this.escuchando=true;this.estado('Te escucho…');}catch(_){this.escuchando=false;this.estado('No se pudo iniciar el dictado. Escribe tu pregunta.');}
 }
}
window.PMOVozArdia=VozLocal;
})();
