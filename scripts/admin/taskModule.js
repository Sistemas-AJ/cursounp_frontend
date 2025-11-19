import { apiService } from '../services/apiService.js';
import { adminState } from './state.js';
import { setMessage, toIsoTime, fromIsoTime, formatDateLabel } from './helpers.js';

const taskForm = document.getElementById('taskForm');
const taskFormMessage = document.getElementById('taskFormMessage');
const taskList = document.getElementById('taskList');
const taskListEmpty = document.getElementById('taskListEmpty');
const reloadTasksButton = document.getElementById('reloadTasks');
const taskFormReset = document.getElementById('taskFormReset');
const taskSessionSelect = document.getElementById('taskSession');
const taskIdInput = document.getElementById('taskId');

function getSessionLabel(sessionId) {
  const session = adminState.sessions.find(
    (item) => String(item.id) === String(sessionId),
  );
  if (!session) return 'Sesión no especificada';
  return `${session.fecha || 's/f'} · ${session.tema || 'Sin tema'}`;
}

function populateTaskSessionOptions() {
  if (!taskSessionSelect) return;
  const currentValue = taskSessionSelect.value;
  taskSessionSelect.innerHTML =
    '<option value="">Selecciona una sesión</option>';
  adminState.sessions.forEach((session) => {
    const option = document.createElement('option');
    option.value = session.id;
    option.textContent = `${session.fecha || 's/f'} · ${
      session.tema || 'Sin tema'
    }`;
    if (String(session.id) === String(currentValue)) {
      option.selected = true;
    }
    taskSessionSelect.appendChild(option);
  });
}

function resetTaskForm() {
  if (!taskForm) return;
  taskForm.reset();
  adminState.taskEditingId = null;
  if (taskIdInput) taskIdInput.value = '';
  setMessage(taskFormMessage, '', 'info');
}

function fillTaskForm(task) {
  if (!taskForm) return;
  adminState.taskEditingId = task.id;
  if (taskIdInput) taskIdInput.value = task.id;
  if (taskSessionSelect) taskSessionSelect.value = task.session_id || '';
  taskForm.titulo.value = task.titulo || '';
  taskForm.detalle.value = task.detalle || '';
  taskForm.fecha_limite.value = task.fecha_limite
    ? task.fecha_limite.substring(0, 10)
    : '';
  taskForm.hora_limite.value = fromIsoTime(task.hora_limite) || '';
  window.scrollTo({ top: taskForm.offsetTop - 80, behavior: 'smooth' });
  setMessage(taskFormMessage, 'Editando tarea seleccionada.', 'info');
}

function renderTaskList() {
  if (!taskList || !taskListEmpty) return;
  taskList.innerHTML = '';

  if (!adminState.tasks.length) {
    taskListEmpty.classList.remove('is-hidden');
    return;
  }

  taskListEmpty.classList.add('is-hidden');

  adminState.tasks.forEach((task) => {
    const card = document.createElement('article');
    card.className = 'card task';
    card.dataset.id = task.id;

    const sessionLabel = getSessionLabel(task.session_id);
    const deadlineLabel = task.fecha_limite
      ? formatDateLabel(task.fecha_limite)
      : 'Sin fecha límite';
    const timeLabel = task.hora_limite ? fromIsoTime(task.hora_limite) : '';

    card.innerHTML = `
      <div class="session__header">
        <div class="session__title">
          <h3>${task.titulo || 'Tarea sin título'}</h3>
          <span class="session__teacher">${sessionLabel}</span>
        </div>
        <div class="session__actions">
          <button class="button button--ghost" data-action="edit" data-id="${
            task.id
          }">Editar</button>
          <button class="button button--danger" data-action="delete" data-id="${
            task.id
          }">Eliminar</button>
        </div>
      </div>
      <p>${task.detalle || 'Sin instrucciones adicionales.'}</p>
      <div class="task__meta">
        <span>Fecha límite: ${deadlineLabel}</span>
        ${timeLabel ? `<span>Hora límite: ${timeLabel}</span>` : ''}
      </div>
    `;

    taskList.appendChild(card);
  });
}

async function loadTasks() {
  if (!taskFormMessage) return;
  setMessage(taskFormMessage, 'Cargando tareas...', 'info');
  try {
    const tasks = await apiService.getTasks();
    adminState.tasks = tasks;
    renderTaskList();
    setMessage(taskFormMessage, 'Tareas sincronizadas.', 'success');
  } catch (error) {
    console.error(error);
    setMessage(taskFormMessage, 'No se pudieron cargar las tareas.', 'error');
  }
}

function handleTaskSubmit(event) {
  event.preventDefault();
  if (!taskForm) return;
  const formData = new FormData(taskForm);
  const sessionId = formData.get('session_id');
  if (!sessionId) {
    setMessage(taskFormMessage, 'Selecciona una sesión.', 'error');
    return;
  }

  const payload = {
    session_id: Number(sessionId),
    titulo: formData.get('titulo'),
    detalle: formData.get('detalle') || null,
    fecha_limite: formData.get('fecha_limite'),
    hora_limite: toIsoTime(formData.get('hora_limite')),
  };

  const isEditing = Boolean(adminState.taskEditingId);
  const request = isEditing
    ? apiService.updateTask(adminState.taskEditingId, payload)
    : apiService.createTask(payload);

  request
    .then(() => {
      setMessage(
        taskFormMessage,
        isEditing ? 'Tarea actualizada.' : 'Tarea creada.',
        'success',
      );
      resetTaskForm();
      return loadTasks();
    })
    .catch((error) => {
      console.error(error);
      setMessage(taskFormMessage, 'No se pudo guardar la tarea.', 'error');
    });
}

function handleTaskListClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  const task = adminState.tasks.find((item) => String(item.id) === String(id));
  if (!task) return;

  if (action === 'edit') {
    fillTaskForm(task);
  } else if (action === 'delete') {
    const confirmed = window.confirm('¿Deseas eliminar esta tarea?');
    if (!confirmed) return;
    apiService
      .deleteTask(task.id)
      .then(() => {
        setMessage(taskFormMessage, 'Tarea eliminada.', 'success');
        return loadTasks();
      })
      .catch((error) => {
        console.error(error);
        setMessage(taskFormMessage, 'No se pudo eliminar la tarea.', 'error');
      });
  }
}

export function initTaskModule() {
  if (!taskForm) return;

  taskForm.addEventListener('submit', handleTaskSubmit);
  if (taskFormReset) {
    taskFormReset.addEventListener('click', resetTaskForm);
  }
  if (taskList) {
    taskList.addEventListener('click', handleTaskListClick);
  }
  if (reloadTasksButton) {
    reloadTasksButton.addEventListener('click', loadTasks);
  }
  document.addEventListener('admin:sessions-updated', () => {
    populateTaskSessionOptions();
    renderTaskList();
  });
  populateTaskSessionOptions();
  loadTasks();
}
