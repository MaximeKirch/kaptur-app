import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

const CONSENT_KEY = "relevo_data_consent";

export type ConsentStatus = "pending" | "granted" | "denied";

interface ConsentState {
  status: ConsentStatus;
  timestamp: string | null; // Date du consentement
  isLoading: boolean;

  // Actions
  loadConsentStatus: () => Promise<void>;
  grantConsent: () => Promise<void>;
  revokeConsent: () => Promise<void>;
}

export const useConsentStore = create<ConsentState>((set, get) => ({
  status: "pending",
  timestamp: null,
  isLoading: true,

  loadConsentStatus: async () => {
    try {
      set({ isLoading: true });

      // 1. Vérifier AsyncStorage en premier (cache local)
      const localConsent = await AsyncStorage.getItem(CONSENT_KEY);

      if (localConsent) {
        const parsed = JSON.parse(localConsent);
        set({
          status: parsed.status,
          timestamp: parsed.timestamp,
          isLoading: false
        });
        return;
      }

      // 2. Si pas de cache local, vérifier avec le backend
      try {
        const response = await api.get("/user/data-consent");
        const { status, timestamp } = response.data;

        if (status) {
          // Synchroniser avec AsyncStorage
          await AsyncStorage.setItem(
            CONSENT_KEY,
            JSON.stringify({ status, timestamp })
          );
          set({ status, timestamp, isLoading: false });
          return;
        }
      } catch (error) {
        // Si erreur backend (offline, etc.), on reste en pending
        console.log("Impossible de récupérer le consentement depuis le backend");
      }

      // 3. Aucun consentement trouvé
      set({ status: "pending", timestamp: null, isLoading: false });
    } catch (error) {
      console.error("Erreur lors du chargement du consentement:", error);
      set({ status: "pending", timestamp: null, isLoading: false });
    }
  },

  grantConsent: async () => {
    try {
      const timestamp = new Date().toISOString();
      const consentData = { status: "granted" as ConsentStatus, timestamp };

      // 1. Sauvegarder localement immédiatement
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(consentData));
      set({ status: "granted", timestamp });

      // 2. Sauvegarder en BDD (asynchrone, non bloquant)
      try {
        await api.post("/user/data-consent", consentData);
      } catch (error) {
        console.error("Erreur lors de la sauvegarde du consentement en BDD:", error);
        // On ne bloque pas l'utilisateur même si le backend échoue
      }
    } catch (error) {
      console.error("Erreur lors de l'octroi du consentement:", error);
      throw error;
    }
  },

  revokeConsent: async () => {
    try {
      const timestamp = new Date().toISOString();
      const consentData = { status: "denied" as ConsentStatus, timestamp };

      // 1. Sauvegarder localement
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(consentData));
      set({ status: "denied", timestamp });

      // 2. Sauvegarder en BDD
      try {
        await api.post("/user/data-consent", consentData);
      } catch (error) {
        console.error("Erreur lors de la révocation du consentement en BDD:", error);
      }
    } catch (error) {
      console.error("Erreur lors de la révocation du consentement:", error);
      throw error;
    }
  },
}));
