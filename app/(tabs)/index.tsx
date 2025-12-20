import { View, Text, SafeAreaView, Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

// Stores & Hooks
import { useUserStore } from "../../src/store/userStore";
import { useCreateJob } from "../../src/hooks/useCreateJob";
import { useAudioRecorder } from "../../src/hooks/useAudioRecorder";
import { calculateCost } from "../../src/utils/audioUtils";

// UI Components
import { CreditBadge } from "../../src/components/ui/CreditBadge";
import { IdleView } from "../../src/components/recorder/IdleView";
import { RecordingView } from "../../src/components/recorder/RecordingView";
import { ReviewView } from "../../src/components/recorder/ReviewView";

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
  } = useAudioRecorder();
  const { mutate: createJob, isPending } = useCreateJob();

  // Local State (Calculé)
  const [cost, setCost] = useState(0);

  // Mise à jour du coût en temps réel
  useEffect(() => {
    setCost(calculateCost(duration));
  }, [duration]);

  const hasEnoughCredits = credits >= cost;

  // --- LOGIQUE MÉTIER ---

  const handleAnalyze = () => {
    if (!audioUri) return;

    const formData = new FormData();
    const filename = audioUri.split("/").pop() || "recording.m4a";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `audio/${match[1]}` : `audio/m4a`;

    formData.append("audio", { uri: audioUri, name: filename, type } as any);
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
      onError: (error: any) => {
        Alert.alert(
          "Erreur",
          error.response?.data?.message || "L'envoi a échoué",
        );
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        {/* HEADER */}
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-3xl font-bold text-white tracking-tight">
            Kaptur
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
              cost={cost}
              onStop={stopRecording}
            />
          )}

          {status === "review" && audioUri && (
            <ReviewView
              uri={audioUri}
              duration={duration}
              cost={cost}
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
