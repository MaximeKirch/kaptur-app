// src/store/authStore.ts
import { create } from "zustand";
import { useUserStore } from "./userStore";
import { api } from "../services/api";
import * as SecureStore from "expo-secure-store";
import Purchases from "react-native-purchases";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: any | null;
  login: (token: string, refreshToken: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  setToken: (token: string) => Promise<void>;
}

const TOKEN_KEY = "relevo_auth_token";
const REFRESH_TOKEN_KEY = "relevo_refresh_token";

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  user: null,

  login: async (token, refreshToken, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    set({ token, refreshToken, user, isAuthenticated: true });
    if (user?.id) {
      try {
        await Purchases.logIn(user.id);
        console.log("🔗 RevenueCat lié à l'utilisateur :", user.id);
      } catch (e) {
        console.error("Erreur liaison RevenueCat", e);
      }
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
    await Purchases.logOut();
  },

  setToken: async (token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token });
  },

  refreshAccessToken: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        console.log("[Refresh] Pas de refresh token -> Logout");
        get().logout();
        return false;
      }

      console.log("[Refresh] Tentative de refresh du token...");

      // Appel au endpoint de refresh sans intercepteur (pour éviter une boucle infinie)
      const response = await api.post("/auth/refresh", { refreshToken });

      const { access_token, refresh_token } = response.data;

      // Sauvegarder les nouveaux tokens
      await SecureStore.setItemAsync(TOKEN_KEY, access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
      set({ token: access_token, refreshToken: refresh_token });

      console.log("[Refresh] Token rafraîchi avec succès");
      return true;
    } catch (error: any) {
      console.error("[Refresh] Échec du refresh:", error.response?.status);
      // Si le refresh token est invalide ou expiré, on déconnecte
      get().logout();
      return false;
    }
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (token && refreshToken) {
        set({ token, refreshToken, isAuthenticated: true });

        try {
          const res = await api.get("/auth/me");

          set({ user: res.data });
          useUserStore.getState().setCredits(res.data.credits);
        } catch (err: any) {
          if (err.response?.status === 401) {
            console.log("[CheckAuth] 401 détecté -> Tentative de refresh");
            // Tenter un refresh automatique
            const success = await get().refreshAccessToken();
            if (success) {
              // Réessayer l'appel après le refresh
              try {
                const res = await api.get("/auth/me");
                set({ user: res.data });
                useUserStore.getState().setCredits(res.data.credits);
              } catch (retryErr) {
                console.log("[CheckAuth] Échec après refresh -> Logout");
                get().logout();
              }
            }
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
