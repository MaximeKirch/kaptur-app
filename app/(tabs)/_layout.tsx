// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useEffect } from "react";
import { usePushNotifications } from "../../src/hooks/usePushNotifications";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

export default function TabLayout() {
  // Initialiser les notifications maintenant que l'utilisateur est connecté et sur la page d'accueil
  usePushNotifications({ enabled: true });

  // Initialiser RevenueCat maintenant que l'utilisateur est connecté
  useEffect(() => {
    const setupPurchases = async () => {
      try {
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

        // On vérifie si déjà configuré pour éviter de reconfigurer
        const isConfigured = await Purchases.isConfigured();
        if (!isConfigured) {
          const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
          if (!apiKey) {
            console.error("RevenueCat API key is missing");
            return;
          }

          Purchases.configure({ apiKey });
          console.log("✅ RevenueCat configured successfully");
        }
      } catch (error) {
        console.error("❌ Error configuring RevenueCat:", error);
      }
    };

    setupPurchases();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // On gère nos propres headers dans les écrans
        tabBarStyle: {
          backgroundColor: "#09090b", // Zinc 950 (Ton background)
          borderTopWidth: 0, // Pas de ligne de séparation moche
          elevation: 0, // Pas d'ombre sur Android
          height: 80,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#3b82f6", // Primary Blue
        tabBarInactiveTintColor: "#52525b", // Zinc 600
        tabBarShowLabel: false, // Style minimaliste (juste les icones)
      }}
    >
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              className={` rounded-xl ${focused ? "bg-blue-500/10 p-0.5" : ""}`}
            >
              <Ionicons
                name={focused ? "document-text" : "document-text-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`rounded-xl ${focused ? "bg-blue-500/10 p-0.5" : ""}`}
            >
              <Ionicons
                name={focused ? "mic" : "mic-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              className={` rounded-xl ${focused ? "bg-blue-500/10 p-0.5" : ""}`}
            >
              <Ionicons
                name={focused ? "settings" : "settings-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
