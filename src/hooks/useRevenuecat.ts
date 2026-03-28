import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import Purchases, { LOG_LEVEL, PurchasesPackage } from "react-native-purchases";
import { useUserStore } from "../store/userStore";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import Constants from "expo-constants";

export const useRevenueCat = () => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setCredits = useUserStore((state) => state.setCredits);

  useEffect(() => {
    const initRevenueCatAndLinkUser = async () => {
      try {
        setIsReady(false);
        setError(null);

        // 1. Configurer RevenueCat
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        const apiKey =
          Platform.OS === "ios"
            ? Constants.expoConfig?.extra?.revenueCatApiKeyIOS ||
              process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
            : Constants.expoConfig?.extra?.revenueCatApiKeyAndroid ||
              process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

        if (!apiKey) {
          console.warn("⚠️ RevenueCat API key not configured");
          setError("Configuration manquante");
          return;
        }

        Purchases.configure({ apiKey });
        console.log("✅ RevenueCat initialized");

        // 2. Récupérer l'utilisateur depuis le store
        const user = useAuthStore.getState().user;

        if (!user?.id) {
          // Attendre un peu que l'API /auth/me réponde
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const retryUser = useAuthStore.getState().user;
          if (!retryUser?.id) {
            setError("Impossible de charger votre compte");
            return;
          }
        }

        const finalUser = useAuthStore.getState().user;

        // 3. Lier l'utilisateur à RevenueCat
        console.log("🔗 Liaison de l'utilisateur à RevenueCat...");
        const customerInfo = await Purchases.logIn(finalUser!.id.toString());

        const offerings = await Purchases.getOfferings();
        if (
          offerings.current !== null &&
          offerings.current.availablePackages.length !== 0
        ) {
          setPackages(offerings.current.availablePackages);
        } else {
          console.warn("⚠️ Aucun package disponible");
          setError("Aucun package disponible");
          return;
        }

        // 5. Tout est prêt !
        console.log("🎉 RevenueCat prêt !");
        setIsReady(true);
      } catch (error: any) {
        console.error("❌ Erreur d'initialisation RevenueCat:", error);
        setError(error.message || "Erreur d'initialisation");
      }
    };

    initRevenueCatAndLinkUser();
  }, []);

  /**
   * Récupère les crédits mis à jour depuis le backend avec retry et exponential backoff
   * @param initialCredits - Crédits avant l'achat
   * @param maxRetries - Nombre maximum de tentatives (défaut: 3)
   * @returns true si les crédits ont été mis à jour, false sinon
   */
  const fetchUpdatedCredits = async (
    initialCredits: number,
    maxRetries: number = 3,
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Récupérer les crédits depuis le backend
        const response = await api.get("/auth/me");
        const newCredits = response.data.credits;

        console.log(`💰 Credits: ${initialCredits} → ${newCredits}`);

        // Vérifier si les crédits ont été mis à jour
        if (newCredits > initialCredits) {
          setCredits(newCredits);
          console.log(`✅ Credits updated successfully!`);
          return true;
        }

        console.log(`⏳ Credits not updated yet, retrying...`);
      } catch (error) {
        console.error(
          `❌ Error fetching credits (attempt ${attempt + 1}):`,
          error,
        );
      }
    }

    // Après tous les retries, forcer une mise à jour depuis l'API
    try {
      const response = await api.get("/auth/me");
      setCredits(response.data.credits);
    } catch (error) {
      console.error("❌ Final credits fetch failed:", error);
    }

    return false;
  };

  const buyPackage = async (pack: PurchasesPackage) => {
    if (isPurchasing) return;

    try {
      setIsPurchasing(true);

      // Sauvegarder les crédits actuels pour détecter la mise à jour
      const currentCredits = useUserStore.getState().credits;
      const purchaseResult = await Purchases.purchasePackage(pack);

      console.log("✅ Purchase completed:", {
        productId: pack.product.identifier,
        transactionId: purchaseResult.customerInfo.originalAppUserId,
      });

      // Attendre que le webhook RevenueCat mette à jour le backend
      // puis récupérer les crédits mis à jour avec retry
      const creditsUpdated = await fetchUpdatedCredits(currentCredits);

      if (creditsUpdated) {
        Alert.alert(
          "Succès ! 🎉",
          "Vos crédits ont été ajoutés à votre compte.",
        );
      } else {
        // Les crédits n'ont pas été mis à jour après 3 retries (~7 secondes)
        Alert.alert(
          "Achat en cours de traitement",
          "Votre achat a été validé par l'App Store. Vos crédits seront ajoutés dans quelques instants. Si vous ne les voyez pas apparaître d'ici 1 minute, redémarrez l'application.",
        );
      }
    } catch (error: any) {
      console.log("❌ Purchase error:", error);

      if (!error.userCancelled) {
        Alert.alert(
          "Erreur",
          "Une erreur est survenue lors de l'achat. Veuillez réessayer.",
        );
        console.error("Purchase error:", error);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  return { packages, isPurchasing, isReady, error, buyPackage };
};
