// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, ActivityIndicator, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import { useUserStore } from "../src/store/userStore";
import "../global.css";
// TODO: Réactiver quand compatible avec new arch
// import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

// // Configuration Sentry optimisée pour production
// Sentry.init({
//   dsn: "https://2abbcbb2bf791d888680cfc21ada9176@o4510675476152320.ingest.de.sentry.io/4510675479494736",
//
//   // Environnement et release tracking pour source maps
//   environment: __DEV__ ? "development" : "production",
//   release: `com.maximekirch.relevo@${Constants.expoConfig?.version || "1.0.0"}`,
//   dist: Constants.expoConfig?.ios?.buildNumber?.toString() || "1",
//
//   // Seulement actif en production (désactivé en développement)
//   enabled: true,
//
//   // Performance monitoring
//   tracesSampleRate: 1.0, // 100% initialement, à réduire à 0.2 plus tard
//
//   // Adds more context data to events
//   sendDefaultPii: true,
//
//   // Enable Logs
//   enableLogs: true,
//
//   // Privacy: Filtrer les données sensibles
//   beforeSend(event, hint) {
//     // Filtrer les erreurs réseau non critiques
//     const error = hint.originalException;
//     if (error && typeof error === "object" && "message" in error) {
//       const message = String(error.message);
//
//       // Réduire la priorité des erreurs réseau
//       if (
//         message.includes("Network request failed") ||
//         message.includes("timeout of") ||
//         message.includes("Request aborted")
//       ) {
//         event.level = "warning";
//       }
//     }
//
//     // Supprimer les adresses IP
//     if (event.user) {
//       delete event.user.ip_address;
//     }
//
//     return event;
//   },
//
//   // Breadcrumbs: Filtrer les informations sensibles
//   beforeBreadcrumb(breadcrumb) {
//     // Redacter les headers sensibles dans les breadcrumbs HTTP
//     if (breadcrumb.category === "http" && breadcrumb.data) {
//       if (breadcrumb.data.headers) {
//         breadcrumb.data.headers = {
//           ...breadcrumb.data.headers,
//           Authorization: "[Filtered]",
//         };
//       }
//     }
//
//     // Limiter les breadcrumbs console
//     if (breadcrumb.category === "console") {
//       return breadcrumb.level === "error" ? breadcrumb : null;
//     }
//
//     return breadcrumb;
//   },
// });

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, checkAuth, user } = useAuthStore();
  const { hasCompletedOnboarding, checkOnboardingStatus } = useUserStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  // Définir le contexte utilisateur dans Sentry
  // useEffect(() => {
  //   if (user?.id) {
  //     Sentry.setUser({
  //       id: user.id.toString(),
  //       email: user.email,
  //       username: user.username || user.email,
  //     });
  //   } else {
  //     Sentry.setUser(null);
  //   }
  // }, [user]);

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
  // Phase d'initialisation optimisée : tout charger en parallèle
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // Breadcrumb: Début de l'initialisation
        // Sentry.addBreadcrumb({
        //   category: "app.lifecycle",
        //   message: "App initialization started",
        //   level: "info",
        // });

        // Charger auth, onboarding et crédits en parallèle (avec timeout de sécurité)
        await Promise.all([
          checkAuth().catch((e) => {
            console.log("Auth check failed:", e);
            // Sentry.captureException(e, {
            //   tags: { context: "auth_check" },
            //   level: "warning",
            // });
          }),
          checkOnboardingStatus().catch((e) => {
            console.log("Onboarding check failed:", e);
            // Sentry.captureException(e, {
            //   tags: { context: "onboarding_check" },
            //   level: "warning",
            // });
          }),
        ]);

        if (!isMounted) return;

        // Tout est chargé, on peut afficher l'UI
        setIsReady(true);
      } catch (error) {
        console.error("Critical init error:", error);

        // Capturer les erreurs critiques d'initialisation
        // Sentry.captureException(error, {
        //   level: "fatal",
        //   tags: { context: "app_init" },
        // });

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
    const currentRoute = segments.join("/") || "/";

    // Breadcrumb: Tracking de navigation
    // Sentry.addBreadcrumb({
    //   category: "navigation",
    //   message: `Navigated to ${currentRoute}`,
    //   level: "info",
    //   data: {
    //     route: currentRoute,
    //     isAuthenticated,
    //     hasCompletedOnboarding,
    //   },
    // });

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
