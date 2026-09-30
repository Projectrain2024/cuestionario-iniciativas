# Mesas de Trabajo — Cuestionario de Iniciativas Estratégicas

Plataforma tipo Typeform para gestionar cuestionarios de iniciativas estratégicas con soporte multi-empresa y multi-equipo.

## Stack

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL (producción/Railway) / SQLite (desarrollo local)
- **PDF:** PDFKit
- **Export:** xlsx
- **Auth:** express-session

## Desarrollo local

```bash
npm install
cp .env.example .env
npm run dev
```

Abre http://localhost:3000 — Login: cualquier usuario / contraseña `admin2026`

Sin `DATABASE_URL` en `.env`, usa SQLite automáticamente.

## Deploy en Railway

1. Crea un nuevo proyecto en [railway.app](https://railway.app)
2. Conecta tu repo de GitHub
3. Agrega un servicio **PostgreSQL** al proyecto
4. Railway inyecta `DATABASE_URL` automáticamente
5. Configura las variables de entorno:
   - `SESSION_SECRET` — un string aleatorio largo
   - `ADMIN_PASSWORD` — contraseña del admin
   - `NODE_ENV` — `production`
6. Deploy automático al hacer push

## Estructura

```
├── server.js          # API y rutas
├── db.js              # Capa de datos (PostgreSQL / SQLite)
├── public/
│   ├── admin.html     # Panel de administración
│   ├── login.html     # Login
│   ├── dashboard.html # Dashboard analítico
│   ├── questionnaire.html  # Formulario tipo Typeform
│   ├── resultados.html     # Vista pública de resultados
│   ├── create-team-public.html  # Crear equipo (público)
│   ├── css/           # Estilos
│   ├── js/            # Lógica frontend
│   ├── img/           # Imágenes y logos
│   └── uploads/       # Logos de empresas
└── schema.sql         # Schema PostgreSQL de referencia
```

## Funcionalidades

- Gestión de empresas y equipos
- Cuestionario progresivo tipo Typeform con autoguardado
- Exportación PDF individual por equipo
- Exportación Excel y JSON masiva
- Dashboard con analíticas y patrones
- Links públicos de resultados con QR
- Links públicos para crear equipos

## Endpoints API

### Admin (requiere auth)
- `GET/POST /api/companies` — Listar/crear empresas
- `PUT/DELETE /api/companies/:id` — Editar/borrar empresa
- `GET/POST /api/companies/:id/teams` — Listar/crear equipos
- `POST /api/teams/:id/generate-link` — Generar link de cuestionario

### Cuestionario (público)
- `GET /api/questionnaires/:id` — Obtener cuestionario
- `PATCH /api/questionnaires/:id/responses` — Guardar respuestas
- `POST /api/questionnaires/:id/submit` — Enviar cuestionario
- `GET /api/questionnaires/:id/pdf` — Descargar PDF

### Analytics (requiere auth)
- `GET /api/analytics/patterns` — Patrones consolidados
- `POST /api/export/json` — Exportar JSON
- `POST /api/export/excel` — Exportar Excel
