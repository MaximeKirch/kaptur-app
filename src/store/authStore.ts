// src/store/authStore.ts
import { create } from "zustand";
import { useUserStore } from "./userStore";
import { api } from "../services/api";
import * as SecureStore from "expo-secure-store";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: any | null;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const TOKEN_KEY = "kaptur_auth_token";

// 1. AJOUT DE 'get' ICI
export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  isAuthenticated: false,
  user: null,

  login: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    console.log("[CheckAuth] Démarrage...");
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      console.log("[CheckAuth] Token dans SecureStore :", token); // Vérifie s'il n'est pas null

      if (token) {
        set({ token, isAuthenticated: true }); // On connecte temporairement

        try {
          console.log("[CheckAuth] Appel API /auth/me...");
          const res = await api.get("/auth/me");
          console.log("[CheckAuth] Succès !", res.status);

          set({ user: res.data });
          useUserStore.getState().setCredits(res.data.credits);
        } catch (err: any) {
          // --- C'EST ICI QUE ÇA CASSE ---
          console.error(
            "[CheckAuth] ERREUR API :",
            err.response?.status,
            err.response?.data,
          );

          if (err.response?.status === 401) {
            console.log("[CheckAuth] 401 détecté -> Logout");
            get().logout();
          }
        }
      } else {
        console.log("[CheckAuth] Pas de token trouvé -> Reste déconnecté");
      }
    } catch (e) {
      console.error(e);
    }
  },
}));
