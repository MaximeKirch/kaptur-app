import { useAudioPlayer as useExpoPlayer, useAudioPlayerStatus } from "expo-audio";

export const useAudioPlayer = (uri: string | null) => {
  const player = useExpoPlayer(uri ?? null);
  const status = useAudioPlayerStatus(player);

  const togglePlay = () => {
    if (!uri) return;

    if (status.playing) {
      player.pause();
    } else {
      // expo-audio arrête à la fin, il faut rembobiner pour rejouer
      if (status.currentTime >= status.duration && status.duration > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return { isPlaying: status.playing, togglePlay };
};
