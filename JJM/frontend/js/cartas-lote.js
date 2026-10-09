/* Generación por alumno, con una acción de administración para el lote del filtro. */
(function () {
    const tipos = ["Carta de aceptación", "Carta de término"];
    let ocupado = false;
    const limpiar = value => String(value || "").trim();
    const idUsuario = miembro => miembro.idUsuario ?? miembro.id_usuario;
    function datosFaltantes(datos) {
        return ["nombreCompleto", "matricula", "universidad", "carrera", "cuatrimestre", "fechaInicio", "fechaFin"]
            .filter(campo => !limpiar(datos[campo]));
    }
    function mismoPeriodo(a, b) {
        const fecha = d => limpiar(d?.fechaInicio).slice(0,10) + "|" + limpiar(d?.fechaFin).slice(0,10);
        return fecha(a) === fecha(b);
    }
    function existente(miembro,tipo,datos) {
        return documentosPMO.find(doc => String(doc.idUsuario) === String(idUsuario(miembro))
            && doc.tipoDocumento === tipo && doc.generadoAutomaticamente
            && mismoPeriodo(doc.datosAcademicos,datos) && doc.estado === "Liberada");
    }
    async function generarParaAlumno(miembro,tipo,observaciones="") {
        if (!puedeValidarDocumentos()) throw new Error("No tienes permiso para liberar documentos.");
        if (![...tipos,"Reporte de desempeño"].includes(tipo)) throw new Error("Selecciona un documento válido.");
        const datos = obtenerDatosAcademicosMiembroDocumentos(miembro);
        const faltantes = datosFaltantes(datos);
        if (!idUsuario(miembro)) throw new Error("No se encontró la cuenta del alumno.");
        if (faltantes.length) throw new Error("Debe completar sus datos académicos: " + faltantes.join(", ") + ".");
        if (existente(miembro,tipo,datos)) return { omitida: true, motivo: "Ya tiene una carta liberada para este periodo." };
        const nombre = obtenerNombreMiembroDocumentos(miembro).replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g,"").trim().replace(/\s+/g,"_");
        const nombreArchivo = tipo.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ /g,"_") + "_" + nombre + ".pdf";
        const archivo = tipo === "Carta de aceptación"
            ? await generarCartaAceptacionPDFBase64(datos,miembro,nombreArchivo)
            : await convertirCartaHTMLaPDFBase64(generarDocumentoPersonalizadoHTML(tipo,datos,miembro),nombreArchivo);
        const resultado = await guardarDocumentoBackend({ idUsuario:idUsuario(miembro),
            tipoDocumento:tipo,nombreArchivo,archivoBase64:archivo,mimeType:"application/pdf",estado:"Liberada",
            generadoAutomaticamente:true,datosAcademicos:datos,
            observaciones:limpiar(observaciones) || `${tipo} generada y liberada por administración.` });
        const documento = resultado.documento || resultado.data;
        if (!documento?.id) throw new Error("El servidor no confirmó el documento guardado.");
        const index = documentosPMO.findIndex(doc => String(doc.id) === String(documento.id));
        if (index >= 0) documentosPMO[index] = documento; else documentosPMO.push(documento);
        return { omitida: resultado.yaExistente === true, documento };
    }
    async function ejecutarLote(alumnos,tipo,progreso=()=>{}) {
        const resultados=[];
        // Secuencial: un PDF y una escritura a la vez; un fallo no oculta los demás.
        for (const alumno of [...alumnos]) {
            const nombre=obtenerNombreMiembroDocumentos(alumno);
            try {
                const r=await generarParaAlumno(alumno,tipo);
                resultados.push({nombre,estado:r.omitida?"Ya liberada":"Liberada"});
            } catch (error) { resultados.push({nombre,estado:"Pendiente",motivo:error.message}); }
            progreso(resultados.length,alumnos.length);
        }
        return resultados;
    }
    function mostrarResultado(panel,resultados) {
        const liberadas=resultados.filter(r=>r.estado==="Liberada").length;
        const pendientes=resultados.filter(r=>r.estado==="Pendiente").length;
        const omitidas=resultados.length-liberadas-pendientes;
        panel.textContent=`Resultado: ${liberadas} liberadas, ${omitidas} ya liberadas y ${pendientes} pendientes.`;
        const lista=document.createElement("ul");
        resultados.forEach(r=>{const fila=document.createElement("li");fila.textContent=`${r.nombre}: ${r.estado}${r.motivo?". "+r.motivo:""}`;lista.appendChild(fila);});
        panel.appendChild(lista);
    }
    window.CartasLotePMO={generarParaAlumno,ejecutarLote,datosFaltantes,mismoPeriodo};
    async function operar(generar) {
        if (ocupado || !puedeValidarDocumentos()) return;
        const alumnos=[...obtenerAlumnosFiltradosDocumentos()];
        const tipo=document.getElementById("tipoCartaLote").value;
        const panel=document.getElementById("resultadoCartasLote");
        if (!alumnos.length) { panel.textContent="No hay alumnos en el filtro seleccionado.";return; }
        const periodo=document.getElementById("filtroPersonaDocumentos")?.selectedOptions?.[0]?.textContent || "el filtro actual";
        const anio=document.getElementById("anioExpedientes")?.value || "todos los años";
        if (!confirm(`${generar?"Generar y liberar":"Liberar las cartas ya generadas de"} ${tipo.toLowerCase()} para ${alumnos.length} alumnos de ${periodo}, ${anio}? Las cartas ya liberadas no se duplicarán.`)) return;
        ocupado=true;
        const botones=[document.getElementById("generarCartasLote"),document.getElementById("liberarCartasLote")];
        botones.forEach(b=>b.disabled=true);
        const avanzar=(n,total)=>panel.textContent=`Procesando ${n} de ${total}. Mantén abierta esta página hasta terminar.`;
        let resultados=[];
        try {
            if (generar) resultados=await ejecutarLote(alumnos,tipo,avanzar);
            else {
                for (const alumno of alumnos) {
                    const datos=obtenerDatosAcademicosMiembroDocumentos(alumno);
                    const cartas=documentosPMO.filter(doc=>String(doc.idUsuario)===String(idUsuario(alumno))
                        && doc.tipoDocumento===tipo && doc.generadoAutomaticamente && mismoPeriodo(doc.datosAcademicos,datos));
                    const pendientes=cartas.filter(doc=>doc.estado!=="Liberada");
                    try {
                        if (!cartas.length) throw new Error("Todavía no tiene la carta generada. Utiliza Generar y liberar.");
                        for (const carta of pendientes) {
                            const respuesta=await fetch(`${API_DOCUMENTOS}/${carta.id}/revision`,{
                                method:"PUT",headers:{"Content-Type":"application/json",...obtenerHeadersDocumentos()},
                                body:JSON.stringify({estado:"Liberada",observaciones:carta.observaciones || "Liberada por administración."})});
                            const r=await obtenerJSONDocumentos(respuesta);
                            if (!respuesta.ok) throw new Error(r.mensaje||"No fue posible liberar la carta.");
                            if(r.documento)Object.assign(carta,r.documento);
                        }
                        resultados.push({nombre:obtenerNombreMiembroDocumentos(alumno),estado:pendientes.length?"Liberada":"Ya liberada"});
                    } catch(error){resultados.push({nombre:obtenerNombreMiembroDocumentos(alumno),estado:"Pendiente",motivo:error.message});}
                    avanzar(resultados.length,alumnos.length);
                }
            }
            guardarDocumentosStorage();renderizarDocumentos();mostrarResultado(panel,resultados);
        } finally {ocupado=false;botones.forEach(b=>b.disabled=false);}
    }
    document.addEventListener("DOMContentLoaded",()=>{
        const panel=document.getElementById("panelCartasLote");
        if(!panel)return;
        panel.hidden=!puedeValidarDocumentos();
        document.getElementById("generarCartasLote").addEventListener("click",()=>operar(true));
        document.getElementById("liberarCartasLote").addEventListener("click",()=>operar(false));
    });
})();
