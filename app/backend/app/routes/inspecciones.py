from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Inspeccion, Colonia, User
from typing import List
from pydantic import BaseModel
import os
import re
import shutil
from datetime import datetime
import uuid
from app.utils.utils import enviar_correo
from app.routes.auth import get_current_user

UPLOAD_DIR = "/app/uploads/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class InspeccionCreate(BaseModel):
    colonia_id: int
    observaciones: str
    acciones_recomendadas: str = None

    class Config:
        orm_mode = True

class InspeccionResponse(BaseModel):
    id: int
    fecha: str
    colonia_nombre: str
    observaciones: str
    acciones_recomendadas: str = None
    archivo: str = None
    estatus: str  # ✅ Agregado para asegurarnos de que el estatus se devuelve correctamente

    class Config:
        orm_mode = True

router = APIRouter()

# ❌ Blindaje de los campos de texto Inyecciones SQL simuladas XSS (<script>, etiquetas HTML) Redirecciones camufladas (<a href=, javascript:)
def limpiar_texto(valor: str) -> str:
    if not isinstance(valor, str):
        return valor
    valor = valor.strip()
    valor = re.sub(r"(?i)(union|select|from|script|iframe|onload|javascript|drop|insert|delete)", "", valor)
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

@router.get("/inspecciones/", response_model=List[InspeccionResponse])
def listar_inspecciones(request: Request, db: Session = Depends(get_db)):
    inspecciones = db.query(Inspeccion).all()
    response = []
    for ins in inspecciones:
        archivo_url = f"{str(request.base_url).rstrip('/')}/uploads/{ins.archivo}" if ins.archivo else None
        response.append(InspeccionResponse(
            id=ins.id,
            fecha=ins.fecha.strftime("%d/%m/%Y"),
            colonia_nombre=ins.colonia.nombre,
            observaciones=ins.observaciones,
            acciones_recomendadas=ins.acciones_recomendadas,
            archivo=archivo_url,
            estatus=ins.estatus if ins.estatus else "pendiente"  # ✅ Solución aplicada
        ))
    return response

@router.post("/inspecciones/", response_model=InspeccionResponse)
def registrar_inspeccion(
    request: Request,
    colonia_id: int = Form(...),  # ⚠️ Usar Form para recibir datos en multipart/form-data
    observaciones: str = Form(...),
    acciones_recomendadas: str = Form(None),
    archivo: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    colonia = db.query(Colonia).filter(Colonia.id == colonia_id).first()
    if not colonia:
        raise HTTPException(status_code=404, detail="Colonia no encontrada")
    
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

        print(f"📂 Guardando archivo en: {archivo_ruta}")  # DEBUG
        with open(archivo_ruta, "wb") as buffer:
            shutil.copyfileobj(archivo.file, buffer)
    
    observaciones = limpiar_texto(observaciones)
    acciones_recomendadas = limpiar_texto(acciones_recomendadas) if acciones_recomendadas else None

    nueva_inspeccion = Inspeccion(
        fecha=datetime.utcnow(),
        colonia_id=colonia_id,
        observaciones=observaciones,
        acciones_recomendadas=acciones_recomendadas,
        archivo=archivo_nombre,
        estatus="pendiente"  # ✅ Agregamos un valor por defecto
    )
    
    db.add(nueva_inspeccion)
    db.commit()
    db.refresh(nueva_inspeccion)

    # Enviar notificación
    notificar_voluntario(colonia_id,"inspeccion", db)
    
    return InspeccionResponse(
        id=nueva_inspeccion.id,
        fecha=nueva_inspeccion.fecha.strftime("%d/%m/%Y"),
        colonia_nombre=colonia.nombre,
        observaciones=nueva_inspeccion.observaciones,
        acciones_recomendadas=nueva_inspeccion.acciones_recomendadas,
        archivo=f"{request.base_url}/uploads/{nueva_inspeccion.archivo}" if nueva_inspeccion.archivo else None,
        estatus=nueva_inspeccion.estatus  # ✅ Devolvemos el estatus
    )

@router.get("/inspecciones/colonias/")
def listar_colonias(db: Session = Depends(get_db)):
    colonias = db.query(Colonia).all()
    return [{"id": col.id, "nombre": col.nombre} for col in colonias]

@router.put("/inspecciones/{inspeccion_id}/resolver", response_model=dict)
def resolver_inspeccion(inspeccion_id: int, usuario: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """ Marca una inspección como resuelta y notifica al Responsable Municipal y/o Voluntario según corresponda. """
    inspeccion = db.query(Inspeccion).filter(Inspeccion.id == inspeccion_id).first()

    if not inspeccion:
        raise HTTPException(status_code=404, detail="Inspección no encontrada")
    
    inspeccion.estatus = "resuelta"
    db.commit()
    db.refresh(inspeccion)

    # Obtener al usuario con rol "responsable" en el sistema
    responsable = db.query(User).filter(User.role == "responsable").first()

    # Obtener al Voluntario responsable de la colonia
    voluntario = None
    if inspeccion.colonia_id:
        colonia = db.query(Colonia).filter(Colonia.id == inspeccion.colonia_id).first()
        if colonia and colonia.responsable_voluntario:
            voluntario = db.query(User).filter(User.username == colonia.responsable_voluntario, User.role == "voluntario").first()

    # Si la inspección es resuelta por un Usuario, notificar al Voluntario y al Responsable
    if usuario.role == "usuario":
        if voluntario and voluntario.email:
            enviar_correo(voluntario.email, "Inspección resuelta en tu colonia", f"La inspección '{inspeccion.observaciones}' ha sido marcada como resuelta por {usuario.username}.")
        if responsable and responsable.email:
            enviar_correo(responsable.email, "Inspección resuelta", f"La inspección '{inspeccion.observaciones}' ha sido marcada como resuelta por {usuario.username}.")
    
    # Si la inspección es resuelta por un Voluntario, solo notificar al Responsable
    elif usuario.role == "voluntario" and responsable and responsable.email:
        enviar_correo(responsable.email, "Inspección resuelta", f"La inspección '{inspeccion.observaciones}' ha sido marcada como resuelta por el voluntario {usuario.username}.")

    return {"message": "Inspección marcada como resuelta y notificación enviada correctamente"}

@router.get("/inspecciones/mis-inspecciones", response_model=List[InspeccionResponse])
def inspecciones_asignadas(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    colonias_ids = [col.id for col in user.colonias]
    if not colonias_ids:
        return []

    inspecciones = db.query(Inspeccion).filter(Inspeccion.colonia_id.in_(colonias_ids)).all()

    response = []
    for i in inspecciones:
        archivo_url = f"{str(request.base_url).rstrip('/')}/uploads/{i.archivo}" if i.archivo else None
        
        response.append(InspeccionResponse(
            id=i.id,
            fecha=i.fecha.strftime("%d/%m/%Y"),
            colonia_nombre=i.colonia.nombre,
            observaciones=i.observaciones,
            acciones_recomendadas=i.acciones_recomendadas,
            archivo=archivo_url,
            estatus=i.estatus or "pendiente"
        ))

    return response





