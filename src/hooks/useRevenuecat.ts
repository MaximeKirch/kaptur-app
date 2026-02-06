import { useEffect, useState } from "react";
import { Alert } from "react-native";
// TODO: Réactiver quand react-native-purchases sera compatible new arch
// import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { useUserStore } from "../store/userStore";
import { api } from "../services/api";

// Type stub pour remplacer PurchasesPackage
type PurchasesPackage = any;

export const useRevenueCat = () => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const setCredits = useUserStore((state) => state.setCredits);

  useEffect(() => {
    console.log(
      "⚠️ RevenueCat désactivé temporairement (incompatible new arch)",
    );
  }, []);

  const buyPackage = async (pack: PurchasesPackage) => {
    Alert.alert(
      "Indisponible",
      "Les achats in-app sont temporairement désactivés.",
    );
  };

  return { packages, isPurchasing, buyPackage };
};
