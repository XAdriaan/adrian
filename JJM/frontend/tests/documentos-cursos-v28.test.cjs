const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const fuente=fs.readFileSync(path.join(__dirname,'../js/documentos.js'),'utf8');
const inicio=fuente.indexOf('function esCertificadoCursoDocumento('),fin=fuente.indexOf('function renderizarMisDocumentos()',inicio);
const c={};vm.runInNewContext(fuente.slice(inicio,fin),c);
test('separa certificados de cursos sin excluir cartas o otros certificados',()=>{
 for(const tipo of ['Certificado de curso #23','Certificado de curso #1','Certificado de curso'])assert.equal(c.esCertificadoCursoDocumento({tipoDocumento:tipo}),true);
 for(const tipo of ['Carta de aceptación','Carta de liberación','Certificado médico','Reporte de actividades'])assert.equal(c.esCertificadoCursoDocumento({tipoDocumento:tipo}),false);
 assert.equal(c.esCertificadoCursoDocumento({tipo_documento:'Certificado de curso #8'}),true);
});
