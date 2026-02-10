import { useEffect, useRef } from "react";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

export const useAudioPlayer = (uri: string | null) => {
  const playerRef = useRef<AudioPlayer | null>(null);
  const isPlayingRef = useRef(false);

  // Lazy initialize player only when uri is available
  useEffect(() => {
    if (uri && !playerRef.current) {
      playerRef.current = createAudioPlayer(uri);
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, [uri]);

  const togglePlay = () => {
    if (!uri || !playerRef.current) return;

    const player = playerRef.current;

    if (isPlayingRef.current) {
      player.pause();
      isPlayingRef.current = false;
    } else {
      // If at the end, seek to start
      if (player.currentTime >= player.duration && player.duration > 0) {
        player.seekTo(0);
      }
      player.play();
      isPlayingRef.current = true;
    }
  };

  return { isPlaying: isPlayingRef.current, togglePlay };
};
