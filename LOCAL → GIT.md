# 7.1. Rama estable vs. rama de desarrollo
# Te propongo un esquema sencillo:
main → versión estable (lo que está en producción).
develop → trabajo en curso.

#Crear rama develop:
# cd ~/onegat
git checkout -b develop
git push -u origin develop

# 7.2. Ciclo de desarrollo en tu PC
# Para cada nueva mejora/funcionalidad:
# Desde develop crea una rama de feature:
git checkout develop
git pull
git checkout -b feature/nueva-funcionalidad
# Cambias código en local.
# Pruebas con Docker en local.
# Cuando esté bien:
git add .
git commit -m "Implementa X en backend/frontend"
git push -u origin feature/nueva-funcionalidad

# (Opcional) Haces un “Pull Request” de feature/nueva-funcionalidad → develop.
git status
# Cuando todo esté bien, mergeas a develop y luego a main.
#7.3. Actualizar el servidor desde Git (no ahora, pero este será el flujo)
#En el servidor, en el futuro, la idea es:
#Tener /opt/onegat como clon de Git, no como carpeta tocada a mano.
# Para desplegar:
# cd /opt/onegat
git fetch --all
git checkout main
git pull
#Copiar/usar .env locales del servidor (que no están en Git).
#Levantar contenedores como ahora:
# cd /opt/onegat/app
docker compose -f docker-compose.build.yml --env-file .env up -d --build

# cd /opt/onegat/tenants/laroda
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
