import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface UserState {
  credits: number;
  hasCompletedOnboarding: boolean;
  setCredits: (count: number) => void;
  decrementCredits: () => void;
  markOnboardingComplete: () => Promise<void>;
  checkOnboardingStatus: () => Promise<void>;
  // Tu ajouteras ici d'autres infos user (email, isPremium, etc.)
}

const ONBOARDING_KEY = "relevo_onboarding_completed";

export const useUserStore = create<UserState>((set) => ({
  credits: 0,
  hasCompletedOnboarding: false,
  setCredits: (count) => set({ credits: count }),
  // Optimistic update (on baisse le compteur visuellement tout de suite)
  decrementCredits: () =>
    set((state) => ({ credits: Math.max(0, state.credits - 1) })),

  markOnboardingComplete: async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
    set({ hasCompletedOnboarding: true });
  },

  checkOnboardingStatus: async () => {
    const completed = await SecureStore.getItemAsync(ONBOARDING_KEY);
    set({ hasCompletedOnboarding: completed === "true" });
  },
}));
