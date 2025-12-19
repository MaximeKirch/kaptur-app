// app/(auth)/register.tsx
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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Inscription
      // Assure-toi que ton backend attend { email, password, name }
      const response = await api.post("/auth/register", {
        email,
        password,
        name,
      });

      // 2. Auto-Login immédiat
      // Si ton API register renvoie déjà le token, utilise-le.
      // Sinon, on fait un appel login transparent juste après.
      const { auth, user } = response.data;

      if (auth.accessToken) {
        await loginAction(auth.accessToken, user);
        setCredits(user.credits ?? 3);
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
            Rejoignez Kaptur et commencez à scanner.
          </Text>
        </View>

        <View className="space-y-4">
          {/* Name Input */}
          <View>
            <Text className="text-zinc-400 mb-2 ml-1 text-sm font-medium">
              Nom complet
            </Text>
            <TextInput
              className="bg-surface border border-zinc-800 rounded-xl px-4 py-4 text-white text-base focus:border-primary"
              placeholder="Elon Musk"
              placeholderTextColor="#52525b"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email Input */}
          <View>
            <Text className="text-zinc-400 mb-2 ml-1 text-sm font-medium">
              Email
            </Text>
            <TextInput
              className="bg-surface border border-zinc-800 rounded-xl px-4 py-4 text-white text-base focus:border-primary"
              placeholder="elon@kaptur.app"
              placeholderTextColor="#52525b"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password Input */}
          <View>
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
            En vous inscrivant, vous obtenez 3 crédits offerts pour tester
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
