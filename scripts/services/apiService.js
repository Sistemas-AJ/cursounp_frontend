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

  async uploadMaterial(sessionId, payload) {
    if (!sessionId && sessionId !== 0) throw new Error('Session ID requerido');
    const { data } = await this.client.post(
      `/sesiones/${sessionId}/materials`,
      payload,
    );
    return data;
  }

  async getSessionMaterials(sessionId) {
    if (!sessionId && sessionId !== 0) throw new Error('Session ID requerido');
    const { data } = await this.client.get('/material', {
      params: { session_id: sessionId },
    });
    return data;
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
