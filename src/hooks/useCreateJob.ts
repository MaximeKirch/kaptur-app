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
      const response = await api.post("/process-voice", jobData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        transformRequest: (data, headers) => {
          return data;
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
    },
    onError: (error: any) => {
      const status = error.response?.status;
      const errorCode = error.response?.data?.code; // Si ton backend renvoie un code d'erreur

      if (status === 402) {
        // Paiement requis
        Alert.alert(
          "Crédits insuffisants",
          "Vous n'avez plus de crédits. Rechargez pour continuer.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Recharger", onPress: () => router.push("/paywall") },
          ],
        );
      } else if (errorCode === "AUDIO_TOO_LONG") {
        // Cas spécifique sécurité backend
        Alert.alert(
          "Audio trop long",
          "L'enregistrement dépasse la limite autorisée de 15 minutes.",
        );
      } else {
        // Erreur technique générique
        Alert.alert(
          "Oups",
          error.response?.data?.message ||
            "Impossible de lancer le scan. Réessayez plus tard.",
        );
        console.error("Job creation failed", error);
      }
    },
  });
};
