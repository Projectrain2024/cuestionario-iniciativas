-- Plataforma de Cuestionarios — Schema PostgreSQL

-- Table: companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);

-- Table: teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  avatar_color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON teams(deleted_at);

-- Table: questionnaires
CREATE TABLE IF NOT EXISTS questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  access_token UUID NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'draft',
  responses JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questionnaires_team_id ON questionnaires(team_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_company_id ON questionnaires(company_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_access_token ON questionnaires(access_token);
CREATE INDEX IF NOT EXISTS idx_questionnaires_status ON questionnaires(status);
CREATE INDEX IF NOT EXISTS idx_questionnaires_created_at ON questionnaires(created_at);
CREATE INDEX IF NOT EXISTS idx_questionnaires_responses ON questionnaires USING GIN (responses);
