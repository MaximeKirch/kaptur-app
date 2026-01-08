import { useState, useEffect, useCallback, useRef } from "react";
// import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { Alert, Linking, Platform } from "react-native";
import { getAudioDurationInSeconds } from "../utils/audioUtils";

export type RecordingStatus = "idle" | "recording" | "review";
export type AudioSource = "recorded" | "imported";

const MAX_DURATION = 900; // 15 minutes en secondes

// Type stub
type Recording = any;
type PermissionResponse = any;

export const useAudioRecorder = () => {
  // COMMENTED OUT FOR DEBUGGING
  // const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [permissionResponse, setPermissionResponse] = useState<PermissionResponse | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioSource, setAudioSource] = useState<AudioSource | null>(null);

  // Ref pour accéder à l'instance recording dans le setInterval sans dépendance
  const recordingRef = useRef<Recording | null>(null);

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
    // COMMENTED OUT FOR DEBUGGING
    // try {
    //   // Vérifier et demander la permission si nécessaire
    //   if (permissionResponse?.status !== "granted") {
    //     const { status } = await requestPermission();

    //     // Si l'utilisateur refuse la permission
    //     if (status !== "granted") {
    //       Alert.alert(
    //         "Permission microphone requise",
    //         "Relevo a besoin d'accéder à votre microphone pour enregistrer vos comptes rendus. C'est le cœur de l'application.\n\nVeuillez autoriser l'accès dans les paramètres.",
    //         [
    //           { text: "Annuler", style: "cancel" },
    //           {
    //             text: "Ouvrir les paramètres",
    //             onPress: () => {
    //               if (Platform.OS === "ios") {
    //                 Linking.openURL("app-settings:");
    //               } else {
    //                 Linking.openSettings();
    //               }
    //             },
    //           },
    //         ]
    //       );
    //       return;
    //     }
    //   }

    //   await Audio.setAudioModeAsync({
    //     allowsRecordingIOS: true,
    //     playsInSilentModeIOS: true,
    //   });
    //   const { recording: newRecording } = await Audio.Recording.createAsync(
    //     Audio.RecordingOptionsPresets.HIGH_QUALITY,
    //   );

    //   setRecording(newRecording);
    //   recordingRef.current = newRecording; // Mise à jour de la ref

    //   setStatus("recording");
    //   setDuration(0);
    // } catch (err) {
    //   Alert.alert("Erreur", "Impossible de lancer l'enregistrement");
    // }
    console.log("Audio recording disabled for debugging");
    Alert.alert("Fonctionnalité désactivée", "L'enregistrement audio est temporairement désactivé pour le debugging");
  };

  const stopRecording = async () => {
    // COMMENTED OUT FOR DEBUGGING
    // // On utilise la ref ou le state, selon ce qui est disponible
    // const recorder = recording || recordingRef.current;
    // if (!recorder) return;

    // try {
    //   await recorder.stopAndUnloadAsync();
    // } catch (error) {
    //   console.log("Erreur lors de l'arrêt", error);
    // }

    // const uri = recorder.getURI();

    // setRecording(null);
    // recordingRef.current = null;
    // await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    // if (uri) {
    //   setAudioUri(uri);
    //   setAudioSource("recorded");
    //   setStatus("review");
    // }
    console.log("Stop recording disabled for debugging");
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
    setRecording(null);
    recordingRef.current = null;
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
