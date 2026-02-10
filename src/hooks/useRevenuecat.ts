import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
} from "react-native-purchases";
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

  const buyPackage = async (pack: PurchasesPackage) => {
    if (isPurchasing) return;

    try {
      setIsPurchasing(true);

      const purchaseResult = await Purchases.purchasePackage(pack);

      if (purchaseResult.customerInfo.entitlements.active["premium"]) {
        Alert.alert("Succès", "Achat effectué avec succès !");

        // Synchroniser avec le backend
        try {
          const response = await api.post("/purchases/sync", {
            transactionId:
              purchaseResult.customerInfo.originalAppUserId || "",
            productId: pack.product.identifier,
          });

          if (response.data.credits) {
            setCredits(response.data.credits);
          }
        } catch (apiError) {
          console.error("Sync error:", apiError);
        }
      }
    } catch (error: any) {
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
