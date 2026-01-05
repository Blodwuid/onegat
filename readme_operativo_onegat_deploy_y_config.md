# README Operativo ONEGAT — Despliegue, Configuración y Rollback

Este documento define **el procedimiento operativo oficial** para ONEGAT en un modelo SaaS con **DEV/BUILD separado de PROD**.\
Debe consultarse **antes de cualquier intervención** en producción.

---

## 1. Principio Fundamental del Sistema

**DEV/BUILD fabrica. PROD ejecuta.**

- DEV/BUILD:
  - build
  - tag
  - push
- PROD:
  - pull
  - up -d
  - configuración vía `.env`

❌ En PROD **nunca** se hace build.

---

## 2. Modelo Mental Correcto

### 2.1 Imágenes Docker

- `:local`

  - Artefacto temporal
  - Se sobrescribe sin riesgo
  - Nunca se usa en PROD

- `:tenant` (ej. `:prueba`, `:hellin`)

  - Imagen versionada
  - Inmutable
  - Asociada a un frontend concreto

- `:stable`

  - Alias de una versión validada
  - Punto de rollback

---

## 3. Flujo Oficial DEV/BUILD (fabricación)

### 3.1 Build

```bash
docker compose -f docker-compose.build.yml build
```

Genera siempre:

- `onegat/backend:local`
- `onegat/frontend:local`

---

### 3.2 Tag (versionado)

```bash
docker tag onegat/frontend:local blodwuid/frontend:prueba
docker tag onegat/backend:local  blodwuid/backend:prueba
```

> No recompila. Solo crea alias versionados.

---

### 3.3 Push al registry

```bash
docker push blodwuid/frontend:prueba
docker push blodwuid/backend:prueba
```

A partir de aquí:

- Existe versionado
- Existe rollback
- PROD puede consumir sin build

---

### 3.4 Promoción a `stable`

Cuando una versión es funcional:

```bash
docker tag blodwuid/frontend:prueba blodwuid/frontend:stable
docker push blodwuid/frontend:stable
```

(Idem backend solo si ha cambiado)

---

## 4. Flujo Oficial PROD (ejecución)

### 4.1 Reglas inmutables

❌ Prohibido:

- `docker build`
- `docker compose build`
- `up --build`

✅ Permitido:

- `pull`
- `up -d`

---

### 4.2 Despliegue de un tenant

En `/opt/onegat/tenants/<TENANT>`:

```yaml
backend:
  image: blodwuid/backend:stable

frontend:
  image: blodwuid/frontend:<tenant>
```

Despliegue:

```bash
docker compose pull
docker compose up -d
```

---

## 5. Cambios de Configuración (`.env`)

### 5.1 Qué entra aquí

- SHOW\_DOCS
- dominios
- expiraciones
- JWT
- emails
- límites
- flags de comportamiento

👉 Son **cambios de configuración**, no de versión.

---

### 5.2 Procedimiento estándar

```bash
cd /opt/onegat/tenants/<TENANT>
cp .env .env.bak-$(date +%Y%m%d-%H%M)
nano .env
docker compose -f docker-compose.prod.yml up -d

```

- Misma imagen
- Nuevo entorno
- Downtime mínimo

Comprobación recomendada (opcional pero rigurosa)

Antes de levantar:
```bash
docker compose -f docker-compose.prod.yml config

```
Si eso no da error, el up -d es seguro.


### 5.3 Procedimiento reforzado (si hay estado raro)

```bash
docker compose down
docker compose up -d
```

Usar solo si:

- contenedores `unhealthy`
- errores persistentes
- estado inconsistente

❌ Nunca usar `down -v`

---

## 6. Rollback Inmediato (PROD)

### 6.1 Cuándo

- Error tras despliegue
- Fallo funcional
- Incertidumbre operativa

---

### 6.2 Cómo

Editar `docker-compose.prod.yml`:

```yaml
image: blodwuid/frontend:stable
```

Aplicar:

```bash
docker compose pull
docker compose up -d
```

- No se tocan datos
- No se recompila
- Rollback en segundos

---

## 7. Tabla de Decisión Rápida

| Cambio        | Build | Tag | Push | Acción    |
| ------------- | ----- | --- | ---- | --------- |
| `.env`        | ❌     | ❌   | ❌    | `up -d`   |
| CORS          | ✅     | ✅   | ✅    | DEV/BUILD |
| Bug backend   | ✅     | ✅   | ✅    | DEV/BUILD |
| Dominio       | ❌     | ❌   | ❌    | `.env`    |
| Nueva feature | ✅     | ✅   | ✅    | DEV/BUILD |

---

## 8. Reglas de Oro ONEGAT

1. PROD no fabrica
2. `:local` no es versión
3. Un tenant = un frontend
4. `stable` siempre existe
5. Primero rollback, luego análisis

---

## 9. Frase Operativa Clave

> **La imagen es el motor.**\
> **El ****.env**** es el volante.**\
> **DEV construye. PROD conduce.**

---

**Fin del README Operativo ONEGAT**

