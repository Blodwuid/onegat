from fastapi import Depends, HTTPException, BackgroundTasks, APIRouter, UploadFile, File
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
from fastapi.responses import FileResponse
from cryptography.fernet import Fernet

import os
import subprocess
import datetime
import asyncio
import boto3
import re
import tempfile
from pathlib import Path

from app.settings import settings

router = APIRouter()

# --------------------
# Configuración
# --------------------
BACKUP_DIR = "/backups"
BACKUP_DIR_PATH = Path(BACKUP_DIR).resolve()
MAX_BACKUPS = 7

ENCRYPTION_KEY = settings.encryption_key.encode()
fernet = Fernet(ENCRYPTION_KEY)

DB_HOST = "db"
DB_NAME = "colonia_gatos"
DB_USER = os.getenv("POSTGRES_USER", "user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")

# Solo backups generados por el sistema o importados controladamente
FILENAME_RE = re.compile(
    r"^(backup_(full|incremental|import)_[0-9]{14}\.dump)$"
)

# --------------------
# Utilidades
# --------------------
def resolve_backup_path(filename: str) -> Path:
    if not FILENAME_RE.fullmatch(filename):
        raise HTTPException(status_code=400, detail="Nombre de backup no permitido")

    p = (BACKUP_DIR_PATH / filename).resolve()

    if BACKUP_DIR_PATH not in p.parents:
        raise HTTPException(status_code=400, detail="Ruta de backup inválida")

    return p

# --------------------
# Modelos
# --------------------
class BackupRequest(BaseModel):
    backup_type: str  # full o incremental
    format: str       # sql (conceptual)

# --------------------
# Crear backup
# --------------------
@router.post("/backup")
def backup(request: BackupRequest, background_tasks: BackgroundTasks, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    background_tasks.add_task(create_backup, request.backup_type)
    return {"message": "Backup en proceso"}

def create_backup(backup_type: str):
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    backup_filename = f"backup_{backup_type}_{timestamp}.dump"
    backup_path = BACKUP_DIR_PATH / backup_filename

    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD

    cmd = [
        "pg_dump",
        "-h", DB_HOST,
        "-U", DB_USER,
        "-F", "c",
        "-f", str(backup_path),
        DB_NAME,
    ]

    try:
        subprocess.run(
            cmd,
            env=env,
            check=True,
            capture_output=True,
            text=True,
            timeout=300
        )

        # Cifrar backup
        with open(backup_path, "rb") as f:
            encrypted = fernet.encrypt(f.read())

        with open(backup_path, "wb") as f:
            f.write(encrypted)

        delete_old_backups()

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Timeout al crear el backup")
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Error al crear el backup")

def delete_old_backups():
    backups = sorted(
        [f for f in BACKUP_DIR_PATH.iterdir() if f.is_file() and f.name.startswith("backup_")],
        key=lambda f: f.stat().st_ctime
    )
    while len(backups) > MAX_BACKUPS:
        backups.pop(0).unlink()

# --------------------
# Restaurar backup
# --------------------
@router.post("/restore")
def restore(backup_filename: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    return restore_backup(backup_filename)

def restore_backup(backup_filename: str):
    backup_path = resolve_backup_path(backup_filename)

    fd, tmp_restore_path = tempfile.mkstemp(prefix="restore_", suffix=".dump", dir="/tmp")
    os.close(fd)

    try:
        # Descifrar a temporal
        with open(backup_path, "rb") as f:
            decrypted = fernet.decrypt(f.read())

        with open(tmp_restore_path, "wb") as f:
            f.write(decrypted)

        env = os.environ.copy()
        env["PGPASSWORD"] = DB_PASSWORD

        # Reset schema
        reset_cmd = [
            "psql",
            "-h", DB_HOST,
            "-U", DB_USER,
            "-d", DB_NAME,
            "-v", "ON_ERROR_STOP=1",
            "-c", "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        ]
        subprocess.run(
            reset_cmd,
            env=env,
            check=True,
            capture_output=True,
            text=True,
            timeout=120
        )

        # Restore dump
        restore_cmd = [
            "pg_restore",
            "--clean", "--if-exists",
            "--no-owner", "--no-privileges",
            "-h", DB_HOST,
            "-U", DB_USER,
            "-d", DB_NAME,
            tmp_restore_path
        ]
        result = subprocess.run(
            restore_cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=600
        )

        # 0 = OK, 1 = OK con warnings conocidos (transaction_timeout)
        if result.returncode not in (0, 1):
            raise HTTPException(
                status_code=500,
                detail="Error grave durante la restauración del backup"
            )

        return {"message": "Restauración completada correctamente"}

    finally:
        try:
            os.remove(tmp_restore_path)
        except FileNotFoundError:
            pass

# --------------------
# Backup automático
# --------------------
async def scheduled_backup():
    while True:
        await asyncio.sleep(86400)
        create_backup("full")

@router.on_event("startup")
async def startup_event():
    asyncio.create_task(scheduled_backup())

# --------------------
# S3
# --------------------
def upload_to_s3(file_path: str, bucket_name: str, object_name: str):
    try:
        boto3.client("s3").upload_file(file_path, bucket_name, object_name)
    except Exception:
        raise HTTPException(status_code=500, detail="Error al subir a S3")

@router.post("/backup/upload")
def upload_backup(backup_filename: str, bucket_name: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    path = resolve_backup_path(backup_filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    upload_to_s3(str(path), bucket_name, backup_filename)
    return {"message": "Backup subido a S3"}

# --------------------
# Gestión de backups
# --------------------
@router.delete("/backup/delete")
def delete_backup(backup_filename: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    path = resolve_backup_path(backup_filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    path.unlink()
    return {"message": f"Backup {backup_filename} eliminado"}

@router.get("/backup/list")
def list_backups(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")
    
    backups = sorted(
        [f.name for f in BACKUP_DIR_PATH.iterdir() if f.is_file() and FILENAME_RE.fullmatch(f.name)],
        key=lambda name: (BACKUP_DIR_PATH / name).stat().st_ctime,
        reverse=True
    )
    return {"backups": backups}

@router.get("/backup/download/{backup_filename}")
def download_backup(backup_filename: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    path = resolve_backup_path(backup_filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    return FileResponse(
        path=str(path),
        filename=backup_filename,
        media_type="application/octet-stream"
    )

# --------------------
# Importar backup
# --------------------
@router.post("/backup/import")
async def import_backup(file: UploadFile = File(...), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    if not file.filename.lower().endswith(".dump"):
        raise HTTPException(status_code=400, detail="Solo se admiten backups .dump")

    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    safe_name = f"backup_import_{timestamp}.dump"
    dest = BACKUP_DIR_PATH / safe_name

    with open(dest, "wb") as f:
        f.write(await file.read())

    return restore_backup(safe_name)
