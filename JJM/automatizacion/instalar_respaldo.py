#!/usr/bin/env python3
"""Instala el agente revisado que acompaña a este archivo; no modifica MySQL de producción."""
import os
from pathlib import Path
import shutil
import subprocess
import sys

def instalar():
    if os.geteuid()!=0:
        raise RuntimeError('Ejecuta esta guía en la terminal localhost como root.')
    if not shutil.which('docker') or not shutil.which('systemctl'):
        raise RuntimeError('Este instalador necesita Docker y systemd del servidor de Coolify.')
    origen=Path(__file__).resolve().parent/'respaldo_servidor.py'
    if not origen.is_file():
        raise RuntimeError('Falta respaldo_servidor.py junto al instalador.')
    destino=Path('/opt/jjm-automatizaciones')
    if destino.is_symlink():raise RuntimeError('La carpeta del agente debe ser una carpeta real.')
    destino.mkdir(mode=0o700,parents=True,exist_ok=True)
    destino.chmod(0o700)
    os.chown(destino,0,0)
    if (destino/'respaldo_servidor.py').is_symlink():
        raise RuntimeError('El archivo del agente no puede ser un enlace simbólico.')
    shutil.copyfile(origen,destino/'respaldo_servidor.py')
    (destino/'respaldo_servidor.py').chmod(0o700)
    service='''[Unit]
Description=Respaldo verificado de Oficina de Proyectos JJM
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=root
ExecStart=/usr/bin/python3 /opt/jjm-automatizaciones/respaldo_servidor.py
TimeoutStartSec=35min
UMask=0027
'''
    timer='''[Unit]
Description=Respaldo nocturno de Oficina de Proyectos JJM

[Timer]
OnCalendar=*-*-* 03:00:00 America/Mexico_City
Persistent=true
RandomizedDelaySec=300
Unit=jjm-respaldo.service

[Install]
WantedBy=timers.target
'''
    for nombre,contenido in [('jjm-respaldo.service',service),('jjm-respaldo.timer',timer)]:
        (Path('/etc/systemd/system')/nombre).write_text(contenido,encoding='utf-8')
    subprocess.run(['systemctl','daemon-reload'],check=True)
    subprocess.run(['systemctl','enable','--now','jjm-respaldo.timer'],check=True)
    subprocess.run(['systemctl','start','--no-block','jjm-respaldo.service'],check=True)
    print('TAREA INSTALADA. La primera copia se está preparando en el servidor.')
    print('Consulta Automatizaciones → Respaldos, o ejecuta: journalctl -u jjm-respaldo.service -n 30 --no-pager')

if __name__=='__main__':
    try:instalar()
    except Exception as e:print('No se confirmó la instalación:',e);sys.exit(1)
