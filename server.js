const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2026';

/* ── Middleware ─────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cuestionario-secret-dev',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 },
}));
app.use(express.static(path.join(__dirname, 'public')));

/* ── Auth ───────────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  res.redirect('/login');
}

function validateToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  req.accessToken = token;
  next();
}

/* ── Pages ──────────────────────────────────────────── */
app.get('/', requireAuth, (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.get('/login', (req, res) => {
  if (req.session?.authenticated) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

app.get('/empresa/:companyId/questionnaire/:qId', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'questionnaire.html')));

app.get('/empresa/:companyId/crear-equipos', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'create-team-public.html')));

app.get('/dashboard', requireAuth, (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

/* ── API: Companies ─────────────────────────────────── */
app.get('/api/companies', requireAuth, async (req, res) => {
  try {
    const companies = await db.getCompanies();
    res.json(companies);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/companies', requireAuth, async (req, res) => {
  const { name, sector } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name requerido' });
  try {
    const company = await db.createCompany(nanoid(12), name.trim(), sector || null);
    res.status(201).json(company);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/companies/:id/public', async (req, res) => {
  try {
    const company = await db.getCompany(req.params.id);
    if (!company) return res.status(404).json({ error: 'not found' });
    res.json(company);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/companies/:id', requireAuth, async (req, res) => {
  try {
    const company = await db.getCompany(req.params.id);
    if (!company) return res.status(404).json({ error: 'not found' });
    res.json(company);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/companies/:id', requireAuth, async (req, res) => {
  const { name, sector } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name requerido' });
  try {
    const company = await db.updateCompany(req.params.id, { name: name.trim(), sector: sector || null });
    if (!company) return res.status(404).json({ error: 'not found' });
    res.json(company);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/companies/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteCompany(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── API: Teams ────────────────────────────────────── */
app.post('/api/companies/:companyId/teams', requireAuth, async (req, res) => {
  const { name, avatarColor } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name requerido' });
  try {
    const team = await db.createTeam(nanoid(12), req.params.companyId, name.trim(), avatarColor || '#667eea');
    res.status(201).json(team);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/companies/:companyId/teams', requireAuth, async (req, res) => {
  try {
    const teams = await db.getTeamsByCompany(req.params.companyId);
    res.json(teams);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/teams/:id', requireAuth, async (req, res) => {
  try {
    const team = await db.updateTeam(req.params.id, req.body);
    if (!team) return res.status(404).json({ error: 'not found' });
    res.json(team);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/teams/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteTeam(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/teams/:id/generate-link', requireAuth, async (req, res) => {
  try {
    const team = await db.getTeam(req.params.id);
    if (!team) return res.status(404).json({ error: 'team not found' });

    const crypto = require('crypto');
    const accessToken = crypto.randomUUID();
    const q = await db.createQuestionnaire(nanoid(12), team.id, team.company_id, accessToken);

    res.status(201).json({
      id: q.id,
      company_id: q.company_id,
      access_token: q.access_token,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── API: Questionnaires ────────────────────────────── */
app.get('/api/questionnaires/:id', validateToken, async (req, res) => {
  try {
    const q = await db.getQuestionnaire(req.params.id);
    if (!q || q.access_token !== req.headers.authorization?.replace('Bearer ', '')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/questionnaires/:id/responses', validateToken, async (req, res) => {
  try {
    const q = await db.getQuestionnaire(req.params.id);
    if (!q || q.access_token !== req.headers.authorization?.replace('Bearer ', '')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const updated = await db.updateQuestionnaireResponses(req.params.id, req.body);
    res.json({ ok: true, updated_at: updated.updated_at });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/questionnaires/:id/submit', validateToken, async (req, res) => {
  try {
    const q = await db.getQuestionnaire(req.params.id);
    if (!q || q.access_token !== req.headers.authorization?.replace('Bearer ', '')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const submitted = await db.submitQuestionnaire(req.params.id);
    res.json({ ok: true, status: submitted.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/questionnaires', requireAuth, async (req, res) => {
  try {
    const qs = await db.getSubmittedQuestionnaires();
    res.json(qs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── API: Analytics ────────────────────────────────── */
app.get('/api/analytics/patterns', requireAuth, async (req, res) => {
  try {
    const qs = await db.getSubmittedQuestionnaires();

    // Agregaciones básicas
    const impactos = {};
    const recursos = {};

    qs.forEach(q => {
      const resp = typeof q.responses === 'string' ? JSON.parse(q.responses) : q.responses;
      (resp.reto?.impactos || []).forEach(i => {
        impactos[i] = (impactos[i] || 0) + 1;
      });
      (resp.recursos?.tipos || []).forEach(r => {
        recursos[r] = (recursos[r] || 0) + 1;
      });
    });

    res.json({
      total_cuestionarios: qs.length,
      impactos,
      recursos,
      cuestionarios_recientes: qs.slice(0, 10),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── API: Export ────────────────────────────────────── */
app.post('/api/export/json', requireAuth, async (req, res) => {
  try {
    const qs = await db.getSubmittedQuestionnaires();
    res.json({ cuestionarios: qs, count: qs.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/export/excel', requireAuth, async (req, res) => {
  try {
    const xlsx = require('xlsx');
    const qs = await db.getSubmittedQuestionnaires();

    const data = qs.map(q => {
      const resp = typeof q.responses === 'string' ? JSON.parse(q.responses) : q.responses;
      return {
        Empresa: resp.nombre_equipo || '',
        Iniciativa: resp.nombre_iniciativa || '',
        Líder: resp.lider_equipo || '',
        Fecha: resp.fecha || '',
        Reto: resp.reto?.problema || '',
        Solución: resp.solucion?.propuesta || '',
        Recursos: (resp.recursos?.tipos || []).join(', '),
      };
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, 'Respuestas');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="cuestionarios.xlsx"');
    res.send(xlsx.write(wb, { type: 'buffer' }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Health Check ──────────────────────────────────── */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── Start Server ──────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`   Ir a: http://localhost:${PORT}`);
});
