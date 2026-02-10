import { useState, useEffect, useCallback, useRef } from "react";
import {
  createAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
} from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { Alert, Linking, Platform } from "react-native";
import { getAudioDurationInSeconds } from "../utils/audioUtils";

export type RecordingStatus = "idle" | "recording" | "review";
export type AudioSource = "recorded" | "imported";

const MAX_DURATION = 900; // 15 minutes en secondes

export const useAudioRecorder = () => {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioSource, setAudioSource] = useState<AudioSource | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize recorder lazily on first interaction, not at mount
  const getRecorder = useCallback(() => {
    if (!recorderRef.current) {
      recorderRef.current = createAudioRecorder(RecordingPresets.HIGH_QUALITY);
    }
    return recorderRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (recorderRef.current) {
        recorderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const { status: permStatus } = await getRecordingPermissionsAsync();

      if (permStatus !== "granted") {
        const { status: newStatus } =
          await requestRecordingPermissionsAsync();

        if (newStatus !== "granted") {
          Alert.alert(
            "Permission microphone requise",
            "Relevo a besoin d'accéder à votre microphone pour enregistrer vos comptes rendus. C'est le cœur de l'application.\n\nVeuillez autoriser l'accès dans les paramètres.",
            [
              { text: "Annuler", style: "cancel" },
              {
                text: "Ouvrir les paramètres",
                onPress: () => {
                  if (Platform.OS === "ios") {
                    Linking.openURL("app-settings:");
                  } else {
                    Linking.openSettings();
                  }
                },
              },
            ],
          );
          return;
        }
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const recorder = getRecorder();
      await recorder.prepareToRecordAsync();
      await recorder.record();

      setStatus("recording");
      setDuration(0);

      // Manual duration tracking with max limit
      intervalRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= MAX_DURATION) {
            stopRecording();
            Alert.alert(
              "Limite atteinte",
              "L'enregistrement est limité à 15 minutes pour garantir la qualité du rapport.",
            );
          }
          return newDuration;
        });
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      Alert.alert("Erreur", "Impossible de lancer l'enregistrement");
    }
  };

  const stopRecording = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    try {
      const recorder = recorderRef.current;
      if (!recorder) return;

      await recorder.stop();
      const uri = recorder.uri;
      await setAudioModeAsync({ allowsRecording: false });

      if (uri) {
        setAudioUri(uri);
        setAudioSource("recorded");
        setStatus("review");
      }
    } catch (error) {
      console.log("Erreur lors de l'arrêt", error);
    }
  };

  const importFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      const file = result.assets[0];

      // Check durée import
      const d = await getAudioDurationInSeconds(file.uri);
      if (d > MAX_DURATION) {
        Alert.alert("Fichier trop long", "La limite est de 15 minutes.");
        return;
      }

      setAudioUri(file.uri);
      setDuration(d || 0);
      setAudioSource("imported");
      setStatus("review");
    }
  };

  const reset = useCallback(() => {
    setAudioUri(null);
    setDuration(0);
    setAudioSource(null);
    setStatus("idle");
  }, []);

  return {
    status,
    duration,
    audioUri,
    audioSource,
    startRecording,
    stopRecording,
    importFile,
    reset,
    maxDuration: MAX_DURATION,
  };
};
