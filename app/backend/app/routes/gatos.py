from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi_jwt_auth import AuthJWT
from app.database import get_db
from app.models import Gato, Colonia, Campana, User
from app.schemas import GatoCreate, GatoResponse, GatoUpdate
from app.settings import settings  # Ajusta si es necesario
from pydantic import BaseSettings
import os
import re
import pandas as pd
import csv
from datetime import datetime
from io import StringIO
from app.routes.usage_limits import (verificar_limite_gatos_total,verificar_limite_gatos_por_colonia,)

# Crear carpeta media si no existe
os.makedirs("media", exist_ok=True)

router = APIRouter()

@router.post("/gatos/", response_model=GatoResponse, dependencies=[Depends(verificar_limite_gatos_total)])
async def create_gato(
    nombre: str = Form(...),
    sexo: str = Form(...),
    ubicacion: str = Form(...),
    colonia_id: int = Form(...),
    file: UploadFile = File(...),  # La imagen es obligatoria

    # Campos opcionales
    raza: Optional[str] = Form(None),
    edad_num: Optional[int] = Form(None),
    edad_unidad: Optional[str] = Form(None),
    estado_salud: Optional[str] = Form(None),
    evaluacion_sanitaria: Optional[str] = Form(None),
    adoptabilidad: Optional[str] = Form(None),
    fecha_vacunacion: Optional[datetime] = Form(None),
    tipo_vacuna: Optional[str] = Form(None),
    fecha_desparasitacion: Optional[datetime] = Form(None),
    fecha_esterilizacion: Optional[datetime] = Form(None),
    codigo_identificacion: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends(),
):
    # --- LÍMITES ANTES DE INSERTAR ---
    # 1) Límite GLOBAL de gatos
    if settings.max_gatos_total_limit is not None:
        total = db.query(Gato).count()
        if total >= settings.max_gatos_total_limit:
            raise HTTPException(
                status_code=403,
                detail=f"Límite alcanzado: Solo se permiten {settings.max_gatos_total_limit} gatos en esta instancia.",
            )
    # 2) Límite POR COLONIA (opcional)
    if settings.max_gatos_por_colonia is not None:
        en_colonia = db.query(Gato).filter(Gato.colonia_id == colonia_id).count()
        if en_colonia >= settings.max_gatos_por_colonia:
            raise HTTPException(
                status_code=403,
                detail=f"Esa colonia ya tiene el máximo de {settings.max_gatos_por_colonia} gatos.",
            )

    # Procesar la imagen si se proporciona
    image_path = None
    if file:
        file_location = f"media/{file.filename}"
        with open(file_location, "wb") as f:
            f.write(file.file.read())
        image_path = file.filename  # Aquí solo se guarda el nombre del archivo
    
    if os.path.exists(file_location):
        print(f"Archivo guardado correctamente en {file_location}")
    else:
        print(f"Error: El archivo no se guardó en {file_location}")


    # Crear el registro del gato en la base de datos
    db_gato = Gato(
        nombre=nombre,
        sexo=sexo,
        ubicacion=ubicacion,
        colonia_id=colonia_id,
        imagen=file.filename,  # Guardamos solo el nombre del archivo

        # Campos opcionales
        raza=raza,
        edad_num=edad_num,
        edad_unidad=edad_unidad,
        estado_salud=estado_salud,
        evaluacion_sanitaria=evaluacion_sanitaria,
        adoptabilidad=adoptabilidad,
        fecha_vacunacion=fecha_vacunacion,
        tipo_vacuna=tipo_vacuna,
        fecha_desparasitacion=fecha_desparasitacion,
        fecha_esterilizacion=fecha_esterilizacion,
        codigo_identificacion=codigo_identificacion,
    )

    db.add(db_gato)
    db.commit()
    db.refresh(db_gato)

    # Actualizar el número de gatos en la colonia asociada
    if colonia_id:
        colonia = db.query(Colonia).filter(Colonia.id == colonia_id).first()
        if colonia:
            colonia.numero_gatos = colonia.numero_gatos + 1 if colonia.numero_gatos else 1
            db.commit()
            
    return GatoResponse.from_orm(db_gato)

@router.get("/gatos/", response_model=List[GatoResponse])
def get_gatos(
    skip: int = 0,
    limit: int = 10,
    incluir_inactivos: bool = False,  # Parámetro para incluir gatos inactivos
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends(),
):
    Authorize.jwt_required()
    query = db.query(Gato)
    if not incluir_inactivos:
        query = query.filter(Gato.activo == True)
    gatos = query.offset(skip).limit(limit).all()
    return gatos

@router.get("/gatos/mis-gatos", response_model=List[GatoResponse])
def get_gatos_filtrados(
    skip: int = 0,
    limit: int = 10,
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends(),
):
    Authorize.jwt_required()
    current_user_id = Authorize.get_jwt_subject()

    from app.models import User  # Asegúrate de tener este import
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Obtener colonias del usuario
    colonias_ids = [col.id for col in user.colonias]
    if not colonias_ids:
        return []

    # Filtrar por colonias
    query = db.query(Gato).filter(Gato.colonia_id.in_(colonias_ids))
    if not incluir_inactivos:
        query = query.filter(Gato.activo == True)

    gatos = query.offset(skip).limit(limit).all()

    # Agregar nombre de la colonia a cada respuesta
    response = []
    for g in gatos:
        colonia_nombre = g.colonia.nombre if g.colonia else None
        response.append(GatoResponse(
            id=g.id,
            nombre=g.nombre,
            sexo=g.sexo,
            ubicacion=g.ubicacion,
            colonia_id=g.colonia_id,
            colonia_nombre=colonia_nombre,
            raza=g.raza,
            edad_num=g.edad_num,
            edad_unidad=g.edad_unidad,
            estado_salud=g.estado_salud,
            evaluacion_sanitaria=g.evaluacion_sanitaria,
            adoptabilidad=g.adoptabilidad,
            fecha_vacunacion=g.fecha_vacunacion,
            tipo_vacuna=g.tipo_vacuna,
            fecha_desparasitacion=g.fecha_desparasitacion,
            fecha_esterilizacion=g.fecha_esterilizacion,
            codigo_identificacion=g.codigo_identificacion,
            imagen=g.imagen,
            activo=g.activo
        ))

    return response

@router.put("/gatos/{gato_id}", response_model=GatoResponse)
def update_gato(gato_id: int, gato: GatoCreate, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    
    db_gato = db.query(Gato).filter(Gato.id == gato_id).first()
    if not db_gato:
        raise HTTPException(status_code=404, detail="Gato no encontrado")

    update_data = gato.dict(exclude_unset=True)
    fecha_esterilizacion_anterior = db_gato.fecha_esterilizacion
    nueva_fecha_esterilizacion = update_data.get("fecha_esterilizacion")

    for key, value in update_data.items():
        setattr(db_gato, key, value)

    db.commit()
    db.refresh(db_gato)

    # Si la fecha de esterilización cambió, asociar a la campaña correspondiente
    if nueva_fecha_esterilizacion and nueva_fecha_esterilizacion != fecha_esterilizacion_anterior:
        campana = (
            db.query(Campana)
            .filter(Campana.fecha_inicio <= nueva_fecha_esterilizacion)
            .filter(Campana.fecha_fin >= nueva_fecha_esterilizacion)
            .order_by(Campana.fecha_inicio.desc())
            .first()
        )

        if campana:
            if db_gato not in campana.gatos:  # Evitar duplicados
                campana.gatos.append(db_gato)
                db.commit()

    # ⚠️ SOLUCIÓN: Retornar la respuesta con todos los campos requeridos por GatoResponse
    return GatoResponse(
        id=db_gato.id,
        nombre=db_gato.nombre,
        sexo=db_gato.sexo,
        ubicacion=db_gato.ubicacion,
        colonia_id=db_gato.colonia_id,
        raza=db_gato.raza,
        edad_num=db_gato.edad_num,
        edad_unidad=db_gato.edad_unidad,
        estado_salud=db_gato.estado_salud,
        evaluacion_sanitaria=db_gato.evaluacion_sanitaria,
        adoptabilidad=db_gato.adoptabilidad,
        fecha_vacunacion=db_gato.fecha_vacunacion,
        tipo_vacuna=db_gato.tipo_vacuna,
        fecha_desparasitacion=db_gato.fecha_desparasitacion,
        fecha_esterilizacion=db_gato.fecha_esterilizacion,
        codigo_identificacion=db_gato.codigo_identificacion,
        imagen=db_gato.imagen,
        activo=db_gato.activo
    )


@router.get("/gatos/{gato_id}", response_model=GatoResponse)
def get_gato(gato_id: int, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    gato = db.query(Gato).filter(Gato.id == gato_id).first()
    if not gato:
        raise HTTPException(status_code=404, detail="Gato no encontrado")
    return gato

@router.delete("/gatos/{gato_id}", response_model=dict)
def delete_gato(gato_id: int, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    
    db_gato = db.query(Gato).filter(Gato.id == gato_id).first()
    if not db_gato:
        raise HTTPException(status_code=404, detail="Gato no encontrado")
    
    # Reducir el número de gatos en la colonia asociada
    if db_gato.colonia_id:
        colonia = db.query(Colonia).filter(Colonia.id == db_gato.colonia_id).first()
        if colonia and colonia.numero_gatos > 0:
            colonia.numero_gatos -= 1
            db.commit()

    db.delete(db_gato)
    db.commit()
    return {"message": "Gato eliminado exitosamente"}

@router.get("/gatos/{gato_id}/ficha", response_model=GatoResponse)
def get_gato_ficha(gato_id: int, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    gato = db.query(Gato).filter(Gato.id == gato_id).first()
    if not gato:
        raise HTTPException(status_code=404, detail="Gato no encontrado")
    return gato

@router.put("/gatos/{gato_id}/baja", response_model=GatoResponse)
def dar_baja_gato(gato_id: int, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()

    # Buscar el gato por ID
    db_gato = db.query(Gato).filter(Gato.id == gato_id).first()
    if not db_gato:
        raise HTTPException(status_code=404, detail="Gato no encontrado")

    # Actualizar el estado activo
    db_gato.activo = False
    db.commit()
    db.refresh(db_gato)

    return db_gato

# Obtener todos los gatos con el nombre de la colonia
@router.get("/gatos/", response_model=List[GatoResponse])
def listar_gatos(db: Session = Depends(get_db)):
    gatos = db.query(Gato).all()
    response = []
    for g in gatos:
        colonia_nombre = g.colonia.nombre if g.colonia else None  # ✅ Obtener el nombre de la colonia
        response.append(GatoResponse(
            id=g.id,
            nombre=g.nombre,
            edad=g.edad,
            colonia_id=g.colonia_id,
            colonia_nombre=colonia_nombre  # ✅ Agregamos el nombre en la respuesta
        ))
    return response

# Endpoint para obtener las colonias disponibles
@router.get("/gatos/colonias/")
def listar_colonias(db: Session = Depends(get_db)):
    colonias = db.query(Colonia).all()
    return [{"id": c.id, "nombre": c.nombre} for c in colonias]

@router.post("/gatos/", response_model=GatoResponse)
def registrar_gato(gato: GatoCreate, db: Session = Depends(get_db)):
    nuevo_gato = Gato(**gato.dict())
    db.add(nuevo_gato)
    db.commit()
    db.refresh(nuevo_gato)
    return GatoResponse(
        id=nuevo_gato.id,
        nombre=nuevo_gato.nombre,
        edad=nuevo_gato.edad,
        colonia_id=nuevo_gato.colonia_id,
        colonia_nombre=nuevo_gato.colonia.nombre if nuevo_gato.colonia else None  # ✅ Retornar nombre de la colonia
    )

# NUEVO ENDPOINT para importar CSV de gatos
@router.post("/gatos/importar-csv")
def importar_gatos_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser formato CSV")

    MAX_BYTES = 2 * 1024 * 1024  # 2MB máximo
    raw = file.file.read(MAX_BYTES)
    contents = raw.decode("utf-8", errors="ignore")

    # Detectar delimitador automáticamente
    def detectar_delimitador(sample):
        try:
            dialect = csv.Sniffer().sniff(sample)
            return dialect.delimiter
        except:
            return ','

    delimiter = detectar_delimitador(contents[:2048])
    df = pd.read_csv(StringIO(contents), sep=delimiter, skiprows=3)

    # ✅ Límites de importación
    # 1) Tamaño máximo del lote CSV
    if settings.max_gatos_import_csv is not None and len(df) > settings.max_gatos_import_csv:
        raise HTTPException(
            status_code=403,
            detail=f"El CSV excede el máximo permitido de {settings.max_gatos_import_csv} registros por importación."
        )
    # 2) Respeta el límite GLOBAL total
    if settings.max_gatos_total_limit is not None:
        total_gatos_actuales = db.query(Gato).count()
        if total_gatos_actuales + len(df) > settings.max_gatos_total_limit:
            raise HTTPException(
                status_code=403,
                detail=f"La importación superaría el límite global de {settings.max_gatos_total_limit} gatos en esta instancia."
            )

    # Mapear columnas del CSV a campos del modelo
    columnas_mapeo = {
        "Nombre": "nombre",
        "Raza": "raza",
        "Sexo": "sexo",
        "Fe.Vacunación": "fecha_vacunacion",
        "Fe.Desparasitación": "fecha_desparasitacion",
        "Código de identificación": "codigo_identificacion",
    }

    # Crear o recuperar colonia de importación
    colonia_importada = db.query(Colonia).filter(Colonia.nombre == "Colonia Importada").first()
    if not colonia_importada:
        responsable = db.query(User).first()  # Opcional
        colonia_importada = Colonia(
            nombre="Colonia Importada",
            ubicacion="Pendiente asignación",
            numero_gatos=0,
            responsable_voluntario=responsable.id if responsable else None
        )
        db.add(colonia_importada)
        db.commit()
        db.refresh(colonia_importada)

    registros_importados = 0
    registros_omitidos = 0

    def limpiar_campo(valor):
        if not isinstance(valor, str):
            return valor
        valor = valor.strip()
        if valor.startswith(("=", "+", "-", "@")):
            valor = f"'{valor}"
        return re.sub(r"[<>]", "", valor)

    for _, row in df.iterrows():
        try:
            print(f"Procesando fila: {row.to_dict()}")

            nombre = limpiar_campo(row.get("Nombre"))
            sexo_raw = limpiar_campo(row.get("Sexo"))
            sexo = normalizar_sexo(sexo_raw)
            codigo_identificacion = limpiar_campo(row.get("Código de identificación"))

            if not nombre or not sexo:
                registros_omitidos += 1
                continue

            if codigo_identificacion:
                gato_existente = db.query(Gato).filter(
                    Gato.codigo_identificacion == str(codigo_identificacion)
                ).first()
                if gato_existente:
                    print(f"Gato con código {codigo_identificacion} ya existe, se omite.")
                    registros_omitidos += 1
                    continue

            fecha_vacunacion = parse_fecha(row.get("Fe.Vacunación"))
            fecha_esterilizacion = fecha_vacunacion  # Mismo valor
            fecha_desparasitacion = parse_fecha(row.get("Fe.Desparasitación"))

            gato = Gato(
                nombre=nombre,
                raza=row.get("Raza"),
                sexo=sexo,
                fecha_esterilizacion=fecha_esterilizacion,
                fecha_vacunacion=fecha_vacunacion,
                fecha_desparasitacion=fecha_desparasitacion,
                codigo_identificacion=codigo_identificacion,
                imagen="default.png",
                ubicacion="Importado",
                colonia_id=colonia_importada.id,
                activo=True
            )
            db.add(gato)
            db.commit()
            registros_importados += 1

        except Exception as e:
            db.rollback()
            print(f"❌ Error en fila: {e}")
            registros_omitidos += 1
            continue

    return {
        "detalle": f"{registros_importados} gatos importados correctamente",
        "omitidos": registros_omitidos
    }


def parse_fecha(valor):
    try:
        return pd.to_datetime(valor, dayfirst=True)
    except:
        return None

def normalizar_sexo(valor):
    if not valor:
        return None
    valor = valor.strip().lower()
    if valor in ["macho", "m", "male", "varón"]:
        return "M"
    elif valor in ["hembra", "h", "female", "mujer"]:
        return "H"
    return None

