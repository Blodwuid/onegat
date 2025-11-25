from fastapi import APIRouter
from app.settings import settings

router = APIRouter()

@router.get("/settings")
def get_settings():
    """Devuelve parámetros de configuración del municipio para el frontend."""
    return {
        "municipio_lat": settings.municipio_lat,
        "municipio_lon": settings.municipio_lon,
        "municipio_radio_km": settings.municipio_radio_km,
        "municipio_nombre": settings.municipio_nombre,
        "municipio_provincia": settings.municipio_provincia,
        "map_zoom": 14,  # puedes hacerlo configurable si quieres
    }
