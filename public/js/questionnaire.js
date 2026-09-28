// Questionnaire Form Logic

let currentSection = 0;
let questionnaireId = null;
let accessToken = null;
let autoSaveTimer = null;
let lastSavedState = null;

// Extract IDs from URL
function getUrlParams() {
  const parts = window.location.pathname.split('/');
  return {
    companyId: parts[2],
    questionnaireId: parts[4],
  };
}

// Initialize
async function init() {
  const { companyId, questionnaireId: qId } = getUrlParams();
  questionnaireId = qId;
  accessToken = qId; // For PATCH requests

  // Load questionnaire data
  try {
    const res = await fetch(`/api/questionnaires/${qId}?token=${accessToken}`);
    if (!res.ok) throw new Error('Not found');

    const q = await res.json();

    // Set team name
    if (q.responses?.nombre_equipo) {
      document.getElementById('teamName').textContent = q.responses.nombre_equipo;
      document.getElementById('teamNameInput').value = q.responses.nombre_equipo;
    }

    // Load existing responses
    if (q.responses && q.responses !== '{}') {
      loadResponses(q.responses);
    }

    // Set today's date
    document.getElementById('fecha').valueAsDate = new Date();

    // Initialize dynamic rows
    if (!document.querySelectorAll('[name="impactoResult"]:empty').length) {
      addImpactoRow();
    }
    if (!document.querySelectorAll('[name="riesgo"]').length) {
      addRiesgoRow();
    }

    updateProgress();
    setupEventListeners();
  } catch (error) {
    console.error('Init error:', error);
    document.querySelector('.questionnaire-form').innerHTML =
      '<div class="error-message">Error al cargar el cuestionario</div>';
  }
}

function setupEventListeners() {
  const form = document.getElementById('questionnaireForm');

  // Autosave on any change
  form.addEventListener('change', debounce(autoSave, 1000));
  form.addEventListener('input', debounce(autoSave, 1000));

  // Update progress
  document.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('change', updateProgress);
  });
}

async function autoSave() {
  const state = collectFormData();
  const stateStr = JSON.stringify(state);

  if (stateStr === lastSavedState) return; // No changes

  lastSavedState = stateStr;
  updateSaveStatus('Guardando...');

  try {
    const res = await fetch(`/api/questionnaires/${questionnaireId}/responses`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(state),
    });

    if (!res.ok) throw new Error('Save failed');

    updateSaveStatus('✓ Guardado');
    setTimeout(() => updateSaveStatus(''), 2000);
  } catch (error) {
    console.error('Autosave error:', error);
    updateSaveStatus('❌ Error al guardar');
  }
}

function collectFormData() {
  return {
    nombre_equipo: document.getElementById('teamNameInput').value,
    nombre_iniciativa: document.getElementById('nombreIniciativa').value,
    lider_equipo: document.getElementById('liderEquipo').value,
    fecha: document.getElementById('fecha').value,
    reto: {
      problema: document.getElementById('retoProblem').value,
      evidencias: document.getElementById('retoevidencia').value,
      impactos: Array.from(document.querySelectorAll('input[name="impactos"]:checked')).map(x => x.value),
      descripcion: document.getElementById('retoDesc').value,
    },
    solucion: {
      propuesta: document.getElementById('solucionPropuesta').value,
      diferenciadores: document.getElementById('solucionDiferencia').value,
    },
    impacto: Array.from(document.querySelectorAll('[name="impactoResult"]')).map((_, i) => ({
      resultado: document.querySelector(`input[name="impactoResult"][data-row="${i}"]`)?.value || '',
      indicador: document.querySelector(`input[name="impactoIndicador"][data-row="${i}"]`)?.value || '',
      meta: document.querySelector(`input[name="impactoMeta"][data-row="${i}"]`)?.value || '',
    })),
    recursos: {
      tipos: Array.from(document.querySelectorAll('input[name="recursos"]:checked')).map(x => x.value),
      detalle: document.getElementById('recursosDetalle').value,
    },
    riesgos: Array.from(document.querySelectorAll('[name="riesgo"]')).map((_, i) => ({
      riesgo: document.querySelector(`input[name="riesgo"][data-row="${i}"]`)?.value || '',
      mitigacion: document.querySelector(`input[name="mitigacion"][data-row="${i}"]`)?.value || '',
    })),
    necesidades: document.getElementById('necesidadesAdicionales').value,
  };
}

function loadResponses(data) {
  if (typeof data === 'string') data = JSON.parse(data);

  document.getElementById('nombreIniciativa').value = data.nombre_iniciativa || '';
  document.getElementById('liderEquipo').value = data.lider_equipo || '';
  document.getElementById('fecha').value = data.fecha || '';
  document.getElementById('retoProblem').value = data.reto?.problema || '';
  document.getElementById('retoevidencia').value = data.reto?.evidencias || '';
  document.getElementById('retoDesc').value = data.reto?.descripcion || '';
  document.getElementById('solucionPropuesta').value = data.solucion?.propuesta || '';
  document.getElementById('solucionDiferencia').value = data.solucion?.diferenciadores || '';
  document.getElementById('recursosDetalle').value = data.recursos?.detalle || '';
  document.getElementById('necesidadesAdicionales').value = data.necesidades || '';

  // Checkboxes impactos
  (data.reto?.impactos || []).forEach(imp => {
    const cb = document.querySelector(`input[name="impactos"][value="${imp}"]`);
    if (cb) cb.checked = true;
  });

  // Checkboxes recursos
  (data.recursos?.tipos || []).forEach(rec => {
    const cb = document.querySelector(`input[name="recursos"][value="${rec}"]`);
    if (cb) cb.checked = true;
  });

  // Dynamic rows - impacto
  if (data.impacto?.length) {
    document.getElementById('impactoRows').innerHTML = '';
    data.impacto.forEach((row, i) => {
      addImpactoRow();
      const rows = document.querySelectorAll('[name="impactoResult"]');
      rows[i].value = row.resultado;
      document.querySelectorAll('[name="impactoIndicador"]')[i].value = row.indicador;
      document.querySelectorAll('[name="impactoMeta"]')[i].value = row.meta;
    });
  }

  // Dynamic rows - riesgos
  if (data.riesgos?.length) {
    document.getElementById('riesgosRows').innerHTML = '';
    data.riesgos.forEach((row, i) => {
      addRiesgoRow();
      const rows = document.querySelectorAll('[name="riesgo"]');
      rows[i].value = row.riesgo;
      document.querySelectorAll('[name="mitigacion"]')[i].value = row.mitigacion;
    });
  }
}

// Dynamic Rows
function addImpactoRow() {
  const container = document.getElementById('impactoRows');
  const rowNum = container.children.length;

  const row = document.createElement('div');
  row.className = 'table-row';
  row.innerHTML = `
    <input type="text" name="impactoResult" data-row="${rowNum}" placeholder="Resultado">
    <input type="text" name="impactoIndicador" data-row="${rowNum}" placeholder="Indicador">
    <input type="text" name="impactoMeta" data-row="${rowNum}" placeholder="Meta">
    <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove(); autoSave()">✕</button>
  `;

  container.appendChild(row);
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', debounce(autoSave, 1000));
  });
}

function addRiesgoRow() {
  const container = document.getElementById('riesgosRows');
  const rowNum = container.children.length;

  const row = document.createElement('div');
  row.className = 'table-row';
  row.innerHTML = `
    <input type="text" name="riesgo" data-row="${rowNum}" placeholder="Riesgo">
    <input type="text" name="mitigacion" data-row="${rowNum}" placeholder="Acción de mitigación">
    <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove(); autoSave()">✕</button>
  `;

  container.appendChild(row);
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', debounce(autoSave, 1000));
  });
}

// Form Navigation
function showSection(n) {
  const sections = document.querySelectorAll('.form-section');

  if (n < 0) currentSection = 0;
  if (n >= sections.length) currentSection = sections.length - 1;
  currentSection = n;

  sections.forEach(s => s.classList.remove('visible'));
  sections[currentSection].classList.add('visible');

  // Update buttons
  document.getElementById('prevBtn').style.display = currentSection === 0 ? 'none' : 'block';
  document.getElementById('nextBtn').style.display = currentSection === sections.length - 1 ? 'none' : 'block';
  document.getElementById('submitBtn').classList.toggle('hidden', currentSection !== sections.length - 1);

  window.scrollTo(0, 0);
}

function nextSection() {
  if (validateSection(currentSection)) {
    showSection(currentSection + 1);
  } else {
    alert('Por favor completa todos los campos requeridos');
  }
}

function previousSection() {
  showSection(currentSection - 1);
}

function validateSection(n) {
  const section = document.querySelectorAll('.form-section')[n];
  const inputs = section.querySelectorAll('[required]');

  for (let input of inputs) {
    if (input.type === 'checkbox') continue; // Skip checkboxes
    if (!input.value?.trim()) return false;
  }

  return true;
}

function validateAll() {
  const sections = document.querySelectorAll('.form-section');
  for (let i = 0; i < sections.length; i++) {
    if (!validateSection(i)) return false;
  }
  return true;
}

function updateProgress() {
  const form = document.getElementById('questionnaireForm');
  const inputs = form.querySelectorAll('input:not([readonly]), textarea, select');
  const filled = Array.from(inputs).filter(inp => {
    if (inp.type === 'checkbox') return inp.checked;
    return inp.value?.trim();
  }).length;

  const progress = (filled / inputs.length) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
}

function updateSaveStatus(text) {
  document.getElementById('saveStatus').textContent = text;
}

// Form Submit
document.getElementById('questionnaireForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateAll()) {
    alert('Por favor completa todos los campos requeridos');
    return;
  }

  try {
    const res = await fetch(`/api/questionnaires/${questionnaireId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ submitted: true }),
    });

    if (!res.ok) throw new Error('Submit failed');

    alert('✅ ¡Cuestionario enviado correctamente!');
    window.location.href = '/';
  } catch (error) {
    console.error('Submit error:', error);
    alert('Error al enviar el cuestionario');
  }
});

// Utilities
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  init();
  showSection(0);
});
