# Plataforma de Cuestionario — Iniciativas Estratégicas

Aplicación web multi-tenant para gestionar cuestionarios de iniciativas estratégicas con autosave, dashboard analítico y exportación de datos.

## 🚀 Inicio Rápido

### Requisitos

- **Node.js** ≥ 18
- **PostgreSQL** (local o remoto)
- **npm** o **yarn**

### Setup

1. **Clonar/descargar el proyecto**
   ```bash
   cd Cuestionario
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar base de datos**

   Crear base de datos PostgreSQL:
   ```sql
   CREATE DATABASE cuestionario;
   ```

   Aplicar schema:
   ```bash
   psql -U postgres -d cuestionario -f schema.sql
   ```

4. **Configurar variables de entorno**

   Copiar `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

   Editar `.env` con tu configuración:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/cuestionario
   PORT=3000
   ADMIN_PASSWORD=tu_contraseña
   SESSION_SECRET=tu_secret_key
   NODE_ENV=development
   ```

5. **Iniciar servidor**
   ```bash
   npm run dev
   ```

   Servidor estará en `http://localhost:3000`

## 📋 Uso

### 1. Admin Panel

Acceder a `http://localhost:3000` con contraseña admin.

**Funcionalidades:**
- ✅ Crear/editar/eliminar empresas
- ✅ Crear/editar/eliminar equipos por empresa
- ✅ Generar links únicos para cuestionarios
- ✅ Ver dashboard con análisis

### 2. Completar Cuestionario

Los equipos acceden con el link único generado:
```
http://localhost:3000/empresa/{companyId}/questionnaire/{qId}
```

**Funcionalidades:**
- ✅ 6 secciones progresivas
- ✅ Autosave cada 10-15 segundos
- ✅ Tablas dinámicas para impacto y riesgos
- ✅ Validación de campos obligatorios

### 3. Dashboard & Análisis

Acceder a `http://localhost:3000/dashboard`

**Visualizaciones:**
- Total de cuestionarios completados
- Impactos más frecuentes
- Recursos más solicitados
- Tabla de respuestas recientes

**Exportación:**
- 📥 Descargar JSON
- 📊 Descargar Excel

## 📁 Estructura de Proyecto

```
Cuestionario/
├── server.js                  # Express app principal
├── db.js                      # PostgreSQL pool y queries
├── schema.sql                 # DDL para crear tablas
├── package.json              # Dependencias
├── .env.example              # Template de variables
├── public/
│   ├── login.html            # Página de login
│   ├── admin.html            # Panel admin
│   ├── questionnaire.html    # Formulario cuestionario
│   ├── dashboard.html        # Dashboard analytics
│   ├── js/
│   │   ├── admin.js          # Lógica admin panel
│   │   └── questionnaire.js  # Lógica formulario
│   └── css/
│       ├── style.css         # Estilos globales
│       └── questionnaire.css # Estilos formulario
└── plans/
    └── 2026-09-28-1400-deep-cuestionario-iniciativas-plan.md
```

## 🏗️ Arquitectura

### Backend
- **Framework:** Express.js
- **BD:** PostgreSQL con JSONB para respuestas
- **Auth:** Session-based (express-session)
- **Autosave:** PATCH endpoint que valida token

### Frontend
- **HTML/CSS/JS vanilla** (sin frameworks, para consistencia con Presencia Ejecutiva)
- **Autosave:** Debounce de 10-15 segundos
- **Tablas dinámicas:** +/- botones para agregar/quitar filas

### Base de Datos
```
companies (id, name, created_at, updated_at, deleted_at)
teams (id, company_id, name, avatar_color, ...)
questionnaires (id, team_id, company_id, access_token, status, responses:JSONB, ...)
```

## 🔐 Seguridad

- ✅ Session auth para admin
- ✅ Bearer token validation para team questionnaires
- ✅ Soft deletes (no eliminación física)
- ✅ SQL injection prevention (parameterized queries)
- ✅ CSRF protection via session cookies

## 📊 Endpoints API

### Admin (requiere auth)
- `GET /api/companies` — Listar empresas
- `POST /api/companies` — Crear empresa
- `PUT /api/companies/:id` — Editar empresa
- `DELETE /api/companies/:id` — Borrar empresa
- `GET /api/companies/:id/teams` — Listar equipos
- `POST /api/companies/:id/teams` — Crear equipo
- `PUT /api/teams/:id` — Editar equipo
- `DELETE /api/teams/:id` — Borrar equipo
- `POST /api/teams/:id/generate-link` — Generar link único

### Cuestionario (sin auth, valida token)
- `GET /api/questionnaires/:id` — Obtener cuestionario
- `PATCH /api/questionnaires/:id/responses` — Guardar respuestas
- `POST /api/questionnaires/:id/submit` — Enviar cuestionario

### Analytics (requiere auth)
- `GET /api/analytics/patterns` — Patrones consolidados
- `POST /api/export/json` — Exportar JSON
- `POST /api/export/excel` — Exportar Excel

## 🧪 Testing

Próximamente. Ver `Definition of Done` en plan para scenarios de test.

## 📝 Notas

- Autosave es transparente (no interfiere con entrada de usuario)
- Respuestas se guardan como JSON en PostgreSQL (flexible y queryeable)
- Multi-tenant completamente aislado por empresa
- Soft deletes mantienen histórico

## 📅 Timeline

- **Semana 1 (Oct 1-7):** U1-U3 (BD, Admin, Teams)
- **Semana 2 (Oct 8-14):** U4-U7 (Formulario, API, Dashboard, Export)
- **Testing & Polishing:** Oct 15-28
- **Go-live:** Oct 28-31

## 🤝 Soporte

Para preguntas o issues, revisar el plan: `plans/2026-09-28-1400-deep-cuestionario-iniciativas-plan.md`

---

**Versión:** 1.0.0  
**Última actualización:** 2026-09-28
