# routes/campanas.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Campana, Gato
from typing import List
from pydantic import BaseModel
from fastapi_jwt_auth import AuthJWT
from app.schemas import CampanaCreate, CampanaUpdate, CampanaResponse, GatoResponse
from datetime import date

router = APIRouter()

from datetime import datetime, date

def actualizar_estatus_campana(campana: Campana):
    """
    Función para actualizar el estatus de la campaña en base a las fechas.
    """
    hoy = date.today()

    # Convertir fechas de la campaña a `date` si son `datetime`
    fecha_inicio = campana.fecha_inicio.date() if isinstance(campana.fecha_inicio, datetime) else campana.fecha_inicio
    fecha_fin = campana.fecha_fin.date() if isinstance(campana.fecha_fin, datetime) else campana.fecha_fin

    if fecha_inicio > hoy:
        campana.estatus = "planeada"
    elif fecha_inicio <= hoy <= fecha_fin:
        campana.estatus = "en progreso"
    else:
        campana.estatus = "completada"

@router.get("/campanas/", response_model=List[CampanaResponse])
def listar_campanas(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    campanas = db.query(Campana).offset(skip).limit(limit).all()

    # Actualizamos el estatus de cada campaña antes de devolver la respuesta
    for campana in campanas:
        actualizar_estatus_campana(campana)

    db.commit()
    return campanas

@router.post("/campanas/", response_model=CampanaResponse)
def crear_campana(campana: CampanaCreate, db: Session = Depends(get_db)):
    nueva_campana = Campana(**campana.dict())
    actualizar_estatus_campana(nueva_campana)  # Asignar estatus al crearla
    db.add(nueva_campana)
    db.commit()
    db.refresh(nueva_campana)
    return nueva_campana

@router.put("/campanas/{campana_id}", response_model=CampanaResponse)
def actualizar_campana(campana_id: int, campana_actualizada: CampanaUpdate, db: Session = Depends(get_db)):
    campana_db = db.query(Campana).filter(Campana.id == campana_id).first()
    if not campana_db:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    
    for key, value in campana_actualizada.dict(exclude_unset=True).items():
        setattr(campana_db, key, value)

    actualizar_estatus_campana(campana_db)  # Recalcular el estatus
    db.commit()
    db.refresh(campana_db)
    return campana_db

@router.get("/campanas/{campana_id}/gatos", response_model=List[GatoResponse])
def get_gatos_por_campana(
    campana_id: int,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    Authorize.jwt_required()
    
    # Obtener la campaña con los gatos asociados
    campana = db.query(Campana).filter(Campana.id == campana_id).first()
    if not campana:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    # ⚠️ SOLUCIÓN: Asegurar que se devuelven los gatos asociados a la campaña
    gatos = db.query(Gato).join(Gato.campanas).filter(Campana.id == campana_id).all()

    return gatos


@router.post("/campanas/{campana_id}/asociar-gato/{gato_id}")
def asociar_gato_a_campana(campana_id: int, gato_id: int, db: Session = Depends(get_db)):
    # Verificar si la campaña existe
    campana = db.query(Campana).filter(Campana.id == campana_id).first()
    if not campana:
        raise HTTPException(status_code=404, detail="Campana no encontrada")

    # Verificar si el gato existe
    gato = db.query(Gato).filter(Gato.id == gato_id).first()
    if not gato:
        raise HTTPException(status_code=404, detail="Gato no encontrado")

    # Asociar el gato a la campaña
    if gato not in campana.gatos:  # Evitar duplicados
        campana.gatos.append(gato)
        db.commit()
        return {"message": f"Gato con ID {gato_id} asociado a la campaña con ID {campana_id} correctamente."}
    else:
        return {"message": f"El gato con ID {gato_id} ya está asociado a la campaña con ID {campana_id}."}
