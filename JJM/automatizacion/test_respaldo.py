import importlib.util
import json
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('agente',Path(__file__).with_name('respaldo_servidor.py'))
agente=importlib.util.module_from_spec(spec);spec.loader.exec_module(agente)
CARPETA_PRUEBAS=Path(__file__).resolve().parent/'tmp_pruebas'
CARPETA_PRUEBAS.mkdir(exist_ok=True)
temporal=lambda:tempfile.TemporaryDirectory(dir=CARPETA_PRUEBAS)

class RespaldoTest(unittest.TestCase):
    def test_no_retira_produccion_ni_contenedor_sin_etiqueta_propia(self):
        with patch.object(agente,'comando',return_value=json.dumps([{'Config':{'Labels':{}}}]).encode()) as ejecutar:
            agente.limpiar_contenedor('produccion','prueba','produccion')
            ejecutar.assert_not_called()
            with self.assertRaises(RuntimeError):agente.limpiar_contenedor('ajeno','prueba','produccion')
            self.assertFalse(any(c.args[0][1]=='rm' for c in ejecutar.call_args_list))
    def test_restauracion_solo_en_mysql_aislado_y_sin_volumen_productivo(self):
        llamadas=[]
        def ejecutar(args,**kw):
            llamadas.append(args)
            if args[1]=='inspect' and '--format' in args:return b'sha256:imagen_local'
            if args[1]=='run':return b'temporal'
            if args[1]=='inspect':return json.dumps([{'Config':{'Labels':{'jjm.respaldo.prueba':'prueba'}}}]).encode()
            return b''
        with temporal() as tmp:
            sql=Path(tmp)/'entrada.sql';sql.write_text('SELECT 1;')
            with patch.object(agente,'comando',side_effect=ejecutar),patch.object(agente,'mysql',side_effect=["1\n","usuarios\t13\ndocumentos\t40\nregistros_horas\t300\ncursos\t5\n"]):
                cuentas=agente.verificar_restauracion('produccion',sql,Path(tmp),'prueba')
        crear=next(c for c in llamadas if c[1]=='run');self.assertEqual(crear[crear.index('--network')+1],'none');self.assertEqual(crear[crear.index('-v')+1],'/var/lib/mysql');self.assertNotIn('produccion',crear);self.assertEqual(cuentas['documentos'],40);self.assertIn(['docker','rm','-f','-v','temporal'],llamadas)
    def test_fallo_de_restauracion_se_registra_como_error_y_no_como_verificado(self):
        estados=[]
        def ejecutar(args,**kw):
            if args[-2:]==['id','-g']:return b'1000'
            if 'mysqldump' in args:kw['stdout'].write(b'CREATE TABLE usuarios (id INT);\n'*10)
            return b''
        with temporal() as tmp,patch.object(agente,'comando',side_effect=ejecutar),patch.object(agente.os,'chown',create=True),patch.object(agente,'registrar',side_effect=lambda db,i,e,*a,**k:estados.append(e)),patch.object(agente,'verificar_restauracion',side_effect=RuntimeError('Falló la restauración')):
            with self.assertRaises(RuntimeError):agente.respaldar('produccion',Path(tmp),'backend')
            self.assertFalse(list(Path(tmp).glob('*.sql.gz')))
        self.assertEqual(estados,['En proceso','Error'])
    def test_copia_verificada_contiene_sql_integral_y_manifest_sha256(self):
        estados=[]
        def ejecutar(args,**kw):
            if args[-2:]==['id','-g']:return b'1000'
            if 'mysqldump' in args:kw['stdout'].write(b'CREATE TABLE usuarios (id INT);\n'*10)
            return b''
        with temporal() as tmp,patch.object(agente,'comando',side_effect=ejecutar),patch.object(agente.os,'chown',create=True),patch.object(agente,'registrar',side_effect=lambda db,i,e,*a,**k:estados.append(e)),patch.object(agente,'verificar_restauracion',return_value={'usuarios':13}):
            agente.respaldar('produccion',Path(tmp),'backend')
            archivo=next(Path(tmp).glob('*.sql.gz'));manifest=json.loads(next(Path(tmp).glob('*.json')).read_text(encoding='utf-8'))
            self.assertEqual(manifest['sha256'],agente.sha_archivo(archivo));self.assertTrue(manifest['restauracion_verificada'])
            with agente.gzip.open(archivo,'rb') as f:self.assertEqual(f.read(),b'CREATE TABLE usuarios (id INT);\n'*10)
        self.assertEqual(estados,['En proceso','Verificado'])
    def test_retencion_conserva_tres_copias_y_no_toca_archivos_ajenos(self):
        with temporal() as tmp,patch.object(agente,'mysql'):
            carpeta=Path(tmp);ajeno=carpeta/'importante.sql';ajeno.write_text('conservar')
            for i in range(5):
                f=carpeta/f'jjm_20260901T03000{i}_0123abcd.sql.gz';f.write_bytes(b'copia');os.utime(f,(time.time()-40*86400-i,time.time()-40*86400-i))
            agente.rotar(carpeta,'produccion');self.assertEqual(len(list(carpeta.glob('*.sql.gz'))),3);self.assertEqual(ajeno.read_text(),'conservar')
    def test_valores_sql_se_codifican_sin_interpolar_comillas(self):
        valor=agente.literal("archivo'); DROP TABLE usuarios; --")
        self.assertNotIn('DROP TABLE',valor);self.assertTrue(valor.startswith('CONVERT(0x'));self.assertEqual(agente.literal(None),'NULL')

if __name__=='__main__':unittest.main()
