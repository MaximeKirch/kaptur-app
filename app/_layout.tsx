// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import "../global.css";

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  // 1. Phase d'initialisation : On vérifie le token au lancement
  useEffect(() => {
    const init = async () => {
      await checkAuth(); // Lit le SecureStore
      setIsReady(true); // Dit à l'app qu'elle peut s'afficher
    };
    init();
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
    <>
      <StatusBar style="light" /> {/* Texte blanc pour fond noir */}
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
            // Sur iOS, ça fait une jolie animation de carte qui monte
          }}
        />
        <Stack.Screen name="(auth)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}
