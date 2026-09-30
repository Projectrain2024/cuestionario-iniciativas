const path = require('path');

const isPg = !!process.env.DATABASE_URL;
let pool, sqliteDb;

if (isPg) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  pool.on('connect', () => console.log('✅ Connected to PostgreSQL'));
  pool.on('error', (err) => console.error('PostgreSQL error:', err.message));

  (async () => {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sector TEXT,
          logo_url TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          deleted_at TIMESTAMP
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS teams (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL REFERENCES companies(id),
          name TEXT NOT NULL,
          avatar_color TEXT DEFAULT '#3B82F6',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          deleted_at TIMESTAMP
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS questionnaires (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL REFERENCES teams(id),
          company_id TEXT NOT NULL REFERENCES companies(id),
          access_token TEXT NOT NULL UNIQUE,
          status TEXT DEFAULT 'draft',
          responses TEXT DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          submitted_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ PostgreSQL tables ready');
    } finally {
      client.release();
    }
  })().catch(e => console.error('DB init error:', e));
} else {
  const sqlite3 = require('sqlite3').verbose();
  sqliteDb = new sqlite3.Database(path.join(__dirname, 'cuestionario.db'), (err) => {
    if (err) console.error('Error opening database:', err.message);
    else { console.log('✅ Connected to SQLite'); initSqlite(); }
  });
  sqliteDb.configure('busyTimeout', 5000);
}

function initSqlite() {
  sqliteDb.run('PRAGMA foreign_keys = ON');
  sqliteDb.run(`CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, sector TEXT, logo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME
  )`);
  sqliteDb.run(`ALTER TABLE companies ADD COLUMN logo_url TEXT`, () => {});
  sqliteDb.run(`CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, avatar_color TEXT DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  )`);
  sqliteDb.run(`CREATE TABLE IF NOT EXISTS questionnaires (
    id TEXT PRIMARY KEY, team_id TEXT NOT NULL, company_id TEXT NOT NULL,
    access_token TEXT NOT NULL UNIQUE, status TEXT DEFAULT 'draft', responses TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, submitted_at DATETIME, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id), FOREIGN KEY (company_id) REFERENCES companies(id)
  )`);
}

function convertPlaceholders(sql, params) {
  if (!isPg) return { sql, params };
  let idx = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
  return { sql: pgSql, params };
}

async function query(text, params = []) {
  const { sql, params: p } = convertPlaceholders(text, params);
  if (isPg) {
    const res = await pool.query(sql, p);
    return { rows: res.rows };
  }
  return new Promise((resolve, reject) => {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
      sqliteDb.run(sql, p, function (err) {
        if (err) reject(err);
        else resolve({ rows: [{ id: this.lastID }] });
      });
    } else {
      sqliteDb.all(sql, p, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows: rows || [] });
      });
    }
  });
}

function now() {
  return isPg ? 'NOW()' : "datetime('now')";
}

module.exports = {
  query,

  createCompany: async (id, name, sector = null, logoUrl = null) => {
    await query('INSERT INTO companies (id, name, sector, logo_url) VALUES (?, ?, ?, ?)', [id, name, sector, logoUrl]);
    return { id, name, sector, logo_url: logoUrl, created_at: new Date() };
  },

  getCompanies: async () => {
    const res = await query('SELECT * FROM companies WHERE deleted_at IS NULL ORDER BY created_at DESC');
    return res.rows;
  },

  getCompany: async (id) => {
    const res = await query('SELECT * FROM companies WHERE id = ? AND deleted_at IS NULL', [id]);
    return res.rows[0];
  },

  updateCompany: async (id, data) => {
    const { name, sector, logo_url } = data;
    if (logo_url !== undefined) {
      await query(`UPDATE companies SET name = ?, sector = ?, logo_url = ?, updated_at = ${now()} WHERE id = ? AND deleted_at IS NULL`, [name, sector, logo_url, id]);
      return { id, name, sector, logo_url };
    }
    await query(`UPDATE companies SET name = ?, sector = ?, updated_at = ${now()} WHERE id = ? AND deleted_at IS NULL`, [name, sector, id]);
    return { id, name, sector };
  },

  deleteCompany: async (id) => {
    await query('UPDATE companies SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id };
  },

  createTeam: async (id, companyId, name, avatarColor) => {
    await query('INSERT INTO teams (id, company_id, name, avatar_color) VALUES (?, ?, ?, ?)', [id, companyId, name, avatarColor]);
    return { id, company_id: companyId, name, avatar_color: avatarColor };
  },

  getTeamsByCompany: async (companyId) => {
    const res = await query('SELECT * FROM teams WHERE company_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', [companyId]);
    return res.rows;
  },

  getTeam: async (id) => {
    const res = await query('SELECT * FROM teams WHERE id = ? AND deleted_at IS NULL', [id]);
    return res.rows[0];
  },

  updateTeam: async (id, data) => {
    const { name, avatarColor } = data;
    await query('UPDATE teams SET name = ?, avatar_color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL', [name, avatarColor, id]);
    return { id, name };
  },

  deleteTeam: async (id) => {
    await query('UPDATE teams SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id };
  },

  createQuestionnaire: async (id, teamId, companyId, accessToken) => {
    await query('INSERT INTO questionnaires (id, team_id, company_id, access_token, status) VALUES (?, ?, ?, ?, ?)', [id, teamId, companyId, accessToken, 'draft']);
    return { id, team_id: teamId, company_id: companyId, access_token: accessToken, status: 'draft' };
  },

  getQuestionnaire: async (id) => {
    const res = await query('SELECT * FROM questionnaires WHERE id = ?', [id]);
    return res.rows[0];
  },

  getQuestionnaireByToken: async (token) => {
    const res = await query('SELECT * FROM questionnaires WHERE access_token = ?', [token]);
    return res.rows[0];
  },

  updateQuestionnaireResponses: async (id, responses) => {
    await query('UPDATE questionnaires SET responses = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(responses), id]);
    return { id, updated_at: new Date() };
  },

  submitQuestionnaire: async (id) => {
    await query('UPDATE questionnaires SET status = ?, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['submitted', id]);
    return { id, status: 'submitted' };
  },

  getQuestionnairesByCompany: async (companyId) => {
    const res = await query('SELECT * FROM questionnaires WHERE company_id = ? ORDER BY created_at DESC', [companyId]);
    return res.rows;
  },

  getSubmittedQuestionnaires: async () => {
    const res = await query("SELECT * FROM questionnaires WHERE status = 'submitted' ORDER BY submitted_at DESC");
    return res.rows;
  },

  end: async () => {
    if (isPg) return pool.end();
    return new Promise((resolve, reject) => {
      sqliteDb.close((err) => { if (err) reject(err); else resolve(); });
    });
  },
};
