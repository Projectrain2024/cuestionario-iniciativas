const db = require('./db');
const fs = require('fs');

async function seed() {
  const check = await db.query('SELECT COUNT(*) as c FROM companies');
  if (parseInt(check.rows[0].c) > 0) {
    console.log('DB already has data, skipping seed');
    return;
  }
  console.log('Seeding database...');

  const companies = [
    { id: 'bwP6O7zRuu8L', name: 'Coca Cola', sector: 'Consumo Masivo', logo_url: null },
    { id: 'gvTs8H4RpiID', name: 'Novonordisk', sector: 'Farmacéutico | Salud | Dispositivos Medicos', logo_url: '/uploads/logos/tj4pYfWYcmxd.jpeg' },
    { id: '1-_6VSWolWMv', name: 'Grupo Éxito', sector: 'Consumo Masivo', logo_url: '/uploads/logos/mfQFEQhZTCex.jpeg' },
  ];

  const teams = [
    { id: 'KDRgGzgyHqDY', company_id: 'bwP6O7zRuu8L', name: 'Líderes en Acción', avatar_color: '#667eea' },
    { id: 'OCnibHzvKf6f', company_id: 'bwP6O7zRuu8L', name: 'Líderes Imparables', avatar_color: '#667eea' },
    { id: '-ZyuapbXtOqx', company_id: 'bwP6O7zRuu8L', name: 'Los Potenciales', avatar_color: '#667eea' },
    { id: 'B3Y9_5B6pSLw', company_id: 'bwP6O7zRuu8L', name: 'Nexora', avatar_color: '#667eea' },
    { id: '9zOavBt39Sa9', company_id: 'bwP6O7zRuu8L', name: 'Los Sin Límites', avatar_color: '#667eea' },
    { id: 'pienF7obvo-y', company_id: 'bwP6O7zRuu8L', name: 'Los Titanes', avatar_color: '#667eea' },
    { id: '4dJ2EfS2De7p', company_id: 'gvTs8H4RpiID', name: 'Zorros', avatar_color: '#764ba2' },
    { id: 'fC2zrQs50rnj', company_id: 'gvTs8H4RpiID', name: 'Focas', avatar_color: '#667eea' },
    { id: 'oSL5nqBNM7uZ', company_id: 'gvTs8H4RpiID', name: 'buhos', avatar_color: '#f093fb' },
    { id: '13z9JCDtYldd', company_id: '1-_6VSWolWMv', name: 'Innovadores', avatar_color: '#667eea' },
    { id: 'DwTf2doviO9A', company_id: '1-_6VSWolWMv', name: 'Estrategas', avatar_color: '#f093fb' },
    { id: 'yuSWpN_r0Qq-', company_id: '1-_6VSWolWMv', name: 'Visionarios', avatar_color: '#764ba2' },
    { id: 'bw7xuJXAZPf4', company_id: '1-_6VSWolWMv', name: 'Pioneros', avatar_color: '#43e97b' },
    { id: 'b9nrIEhpHJ0j', company_id: '1-_6VSWolWMv', name: 'Transformadores', avatar_color: '#fa709a' },
  ];

  const stEvents = [
    { id: '0_deUtBwIdD2', company_id: 'bwP6O7zRuu8L', name: 'Programa de Desarrollo Comercial 2026', panelistas: '["Panelista LHH","Panelista Coca-Cola","Panelista 3"]', status: 'active' },
    { id: 'hVNK7rhOlInU', company_id: 'gvTs8H4RpiID', name: 'Test ventas', panelistas: '["ventas","mercadeo"]', status: 'active' },
  ];

  for (const c of companies) {
    await db.query('INSERT INTO companies (id, name, sector, logo_url) VALUES (?, ?, ?, ?)', [c.id, c.name, c.sector, c.logo_url]);
  }
  console.log('  Companies: ' + companies.length);

  for (const t of teams) {
    await db.query('INSERT INTO teams (id, company_id, name, avatar_color) VALUES (?, ?, ?, ?)', [t.id, t.company_id, t.name, t.avatar_color]);
  }
  console.log('  Teams: ' + teams.length);

  for (const e of stEvents) {
    await db.query('INSERT INTO st_events (id, company_id, name, panelistas, status) VALUES (?, ?, ?, ?, ?)', [e.id, e.company_id, e.name, e.panelistas, e.status]);
  }
  console.log('  ST Events: ' + stEvents.length);

  // Load questionnaires from seed-questionnaires.json if it exists
  try {
    const qData = JSON.parse(fs.readFileSync(__dirname + '/seed-questionnaires.json', 'utf8'));
    for (const q of qData) {
      await db.query(
        'INSERT INTO questionnaires (id, team_id, company_id, access_token, status, responses, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [q.id, q.team_id, q.company_id, q.access_token, q.status, q.responses, q.submitted_at]
      );
    }
    console.log('  Questionnaires: ' + qData.length);
  } catch(e) {
    console.log('  No seed-questionnaires.json found, skipping questionnaires');
  }

  console.log('Seed complete!');
}

module.exports = seed;
