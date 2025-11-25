import logging
import os

INSTANCE = os.getenv("ONEGAT_INSTANCE", "default")

def get_logger(name: str = None) -> logging.Logger:
    """
    Devuelve un logger configurado con prefijo de instancia.
    Si no se pasa nombre, usará el nombre de la instancia como identificador.
    """
    logger = logging.getLogger(name if name else INSTANCE)

    if not logger.handlers:  # evitar duplicados si se importa varias veces
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            f"[{INSTANCE}] %(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    return logger