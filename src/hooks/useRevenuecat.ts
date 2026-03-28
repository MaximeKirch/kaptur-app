import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import Purchases, { LOG_LEVEL, PurchasesPackage } from "react-native-purchases";
import { useUserStore } from "../store/userStore";
import { api } from "../services/api";
import Constants from "expo-constants";

export const useRevenueCat = () => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const setCredits = useUserStore((state) => state.setCredits);

  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        // Configuration RevenueCat
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        const apiKey =
          Platform.OS === "ios"
            ? Constants.expoConfig?.extra?.revenueCatApiKeyIOS ||
              process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
            : Constants.expoConfig?.extra?.revenueCatApiKeyAndroid ||
              process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

        if (!apiKey) {
          console.warn("⚠️ RevenueCat API key not configured");
          return;
        }

        Purchases.configure({ apiKey });
        console.log("✅ RevenueCat initialized");

        // Charger les packages disponibles
        const offerings = await Purchases.getOfferings();
        if (
          offerings.current !== null &&
          offerings.current.availablePackages.length !== 0
        ) {
          setPackages(offerings.current.availablePackages);
          console.log(
            "📦 Packages loaded:",
            offerings.current.availablePackages.length,
          );
        }
      } catch (error) {
        console.error("❌ RevenueCat initialization error:", error);
      }
    };

    initRevenueCat();
  }, []);

  /**
   * Récupère les crédits mis à jour depuis le backend avec retry et exponential backoff
   * @param initialCredits - Crédits avant l'achat
   * @param maxRetries - Nombre maximum de tentatives (défaut: 3)
   * @returns true si les crédits ont été mis à jour, false sinon
   */
  const fetchUpdatedCredits = async (
    initialCredits: number,
    maxRetries: number = 3
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        console.log(`🔄 Fetching credits (attempt ${attempt + 1}/${maxRetries})...`);

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
        console.error(`❌ Error fetching credits (attempt ${attempt + 1}):`, error);
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

      console.log("🛒 Starting purchase...");
      const purchaseResult = await Purchases.purchasePackage(pack);

      console.log("✅ Purchase completed:", {
        productId: pack.product.identifier,
        transactionId: purchaseResult.customerInfo.originalAppUserId,
      });

      // Afficher un message de validation en cours
      Alert.alert(
        "Achat validé",
        "Validation de votre achat en cours...",
        [{ text: "OK" }],
        { cancelable: false }
      );

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

  return { packages, isPurchasing, buyPackage };
};
