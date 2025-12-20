import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore"; // Supposant que tu as un store pour les crédits

export const useMe = () => {
  const setCredits = useUserStore((state) => state.setCredits);

  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");

      // Mise à jour automatique des stores Zustand à chaque fetch réussi
      if (res.data) {
        if (res.data.credits !== undefined) setCredits(res.data.credits);
      }

      return res.data;
    },
    // On ne veut pas que ça spamme, mais on veut que ce soit frais quand on focus l'app
    staleTime: 1000 * 60 * 5, // Données considérées fraîches pendant 5 min
    refetchOnWindowFocus: true, // Magique : recharge dès que l'utilisateur revient sur l'app
  });
};
