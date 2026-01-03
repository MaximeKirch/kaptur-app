import { View, Text, SafeAreaView, Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
// On n'a plus besoin de useEffect pour calculer le coût, ni de useState pour le coût
import { useState } from "react";

// Stores & Hooks
import { useUserStore } from "../../src/store/userStore";
import { useCreateJob } from "../../src/hooks/useCreateJob";
import { useAudioRecorder } from "../../src/hooks/useAudioRecorder";
// On supprime l'import de calculateCost car on ne fait plus de maths

// UI Components
import { CreditBadge } from "../../src/components/ui/CreditBadge";
import { IdleView } from "../../src/components/recorder/IdleView";
import { RecordingView } from "../../src/components/recorder/RecordingView";
import { ReviewView } from "../../src/components/recorder/ReviewView";

const FIXED_COST: number = 1; // Stratégie Flat Fee

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State Global
  const setCredits = useUserStore((state) => state.setCredits);
  const credits = useUserStore((state) => state.credits);

  // Custom Hooks (Logic Layer)
  const {
    status,
    duration,
    audioUri,
    startRecording,
    stopRecording,
    importFile,
    reset,
    maxDuration, // On récupère la constante maxDuration du hook si besoin pour l'UI
  } = useAudioRecorder();

  const { mutate: createJob, isPending } = useCreateJob();

  // Plus de calcul savant. 1 = 1.
  const hasEnoughCredits = credits >= FIXED_COST;

  // --- LOGIQUE MÉTIER ---

  const handleAnalyze = () => {
    if (!audioUri) return;

    const formData = new FormData();
    const filename = audioUri.split("/").pop() || "recording.m4a";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `audio/${match[1]}` : `audio/m4a`;

    formData.append("audio", { uri: audioUri, name: filename, type } as any);
    // On envoie quand même la durée pour les stats backend, même si ça ne change pas le prix
    formData.append("estimated_duration", duration.toString());

    createJob(formData, {
      onSuccess: (data) => {
        if (data.billing?.remaining_credits !== undefined) {
          setCredits(data.billing.remaining_credits);
        }
        reset(); // On remet le recorder à zéro
        queryClient.invalidateQueries({ queryKey: ["my-jobs"] });
        router.push("/(tabs)/history");
      },
      // L'erreur est gérée dans le hook useCreateJob, mais on peut garder un fallback ici
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        {/* HEADER */}
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-3xl font-bold text-white tracking-tight">
            Relevo
          </Text>
          <CreditBadge />
        </View>

        {/* CONTENU PRINCIPAL */}
        <View className="flex-1 justify-center items-center">
          {status === "idle" && (
            <IdleView onRecord={startRecording} onImport={importFile} />
          )}

          {status === "recording" && (
            <RecordingView
              duration={duration}
              cost={FIXED_COST} // On passe 1
              onStop={stopRecording}
            />
          )}

          {status === "review" && audioUri && (
            <ReviewView
              uri={audioUri}
              duration={duration}
              cost={FIXED_COST}
              hasCredits={hasEnoughCredits}
              isSending={isPending}
              onReset={reset}
              onAnalyze={handleAnalyze}
              onPaywall={() => router.push("/paywall")}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
