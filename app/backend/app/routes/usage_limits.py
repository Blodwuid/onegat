# app/routes/usage_limits.py
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Colonia, Gato
from app.settings import settings
from app.utils.utils import enviar_correo  # Ajusta el import si tu util está en otra ruta
import logging

logger = logging.getLogger(__name__)


def _notify_admin(asunto: str, mensaje: str):
    """Envía un aviso al mismo EMAIL_USER configurado en .env."""
    destinatario = settings.email_user  # usamos siempre EMAIL_USER
    if not destinatario:
        return
    try:
        enviar_correo(destinatario, asunto, mensaje)
        logger.info(f"[LÍMITE] Aviso enviado a {destinatario}")
    except Exception as e:
        logger.warning(f"[LÍMITE] No se pudo enviar aviso a {destinatario}: {e}")


def _raise(msg: str) -> None:
    raise HTTPException(status_code=403, detail=msg)


def _warn_threshold() -> float:
    """Umbral de aviso (porcentaje 0–1). Por defecto 0.8 (80%)."""
    try:
        return float(getattr(settings, "warn_threshold", 0.8) or 0.8)
    except Exception:
        return 0.8


def verificar_limite_colonias(db: Session = Depends(get_db)) -> None:
    """Límite GLOBAL de colonias (configurable por .env: MAX_COLONIAS_LIMIT)."""
    limit = settings.max_colonias_limit
    if limit is None:
        return

    total = db.query(Colonia).count()
    ocupacion = total / float(limit) if limit else 0.0

    if total >= limit:
        logger.warning(f"[LÍMITE] Colonias: {total}/{limit} (se intentó crear otra).")
        _notify_admin(
            "🚫 Límite de colonias alcanzado",
            f"Se alcanzó el límite de colonias ({total}/{limit}). Se bloqueó la operación.",
        )
        _raise(f"Has alcanzado el límite de {limit} colonias en esta instancia.")
    elif ocupacion >= _warn_threshold():
        logger.info(f"[AVISO] Colonias al {ocupacion:.0%}: {total}/{limit}.")
        _notify_admin(
            "⚠️ Aviso: colonias cerca del límite",
            f"Ocupación de colonias al {ocupacion:.0%} ({total}/{limit}).",
        )


def verificar_limite_gatos_total(db: Session = Depends(get_db)) -> None:
    """Límite GLOBAL de gatos (configurable por .env: MAX_GATOS_TOTAL_LIMIT)."""
    limit = settings.max_gatos_total_limit
    if limit is None:
        return

    total = db.query(Gato).count()
    ocupacion = total / float(limit) if limit else 0.0

    if total >= limit:
        logger.warning(f"[LÍMITE] Gatos (global): {total}/{limit} (se intentó crear otro).")
        _notify_admin(
            "🚫 Límite global de gatos alcanzado",
            f"Se alcanzó el límite global de gatos ({total}/{limit}). Se bloqueó la operación.",
        )
        _raise(f"Has alcanzado el límite de {limit} gatos en esta instancia.")
    elif ocupacion >= _warn_threshold():
        logger.info(f"[AVISO] Gatos global al {ocupacion:.0%}: {total}/{limit}.")
        _notify_admin(
            "⚠️ Aviso: gatos cerca del límite global",
            f"Ocupación de gatos al {ocupacion:.0%} ({total}/{limit}).",
        )


def verificar_limite_gatos_por_colonia(
    colonia_id: int, db: Session = Depends(get_db)
) -> None:
    """Límite POR COLONIA (opcional, .env: MAX_GATOS_POR_COLONIA)."""
    limit = settings.max_gatos_por_colonia
    if limit is None:
        return

    total = db.query(Gato).filter(Gato.colonia_id == colonia_id).count()
    ocupacion = total / float(limit) if limit else 0.0

    if total >= limit:
        logger.warning(f"[LÍMITE] Gatos en colonia {colonia_id}: {total}/{limit}.")
        _notify_admin(
            "🚫 Límite de gatos por colonia alcanzado",
            f"Colonia {colonia_id} alcanzó su límite ({total}/{limit}). Se bloqueó la operación.",
        )
        _raise(f"Esa colonia ya alcanzó el límite de {limit} gatos.")
    elif ocupacion >= _warn_threshold():
        logger.info(f"[AVISO] Colonia {colonia_id} al {ocupacion:.0%}: {total}/{limit}.")
        _notify_admin(
            "⚠️ Aviso: colonia cerca del límite de gatos",
            f"Colonia {colonia_id} al {ocupacion:.0%} ({total}/{limit}).",
        )
