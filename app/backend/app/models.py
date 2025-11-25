from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Table, MetaData, Float
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

# Tabla intermedia para la relación muchos-a-muchos entre Campanas y Gatos
metadata = Base.metadata
campanas_gatos = Table(
    "campanas_gatos",
    metadata,
    Column("campana_id", Integer, ForeignKey("campanas.id", ondelete="CASCADE"), primary_key=True),
    Column("gato_id", Integer, ForeignKey("gatos.id", ondelete="CASCADE"), primary_key=True),
)

usuarios_colonias = Table(
    "usuarios_colonias",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("colonia_id", Integer, ForeignKey("colonias.id", ondelete="CASCADE"), primary_key=True),
)

class Gato(Base):
    __tablename__ = "gatos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    raza = Column(String)
    sexo = Column(String, nullable=False)
    edad_num = Column(Integer, nullable=True)  # Almacena el número (0-12 meses o 1+ años)
    edad_unidad = Column(String, nullable=True)  # "meses" o "años"
    estado_salud = Column(String)
    ubicacion = Column(String)
    colonia_id = Column(Integer, ForeignKey("colonias.id", ondelete="SET NULL"), nullable=True)  # Relación con colonia
    evaluacion_sanitaria = Column(String, nullable=True)  # Evaluación sanitaria del gato
    adoptabilidad = Column(String, nullable=True)  # Estado de adoptabilidad
    fecha_vacunacion = Column(DateTime, nullable=True)  # Fecha de la última vacunación
    tipo_vacuna = Column(String, nullable=True)  # Tipo de vacuna aplicada
    fecha_desparasitacion = Column(DateTime, nullable=True)  # Fecha de la última desparasitación
    fecha_esterilizacion = Column(DateTime, nullable=True)  # Fecha de esterilización
    codigo_identificacion = Column(String(15), nullable=True)
    imagen = Column(String, nullable=True)  # Ruta de la imagen
    activo = Column(Boolean, default=True)  # Nuevo campo para marcar si está activo

    colonia = relationship("Colonia", back_populates="gatos")
    campanas = relationship("Campana", secondary=campanas_gatos, back_populates="gatos")

class Campana(Base):
    __tablename__ = "campanas"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=True)
    estatus = Column(String, default="planeada")  # Planeada, en progreso, completada
    voluntarios_involucrados = Column(String, nullable=True)
    gatos_objetivo = Column(Integer, default=0)
    gatos_esterilizados = Column(Integer, default=0)

    gatos = relationship("Gato", secondary=campanas_gatos, back_populates="campanas")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)  # Nuevo campo
    accepted_terms = Column(Boolean, default=False)
    accepted_terms_date = Column(DateTime, nullable=True)
    accepted_demo_terms = Column(Boolean, default=False)
    accepted_demo_terms_date = Column(DateTime, nullable=True)

    actividades = relationship("ActividadVoluntario", back_populates="voluntario")
    colonias = relationship( "Colonia", secondary=usuarios_colonias, back_populates="usuarios")

class ActividadVoluntario(Base):
    __tablename__ = "actividades_voluntarios"
    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String, nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow)
    voluntario_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    estatus = Column(String, default="pendiente")  # pendiente, en progreso, completada

    voluntario = relationship("User", back_populates="actividades")

class Colonia(Base):
    __tablename__ = "colonias"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    ubicacion = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)  # Coordenada geográfica
    longitude = Column(Float, nullable=True)  # Coordenada geográfica
    numero_gatos = Column(Integer, default=0)
    responsable_voluntario = Column(String, nullable=True)
    estado = Column(String, default="activa")

    gatos = relationship("Gato", back_populates="colonia")
    quejas = relationship("Queja", back_populates="colonia")
    inspecciones = relationship("Inspeccion", back_populates="colonia")
    usuarios = relationship( "User", secondary=usuarios_colonias, back_populates="colonias")

class Queja(Base):
    __tablename__ = "quejas"
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, default=datetime.utcnow)
    descripcion = Column(String, nullable=False)
    estatus = Column(String, default="pendiente")  # pendiente, en progreso, resuelto
    colonia_id = Column(Integer, ForeignKey("colonias.id", ondelete="SET NULL"), nullable=True)
    solucion_responsable = Column(String, nullable=True)
    archivo = Column(String, nullable=True)

    colonia = relationship("Colonia", back_populates="quejas")

class Inspeccion(Base):
    __tablename__ = "inspecciones"
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, default=datetime.utcnow)
    colonia_id = Column(Integer, ForeignKey("colonias.id", ondelete="CASCADE"), nullable=False)
    observaciones = Column(String, nullable=False)
    acciones_recomendadas = Column(String, nullable=True)
    estatus = Column(String, default="pendiente")  # Agregar campo si no existe
    archivo = Column(String, nullable=True)  # Asegurar que el campo está definido

    colonia = relationship("Colonia", back_populates="inspecciones")

class Actividad(Base):
    __tablename__ = "actividades"
    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, nullable=False)
    descripcion = Column(String, nullable=True)
    fecha_hora = Column(DateTime, default=datetime.utcnow)
    usuario_id = Column(Integer, ForeignKey("users.id"))
    gato_id = Column(Integer, ForeignKey("gatos.id"))

class Parte(Base):
    __tablename__ = "partes"
    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String, nullable=False)
    estado = Column(String, default="pendiente")  # pendiente, en progreso, resuelto
    fecha_hora = Column(DateTime, default=datetime.utcnow)
    usuario_id = Column(Integer, ForeignKey("users.id"))
    responsable_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class Notificacion(Base):
    __tablename__ = "notificaciones"
    id = Column(Integer, primary_key=True, index=True)
    mensaje = Column(String, nullable=False)
    usuario_id = Column(Integer, ForeignKey("users.id"))
    leido = Column(Boolean, default=False)
    fecha_hora = Column(DateTime, default=datetime.utcnow)
