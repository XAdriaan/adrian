importScripts('../vendor/mediapipe/vision_bundle.js');
const {FilesetResolver,ImageSegmenter}=Vision;
let modelo;
self.onmessage=async({data})=>{
    try {
        if(data.tipo==='iniciar'){
            const archivos=await FilesetResolver.forVisionTasks(new URL('../vendor/mediapipe/wasm',self.location.href).href);
            modelo=await ImageSegmenter.createFromOptions(archivos,{baseOptions:{modelAssetPath:new URL('../vendor/mediapipe/selfie_segmenter_landscape.tflite',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',outputCategoryMask:false,outputConfidenceMasks:true,canvas:new OffscreenCanvas(256,144)});
            self.postMessage({tipo:'listo'});
        }else if(data.tipo==='fotograma' && modelo){
            modelo.segmentForVideo(data.imagen,data.tiempo,resultado=>{
                const mascara=resultado.confidenceMasks.at(-1);
                const valores=mascara.getAsFloat32Array().slice();
                self.postMessage({tipo:'mascara',epoca:data.epoca,ancho:mascara.width,alto:mascara.height,valores},[valores.buffer]);
            });
        }
    }catch(error){self.postMessage({tipo:'error',epoca:data.epoca,mensaje:error.message || 'No se pudo procesar el fondo.'});}
    finally{data.imagen?.close();}
};
