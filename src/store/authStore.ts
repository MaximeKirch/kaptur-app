// src/store/authStore.ts
import { create } from "zustand";
import { useUserStore } from "./userStore";
import { api } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
// import Purchases from "react-native-purchases";

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
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    set({ token, refreshToken, user, isAuthenticated: true });
    // COMMENTED OUT FOR DEBUGGING
    // if (user?.id) {
    //   try {
    //     const isConfigured = await Purchases.isConfigured();
    //     if (isConfigured) {
    //       await Purchases.logIn(user.id.toString());
    //       console.log("🔗 RevenueCat lié à l'utilisateur :", user.id);
    //     }
    //   } catch (e) {
    //     console.error("Erreur liaison RevenueCat", e);
    //   }
    // }
  },

  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
    // COMMENTED OUT FOR DEBUGGING
    // try {
    //   const isConfigured = await Purchases.isConfigured();
    //   if (isConfigured) {
    //     await Purchases.logOut();
    //   }
    // } catch (e) {
    //   console.error("Erreur déconnexion RevenueCat", e);
    // }
  },

  setToken: async (token: string) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    set({ token });
  },

  refreshAccessToken: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

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
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
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

  // checkAuth: async () => {
  //   try {
  //     // 1. Lecture ultra-sécurisée du SecureStore
  //     const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  //     const refreshToken = await SecureStore.getItemAsync(
  //       REFRESH_TOKEN_KEY,
  //     ).catch(() => null);

  //     if (!token || !refreshToken) {
  //       console.log("[CheckAuth] Pas de tokens -> Déconnecté");
  //       set({ isAuthenticated: false, isReady: true } as any); // On s'assure de libérer le loader
  //       return;
  //     }

  //     // 2. On met à jour l'état local immédiatement pour débloquer l'UI
  //     set({ token, refreshToken, isAuthenticated: true });

  //     // 3. On tente l'appel API en arrière-plan sans bloquer le boot
  //     try {
  //       const res = await api.get("/auth/me");
  //       set({ user: res.data });
  //       useUserStore.getState().setCredits(res.data.credits);
  //     } catch (err: any) {
  //       // Si 401, on tente le refresh, mais on ne crash pas l'app si ça échoue
  //       if (err.response?.status === 401) {
  //         const success = await get().refreshAccessToken();
  //         if (success) {
  //           const retryRes = await api.get("/auth/me").catch(() => null);
  //           if (retryRes) {
  //             set({ user: retryRes.data });
  //             useUserStore.getState().setCredits(retryRes.data.credits);
  //           }
  //         }
  //       }
  //     }
  //   } catch (criticalError) {
  //     // Crash silencieux pour sauver le démarrage
  //     console.error("CRITICAL AUTH ERROR AT BOOT:", criticalError);
  //     set({ isAuthenticated: false });
  //   }
  // },
  //
  // src/store/authStore.ts
  // src/store/authStore.ts
  checkAuth: async () => {
    try {
      // Double protection : timeout + catch
      const token = await Promise.race([
        AsyncStorage.getItem(TOKEN_KEY),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]).catch(() => null);

      const refreshToken = await Promise.race([
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]).catch(() => null);

      if (token && refreshToken) {
        set({ token, refreshToken, isAuthenticated: true });
        // On fetch le user plus tard, tranquillement
        api
          .get("/auth/me")
          .then((res) => set({ user: res.data }))
          .catch(() => null);
      } else {
        set({ isAuthenticated: false });
      }
    } catch (e) {
      // Si ça crash ici, on neutralise
      console.error("checkAuth error:", e);
      set({ isAuthenticated: false });
    }
  },
}));
