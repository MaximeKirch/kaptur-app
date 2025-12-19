import { create } from "zustand";

interface UserState {
  credits: number;
  setCredits: (count: number) => void;
  decrementCredits: () => void;
  // Tu ajouteras ici d'autres infos user (email, isPremium, etc.)
}

export const useUserStore = create<UserState>((set) => ({
  credits: 0, // Par défaut 0 en attendant que le profil soit chargé
  setCredits: (count) => set({ credits: count }),
  // Optimistic update (on baisse le compteur visuellement tout de suite)
  decrementCredits: () =>
    set((state) => ({ credits: Math.max(0, state.credits - 1) })),
}));
