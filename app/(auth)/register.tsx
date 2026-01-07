import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";
import { useUserStore } from "@/src/store/userStore";

export default function RegisterScreen() {
  const router = useRouter();
  const loginAction = useAuthStore((state) => state.login);
  const setCredits = useUserStore((state) => state.setCredits);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/signup", {
        email,
        password,
      });

      const { auth, user } = response.data;

      if (auth.accessToken && auth.refreshToken) {
        await loginAction(auth.accessToken, auth.refreshToken, user);
        setCredits(user.credits ?? 5);
        router.replace("/(tabs)");
      } else {
        Alert.alert("Succès", "Compte créé ! Connectez-vous maintenant.");
        router.back();
      }
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "L'inscription a échoué";
      Alert.alert("Erreur", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
      >
        {/* Header avec bouton retour */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-8 w-10 h-10 bg-surface rounded-full items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View className="mb-10">
          <Text className="text-4xl font-bold text-white mb-2">
            Créer un compte
          </Text>
          <Text className="text-zinc-400 text-lg">
            Rejoignez Relevo et commencez à générer vos comptes rendu de
            chantier.
          </Text>
        </View>

        <View className="space-y-6">
          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-zinc-400 mb-2 ml-1 text-sm font-medium">
              Email
            </Text>
            <TextInput
              className="bg-surface border border-zinc-800 rounded-xl px-4 py-4 text-white text-base focus:border-primary"
              placeholder="elon@relevo.app"
              placeholderTextColor="#52525b"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text className="text-zinc-400 mb-2 ml-1 text-sm font-medium">
              Mot de passe
            </Text>
            <TextInput
              className="bg-surface border border-zinc-800 rounded-xl px-4 py-4 text-white text-base focus:border-primary"
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={isLoading}
            className={`w-full py-4 rounded-xl items-center mt-6 shadow-lg ${
              isLoading ? "bg-zinc-800" : "bg-primary"
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                S'inscrire gratuitement
              </Text>
            )}
          </TouchableOpacity>

          <Text className="text-zinc-500 text-xs text-center mt-4">
            En vous inscrivant, vous obtenez 5 crédits offerts pour tester
            l'application.
          </Text>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center mt-12">
          <Text className="text-zinc-400">Déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-primary font-bold">Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
