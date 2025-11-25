# routes/colonias.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Colonia, Gato, User
from typing import List, Dict, Optional
from pydantic import BaseModel
from sqlalchemy import func  # Para contar gatos
from fastapi_jwt_auth import AuthJWT
import requests
import os
from math import radians, cos, sin, asin, sqrt
from app.utils.utils import enviar_correo
from urllib.parse import quote
from fastapi_jwt_auth import AuthJWT
from app.routes.usage_limits import verificar_limite_colonias
from app.settings import settings

class ColoniaCreate(BaseModel):
    nombre: str
    ubicacion: str
    latitude: Optional[float] = None  # ✅ Soluciona el error
    longitude: Optional[float] = None
    numero_gatos: int = 0
    responsable_voluntario: Optional[str] = None
    estado: str = "activa"

    class Config:
        orm_mode = True

class ColoniaUpdate(BaseModel):
    nombre: str = None
    ubicacion: str = None
    numero_gatos: int = None
    responsable_voluntario: str = None
    estado: str = None

class ColoniaResponse(BaseModel):
    id: int
    nombre: str
    ubicacion: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    numero_gatos: int
    responsable_voluntario: Optional[str] = None
    estado: Optional[str] = None

    class Config:
        orm_mode = True

class GatoResponse(BaseModel):
    id: int
    nombre: str
    raza: str = None
    sexo: str = None
    edad: int = None
    estado_salud: str = None
    ubicacion: str = None
    codigo_identificacion: str = None

    class Config:
        orm_mode = True

class AsignarUsuarioColonia(BaseModel):
    user_id: int
    colonia_id: int

router = APIRouter()

# Municipio autorizado (si está definido en settings; si no, se omite la validación)
MUNICIPIO_AUTORIZADO = (
    {
        "lat": settings.municipio_lat,
        "lon": settings.municipio_lon,
        "radio_km": settings.municipio_radio_km,
    }
    if settings.municipio_lat and settings.municipio_lon and settings.municipio_radio_km
    else None
)

# Geocodificación con OpenStreetMap Nominatim

# Geocodificación directa
def geocode_address(address: str):
    """Convierte una dirección en coordenadas usando OpenStreetMap Nominatim."""
    full_address = f"{address}, {settings.municipio_nombre}, {settings.municipio_provincia}"
    encoded_address = quote(full_address)

    url = f"https://nominatim.openstreetmap.org/search?format=json&q={encoded_address}"

    try:
        print(f"📍 Geocodificando dirección: {full_address}")
        response = requests.get(url, headers={"User-Agent": "BastetApp/1.0"}).json()

        if response and len(response) > 0:
            lat = float(response[0]["lat"])
            lon = float(response[0]["lon"])
            print(f"📡 Coordenadas obtenidas: {lat}, {lon}")
            return lat, lon

        print("⚠️ Respuesta vacía al geocodificar.")
    except Exception as e:
        print(f"❌ Error en la geocodificación: {e}")

    return None, None

# Distancia entre dos puntos usando fórmula de Haversine
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Radio de la Tierra en km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return R * 2 * asin(sqrt(a))

# Verifica si las coordenadas están dentro del municipio autorizado
def validar_municipio_autorizado(lat, lon, municipio):
    if not lat or not lon:
        return False
    distancia = haversine_distance(lat, lon, municipio["lat"], municipio["lon"])
    return distancia <= municipio["radio_km"]

@router.get("/colonias/", response_model=List[ColoniaResponse])
def listar_colonias(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    # Consulta para obtener las colonias junto con el número de gatos asociados
    colonias = db.query(
        Colonia.id,
        Colonia.nombre,
        Colonia.ubicacion,
        Colonia.latitude,
        Colonia.longitude,
        Colonia.responsable_voluntario,
        Colonia.estado,
        func.count(Gato.id).label("numero_gatos")
    ).outerjoin(Gato, Gato.colonia_id == Colonia.id) \
     .group_by(Colonia.id) \
     .offset(skip) \
     .limit(limit) \
     .all()

    # Mapear a una lista de diccionarios para que sea compatible con Pydantic
    return [
        {
            "id": col.id,
            "nombre": col.nombre,
            "ubicacion": col.ubicacion,
            "latitude": col.latitude,
            "longitude": col.longitude,
            "numero_gatos": col.numero_gatos,
            "responsable_voluntario": col.responsable_voluntario,
            "estado": col.estado
        }
        for col in colonias
    ]

@router.post("/colonias/", response_model=ColoniaResponse, dependencies=[Depends(verificar_limite_colonias)])
def crear_colonia(colonia: ColoniaCreate, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    """
    Crea una nueva colonia con geocodificación automática si no se proporcionan coordenadas.
    Si la ubicación no pertenece al municipio autorizado, se bloquea el registro y se notifica por email.
    También sincroniza el responsable_voluntario con la asignación real de usuario (insensible a mayúsculas y espacios).
    """
    print("📩 Recibida solicitud para crear colonia...")
    print(f"📘 Datos recibidos: {colonia.dict()}")

    # Validar token y obtener usuario autenticado
    Authorize.jwt_required()
    usuario_actual = Authorize.get_jwt_subject()
    print(f"🔐 Usuario autenticado: {usuario_actual}")

    # 1. Geocodificación directa si no hay coordenadas
    if not colonia.latitude or not colonia.longitude:
        if not colonia.ubicacion:
            raise HTTPException(status_code=400, detail="Ubicación requerida para geocodificar.")

        print(f"📍 Geocodificando: {colonia.ubicacion}")
        lat, lon = geocode_address(colonia.ubicacion)

        print(f"📌 Coordenadas obtenidas: {lat}, {lon}")
        if not lat or not lon:
            print("⚠️ Error durante geocodificación: Geocodificación fallida, coordenadas vacías")

            # Notificación al admin si falla la geocodificación
            ADMIN_EMAIL = os.getenv("ADMIN_EMAIL") or os.getenv("EMAIL_USER")
            asunto = "❌ Error de Geocodificación en Registro de Colonia"
            mensaje = (
                f"Se intentó registrar una colonia con una ubicación que no pudo ser geocodificada.\n\n"
                f"🏘️ Ubicación: {colonia.ubicacion}\n"
                f"👤 Responsable: {colonia.responsable_voluntario or 'N/A'}\n"
                f"🔐 Usuario autenticado: {usuario_actual}\n"
            )
            try:
                enviar_correo(ADMIN_EMAIL, asunto, mensaje)
                print(f"✉️ Notificación de error enviada a {ADMIN_EMAIL}")
            except Exception as e:
                print(f"⚠️ Fallo al enviar notificación al admin: {e}")

            raise HTTPException(status_code=400, detail=f"No se pudo geocodificar la ubicación: {colonia.ubicacion}")

        colonia.latitude = lat
        colonia.longitude = lon

    # 2. Validación del municipio autorizado (solo si está configurado)
    if MUNICIPIO_AUTORIZADO and not validar_municipio_autorizado(
        colonia.latitude, colonia.longitude, MUNICIPIO_AUTORIZADO
    ):
        ADMIN_EMAIL = os.getenv("ADMIN_EMAIL") or os.getenv("EMAIL_USER")
        asunto = "🚨 Intento de Registro No Autorizado"
        mensaje = (
            f"Se ha intentado registrar una colonia fuera del municipio autorizado.\n\n"
            f"📍 Coordenadas: ({colonia.latitude}, {colonia.longitude})\n"
            f"🏘️ Ubicación: {colonia.ubicacion}\n"
            f"👤 Responsable: {colonia.responsable_voluntario or 'N/A'}\n"
            f"🔐 Usuario autenticado: {usuario_actual}\n"
        )
        try:
            enviar_correo(ADMIN_EMAIL, asunto, mensaje)
            print(f"✉️ Notificación enviada al admin ({ADMIN_EMAIL})")
        except Exception as e:
            print(f"⚠️ Error al enviar correo al admin: {e}")

        raise HTTPException(status_code=403, detail="Ubicación fuera del municipio autorizado por la licencia.")

    # 3. Crear colonia
    nueva_colonia = Colonia(**colonia.dict())
    db.add(nueva_colonia)
    db.commit()
    db.refresh(nueva_colonia)
    print(f"✅ Colonia '{nueva_colonia.nombre}' creada correctamente con ID {nueva_colonia.id}")

    # 4. Asignar voluntario si aplica
    if colonia.responsable_voluntario:
        username = colonia.responsable_voluntario.strip().lower()
        user = db.query(User).filter(func.lower(User.username) == username).first()
        if user and user not in nueva_colonia.usuarios:
            nueva_colonia.usuarios.append(user)
            db.commit()
            print(f"👥 Voluntario '{user.username}' asignado a colonia.")
    
    return nueva_colonia

@router.put("/colonias/{colonia_id}", response_model=ColoniaCreate)
def actualizar_colonia(colonia_id: int, colonia_actualizada: ColoniaUpdate, db: Session = Depends(get_db)):
    colonia_db = db.query(Colonia).filter(Colonia.id == colonia_id).first()
    if not colonia_db:
        raise HTTPException(status_code=404, detail="Colonia no encontrada")
    for key, value in colonia_actualizada.dict(exclude_unset=True).items():
        setattr(colonia_db, key, value)
    db.commit()
    db.refresh(colonia_db)
    return colonia_db

@router.get("/colonias/{colonia_id}/gatos", response_model=List[GatoResponse])
def listar_gatos_de_colonia(colonia_id: int, db: Session = Depends(get_db)):
    colonia = db.query(Colonia).filter(Colonia.id == colonia_id).first()
    if not colonia:
        raise HTTPException(status_code=404, detail="Colonia no encontrada")
    return colonia.gatos

@router.get("/colonias/{colonia_id}/esterilizados", response_model=Dict[str, float])
def get_esterilizados_por_colonia(
    colonia_id: int, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()
):
    """Obtiene el número y porcentaje de gatos esterilizados en una colonia."""
    Authorize.jwt_required()
    
    # Obtener total de gatos en la colonia
    total_gatos = db.query(Gato).filter(Gato.colonia_id == colonia_id).count()
    if total_gatos == 0:
        raise HTTPException(status_code=404, detail="No hay gatos registrados en esta colonia")
    
    # Contar los gatos que tienen fecha de esterilización registrada (considerados esterilizados)
    gatos_esterilizados = db.query(Gato).filter(
        Gato.colonia_id == colonia_id, Gato.fecha_esterilizacion.isnot(None)
    ).count()
    
    # Calcular el porcentaje de esterilización
    porcentaje_esterilizados = (gatos_esterilizados / total_gatos) * 100
    
    return {
        "total_gatos": total_gatos,
        "gatos_esterilizados": gatos_esterilizados,
        "porcentaje_esterilizados": round(porcentaje_esterilizados, 2)
    }

@router.get("/colonias/mapa/colonias", response_model=list[ColoniaResponse])
def get_colonias_mapa(db: Session = Depends(get_db)):
    colonias = db.query(Colonia).filter(Colonia.latitude.isnot(None), Colonia.longitude.isnot(None)).all()
    return colonias

@router.post("/asignar_usuario/")
def asignar_usuario_colonia(asignacion: AsignarUsuarioColonia, db: Session = Depends(get_db)):
    from app.models import User, Colonia  # Importación explícita por claridad

    user = db.query(User).filter(User.id == asignacion.user_id).first()
    colonia = db.query(Colonia).filter(Colonia.id == asignacion.colonia_id).first()

    if not user or not colonia:
        raise HTTPException(status_code=404, detail="Usuario o colonia no encontrada")

    if user not in colonia.usuarios:
        colonia.usuarios.append(user)
        db.commit()
    
    return {"mensaje": "Usuario asignado a colonia correctamente"}

@router.get("/asignaciones/", tags=["Usuarios"])
def obtener_asignaciones(db: Session = Depends(get_db)):
    asignados = db.query(User).filter(User.role.in_(["voluntario", "usuario"])).all()
    
    resultados = []
    for user in asignados:
        for colonia in user.colonias:
            resultados.append({
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "colonia_nombre": colonia.nombre
            })
    
    return resultados

@router.get("/colonias/mis-colonias", response_model=List[ColoniaResponse])
def get_mis_colonias(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user_id = Authorize.get_jwt_subject()

    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 🔁 Recalcular número de gatos por colonia
    colonias = []
    for col in user.colonias:
        count = db.query(Gato).filter(Gato.colonia_id == col.id).count()
        colonias.append({
            "id": col.id,
            "nombre": col.nombre,
            "ubicacion": col.ubicacion,
            "latitude": col.latitude,
            "longitude": col.longitude,
            "numero_gatos": count,
            "responsable_voluntario": col.responsable_voluntario,
            "estado": col.estado,
        })

    return colonias

