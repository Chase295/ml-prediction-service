/**
 * React Query Client Konfiguration
 * Zentralisiert das Caching und Error-Handling für alle API-Calls
 */
import { QueryClient } from '@tanstack/react-query';

// Query Client mit optimierter Konfiguration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache für 5 Minuten
      staleTime: 5 * 60 * 1000, // 5 Minuten
      gcTime: 10 * 60 * 1000, // 10 Minuten Garbage Collection

      // Retry-Konfiguration
      retry: (failureCount, error: any) => {
        // Bei 404 nicht retryen
        if (error?.message?.includes('nicht gefunden')) return false;
        // Bei anderen Fehlern bis zu 3 Mal retryen
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch-Verhalten
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      // Optimistische Updates für bessere UX
      onError: (error) => {
        console.error('Mutation error:', error);
        // Hier könnte Rollback-Logik implementiert werden
      },
      onSuccess: (data) => {
        console.log('Mutation success:', data);
        // Hier könnte Success-Handling implementiert werden
      },
    },
  },
});

// Cache-Invalidation Helper
export const invalidateQueries = {
  // Alle Modelle neu laden
  models: () => queryClient.invalidateQueries({ queryKey: ['models'] }),

  // Spezifisches Modell neu laden
  model: (id: number) => queryClient.invalidateQueries({ queryKey: ['model', id] }),

  // Alle Predictions neu laden
  predictions: () => queryClient.invalidateQueries({ queryKey: ['predictions'] }),

  // Predictions für spezifisches Modell neu laden
  modelPredictions: (modelId: number) =>
    queryClient.invalidateQueries({ queryKey: ['predictions', 'model', modelId] }),

  // Alles neu laden
  all: () => queryClient.invalidateQueries(),
};

export default queryClient;
