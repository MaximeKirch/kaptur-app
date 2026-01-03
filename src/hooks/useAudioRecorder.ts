import { useState, useEffect, useCallback, useRef } from "react";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { Alert } from "react-native";
import { getAudioDurationInSeconds } from "../utils/audioUtils";

export type RecordingStatus = "idle" | "recording" | "review";

const MAX_DURATION = 900; // 15 minutes en secondes

export const useAudioRecorder = () => {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  // Ref pour accéder à l'instance recording dans le setInterval sans dépendance
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Gestion du Timer et de la Limite 15 min
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === "recording") {
      interval = setInterval(() => {
        setDuration((prevDuration) => {
          // SÉCURITÉ : Arrêt automatique à 15 minutes
          if (prevDuration >= MAX_DURATION) {
            stopRecording(); // On arrête proprement
            Alert.alert(
              "Limite atteinte",
              "L'enregistrement est limité à 15 minutes pour garantir la qualité du rapport.",
            );
            return prevDuration;
          }
          return prevDuration + 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [status]);

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== "granted") {
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      recordingRef.current = newRecording; // Mise à jour de la ref

      setStatus("recording");
      setDuration(0);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de lancer l'enregistrement");
    }
  };

  const stopRecording = async () => {
    // On utilise la ref ou le state, selon ce qui est disponible
    const recorder = recording || recordingRef.current;
    if (!recorder) return;

    try {
      await recorder.stopAndUnloadAsync();
    } catch (error) {
      console.log("Erreur lors de l'arrêt", error);
    }

    const uri = recorder.getURI();

    setRecording(null);
    recordingRef.current = null;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    if (uri) {
      setAudioUri(uri);
      setStatus("review");
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
      setStatus("review");
    }
  };

  const reset = useCallback(() => {
    setAudioUri(null);
    setDuration(0);
    setStatus("idle");
    setRecording(null);
    recordingRef.current = null;
  }, []);

  return {
    status,
    duration,
    audioUri,
    startRecording,
    stopRecording,
    importFile,
    reset,
    maxDuration: MAX_DURATION,
  };
};
