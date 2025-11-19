import { apiService } from './services/apiService.js';

const tabs = document.querySelectorAll('.tabs__item');
const panels = document.querySelectorAll('.panel');
const sessionsList = document.getElementById('sessionsList');
const refreshButton = document.getElementById('refreshSessions');
const sessionsEmpty = document.getElementById('sessionsEmpty');
const sessionsError = document.getElementById('sessionsError');
const materialSessionsList = document.getElementById('materialSessionsList');
const materialDetail = document.getElementById('materialDetail');
const materialMessage = document.getElementById('materialMessage');
const materialEmpty = document.getElementById('materialEmpty');
const materialReload = document.getElementById('materialReload');
const tasksList = document.getElementById('tasksList');
const tasksEmpty = document.getElementById('tasksEmpty');
const tasksError = document.getElementById('tasksError');
const tasksReload = document.getElementById('tasksReload');
let currentMaterialAnchor = null;
const materialDetailHome =
  materialDetail && materialDetail.parentElement
    ? document.createElement('div')
    : null;
if (materialDetailHome) {
  materialDetailHome.id = 'materialDetailHome';
  materialDetail.parentElement.insertBefore(materialDetailHome, materialDetail);
}
const sessionMaterialsCache = new Map();
const materialDownloadCache = new Map();

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

function parseDateValue(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(value) {
  const date = parseDateValue(value);
  if (!date) return 'Sin fecha';
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

function getSessionOrderValue(session = {}) {
  const candidates = [session.orden, session.order, session.id];
  for (const candidate of candidates) {
    if (candidate || candidate === 0) {
      const number = Number(candidate);
      if (!Number.isNaN(number)) return number;
    }
  }
  const date = parseDateValue(session.fecha);
  if (date) return date.getTime();
  return 0;
}

function sortSessionsAscending(sessions = []) {
  return [...sessions].sort(
    (a, b) => getSessionOrderValue(a) - getSessionOrderValue(b),
  );
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

function formatFileSize(size) {
  if (!size && size !== 0) return 'Sin tamaño';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function setMaterialMessage(message, status = 'info') {
  if (!materialMessage) return;
  materialMessage.textContent = message;
  materialMessage.dataset.status = status;
  materialMessage.hidden = !message;
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

function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = 'card task';
  card.role = 'listitem';

  const title = document.createElement('h3');
  title.textContent = task.titulo || 'Tarea sin título';

  const detail = document.createElement('p');
  detail.textContent = task.detalle || 'Sin instrucciones adicionales.';

  const meta = document.createElement('div');
  meta.className = 'task__meta';
  meta.innerHTML = `
    <span>Sesión: ${task.session_id ?? 'N/A'}</span>
    <span>Fecha límite de presentación: ${formatDate(task.fecha_limite)}</span>
    <span>Hora límite: ${formatTime(task.hora_limite)}</span>
  `;

  const contact = document.createElement('p');
  contact.className = 'task__contact';
  contact.textContent = 'Puedes enviar tu respuesta al ';
  const link = document.createElement('a');
  link.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=ajurador@unp.edu.pe';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Correo Dr. Adolfo Jurado';
  contact.appendChild(link);
  contact.append('.');

  card.appendChild(title);
  card.appendChild(detail);
  card.appendChild(meta);
  card.appendChild(contact);

  return card;
}

function renderMaterialSessionList(sessions) {
  if (!materialSessionsList) return;
  if (materialDetail && materialSessionsList.contains(materialDetail)) {
    positionMaterialDetail(null);
  }
  materialSessionsList.innerHTML = '';

  if (!sessions.length) {
    if (materialEmpty) materialEmpty.classList.remove('is-hidden');
    hideMaterialDetail();
    return;
  }

  if (materialEmpty) materialEmpty.classList.add('is-hidden');

  sessions.forEach((session) => {
    const item = document.createElement('div');
    item.className = 'material-session';
    item.role = 'listitem';

    const info = document.createElement('div');
    info.className = 'material-session__info';
    const title = document.createElement('strong');
    title.textContent = session.tema || 'Sesión sin título';
    const meta = document.createElement('span');
    meta.textContent = `${formatDate(session.fecha)} · ${getScheduleLabel(
      session,
    )}`;

    info.appendChild(title);
    info.appendChild(meta);

    const action = document.createElement('button');
    action.className = 'button';
    action.textContent = 'Ver material';
    action.dataset.sessionId = session.id;

    item.appendChild(info);
    item.appendChild(action);
    materialSessionsList.appendChild(item);
  });

  const validIds = new Set(sessions.map((session) => String(session.id)));
  sessionMaterialsCache.forEach((_, sessionId) => {
    if (!validIds.has(String(sessionId))) {
      sessionMaterialsCache.delete(sessionId);
    }
  });
}

function hideMaterialDetail() {
  if (!materialDetail) return;
  materialDetail.classList.add('is-hidden');
  materialDetail.innerHTML = '';
  positionMaterialDetail(null);
}

function renderMaterialDetail(data) {
  if (!materialDetail) return;
  const session = data.session || {};
  const materials = Array.isArray(data.materiales) ? data.materiales : [];

  materialDetail.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'material-detail__header';

  const headerInfo = document.createElement('div');
  const title = document.createElement('h2');
  title.textContent = session.tema || 'Sesión sin título';
  const detailMeta = document.createElement('p');
  detailMeta.className = 'material-detail__meta';
  detailMeta.textContent = `${formatDate(session.fecha)} · ${getScheduleLabel(
    session,
  )}`;

  headerInfo.appendChild(title);
  headerInfo.appendChild(detailMeta);

  const closeButton = document.createElement('button');
  closeButton.className = 'button button--ghost';
  closeButton.textContent = 'Cerrar';
  closeButton.dataset.action = 'close-detail';

  header.appendChild(headerInfo);
  header.appendChild(closeButton);

  const list = document.createElement('div');
  list.className = 'material-items';

  if (!materials.length) {
    const empty = document.createElement('p');
    empty.className = 'material-badge';
    empty.textContent = 'No hay materiales disponibles aún.';
    list.appendChild(empty);
  } else {
    materials.forEach((material) => {
      const item = document.createElement('div');
      item.className = 'material-item';

      const meta = document.createElement('div');
      meta.className = 'material-item__meta';
      const name = document.createElement('strong');
      name.textContent = material.display_name || `Material ${material.id}`;
      const extra = document.createElement('span');
      extra.className = 'material-badge';

      const typePill = document.createElement('span');
      typePill.className = 'material-pill';
      typePill.textContent = (material.extension || 'file').toUpperCase();

      const sizeLabel = document.createElement('span');
      sizeLabel.textContent = material.file_size
        ? formatFileSize(material.file_size)
        : material.content_type || '';

      extra.appendChild(typePill);
      if (sizeLabel.textContent) {
        extra.appendChild(sizeLabel);
      }

      meta.appendChild(name);
      meta.appendChild(extra);

      const actions = document.createElement('div');
      actions.className = 'material-item__actions';
      const downloadButton = document.createElement('button');
      downloadButton.className = 'button button--ghost';
      downloadButton.textContent = 'Descargar';
      downloadButton.dataset.materialId = material.id;
      downloadButton.dataset.materialName =
        material.display_name || `material-${material.id}`;

      actions.appendChild(downloadButton);

      item.appendChild(meta);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  materialDetail.appendChild(header);
  materialDetail.appendChild(list);
  materialDetail.classList.remove('is-hidden');
}

function positionMaterialDetail(anchorElement) {
  if (!materialDetail) return;
  if (anchorElement) {
    anchorElement.after(materialDetail);
    currentMaterialAnchor = anchorElement;
  } else if (materialDetailHome && materialDetailHome.parentElement) {
    materialDetailHome.after(materialDetail);
    currentMaterialAnchor = null;
  }
}

async function showSessionMaterials(sessionId, anchorElement) {
  if (!sessionId) return;
  setMaterialMessage('Cargando materiales...', 'info');
  let cache = sessionMaterialsCache.get(sessionId);
  if (!cache) {
    try {
      cache = await apiService.getSessionMaterials(sessionId);
      sessionMaterialsCache.set(sessionId, cache);
    } catch (error) {
      console.error(error);
      setMaterialMessage('No se pudo obtener el material.', 'error');
      return;
    }
  }
  positionMaterialDetail(anchorElement);
  renderMaterialDetail(cache);
  setMaterialMessage('Recuerda que puedes descargar el material del curso', 'success');
}

async function downloadMaterialFile(materialId, fileName) {
  if (!materialId) return;
  setMaterialMessage('Preparando descarga...', 'info');
  let cache = materialDownloadCache.get(materialId);
  if (!cache) {
    try {
      const blob = await apiService.downloadMaterial(materialId);
      const url = URL.createObjectURL(blob);
      cache = { url, fileName };
      materialDownloadCache.set(materialId, cache);
    } catch (error) {
      console.error(error);
      setMaterialMessage('No se pudo descargar el archivo.', 'error');
      return;
    }
  } else if (!cache.fileName && fileName) {
    cache.fileName = fileName;
  }

  triggerDownload(cache.url, cache.fileName || fileName || 'material');
  setMaterialMessage('Descarga lista.', 'success');
}

function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'material';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function loadSessions() {
  sessionsError.classList.add('is-hidden');
  sessionsEmpty.classList.add('is-hidden');
  sessionsList.innerHTML = '';
  refreshButton.disabled = true;
  refreshButton.textContent = 'Cargando...';

  try {
    const sessions = await apiService.getSessions();
    const orderedSessions = sortSessionsAscending(sessions);
    renderMaterialSessionList(orderedSessions);
    if (orderedSessions.length === 0) {
      sessionsEmpty.classList.remove('is-hidden');
      return;
    }
    orderedSessions.forEach((session) => {
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

async function loadTasks() {
  if (!tasksList) return;
  tasksError?.classList.add('is-hidden');
  tasksEmpty?.classList.add('is-hidden');
  tasksList.innerHTML = '';
  if (tasksReload) {
    tasksReload.disabled = true;
    tasksReload.textContent = 'Cargando...';
  }

  try {
    const tasks = await apiService.getTasks();
    if (!tasks.length) {
      tasksEmpty?.classList.remove('is-hidden');
      return;
    }
    tasks.forEach((task) => {
      tasksList.appendChild(createTaskCard(task));
    });
  } catch (error) {
    console.error(error);
    tasksError?.classList.remove('is-hidden');
  } finally {
    if (tasksReload) {
      tasksReload.disabled = false;
      tasksReload.textContent = 'Actualizar tareas';
    }
  }
}

refreshButton.addEventListener('click', loadSessions);
if (materialReload) {
  materialReload.addEventListener('click', loadSessions);
}
if (tasksReload) {
  tasksReload.addEventListener('click', loadTasks);
}

if (materialSessionsList) {
  materialSessionsList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-session-id]');
    if (!button) return;
    const sessionItem = button.closest('.material-session');
    showSessionMaterials(button.dataset.sessionId, sessionItem);
  });
}

if (materialDetail) {
  materialDetail.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-action="close-detail"]');
    if (closeButton) {
      hideMaterialDetail();
      return;
    }
    const downloadButton = event.target.closest('button[data-material-id]');
    if (downloadButton) {
      downloadMaterialFile(
        downloadButton.dataset.materialId,
        downloadButton.dataset.materialName,
      );
    }
  });
}

loadSessions();
loadTasks();
