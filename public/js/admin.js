// Admin Panel Logic

let currentCompanyId = null;

// ── Modal Management ────────────────────────────────
const companyModal = document.getElementById('companyModal');
const teamModal = document.getElementById('teamModal');
const companyForm = document.getElementById('companyForm');

function openCompanyModal(editId = null) {
  currentCompanyId = editId;
  const titleEl = document.querySelector('#companyModal .modal-header h3');
  const nameInput = document.getElementById('companyName');

  if (editId) {
    titleEl.textContent = 'Editar Empresa';
    // Cargar datos de empresa
    fetch(`/api/companies/${editId}`)
      .then(r => r.json())
      .then(company => {
        nameInput.value = company.name;
        companyModal.classList.remove('hidden');
      });
  } else {
    titleEl.textContent = 'Nueva Empresa';
    nameInput.value = '';
    companyModal.classList.remove('hidden');
  }
}

function closeCompanyModal() {
  companyModal.classList.add('hidden');
  companyForm.reset();
  currentCompanyId = null;
}

function openTeamModal(companyId, companyName) {
  currentCompanyId = companyId;
  document.getElementById('companyNameInTeamModal').textContent = companyName;
  teamModal.classList.remove('hidden');
  loadTeams(companyId);
}

function closeTeamModal() {
  teamModal.classList.add('hidden');
}

// ── Event Listeners ────────────────────────────────
document.getElementById('createCompanyBtn').addEventListener('click', () => openCompanyModal());

companyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('companyName').value.trim();

  if (!name) {
    alert('El nombre de la empresa es requerido');
    return;
  }

  try {
    const method = currentCompanyId ? 'PUT' : 'POST';
    const url = currentCompanyId
      ? `/api/companies/${currentCompanyId}`
      : '/api/companies';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) throw new Error('Error al guardar');

    closeCompanyModal();
    loadCompanies();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al guardar la empresa: ' + error.message);
  }
});

document.querySelectorAll('[data-action="close"]').forEach(btn => {
  btn.addEventListener('click', closeCompanyModal);
});

document.querySelectorAll('[data-action="close-team"]').forEach(btn => {
  btn.addEventListener('click', closeTeamModal);
});

document.getElementById('createTeamBtn').addEventListener('click', () => {
  const teamName = prompt('Nombre del equipo:');
  if (!teamName?.trim()) return;

  createTeam(currentCompanyId, teamName.trim());
});

// ── Companies ────────────────────────────────────
async function loadCompanies() {
  try {
    const response = await fetch('/api/companies');
    if (!response.ok) throw new Error('Error al cargar');

    const companies = await response.json();
    renderCompanies(companies);
  } catch (error) {
    console.error('Error loading companies:', error);
    document.getElementById('companiesList').innerHTML =
      '<div class="error-message">Error al cargar empresas</div>';
  }
}

function renderCompanies(companies) {
  const container = document.getElementById('companiesList');

  if (companies.length === 0) {
    container.innerHTML = '<p class="text-muted">No hay empresas creadas aún</p>';
    return;
  }

  container.innerHTML = companies.map(company => `
    <div class="company-card">
      <h3>${escapeHtml(company.name)}</h3>
      <p class="text-muted" style="font-size: 12px;">
        Creada: ${new Date(company.created_at).toLocaleDateString('es-ES')}
      </p>
      <div class="company-card-footer">
        <button class="btn btn-primary btn-small" onclick="openTeamModal('${company.id}', '${escapeHtml(company.name)}')">
          👥 Equipos
        </button>
        <div class="company-card-actions">
          <button class="btn btn-secondary btn-small" onclick="openCompanyModal('${company.id}')">
            ✏️
          </button>
          <button class="btn btn-danger btn-small" onclick="deleteCompany('${company.id}')">
            🗑️
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function deleteCompany(companyId) {
  if (!confirm('¿Eliminar esta empresa? Esto no se puede deshacer.')) return;

  try {
    const response = await fetch(`/api/companies/${companyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Error al eliminar');

    loadCompanies();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al eliminar la empresa');
  }
}

// ── Teams ────────────────────────────────────
async function loadTeams(companyId) {
  try {
    const response = await fetch(`/api/companies/${companyId}/teams`);
    if (!response.ok) throw new Error('Error al cargar');

    const teams = await response.json();
    renderTeams(teams, companyId);
  } catch (error) {
    console.error('Error loading teams:', error);
    document.getElementById('teamsList').innerHTML =
      '<div class="error-message">Error al cargar equipos</div>';
  }
}

function renderTeams(teams, companyId) {
  const container = document.getElementById('teamsList');

  if (teams.length === 0) {
    container.innerHTML = '<p class="text-muted">No hay equipos en esta empresa</p>';
    return;
  }

  container.innerHTML = teams.map(team => `
    <div class="team-card">
      <div class="team-avatar" style="background: ${team.avatar_color}">
        ${team.name.charAt(0).toUpperCase()}
      </div>
      <div class="team-info">
        <div class="team-name">${escapeHtml(team.name)}</div>
      </div>
      <div class="team-actions">
        <button class="btn btn-primary btn-small" onclick="generateQuestionnaireLink('${team.id}')">
          🔗
        </button>
        <button class="btn btn-danger btn-small" onclick="deleteTeam('${team.id}')">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

async function createTeam(companyId, teamName) {
  try {
    const response = await fetch(`/api/companies/${companyId}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: teamName,
        avatarColor: generateRandomColor(),
      }),
    });

    if (!response.ok) throw new Error('Error al crear');

    loadTeams(companyId);
  } catch (error) {
    console.error('Error:', error);
    alert('Error al crear equipo');
  }
}

async function deleteTeam(teamId) {
  if (!confirm('¿Eliminar este equipo?')) return;

  try {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Error al eliminar');

    loadTeams(currentCompanyId);
  } catch (error) {
    console.error('Error:', error);
    alert('Error al eliminar equipo');
  }
}

async function generateQuestionnaireLink(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}/generate-link`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error('Error al generar');

    const data = await response.json();
    const link = `${window.location.origin}/empresa/${data.company_id}/questionnaire/${data.id}`;

    // Copiar al portapapeles
    navigator.clipboard.writeText(link);
    alert('✅ Link copiado al portapapeles:\n\n' + link);
  } catch (error) {
    console.error('Error:', error);
    alert('Error al generar link');
  }
}

// ── Utilities ────────────────────────────────────
function generateRandomColor() {
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Init ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCompanies();
});
