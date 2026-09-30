const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const db = require('./db');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2026';

const logoStorage = multer.diskStorage({
  destination: path.join(__dirname, 'public', 'uploads', 'logos'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${nanoid(12)}${ext}`);
  },
});
const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

/* ── Middleware ─────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cuestionario-secret-dev',
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 8 * 60 * 60 * 1000, httpOnly: false },
}));
app.use(express.static(path.join(__dirname, 'public')));

/* ── Auth ───────────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'No autenticado' });
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
  console.log('🔐 Login attempt:', req.body.username);
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    req.session.save(() => {
      console.log('✅ Session saved:', req.session.id, req.session.authenticated);
      res.redirect('/');
    });
  } else {
    console.log('❌ Wrong password');
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

app.get('/empresa/:companyId/questionnaire/:qId', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'questionnaire.html')));

app.get('/dashboard/:companyId', requireAuth, (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

app.get('/empresa/:companyId/crear-equipos', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'create-team-public.html')));

app.get('/resultados/:qId', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'resultados.html')));

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

app.post('/api/companies', (req, res, next) => {
  if (!req.session?.authenticated) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}, uploadLogo.single('logo'), async (req, res) => {
  const { name, sector } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name requerido' });
  try {
    const logoUrl = req.file ? `/uploads/logos/${req.file.filename}` : null;
    const company = await db.createCompany(nanoid(12), name.trim(), sector || null, logoUrl);
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

app.put('/api/companies/:id', requireAuth, uploadLogo.single('logo'), async (req, res) => {
  const { name, sector } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name requerido' });
  try {
    const data = { name: name.trim(), sector: sector || null };
    if (req.file) data.logo_url = `/uploads/logos/${req.file.filename}`;
    const company = await db.updateCompany(req.params.id, data);
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
app.post('/api/companies/:companyId/teams', async (req, res) => {
  const { name, avatarColor } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name requerido' });
  try {
    const team = await db.createTeam(nanoid(12), req.params.companyId, name.trim(), avatarColor || '#667eea');
    res.status(201).json(team);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/companies/:companyId/teams', async (req, res) => {
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

app.post('/api/teams/:id/generate-link', async (req, res) => {
  try {
    const team = await db.getTeam(req.params.id);
    if (!team) return res.status(404).json({ error: 'team not found' });

    // Return existing questionnaire if one exists
    const existing = await db.query(
      `SELECT id, company_id, access_token, status FROM questionnaires WHERE team_id = ? ORDER BY CASE WHEN status='submitted' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`,
      [req.params.id]
    );
    if (existing.rows.length) {
      const eq = existing.rows[0];
      return res.json({ id: eq.id, company_id: eq.company_id, access_token: eq.access_token });
    }

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

// Get questionnaire by team (public, returns link info)
app.get('/api/teams/:id/questionnaire', async (req, res) => {
  try {
    const questionnaires = await db.query(
      `SELECT id, access_token, status FROM questionnaires WHERE team_id = ? ORDER BY CASE WHEN status='submitted' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`,
      [req.params.id]
    );
    if (!questionnaires.rows.length) return res.status(404).json({ error: 'No questionnaire' });
    const q = questionnaires.rows[0];
    res.json({ id: q.id, access_token: q.access_token, status: q.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── API: Questionnaires ────────────────────────────── */
app.get('/api/questionnaires/:id', async (req, res) => {
  try {
    const q = await db.getQuestionnaire(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
    if (q.team_id) {
      const team = await db.getTeam(q.team_id);
      if (team) q.team_name = team.name;
    }
    if (q.company_id) {
      const company = await db.getCompany(q.company_id);
      if (company && company.logo_url) q.company_logo = company.logo_url;
    }
    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/questionnaires/:id/responses', async (req, res) => {
  try {
    const q = await db.getQuestionnaire(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
    const updated = await db.updateQuestionnaireResponses(req.params.id, req.body);
    res.json({ ok: true, updated_at: updated.updated_at });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/questionnaires/:id/submit', async (req, res) => {
  try {
    const q = await db.getQuestionnaire(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
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
function buildAnalytics(qs) {
  const impactos = {};
  const recursos = {};
  qs.forEach(q => {
    const resp = typeof q.responses === 'string' ? JSON.parse(q.responses) : q.responses;
    (resp.reto?.impactos || []).forEach(i => { impactos[i] = (impactos[i] || 0) + 1; });
    (resp.recursos?.tipos || []).forEach(r => { recursos[r] = (recursos[r] || 0) + 1; });
  });
  return { total_cuestionarios: qs.length, impactos, recursos, cuestionarios_recientes: qs.slice(0, 10) };
}

app.get('/api/analytics/patterns', requireAuth, async (req, res) => {
  try {
    const qs = await db.getSubmittedQuestionnaires();
    res.json(buildAnalytics(qs));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/analytics/patterns/:companyId', requireAuth, async (req, res) => {
  try {
    const qs = await db.getQuestionnairesByCompany(req.params.companyId);
    const all = qs.filter(q => q.status === 'submitted' || q.status === 'draft');
    res.json(buildAnalytics(all));
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

/* ── API: PDF Export ───────────────────────────────── */
app.get('/api/questionnaires/:id/pdf', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const q = await db.getQuestionnaire(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });

    const resp = typeof q.responses === 'string' ? JSON.parse(q.responses) : q.responses;
    const teamName = q.team_name || resp.nombre_equipo || 'Equipo';

    // Get company logo path
    let companyLogoPath = null;
    if (q.company_id) {
      const company = await db.getCompany(q.company_id);
      if (company?.logo_url) {
        const logoFile = path.join(__dirname, 'public', company.logo_url);
        if (fs.existsSync(logoFile)) companyLogoPath = logoFile;
      }
    }

    const M = 36;
    const doc = new PDFDocument({ size: 'A4', margins: { top: 28, bottom: 20, left: M, right: M }, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Cuestionario_${teamName.replace(/\s+/g, '_')}.pdf"`);
    doc.pipe(res);

    const purple = '#7B3FA8';
    const dk = '#3A1259';
    const gold = '#E9A020';
    const gr = '#6b7280';
    const tx = '#1f2937';
    const W = doc.page.width - M * 2;
    const half = W / 2 - 4;

    // ── Header ──
    const lhhLogo = path.join(__dirname, 'public', 'img', 'lhh-logo.png');
    if (fs.existsSync(lhhLogo)) doc.image(lhhLogo, M, 18, { height: 32 });
    doc.fontSize(15).fillColor(dk).text('Cuestionario de Iniciativas Estrategicas', M + 85, 18, { width: W - 180 });
    doc.fontSize(9).fillColor(gr).text('Mesas de Trabajo', M + 85, 38, { width: W - 180 });
    if (companyLogoPath) {
      try { doc.image(companyLogoPath, doc.page.width - M - 80, 14, { height: 36, fit: [80, 36] }); } catch (e) {}
    }
    doc.moveTo(M, 56).lineTo(doc.page.width - M, 56).lineWidth(0.8).strokeColor(purple).stroke();

    // ── Team info ──
    doc.fontSize(18).fillColor(dk).text(teamName, M, 64, { width: W });
    const info = [resp.nombre_iniciativa, resp.lider_equipo, resp.fecha].filter(Boolean).join('  |  ');
    doc.fontSize(10).fillColor(gr).text(info, M, doc.y, { width: W });
    doc.moveDown(0.3);
    doc.moveTo(M, doc.y).lineTo(doc.page.width - M, doc.y).lineWidth(0.3).strokeColor('#d1d5db').stroke();
    doc.y += 10;

    // ── Helpers ──
    function sec(title, x, w) {
      const y = doc.y;
      doc.rect(x, y, 3, 16).fill(purple);
      doc.fontSize(12).fillColor(purple).text(title, x + 8, y + 1, { width: w - 8 });
      doc.y = y + 20;
    }

    function lbl(text, x, w) {
      doc.fontSize(8.5).fillColor(gr).text(text.toUpperCase(), x, doc.y, { width: w });
    }

    function val(text, x, w) {
      if (!text) return;
      doc.fontSize(11).fillColor(tx).text(text, x, doc.y, { width: w, lineGap: 1 });
      doc.moveDown(0.2);
    }

    function field(label, value, x, w) {
      if (!value) return;
      lbl(label, x, w);
      val(value, x, w);
    }

    function chips(items, x, w) {
      if (!items?.length) return;
      doc.fontSize(10).fillColor(gold).text(items.join(' | '), x, doc.y, { width: w });
      doc.moveDown(0.2);
    }

    // ── LEFT COLUMN: Reto + Solucion ──
    const startY = doc.y;
    const leftX = M;
    const rightX = M + half + 8;

    // Reto
    sec('Reto de Negocio', leftX, half);
    field('Problema / Oportunidad', resp.reto?.problema, leftX, half);
    field('Evidencias', resp.reto?.evidencias, leftX, half);
    if (resp.reto?.impactos?.length) {
      lbl('Impactos', leftX, half);
      chips(resp.reto.impactos, leftX, half);
    }
    field('Descripcion', resp.reto?.descripcion, leftX, half);

    // Solucion
    sec('Solucion', leftX, half);
    field('Propuesta', resp.solucion?.propuesta, leftX, half);
    field('Diferenciadores', resp.solucion?.diferenciadores, leftX, half);

    const leftEnd = doc.y;

    // ── RIGHT COLUMN: Recursos + Riesgos + Necesidades ──
    doc.y = startY;

    // Recursos
    sec('Recursos', rightX, half);
    if (resp.recursos?.tipos?.length) {
      lbl('Tipos', rightX, half);
      chips(resp.recursos.tipos, rightX, half);
    }
    field('Detalle', resp.recursos?.detalle, rightX, half);

    // Riesgos
    const riesgos = (resp.riesgos || []).filter(i => i.riesgo);
    if (riesgos.length) {
      sec('Riesgos', rightX, half);
      riesgos.forEach(row => {
        doc.fontSize(10).fillColor(tx).text((row.riesgo || '') + '  ->  ' + (row.mitigacion || ''), rightX, doc.y, { width: half, lineGap: 1 });
        doc.moveDown(0.1);
      });
      doc.moveDown(0.1);
    }

    // Necesidades
    if (resp.necesidades) {
      sec('Necesidades', rightX, half);
      val(resp.necesidades, rightX, half);
    }

    const rightEnd = doc.y;

    // ── Impacto Esperado (full width, below both columns) ──
    doc.y = Math.max(leftEnd, rightEnd) + 4;
    const impactos = (resp.impacto || []).filter(i => i.resultado);
    if (impactos.length) {
      sec('Impacto Esperado', M, W);
      const colW = [W * 0.42, W * 0.33, W * 0.25];

      // Header
      const hy = doc.y;
      doc.rect(M, hy - 1, W, 16).fill('#f3f0f8');
      ['Resultado', 'Indicador', 'Meta'].forEach((h, i) => {
        const x = M + colW.slice(0, i).reduce((a, b) => a + b, 0) + 3;
        doc.fontSize(9).fillColor(gr).text(h, x, hy + 2, { width: colW[i] - 6 });
      });
      doc.y = hy + 18;

      // Rows
      impactos.forEach(row => {
        const ry = doc.y;
        [row.resultado, row.indicador, row.meta].forEach((t, i) => {
          const x = M + colW.slice(0, i).reduce((a, b) => a + b, 0) + 3;
          doc.fontSize(10).fillColor(tx).text(t || '-', x, ry, { width: colW[i] - 6 });
        });
        doc.y = ry + doc.fontSize(10).heightOfString(row.resultado || '-', { width: colW[0] - 6 }) + 4;
      });
    }

    doc.end();
  } catch (e) {
    console.error('PDF error:', e);
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
