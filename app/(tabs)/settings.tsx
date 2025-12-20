// app/(tabs)/settings.tsx
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { useAuthStore } from "../../src/store/authStore";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-background justify-center items-center p-6">
      <Text className="text-white text-2xl font-bold mb-8">Paramètres</Text>

      <TouchableOpacity
        onPress={handleLogout}
        className="w-auto bg-zinc-900 border border-zinc-800 py-4 px-12 mx-auto rounded-xl items-center"
      >
        <Text className="text-red-500 font-bold text-lg">Se déconnecter</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
