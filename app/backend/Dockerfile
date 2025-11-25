FROM python:3.10-slim

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema operativo
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    gcc \
    libpq-dev \
    build-essential \
    python3-dev \
    postgresql-client \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Copiar archivo requirements.txt
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar scripts auxiliares
COPY wait-for-it.sh .
COPY entrypoint.sh .

# Dar permisos de ejecución a los scripts
RUN chmod +x /app/wait-for-it.sh && \
    chmod +x /app/entrypoint.sh

    # Copiar el código de la aplicación
COPY . .

# Exponer el puerto de la aplicación
EXPOSE 8000

# Usar entrypoint personalizado (aplica migraciones + arranca Uvicorn)
ENTRYPOINT ["/app/entrypoint.sh"]