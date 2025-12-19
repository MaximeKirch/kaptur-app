// app/(auth)/login.tsx
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
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { useUserStore } from "../../src/store/userStore";
import { api } from "../../src/services/api";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const setCredits = useUserStore((state) => state.setCredits);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Appel API
      const response = await api.post("/auth/login", { email, password });

      // 2. Stockage du token via le store
      const { auth, user } = response.data;

      await login(auth.accessToken, user);
      setCredits(user.credits ?? 0);

      // 3. Redirection vers l'app
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "Connexion impossible";
      Alert.alert("Echec", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background justify-center px-6"
    >
      <View className="mb-12">
        <Text className="text-4xl font-bold text-white mb-2">Kaptur.</Text>
        <Text className="text-text-muted text-lg">Bon retour parmi nous.</Text>
      </View>

      <View className="space-y-4">
        {/* Email Input */}
        <View>
          <Text className="text-text-muted mb-2 ml-1 text-sm font-medium">
            Email
          </Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-4 text-white text-base"
            placeholder="hello@kaptur.app"
            placeholderTextColor="#52525b" // Zinc 600
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password Input */}
        <View>
          <Text className="text-text-muted mb-2 ml-1 text-sm font-medium">
            Mot de passe
          </Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-4 text-white text-base"
            placeholder="••••••••"
            placeholderTextColor="#52525b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity className="items-end py-2">
          <Text className="text-primary text-sm font-medium">
            Mot de passe oublié ?
          </Text>
        </TouchableOpacity>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={isLoading}
          className={`w-full py-4 rounded-xl items-center mt-4 ${
            isLoading ? "bg-surface border border-border" : "bg-primary"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Se connecter</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View className="flex-row justify-center mt-8">
        <Text className="text-text-muted">Pas encore de compte ? </Text>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text className="text-primary font-bold">Créer un compte</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
