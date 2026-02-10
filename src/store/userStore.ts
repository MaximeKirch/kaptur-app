import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserState {
  credits: number;
  hasCompletedOnboarding: boolean;
  setCredits: (count: number) => void;
  decrementCredits: () => void;
  loadCredits: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  checkOnboardingStatus: () => Promise<void>;
  // Tu ajouteras ici d'autres infos user (email, isPremium, etc.)
}

const ONBOARDING_KEY = "relevo_onboarding_completed";
const CREDITS_KEY = "relevo_credits";

export const useUserStore = create<UserState>((set) => ({
  credits: 0,
  hasCompletedOnboarding: false,

  setCredits: (count) => {
    set({ credits: count });
    // Persister en background (non-bloquant)
    AsyncStorage.setItem(CREDITS_KEY, count.toString()).catch((e) =>
      console.error("Erreur sauvegarde crédits:", e)
    );
  },

  // Optimistic update (on baisse le compteur visuellement tout de suite)
  decrementCredits: () =>
    set((state) => {
      const newCredits = Math.max(0, state.credits - 1);
      // Persister en background
      AsyncStorage.setItem(CREDITS_KEY, newCredits.toString()).catch(() => null);
      return { credits: newCredits };
    }),

  loadCredits: async () => {
    try {
      const storedCredits = await Promise.race([
        AsyncStorage.getItem(CREDITS_KEY),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]).catch(() => null);

      if (storedCredits !== null) {
        const credits = parseInt(storedCredits, 10);
        if (!isNaN(credits)) {
          set({ credits });
        }
      }
    } catch (e) {
      console.error("loadCredits error:", e);
    }
  },

  markOnboardingComplete: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    set({ hasCompletedOnboarding: true });
  },

  checkOnboardingStatus: async () => {
    try {
      // Double protection : timeout + catch
      const completed = await Promise.race([
        AsyncStorage.getItem(ONBOARDING_KEY),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]).catch(() => null);
      set({ hasCompletedOnboarding: completed === "true" });
    } catch (e) {
      console.error("checkOnboardingStatus error:", e);
      set({ hasCompletedOnboarding: false });
    }
  },
}));
