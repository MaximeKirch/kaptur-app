import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore";

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
    staleTime: 1000 * 60 * 5, // Données considérées fraîches pendant 5 min
    refetchOnWindowFocus: true, // Magique : recharge dès que l'utilisateur revient sur l'app
  });
};
