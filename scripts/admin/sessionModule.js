import { apiService } from '../services/apiService.js';
import { adminState } from './state.js';
import { setMessage, toIsoTime, fromIsoTime } from './helpers.js';

const sessionForm = document.getElementById('sessionForm');
const sessionFormMessage = document.getElementById('sessionFormMessage');
const sessionCards = document.getElementById('sessionCards');
const reloadSessionsButton = document.getElementById('reloadSessions');
const sessionFormReset = document.getElementById('sessionFormReset');

function resetSessionForm() {
  if (!sessionForm) return;
  sessionForm.reset();
  adminState.editingId = null;
  const hiddenId = document.getElementById('sessionId');
  if (hiddenId) hiddenId.value = '';
  setMessage(sessionFormMessage, '', 'info');
}

function fillSessionForm(session) {
  if (!sessionForm) return;
  adminState.editingId = session.id;
  const hiddenId = document.getElementById('sessionId');
  if (hiddenId) hiddenId.value = session.id;
  sessionForm.fecha.value = session.fecha || '';
  sessionForm.hora_inicio.value = fromIsoTime(session.hora_inicio) || '';
  sessionForm.hora_fin.value = fromIsoTime(session.hora_fin) || '';
  sessionForm.horario.value = session.horario || '';
  sessionForm.tema.value = session.tema || '';
  sessionForm.docente.value = session.docente || '';
  sessionForm.lugar.value = session.lugar || '';
  sessionForm.link.value = session.link || '';
  window.scrollTo({ top: sessionForm.offsetTop - 80, behavior: 'smooth' });
}

function renderSessionCards() {
  if (!sessionCards) return;
  sessionCards.innerHTML = '';
  if (!adminState.sessions.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Aún no hay sesiones registradas.';
    sessionCards.appendChild(empty);
    return;
  }

  adminState.sessions.forEach((session) => {
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
  if (sessionFormMessage) {
    setMessage(sessionFormMessage, 'Cargando sesiones...', 'info');
  }
  try {
    const sessions = await apiService.getSessions();
    adminState.sessions = sessions;
    renderSessionCards();
    document.dispatchEvent(
      new CustomEvent('admin:sessions-updated', { detail: sessions }),
    );
    if (sessionFormMessage) {
      setMessage(sessionFormMessage, 'Sesiones sincronizadas.', 'success');
    }
  } catch (error) {
    console.error(error);
    if (sessionFormMessage) {
      setMessage(
        sessionFormMessage,
        'No se pudieron cargar las sesiones.',
        'error',
      );
    }
  }
}

function handleSessionFormSubmit(event) {
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

  const isEditing = Boolean(adminState.editingId);

  const request = isEditing
    ? apiService.updateSession(adminState.editingId, payload)
    : apiService.createSession(payload);

  request
    .then(() => {
      setMessage(
        sessionFormMessage,
        isEditing ? 'Sesión actualizada.' : 'Sesión creada.',
        'success',
      );
      return loadSessions();
    })
    .then(resetSessionForm)
    .catch((error) => {
      console.error(error);
      setMessage(sessionFormMessage, 'Error al guardar la sesión.', 'error');
    });
}

function handleCardActions(event) {
  const target = event.target.closest('button[data-action]');
  if (!target) return;
  const { action, id } = target.dataset;
  const session = adminState.sessions.find(
    (item) => String(item.id) === String(id),
  );
  if (!session) return;

  if (action === 'edit') {
    fillSessionForm(session);
  } else if (action === 'delete') {
    const confirmed = window.confirm('¿Deseas eliminar esta sesión?');
    if (!confirmed) return;
    apiService
      .deleteSession(session.id)
      .then(() => {
        setMessage(sessionFormMessage, 'Sesión eliminada.', 'success');
        return loadSessions();
      })
      .catch((error) => {
        console.error(error);
        setMessage(sessionFormMessage, 'No se pudo eliminar.', 'error');
      });
  }
}

export function initSessionModule() {
  if (!sessionForm) return { reload: () => {} };

  sessionForm.addEventListener('submit', handleSessionFormSubmit);
  if (sessionFormReset) {
    sessionFormReset.addEventListener('click', resetSessionForm);
  }
  if (reloadSessionsButton) {
    reloadSessionsButton.addEventListener('click', loadSessions);
  }
  if (sessionCards) {
    sessionCards.addEventListener('click', handleCardActions);
  }

  loadSessions();

  return { reload: loadSessions };
}
