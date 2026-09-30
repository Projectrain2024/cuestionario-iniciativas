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
  const logoInput = document.getElementById('companyLogo');
  const logoPreview = document.getElementById('logoPreview');
  const logoPreviewContainer = document.getElementById('logoPreviewContainer');

  logoInput.value = '';
  logoPreviewContainer.style.display = 'none';

  if (editId) {
    titleEl.textContent = 'Editar Empresa';
    fetch(`/api/companies/${editId}`)
      .then(r => r.json())
      .then(company => {
        nameInput.value = company.name;
        sectorInput.value = company.sector || '';
        if (company.logo_url) {
          logoPreview.src = company.logo_url;
          logoPreviewContainer.style.display = 'block';
        }
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

async function openCreateTeamForm() {
  // Disable colors already used by teams in this company
  const colorSelect = document.getElementById('teamColor');
  const options = colorSelect.querySelectorAll('option');
  options.forEach(opt => { opt.disabled = false; opt.textContent = opt.textContent.replace(' (usado)', ''); });

  try {
    const res = await fetch(`/api/companies/${currentCompanyId}/teams`);
    if (res.ok) {
      const teams = await res.json();
      const usedColors = teams.map(t => t.avatar_color);
      options.forEach(opt => {
        if (usedColors.includes(opt.value)) {
          opt.disabled = true;
          opt.textContent += ' (usado)';
        }
      });
      // Select first available color
      const firstAvailable = Array.from(options).find(o => !o.disabled);
      if (firstAvailable) colorSelect.value = firstAvailable.value;
    }
  } catch (e) {}

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
  const logoFile = document.getElementById('companyLogo').files[0];

  if (!name) {
    alert('El nombre de la empresa es requerido');
    return;
  }

  if (!sector) {
    alert('Por favor selecciona un sector');
    return;
  }

  try {
    const method = currentCompanyId ? 'PUT' : 'POST';
    const url = currentCompanyId
      ? `/api/companies/${currentCompanyId}`
      : '/api/companies';

    const formData = new FormData();
    formData.append('name', name);
    formData.append('sector', sector);
    if (logoFile) formData.append('logo', logoFile);

    const response = await fetch(url, {
      method,
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) throw new Error('Error al guardar');

    const company = await response.json();
    const isNew = !currentCompanyId;
    closeCompanyModal();
    loadCompanies();

    if (isNew) {
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
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
        ${company.logo_url
          ? `<img src="${company.logo_url}" alt="" style="height:64px; object-fit:contain;">`
          : `<div style="width:40px;height:40px;border-radius:8px;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;">${escapeHtml(company.name).charAt(0)}</div>`}
        <h3 style="margin:0;">${escapeHtml(company.name)}</h3>
      </div>
      <p class="text-muted" style="font-size: 12px;">
        ${company.sector || 'Sin sector'} • ${new Date(company.created_at).toLocaleDateString('es-ES')}
      </p>
      <div class="company-card-footer" style="flex-wrap: wrap; gap: 6px;">
        <button class="btn btn-primary btn-small" onclick="openTeamModal('${company.id}', '${escapeHtml(company.name)}')">
          👥 Equipos
        </button>
        <a href="/dashboard/${company.id}" class="btn btn-small" style="background: #E9A020; color: white; text-decoration: none; font-size: 12px;">
          📊 Resultados
        </a>
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

function deleteCompany(companyId) {
  showConfirmDelete('¿Eliminar esta empresa y todos sus equipos?', async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Error al eliminar');

      loadCompanies();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar la empresa');
    }
  });
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

async function renderTeams(teams, companyId) {
  const container = document.getElementById('teamsList');

  if (teams.length === 0) {
    container.innerHTML = '<p class="text-muted">No hay equipos en esta empresa</p>';
    return;
  }

  // Fetch questionnaire links for each team
  const teamsWithQ = await Promise.all(teams.map(async (team) => {
    try {
      const res = await fetch(`/api/teams/${team.id}/questionnaire`);
      if (res.ok) {
        const q = await res.json();
        team.qId = q.id;
        team.qUrl = `/empresa/${companyId}/questionnaire/${q.id}?token=${q.access_token}`;
        team.qStatus = q.status;
      }
    } catch (e) {}
    return team;
  }));

  container.innerHTML = teamsWithQ.map(team => `
    <div class="team-card">
      <div class="team-avatar" style="background: ${team.avatar_color}">
        ${team.name.charAt(0).toUpperCase()}
      </div>
      <div class="team-info">
        <div class="team-name">${escapeHtml(team.name)}</div>
        ${team.qUrl ? `<a href="${team.qUrl}" target="_blank" style="font-size: 11px; color: #7B3FA8;">
          ${team.qStatus === 'submitted' ? '✅ Completado' : '📝 Ver cuestionario'}
        </a>` : '<span style="font-size: 11px; color: #9ca3af;">Sin cuestionario</span>'}
      </div>
      <div class="team-actions">
        <button class="btn btn-primary btn-small" onclick="generateQuestionnaireLink('${team.id}')">
          🔗
        </button>
        ${team.qId ? `<button class="btn btn-small" style="background:#E9A020; color:white;" onclick="showResultsLink('${team.qId}', '${escapeHtml(team.name)}')">
          📊
        </button>` : ''}
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

function deleteTeam(teamId) {
  showConfirmDelete('¿Eliminar este equipo y su cuestionario?', async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Error al eliminar');

      loadTeams(currentCompanyId);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar equipo');
    }
  });
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

// Logo file preview
document.getElementById('companyLogo').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('logoPreview');
  const container = document.getElementById('logoPreviewContainer');
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      container.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    container.style.display = 'none';
  }
});

// ── Results Link Modal ────────────────────────────────
function showResultsLink(qId, teamName) {
  const link = `${window.location.origin}/resultados/${qId}`;
  document.getElementById('resultsTeamName').textContent = teamName;
  document.getElementById('resultsLink').value = link;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
  document.getElementById('resultsQrCode').innerHTML = `<img src="${qrUrl}" alt="QR Code" style="width: 300px; height: 300px;">`;
  window.currentResultsLink = link;
  document.getElementById('resultsLinkModal').classList.remove('hidden');
}

function closeResultsLink() {
  document.getElementById('resultsLinkModal').classList.add('hidden');
}

function copyResultsLink() {
  navigator.clipboard.writeText(document.getElementById('resultsLink').value);
  alert('✅ Link copiado al portapapeles');
}

function downloadResultsQR() {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.currentResultsLink)}`;
  const a = document.createElement('a');
  a.href = qrUrl;
  a.download = 'qr-resultados.png';
  a.click();
}

// ── Confirm Delete Modal ────────────────────────────────
let pendingDeleteAction = null;

function showConfirmDelete(message, onConfirm) {
  document.getElementById('confirmDeleteMsg').textContent = message;
  pendingDeleteAction = onConfirm;
  document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

function closeConfirmDelete() {
  document.getElementById('confirmDeleteModal').classList.add('hidden');
  pendingDeleteAction = null;
}

document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
  if (pendingDeleteAction) pendingDeleteAction();
  closeConfirmDelete();
});

// ── Init ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCompanies();
});
