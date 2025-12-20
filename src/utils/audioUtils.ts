// src/utils/audioUtils.ts
import { Audio } from "expo-av";

/**
 * Récupère la durée d'un fichier audio en secondes.
 * Charge le fichier temporairement juste pour lire les métadonnées.
 */
export const getAudioDurationInSeconds = async (
  uri: string,
): Promise<number> => {
  try {
    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }, // On ne veut pas jouer, juste lire les infos
    );

    let duration = 0;

    if (status.isLoaded && status.durationMillis) {
      duration = status.durationMillis / 1000;
    }

    // CRUCIAL : On libère la mémoire immédiatement
    await sound.unloadAsync();

    return duration;
  } catch (error) {
    console.error("Erreur lors de l'analyse du fichier audio:", error);
    // En cas d'erreur, on retourne 0 (le composant UI devra gérer ça)
    return 0;
  }
};

/**
 * Calcule le coût en crédits selon la règle métier.
 * Règle actuelle : 1 crédit par minute entamée.
 */
export const calculateCost = (durationSeconds: number): number => {
  if (durationSeconds <= 0) return 0;

  // Math.ceil(61 / 60) = 2 crédits
  // Math.ceil(45 / 60) = 1 crédit
  const minutes = Math.ceil(durationSeconds / 60);

  // Sécurité : minimum 1 crédit
  return Math.max(1, minutes);
};

/**
 * Formate un nombre de secondes en chaîne "MM:SS"
 * Ex: 65 -> "1:05"
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};
