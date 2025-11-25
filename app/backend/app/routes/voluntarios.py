""# routes/voluntarios.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.models import User, ActividadVoluntario, Colonia, Notificacion, Queja, Inspeccion
from app.schemas import ActividadResponse, QuejaCreate, QuejaResponse, InspeccionCreate, InspeccionResponse
from app.utils.utils import enviar_correo

# Definición de esquemas para Pydantic
class VoluntarioResponse(BaseModel):
    id: int
    username: str
    email: str  # Se incluye email para notificaciones
    role: str
    colonia_nombre: str = None

    class Config:
        orm_mode = True

class VoluntarioCreate(BaseModel):
    username: str
    email: str  # Ahora se requiere el email
    role: str = "voluntario"

    class Config:
        orm_mode = True


class ActividadCreate(BaseModel):
    descripcion: str
    voluntario_id: int
    estatus: str = "pendiente"

    class Config:
        orm_mode = True

router = APIRouter()

# Endpoint para listar voluntarios
@router.get("/voluntarios/", response_model=List[VoluntarioResponse])
def listar_voluntarios(db: Session = Depends(get_db)):
    voluntarios = db.query(User).filter(User.role == "voluntario").all()

    resultado = []
    for voluntario in voluntarios:
        colonia = db.query(Colonia).filter(Colonia.responsable_voluntario == voluntario.username).first()
        resultado.append({
            "id": voluntario.id,
            "username": voluntario.username,
            "email": voluntario.email,
            "role": voluntario.role,
            "colonia_nombre": colonia.nombre if colonia else "No asignada"
        })
    
    return resultado

@router.get("/usuarios_asignables/")
def listar_usuarios_asignables(db: Session = Depends(get_db)):
    from app.models import User
    roles_permitidos = ["voluntario", "usuario"]
    usuarios = db.query(User).filter(User.role.in_(roles_permitidos)).all()
    return [{"id": u.id, "nombre": u.username} for u in usuarios]

@router.post("/voluntarios/")
def crear_voluntario(voluntario: VoluntarioCreate, db: Session = Depends(get_db)):
    nuevo_voluntario = User(username=voluntario.username, email=voluntario.email, role=voluntario.role)
    db.add(nuevo_voluntario)
    db.commit()
    db.refresh(nuevo_voluntario)
    return nuevo_voluntario

# Endpoint para asignar actividad a un voluntario
@router.post("/actividades_voluntarios/", response_model=ActividadResponse)
def asignar_actividad(actividad: ActividadCreate, db: Session = Depends(get_db)):
    voluntario = db.query(User).filter(User.id == actividad.voluntario_id, User.role == "voluntario").first()
    if not voluntario:
        raise HTTPException(status_code=404, detail="Voluntario no encontrado")
    
    nueva_actividad = ActividadVoluntario(**actividad.dict())
    db.add(nueva_actividad)
    db.commit()
    db.refresh(nueva_actividad)
    return nueva_actividad

# Endpoint para actualizar actividad del voluntario
@router.put("/actividades_voluntarios/{actividad_id}", response_model=ActividadResponse)
def actualizar_actividad(actividad_id: int, actividad_actualizada: ActividadCreate, db: Session = Depends(get_db)):
    actividad_db = db.query(ActividadVoluntario).filter(ActividadVoluntario.id == actividad_id).first()
    if not actividad_db:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    
    for key, value in actividad_actualizada.dict(exclude_unset=True).items():
        setattr(actividad_db, key, value)
    
    db.commit()
    db.refresh(actividad_db)
    return actividad_db

### FUNCIONALIDAD DE NOTIFICACIONES POR CORREO ###
def notificar_voluntario(colonia_id: int, tipo_evento: str, db: Session):
    """
    Envía una notificación por correo electrónico al voluntario responsable de la colonia cuando hay una queja o inspección.
    """
    colonia = db.query(Colonia).filter(Colonia.id == colonia_id).first()
    if colonia and colonia.responsable_id:
        voluntario = db.query(User).filter(User.id == colonia.responsable_id).first()
        if voluntario:
            mensaje = f"Hola {voluntario.username},\n\nSe ha registrado una nueva {tipo_evento} en la colonia '{colonia.nombre}'. Por favor revisa los detalles en el sistema.\n\nSaludos,\nGestión de Colonias Felinas."
            
            nueva_notificacion = Notificacion(
                usuario_id=voluntario.id,
                mensaje=mensaje,
                tipo="alerta",
            )
            db.add(nueva_notificacion)
            db.commit()

            # Enviar correo electrónico
            enviar_correo(voluntario.email, f"Nueva {tipo_evento} en tu colonia", mensaje)

### ENDPOINT PARA REGISTRAR UNA QUEJA ###
@router.post("/quejas/", response_model=QuejaResponse)
def registrar_queja(queja: QuejaCreate, db: Session = Depends(get_db)):
    nueva_queja = Queja(**queja.dict())  # Convertimos Pydantic a SQLAlchemy
    db.add(nueva_queja)
    db.commit()
    db.refresh(nueva_queja)
    notificar_voluntario(nueva_queja.colonia_id, "queja", db)
    return nueva_queja  # Devuelve una respuesta válida con Pydantic

### ENDPOINT PARA REGISTRAR UNA INSPECCIÓN ###
@router.post("/inspecciones/", response_model=InspeccionResponse)
def registrar_inspeccion(inspeccion: InspeccionCreate, db: Session = Depends(get_db)):
    nueva_inspeccion = Inspeccion(**inspeccion.dict())  # Convertimos Pydantic a SQLAlchemy
    db.add(nueva_inspeccion)
    db.commit()
    db.refresh(nueva_inspeccion)
    notificar_voluntario(nueva_inspeccion.colonia_id, "inspección", db)
    return nueva_inspeccion  # Devuelve una respuesta válida con Pydantic

