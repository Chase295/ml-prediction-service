import axios from 'axios';
import type {
  // Model Types
  ModelResponse,
  TrainModelRequest,
  SimpleTrainModelRequest,
  TestModelRequest,
  CompareModelsRequest,
  TestResultResponse,
  ComparisonResponse,
  // Job Types
  JobResponse,
  CreateJobResponse,
  // System Types
  HealthResponse,
  // Config Types
  ConfigResponse,
  ConfigUpdateRequest,
  ConfigUpdateResponse,
} from '../types/api';

// API Base URL - Intelligent detection
const getApiBaseUrl = (): string => {
  const currentOrigin = window.location.origin;
  const hostname = window.location.hostname;
  const port = window.location.port;

  console.log('🔍 API URL Debug:', {
    origin: currentOrigin,
    hostname: hostname,
    port: port,
    fullUrl: window.location.href
  });

  // Immer same-origin verwenden (nginx proxy macht /api/* weiterleitung)
  console.log('🎯 Using API URL:', currentOrigin);
  return currentOrigin;
};

// API_BASE_URL wird dynamisch zur Laufzeit berechnet

const api = axios.create({
  timeout: 10000,
});

// Interceptor um baseURL dynamisch zu setzen
api.interceptors.request.use((config) => {
  if (!config.url?.startsWith('http')) {
    // Wenn keine absolute URL, dann baseURL hinzufügen
    config.baseURL = getApiBaseUrl();
  }
  return config;
});

// Request Interceptor für Error Handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const mlApi = {
  // ============================================================
  // Models Management
  // ============================================================

  // Get all models
  async getModels(): Promise<ModelResponse[]> {
    const response = await api.get('/api/models');
    return response.data;
  },

  // Get single model
  async getModel(modelId: string): Promise<ModelResponse> {
    const response = await api.get(`/api/models/${modelId}`);
    return response.data;
  },

  // Create model - simple rule-based
  async createSimpleModel(request: SimpleTrainModelRequest): Promise<CreateJobResponse> {
    const response = await api.post('/api/models/create/simple', request);
    return response.data;
  },

  // Create model - time-based prediction
  async createTimeBasedModel(request: any): Promise<CreateJobResponse> {
    // Extrahiere Query-Parameter und Body-Daten
    const {
      name,
      model_type,
      target_var,
      future_minutes,
      min_percent_change,
      direction,
      train_start,
      train_end,
      ...bodyData
    } = request;

    // Erstelle Query-String für erforderliche Parameter
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (model_type) params.append('model_type', model_type);
    if (target_var) params.append('target_var', target_var);
    if (future_minutes !== undefined) params.append('future_minutes', future_minutes.toString());
    if (min_percent_change !== undefined) params.append('min_percent_change', min_percent_change.toString());
    if (direction) params.append('direction', direction);
    if (train_start) params.append('train_start', train_start);
    if (train_end) params.append('train_end', train_end);

    const queryString = params.toString();
    const url = `/api/models/create/time-based${queryString ? '?' + queryString : ''}`;

    const response = await api.post(url, bodyData);
    return response.data;
  },
  
  // Create model - full training
  async createModel(request: TrainModelRequest): Promise<CreateJobResponse> {
    const response = await api.post('/api/models/create', request);
    return response.data;
  },

  // Test model
  async testModel(modelId: string, request: TestModelRequest): Promise<CreateJobResponse> {
    const response = await api.post(`/api/models/${modelId}/test`, request);
    return response.data;
  },


  // Delete model
  async deleteModel(modelId: string): Promise<void> {
    await api.delete(`/api/models/${modelId}`);
  },

  // Download model
  async downloadModel(modelId: string): Promise<Blob> {
    const response = await api.get(`/api/models/${modelId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // ============================================================
  // Jobs & Queue Management
  // ============================================================

  // Get all jobs
  async getJobs(): Promise<JobResponse[]> {
    const response = await api.get('/api/queue');
    return response.data;
  },

  // Get single job
  async getJob(jobId: string): Promise<JobResponse> {
    const response = await api.get(`/api/queue/${jobId}`);
    return response.data;
  },

  // ============================================================
  // Test Results
  // ============================================================

  // Get all test results
  async getTestResults(): Promise<TestResultResponse[]> {
    const response = await api.get('/api/test-results');
    return response.data;
  },

  // Get single test result
  async getTestResult(testId: string): Promise<TestResultResponse> {
    const response = await api.get(`/api/test-results/${testId}`);
    return response.data;
  },

  // Delete test result
  async deleteTestResult(testId: string): Promise<void> {
    await api.delete(`/api/test-results/${testId}`);
  },

  // Delete multiple test results (sequential single deletes)
  async deleteTestResults(testIds: string[]): Promise<void> {
    for (const testId of testIds) {
      await this.deleteTestResult(testId);
    }
  },
  
  // ============================================================
  // Comparisons
  // ============================================================

  // Start model comparison (2-4 models)
  async compareModels(modelIds: number[], testStart: string, testEnd: string): Promise<CreateJobResponse> {
    const params = new URLSearchParams({
      model_ids: modelIds.join(','),
      test_start: testStart,
      test_end: testEnd
    });
    const response = await api.post(`/api/models/compare?${params.toString()}`);
    return response.data;
  },

  // Get all comparisons
  async getComparisons(): Promise<ComparisonResponse[]> {
    const response = await api.get('/api/comparisons');
    return response.data;
  },

  // Get single comparison
  async getComparison(comparisonId: string): Promise<ComparisonResponse> {
    const response = await api.get(`/api/comparisons/${comparisonId}`);
    return response.data;
  },

  // Delete comparison
  async deleteComparison(comparisonId: string): Promise<void> {
    await api.delete(`/api/comparisons/${comparisonId}`);
  },

  // ============================================================
  // System & Monitoring
  // ============================================================

  // Health check
  async getHealth(): Promise<HealthResponse> {
    const response = await api.get('/api/health');
    return response.data;
  },

  // Prometheus metrics
  async getMetrics(): Promise<string> {
    const response = await api.get('/api/metrics', {
      headers: { 'Accept': 'text/plain' },
      responseType: 'text'
    });
    return response.data;
  },

  // Data availability
  async getDataAvailability(): Promise<any> {
    const response = await api.get('/api/data-availability');
    return response.data;
  },

  // Phases
  async getPhases(): Promise<any> {
    const response = await api.get('/api/phases');
    return response.data;
  },

  // ============================================================
  // Configuration
  // ============================================================

  // Get configuration
  async getConfig(): Promise<ConfigResponse> {
    const response = await api.get('/api/config');
    return response.data;
  },
  
  // Update configuration
  async updateConfig(config: ConfigUpdateRequest): Promise<ConfigUpdateResponse> {
    const response = await api.put('/api/config', config);
    return response.data;
  },

  // Reload configuration
  async reloadConfig(): Promise<any> {
    const response = await api.post('/api/reload-config');
    return response.data;
  },

  // Reconnect database
  async reconnectDb(): Promise<any> {
    const response = await api.post('/api/reconnect-db');
    return response.data;
  },

  // ============================================================
  // Utility Functions
  // ============================================================

  getApiUrl(): string {
    return getApiBaseUrl();
  },

  // Health check with timeout for UI
  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await api.get('/api/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
};

export default api;
