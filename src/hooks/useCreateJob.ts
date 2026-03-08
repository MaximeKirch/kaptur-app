import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { api } from "../services/api";
import { useUserStore } from "../store/userStore";
import { useConsentStore } from "../store/consentStore";

export const useCreateJob = () => {
  const router = useRouter();
  const setCredits = useUserStore((state) => state.setCredits);
  const consentStatus = useConsentStore((state) => state.status);

  return useMutation({
    mutationFn: async (jobData: any) => {
      // DOUBLE VÉRIFICATION DE SÉCURITÉ : Ne jamais envoyer de données sans consentement
      if (consentStatus !== "granted") {
        throw new Error("CONSENT_REQUIRED");
      }

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

      // Vérification du consentement
      if (error.message === "CONSENT_REQUIRED") {
        Alert.alert(
          "Consentement requis",
          "Vous devez accepter l'envoi de données à nos partenaires IA (OpenAI, Google) pour créer des rapports.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Voir les détails", onPress: () => router.push("/data-consent") },
          ]
        );
        return;
      }

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
