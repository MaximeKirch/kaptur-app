import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export function ConsentRequiredView() {
  const router = useRouter();

  const handleGrantConsent = () => {
    router.push("/data-consent");
  };

  return (
    <View className="items-center px-8">
      {/* Icon grisé */}
      <View className="w-32 h-32 rounded-full bg-zinc-800/30 border-4 border-zinc-800/50 justify-center items-center mb-8">
        <Ionicons name="mic-off" size={64} color="#52525b" />
      </View>

      {/* Titre */}
      <Text className="text-2xl font-bold text-white text-center mb-3">
        Enregistrement désactivé
      </Text>

      {/* Description */}
      <Text className="text-zinc-400 text-center leading-6 mb-8 px-4">
        Pour créer des rapports, vous devez accepter le traitement de vos
        enregistrements audio par nos services d'intelligence artificielle.
      </Text>

      {/* Info card */}
      <View className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl mb-8 w-full">
        <Text className="text-yellow-200 text-sm leading-6 text-center">
          <Text className="font-semibold">Services utilisés :</Text> OpenAI
          Whisper (transcription), Google Gemini (structuration), AWS S3
          (stockage temporaire)
        </Text>
      </View>

      {/* Bouton principal */}
      <TouchableOpacity
        onPress={handleGrantConsent}
        className="bg-primary py-4 px-8 rounded-xl shadow-lg shadow-blue-500/20 mb-4 w-full"
      >
        <View className="flex-row items-center justify-center">
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
          <Text className="text-white text-center text-base font-bold ml-2">
            Donner mon consentement
          </Text>
        </View>
      </TouchableOpacity>

      {/* Lien secondaire */}
      <TouchableOpacity
        onPress={() => router.push("/consent-required")}
        className="py-3"
      >
        <Text className="text-primary text-sm text-center underline">
          En savoir plus
        </Text>
      </TouchableOpacity>
    </View>
  );
}
