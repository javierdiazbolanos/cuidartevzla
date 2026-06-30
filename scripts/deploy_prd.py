#!/usr/bin/env python3
"""
Deploy completo a Banahosting (PRD).
Borra todo el root, sube PWA + admin + backend + .htaccess + .env.
"""
import ftplib
import os
import io
import sys
import time

HOST = "ftp.equiposdecamping.com"
PORT = 21
USER = "alex-cuidartevzla@cuidartevzla.com"
PASS = "3lG4t0@2026"

# Directorios locales
PWA_DIST = "/home/jdiaz/dev/cuidartevzla/dist"
ADMIN_DIST = "/home/jdiaz/dev/cuidartevzla-admin/dist"
BACKEND_DIR = "/home/jdiaz/dev/cuidartevzla/backend"
ENV_PRD = "/home/jdiaz/dev/cuidartevzla/backend/.env.prd"

def connect():
    ftp = ftplib.FTP()
    ftp.connect(HOST, PORT, timeout=30)
    ftp.login(USER, PASS)
    ftp.set_pasv(True)
    return ftp

def list_root(ftp):
    """Lista archivos y dirs en el root"""
    items = []
    ftp.retrlines('LIST', items.append)
    return items

def safe_delete(ftp, path, is_dir=False):
    """Borra un archivo o directorio recursivamente"""
    try:
        if is_dir:
            # Listar contenido y borrar primero
            sub_items = []
            try:
                ftp.retrlines(f'LIST {path}', sub_items.append)
            except:
                pass
            for item in sub_items:
                parts = item.split(None, 8)
                if len(parts) < 9:
                    continue
                name = parts[-1].strip()
                is_subdir = parts[0].startswith('d')
                full = f"{path}/{name}"
                if is_subdir:
                    safe_delete(ftp, full, is_dir=True)
                else:
                    try:
                        ftp.delete(full)
                    except Exception as e:
                        print(f"  ! No pude borrar {full}: {e}")
            try:
                ftp.rmd(path)
                print(f"  🗑️  Dir borrado: {path}")
            except Exception as e:
                print(f"  ! No pude borrar dir {path}: {e}")
        else:
            try:
                ftp.delete(path)
                print(f"  🗑️  {path}")
            except Exception as e:
                print(f"  ! No pude borrar {path}: {e}")
    except Exception as e:
        print(f"  ! Error con {path}: {e}")

def upload_file(ftp, local_path, remote_path):
    """Sube un archivo local"""
    with open(local_path, 'rb') as f:
        ftp.storbinary(f'STOR {remote_path}', f)
    print(f"  ✅ {remote_path}")

def upload_data(ftp, data, remote_path):
    """Sube datos binarios"""
    ftp.storbinary(f'STOR {remote_path}', io.BytesIO(data))
    print(f"  ✅ {remote_path}")

def ensure_dir(ftp, path):
    """Crea directorio si no existe"""
    parts = path.strip('/').split('/')
    current = ''
    for part in parts:
        current = f"{current}/{part}"
        try:
            ftp.mkd(current)
        except:
            pass  # Ya existe

def upload_dir(ftp, local_dir, remote_dir, exclude=None):
    """Sube un directorio completo recursivamente"""
    if exclude is None:
        exclude = []
    ensure_dir(ftp, remote_dir)
    for item in os.listdir(local_dir):
        if item in exclude:
            continue
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        if os.path.isdir(local_path):
            upload_dir(ftp, local_path, remote_path, exclude)
        else:
            upload_file(ftp, local_path, remote_path)

def main():
    print("=" * 60)
    print("🚀 DEPLOY COMPLETO A BANAHOSTING (PRD)")
    print("=" * 60)

    ftp = connect()
    print(f"✅ Conectado a {HOST}")

    # 1. Listar contenido actual
    print("\n📋 Contenido actual del root:")
    items = list_root(ftp)
    for item in items:
        print(f"  {item}")

    # 2. Borrar TODO
    print("\n🗑️  Borrando contenido anterior...")
    for item in items:
        parts = item.split(None, 8)
        if len(parts) < 9:
            continue
        name = parts[-1].strip()
        if name in ('.', '..'):
            continue
        is_dir = parts[0].startswith('d')
        safe_delete(ftp, name, is_dir=is_dir)

    # 3. Subir PWA pública (root)
    print("\n📤 Subiendo PWA pública (root)...")
    upload_dir(ftp, PWA_DIST, '/', exclude=['config.json'])

    # Subir config.json con API_BASE=/api
    upload_data(ftp, b'{\n  "API_BASE": "/api"\n}\n', '/config.json')

    # 4. Subir .htaccess del root (redirect /voluntario -> /voluntarios)
    print("\n📤 Subiendo .htaccess root...")
    htaccess_root = """RewriteEngine On

# Redirect /voluntario -> /voluntarios
RewriteRule ^voluntario/?$ /voluntarios/ [R=301,L]

# SPA fallback - serve index.html for non-existent files
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_URI} !^/voluntarios/
RewriteRule . /index.html [L]
"""
    upload_data(ftp, htaccess_root.encode(), '/.htaccess')

    # 5. Subir admin (/voluntarios/)
    print("\n📤 Subiendo Admin (/voluntarios/)...")
    upload_dir(ftp, ADMIN_DIST, '/voluntarios')

    # .htaccess para SPA routing en /voluntarios/
    htaccess_vol = """RewriteEngine On
RewriteBase /voluntarios/

# SPA fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /voluntarios/index.html [L]
"""
    upload_data(ftp, htaccess_vol.encode(), '/voluntarios/.htaccess')

    # 6. Subir backend (/api/)
    print("\n📤 Subiendo Backend (/api/)...")
    upload_dir(ftp, BACKEND_DIR, '/api', exclude=[
        '.env', '.env.prd', '.env.example',
        'test_prd_count.php', 'test_prd_db.php', 'test_prd_conn.php',
        'cuidartevzla_db_export.sql', 'import_db.php', 'export_db.php',
        'test_dedup.php', 'test_openrouter.php', 'test_outbound.php',
        'test_proxy.php', 'test_proxy2.php', 'test.php',
        'sync2.php', 'sync_mini.php',
    ])

    # .htaccess para /api/
    htaccess_api = r"""RewriteEngine On

# CORS headers
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type, X-Volunteer-Code, X-Request-ID"

# Handle OPTIONS preflight
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=204,L]

# Whitelist de endpoints PHP
RewriteCond %{REQUEST_URI} !^/api/(hospitales|pacientes|medicamentos|transporte|stats|pacientes_lote|sync|procesar_con_llm|carga_log|superuser_status|edificios|alertas)\.php$
RewriteCond %{REQUEST_URI} !^/api/(hospitales|pacientes|medicamentos|transporte|stats|pacientes_lote|sync|procesar_con_llm|carga_log|superuser_status|edificios|alertas)\.php\?.*$
RewriteRule \.php$ - [F]
"""
    upload_data(ftp, htaccess_api.encode(), '/api/.htaccess')

    # 7. Subir .env de PRD
    print("\n📤 Subiendo .env de producción...")
    with open(ENV_PRD, 'rb') as f:
        ftp.storbinary('STOR /api/.env', f)
    print("  ✅ /api/.env")

    # 8. Verificar
    print("\n📋 Contenido final del root:")
    items = list_root(ftp)
    for item in items:
        print(f"  {item}")

    ftp.quit()
    print("\n✅ Deploy completo!")

if __name__ == '__main__':
    main()
