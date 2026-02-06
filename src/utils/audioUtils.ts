import { createAudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";

/**
 * Récupère la durée d'un fichier audio en secondes.
 * Crée un player temporaire pour lire les métadonnées.
 */
export const getAudioDurationInSeconds = async (
  uri: string,
): Promise<number> => {
  try {
    const player = createAudioPlayer(uri);

    return new Promise<number>((resolve) => {
      const checkLoaded = setInterval(() => {
        if (player.isLoaded) {
          const duration = player.duration;
          clearInterval(checkLoaded);
          player.remove();
          resolve(duration);
        }
      }, 50);

      // Timeout après 5 secondes
      setTimeout(() => {
        clearInterval(checkLoaded);
        player.remove();
        resolve(0);
      }, 5000);
    });
  } catch (error) {
    console.error("Erreur lors de l'analyse du fichier audio:", error);
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

/**
 * Vérifie si un fichier audio semble vide ou sans contenu exploitable.
 * Calcule le ratio taille/durée pour détecter les enregistrements sans paroles.
 * Un audio m4a haute qualité avec de la voix a typiquement 10-16 KB/s.
 * Un audio avec seulement du bruit/souffle fait environ 3-6 KB/s.
 * Un ratio < 5 KB/s indique probablement un enregistrement inutilisable.
 */
export const checkIfAudioIsEmpty = async (
  uri: string,
  durationSeconds: number,
): Promise<boolean> => {
  try {
    // Éviter division par zéro
    if (durationSeconds <= 0) return true;

    // Récupérer les informations du fichier
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists || !fileInfo.size) {
      return true; // Fichier inexistant ou vide
    }

    // Calculer le ratio en KB/s
    const fileSizeKB = fileInfo.size / 1024;
    const ratioKBPerSecond = fileSizeKB / durationSeconds;

    // Seuil ajusté : moins de 5 KB/s = probablement sans paroles exploitables
    // Cela détecte le silence complet ET le bruit ambiant sans voix
    const MIN_RATIO_KB_PER_SECOND = 20;

    console.log(
      `[Audio Check] Fichier: ${fileSizeKB.toFixed(2)} KB | Durée: ${durationSeconds}s | Ratio: ${ratioKBPerSecond.toFixed(2)} KB/s | Seuil: ${MIN_RATIO_KB_PER_SECOND} KB/s`,
    );

    return ratioKBPerSecond < MIN_RATIO_KB_PER_SECOND;
  } catch (error) {
    console.error("Erreur lors de la vérification de l'audio:", error);
    // En cas d'erreur, on considère l'audio comme valide pour ne pas bloquer l'utilisateur
    return false;
  }
};
