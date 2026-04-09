import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useConsentStore } from "../src/store/consentStore";
import { useUserStore } from "../src/store/userStore";

export default function ConsentRequiredScreen() {
  const router = useRouter();
  const { grantConsent, revokeConsent } = useConsentStore();
  const { markOnboardingComplete } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleAcceptAfterAll = async () => {
    try {
      setIsLoading(true);
      await grantConsent();
      await markOnboardingComplete();
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Erreur lors de l'acceptation du consentement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueWithout = async () => {
    try {
      setIsLoading(true);
      // Enregistrer explicitement le refus
      await revokeConsent();
      await markOnboardingComplete();
      // Rediriger vers l'app avec empty state
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPrivacyPolicy = () => {
    Linking.openURL("https://getrelevo.com/privacy");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Icon */}
        <View className="items-center mb-6 mt-8">
          <View className="w-24 h-24 bg-yellow-500/10 rounded-full items-center justify-center border-2 border-yellow-500/30">
            <Ionicons name="lock-closed" size={48} color="#eab308" />
          </View>
        </View>

        {/* Titre */}
        <Text className="text-3xl font-bold text-white text-center mb-4">
          Consentement requis
        </Text>

        <Text className="text-zinc-400 text-center mb-8 px-4">
          Pour créer des rapports, Relevo doit traiter vos enregistrements via
          des services d'intelligence artificielle tiers.
        </Text>

        {/* Services utilisés */}
        <View className="bg-surface p-5 rounded-xl border border-zinc-800 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-purple-500/10 rounded-lg items-center justify-center mr-3">
              <Ionicons name="business-outline" size={18} color="#a855f7" />
            </View>
            <Text className="text-white font-bold text-base">
              Services IA utilisés
            </Text>
          </View>
          <Text className="text-zinc-400 text-sm leading-6 mb-2">
            • <Text className="text-white font-semibold">OpenAI Whisper</Text>:
            transcription audio
          </Text>
          <Text className="text-zinc-400 text-sm leading-6 mb-2">
            • <Text className="text-white font-semibold">Google Gemini</Text>:
            structuration du compte rendu
          </Text>
          <Text className="text-zinc-400 text-sm leading-6">
            • <Text className="text-white font-semibold">Amazon S3</Text>:
            stockage temporaire (supprimé après traitement)
          </Text>
        </View>

        {/* Ce que vous pouvez faire */}
        <View className="bg-green-500/5 border border-green-500/20 p-5 rounded-xl mb-4">
          <Text className="text-green-400 font-bold text-sm mb-3">
            ✅ Sans consentement, vous pourrez :
          </Text>
          <Text className="text-green-300 text-sm leading-6 mb-1">
            • Consulter vos rapports existants
          </Text>
          <Text className="text-green-300 text-sm leading-6 mb-1">
            • Gérer votre compte et vos paramètres
          </Text>
          <Text className="text-green-300 text-sm leading-6">
            • Explorer l'application
          </Text>
        </View>

        {/* Ce que vous ne pouvez pas faire */}
        <View className="bg-red-500/5 border border-red-500/20 p-5 rounded-xl mb-6">
          <Text className="text-red-400 font-bold text-sm mb-3">
            ❌ Mais vous ne pourrez PAS :
          </Text>
          <Text className="text-red-300 text-sm leading-6 mb-1">
            • Créer de nouveaux rapports
          </Text>
          <Text className="text-red-300 text-sm leading-6 mb-1">
            • Enregistrer de nouveaux audios
          </Text>
          <Text className="text-red-300 text-sm leading-6">
            • Importer des fichiers audio pour analyse
          </Text>
        </View>

        {/* Info */}
        <View className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl mb-8">
          <Text className="text-blue-200 text-xs leading-5">
            ℹ️ Vous pourrez donner votre consentement à tout moment depuis votre
            profil si vous changez d'avis.
          </Text>
        </View>

        {/* Boutons */}
        <View className="mb-4">
          <TouchableOpacity
            onPress={handleAcceptAfterAll}
            disabled={isLoading}
            className="bg-primary py-4 rounded-xl mb-3 flex-row items-center justify-center"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text className="text-white font-bold ml-2 text-base">
                  J'accepte et je continue
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleContinueWithout}
            disabled={isLoading}
            className="bg-surface py-4 rounded-xl border border-zinc-800 mb-3"
          >
            <Text className="text-zinc-300 font-semibold text-center text-base">
              Continuer sans cette fonction
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenPrivacyPolicy}
            className="py-3"
          >
            <Text className="text-primary text-sm text-center underline">
              Consulter notre politique de confidentialité
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
