import { useState, useEffect } from "react";
// import { Audio } from "expo-av";

export const useAudioPlayer = (uri: string | null) => {
  // const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // COMMENTED OUT FOR DEBUGGING
  // Nettoyage auto si le composant démonte ou si l'URI change
  // useEffect(() => {
  //   return () => {
  //     sound?.unloadAsync();
  //   };
  // }, [sound]);

  const togglePlay = async () => {
    // COMMENTED OUT FOR DEBUGGING
    // if (!uri) return;

    // if (sound) {
    //   // Si le son est déjà chargé
    //   if (isPlaying) {
    //     await sound.pauseAsync();
    //     setIsPlaying(false);
    //   } else {
    //     await sound.playAsync();
    //     setIsPlaying(true);
    //   }
    // } else {
    //   // Premier chargement
    //   const { sound: newSound } = await Audio.Sound.createAsync({ uri });
    //   setSound(newSound);
    //   setIsPlaying(true);
    //   await newSound.playAsync();

    //   // Callback fin de lecture
    //   newSound.setOnPlaybackStatusUpdate((status) => {
    //     if (status.isLoaded && status.didJustFinish) {
    //       setIsPlaying(false);
    //       newSound.setPositionAsync(0); // Rembobiner
    //     }
    //   });
    // }
    console.log("Audio playback disabled for debugging");
  };

  return { isPlaying, togglePlay };
};
