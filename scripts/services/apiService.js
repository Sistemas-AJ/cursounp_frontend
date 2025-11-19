const DEFAULT_BASE_URL = 'http://localhost:9009/api';

export class ApiService {
  constructor({ baseUrl = DEFAULT_BASE_URL } = {}) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 5000,
      headers: {
        Accept: 'application/json',
      },
    });
  }

  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common.Authorization;
    }
  }

  async getSessions() {
    const { data } = await this.client.get('/sesiones');
    return Array.isArray(data) ? data : [];
  }

  async createSession(payload) {
    const { data } = await this.client.post('/sesiones', payload);
    return data;
  }

  async updateSession(id, payload) {
    if (!id && id !== 0) throw new Error('Session ID requerido');
    const { data } = await this.client.put('/sesiones', payload, {
      params: { session_id: id },
    });
    return data;
  }

  async deleteSession(id) {
    if (!id && id !== 0) throw new Error('Session ID requerido');
    await this.client.delete('/sesiones', {
      params: { session_id: id },
    });
  }

  async createMaterial({ sessionId, displayName, file }) {
    if (!sessionId && sessionId !== 0) {
      throw new Error('Session ID requerido');
    }
    if (!file) {
      throw new Error('Archivo requerido');
    }
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('display_name', displayName);
    formData.append('file', file);
    const { data } = await this.client.post('/material', formData);
    return data;
  }

  async updateMaterial({ materialId, sessionId, displayName, file }) {
    if (!materialId && materialId !== 0) {
      throw new Error('Material ID requerido');
    }
    if (!sessionId && sessionId !== 0) {
      throw new Error('Session ID requerido');
    }
    if (!file) {
      throw new Error('Archivo requerido');
    }
    const formData = new FormData();
    formData.append('material_id', materialId);
    formData.append('session_id', sessionId);
    formData.append('display_name', displayName);
    formData.append('file', file);
    const { data } = await this.client.put('/material', formData);
    return data;
  }

  async deleteMaterial({ sessionId, materialId }) {
    if (!sessionId && sessionId !== 0) {
      throw new Error('Session ID requerido');
    }
    if (!materialId && materialId !== 0) {
      throw new Error('Material ID requerido');
    }
    await this.client.delete('/material', {
      params: {
        session_id: sessionId,
        material_id: materialId,
      },
    });
  }

  async getSessionMaterials(sessionId) {
    if (!sessionId && sessionId !== 0) throw new Error('Session ID requerido');
    const { data } = await this.client.get('/material', {
      params: { session_id: sessionId },
    });
    return data;
  }

  async getTasks() {
    const { data } = await this.client.get('/tareas');
    return Array.isArray(data) ? data : [];
  }

  async createTask(payload) {
    const { data } = await this.client.post('/tareas', payload);
    return data;
  }

  async updateTask(id, payload) {
    if (!id && id !== 0) throw new Error('Task ID requerido');
    const { data } = await this.client.put('/tareas', payload, {
      params: { task_id: id },
    });
    return data;
  }

  async deleteTask(id) {
    if (!id && id !== 0) throw new Error('Task ID requerido');
    await this.client.delete('/tareas', {
      params: { task_id: id },
    });
  }

  async downloadMaterial(materialId) {
    if (!materialId && materialId !== 0)
      throw new Error('Material ID requerido');
    const response = await this.client.get(`/material/${materialId}/archivo`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async registerUser(payload) {
    const { data } = await this.client.post('/auth/register', payload);
    return data;
  }

  async login(credentials) {
    const { data } = await this.client.post('/auth/token', credentials);
    return data;
  }
}

export const apiService = new ApiService();
