import { View, Text, TouchableOpacity } from "react-native";
import { formatTime } from "../../utils/audioUtils";

interface Props {
  duration: number;
  cost: number;
  onStop: () => void;
}

export const RecordingView = ({ duration, cost, onStop }: Props) => (
  <View className="items-center">
    <Text className="text-6xl font-variant-numeric text-white mb-4 tracking-widest font-thin">
      {formatTime(duration)}
    </Text>
    <View className="bg-zinc-900 px-4 py-2 rounded-full mb-12 border border-zinc-800">
      <Text className="text-zinc-400">
        Coût actuel : <Text className="text-white font-bold">{cost} ⚡</Text>
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
