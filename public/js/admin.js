// Admin Panel Logic

let currentCompanyId = null;

// ── Modal Management ────────────────────────────────
const companyModal = document.getElementById('companyModal');
const teamModal = document.getElementById('teamModal');
const createTeamFormModal = document.getElementById('createTeamFormModal');
const accessLinkModal = document.getElementById('accessLinkModal');
const companyForm = document.getElementById('companyForm');
const teamForm = document.getElementById('teamForm');

function openCompanyModal(editId = null) {
  currentCompanyId = editId;
  const titleEl = document.querySelector('#companyModal .modal-header h3');
  const nameInput = document.getElementById('companyName');
  const sectorInput = document.getElementById('companySector');

  if (editId) {
    titleEl.textContent = 'Editar Empresa';
    // Cargar datos de empresa
    fetch(`/api/companies/${editId}`)
      .then(r => r.json())
      .then(company => {
        nameInput.value = company.name;
        sectorInput.value = company.sector || '';
        companyModal.classList.remove('hidden');
      });
  } else {
    titleEl.textContent = 'Nueva Empresa';
    nameInput.value = '';
    sectorInput.value = '';
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

function openCreateTeamForm() {
  createTeamFormModal.classList.remove('hidden');
  document.getElementById('teamName').focus();
}

function closeCreateTeamForm() {
  createTeamFormModal.classList.add('hidden');
  teamForm.reset();
}

function showAccessLink(companyId, companyName) {
  const accessLink = `${window.location.origin}/empresa/${companyId}/crear-equipos`;

  document.getElementById('accessLink').value = accessLink;

  // Generar QR usando QR Server API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(accessLink)}`;
  document.getElementById('qrCode').innerHTML = `<img src="${qrUrl}" alt="QR Code" style="width: 300px; height: 300px;">`;

  // Guardar en window para funciones globales
  window.currentAccessLink = accessLink;

  accessLinkModal.classList.remove('hidden');
}

function closeAccessLink() {
  accessLinkModal.classList.add('hidden');
}

// ── Event Listeners ────────────────────────────────
document.getElementById('createCompanyBtn').addEventListener('click', () => openCompanyModal());

companyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('companyName').value.trim();
  const sector = document.getElementById('companySector').value;

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
      body: JSON.stringify({ name, sector }),
    });

    if (!response.ok) throw new Error('Error al guardar');

    const company = await response.json();
    closeCompanyModal();
    loadCompanies();

    // Mostrar link con QR si es nueva empresa
    if (!currentCompanyId) {
      setTimeout(() => {
        showAccessLink(company.id, name);
      }, 500);
    }
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

document.querySelectorAll('[data-action="close-create-team"]').forEach(btn => {
  btn.addEventListener('click', closeCreateTeamForm);
});

document.querySelectorAll('[data-action="close-access-link"]').forEach(btn => {
  btn.addEventListener('click', closeAccessLink);
});

// Funciones globales para el modal de acceso
function copyAccessLink() {
  const link = document.getElementById('accessLink').value;
  navigator.clipboard.writeText(link);
  alert('✅ Link copiado al portapapeles');
}

function downloadQR() {
  const link = window.currentAccessLink;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(link)}`;

  const a = document.createElement('a');
  a.href = qrUrl;
  a.download = 'qr-acceso-equipos.png';
  a.click();
}

document.getElementById('createTeamBtn').addEventListener('click', openCreateTeamForm);

document.getElementById('createTeamLink').addEventListener('click', (e) => {
  e.preventDefault();
  const companyName = document.getElementById('companyNameInTeamModal').textContent;
  showAccessLink(currentCompanyId, companyName);
});

teamForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('teamName').value.trim();
  const color = document.getElementById('teamColor').value;

  if (!name) {
    alert('El nombre del equipo es requerido');
    return;
  }

  await createTeam(currentCompanyId, name, color);
  closeCreateTeamForm();
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
        ${company.sector || 'Sin sector'} • ${new Date(company.created_at).toLocaleDateString('es-ES')}
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

async function createTeam(companyId, teamName, avatarColor) {
  try {
    const response = await fetch(`/api/companies/${companyId}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: teamName,
        avatarColor: avatarColor || generateRandomColor(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear');
    }

    loadTeams(companyId);
    alert('✅ Equipo creado exitosamente');
  } catch (error) {
    console.error('Error:', error);
    alert('Error al crear equipo: ' + error.message);
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

// ── Init ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCompanies();
});
