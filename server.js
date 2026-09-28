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
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name requerido' });
  try {
    const company = await db.createCompany(nanoid(12), name.trim());
    res.status(201).json(company);
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
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name requerido' });
  try {
    const company = await db.updateCompany(req.params.id, { name: name.trim() });
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

/* ── Health Check ──────────────────────────────────── */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── Start Server ──────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`   Ir a: http://localhost:${PORT}`);
});
