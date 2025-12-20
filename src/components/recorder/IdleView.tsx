import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  onRecord: () => void;
  onImport: () => void;
}

export const IdleView = ({ onRecord, onImport }: Props) => (
  <View className="w-full items-center space-y-6">
    <TouchableOpacity
      onPress={onRecord}
      className="w-40 h-40 rounded-full bg-red-500/10 border-4 border-red-500/20 justify-center items-center shadow-[0_0_30px_rgba(239,68,68,0.3)]"
    >
      <View className="w-32 h-32 rounded-full bg-red-500 justify-center items-center">
        <Ionicons name="mic" size={64} color="white" />
      </View>
    </TouchableOpacity>
    <Text className="text-zinc-400 text-lg font-medium">
      Appuyez pour enregistrer
    </Text>

    <Text className="text-zinc-600 my-4">- OU -</Text>

    <TouchableOpacity
      onPress={onImport}
      className="flex-row items-center space-x-2 bg-zinc-900 px-6 py-3 rounded-full border border-zinc-800"
    >
      <Ionicons name="cloud-upload-outline" size={20} color="white" />
      <Text className="text-zinc-300 font-medium pl-2">
        Importer un fichier
      </Text>
    </TouchableOpacity>
  </View>
);
