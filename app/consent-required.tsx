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

  const handleGoBack = () => {
    // Retour à l'écran de consentement
    router.back();
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      // Import dynamique pour éviter les dépendances circulaires
      const { useAuthStore } = await import("../src/store/authStore");
      await useAuthStore.getState().logout();
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
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
          Consentement obligatoire
        </Text>

        <Text className="text-zinc-400 text-center mb-8 px-4 leading-6">
          Relevo est une application de génération de comptes rendus par intelligence artificielle.
          {"\n\n"}
          Sans le traitement de vos enregistrements par nos services IA, l'application ne peut pas fonctionner.
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

        {/* Pourquoi c'est nécessaire */}
        <View className="bg-yellow-500/5 border border-yellow-500/20 p-5 rounded-xl mb-6">
          <Text className="text-yellow-400 font-bold text-sm mb-3">
            ⚠️ Pourquoi ce consentement est nécessaire
          </Text>
          <Text className="text-yellow-200 text-sm leading-6">
            L'intégralité de Relevo repose sur le traitement de vos enregistrements audio par des services d'intelligence artificielle (OpenAI Whisper pour la transcription, Google Gemini pour la structuration).
            {"\n\n"}
            Sans ce traitement, l'application ne peut pas générer de comptes rendus.
          </Text>
        </View>

        {/* Vos options */}
        <View className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-xl mb-8">
          <Text className="text-blue-400 font-bold text-sm mb-3">
            🔐 Vos données sont protégées
          </Text>
          <Text className="text-blue-200 text-sm leading-6 mb-2">
            • Transmission chiffrée (HTTPS)
          </Text>
          <Text className="text-blue-200 text-sm leading-6 mb-2">
            • Conformité RGPD
          </Text>
          <Text className="text-blue-200 text-sm leading-6 mb-2">
            • Suppression des fichiers audio après traitement (24h max)
          </Text>
          <Text className="text-blue-200 text-sm leading-6">
            • Révocation possible à tout moment depuis votre profil
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
            onPress={handleGoBack}
            disabled={isLoading}
            className="bg-surface py-4 rounded-xl border border-zinc-800 mb-3 flex-row items-center justify-center"
          >
            <Ionicons name="arrow-back" size={18} color="#a1a1aa" />
            <Text className="text-zinc-400 font-semibold text-center text-base ml-2">
              Retour
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            disabled={isLoading}
            className="py-3 flex-row items-center justify-center mb-3"
          >
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text className="text-red-500 text-sm text-center ml-2">
              Me déconnecter
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
