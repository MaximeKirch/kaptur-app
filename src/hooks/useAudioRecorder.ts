import { useState, useEffect, useCallback } from "react";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { Alert } from "react-native";
import { getAudioDurationInSeconds } from "../utils/audioUtils";

export type RecordingStatus = "idle" | "recording" | "review";

export const useAudioRecorder = () => {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  // Gestion du Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "recording") {
      interval = setInterval(() => setDuration((d) => d + 1), 1000);
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
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(recording);
      setStatus("recording");
      setDuration(0);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de lancer l'enregistrement");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
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
      setAudioUri(file.uri);
      // Pour un fichier importé, on essaie de récupérer sa durée réelle
      const d = await getAudioDurationInSeconds(file.uri);
      setDuration(d || 0);
      setStatus("review");
    }
  };

  const reset = useCallback(() => {
    setAudioUri(null);
    setDuration(0);
    setStatus("idle");
    setRecording(null);
  }, []);

  return {
    status,
    duration,
    audioUri,
    startRecording,
    stopRecording,
    importFile,
    reset,
  };
};
