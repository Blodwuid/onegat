from fastapi import Depends, HTTPException, BackgroundTasks, APIRouter, UploadFile, File
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
import os
import subprocess
import datetime
import asyncio
import boto3
from cryptography.fernet import Fernet
from app.settings import settings
from fastapi.responses import FileResponse

router = APIRouter()

# --------------------
# Configuración
# --------------------
BACKUP_DIR = "/backups"
MAX_BACKUPS = 7
ENCRYPTION_KEY = settings.encryption_key.encode()
fernet = Fernet(ENCRYPTION_KEY)

DB_HOST = "db"
DB_NAME = "colonia_gatos"
DB_USER = os.getenv("POSTGRES_USER", "user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")

# --------------------
# Modelos
# --------------------
class BackupRequest(BaseModel):
    backup_type: str  # full o incremental
    format: str       # sql (conceptual, realmente usamos formato custom)

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
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    cmd = (
        f"PGPASSWORD='{DB_PASSWORD}' "
        f"pg_dump -h {DB_HOST} -U {DB_USER} -F c "
        f"-f {backup_path} {DB_NAME}"
    )

    try:
        subprocess.run(cmd, shell=True, check=True)

        # Cifrar backup
        with open(backup_path, "rb") as f:
            encrypted = fernet.encrypt(f.read())

        with open(backup_path, "wb") as f:
            f.write(encrypted)

        delete_old_backups()

        return {"backup_file": backup_filename, "timestamp": timestamp}

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Error al crear el backup: {e}")

def delete_old_backups():
    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.startswith("backup_")],
        key=lambda f: os.path.getctime(os.path.join(BACKUP_DIR, f))
    )
    while len(backups) > MAX_BACKUPS:
        os.remove(os.path.join(BACKUP_DIR, backups.pop(0)))

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
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    tmp_restore_path = f"/tmp/restore_{backup_filename}"

    try:
        # Descifrar a fichero temporal
        with open(backup_path, "rb") as f:
            decrypted = fernet.decrypt(f.read())

        with open(tmp_restore_path, "wb") as f:
            f.write(decrypted)

        cmd = (
            f"PGPASSWORD='{DB_PASSWORD}' "
            f"psql -h {DB_HOST} -U {DB_USER} -d {DB_NAME} "
            f"-c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'"
            f" && "
            f"PGPASSWORD='{DB_PASSWORD}' "
            f"pg_restore "
            f"--clean --if-exists "
            f"--no-owner --no-privileges "
            f"-h {DB_HOST} -U {DB_USER} -d {DB_NAME} "
            f"{tmp_restore_path}"
        )

        result = subprocess.run(cmd, shell=True)
        if result.returncode not in (0, 1):
            raise HTTPException(
                status_code=500,
                detail="Error grave durante la restauración del backup"
            )

        return {"message": "Restauración completada correctamente"}

    finally:
        if os.path.exists(tmp_restore_path):
            os.remove(tmp_restore_path)

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
def upload_to_s3(file_path, bucket_name, object_name):
    try:
        boto3.client("s3").upload_file(file_path, bucket_name, object_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir a S3: {e}")

@router.post("/backup/upload")
def upload_backup(backup_filename: str, bucket_name: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    path = os.path.join(BACKUP_DIR, backup_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    upload_to_s3(path, bucket_name, backup_filename)
    return {"message": "Backup subido a S3"}

# --------------------
# Gestión de backups
# --------------------
@router.delete("/backup/delete")
def delete_backup(backup_filename: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    path = os.path.join(BACKUP_DIR, backup_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    os.remove(path)
    return {"message": f"Backup {backup_filename} eliminado"}

@router.get("/backup/list")
def list_backups():
    backups = sorted(
        os.listdir(BACKUP_DIR),
        key=lambda f: os.path.getctime(os.path.join(BACKUP_DIR, f)),
        reverse=True
    )
    return {"backups": backups}

@router.get("/backup/download/{backup_filename}")
def download_backup(backup_filename: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    path = os.path.join(BACKUP_DIR, backup_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    return FileResponse(path, filename=backup_filename, media_type="application/octet-stream")

# --------------------
# Importar backup
# --------------------
@router.post("/backup/import")
async def import_backup(file: UploadFile = File(...), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    if Authorize.get_raw_jwt().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    backup_path = os.path.join(BACKUP_DIR, file.filename)
    with open(backup_path, "wb") as f:
        f.write(await file.read())

    return restore_backup(file.filename)
