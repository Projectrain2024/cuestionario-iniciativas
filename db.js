const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cuestionario',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = {
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error', { text, error: error.message });
      throw error;
    }
  },

  getConnection: async () => {
    return pool.connect();
  },

  // Companies
  createCompany: async (id, name) => {
    const res = await module.exports.query(
      'INSERT INTO companies (id, name) VALUES ($1, $2) RETURNING *',
      [id, name]
    );
    return res.rows[0];
  },

  getCompanies: async () => {
    const res = await module.exports.query(
      'SELECT * FROM companies WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    return res.rows;
  },

  getCompany: async (id) => {
    const res = await module.exports.query(
      'SELECT * FROM companies WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return res.rows[0];
  },

  updateCompany: async (id, data) => {
    const { name } = data;
    const res = await module.exports.query(
      'UPDATE companies SET name = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING *',
      [name, id]
    );
    return res.rows[0];
  },

  deleteCompany: async (id) => {
    const res = await module.exports.query(
      'UPDATE companies SET deleted_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return res.rows[0];
  },

  // Teams
  createTeam: async (id, companyId, name, avatarColor) => {
    const res = await module.exports.query(
      'INSERT INTO teams (id, company_id, name, avatar_color) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, companyId, name, avatarColor]
    );
    return res.rows[0];
  },

  getTeamsByCompany: async (companyId) => {
    const res = await module.exports.query(
      'SELECT * FROM teams WHERE company_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
      [companyId]
    );
    return res.rows;
  },

  getTeam: async (id) => {
    const res = await module.exports.query(
      'SELECT * FROM teams WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return res.rows[0];
  },

  updateTeam: async (id, data) => {
    const { name, avatarColor } = data;
    const res = await module.exports.query(
      'UPDATE teams SET name = $1, avatar_color = $2, updated_at = NOW() WHERE id = $3 AND deleted_at IS NULL RETURNING *',
      [name, avatarColor, id]
    );
    return res.rows[0];
  },

  deleteTeam: async (id) => {
    const res = await module.exports.query(
      'UPDATE teams SET deleted_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return res.rows[0];
  },

  // Questionnaires
  createQuestionnaire: async (id, teamId, companyId, accessToken) => {
    const res = await module.exports.query(
      'INSERT INTO questionnaires (id, team_id, company_id, access_token, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, teamId, companyId, accessToken, 'draft']
    );
    return res.rows[0];
  },

  getQuestionnaire: async (id) => {
    const res = await module.exports.query(
      'SELECT * FROM questionnaires WHERE id = $1',
      [id]
    );
    return res.rows[0];
  },

  getQuestionnaireByToken: async (token) => {
    const res = await module.exports.query(
      'SELECT * FROM questionnaires WHERE access_token = $1',
      [token]
    );
    return res.rows[0];
  },

  updateQuestionnaireResponses: async (id, responses) => {
    const res = await module.exports.query(
      'UPDATE questionnaires SET responses = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(responses), id]
    );
    return res.rows[0];
  },

  submitQuestionnaire: async (id) => {
    const res = await module.exports.query(
      'UPDATE questionnaires SET status = $1, submitted_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *',
      ['submitted', id]
    );
    return res.rows[0];
  },

  getQuestionnairesByCompany: async (companyId) => {
    const res = await module.exports.query(
      'SELECT * FROM questionnaires WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );
    return res.rows;
  },

  getSubmittedQuestionnaires: async () => {
    const res = await module.exports.query(
      'SELECT * FROM questionnaires WHERE status = $1 ORDER BY submitted_at DESC',
      ['submitted']
    );
    return res.rows;
  },

  end: async () => {
    await pool.end();
  },
};
