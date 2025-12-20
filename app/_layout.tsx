// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import "../global.css";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import * as Notifications from "expo-notifications";

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  usePushNotifications();

  // 1. Phase d'initialisation : On vérifie le token au lancement
  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    // Écouteur de clic sur notification
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const jobId = response.notification.request.content.data.jobId;

        if (jobId) {
          // On navigue vers la page de détail
          // Note: router.push peut nécessiter d'être dans un setTimeout ou d'attendre que l'app soit prête
          router.push({
            pathname: "/job/[id]",
            params: { id: jobId },
          } as any);
        }
      },
    );

    return () => subscription.remove();
  }, []);

  // 2. Phase de Protection des routes
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // Cas A : Pas connecté -> On l'envoie se logger
      // Note : replace() évite qu'il puisse faire "retour" vers une page protégée
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Cas B : Connecté mais traîne sur Login/Register -> On l'envoie à l'accueil
      router.replace("/(tabs)");
    }

    // NOTE : On a supprimé la redirection automatique vers /paywall.
    // L'utilisateur est libre de naviguer tant qu'il a des crédits.
  }, [isAuthenticated, segments, isReady]);

  // Loader pendant l'initialisation (très court)
  if (!isReady) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#09090b" }}>
      {" "}
      <StatusBar style="light" />
      {/* Texte blanc pour fond noir */}
      <Stack
        screenOptions={{
          headerShown: false,
          // Définit le fond par défaut pour toutes les pages (évite les flashs blancs)
          contentStyle: { backgroundColor: "#09090b" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: "modal",
          }}
        />
        <Stack.Screen name="(auth)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}
