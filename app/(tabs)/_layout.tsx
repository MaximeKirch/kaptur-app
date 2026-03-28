// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useEffect } from "react";
import { usePushNotifications } from "../../src/hooks/usePushNotifications";
import { useAuthStore } from "../../src/store/authStore";
import * as Notifications from "expo-notifications";

export default function TabLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

  usePushNotifications({ enabled: isAuthenticated });

  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        try {
          const data = response?.notification?.request?.content?.data;
          const jobId = data?.jobId;

          if (jobId) {
            // Navigation vers la page de détail du job
            router.push({
              pathname: "/job/[id]",
              params: { id: jobId },
            } as any);
          }
        } catch (error) {
          console.error("Error handling notification response:", error);
        }
      },
    );

    return () => subscription.remove();
  }, [isAuthenticated]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#09090b",
          borderTopWidth: 0,
          elevation: 0,
          height: 80,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#52525b",
        tabBarShowLabel: false,
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
