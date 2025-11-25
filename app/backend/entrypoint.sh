#!/usr/bin/env bash
set -e

echo "🕒 Esperando a que Postgres esté listo..."

: "${POSTGRES_HOST:=db}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:=postgres}"
: "${BACKEND_PORT:=8000}"

# Espera a Postgres
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; do
  echo "⏳ Postgres no está listo aún... esperando..."
  sleep 2
done
echo "✅ Base de datos lista."

# --- Migraciones Alembic (solo si hay pendientes) ---
echo "🔎 Comprobando estado de migraciones Alembic..."

# Alembic imprime "None" si no existe alembic_version (DB virgen)
CURRENT_RAW="$(alembic current || true)"
HEADS_RAW="$(alembic heads || true)"

CURRENT="$(echo "$CURRENT_RAW" | awk '{print $1}' | paste -sd ',' -)"
HEADS="$(echo "$HEADS_RAW" | awk '{print $1}' | paste -sd ',' -)"

if [ -z "$CURRENT" ] || [ "$CURRENT" = "None" ]; then
  echo "📦 Base de datos sin historial de migraciones. Ejecutando 'alembic upgrade head'..."
  alembic upgrade head
elif [ "$CURRENT" = "$HEADS" ]; then
  echo "👍 Migraciones al día (current=$CURRENT). No se hace nada."
else
  echo "⬆️  Migraciones pendientes (current=$CURRENT → head=$HEADS). Ejecutando upgrade..."
  alembic upgrade head
fi

# --- Arranque de la app ---
echo "🚀 Iniciando aplicación en puerto ${BACKEND_PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}"
