# migrations/env.py
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# Añadir la carpeta "app" al sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Cargar variables de entorno (.env.prod.local, .env, etc.)
load_dotenv()

# Configuración de Alembic
config = context.config

# Sobrescribir sqlalchemy.url con la variable del entorno
#database_url = os.getenv("DATABASE_URL")
#if database_url:
#    config.set_main_option("sqlalchemy.url", database_url)
database_url = os.getenv("DATABASE_URL", "postgresql://dummy:dummy@localhost/dummy")
config.set_main_option("sqlalchemy.url", database_url)

# Logging de alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Importar Base y modelos
from app.database import Base
import app.models  # ⚡ Importa todos los modelos

# Metadata de los modelos para autogenerar migraciones
target_metadata = Base.metadata

def run_migrations_offline():
    """Ejecutar migraciones en modo 'offline'."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,  # Detecta cambios de tipo/longitud
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Ejecutar migraciones en modo 'online' con fallback a 'offline'."""
    cfg_section = config.get_section(config.config_ini_section)

    try:
        connectable = engine_from_config(
            cfg_section,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
            future=True,
        )
        # Intentar abrir conexión real
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,  # detectar cambios de tipo/longitud
            )
            with context.begin_transaction():
                context.run_migrations()
    except Exception as e:
        print("⚠️  Sin DB accesible; usando modo 'offline' para autogenerar. Detalle:", e)
        # Fallback sin conexión
        run_migrations_offline()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
