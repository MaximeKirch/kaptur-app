// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // On gère nos propres headers dans les écrans
        tabBarStyle: {
          backgroundColor: "#09090b", // Zinc 950 (Ton background)
          borderTopWidth: 0, // Pas de ligne de séparation moche
          elevation: 0, // Pas d'ombre sur Android
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#3b82f6", // Primary Blue
        tabBarInactiveTintColor: "#52525b", // Zinc 600
        tabBarShowLabel: false, // Style minimaliste (juste les icones)
      }}
    >
      <Tabs.Screen
        name="history" // Tu créeras ce fichier plus tard
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={` rounded-xl ${focused ? "bg-blue-500/10" : ""}`}>
              <Ionicons
                name={focused ? "time" : "time-outline"}
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
            <View className={` rounded-xl ${focused ? "bg-blue-500/10" : ""}`}>
              <Ionicons
                name={focused ? "scan" : "scan-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={` rounded-xl ${focused ? "bg-blue-500/10" : ""}`}>
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
