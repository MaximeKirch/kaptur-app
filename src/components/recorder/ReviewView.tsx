import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatTime } from "../../utils/audioUtils";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";

interface Props {
  uri: string;
  duration: number;
  cost: number;
  hasCredits: boolean;
  isSending: boolean;
  onReset: () => void;
  onAnalyze: () => void;
  onPaywall: () => void;
}

export const ReviewView = ({
  uri,
  duration,
  cost,
  hasCredits,
  isSending,
  onReset,
  onAnalyze,
  onPaywall,
}: Props) => {
  const { isPlaying, togglePlay } = useAudioPlayer(uri);

  return (
    <View className="w-full bg-surface p-6 rounded-3xl border border-zinc-800">
      {/* Header avec bouton poubelle */}
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-zinc-400 font-medium">Aperçu</Text>
        <TouchableOpacity onPress={onReset}>
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Lecteur Audio */}
      <View className="flex-row items-center justify-between mb-8">
        <TouchableOpacity
          onPress={togglePlay}
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

      {/* Actions */}
      {isSending ? (
        <View className="py-4 items-center">
          <ActivityIndicator color="#3b82f6" />
          <Text className="text-zinc-500 text-xs mt-2">Envoi en cours...</Text>
        </View>
      ) : hasCredits ? (
        <TouchableOpacity
          onPress={onAnalyze}
          className="w-full py-4 rounded-xl items-center bg-primary shadow-lg shadow-blue-500/20 flex-row justify-center space-x-2"
        >
          <Text className="text-white font-bold text-lg mr-2">
            Analyser l'audio
          </Text>
          <Ionicons name="arrow-up-circle" size={24} color="white" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onPaywall}
          className="w-full py-4 rounded-xl items-center bg-zinc-800 border border-zinc-700"
        >
          <Text className="text-white font-bold">Crédits insuffisants</Text>
          <Text className="text-zinc-500 text-xs mt-1">
            Recharger pour continuer
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
