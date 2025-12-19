import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av"; // <--- Le module Audio
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useUserStore } from "../../src/store/userStore";
import { useCreateJob } from "../../src/hooks/useCreateJob";
import {
  getAudioDurationInSeconds,
  calculateCost,
} from "../../src/utils/audioUtils";
import { CreditBadge } from "../../src/components/ui/CreditBadge";

export default function HomeScreen() {
  const router = useRouter();
  const credits = useUserStore((state) => state.credits);
  const { mutate: createJob, isPending } = useCreateJob();

  // États pour l'enregistrement
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [recordingStatus, setRecordingStatus] = useState<
    "idle" | "recording" | "review"
  >("idle");

  // États pour le fichier (qu'il vienne du micro ou de l'import)
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [cost, setCost] = useState(0);

  // Pour jouer le son (preview)
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Timer pour l'enregistrement
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingStatus === "recording") {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingStatus]);

  // Recalcul du coût dès que la durée change
  useEffect(() => {
    setCost(calculateCost(duration));
  }, [duration]);

  // --- LOGIQUE ENREGISTREMENT ---

  async function startRecording() {
    try {
      if (permissionResponse?.status !== "granted") {
        console.log("Demande de permission...");
        await requestPermission();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Démarrage enregistrement...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(recording);
      setRecordingStatus("recording");
      setDuration(0); // Reset timer
    } catch (err) {
      Alert.alert("Erreur", "Impossible de lancer l'enregistrement");
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    console.log("Arrêt enregistrement...");
    setRecording(null);
    await recording?.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const uri = recording?.getURI();
    if (uri) {
      setAudioUri(uri);
      setRecordingStatus("review");
    }
  }

  // --- LOGIQUE IMPORT FICHIER (Legacy) ---
  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      const file = result.assets[0];
      setAudioUri(file.uri);
      const d = await getAudioDurationInSeconds(file.uri);
      setDuration(d);
      setRecordingStatus("review");
    }
  };

  // --- LOGIQUE PLAYBACK PREVIEW ---
  async function playSound() {
    if (!audioUri) return;
    const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
    setSound(sound);
    setIsPlaying(true);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setIsPlaying(false);
      }
    });
  }

  // --- LOGIQUE ENVOI ---
  const handleAnalyze = () => {
    if (!audioUri) return;

    const formData = new FormData();
    // On doit deviner le type et le nom pour l'enregistrement
    const filename = audioUri.split("/").pop() || "recording.m4a";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `audio/${match[1]}` : `audio/m4a`;

    formData.append("audio", {
      uri: audioUri,
      name: filename,
      type: type,
    } as any);

    // On peut envoyer la durée estimée pour aider le backend si besoin
    formData.append("estimated_duration", duration.toString());

    createJob(formData);
  };

  // Reset de l'interface
  const reset = () => {
    setAudioUri(null);
    setDuration(0);
    setRecordingStatus("idle");
    setSound(null);
    setIsPlaying(false);
  };

  // Formatage du temps (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const hasEnoughCredits = credits >= cost;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        {/* HEADER */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-3xl font-bold text-white tracking-tight">
              Kaptur.
            </Text>
            <Text className="text-zinc-400 text-sm">IA Audio Processing</Text>
          </View>
          <CreditBadge />
        </View>

        {/* ZONE PRINCIPALE */}
        <View className="flex-1 justify-center items-center">
          {/* ETAT : IDLE (Accueil) */}
          {recordingStatus === "idle" && (
            <View className="w-full items-center space-y-6">
              {/* Gros bouton Micro */}
              <TouchableOpacity
                onPress={startRecording}
                className="w-40 h-40 rounded-full bg-red-500/10 border-4 border-red-500/20 justify-center items-center shadow-[0_0_30px_rgba(239,68,68,0.3)]"
              >
                <View className="w-32 h-32 rounded-full bg-red-500 justify-center items-center">
                  <Ionicons name="mic" size={64} color="white" />
                </View>
              </TouchableOpacity>
              <Text className="text-zinc-400 text-lg font-medium">
                Appuyez pour enregistrer
              </Text>

              <Text className="text-zinc-600 my-4">- OU -</Text>

              {/* Bouton Import */}
              <TouchableOpacity
                onPress={handlePickDocument}
                className="flex-row items-center space-x-2 bg-zinc-900 px-6 py-3 rounded-full border border-zinc-800"
              >
                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                <Text className="text-zinc-300 font-medium">
                  Importer un fichier
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ETAT : RECORDING (En cours) */}
          {recordingStatus === "recording" && (
            <View className="items-center">
              <Text className="text-6xl font-variant-numeric text-white mb-4 tracking-widest font-thin">
                {formatTime(duration)}
              </Text>
              <View className="bg-zinc-900 px-4 py-2 rounded-full mb-12 border border-zinc-800">
                <Text className="text-zinc-400">
                  Coût actuel :{" "}
                  <Text className="text-white font-bold">{cost} ⚡</Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={stopRecording}
                className="w-24 h-24 rounded-full border-4 border-zinc-700 justify-center items-center bg-zinc-800"
              >
                <View className="w-10 h-10 rounded bg-red-500" />
                {/* Carré rouge = Stop */}
              </TouchableOpacity>
              <Text className="text-zinc-500 mt-4">Appuyez pour terminer</Text>
            </View>
          )}

          {/* ETAT : REVIEW (Validation) */}
          {recordingStatus === "review" && (
            <View className="w-full bg-surface p-6 rounded-3xl border border-zinc-800">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-zinc-400 font-medium">Aperçu</Text>
                <TouchableOpacity onPress={reset}>
                  <Ionicons name="trash-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between mb-8">
                <TouchableOpacity
                  onPress={playSound}
                  className="w-14 h-14 rounded-full bg-zinc-800 justify-center items-center border border-zinc-700"
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
                <View className="items-end">
                  <Text className="text-3xl font-bold text-white">
                    {formatTime(duration)}
                  </Text>
                  <Text className="text-zinc-400">
                    Coût final :{" "}
                    <Text className="text-primary font-bold">{cost} ⚡</Text>
                  </Text>
                </View>
              </View>

              {/* ACTION BUTTON */}
              {isPending ? (
                <View className="py-4 items-center">
                  <ActivityIndicator color="#3b82f6" />
                  <Text className="text-zinc-500 text-xs mt-2">
                    Envoi en cours...
                  </Text>
                </View>
              ) : hasEnoughCredits ? (
                <TouchableOpacity
                  onPress={handleAnalyze}
                  className="w-full py-4 rounded-xl items-center bg-primary shadow-lg shadow-blue-500/20 flex-row justify-center space-x-2"
                >
                  <Text className="text-white font-bold text-lg mr-2">
                    Analyser l'audio
                  </Text>
                  <Ionicons name="arrow-up-circle" size={24} color="white" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push("/paywall")}
                  className="w-full py-4 rounded-xl items-center bg-zinc-800 border border-zinc-700"
                >
                  <Text className="text-white font-bold">
                    Crédits insuffisants
                  </Text>
                  <Text className="text-zinc-500 text-xs mt-1">
                    Recharger pour continuer
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
