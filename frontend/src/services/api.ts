/**
 * API-Service Layer
 * Zentralisiert alle API-Calls mit Axios und React Query
 */
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type {
  Model,
  ModelsListResponse,
  ModelResponse,
  AlertConfig,
  IgnoreSettings,
  IgnoreSettingsResponse,
  PredictionsResponse,
  HealthResponse,
  ApiError
} from '../types/model';

// API-Konfiguration
const API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Axios-Instanz mit Standard-Konfiguration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor für Error-Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404) {
      throw new Error('Ressource nicht gefunden');
    }
    if (error.response?.status === 500) {
      throw new Error('Server-Fehler. Bitte später erneut versuchen.');
    }
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Netzwerk-Fehler. Bitte überprüfen Sie Ihre Verbindung.');
  }
);

// ============================================================================
// MODELS API
// ============================================================================

export const modelsApi = {
  // Alle Modelle abrufen
  getAll: async (): Promise<Model[]> => {
    const response: AxiosResponse<ModelsListResponse> = await apiClient.get('/models?include_inactive=true');
    return response.data.models;
  },

  // Verfügbare Modelle zum Importieren abrufen
  getAvailable: async (): Promise<any[]> => {
    const response: AxiosResponse<{ models: any[]; total: number }> = await apiClient.get('/models/available');
    return response.data.models;
  },

  // Modell importieren
  importModel: async (modelId: number): Promise<any> => {
    const response = await apiClient.post('/models/import', { model_id: modelId });
    return response.data;
  },

  // Service neu starten (erfordert manuelle Bestätigung)
  restartService: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/system/restart');
    return response.data;
  },

  // Einzelnes Modell abrufen
  getById: async (id: number): Promise<Model> => {
    const response: AxiosResponse<ModelResponse> = await apiClient.get(`/models/${id}`);
    return response.data;
  },

  // Alert-Konfiguration aktualisieren
  updateAlertConfig: async (id: number, config: AlertConfig): Promise<{ message: string }> => {
    const response = await apiClient.patch(`/models/${id}/alert-config`, config);
    return response.data;
  },

  // Ignore-Settings aktualisieren
  updateIgnoreSettings: async (id: number, settings: IgnoreSettings): Promise<{ message: string }> => {
    const response = await apiClient.patch(`/models/${id}/ignore-settings`, settings);
    return response.data;
  },

  // Ignore-Settings abrufen
  getIgnoreSettings: async (id: number): Promise<IgnoreSettingsResponse> => {
    const response: AxiosResponse<IgnoreSettingsResponse> = await apiClient.get(`/models/${id}/ignore-settings`);
    return response.data;
  },

  // Modell umbenennen
  rename: async (id: number, customName: string): Promise<{ message: string }> => {
    const response = await apiClient.patch(`/models/${id}/rename`, { custom_name: customName });
    return response.data;
  },

  // Modell aktivieren/deaktivieren
  toggleActive: async (id: number, active: boolean): Promise<{ message: string }> => {
    const endpoint = active ? `/models/${id}/deactivate` : `/models/${id}/activate`;
    const response = await apiClient.post(endpoint);
    return response.data;
  },

  // Modell löschen
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/models/${id}`);
    return response.data;
  }
};

// ============================================================================
// PREDICTIONS API
// ============================================================================

export const predictionsApi = {
  // Predictions für ein Modell abrufen
  getForModel: async (
    modelId: number,
    page: number = 1,
    perPage: number = 50
  ): Promise<PredictionsResponse> => {
    const response: AxiosResponse<PredictionsResponse> = await apiClient.get(
      `/predictions/model/${modelId}?page=${page}&per_page=${perPage}`
    );
    return response.data;
  },

  // Einzelne Prediction abrufen
  getById: async (id: number) => {
    const response = await apiClient.get(`/predictions/${id}`);
    return response.data;
  },

  // Neue Prediction erstellen (für Tests)
  create: async (modelId: number, coinId: string) => {
    const response = await apiClient.post('/predict', {
      active_model_id: modelId,
      coin_id: coinId
    });
    return response.data;
  }
};

// ============================================================================
// HEALTH & SYSTEM API
// ============================================================================

export const systemApi = {
  // Health-Check
  health: async (): Promise<HealthResponse> => {
    const response: AxiosResponse<HealthResponse> = await apiClient.get('/health');
    return response.data;
  },

  // System-Stats
  stats: async () => {
    const response = await apiClient.get('/stats');
    return response.data;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const apiUtils = {
  // URL für direkten Zugriff auf Modelle
  getModelUrl: (id: number) => `${API_BASE_URL}/models/${id}`,

  // URL für direkten Zugriff auf Predictions
  getPredictionsUrl: (modelId: number) => `${API_BASE_URL}/predictions/model/${modelId}`,

  // Error-Handling Helper
  isApiError: (error: any): error is ApiError => {
    return error && typeof error.detail === 'string';
  }
};

export default apiClient;
