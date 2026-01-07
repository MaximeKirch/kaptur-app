import { useEffect, useState } from "react";
import { Alert } from "react-native";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useUserStore } from "../store/userStore";
import { api } from "../services/api";

export const useRevenueCat = () => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const setCredits = useUserStore((state) => state.setCredits);

  // --- C'EST ICI QUE ÇA MANQUAIT ---
  useEffect(() => {
    const loadOfferings = async () => {
      try {
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

    loadOfferings();
  }, []);
  // ----------------------------------

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
