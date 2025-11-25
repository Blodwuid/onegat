from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Parte, User, Notificacion
from app.schemas import ParteCreate, ParteUpdate, ParteResponse
from fastapi_jwt_auth import AuthJWT
from fastapi_jwt_auth.exceptions import AuthJWTException

router = APIRouter()

# Función para enviar notificaciones
def enviar_notificacion(db: Session, usuario_id: int, mensaje: str):
    notificacion = Notificacion(mensaje=mensaje, usuario_id=usuario_id)
    db.add(notificacion)  # Añadir la notificación a la base de datos
    db.commit()           # Confirmar la transacción

# Crear un nuevo parte (incidencia) - Disponible para voluntarios
@router.post("/partes/", response_model=ParteResponse, summary="Crear parte de incidencia")
def crear_parte(
    parte: ParteCreate,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    try:
        # Validar token JWT
        Authorize.jwt_required()
        user_id = int(Authorize.get_jwt_subject())

        # Verificar existencia del usuario
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Crear parte de incidencia
        nuevo_parte = Parte(**parte.dict(), usuario_id=user_id)
        db.add(nuevo_parte)
        db.commit()
        db.refresh(nuevo_parte)
        return nuevo_parte

    except AuthJWTException as e:
        raise HTTPException(status_code=401, detail=f"Error de autenticación: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

# Obtener lista de partes (disponible para administradores)
@router.get("/partes/", response_model=list[ParteResponse], summary="Obtener lista de partes de incidencias")
def obtener_partes(
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    try:
        # Validar token JWT
        Authorize.jwt_required()
        user_id = int(Authorize.get_jwt_subject())

        # Verificar rol de administrador
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.role != "admin":
            raise HTTPException(status_code=403, detail="Acceso denegado: Solo administradores pueden consultar partes")

        # Obtener lista de partes
        partes = db.query(Parte).all()
        return partes

    except AuthJWTException as e:
        raise HTTPException(status_code=401, detail=f"Error de autenticación: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

# Actualizar el estado de un parte (solo administradores)
@router.put("/partes/{parte_id}", response_model=ParteResponse, summary="Actualizar estado de parte")
def actualizar_parte(
    parte_id: int,
    parte_update: ParteUpdate,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    try:
        # Validar token JWT
        Authorize.jwt_required()
        user_id = int(Authorize.get_jwt_subject())

        # Verificar rol de administrador
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.role != "Administrador":
            raise HTTPException(status_code=403, detail="Acceso denegado: Solo administradores pueden actualizar partes")

        # Buscar el parte por ID
        parte = db.query(Parte).filter(Parte.id == parte_id).first()
        if not parte:
            raise HTTPException(status_code=404, detail="Parte no encontrado")

        # Actualizar el estado y responsable
        parte.estado = parte_update.estado
        parte.responsable_id = user_id
        db.commit()
        db.refresh(parte)
        return parte

    except AuthJWTException as e:
        raise HTTPException(status_code=401, detail=f"Error de autenticación: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

