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

  // Load questionnaire data
  try {
    const res = await fetch(`/api/questionnaires/${qId}`);
    if (!res.ok) throw new Error('Not found');

    const q = await res.json();

    // Set team name from DB
    if (q.team_name) {
      document.getElementById('teamName').textContent = q.team_name;
      document.getElementById('teamNameInput').value = q.team_name;
    } else if (q.responses?.nombre_equipo) {
      document.getElementById('teamName').textContent = q.responses.nombre_equipo;
      document.getElementById('teamNameInput').value = q.responses.nombre_equipo;
    }

    // Show company logo if available
    if (q.company_logo) {
      const logoEl = document.getElementById('companyLogo');
      if (logoEl) {
        logoEl.src = q.company_logo;
        logoEl.style.display = 'inline-block';
      }
    }

    // If already submitted, show results directly
    if (q.status === 'submitted') {
      const resp = typeof q.responses === 'string' ? JSON.parse(q.responses) : q.responses;
      if (q.team_name) resp.nombre_equipo = q.team_name;
      showResults(resp);
      return;
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
      headers: { 'Content-Type': 'application/json' },
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
    // Save final responses first
    const state = collectFormData();
    await fetch(`/api/questionnaires/${questionnaireId}/responses`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });

    const res = await fetch(`/api/questionnaires/${questionnaireId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submitted: true }),
    });

    if (!res.ok) throw new Error('Submit failed');

    showResults(state);
  } catch (error) {
    console.error('Submit error:', error);
    alert('Error al enviar el cuestionario');
  }
});

// Results View
function showResults(r) {
  const esc = (t) => { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; };

  const section = (icon, title, content) => content.trim() ? `
    <div style="margin-bottom:28px;">
      <h3 style="color:#7B3FA8; margin-bottom:10px; font-size:17px; font-weight:700;">${icon} ${title}</h3>
      <div style="background:#faf8fc; padding:20px 24px; border-radius:10px; border-left:4px solid #7B3FA8; line-height:1.7;">${content}</div>
    </div>` : '';

  const field = (label, value) => value ? `<div style="margin-bottom:12px;"><strong style="color:#374151; display:block; margin-bottom:3px; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">${label}</strong><span style="color:#1f2937; font-size:15px;">${esc(value)}</span></div>` : '';

  const chips = (items) => (items || []).map(i => `<span style="display:inline-block; background:#E9A020; color:white; padding:5px 14px; border-radius:16px; font-size:13px; font-weight:500; margin:3px 6px 3px 0;">${esc(i)}</span>`).join('');

  const impactoRows = (r.impacto || []).filter(i => i.resultado).map(i => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:10px;">${esc(i.resultado)}</td>
      <td style="padding:10px;">${esc(i.indicador)}</td>
      <td style="padding:10px;">${esc(i.meta)}</td>
    </tr>`).join('');

  const riesgoRows = (r.riesgos || []).filter(i => i.riesgo).map(i => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:10px;">${esc(i.riesgo)}</td>
      <td style="padding:10px;">${esc(i.mitigacion)}</td>
    </tr>`).join('');

  document.querySelector('.questionnaire-form').innerHTML = `
    <div style="max-width:760px; margin:0 auto; padding:40px 24px;">
      <div style="text-align:center; margin-bottom:40px;">
        <div style="font-size:56px; margin-bottom:16px;">✅</div>
        <h2 style="color:#3A1259; font-size:28px; font-weight:700; margin-bottom:8px;">¡Cuestionario Enviado!</h2>
        <p style="color:#6b7280; font-size:16px;">Resumen de las respuestas del equipo</p>
      </div>

      <div style="background:white; border-radius:16px; padding:32px 36px; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="margin-bottom:28px; padding-bottom:20px; border-bottom:2px solid #f3f4f6;">
          <h2 style="color:#3A1259; font-size:24px; font-weight:700; margin-bottom:6px;">${esc(r.nombre_equipo)}</h2>
          <p style="color:#6b7280; font-size:15px;">${esc(r.nombre_iniciativa)} &nbsp;·&nbsp; ${esc(r.lider_equipo)} &nbsp;·&nbsp; ${r.fecha || ''}</p>
        </div>

        ${section('🎯', 'Reto de Negocio',
          field('Problema / Oportunidad', r.reto?.problema) +
          field('Evidencias', r.reto?.evidencias) +
          (r.reto?.impactos?.length ? `<div style="margin-bottom:12px;"><strong style="color:#374151; display:block; margin-bottom:6px; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Impactos</strong>${chips(r.reto.impactos)}</div>` : '') +
          field('Descripción', r.reto?.descripcion)
        )}

        ${section('💡', 'Solución',
          field('Propuesta', r.solucion?.propuesta) +
          field('Diferenciadores', r.solucion?.diferenciadores)
        )}

        ${impactoRows ? section('📊', 'Impacto Esperado', `
          <table style="width:100%; font-size:13px; border-collapse:collapse;">
            <thead><tr style="background:#f3f4f6;">
              <th style="padding:10px; text-align:left;">Resultado</th>
              <th style="padding:10px; text-align:left;">Indicador</th>
              <th style="padding:10px; text-align:left;">Meta</th>
            </tr></thead>
            <tbody>${impactoRows}</tbody>
          </table>`) : ''}

        ${section('🛠️', 'Recursos',
          (r.recursos?.tipos?.length ? `<div style="margin-bottom:12px;">${chips(r.recursos.tipos)}</div>` : '') +
          field('Detalle', r.recursos?.detalle)
        )}

        ${riesgoRows ? section('⚠️', 'Riesgos', `
          <table style="width:100%; font-size:13px; border-collapse:collapse;">
            <thead><tr style="background:#f3f4f6;">
              <th style="padding:10px; text-align:left;">Riesgo</th>
              <th style="padding:10px; text-align:left;">Mitigación</th>
            </tr></thead>
            <tbody>${riesgoRows}</tbody>
          </table>`) : ''}

        ${r.necesidades ? section('📌', 'Necesidades Adicionales', field('', r.necesidades)) : ''}
      </div>

      <div style="text-align:center; margin-top:32px;">
        <button onclick="downloadPDF()" style="background:#7B3FA8; color:white; border:none; padding:14px 36px; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer; box-shadow:0 4px 12px rgba(123,63,168,0.3); transition:all 0.2s;" onmouseover="this.style.background='#3A1259'" onmouseout="this.style.background='#7B3FA8'">
          📄 Descargar PDF
        </button>
      </div>
    </div>
  `;

  // Hide navigation and instructions
  const nav = document.querySelector('.form-navigation');
  if (nav) nav.style.display = 'none';
  const instructions = document.querySelector('.questionnaire-instructions');
  if (instructions) instructions.style.display = 'none';
  const progress = document.getElementById('progressFill');
  if (progress) progress.style.width = '100%';
  window.scrollTo(0, 0);
}

// PDF Download
function downloadPDF() {
  const link = document.createElement('a');
  link.href = `/api/questionnaires/${questionnaireId}/pdf`;
  link.download = '';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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
