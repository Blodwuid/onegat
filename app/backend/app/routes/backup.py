from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, APIRouter, UploadFile, File
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
import os
import subprocess
import datetime
import asyncio
import boto3  # Para almacenamiento en AWS S3
from cryptography.fernet import Fernet
from app.settings import settings
from fastapi.responses import FileResponse

router = APIRouter()

# Configuración
BACKUP_DIR = "/backups"
MAX_BACKUPS = 7  # Máximo número de backups a conservar
ENCRYPTION_KEY = settings.encryption_key.encode()
fernet = Fernet(ENCRYPTION_KEY)

# Modelo para solicitud de backup
class BackupRequest(BaseModel):
    backup_type: str  # full o incremental
    format: str  # sql o json

# Protección con AuthJWT
@router.post("/backup")
def backup(request: BackupRequest, background_tasks: BackgroundTasks, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    user_claims = Authorize.get_raw_jwt()
    if user_claims.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")
    
    background_tasks.add_task(create_backup, request.backup_type, request.format)
    return {"message": "Backup en proceso"}

# Función para generar backup
def create_backup(backup_type: str, format: str):
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    backup_filename = f"backup_{backup_type}_{timestamp}.{format}"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    
    # Comando para crear el backup
    cmd = (
        f"PGPASSWORD='{os.getenv('POSTGRES_PASSWORD', 'password')}' "
        f"pg_dump -h db -U {os.getenv('POSTGRES_USER', 'user')} -F c -f {backup_path} colonia_gatos"
    )

    try:
        subprocess.run(cmd, shell=True, check=True)

        # Cifrar archivo
        with open(backup_path, 'rb') as file:
            encrypted_data = fernet.encrypt(file.read())

        with open(backup_path, 'wb') as file:
            file.write(encrypted_data)

        # Eliminar backups antiguos si hay más de los permitidos
        delete_old_backups()

        return {"backup_file": backup_filename, "timestamp": timestamp}

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Error al crear el backup: {str(e)}")

# Eliminar backups antiguos
def delete_old_backups():
    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.startswith("backup_")],
        key=lambda f: os.path.getctime(os.path.join(BACKUP_DIR, f))
    )
    while len(backups) > MAX_BACKUPS:
        old_backup = backups.pop(0)
        os.remove(os.path.join(BACKUP_DIR, old_backup))

# Restaurar backup
@router.post("/restore")
def restore(backup_filename: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    user_claims = Authorize.get_raw_jwt()
    if user_claims.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")
    
    return restore_backup(backup_filename)

def restore_backup(backup_filename: str):
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    # Descifrar archivo antes de restaurarlo
    with open(backup_path, 'rb') as file:
        decrypted_data = fernet.decrypt(file.read())

    with open(backup_path, 'wb') as file:
        file.write(decrypted_data)

    cmd = (
        f"PGPASSWORD='{os.getenv('POSTGRES_PASSWORD', 'password')}' "
        f"psql -h db -U {os.getenv('POSTGRES_USER', 'user')} -d colonia_gatos -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'"
    )
    cmd += (
        f" && PGPASSWORD='{os.getenv('POSTGRES_PASSWORD', 'password')}' "
        f"pg_restore -h db -U {os.getenv('POSTGRES_USER', 'user')} -d colonia_gatos {backup_path}"
    )

    try:
        subprocess.run(cmd, shell=True, check=True)
        return {"message": "Restauración completada"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Error al restaurar el backup: {str(e)}")

# Automatización de backups
async def scheduled_backup():
    while True:
        await asyncio.sleep(86400)  # Ejecutar cada 24 horas
        create_backup("full", "sql")

@router.on_event("startup")
async def startup_event():
    asyncio.create_task(scheduled_backup())

# Subir backup a AWS S3
def upload_to_s3(file_path, bucket_name, object_name):
    try:
        s3 = boto3.client('s3')
        s3.upload_file(file_path, bucket_name, object_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir a S3: {str(e)}")

@router.post("/backup/upload")
def upload_backup(backup_filename: str, bucket_name: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    user_claims = Authorize.get_raw_jwt()
    if user_claims.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")
    
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    upload_to_s3(backup_path, bucket_name, backup_filename)
    return {"message": "Backup subido a S3"}

# Eliminar backup manualmente
@router.delete("/backup/delete")
def delete_backup(backup_filename: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    user_claims = Authorize.get_raw_jwt()
    if user_claims.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    os.remove(backup_path)
    return {"message": f"Backup {backup_filename} eliminado correctamente"}

# Listar backups
@router.get("/backup/list")
def list_backups():
    try:
        backups = sorted(
            os.listdir(BACKUP_DIR),
            key=lambda f: os.path.getctime(os.path.join(BACKUP_DIR, f)),
            reverse=True  # Mostrar los más recientes primero
        )
        return {"backups": backups}
    except Exception as e:
        return {"error": str(e)}

# Descarga de backups
@router.get("/backup/download/{backup_filename}")
def download_backup(backup_filename: str, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    user_claims = Authorize.get_raw_jwt()
    if user_claims.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")
    
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup not found")
    
    return FileResponse(backup_path, filename=backup_filename, media_type="application/octet-stream")

@router.post("/backup/import")
async def import_backup(file: UploadFile = File(...), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    user_claims = Authorize.get_raw_jwt()
    if user_claims.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")

    # Guardar el archivo en /backups
    backup_path = os.path.join(BACKUP_DIR, file.filename)
    with open(backup_path, "wb") as f:
        f.write(await file.read())

    # Restaurar backup usando la lógica existente
    return restore_backup(file.filename)