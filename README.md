# event-api

API REST para inscripciones al evento (**Express** + **MySQL/TiDB**). Este repositorio es **independiente** del frontend (`event-web`): se despliega y versiona por separado.

**Frontend asociado (otro repo):** landing React + Vite que consume `POST /api/register`. Configura `CORS_ORIGIN` con el origen público de esa demo.

---

## URLs en producción (entrega)

Sustituye por tus URLs reales.

| Recurso | URL |
|--------|-----|
| **API — Health** | `https://<TU_API>/health` |

El endpoint `GET /health` responde JSON con estado de la API y comprobación de base (`db: "up"` | `"down"`). Si la base no responde, puede devolverse **503** con `{ "ok": false, "db": "down" }`.

La **URL de la demo (frontend)** vive en el README del repositorio **event-web**.

---

## Arquitectura

```
                    ┌─────────────────────────┐
                    │   Navegador (usuario)   │
                    └───────────┬─────────────┘
                                │ HTTPS
                                ▼
                    ┌─────────────────────────┐
                    │  Frontend (otro repo)   │
                    │  React + Vite           │
                    │  p. ej. Vercel          │
                    └───────────┬─────────────┘
                                │  fetch JSON
                                │  POST /api/register
                                │  Origin en CORS_ORIGIN
                                ▼
┌───────────────────────────────────────────────────────────┐
│  event-api (este repo) — Node.js + Express                │
│  Helmet, CORS, rate limit, Zod                            │
└───────────┬───────────────────────────────────────────────┘
            │  mysql2 (pool)
            │  TLS + consultas preparadas
            ▼
                    ┌─────────────────────────┐
                    │  MySQL compatible       │
                    │  p. ej. TiDB Cloud      │
                    │  (puerto típico 4000)   │
                    └─────────────────────────┘
```

---

## Stack (esta capa)

| Área | Tecnologías |
|------|-------------|
| **Runtime** | Node.js (ESM), TypeScript |
| **HTTP** | Express 5 |
| **Datos** | `mysql2/promise` (pool) |
| **Validación** | Zod 4 |
| **Seguridad HTTP** | `helmet`, `cors`, `express-rate-limit`, `express.json` (límite 10kb) |

---

## Estructura del repositorio

```
event-api/
├── sql/
│   └── schema.sql
├── src/
│   ├── index.ts              # App Express, middlewares, rutas
│   ├── db.ts                 # Pool MySQL + ping
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── validate.ts       # Zod → 400
│   ├── routes/
│   │   └── register.ts       # POST inscripciones
│   └── schemas/
│       └── registration.ts   # Esquema Zod
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del servicio y conectividad a la base (`ok`, `db`). |
| `POST` | `/api/register` | Crea una inscripción (nombre, email, mensaje opcional). |
| *cualquiera* | ruta no definida | **404** — `{ "error": "No encontrado" }`. |

El rate limiting aplica al prefijo `/api` (incluye `/api/register`).

---

## Ejemplo: `POST /api/register`

**Request**

```http
POST /api/register HTTP/1.1
Host: <tu-api>
Content-Type: application/json

{
  "name": "María García",
  "email": "maria@ejemplo.com",
  "message": "¡Nos vemos en el evento!"
}
```

`message` es opcional.

**Response — `201 Created`**

```json
{
  "id": 42
}
```

---

## Códigos de error habituales

| HTTP | Cuándo | Cuerpo típico |
|------|--------|----------------|
| **400** | JSON inválido o datos que no pasan Zod. | `{ "error": "Validación fallida", "issues": [ { "field": "email", "message": "..." } ] }` |
| **409** | Email duplicado (`UNIQUE`). | `{ "error": "Este correo ya está registrado" }` |
| **429** | Exceso de peticiones bajo `/api` (p. ej. 5 req / 10 min por IP). | `{ "error": "Demasiadas solicitudes. Intenta de nuevo en unos minutos." }` |
| **500** | Error no controlado. En `NODE_ENV=production` el mensaje al cliente es genérico. | `{ "error": "Error interno del servidor" }` |

`GET /health` puede responder **503** si falla el chequeo de base de datos.

---

## Schema SQL

Definición completa en `sql/schema.sql`:

```sql
CREATE DATABASE IF NOT EXISTS event_db;
USE event_db;

CREATE TABLE IF NOT EXISTS registrations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_registrations_email (email),
  KEY idx_registrations_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Setup local

**Requisitos:** Node.js LTS, cluster MySQL compatible y el SQL anterior aplicado.

```bash
cp .env.example .env
# Edita .env (ver tabla)
npm install
npm run dev
```

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto HTTP (por defecto `4000`). |
| `NODE_ENV` | `development` o `production`. |
| `DATABASE_URL` | `mysql://usuario:contraseña@host:puerto/event_db` (TiDB serverless suele usar puerto **4000**). |
| `CORS_ORIGIN` | Orígenes permitidos separados por coma (p. ej. `http://localhost:5173`). |

Build y arranque en modo compilado:

```bash
npm run build
npm start
```

---

## Seguridad

| Medida | Implementación |
|--------|------------------|
| **Helmet** | `helmet()` en `src/index.ts`. |
| **CORS** | Orígenes desde `CORS_ORIGIN`; métodos `GET`, `POST`, `OPTIONS`; cabecera `Content-Type`. |
| **Rate limiting** | `express-rate-limit` en rutas bajo `/api`. |
| **Zod** | `src/schemas/registration.ts` + middleware `validate()` → **400** antes de persistir. |
| **TLS** | HTTPS en el borde lo aporta el hosting (Railway, Render, etc.). Hacia la BD: pool `mysql2` con `ssl: { rejectUnauthorized: true }`. |
| **Prepared statements** | `pool.execute` con placeholders `?` y parámetros en array (mitigación de inyección SQL). |
