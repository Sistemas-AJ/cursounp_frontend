import { apiService } from './services/apiService.js';

const tabs = document.querySelectorAll('.tabs__item');
const panels = document.querySelectorAll('.panel');
const sessionsList = document.getElementById('sessionsList');
const refreshButton = document.getElementById('refreshSessions');
const sessionsEmpty = document.getElementById('sessionsEmpty');
const sessionsError = document.getElementById('sessionsError');

function showPanel(targetId) {
  panels.forEach((panel) => {
    panel.classList.toggle('is-visible', panel.id === targetId);
  });

  tabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.target === targetId);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    showPanel(tab.dataset.target);
  });
});

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return date.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return 'Sin hora';
  if (/^\d{2}:\d{2}/.test(value)) {
    return value.substring(0, 5);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getScheduleLabel(session) {
  const segments = [];
  if (session.horario) {
    segments.push(`Horario: ${session.horario}`);
  }
  const start = session.hora_inicio || session.hora;
  const end = session.hora_fin;
  if (start && end) {
    segments.push(`${formatTime(start)} – ${formatTime(end)}`);
  }
  if (!end && start) {
    segments.push(formatTime(start));
  }
  if (segments.length === 0) {
    return 'Horario por definir';
  }
  return segments.join(' · ');
}

function createSessionCard(session) {
  const card = document.createElement('article');
  card.className = 'card session';
  card.role = 'listitem';

  const header = document.createElement('div');
  header.className = 'session__header';

  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'session__title';

  const title = document.createElement('h3');
  title.textContent = session.tema || 'Sesión sin título';

  const teacher = document.createElement('span');
  teacher.className = 'session__teacher';
  teacher.textContent = session.docente
    ? `Docente: ${session.docente}`
    : 'Docente por confirmar';

  titleWrapper.appendChild(title);
  titleWrapper.appendChild(teacher);
  header.appendChild(titleWrapper);

  const meta = document.createElement('div');
  meta.className = 'session__meta';
  meta.innerHTML = `
    <span>${formatDate(session.fecha)}</span>
    <span>${getScheduleLabel(session)}</span>
    <span>${session.lugar || 'Lugar por definir'}</span>
  `;

  const linkWrapper = document.createElement('p');
  if (session.link) {
    const anchor = document.createElement('a');
    anchor.href = session.link;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = 'Ir a la clase';
    linkWrapper.appendChild(anchor);
  } else {
    linkWrapper.textContent = 'Link no disponible';
  }

  card.appendChild(header);
  card.appendChild(meta);
  card.appendChild(linkWrapper);

  if (Array.isArray(session.materials) && session.materials.length > 0) {
    const materialsTitle = document.createElement('strong');
    materialsTitle.textContent = 'Materiales';
    const list = document.createElement('ul');
    list.className = 'session__materials';

    session.materials.forEach((material) => {
      const li = document.createElement('li');
      if (material.file_path) {
        const anchor = document.createElement('a');
        anchor.href = material.file_path;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = material.display_name || material.extension || 'Recurso';
        li.appendChild(anchor);
      } else {
        li.textContent = material.display_name || 'Recurso sin enlace';
      }
      list.appendChild(li);
    });

    card.appendChild(materialsTitle);
    card.appendChild(list);
  }

  return card;
}

async function loadSessions() {
  sessionsError.classList.add('is-hidden');
  sessionsEmpty.classList.add('is-hidden');
  sessionsList.innerHTML = '';
  refreshButton.disabled = true;
  refreshButton.textContent = 'Cargando...';

  try {
    const sessions = await apiService.getSessions();
    if (sessions.length === 0) {
      sessionsEmpty.classList.remove('is-hidden');
      return;
    }
    sessions.forEach((session) => {
      sessionsList.appendChild(createSessionCard(session));
    });
  } catch (err) {
    console.error(err);
    sessionsError.classList.remove('is-hidden');
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = 'Actualizar';
  }
}

refreshButton.addEventListener('click', loadSessions);

loadSessions();
