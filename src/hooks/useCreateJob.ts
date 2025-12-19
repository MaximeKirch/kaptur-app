import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { api } from "../services/api";
import { useUserStore } from "../store/userStore";

export const useCreateJob = () => {
  const router = useRouter();
  const setCredits = useUserStore((state) => state.setCredits);

  return useMutation({
    mutationFn: async (jobData: any) => {
      // Ton backend doit renvoyer le nouveau solde de crédits dans la réponse
      const response = await api.post("/process-voice", jobData);
      return response.data;
    },
    onSuccess: (data) => {
      // Le job est lancé, on met à jour les crédits avec la vérité du serveur
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      // Tu peux récupérer l'ID du job ici pour lancer le polling
    },
    onError: (error: any) => {
      const status = error.response?.status;

      if (status === 402) {
        // C'EST ICI QUE TOUT SE JOUE
        // Le backend a dit "Pas assez d'argent"
        // On redirige immédiatement vers le Paywall RevenueCat
        router.push("/paywall");
      } else {
        // Erreur technique générique
        Alert.alert(
          "Oups",
          "Impossible de lancer le scan. Réessayez plus tard.",
        );
        console.error("Job creation failed", error);
      }
    },
  });
};
