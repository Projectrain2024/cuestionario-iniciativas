---
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
name: cuestionario-iniciativas-plan
description: Plataforma multi-tenant para cuestionarios de iniciativas estratégicas con gestión de empresas, equipos, autosave y dashboard analítico
type: deep
asof: 2026-09-28
---

# Plataforma de Cuestionario — Iniciativas Estratégicas

## Goal Capsule

**Problema:** Las empresas necesitan un sistema para que sus equipos completen cuestionarios estructurados sobre iniciativas estratégicas, con capacidad del admin para visualizar patrones y comparativas consolidadas entre empresas.

**Solución:** Plataforma web multi-tenant (100 empresas, 20 equipos concurrentes) donde el admin gestiona empresas y equipos, genera links únicos por cuestionario, y los equipos completan formularios tipo Typeform con autosave. Dashboard de analytics consolida respuestas con patrones, comparativas y exportación.

**Scope actual:** Gestión de empresas/equipos, formulario dinámico de 6 secciones, autosave, links únicos, dashboard con agregaciones, exportación a Excel/JSON.

**Success criteria:**
- ✅ Operativo en octubre 2026
- ✅ 100 empresas, 20 equipos concurrentes soportados
- ✅ Autosave transparente sin fricción
- ✅ Dashboard mostrando patrones consolidados
- ✅ Exportación de datos completa

---

## Product Contract

### 1. Overview & Product Vision

Aplicación web monolítica multi-tenant para gestionar cuestionarios de iniciativas estratégicas. Un único admin controla todas las empresas y equipos. Cada empresa tiene un hub donde los líderes de equipos acceden a cuestionarios mediante links únicos. Las respuestas se guardan automáticamente (autosave) y el admin visualiza patrones consolidados en un dashboard de analytics.

**Stack tecnológico (consistencia con Presencia Ejecutiva):**
- Backend: Node.js + Express.js
- BD: PostgreSQL
- Frontend: HTML/CSS/JavaScript vanilla
- Session: Express-session
- Generador de IDs: nanoid

---

### 2. User Roles & Primary Flows

#### **Role: Admin**
- Crear/editar/eliminar empresas
- Crear/editar/eliminar equipos dentro de cada empresa
- Generar link único de cuestionario para cada equipo
- Ver dashboard con todas las respuestas consolidadas
- Exportar resultados a Excel/JSON
- Visualizar patrones y comparativas entre empresas

**Primary flow:**
1. Login (auth simple con password, como Presencia Ejecutiva)
2. Dashboard admin: lista de empresas
3. Selecciona empresa → ve equipos con avatares
4. Crea equipo o selecciona existente
5. Genera link único de cuestionario
6. Ve respuestas y analytics en dashboard

#### **Role: Team (sin cuenta)**
- Accede mediante link único compartido por admin
- Completa cuestionario de 6 secciones
- Autosave mientras completa
- Envía cuestionario (finaliza)
- No puede editar después de enviar

**Primary flow:**
1. Recibe link: `/empresa/:empresaId/questionnaire/:qId`
2. Ve nombre del equipo y avatar
3. Completa formulario progresivo (sección por sección)
4. Autosave cada 10-15 segundos
5. Envía cuestionario (estado: submitted)
6. Cierra acceso

---

### 3. Core Requirements

#### **3.1 Gestión de Empresas (Admin)**
- Crear empresa con nombre
- Editar nombre/datos de empresa
- Eliminar empresa (soft-delete para mantener histórico)
- Listar todas las empresas
- Acceso rápido a equipos de cada empresa

#### **3.2 Gestión de Equipos (Admin)**
- Crear equipo dentro de una empresa
  - Campo: nombre del equipo
  - Campo: avatar/color (visual identifier)
- Editar nombre/avatar
- Eliminar equipo
- Listar equipos por empresa
- Generar link único de cuestionario

#### **3.3 Formulario de Cuestionario (Team)**

**Estructura de 6 secciones:**

1. **Información Básica** (SIEMPRE VISIBLE)
   - Nombre del equipo (pre-rellenado, no editable)
   - Nombre de la iniciativa/propuesta (text)
   - Líder del equipo (text)
   - Fecha (date picker, auto-rellenado con hoy)

2. **El Reto de Negocio** (SECCIÓN 1)
   - ¿Qué problema u oportunidad queremos abordar? (textarea)
   - Detalle de evidencias (textarea)
   - Impacto actual (multi-select checkboxes: Productividad, Clientes, Ventas, Costos, Talento, Iniciativa, Proyecto, Otro)
   - Ampliar descripción (textarea)

3. **La Solución** (SECCIÓN 2)
   - ¿Qué proponemos? (textarea)
   - ¿Qué hace diferente esta iniciativa? (textarea)

4. **Impacto Esperado** (SECCIÓN 3)
   - Tabla dinámica (máx 20 filas):
     - Resultado esperado (text)
     - Indicador (text)
     - Meta (text)
     - Botones: +Agregar fila / -Eliminar fila

5. **Recursos Necesarios** (SECCIÓN 4)
   - Multi-select checkboxes: Tiempo, Presupuesto, Personas, Tecnología, Formación, Patrocinio, Otro
   - Detalle (textarea)

6. **Posibles Riesgos** (SECCIÓN 5)
   - Tabla dinámica (máx 20 filas):
     - Riesgo (text)
     - Acción de mitigación (text)
     - Botones: +Agregar fila / -Eliminar fila

7. **Necesidades Adicionales** (SECCIÓN 6)
   - Textarea libre

**Validaciones:**
- Todos los campos son OBLIGATORIOS
- No se puede enviar si falta información
- Tabla dinámicas: requieren al menos 1 fila si se abre la sección

**Estados del cuestionario:**
- `draft`: En progreso (autosave activo)
- `submitted`: Enviado (no editable)
- `archived`: Eliminado lógico

#### **3.4 Autosave**
- Cada 10-15 segundos de inactividad, guardar estado actual
- Mostrar indicador visual: "Guardando..." → "Guardado ✓"
- No bloquear la entrada de datos mientras guarda
- En caso de error, mostrar "Error al guardar — reintentando"

#### **3.5 Dashboard de Analytics (Admin)**
- **Vista general:**
  - Total de empresas, equipos, cuestionarios completados
  - Últimos cuestionarios completados

- **Análisis por sección:**
  - **Reto de Negocio:** Impactos más frecuentes (gráfico de barras)
  - **Solución:** Palabras clave más comunes (tag cloud o lista)
  - **Impacto Esperado:** Metas más comunes
  - **Recursos:** Recursos más solicitados (gráfico de barras)
  - **Riesgos:** Riesgos más mencionados

- **Comparativas:**
  - Empresa A vs Empresa B (respuestas lado a lado)
  - Filtro por rango de fechas

- **Exportación:**
  - Exportar todas las respuestas a Excel (1 fila por cuestionario)
  - Exportar a JSON (estructura completa)

---

### 4. Data Model

#### **Tabla: companies**
```
id (UUID, PK)
name (varchar)
created_at (timestamp)
updated_at (timestamp)
deleted_at (timestamp, nullable — soft delete)
```

#### **Tabla: teams**
```
id (UUID, PK)
company_id (UUID, FK → companies)
name (varchar)
avatar_color (varchar — ej: #FF5733)
created_at (timestamp)
updated_at (timestamp)
deleted_at (timestamp, nullable)
```

#### **Tabla: questionnaires**
```
id (UUID, PK)
team_id (UUID, FK → teams)
company_id (UUID, FK → companies — desnormalizado para queries rápidas)
access_token (UUID — link único para equipo)
status (enum: draft, submitted, archived)
responses (JSON — estructura completa de respuestas)
created_at (timestamp)
submitted_at (timestamp, nullable)
updated_at (timestamp)
```

#### **Estructura JSON de respuestas:**
```json
{
  "nombre_equipo": "string",
  "nombre_iniciativa": "string",
  "lider_equipo": "string",
  "fecha": "date",
  "reto": {
    "problema": "string",
    "evidencias": "string",
    "impactos": ["string"],
    "descripcion": "string"
  },
  "solucion": {
    "propuesta": "string",
    "diferenciadores": "string"
  },
  "impacto": [
    { "resultado": "string", "indicador": "string", "meta": "string" }
  ],
  "recursos": {
    "tipos": ["string"],
    "detalle": "string"
  },
  "riesgos": [
    { "riesgo": "string", "mitigacion": "string" }
  ],
  "necesidades": "string"
}
```

---

### 5. Technical Architecture

#### **Backend: Node.js + Express**

**Endpoints principales:**

**Admin (requiere auth):**
- `GET /admin` — hub principal (lista de empresas)
- `POST /api/companies` — crear empresa
- `GET /api/companies` — listar empresas
- `PUT /api/companies/:id` — editar empresa
- `DELETE /api/companies/:id` — borrar empresa

- `POST /api/companies/:companyId/teams` — crear equipo
- `GET /api/companies/:companyId/teams` — listar equipos
- `PUT /api/teams/:id` — editar equipo
- `DELETE /api/teams/:id` — borrar equipo
- `POST /api/teams/:id/generate-link` — generar link de cuestionario

- `GET /api/questionnaires` — todas las respuestas (con filtros)
- `GET /api/questionnaires/:id` — ver una respuesta
- `GET /api/analytics/patterns` — patrones consolidados
- `POST /api/export/excel` — exportar a Excel
- `POST /api/export/json` — exportar a JSON

**Team (sin auth, acceso por token):**
- `GET /empresa/:companyId/questionnaire/:qId` — acceder al cuestionario
- `PATCH /api/questionnaires/:id/responses` — autosave de respuestas
- `POST /api/questionnaires/:id/submit` — enviar cuestionario

#### **Frontend: HTML/CSS/JS Vanilla**

**Páginas:**
- `/admin` — Hub admin (empresas, equipos)
- `/admin/dashboard` — Dashboard de analytics
- `/empresa/:companyId/questionnaire/:qId` — Formulario de cuestionario (progresivo, sección por sección)

**Librerías recomendadas (consistencia con Presencia Ejecutiva):**
- Ninguna dependencia externa para UI (vanilla)
- Fetch API nativa para requests
- JSON nativo para manejo de datos

#### **Base de datos: PostgreSQL**
- Conexión con librería `pg` (ya usada en Presencia Ejecutiva)
- Transacciones para integridad de datos
- Índices en: `company_id`, `team_id`, `status`, `created_at`

#### **Sesiones & Auth**
- `express-session` (consistente)
- Contraseña única para admin (env var `ADMIN_PASSWORD`)
- Access tokens (nanoid) para links de cuestionario (sin auth, solo validación de token)

---

### 6. Success Metrics

- ✅ Formulario completo con todas las secciones funcionales
- ✅ Autosave opera sin fricción (visible pero no invasivo)
- ✅ Dashboard muestra mínimo 5 tipos de análisis diferentes
- ✅ Exportación genera archivos válidos (Excel, JSON)
- ✅ 100 empresas × 20 equipos pueden operar concurrentemente sin degradación
- ✅ Respuestas se persisten correctamente en PostgreSQL

---

### 7. Out of Scope (Future)

- Autenticación de equipos (login por equipo)
- Edición de respuestas después de enviar
- Historial de versiones de cuestionarios
- Notificaciones por email
- Soft-delete con recuperación de datos
- Integración con otras herramientas
- Mobile app nativa

---

### 8. How This Work Fits Together

Este plan es **completamente independiente** y puede ejecutarse sin dependencias externas. Una vez implementado, puede integrarse con la Plataforma de Eventos Facilitados para workflows futuros (ej: resultados del cuestionario trigger acciones en eventos).

---

### 9. Implementation Notes

**MVP (Semana 1, octubre 2026):**
1. Setup inicial: Directorio, package.json, estructura
2. BD: Crear tablas (companies, teams, questionnaires)
3. Admin CRUD: Empresas y equipos
4. Formulario: 6 secciones funcionales, autosave básico
5. Links únicos: Generar y acceder

**Phase 2 (Semana 2):**
1. Dashboard básico: Análisis por sección
2. Exportación: Excel y JSON
3. Comparativas: Empresa vs Empresa
4. Pulir UX, validaciones

**Stack sugerido:**
- Backend: Node 18+ (mismo que Presencia Ejecutiva)
- Frontend: HTML/CSS/JS vanilla (consistencia)
- BD: PostgreSQL (mismo que Presencia Ejecutiva)
- Despliegue: Mismo host que Presencia Ejecutiva

---

## Planning Contract

### Key Technical Decisions (KTDs)

**KTD1: Monolithic vs Microservices**
- Decision: Monolithic (Express.js single server)
- Rationale: 100 empresas, 20 equipos concurrentes es carga manejable. Presencia Ejecutiva usa monolítico exitosamente. Reduce complejidad operacional para MVP.
- Implication: Una sola instancia Node + PostgreSQL. Si escalamos a 1000+ empresas, revisitar.

**KTD2: Autosave Strategy**
- Decision: PATCH endpoint que guarda respuestas completas cada 10-15 segundos
- Rationale: Simple, confiable, no requiere WebSockets o polling. Cliente envía state completo, servidor valida y actualiza JSON en BD.
- Implication: Ancho de banda manejable (respuestas son ~2-5KB). Posible conflicto si dos pestañas del mismo equipo escriben simultáneamente — aceptable para MVP (equipos usan 1 sesión).

**KTD3: Respuestas como JSON en PostgreSQL**
- Decision: BD relacional (PostgreSQL) con respuestas como JSONB en la tabla questionnaires
- Rationale: Flexibilidad para agregar secciones sin migrar schema. Indexación JSONB permite queries analíticas. Presencia Ejecutiva usa PostgreSQL.
- Implication: No es NoSQL puro, pero híbrido. Queries analíticas usan índices GIN en JSONB.

**KTD4: Links únicos sin autenticación**
- Decision: UUID como access_token. Validar token en cada request. Sin login.
- Rationale: Equipos no tienen cuenta. Simplifica UX (1 link = acceso). Token es opaco, imposible adivinar.
- Implication: Si el link se filtra, cualquiera accede. Aceptable (cuestionarios no son confidenciales). Para datos sensibles, requerir auth adicional en futuro.

**KTD5: Dashboard Agregaciones en Backend**
- Decision: Rutas API que agregan datos en el backend (no cliente)
- Rationale: 100 empresas × 20 equipos = 2000 potenciales cuestionarios. Agregaciones complejas (word frequency, comparativas) son más rápidas en BD.
- Implication: `/api/analytics/patterns` retorna JSON pré-calculado. Frontend solo renderiza.

**KTD6: Exportación a Excel**
- Decision: Librería `xlsx` (librería NPM)
- Rationale: CSV es simple pero pierde tablas dinámicas. XLSX mantiene estructura. Presencia Ejecutiva no exporta, pero `xlsx` es estándar.
- Implication: Agregará dependencia. Alternativa: generar CSV vanilla (más simple).

### Assumptions

- El servidor Node.js está disponible en el mismo host que Presencia Ejecutiva
- PostgreSQL ya está corriendo y accesible
- Teams completan cuestionarios con 1 sesión (no 2 pestañas simultáneas)
- Admin password se pasa por env var (no hardcodeado)
- No hay requisitos de GDPR/compliance (datos de trabajo interno)

### Sequencing

1. **Foundation** (U1): Setup BD, schema, server base
2. **Admin Plane** (U2-U3): CRUD empresas y equipos, link generation
3. **Form Plane** (U4-U5): Formulario funcional, autosave, validaciones
4. **Analytics Plane** (U6-U7): Dashboard, exportación

Este orden permite validar DB + auth antes de construir form, y form completa antes de analytics.

---

## Implementation Units

### U1. Database Schema & Server Bootstrap

**Goal:** Crear schema PostgreSQL, configurar conexión, inicializar servidor Express base con auth.

**Requirements (from Product Contract):**
- R1: Tablas `companies`, `teams`, `questionnaires` con índices
- R2: Sesiones express-session funcionales
- R3: Middleware de autenticación

**Files:**
- `db.js` — conexión PostgreSQL y queries base
- `schema.sql` — DDL: CREATE TABLE companies, teams, questionnaires; CREATE INDEXes
- `server.js` — setup inicial (puerto 3000, sesiones, rutas stub)
- `public/login.html` — login page (copia de Presencia Ejecutiva)
- `package.json` — dependencias (express, pg, express-session, nanoid, xlsx)

**Approach:**
1. Crear `schema.sql` con 3 tablas + índices
2. Crear `db.js` con función de conexión (reusar patrón de Presencia Ejecutiva)
3. Ejecutar schema en PostgreSQL
4. Inicializar `server.js` con middleware base
5. Probar conexión

**Test Scenarios:**
- ✅ Conexión a BD establece correctamente
- ✅ Schema se aplica sin errores
- ✅ Login con password correcto redirige a /admin
- ✅ Login con password incorrecto redirige con ?error=1

**Completion:** Schema en BD, servidor inicia en puerto 3000, login funciona.

---

### U2. Admin CRUD — Companies

**Goal:** Endpoints para crear, listar, editar, borrar empresas.

**Requirements (from Product Contract):**
- R1: `GET /api/companies` — listar todas con count de equipos
- R2: `POST /api/companies` — crear (valida nombre)
- R3: `PUT /api/companies/:id` — editar
- R4: `DELETE /api/companies/:id` — soft delete
- R5: `GET /admin` — hub mostrando empresas

**Files:**
- `server.js` — rutas `/api/companies*`, `/admin`
- `public/admin.html` — UI: lista de empresas, botones crear/editar/borrar
- `public/css/style.css` — estilos base

**Approach:**
1. Rutas API CRUD (POST, GET, PUT, DELETE)
2. Validaciones: nombre requerido, no duplicados
3. Soft delete: update `deleted_at` instead of DELETE
4. Admin page muestra lista con GET /api/companies (requiere auth)

**Test Scenarios:**
- ✅ POST /api/companies crea empresa si nombre válido
- ✅ POST rechaza si nombre vacío
- ✅ GET /api/companies lista todas (excepto soft-deleted)
- ✅ PUT actualiza nombre correctamente
- ✅ DELETE marca deleted_at (no borra registro)
- ✅ GET /admin renderiza HTML con lista

**Completion:** Admin puede CRUD empresas, página admin carga.

---

### U3. Admin CRUD — Teams & Link Generation

**Goal:** Endpoints para crear, editar, borrar equipos y generar links únicos de cuestionario.

**Requirements (from Product Contract):**
- R1: `POST /api/companies/:companyId/teams` — crear equipo
- R2: `GET /api/companies/:companyId/teams` — listar equipos de empresa
- R3: `PUT /api/teams/:id` — editar nombre/avatar
- R4: `DELETE /api/teams/:id` — soft delete
- R5: `POST /api/teams/:id/generate-link` — crear questionnaire entry y generar link
- R6: UI en admin para gestionar equipos

**Files:**
- `server.js` — rutas teams, generate-link
- `public/admin.html` — UI mejorada: empresas → equipos → generar link
- `public/team-manager.html` — modal o página separada para teams

**Approach:**
1. Rutas CRUD teams (similar a companies)
2. Avatar color: generar automático o permitir picker
3. Generate-link: crear fila en questionnaires (status=draft), retornar UUID access_token
4. Link generado: `<baseURL>/empresa/:companyId/questionnaire/:qId`

**Test Scenarios:**
- ✅ POST team crea con nombre y avatar
- ✅ GET teams filtra solo por empresa correcta
- ✅ PUT team actualiza avatar
- ✅ DELETE team marca deleted_at
- ✅ POST generate-link crea entrada en questionnaires
- ✅ Link genera UUID único y accesible

**Completion:** Admin puede gestionar equipos y generar links únicos.

---

### U4. Questionnaire Form — Frontend & Basic Autosave

**Goal:** Formulario HTML/JS de 6 secciones con autosave cada 10-15 segundos.

**Requirements (from Product Contract):**
- R1: 6 secciones HTML (información, reto, solución, impacto, recursos, riesgos, necesidades)
- R2: Tablas dinámicas (impacto, riesgos) con +/- botones
- R3: Autosave cada 10-15 segundos a PATCH endpoint
- R4: Indicador visual "Guardando..." → "Guardado ✓"
- R5: Validación client-side (campos obligatorios)

**Files:**
- `public/questionnaire.html` — formulario completo (6 secciones en accordion o tabs)
- `public/js/questionnaire.js` — lógica form, autosave, validación
- `public/css/questionnaire.css` — estilos form

**Approach:**
1. HTML: 6 secciones (textareas, checkboxes, tablas dinámicas)
2. JS: event listeners en inputs
3. Autosave: detectar cambio, esperan 10-15s sin cambios, envía PATCH
4. Tablas dinámicas: agregar/quitar filas con JS vanilla
5. Indicador: elemento `<span id="save-status">` que muestra estado

**Test Scenarios:**
- ✅ Formulario carga con datos precargados del equipo
- ✅ Cambio en input triggered autosave
- ✅ Autosave espera 10-15s sin cambios antes de enviar
- ✅ Indicador muestra "Guardando..." durante PATCH
- ✅ Indicador cambia a "Guardado ✓" después de éxito
- ✅ Tabla dinámicas agregan/quitan filas correctamente
- ✅ Validación bloquea submit si campos obligatorios vacíos

**Completion:** Formulario funcional con autosave transparente.

---

### U5. Questionnaire API — Autosave & Submit

**Goal:** Endpoints backend para guardar respuestas automáticas y enviar cuestionario.

**Requirements (from Product Contract):**
- R1: `PATCH /api/questionnaires/:id/responses` — guardar respuestas parciales
- R2: `POST /api/questionnaires/:id/submit` — finalizar cuestionario
- R3: Validar access_token (sin auth requerida)
- R4: Validar integridad de datos antes de guardar
- R5: Retornar error claro si validación falla

**Files:**
- `server.js` — rutas PATCH y POST para questionnaires
- `db.js` — queries updateQuestionnaire(), submitQuestionnaire()

**Approach:**
1. Middleware validar access_token en headers Authorization
2. PATCH: recibe JSON respuestas parciales, actualiza questionnaires.responses (JSONB merge o replace)
3. POST submit: valida que todos campos requeridos estén presentes, cambia status a submitted, set submitted_at
4. Ambas rutas retornan { ok: true } o { error: "mensaje" }

**Test Scenarios:**
- ✅ PATCH con token válido actualiza responses
- ✅ PATCH con token inválido retorna 401
- ✅ PATCH sin cambios no fuerza error
- ✅ POST submit con datos incompletos retorna error 400
- ✅ POST submit con datos completos cambia status a submitted
- ✅ Respuestas guardadas persisten en BD

**Completion:** Autosave y submit funcionales, datos persistidos.

---

### U6. Admin Dashboard — Analytics & Patterns

**Goal:** Página admin con vista de patrones agregados: impactos frecuentes, recursos solicitados, etc.

**Requirements (from Product Contract):**
- R1: Vista general: totales, últimos cuestionarios
- R2: Impactos más frecuentes (barra chart)
- R3: Recursos más solicitados (barra chart)
- R4: Riesgos más mencionados (tabla)
- R5: Filtro por rango de fechas
- R6: Vista comparativa: empresa A vs B

**Files:**
- `public/dashboard.html` — dashboard layout con múltiples secciones
- `public/js/dashboard.js` — lógica fetch, rendering gráficos
- `public/css/dashboard.css` — estilos dashboard
- `server.js` — rutas `/api/analytics/patterns`, `/api/analytics/compare`

**Approach:**
1. API `/api/analytics/patterns?start_date=&end_date=` retorna agregaciones JSON
2. Agregaciones calculadas en PostgreSQL:
   - `SELECT impacto, COUNT(*) FROM questionnaires WHERE status='submitted' GROUP BY impacto`
   - `SELECT recurso, COUNT(*) FROM questionnaires WHERE status='submitted' GROUP BY recurso`
   - Etc.
3. Frontend recibe JSON, renderiza tablas/gráficos con vanilla JS (sin Chart.js)
4. Comparativa: /api/analytics/compare?company1=A&company2=B retorna respuestas lado a lado

**Test Scenarios:**
- ✅ Página dashboard carga sin errores
- ✅ Totales mostrados correctamente
- ✅ Gráfico impactos refleja datos BD
- ✅ Filtro por fecha funciona
- ✅ Comparativa muestra 2 empresas lado a lado

**Completion:** Dashboard funcional con múltiples vistas analíticas.

---

### U7. Export Functionality — Excel & JSON

**Goal:** Endpoints para exportar respuestas a Excel y JSON.

**Requirements (from Product Contract):**
- R1: `POST /api/export/excel` — descarga Excel (1 fila = 1 cuestionario)
- R2: `POST /api/export/json` — descarga JSON
- R3: Filtros: por empresa, por rango de fechas

**Files:**
- `server.js` — rutas `/api/export/excel`, `/api/export/json`
- `db.js` — query getQuestionnairesForExport()
- `public/admin.html` — botones export en dashboard

**Approach:**
1. Rutas accept query params: `?company_id=&start_date=&end_date=`
2. Excel: usar librería `xlsx`, crear workbook con columnas (empresa, equipo, iniciativa, líder, reto, solución, etc.)
3. JSON: simplemente retornar { questionnaires: [...] } con estructura completa
4. Descargar archivos con Content-Disposition: attachment headers

**Test Scenarios:**
- ✅ Excel descarga sin errores
- ✅ Excel contiene filas correctas (1 por cuestionario)
- ✅ Columnas incluyen todos los campos necesarios
- ✅ JSON descarga estructura válida
- ✅ Filtros funcionan (solo empresa correcta, rango fechas)

**Completion:** Exportación funcional a Excel y JSON.

---

## Verification Contract

### Integration Tests (to run before shipping)

```bash
npm test
```

**Test Coverage:**

1. **Database Layer:**
   - ✅ Conexión establece correctamente
   - ✅ Schema migrations ejecutan sin error
   - ✅ Soft delete marca `deleted_at`

2. **Auth & Security:**
   - ✅ Login con contraseña correcta establece sesión
   - ✅ Admin routes requieren auth
   - ✅ Team routes validan access_token
   - ✅ Token inválido rechaza request

3. **Admin CRUD:**
   - ✅ Create/Read/Update/Delete companies
   - ✅ Create/Read/Update/Delete teams
   - ✅ Generate link crea questionnaire entry

4. **Questionnaire Form:**
   - ✅ Formulario carga con datos precargados
   - ✅ Autosave PATCH funciona
   - ✅ Validación bloquea submit incompleto
   - ✅ Submit con datos válidos cambia status

5. **Analytics:**
   - ✅ Agregaciones retornan datos válidos
   - ✅ Filtros por fecha funcionan
   - ✅ Comparativa muestra 2 empresas

6. **Export:**
   - ✅ Excel descarga con estructura válida
   - ✅ JSON descarga estructura completa

### Performance Gates

- Autosave completa en <500ms
- Agregaciones query <2s en 2000 cuestionarios
- Formulario carga en <2s

### Quality Gates

- No console errors en producción
- Validaciones rechazando datos inválidos
- Errores retornan con HTTP codes correctos (400, 401, 500)

---

## Definition of Done

### Per Implementation Unit

Each unit is complete when:

1. ✅ Código escrito en las rutas/archivos nombrados
2. ✅ Tests pasan (ver Verification Contract)
3. ✅ Endpoints funcionan con Postman o curl
4. ✅ Frontend renderiza sin errores
5. ✅ BD queries retornan datos correctos
6. ✅ Documentación inline mínima (comentarios en funciones complejas)

### Global Definition of Done (antes de ship)

1. ✅ Todas las 7 units completadas
2. ✅ Tests de integración pasan
3. ✅ Performance gates met
4. ✅ Sin console errors en producción
5. ✅ Admin puede CRUD empresas/equipos completo
6. ✅ Teams pueden completar y enviar cuestionarios
7. ✅ Autosave funciona transparentemente
8. ✅ Dashboard muestra mínimo 5 vistas analíticas
9. ✅ Exportación (Excel + JSON) funcional
10. ✅ Documentación README con setup instructions
