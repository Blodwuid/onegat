from pydantic import BaseSettings, Field, validator
from datetime import datetime
from typing import Optional, List

class Settings(BaseSettings):
    authjwt_secret_key: str
    authjwt_access_token_expires: int
    encryption_key: str  # Nueva variable para la clave de cifrado
    expiration_date: datetime = Field(..., env="EXPIRATION_DATE")

    # NUEVO: límites por entorno (None = sin límite) alineados con .env y con gatos.py
    max_colonias_limit: Optional[int] = Field(default=None, env="MAX_COLONIAS_LIMIT")
    max_gatos_total_limit: Optional[int] = Field(default=None, env="MAX_GATOS_TOTAL_LIMIT")
    max_gatos_por_colonia: Optional[int] = Field(default=None, env="MAX_GATOS_POR_COLONIA")
    max_gatos_import_csv: Optional[int] = Field(default=None, env="MAX_GATOS_IMPORT_CSV")

    # NUEVO: orígenes permitidos (CSV)
    allowed_origins: List[str] = Field(default_factory=list, env="ALLOWED_ORIGINS")

    email_user: str = Field(..., env="EMAIL_USER")
    email_password: str = Field(..., env="EMAIL_PASSWORD")
    smtp_server: str = Field(..., env="SMTP_SERVER")
    smtp_port: int = Field(..., env="SMTP_PORT")

    municipio_nombre: str = Field(default="Albacete", env="MUNICIPIO_NOMBRE")
    municipio_provincia: str = Field(default="Albacete", env="MUNICIPIO_PROVINCIA")
    municipio_lat: Optional[float] = Field(default=None, env="MUNICIPIO_LAT")
    municipio_lon: Optional[float] = Field(default=None, env="MUNICIPIO_LON")
    municipio_radio_km: Optional[float] = Field(default=None, env="MUNICIPIO_RADIO_KM")


    class Config:
        env_file = ".env"
    
    # Convierte CSV -> lista (soporta también JSON si alguna vez lo usas)
    @validator("allowed_origins", pre=True)
    def _split_csv_allowed_origins(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v or []

settings = Settings()

