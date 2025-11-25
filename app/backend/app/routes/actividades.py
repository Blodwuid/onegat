from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Actividad, User, Gato
from fastapi_jwt_auth import AuthJWT
from app.schemas import ActividadCreate

router = APIRouter()

# Endpoint para registrar una actividad
@router.post("/actividades/", summary="Registrar actividad")
def create_actividad(
    actividad: ActividadCreate,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    # Verificar que el gato_id existe
    gato = db.query(Gato).filter(Gato.id == actividad.gato_id).first()
    if not gato:
        raise HTTPException(status_code=400, detail="El ID del gato no existe.")

    # Validar token
    Authorize.jwt_required()
    user_id = int(Authorize.get_jwt_subject())

    # Verificar existencia del usuario
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Registrar actividad
    nueva_actividad = Actividad(**actividad.dict(), usuario_id=user_id)
    db.add(nueva_actividad)
    db.commit()
    db.refresh(nueva_actividad)
    return nueva_actividad

# Endpoint para obtener todas las actividades
@router.get("/actividades/", summary="Obtener lista de actividades")
def get_actividades(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    # Validar token
    Authorize.jwt_required()

    # Consultar todas las actividades
    actividades = db.query(Actividad).all()
    if not actividades:
        raise HTTPException(status_code=404, detail="No se encontraron actividades")

    return actividades

