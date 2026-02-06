import { useEffect, useState } from "react";
import { Alert } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { useUserStore } from "../store/userStore";
import { api } from "../services/api";

// Type stub pour remplacer PurchasesPackage
type PurchasesPackage = any;

export const useRevenueCat = () => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const setCredits = useUserStore((state) => state.setCredits);

  // COMMENTED OUT FOR DEBUGGING
  useEffect(() => {
    const initAndLoadOfferings = async () => {
      try {
        // 1. D'abord, configurer RevenueCat si ce n'est pas encore fait
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        const isConfigured = await Purchases.isConfigured();

        if (!isConfigured) {
          const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
          if (!apiKey) {
            console.error("RevenueCat API key is missing");
            return;
          }

          Purchases.configure({ apiKey });
          console.log("✅ RevenueCat configured in paywall");
        }

        // 2. Ensuite, charger les offres
        const offerings = await Purchases.getOfferings();

        // On vérifie qu'on a bien une "current" offering et qu'elle n'est pas vide
        if (
          offerings.current !== null &&
          offerings.current.availablePackages.length !== 0
        ) {
          setPackages(offerings.current.availablePackages);
        } else {
          console.log(
            "⚠️ Aucune offre trouvée (Offering vide ou mal configurée)",
          );
        }
      } catch (e) {
        console.error("Erreur chargement offres RevenueCat", e);
      }
    };

    initAndLoadOfferings();
  }, []);

  // Fonction utilitaire pour rafraîchir le profil utilisateur
  const refreshUserProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.data && typeof res.data.credits === "number") {
        setCredits(res.data.credits);
        return res.data.credits;
      }
    } catch (error) {
      console.log("Polling profil: pas encore à jour...");
    }
    return null;
  };

  const buyPackage = async (pack: PurchasesPackage) => {
    // COMMENTED OUT FOR DEBUGGING
    setIsPurchasing(true);
    try {
      await Purchases.purchasePackage(pack);

      let attempts = 0;
      const maxAttempts = 10;

      const interval = setInterval(async () => {
        attempts++;
        await refreshUserProfile();
        if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 1000);

      Alert.alert(
        "Paiement validé",
        "Merci ! Vos crédits sont en train d'être ajoutés à votre compte.",
      );

      await refreshUserProfile();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert(
          "Erreur",
          "Le paiement n'a pas pu aboutir. Veuillez réessayer.",
        );
        console.error(e);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  return { packages, isPurchasing, buyPackage };
};
