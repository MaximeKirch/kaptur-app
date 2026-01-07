// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, ActivityIndicator, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import { useUserStore } from "../src/store/userStore";
import "../global.css";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import * as Notifications from "expo-notifications";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { hasCompletedOnboarding, checkOnboardingStatus } = useUserStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  usePushNotifications();

  // 1. Phase d'initialisation : On vérifie le token et l'onboarding au lancement
  useEffect(() => {
    const init = async () => {
      await checkAuth();
      await checkOnboardingStatus();
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
    const inOnboarding = segments[0] === "onboarding";

    if (!isAuthenticated && !inAuthGroup) {
      // Cas A : Pas connecté -> On l'envoie se logger
      router.replace("/(auth)/login");
    } else if (isAuthenticated && !hasCompletedOnboarding && !inOnboarding) {
      // Cas B : Connecté mais onboarding pas complété -> On l'envoie à l'onboarding
      router.replace("/onboarding");
    } else if (isAuthenticated && hasCompletedOnboarding && inAuthGroup) {
      // Cas C : Connecté, onboarding complété mais sur Login/Register -> On l'envoie à l'accueil
      router.replace("/(tabs)");
    } else if (isAuthenticated && hasCompletedOnboarding && inOnboarding) {
      // Cas D : Connecté, onboarding complété mais sur onboarding -> On l'envoie à l'accueil
      router.replace("/(tabs)");
    }

    // NOTE : On a supprimé la redirection automatique vers /paywall.
    // L'utilisateur est libre de naviguer tant qu'il a des crédits.
  }, [isAuthenticated, hasCompletedOnboarding, segments, isReady]);

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    if (Platform.OS === "ios") {
      Purchases.configure({
        apiKey: "test_uVWXbnqwCNxjBwHIaaBwdIBWPCg",
      });
    } else if (Platform.OS === "android") {
      Purchases.configure({
        apiKey: "test_uVWXbnqwCNxjBwHIaaBwdIBWPCg",
      });
    }
  }, []);

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
        <Stack.Screen name="onboarding" />
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
