from fastapi import FastAPI, Request, Response
from app.routes import gatos, auth, actividades, partes, colonias, campanas, quejas, inspecciones, informes, voluntarios, backup, password_routes, settings_api
from app.database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from fastapi_jwt_auth import AuthJWT
from fastapi_jwt_auth.exceptions import AuthJWTException
from fastapi.responses import JSONResponse, Response
from app.settings import settings
from fastapi.openapi.utils import get_openapi
import os
import json
from fastapi.staticfiles import StaticFiles
from datetime import datetime

# Importar logger centralizado
from app.utils.logger import get_logger
logger = get_logger("main")

# Leer variable del entorno para mostrar o no /docs
show_docs = os.getenv('SHOW_DOCS', 'false').lower() == 'true'

# Inicializar la base de datos SOLO en desarrollo
if os.getenv("ENV", "dev") == "dev":
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.error(f"Error al inicializar la base de datos: {e}")

# Inicializar la aplicación FastAPI
app = FastAPI(title="Onegat API", version="1.0.0", description="API para la gestión de gatos",
    docs_url="/docs" if show_docs else None,
    redoc_url="/redoc" if show_docs else None,
    openapi_url="/openapi.json" if show_docs else None
    )
# ---- Evento de arranque (para entorno Docker con uvicorn CLI) ----
@app.on_event("startup")
async def on_startup():
    logger.info("Onegat arrancado")


# Asegúrate de que la carpeta existe
os.makedirs("media", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/quejas", exist_ok=True)

# Sirve archivos estáticos
app.mount("/media", StaticFiles(directory="media"), name="media")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configuración de AuthJWT
@AuthJWT.load_config
def get_config():
    return settings

@app.exception_handler(AuthJWTException)
def authjwt_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )

# Configurar middleware CORS (desde settings, no hardcode)
def _parse_allowed_origins():
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    if raw:
        # Si ya es JSON (empieza por [), parsea como JSON
        if raw.startswith("["):
            try:
                return json.loads(raw)
            except Exception:
                pass
        # Si no, trata como CSV
        return [o.strip() for o in raw.split(",") if o.strip()]
    # Fallback a settings si ya es una lista válida
    try:
        return list(settings.allowed_origins or [])
    except Exception:
        return []

app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_allowed_origins(),
    allow_credentials=True,                 # si usas cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas agrupadas bajo /api
app.include_router(auth.auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(gatos.router, prefix="/api/gatos", tags=["Gatos"])
app.include_router(partes.router, prefix="/api/partes", tags=["Partes"])
app.include_router(actividades.router, prefix="/api/actividades", tags=["Actividades"])
app.include_router(colonias.router, prefix="/api/colonias", tags=["Colonias"])
app.include_router(campanas.router, prefix="/api/campanas", tags=["Campañas"])
app.include_router(quejas.router, prefix="/api/quejas", tags=["Quejas"])
app.include_router(inspecciones.router, prefix="/api/inspecciones", tags=["Inspecciones"])
app.include_router(informes.router, prefix="/api/informes", tags=["Informes"])
app.include_router(voluntarios.router, prefix="/api/voluntarios", tags=["Voluntarios"])
app.include_router(backup.router, prefix="/api/backup", tags=["Backup"])
app.include_router(password_routes.router, prefix="/api/auth", tags=["Password Management"])
app.include_router(settings_api.router, prefix="/api", tags=["settings"])

@app.middleware("http")
async def expiration_check(request: Request, call_next):
    # Health sin restricciones
    if request.url.path.startswith("/api/health"):
        return await call_next(request)

    # Licencia / demo-expiration (si procede)
    if datetime.now() > settings.expiration_date:
        return JSONResponse(status_code=403, content={"detail": "La licencia de evaluación ha expirado."})

    return await call_next(request)

# Health público para monitorización
@app.get("/api/health")
def health():
    logger.info("Health check solicitado")
    return {"status": "ok"}

# Configuración personalizada para OpenAPI y JWT
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="FastAPI - Swagger UI",
        version="1.0.0",
        description="Documentación para autenticar con JWT",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    # Aplicamos el esquema de seguridad a todas las rutas
    for path in openapi_schema["paths"].values():
        for operation in path.values():
            operation["security"] = [{"bearerAuth": []}]
    app.openapi_schema = openapi_schema
    return openapi_schema

app.openapi = custom_openapi

# Punto de entrada para desarrollo local
if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Iniciando servidor en modo desarrollo...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_config=None,
        log_level="info"
        )