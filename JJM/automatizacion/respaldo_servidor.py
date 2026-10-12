#!/usr/bin/env python3
"""Respaldo de oficina_proyectos y sus documentos, con restauración aislada de prueba."""
import argparse
import datetime as dt
try:
    import fcntl
except ImportError:
    fcntl = None
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import tempfile
import time
from zoneinfo import ZoneInfo

ZONA = ZoneInfo('America/Mexico_City')
PATRON = re.compile(r'jjm_([0-9]{8}T[0-9]{6}_[0-9a-f]{8})\.(sql\.gz|json)\Z')
AUTENTICAR = '''
if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
  echo 'No se encontró la credencial de respaldo del contenedor MySQL.' >&2
  exit 3
fi
export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
exec "$@"
'''


def comando(args, **kw):
    r = subprocess.run(args, stdout=kw.pop('stdout', subprocess.PIPE), stderr=subprocess.PIPE,
                       timeout=kw.pop('timeout', 120), **kw)
    if r.returncode:
        raise RuntimeError('Falló ' + args[0] + ': ' + r.stderr.decode('utf-8', 'replace')[-1200:])
    return r.stdout


def mysql(contenedor, sql):
    return comando(['docker', 'exec', contenedor, 'sh', '-c', AUTENTICAR, 'sh',
                    'mysql', '-u', 'root', '--batch', '--skip-column-names', '-e', sql]).decode('utf-8')


def literal(v):
    if v is None:
        return 'NULL'
    return "CONVERT(0x" + str(v).encode('utf-8').hex() + " USING utf8mb4) COLLATE utf8mb4_unicode_ci"


def registrar(db, identificador, estado, archivo=None, firma=None, bytes_=None, detalle=''):
    valores = ','.join(map(literal, [identificador, archivo, firma, bytes_, estado, detalle]))
    fecha = literal(dt.datetime.now(ZONA).strftime('%Y-%m-%d %H:%M:%S'))
    verificado = fecha if estado == 'Verificado' else 'NULL'
    mysql(db, 'INSERT INTO oficina_proyectos.pmo_respaldos'
              '(id,archivo,sha256,bytes,estado,detalle,creado_en,verificado_en) VALUES ('
              + valores + ',' + fecha + ',' + verificado + ') '
              'ON DUPLICATE KEY UPDATE archivo=VALUES(archivo),sha256=VALUES(sha256),'
              'bytes=VALUES(bytes),estado=VALUES(estado),detalle=VALUES(detalle),verificado_en=VALUES(verificado_en)')


def sha_archivo(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for bloque in iter(lambda: f.read(1024 * 1024), b''):
            h.update(bloque)
    return h.hexdigest()


def limpiar_contenedor(contenedor, identificador, produccion):
    if not contenedor or contenedor == produccion:
        return
    info = json.loads(comando(['docker', 'inspect', contenedor]))[0]
    if info['Config'].get('Labels', {}).get('jjm.respaldo.prueba') != identificador:
        raise RuntimeError('No se retiró el contenedor: su etiqueta no coincide con esta prueba.')
    comando(['docker', 'rm', '-f', '-v', contenedor])


def verificar_restauracion(db, sql, carpeta, identificador):
    imagen = comando(['docker', 'inspect', '--format', '{{.Image}}', db]).decode().strip()
    nombre = 'jjm-verificar-' + identificador.lower()
    contenedor = None
    with tempfile.TemporaryDirectory(prefix='verificacion_', dir=carpeta) as temporal:
        env = Path(temporal) / 'mysql.env'
        env.write_text('MYSQL_ROOT_PASSWORD=' + secrets.token_urlsafe(36) + '\n', encoding='utf-8')
        env.chmod(0o600)
        try:
            contenedor = comando(['docker', 'run', '-d', '--name', nombre, '--network', 'none',
                                  '--memory', '1g', '--cpus', '1', '-v', '/var/lib/mysql',
                                  '--label', 'jjm.respaldo.prueba=' + identificador,
                                  '--env-file', str(env), imagen,
                                  '--innodb-buffer-pool-size=128M', '--max-connections=10']).decode().strip()
            limite = time.monotonic() + 180
            while True:
                try:
                    mysql(contenedor, 'SELECT 1;')
                    break
                except RuntimeError:
                    if time.monotonic() >= limite:
                        raise RuntimeError('El MySQL aislado no terminó de iniciar para la verificación.')
                    time.sleep(3)
            with open(sql, 'rb') as entrada:
                comando(['docker', 'exec', '-i', contenedor, 'sh', '-c', AUTENTICAR, 'sh',
                         'mysql', '-u', 'root', '--binary-mode'], stdin=entrada, timeout=900)
            filas = mysql(contenedor, '''
SELECT 'usuarios', COUNT(*) FROM oficina_proyectos.usuarios
UNION ALL SELECT 'documentos', COUNT(*) FROM oficina_proyectos.documentos_usuario
UNION ALL SELECT 'registros_horas', COUNT(*) FROM oficina_proyectos.registros_horas
UNION ALL SELECT 'cursos', COUNT(*) FROM oficina_proyectos.progreso_cursos_usuario;
''')
            return {nombre: int(total) for nombre, total in (f.split('\t') for f in filas.strip().splitlines())}
        finally:
            limpiar_contenedor(contenedor, identificador, db)


def rotar(carpeta, db, dias=30):
    limite = time.time() - dias * 86400
    copias = sorted((p for p in carpeta.iterdir() if PATRON.fullmatch(p.name)
                     and p.name.endswith('.sql.gz') and not p.is_symlink()), key=lambda p: p.stat().st_mtime)
    # Mantiene al menos tres copias, incluso después de una interrupción prolongada.
    for p in copias[:-3]:
        if p.stat().st_mtime >= limite:
            continue
        if p.resolve().parent != carpeta.resolve():
            raise RuntimeError('La ruta del respaldo no coincide con la carpeta autorizada.')
        identificador = PATRON.fullmatch(p.name).group(1)
        p.unlink()
        manifest = carpeta / ('jjm_' + identificador + '.json')
        if manifest.is_file() and not manifest.is_symlink() and manifest.resolve().parent == carpeta.resolve():
            manifest.unlink()
        mysql(db, "UPDATE oficina_proyectos.pmo_respaldos SET estado='Retirado',detalle='Retirado por la retención de 30 días.' WHERE id=" + literal(identificador))


def respaldar(db, carpeta, backend):
    if carpeta.is_symlink():
        raise RuntimeError('La carpeta de respaldos debe ser una carpeta real.')
    carpeta.mkdir(parents=True, exist_ok=True)
    carpeta.chmod(0o750)
    gid = int(comando(['docker', 'exec', backend, 'id', '-g']).decode().strip())
    os.chown(carpeta, 0, gid)
    if shutil.disk_usage(carpeta).free < 512 * 1024 * 1024:
        raise RuntimeError('Queda menos de 512 MB libres para preparar el respaldo.')
    identificador = dt.datetime.now(ZONA).strftime('%Y%m%dT%H%M%S') + '_' + secrets.token_hex(4)
    archivo = carpeta / ('jjm_' + identificador + '.sql.gz')
    registrar(db, identificador, 'En proceso', detalle='Preparando la copia y la restauración de prueba.')
    try:
        with tempfile.TemporaryDirectory(prefix='preparacion_', dir=carpeta) as temporal:
            sql = Path(temporal) / 'respaldo.sql'
            with open(sql, 'wb') as salida:
                comando(['docker', 'exec', db, 'sh', '-c', AUTENTICAR, 'sh',
                         'mysqldump', '-u', 'root', '--single-transaction', '--no-tablespaces',
                         '--set-gtid-purged=OFF', '--routines', '--events', '--triggers',
                         '--hex-blob', '--default-character-set=utf8mb4', '--databases',
                         'oficina_proyectos'], stdout=salida, timeout=900)
            if sql.stat().st_size < 100:
                raise RuntimeError('El volcado SQL está vacío o incompleto.')
            cuentas = verificar_restauracion(db, sql, carpeta, identificador)
            parcial = Path(temporal) / archivo.name
            with open(sql, 'rb') as entrada, gzip.open(parcial, 'wb', compresslevel=6) as salida:
                shutil.copyfileobj(entrada, salida, 1024 * 1024)
            firma_sql = hashlib.sha256()
            with gzip.open(parcial, 'rb') as entrada:
                for bloque in iter(lambda: entrada.read(1024 * 1024), b''):
                    firma_sql.update(bloque)
            if firma_sql.hexdigest() != sha_archivo(sql):
                raise RuntimeError('La copia comprimida no coincide con el SQL restaurado.')
            parcial.chmod(0o640)
            os.chown(parcial, 0, gid)
            os.replace(parcial, archivo)
            firma = sha_archivo(archivo)
            manifest = carpeta / ('jjm_' + identificador + '.json')
            manifest.write_text(json.dumps({'id': identificador, 'sha256': firma,
                                'restauracion_verificada': True, 'registros': cuentas,
                                'alcance': 'Base de datos, cartas y PDF almacenados en MySQL.'},
                                ensure_ascii=False, indent=2), encoding='utf-8')
            manifest.chmod(0o640)
            os.chown(manifest, 0, gid)
            registrar(db, identificador, 'Verificado', archivo.name, firma, archivo.stat().st_size,
                      'Restauración de prueba completada. ' + json.dumps(cuentas, ensure_ascii=False))
        rotar(carpeta, db)
        print('RESPALDO VERIFICADO:', archivo.name)
    except Exception as error:
        try:
            registrar(db, identificador, 'Error', detalle=str(error)[-1500:])
        except Exception:
            pass
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--database', default='fn5h9fg7izsbaklafagetfba')
    parser.add_argument('--directory', default='/srv/jjm-respaldos')
    args = parser.parse_args()
    if fcntl is None or not hasattr(os, 'geteuid') or os.geteuid() != 0:
        raise RuntimeError('Ejecuta la tarea como root en localhost del servidor.')
    backend = comando(['docker', 'ps', '-q', '--filter', 'name=backend-io2gkuqufgfedv8ybqlocs2r']).decode().split()
    if len(backend) != 1:
        raise RuntimeError('Espera que el despliegue termine y haya un solo backend activo.')
    carpeta = Path(args.directory).absolute()
    if carpeta.is_symlink():
        raise RuntimeError('La carpeta de respaldos no puede ser un enlace simbólico.')
    carpeta.mkdir(parents=True, exist_ok=True)
    with open(carpeta / '.respaldo.lock', 'a') as bloqueo:
        os.chmod(bloqueo.name, 0o600)
        try:
            fcntl.flock(bloqueo, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('Ya hay un respaldo en curso; no se repite.')
            return
        respaldar(args.database, carpeta, backend[0])


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('No se completó el respaldo:', error)
        raise SystemExit(1)
