// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, ActivityIndicator, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import { useUserStore } from "../src/store/userStore";
import "../global.css";

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { hasCompletedOnboarding, checkOnboardingStatus } = useUserStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  // 1. Phase d'initialisation : On vérifie le token et l'onboarding au lancement
  // useEffect(() => {
  //   const init = async () => {
  //     await checkAuth();
  //     await checkOnboardingStatus();
  //     setIsReady(true);
  //   };
  //   init();
  // }, []);
  //
  // Phase d'initialisation séquentielle pour éviter les crashs natifs
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // 1. Délai initial pour laisser iOS et React Native s'initialiser complètement
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!isMounted) return;

        // 2. On libère l'UI d'abord (sans modules natifs)
        setIsReady(true);

        // 3. Délai supplémentaire pour que l'UI soit montée
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!isMounted) return;

        // 4. Initialiser les stores (auth et onboarding)
        checkAuth().catch((e) => console.log("Auth check failed:", e));
        checkOnboardingStatus().catch((e) =>
          console.log("Onboarding check failed:", e),
        );
      } catch (error) {
        console.error("Critical init error:", error);
        // On libère quand même l'UI pour éviter un écran blanc infini
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    init();
    return () => {
      isMounted = false;
    };
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
