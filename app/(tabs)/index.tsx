import { View, Text, SafeAreaView, Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";

// Stores & Hooks
import { useUserStore } from "../../src/store/userStore";
import { useCreateJob } from "../../src/hooks/useCreateJob";
import { useAudioRecorder } from "../../src/hooks/useAudioRecorder";
import { checkIfAudioIsEmpty } from "../../src/utils/audioUtils";

// UI Components
import { CreditBadge } from "../../src/components/ui/CreditBadge";
import { IdleView } from "../../src/components/recorder/IdleView";
import { RecordingView } from "../../src/components/recorder/RecordingView";
import { ReviewView } from "../../src/components/recorder/ReviewView";

const FIXED_COST: number = 1; // Stratégie Flat Fee
const MIN_DURATION: number = 3; // Durée minimale en secondes pour éviter les enregistrements vides

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State Global
  const setCredits = useUserStore((state) => state.setCredits);
  const credits = useUserStore((state) => state.credits);

  // État local pour tracker si l'audio semble vide/silencieux
  const [isAudioEmpty, setIsAudioEmpty] = useState(false);

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

  // Vérifier si l'audio est vide quand on passe en mode review
  useEffect(() => {
    const checkAudio = async () => {
      if (status === "review" && audioUri && duration > 0) {
        const isEmpty = await checkIfAudioIsEmpty(audioUri, duration);
        setIsAudioEmpty(isEmpty);
      } else {
        setIsAudioEmpty(false);
      }
    };

    checkAudio();
  }, [status, audioUri, duration]);

  // --- LOGIQUE MÉTIER ---

  const handleAnalyze = async () => {
    if (!audioUri) return;

    // Vérification 1 : Durée minimale pour éviter les enregistrements très courts
    if (duration < MIN_DURATION) {
      Alert.alert(
        "Enregistrement très court",
        `Votre audio dure seulement ${duration} seconde${duration > 1 ? "s" : ""}. Il semble trop court pour contenir un compte rendu exploitable.\n\nVous allez quand même utiliser 1 crédit si vous continuez.\n\nVoulez-vous vraiment analyser cet audio ?`,
        [
          {
            text: "Réenregistrer",
            style: "cancel",
            onPress: () => reset(),
          },
          {
            text: "Analyser quand même",
            onPress: () => proceedWithAnalysis(),
          },
        ]
      );
      return;
    }

    // Vérification 2 : Audio vide/silencieux (même si long)
    const isEmpty = await checkIfAudioIsEmpty(audioUri, duration);
    if (isEmpty) {
      Alert.alert(
        "Audio vide ou silencieux",
        "L'enregistrement semble ne contenir aucun son exploitable. Cela peut arriver si le microphone était coupé ou défaillant.\n\nVous allez quand même utiliser 1 crédit si vous continuez.\n\nVoulez-vous vraiment analyser cet audio ?",
        [
          {
            text: "Réenregistrer",
            style: "cancel",
            onPress: () => reset(),
          },
          {
            text: "Analyser quand même",
            onPress: () => proceedWithAnalysis(),
          },
        ]
      );
      return;
    }

    proceedWithAnalysis();
  };

  const proceedWithAnalysis = () => {
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
              isShortDuration={duration < MIN_DURATION}
              isAudioEmpty={isAudioEmpty}
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
