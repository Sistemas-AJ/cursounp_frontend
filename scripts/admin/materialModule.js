import { apiService } from '../services/apiService.js';
import { adminState } from './state.js';
import {
  setMessage,
  formatDateLabel,
  formatFileSize,
} from './helpers.js';

const materialForm = document.getElementById('materialForm');
const materialMessage = document.getElementById('materialMessage');
const materialSessionSelect = document.getElementById('materialSession');
const materialList = document.getElementById('materialList');
const materialListEmpty = document.getElementById('materialListEmpty');
const materialFormReset = document.getElementById('materialFormReset');
const materialIdInput = document.getElementById('materialId');
const materialFileInput = document.getElementById('materialFile');

function populateMaterialSelect() {
  if (!materialSessionSelect) return;
  const selected =
    adminState.currentMaterialSession || materialSessionSelect.value;
  materialSessionSelect.innerHTML =
    '<option value="">Selecciona una sesión</option>';

  const validIds = new Set();

  adminState.sessions.forEach((session) => {
    const option = document.createElement('option');
    option.value = session.id;
    option.textContent = `${session.fecha || 's/f'} · ${
      session.tema || 'Sin tema'
    }`;
    validIds.add(String(session.id));
    if (String(session.id) === String(selected)) {
      option.selected = true;
    }
    materialSessionSelect.appendChild(option);
  });

  const hasSelected = Array.from(materialSessionSelect.options).some(
    (option) => option.selected && option.value,
  );
  if (!hasSelected) {
    adminState.currentMaterialSession = '';
    renderMaterialList();
  }

  adminState.materialsCache.forEach((_, key) => {
    if (!validIds.has(String(key))) {
      adminState.materialsCache.delete(key);
    }
  });

  if (adminState.currentMaterialSession) {
    renderMaterialList(adminState.currentMaterialSession);
  }
}

function resetMaterialForm({ preserveSession = false } = {}) {
  if (!materialForm) return;
  const currentSession = materialSessionSelect?.value || '';
  materialForm.reset();
  adminState.materialEditingId = null;
  if (materialIdInput) materialIdInput.value = '';
  if (preserveSession && materialSessionSelect) {
    materialSessionSelect.value = currentSession;
  }
  setMessage(materialMessage, '', 'info');
}

function renderMaterialList(sessionId = adminState.currentMaterialSession) {
  if (!materialList || !materialListEmpty) return;
  materialList.innerHTML = '';

  if (!sessionId) {
    materialListEmpty.classList.remove('is-hidden');
    materialListEmpty.querySelector('p').textContent =
      'Selecciona una sesión para ver sus materiales.';
    return;
  }

  const cache = adminState.materialsCache.get(sessionId);
  const materials = cache?.materials || [];

  if (materials.length === 0) {
    materialListEmpty.classList.remove('is-hidden');
    materialListEmpty.querySelector('p').textContent =
      'Esta sesión no tiene materiales asociados todavía.';
    return;
  }

  materialListEmpty.classList.add('is-hidden');

  materials.forEach((material) => {
    const item = document.createElement('article');
    item.className = 'material-item';
    item.dataset.sessionId = sessionId;
    item.dataset.materialId = material.id;

    item.innerHTML = `
      <div class="material-item__meta">
        <strong>${material.display_name || `Material ${material.id}`}</strong>
        <span class="material-badge">
          <span class="material-pill">${(material.extension || 'file').toUpperCase()}</span>
          ${formatFileSize(material.file_size) || material.content_type || ''}
          ${
            material.created_at
              ? `· ${formatDateLabel(material.created_at)}`
              : ''
          }
        </span>
      </div>
      <div class="material-item__actions">
        <button class="button button--ghost" data-action="edit" data-id="${
          material.id
        }">Editar</button>
        <button class="button button--danger" data-action="delete" data-id="${
          material.id
        }">Eliminar</button>
      </div>
    `;

    materialList.appendChild(item);
  });
}

async function loadMaterials(sessionId, { force = false } = {}) {
  if (!sessionId) return;
  setMessage(materialMessage, 'Cargando materiales...', 'info');
  try {
    if (!adminState.materialsCache.has(sessionId) || force) {
      const response = await apiService.getSessionMaterials(sessionId);
      adminState.materialsCache.set(sessionId, {
        session: response.session,
        materials: Array.isArray(response.materiales)
          ? response.materiales
          : [],
      });
    }
    renderMaterialList(sessionId);
    setMessage(materialMessage, 'Materiales sincronizados.', 'success');
  } catch (error) {
    console.error(error);
    setMessage(materialMessage, 'No se pudo cargar el material.', 'error');
  }
}

function handleSessionChange(event) {
  const sessionId = event.target.value;
  adminState.currentMaterialSession = sessionId;
  resetMaterialForm({ preserveSession: true });
  if (sessionId) {
    loadMaterials(sessionId, { force: true });
  } else {
    renderMaterialList('');
  }
}

function handleMaterialSubmit(event) {
  event.preventDefault();
  if (!materialForm) return;
  const sessionId = materialSessionSelect.value;
  const displayName = materialForm.display_name?.value || '';
  const file = materialFileInput?.files?.[0];

  if (!sessionId) {
    setMessage(materialMessage, 'Selecciona una sesión.', 'error');
    return;
  }

  if (!file) {
    setMessage(materialMessage, 'Selecciona un archivo.', 'error');
    return;
  }

  const isEditing = Boolean(adminState.materialEditingId);
  const request = isEditing
    ? apiService.updateMaterial({
        materialId: adminState.materialEditingId,
        sessionId,
        displayName,
        file,
      })
    : apiService.createMaterial({
        sessionId,
        displayName,
        file,
      });

  request
    .then(() => {
      setMessage(
        materialMessage,
        isEditing ? 'Material actualizado.' : 'Material cargado.',
        'success',
      );
      resetMaterialForm();
      return loadMaterials(sessionId, { force: true });
    })
    .catch((error) => {
      console.error(error);
      setMessage(materialMessage, 'No se pudo guardar el material.', 'error');
    });
}

function fillMaterialForm(sessionId, material) {
  if (!materialForm) return;
  adminState.materialEditingId = material.id;
  adminState.currentMaterialSession = sessionId;
  materialSessionSelect.value = sessionId;
  materialForm.display_name.value = material.display_name || '';
  if (materialIdInput) materialIdInput.value = material.id;
  if (materialFileInput) materialFileInput.value = '';
  setMessage(
    materialMessage,
    'Selecciona un nuevo archivo para reemplazar el actual.',
    'info',
  );
}

function handleMaterialListClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const materialId = button.dataset.id;
  const item = button.closest('.material-item');
  const sessionId = item?.dataset.sessionId;
  if (!materialId || !sessionId) return;

  if (action === 'edit') {
    const cache = adminState.materialsCache.get(sessionId);
    const material = cache?.materials?.find(
      (entry) => String(entry.id) === String(materialId),
    );
    if (material) {
      fillMaterialForm(sessionId, material);
    }
  } else if (action === 'delete') {
    const confirmDelete = window.confirm(
      '¿Seguro que deseas eliminar este material?',
    );
    if (!confirmDelete) return;
    apiService
      .deleteMaterial({ sessionId, materialId })
      .then(() => {
        setMessage(materialMessage, 'Material eliminado.', 'success');
        adminState.materialsCache.delete(sessionId);
        return loadMaterials(sessionId, { force: true });
      })
      .catch((error) => {
        console.error(error);
        setMessage(materialMessage, 'No se pudo eliminar el material.', 'error');
      });
  }
}

export function initMaterialModule() {
  if (!materialForm) return;
  materialForm.addEventListener('submit', handleMaterialSubmit);
  if (materialFormReset) {
    materialFormReset.addEventListener('click', () =>
      resetMaterialForm({ preserveSession: true }),
    );
  }
  if (materialSessionSelect) {
    materialSessionSelect.addEventListener('change', handleSessionChange);
  }
  if (materialList) {
    materialList.addEventListener('click', handleMaterialListClick);
  }

  document.addEventListener('admin:sessions-updated', populateMaterialSelect);
  populateMaterialSelect();
}
