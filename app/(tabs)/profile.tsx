import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { useUserStore } from "../../src/store/userStore";
import { api } from "../../src/services/api";

// Composant pour une ligne de menu
const MenuItem = ({
  icon,
  label,
  onPress,
  isDestructive = false,
  value = "",
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center justify-between p-4 bg-surface border-b border-zinc-800 last:border-b-0"
  >
    <View className="flex-row items-center">
      <View
        className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${isDestructive ? "bg-red-500/10" : "bg-zinc-800"}`}
      >
        <Ionicons
          name={icon}
          size={18}
          color={isDestructive ? "#ef4444" : "#a1a1aa"}
        />
      </View>
      <Text
        className={`font-medium ${isDestructive ? "text-red-500" : "text-zinc-200"}`}
      >
        {label}
      </Text>
    </View>
    <View className="flex-row items-center">
      {value ? <Text className="text-zinc-500 mr-2">{value}</Text> : null}
      {!isDestructive && (
        <Ionicons name="chevron-forward" size={16} color="#52525b" />
      )}
    </View>
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const credits = useUserStore((state) => state.credits);

  // --- ACTIONS ---

  const handleLogout = async () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Supprimer le compte",
      "Cette action est irréversible. Toutes vos données (rapports, crédits) seront perdues définitivement.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer définitivement",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/auth/delete-me");
              await logout();
              router.replace("/(auth)/login");
            } catch (error) {
              Alert.alert(
                "Erreur",
                "Impossible de supprimer le compte. Contactez le support.",
              );
            }
          },
        },
      ],
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert("Erreur", "Impossible d'ouvrir le lien"),
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6 pt-6">
        <Text className="text-3xl font-bold text-white mb-8">Mon Profil</Text>

        {/* --- CARTE IDENTITÉ --- */}
        <View className="bg-surface p-6 rounded-2xl border border-zinc-800 mb-8 items-center">
          <View className="w-20 h-20 bg-zinc-800 rounded-full justify-center items-center mb-4 border border-zinc-700">
            <Text className="text-2xl font-bold text-zinc-400">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <Text className="text-white text-lg font-bold">
            {user?.email || "Utilisateur"}
          </Text>
          <Text className="text-zinc-500 text-xs mb-4">
            ID: {user?.id?.split("-")[0]}...
          </Text>

          <View className="bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
            <Text className="text-primary font-bold">
              Solde : {credits} crédits ⚡
            </Text>
          </View>
        </View>

        {/* --- SECTION GÉNÉRALE --- */}
        <Text className="text-zinc-500 text-xs uppercase font-bold mb-2 ml-2">
          Général
        </Text>
        <View className="bg-surface rounded-xl overflow-hidden mb-8 border border-zinc-800">
          <MenuItem
            icon="document-text-outline"
            label="Conditions d'utilisation"
            onPress={() => openLink("https://google.com")} // À REMPLACER
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Politique de confidentialité"
            onPress={() => openLink("https://google.com")} // À REMPLACER
          />
          <MenuItem
            icon="mail-outline"
            label="Contacter le support"
            onPress={() => openLink("mailto:support@relevo.app")}
          />
        </View>

        {/* --- DANGER ZONE --- */}
        <Text className="text-zinc-500 text-xs uppercase font-bold mb-2 ml-2">
          Zone de danger
        </Text>
        <View className="bg-surface rounded-xl overflow-hidden mb-12 border border-zinc-800">
          <MenuItem
            icon="log-out-outline"
            label="Se déconnecter"
            onPress={handleLogout}
          />
          <MenuItem
            icon="trash-outline"
            label="Supprimer mon compte"
            isDestructive
            onPress={handleDeleteAccount}
          />
        </View>

        <Text className="text-zinc-700 text-center text-xs mb-8">
          Relevo v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
