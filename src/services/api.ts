import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from '@sentry/react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.13:3000/";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("relevo_auth_token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Breadcrumb: Requête API
      Sentry.addBreadcrumb({
        category: 'http',
        message: `${config.method?.toUpperCase()} ${config.url}`,
        level: 'info',
        data: {
          url: config.url,
          method: config.method,
          baseURL: config.baseURL,
        },
      });
    } catch (error) {
      // On ne bloque pas la requête si on ne peut pas lire le token
      console.error("Erreur lecture token:", error);

      Sentry.captureException(error, {
        tags: { context: 'token_read' },
        level: 'warning',
      });
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Variable pour éviter les boucles infinies de refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Breadcrumb: Réponse API réussie
    Sentry.addBreadcrumb({
      category: 'http',
      message: `${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`,
      level: 'info',
      data: {
        url: response.config.url,
        method: response.config.method,
        status: response.status,
      },
    });

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log des erreurs
    if (error.response) {
      console.error("[API Error]", error.response.status, error.response.data);

      // Capturer les erreurs API avec contexte enrichi
      Sentry.captureException(error, {
        tags: {
          api_status: error.response.status,
          api_endpoint: originalRequest?.url || 'unknown',
          api_method: originalRequest?.method?.toUpperCase() || 'unknown',
        },
        contexts: {
          response: {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          },
        },
        // Niveau selon le type d'erreur
        level: error.response.status >= 500 ? 'error' : 'warning',
      });
    } else if (error.request) {
      console.error("[API Network Error]", error.message);

      // Erreurs réseau (pas de réponse reçue)
      Sentry.captureException(error, {
        tags: {
          api_error_type: 'network',
          api_endpoint: originalRequest?.url || 'unknown',
        },
        level: 'warning', // Erreurs réseau = warnings (pas critique)
      });
    } else {
      // Erreurs de configuration de requête
      Sentry.captureException(error, {
        tags: {
          api_error_type: 'setup',
        },
        level: 'error',
      });
    }

    // Si c'est une erreur 401 et que ce n'est pas déjà un retry et pas l'endpoint de refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register")
    ) {
      if (isRefreshing) {
        // Si un refresh est déjà en cours, on met cette requête en queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Breadcrumb: Tentative de refresh token
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Attempting token refresh',
        level: 'info',
      });

      // Import dynamique pour éviter les dépendances circulaires
      const { useAuthStore } = await import("../store/authStore");

      try {
        const success = await useAuthStore.getState().refreshAccessToken();

        if (success) {
          const newToken = useAuthStore.getState().token;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);

          // Breadcrumb: Refresh réussi
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'Token refresh successful',
            level: 'info',
          });

          return api(originalRequest);
        } else {
          processQueue(new Error("Refresh failed"), null);

          // Capture: Échec du refresh
          Sentry.captureMessage('Token refresh failed', {
            level: 'warning',
            tags: { context: 'token_refresh' },
          });

          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Capture: Erreur lors du refresh
        Sentry.captureException(refreshError, {
          tags: { context: 'token_refresh' },
          level: 'error',
        });

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
