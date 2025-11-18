import { apiService } from '../services/apiService.js';
import { adminState } from './state.js';
import { setMessage } from './helpers.js';

const materialForm = document.getElementById('materialForm');
const materialMessage = document.getElementById('materialMessage');
const materialSessionSelect = document.getElementById('materialSession');

function populateMaterialSelect() {
  if (!materialSessionSelect) return;
  const selected = materialSessionSelect.value;
  materialSessionSelect.innerHTML =
    '<option value="">Selecciona una sesión</option>';

  adminState.sessions.forEach((session) => {
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

function handleMaterialSubmit(event) {
  event.preventDefault();
  if (!materialForm) return;
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

  apiService
    .uploadMaterial(sessionId, payload)
    .then(() => {
      setMessage(materialMessage, 'Material guardado correctamente.', 'success');
      materialForm.reset();
    })
    .catch((error) => {
      console.error(error);
      setMessage(materialMessage, 'Error al guardar el material.', 'error');
    });
}

export function initMaterialModule() {
  if (!materialForm) return;
  materialForm.addEventListener('submit', handleMaterialSubmit);
  document.addEventListener('admin:sessions-updated', populateMaterialSelect);
  populateMaterialSelect();
}
