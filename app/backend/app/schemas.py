from typing import Optional
from pydantic import BaseModel, validator, EmailStr
from datetime import datetime
from datetime import date

class GatoBase(BaseModel):
    nombre: str
    sexo: str
    ubicacion: str
    colonia_id: int
    colonia_nombre: Optional[str] = None
    
    raza: Optional[str] = None
    edad_num: Optional[int] = None
    edad_unidad: Optional[str] = None
    estado_salud: Optional[str] = None
    evaluacion_sanitaria: Optional[str] = None
    adoptabilidad: Optional[str] = None
    fecha_vacunacion: Optional[date] = None
    tipo_vacuna: Optional[str] = None
    fecha_desparasitacion: Optional[date] = None
    fecha_esterilizacion: Optional[date] = None
    codigo_identificacion: Optional[str] = None
    imagen: Optional[str] = None  # Hacer que la imagen sea opcional en la base

    @validator("codigo_identificacion")
    def validate_codigo_identificacion(cls, v):
        if v is not None and (not v.isdigit() or len(v) != 15):
            raise ValueError("El código de identificación debe contener exactamente 15 dígitos.")
        return v

class GatoCreate(GatoBase):
    pass

class GatoUpdate(BaseModel):
    nombre: Optional[str] = None
    raza: Optional[str] = None
    sexo: Optional[str] = None
    edad_num: Optional[int] = None
    edad_unidad: Optional[str] = None
    estado_salud: Optional[str] = None
    ubicacion: Optional[str] = None
    colonia_id: Optional[int] = None
    evaluacion_sanitaria: Optional[str] = None
    adoptabilidad: Optional[str] = None
    fecha_vacunacion: Optional[str] = None
    tipo_vacuna: Optional[str] = None
    fecha_desparasitacion: Optional[str] = None
    fecha_esterilizacion: Optional[str] = None
    codigo_identificacion: Optional[str] = None
    imagen: Optional[str] = None  

    @validator("fecha_vacunacion", "fecha_desparasitacion", "fecha_esterilizacion", pre=True)
    def validate_date(cls, value):
        """
        Asegura que la fecha es un string en formato YYYY-MM-DD.
        """
        if value:
            try:
                return datetime.strptime(value, "%Y-%m-%d").strftime("%Y-%m-%d")  # Convertir y validar formato
            except ValueError:
                raise ValueError(f"Formato de fecha inválido: {value}. Se espera YYYY-MM-DD.")
        return None

    class Config:
        orm_mode = True

class GatoResponse(GatoBase):
    id: int

    class Config:
        orm_mode = True

class RegisterSchema(BaseModel):
    username: str
    password: str
    role: str
    email: EmailStr = None  # Agregamos el email, opcional pero obligatorio si es voluntario

class LoginSchema(BaseModel):
    username: str
    password: str
    accepted_terms: Optional[bool] = None  # Solo requerido si no ha aceptado antes

class ActividadCreate(BaseModel):
    tipo: str
    descripcion: Optional[str] = None
    gato_id: int

class ActividadResponse(BaseModel):
    id: int
    descripcion: str
    fecha_hora: datetime
    voluntario_id: int
    estatus: str

    class Config:
        orm_mode = True

class ColoniaResponse(BaseModel):
    id: int
    nombre: str
    ubicacion: Optional[str] = None
    numero_gatos: int
    responsable_voluntario: Optional[str] = None
    estado: Optional[str] = None

    class Config:
        orm_mode = True


# Esquema para partes (incidencias)
class ParteCreate(BaseModel):
    descripcion: str

class ParteUpdate(BaseModel):
    estado: str  # pendiente, en progreso, resuelto

class ParteResponse(BaseModel):
    id: int
    descripcion: str
    estado: str
    fecha_hora: datetime
    usuario_id: int
    responsable_id: Optional[int] = None

    class Config:
        orm_mode = True

class CampanaResponse(BaseModel):
    id: int
    nombre: str
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    estatus: str
    voluntarios_involucrados: Optional[str] = None
    gatos_objetivo: int
    gatos_esterilizados: int

    class Config:
        orm_mode = True

class CampanaCreate(BaseModel):
    nombre: str
    fecha_inicio: str
    fecha_fin: Optional[str] = None
    estatus: str = "planeada"
    voluntarios_involucrados: Optional[str] = None
    gatos_objetivo: int = 0

    class Config:
        orm_mode = True

class CampanaUpdate(BaseModel):
    nombre: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    estatus: Optional[str] = None
    voluntarios_involucrados: Optional[str] = None
    gatos_objetivo: Optional[int] = None
    gatos_esterilizados: Optional[int] = None

# Esquema para recibir datos al crear una queja
class QuejaCreate(BaseModel):
    colonia_id: int
    descripcion: str

# Esquema para la respuesta de una queja
class QuejaResponse(QuejaCreate):
    id: int

    class Config:
        orm_mode = True

# Esquema para recibir datos al crear una inspección
class InspeccionCreate(BaseModel):
    colonia_id: int
    descripcion: str

# Esquema para la respuesta de una inspección
class InspeccionResponse(InspeccionCreate):
    id: int

    class Config:
        orm_mode = True

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    email: str | None = None
    accepted_terms: bool
    accepted_terms_date: Optional[datetime]
    accepted_demo_terms: bool
    accepted_demo_terms_date: Optional[datetime]

    class Config:
        orm_mode = True
