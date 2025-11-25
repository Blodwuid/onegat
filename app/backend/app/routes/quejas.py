from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Queja, User, Colonia
from typing import List, Optional
from pydantic import BaseModel
import os
import re
import shutil
from datetime import datetime
import uuid
from app.utils.utils import enviar_correo
from app.routes.auth import get_current_user

# Definir directorio de almacenamiento
UPLOAD_DIR = "/app/uploads/quejas/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()

# Modelo de respuesta para las quejas
class QuejaResponse(BaseModel):
    id: int
    fecha: str
    descripcion: str
    colonia_id: Optional[int] = None
    colonia_nombre: Optional[str] = None
    solucion_responsable: Optional[str] = None
    archivo: Optional[str] = None  # URL completa del archivo
    estatus: str  # ✅ Agregado para asegurarnos de que el estatus se devuelve correctamente

    class Config:
        orm_mode = True

# ❌ Blindaje de los campos de texto Inyecciones SQL simuladas XSS (<script>, etiquetas HTML) Redirecciones camufladas (<a href=, javascript:)
def limpiar_texto(valor: str) -> str:
    if not isinstance(valor, str):
        return valor
    valor = valor.strip()
    # Bloquear secuencias sospechosas SQL o HTML
    valor = re.sub(r"(?i)(union|select|from|script|iframe|onload|javascript|drop|insert|delete)", "", valor)
    # Quitar caracteres HTML peligrosos básicos
    valor = re.sub(r"[<>]", "", valor)
    return valor

# **✅ Función Reutilizable para Notificar Voluntarios**
def notificar_voluntario(colonia_id: int, tipo_notificacion: str, db: Session):
    """Envía una notificación al voluntario responsable de la colonia."""
    
    # Buscar la colonia para obtener el voluntario responsable
    colonia = db.query(Colonia).filter(Colonia.id == colonia_id).first()
    if not colonia:
        print(f"⚠️ No se encontró la colonia con ID {colonia_id}")
        return
    
    # Buscar al voluntario en la base de datos usando el campo responsable_voluntario
    voluntario = db.query(User).filter(User.username == colonia.responsable_voluntario, User.role == "voluntario").first()
    
    if voluntario:
        if voluntario.email:
            asunto = f"📢 Notificación de {tipo_notificacion.capitalize()} en {colonia.nombre}"
            mensaje = (
                f"🆕 Se ha registrado una nueva {tipo_notificacion} en la colonia '{colonia.nombre}' que administras.\n\n"
                f"📌 **Descripción:** {tipo_notificacion}.\n\n"
                f"✅ Por favor, revísala en el sistema."
            )
            
            try:
                enviar_correo(voluntario.email, asunto, mensaje)
                print(f"✅ Correo de notificación enviado a {voluntario.email}")
            except Exception as e:
                print(f"❌ Error al enviar correo a {voluntario.email}: {e}")
        else:
            print(f"⚠️ El voluntario '{voluntario.username}' no tiene un email registrado.")
    else:
        print(f"⚠️ No se encontró un voluntario con username '{colonia.responsable_voluntario}' en la base de datos.")

# Obtener todas las quejas
@router.get("/quejas/", response_model=List[QuejaResponse])
def listar_quejas(request: Request, db: Session = Depends(get_db)):
    quejas = db.query(Queja).all()
    response = []
    for q in quejas:
        archivo_url = f"{str(request.base_url).rstrip('/')}/uploads/quejas/{q.archivo}" if q.archivo else None
        colonia_nombre = q.colonia.nombre if q.colonia else None  # ✅ Obtener el nombre de la colonia
        response.append(QuejaResponse(
            id=q.id,
            fecha=q.fecha.strftime("%d/%m/%Y"),
            descripcion=q.descripcion,
            colonia_id=q.colonia_id,
            colonia_nombre=colonia_nombre,  # ✅ Agregar el nombre de la colonia a la respuesta
            solucion_responsable=q.solucion_responsable,
            archivo=archivo_url,
            estatus=q.estatus if q.estatus else "pendiente"  # ✅ Evita error si estatus es None
        ))
    return response

# Registrar una nueva queja con archivo adjunto
@router.post("/quejas/", response_model=QuejaResponse)
def registrar_queja(
    request: Request,
    descripcion: str = Form(...),
    colonia_id: Optional[int] = Form(None),
    solucion_responsable: Optional[str] = Form(None),
    archivo: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    archivo_nombre = None
    if archivo:
        # 🛡️ Validar tipo MIME
        TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "application/pdf"]
        if archivo.content_type not in TIPOS_PERMITIDOS:
            raise HTTPException(status_code=400, detail="Tipo de archivo no permitido.")

        ext = os.path.splitext(archivo.filename)[-1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".pdf"]:
            raise HTTPException(status_code=400, detail="Extensión de archivo no permitida.")

        archivo_nombre = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}{ext}"
        archivo_ruta = os.path.join(UPLOAD_DIR, archivo_nombre)

        print(f"📂 Guardando archivo en: {archivo_ruta}")  # Debugging
        with open(archivo_ruta, "wb") as buffer:
            shutil.copyfileobj(archivo.file, buffer)

    descripcion = limpiar_texto(descripcion)
    solucion_responsable = limpiar_texto(solucion_responsable) if solucion_responsable else None

    nueva_queja = Queja(
        fecha=datetime.utcnow(),
        descripcion=descripcion,
        colonia_id=colonia_id,
        solucion_responsable=solucion_responsable,
        archivo=archivo_nombre,
        estatus="pendiente"  # ✅ Se agrega el estatus por defecto
    )

    db.add(nueva_queja)
    db.commit()
    db.refresh(nueva_queja)

    # Llamar a la función para enviar el correo
    notificar_voluntario(colonia_id, "queja", db)

    return QuejaResponse(
        id=nueva_queja.id,
        fecha=nueva_queja.fecha.strftime("%d/%m/%Y"),
        descripcion=nueva_queja.descripcion,
        colonia_id=nueva_queja.colonia_id,
        solucion_responsable=nueva_queja.solucion_responsable,
        archivo=f"{request.base_url}/uploads/quejas/{nueva_queja.archivo}" if nueva_queja.archivo else None,
        estatus=nueva_queja.estatus  # ✅ Se devuelve el estatus correctamente
    )

# Actualizar una queja existente
@router.put("/quejas/{queja_id}", response_model=QuejaResponse)
def actualizar_queja(queja_id: int, queja_actualizada: QuejaResponse, request: Request, db: Session = Depends(get_db)):
    queja_db = db.query(Queja).filter(Queja.id == queja_id).first()
    if not queja_db:
        raise HTTPException(status_code=404, detail="Queja no encontrada")

    for key, value in queja_actualizada.dict(exclude_unset=True).items():
        setattr(queja_db, key, value)

    db.commit()
    db.refresh(queja_db)

    return QuejaResponse(
        id=queja_db.id,
        fecha=queja_db.fecha.strftime("%d/%m/%Y"),
        descripcion=queja_db.descripcion,
        colonia_id=queja_db.colonia_id,
        solucion_responsable=queja_db.solucion_responsable,
        archivo=f"{request.base_url}/uploads/quejas/{queja_db.archivo}" if queja_db.archivo else None
    )

@router.put("/quejas/{queja_id}/resolver", response_model=dict)
def resolver_queja(queja_id: int, usuario: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """ Marca una queja como resuelta y notifica al Responsable Municipal y/o Voluntario según corresponda. """
    queja = db.query(Queja).filter(Queja.id == queja_id).first()

    if not queja:
        raise HTTPException(status_code=404, detail="Queja no encontrada")
    
    queja.estatus = "resuelta"
    db.commit()
    db.refresh(queja)

    # Obtener al usuario con rol "responsable" en el sistema
    responsable = db.query(User).filter(User.role == "responsable").first()

    # Obtener al Voluntario responsable de la colonia
    voluntario = None
    if queja.colonia_id:
        colonia = db.query(Colonia).filter(Colonia.id == queja.colonia_id).first()
        if colonia and colonia.responsable_voluntario:
            voluntario = db.query(User).filter(User.username == colonia.responsable_voluntario, User.role == "voluntario").first()

    # Si la queja es resuelta por un Usuario, notificar al Voluntario y al Responsable
    if usuario.role == "usuario":
        if voluntario and voluntario.email:
            enviar_correo(voluntario.email, "Queja resuelta en tu colonia", f"La queja '{queja.descripcion}' ha sido marcada como resuelta por {usuario.username}.")
        if responsable and responsable.email:
            enviar_correo(responsable.email, "Queja resuelta", f"La queja '{queja.descripcion}' ha sido marcada como resuelta por {usuario.username}.")
    
    # Si la queja es resuelta por un Voluntario, solo notificar al Responsable
    elif usuario.role == "voluntario" and responsable and responsable.email:
        enviar_correo(responsable.email, "Queja resuelta", f"La queja '{queja.descripcion}' ha sido marcada como resuelta por el voluntario {usuario.username}.")

    return {"message": "Queja marcada como resuelta y notificación enviada correctamente"}

@router.get("/quejas/mis-quejas", response_model=List[QuejaResponse])
def obtener_mis_quejas(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Obtener las colonias asociadas al usuario
    colonias = user.colonias  # Gracias a la relación en SQLAlchemy

    if not colonias:
        return []

    # Obtener IDs de colonias
    colonia_ids = [c.id for c in colonias]

    # Buscar quejas asociadas a esas colonias
    quejas = db.query(Queja).filter(Queja.colonia_id.in_(colonia_ids)).all()

    response = []
    for q in quejas:
        archivo_url = f"{str(request.base_url).rstrip('/')}/uploads/quejas/{q.archivo}" if q.archivo else None
        colonia_nombre = q.colonia.nombre if q.colonia else None

        response.append(QuejaResponse(
            id=q.id,
            fecha=q.fecha.strftime("%d/%m/%Y"),
            descripcion=q.descripcion,
            colonia_id=q.colonia_id,
            colonia_nombre=colonia_nombre,
            solucion_responsable=q.solucion_responsable,
            archivo=archivo_url,
            estatus=q.estatus if q.estatus else "pendiente"
        ))

    return response

