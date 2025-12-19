// src/services/api.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.13:3000/";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// --- LE MORCEAU MANQUANT OU INCORRECT ---
// Intercepteur de REQUÊTE (Request)
// Il s'exécute AVANT que la requête parte vers le serveur
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync("kaptur_auth_token");

    // --- MOUCHARD 1 ---
    console.log(
      "[API Interceptor] Token trouvé en local ?",
      token ? "OUI" : "NON",
    );

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // --- MOUCHARD 2 ---
      console.log(
        "[API Interceptor] Header injecté :",
        config.headers.Authorization,
      );
    }
  } catch (error) {
    console.error("Erreur lecture token", error);
  }
  return config;
});
// ----------------------------------------

// Intercepteur de RÉPONSE (celui que tu as déjà)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("[API Error]", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("[API Network Error]", error.message);
    }
    return Promise.reject(error);
  },
);
