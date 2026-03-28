import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useConsentStore } from "../src/store/consentStore";

export default function DataConsentScreen() {
  const router = useRouter();
  const { grantConsent } = useConsentStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    try {
      setIsLoading(true);
      await grantConsent();
      // Rediriger vers l'app principale après acceptation
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Erreur lors de l'acceptation du consentement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    // Si l'utilisateur refuse, on le laisse explorer l'app
    // mais il ne pourra pas créer de rapports
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity
            onPress={handleDecline}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#71717a" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white">
            Protection des données
          </Text>
          <View className="w-10" />
        </View>

        {/* Icon */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center border border-primary/20">
            <Ionicons name="shield-checkmark" size={40} color="#3b82f6" />
          </View>
        </View>

        {/* Titre */}
        <Text className="text-2xl font-bold text-white text-center mb-4">
          Autorisation d'envoi de données
        </Text>

        <Text className="text-zinc-400 text-center mb-8">
          Pour générer vos rapports, nous devons traiter vos enregistrements via
          des services d'intelligence artificielle tiers.
        </Text>

        {/* --- CE QUI EST ENVOYÉ --- */}
        <View className="bg-surface p-4 rounded-xl border border-zinc-800 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-blue-500/10 rounded-lg items-center justify-center mr-3">
              <Ionicons name="cloud-upload-outline" size={18} color="#3b82f6" />
            </View>
            <Text className="text-white font-bold text-base">
              Données envoyées
            </Text>
          </View>
          <Text className="text-zinc-400 text-sm leading-6">
            • Vos enregistrements audio{"\n"}• Les transcriptions générées{"\n"}
            • Aucune donnée personnelle (email, nom, etc.)
          </Text>
        </View>

        {/* --- À QUI C'EST ENVOYÉ --- */}
        <View className="bg-surface p-4 rounded-xl border border-zinc-800 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-purple-500/10 rounded-lg items-center justify-center mr-3">
              <Ionicons name="business-outline" size={18} color="#a855f7" />
            </View>
            <Text className="text-white font-bold text-base">
              Services tiers utilisés
            </Text>
          </View>
          <Text className="text-zinc-400 text-sm leading-6">
            • <Text className="text-white font-semibold">OpenAI Whisper</Text>:
            transcription audio vers texte{"\n"}•{" "}
            <Text className="text-white font-semibold">Google Gemini</Text> :
            formatage et structuration du compte rendu{"\n"}•{" "}
            <Text className="text-white font-semibold">
              Amazon Web Services S3
            </Text>{" "}
            : stockage temporaire (supprimé après traitement){"\n"}
          </Text>
        </View>

        {/* --- PROTECTION --- */}
        <View className="bg-surface p-4 rounded-xl border border-zinc-800 mb-8">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-green-500/10 rounded-lg items-center justify-center mr-3">
              <Ionicons name="lock-closed-outline" size={18} color="#22c55e" />
            </View>
            <Text className="text-white font-bold text-base">
              Vos garanties
            </Text>
          </View>
          <Text className="text-zinc-400 text-sm leading-6">
            • Transmission chiffrée (HTTPS){"\n"}• Conformité RGPD{"\n"}•
            Révocation possible à tout moment{"\n"}• Politique de
            confidentialité complète disponible
          </Text>
        </View>

        {/* Disclaimer */}
        <View className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl mb-8">
          <Text className="text-yellow-200 text-xs leading-5">
            ⚠️ Sans votre consentement, vous pourrez explorer l'app mais ne
            pourrez pas créer de nouveaux rapports. Vous pouvez révoquer cette
            autorisation à tout moment depuis votre profil.
          </Text>
        </View>

        {/* Boutons */}
        <View className="mb-8">
          <TouchableOpacity
            onPress={handleAccept}
            disabled={isLoading}
            className="bg-primary py-4 rounded-xl mb-3 flex-row items-center justify-center"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text className="text-white font-bold ml-2">
                  J'accepte et je continue
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDecline}
            disabled={isLoading}
            className="bg-surface py-4 rounded-xl border border-zinc-800"
          >
            <Text className="text-zinc-400 font-semibold text-center">
              Refuser
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-zinc-600 text-xs text-center mb-8">
          En acceptant, vous consentez au traitement de vos enregistrements par
          OpenAI Whisper, Google Gemini et AWS S3 conformément à notre{" "}
          <Text className="text-primary">politique de confidentialité</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
