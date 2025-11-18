import { apiService } from './services/apiService.js';

const tabs = document.querySelectorAll('[data-config-tab]');
const panels = document.querySelectorAll('.config-panel');

const sessionForm = document.getElementById('sessionForm');
const sessionFormMessage = document.getElementById('sessionFormMessage');
const sessionCards = document.getElementById('sessionCards');
const reloadSessionsButton = document.getElementById('reloadSessions');
const sessionFormReset = document.getElementById('sessionFormReset');

const materialForm = document.getElementById('materialForm');
const materialMessage = document.getElementById('materialMessage');
const materialSessionSelect = document.getElementById('materialSession');

const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const logoutButton = document.getElementById('logoutButton');
const tokenStatus = document.getElementById('tokenStatus');

const state = {
  sessions: [],
  editingId: null,
  token: null,
};

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchPanel(tab.dataset.configTab));
});

function switchPanel(targetId) {
  panels.forEach((panel) => {
    panel.classList.toggle('is-visible', panel.id === targetId);
  });

  tabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.configTab === targetId);
  });
}

function setMessage(element, message, status = 'info') {
  if (!element) return;
  element.textContent = message;
  element.dataset.status = status;
  element.hidden = !message;
}

function toIsoTime(value) {
  if (!value) return null;
  return `${value}:00Z`;
}

function fromIsoTime(value) {
  if (!value) return '';
  if (value.includes('T')) {
    return value.substring(11, 16);
  }
  return value.substring(0, 5);
}

function resetSessionForm() {
  sessionForm.reset();
  state.editingId = null;
  document.getElementById('sessionId').value = '';
  setMessage(sessionFormMessage, '', 'info');
}

function fillSessionForm(session) {
  state.editingId = session.id;
  document.getElementById('sessionId').value = session.id;
  sessionForm.fecha.value = session.fecha || '';
  sessionForm.hora_inicio.value = fromIsoTime(session.hora_inicio);
  sessionForm.hora_fin.value = fromIsoTime(session.hora_fin);
  sessionForm.horario.value = session.horario || '';
  sessionForm.tema.value = session.tema || '';
  sessionForm.docente.value = session.docente || '';
  sessionForm.lugar.value = session.lugar || '';
  sessionForm.link.value = session.link || '';
  window.scrollTo({ top: sessionForm.offsetTop - 80, behavior: 'smooth' });
}

function populateMaterialSelect() {
  if (!materialSessionSelect) return;
  const selected = materialSessionSelect.value;
  materialSessionSelect.innerHTML =
    '<option value="">Selecciona una sesión</option>';
  state.sessions.forEach((session) => {
    const option = document.createElement('option');
    option.value = session.id;
    option.textContent = `${session.fecha || 's/f'} · ${
      session.tema || 'Sin tema'
    }`;
    if (String(session.id) === selected) {
      option.selected = true;
    }
    materialSessionSelect.appendChild(option);
  });
}

function renderSessionCards() {
  sessionCards.innerHTML = '';
  if (state.sessions.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Aún no hay sesiones registradas.';
    sessionCards.appendChild(empty);
    return;
  }

  state.sessions.forEach((session) => {
    const card = document.createElement('article');
    card.className = 'card session';
    card.dataset.id = session.id;

    const horarioLabel = session.horario
      ? `Horario: ${session.horario}`
      : 'Horario no definido';
    const startTimeLabel = session.hora_inicio
      ? fromIsoTime(session.hora_inicio)
      : session.hora
      ? fromIsoTime(session.hora)
      : '';
    const endTimeLabel = session.hora_fin ? fromIsoTime(session.hora_fin) : '';
    const timeRangeLabel = startTimeLabel
      ? endTimeLabel
        ? `${startTimeLabel} – ${endTimeLabel}`
        : startTimeLabel
      : '';
    const lugarLabel = session.lugar ? `Lugar: ${session.lugar}` : '';

    card.innerHTML = `
      <div class="session__header">
        <div class="session__title">
          <h3>${session.tema || 'Sesión sin título'}</h3>
          <span class="session__teacher">${
            session.docente ? `Docente: ${session.docente}` : 'Docente por definir'
          }</span>
        </div>
        <div class="session__actions">
          <button class="button button--ghost" data-action="edit" data-id="${
            session.id
          }">Editar</button>
          <button class="button button--danger" data-action="delete" data-id="${
            session.id
          }">Eliminar</button>
        </div>
      </div>
      <div class="session__meta">
        <span>${session.fecha || 'Sin fecha'}</span>
        <span>${horarioLabel}</span>
        ${timeRangeLabel ? `<span>${timeRangeLabel}</span>` : ''}
        ${lugarLabel ? `<span>${lugarLabel}</span>` : ''}
      </div>
      <p>${
        session.link
          ? `<a href="${session.link}" target="_blank" rel="noopener noreferrer">Ir a la clase</a>`
          : 'Link no disponible'
      }</p>
    `;

    sessionCards.appendChild(card);
  });
}

async function loadSessions() {
  setMessage(sessionFormMessage, 'Cargando sesiones...', 'info');
  try {
    const sessions = await apiService.getSessions();
    state.sessions = sessions;
    renderSessionCards();
    populateMaterialSelect();
    setMessage(sessionFormMessage, 'Sesiones sincronizadas.', 'success');
  } catch (error) {
    console.error(error);
    setMessage(
      sessionFormMessage,
      'No se pudieron cargar las sesiones.',
      'error',
    );
  }
}

sessionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(sessionForm);
  const payload = {
    fecha: formData.get('fecha'),
    hora_inicio: toIsoTime(formData.get('hora_inicio')),
    hora_fin: toIsoTime(formData.get('hora_fin')),
    horario: formData.get('horario') || null,
    link: formData.get('link') || null,
    lugar: formData.get('lugar') || null,
    tema: formData.get('tema'),
    docente: formData.get('docente') || null,
  };

  const isEditing = Boolean(state.editingId);

  try {
    if (isEditing) {
      await apiService.updateSession(state.editingId, payload);
      setMessage(sessionFormMessage, 'Sesión actualizada.', 'success');
    } else {
      await apiService.createSession(payload);
      setMessage(sessionFormMessage, 'Sesión creada.', 'success');
    }
    await loadSessions();
    resetSessionForm();
  } catch (error) {
    console.error(error);
    setMessage(sessionFormMessage, 'Error al guardar la sesión.', 'error');
  }
});

sessionFormReset.addEventListener('click', resetSessionForm);

reloadSessionsButton.addEventListener('click', loadSessions);

sessionCards.addEventListener('click', async (event) => {
  const target = event.target.closest('button[data-action]');
  if (!target) return;
  const { action, id } = target.dataset;
  const session = state.sessions.find(
    (item) => String(item.id) === String(id),
  );
  if (!session) return;

  if (action === 'edit') {
    fillSessionForm(session);
  } else if (action === 'delete') {
    const confirmed = window.confirm('¿Deseas eliminar esta sesión?');
    if (!confirmed) return;
    try {
      await apiService.deleteSession(session.id);
      setMessage(sessionFormMessage, 'Sesión eliminada.', 'success');
      await loadSessions();
    } catch (error) {
      console.error(error);
      setMessage(sessionFormMessage, 'No se pudo eliminar.', 'error');
    }
  }
});

materialForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(materialForm);
  const sessionId = formData.get('session_id');
  if (!sessionId) {
    setMessage(materialMessage, 'Selecciona una sesión.', 'error');
    return;
  }
  const payload = {
    display_name: formData.get('display_name'),
    extension: formData.get('extension') || null,
    file_path: formData.get('file_path'),
  };

  try {
    await apiService.uploadMaterial(sessionId, payload);
    setMessage(materialMessage, 'Material guardado correctamente.', 'success');
    materialForm.reset();
  } catch (error) {
    console.error(error);
    setMessage(materialMessage, 'Error al guardar el material.', 'error');
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const payload = Object.fromEntries(formData.entries());
  try {
    await apiService.registerUser(payload);
    setMessage(registerMessage, 'Usuario registrado.', 'success');
    registerForm.reset();
  } catch (error) {
    console.error(error);
    setMessage(registerMessage, 'No se pudo registrar.', 'error');
  }
});

function updateTokenStatus(token) {
  if (token) {
    tokenStatus.textContent = 'Sesión administrativa activa.';
    tokenStatus.dataset.status = 'success';
  } else {
    tokenStatus.textContent = 'No hay sesión activa.';
    tokenStatus.dataset.status = 'info';
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());
  try {
    const data = await apiService.login(payload);
    state.token = data.access_token;
    apiService.setAuthToken(data.access_token);
    localStorage.setItem('curso_unp_token', data.access_token);
    updateTokenStatus(data.access_token);
    setMessage(loginMessage, 'Token generado correctamente.', 'success');
    loginForm.reset();
  } catch (error) {
    console.error(error);
    setMessage(loginMessage, 'Credenciales inválidas.', 'error');
  }
});

logoutButton.addEventListener('click', () => {
  state.token = null;
  apiService.setAuthToken(null);
  localStorage.removeItem('curso_unp_token');
  updateTokenStatus(null);
  setMessage(loginMessage, 'Sesión cerrada.', 'info');
});

function restoreToken() {
  const savedToken = localStorage.getItem('curso_unp_token');
  if (savedToken) {
    state.token = savedToken;
    apiService.setAuthToken(savedToken);
    updateTokenStatus(savedToken);
  }
}

restoreToken();
loadSessions();
