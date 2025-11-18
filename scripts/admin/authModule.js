import { apiService } from '../services/apiService.js';
import { adminState } from './state.js';
import { setMessage } from './helpers.js';

const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const logoutButton = document.getElementById('logoutButton');
const tokenStatus = document.getElementById('tokenStatus');

function updateTokenStatus(token) {
  if (!tokenStatus) return;
  if (token) {
    tokenStatus.textContent = 'Sesión administrativa activa.';
    tokenStatus.dataset.status = 'success';
  } else {
    tokenStatus.textContent = 'No hay sesión activa.';
    tokenStatus.dataset.status = 'info';
  }
}

function handleRegisterSubmit(event) {
  event.preventDefault();
  if (!registerForm) return;
  const formData = new FormData(registerForm);
  const payload = Object.fromEntries(formData.entries());
  apiService
    .registerUser(payload)
    .then(() => {
      setMessage(registerMessage, 'Usuario registrado.', 'success');
      registerForm.reset();
    })
    .catch((error) => {
      console.error(error);
      setMessage(registerMessage, 'No se pudo registrar.', 'error');
    });
}

function handleLoginSubmit(event) {
  event.preventDefault();
  if (!loginForm) return;
  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());
  apiService
    .login(payload)
    .then((data) => {
      adminState.token = data.access_token;
      apiService.setAuthToken(data.access_token);
      localStorage.setItem('curso_unp_token', data.access_token);
      updateTokenStatus(data.access_token);
      setMessage(loginMessage, 'Token generado correctamente.', 'success');
      loginForm.reset();
    })
    .catch((error) => {
      console.error(error);
      setMessage(loginMessage, 'Credenciales inválidas.', 'error');
    });
}

function handleLogout() {
  adminState.token = null;
  apiService.setAuthToken(null);
  localStorage.removeItem('curso_unp_token');
  updateTokenStatus(null);
  setMessage(loginMessage, 'Sesión cerrada.', 'info');
}

function restoreToken() {
  const savedToken = localStorage.getItem('curso_unp_token');
  if (savedToken) {
    adminState.token = savedToken;
    apiService.setAuthToken(savedToken);
  }
  updateTokenStatus(savedToken);
}

export function initAuthModule() {
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegisterSubmit);
  }
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  restoreToken();
}
