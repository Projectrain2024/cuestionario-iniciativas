const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'cuestionario.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite');
    initDb();
  }
});

db.configure('busyTimeout', 5000);

function initDb() {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sector TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#3B82F6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS questionnaires (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      access_token TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'draft',
      responses TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);
}

module.exports = {
  query: async (text, params = []) => {
    return new Promise((resolve, reject) => {
      if (text.includes('INSERT') || text.includes('UPDATE') || text.includes('DELETE')) {
        db.run(text, params, function(err) {
          if (err) reject(err);
          else resolve({ rows: [{ id: this.lastID }] });
        });
      } else {
        db.all(text, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        });
      }
    });
  },

  // Companies
  createCompany: async (id, name, sector = null) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO companies (id, name, sector) VALUES (?, ?, ?)',
        [id, name, sector],
        function(err) {
          if (err) reject(err);
          else resolve({ id, name, sector, created_at: new Date() });
        }
      );
    });
  },

  getCompanies: async () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM companies WHERE deleted_at IS NULL ORDER BY created_at DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  getCompany: async (id) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM companies WHERE id = ? AND deleted_at IS NULL',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  updateCompany: async (id, data) => {
    const { name, sector } = data;
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE companies SET name = ?, sector = ?, updated_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL',
        [name, sector, id],
        function(err) {
          if (err) reject(err);
          else resolve({ id, name, sector });
        }
      );
    });
  },

  deleteCompany: async (id) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE companies SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve({ id });
        }
      );
    });
  },

  // Teams
  createTeam: async (id, companyId, name, avatarColor) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO teams (id, company_id, name, avatar_color) VALUES (?, ?, ?, ?)',
        [id, companyId, name, avatarColor],
        function(err) {
          if (err) reject(err);
          else resolve({ id, company_id: companyId, name, avatar_color: avatarColor });
        }
      );
    });
  },

  getTeamsByCompany: async (companyId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM teams WHERE company_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
        [companyId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  getTeam: async (id) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM teams WHERE id = ? AND deleted_at IS NULL',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  updateTeam: async (id, data) => {
    const { name, avatarColor } = data;
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE teams SET name = ?, avatar_color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
        [name, avatarColor, id],
        function(err) {
          if (err) reject(err);
          else resolve({ id, name });
        }
      );
    });
  },

  deleteTeam: async (id) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE teams SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve({ id });
        }
      );
    });
  },

  // Questionnaires
  createQuestionnaire: async (id, teamId, companyId, accessToken) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO questionnaires (id, team_id, company_id, access_token, status) VALUES (?, ?, ?, ?, ?)',
        [id, teamId, companyId, accessToken, 'draft'],
        function(err) {
          if (err) reject(err);
          else resolve({ id, team_id: teamId, company_id: companyId, access_token: accessToken, status: 'draft' });
        }
      );
    });
  },

  getQuestionnaire: async (id) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM questionnaires WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  getQuestionnaireByToken: async (token) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM questionnaires WHERE access_token = ?',
        [token],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  updateQuestionnaireResponses: async (id, responses) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE questionnaires SET responses = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(responses), id],
        function(err) {
          if (err) reject(err);
          else resolve({ id, updated_at: new Date() });
        }
      );
    });
  },

  submitQuestionnaire: async (id) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE questionnaires SET status = ?, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['submitted', id],
        function(err) {
          if (err) reject(err);
          else resolve({ id, status: 'submitted' });
        }
      );
    });
  },

  getQuestionnairesByCompany: async (companyId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM questionnaires WHERE company_id = ? ORDER BY created_at DESC',
        [companyId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  getSubmittedQuestionnaires: async () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM questionnaires WHERE status = ? ORDER BY submitted_at DESC',
        ['submitted'],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  end: async () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },
};
