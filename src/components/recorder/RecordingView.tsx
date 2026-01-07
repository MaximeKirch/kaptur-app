import { View, Text, TouchableOpacity } from "react-native";
import { formatTime } from "../../utils/audioUtils";

interface Props {
  duration: number;
  cost: number;
  onStop: () => void;
}

export const RecordingView = ({ duration, onStop }: Props) => {
  const isNearLimit = duration > 840;

  return (
    <View className="items-center">
      {/* Timer avec limite */}
      <Text
        className={`text-6xl font-variant-numeric mb-2 tracking-widest font-thin ${isNearLimit ? "text-red-500" : "text-white"}`}
      >
        {formatTime(duration)}
      </Text>
      <Text className="text-zinc-600 text-sm mb-6">Limite max : 15:00</Text>

      {/* Coût Fixe */}
      <View className="bg-primary/20 px-4 py-2 rounded-full mb-12 border border-primary/30">
        <Text className="text-white font-medium">
          Coût du rapport :{" "}
          <Text className="font-bold text-white">1 Crédit</Text>
        </Text>
      </View>

      <TouchableOpacity
        onPress={onStop}
        className="w-24 h-24 rounded-full border-4 border-zinc-700 justify-center items-center bg-zinc-800"
      >
        <View className="w-10 h-10 rounded bg-red-500" />
      </TouchableOpacity>

      <Text className="text-zinc-500 mt-4">Appuyez pour terminer</Text>
    </View>
  );
};
