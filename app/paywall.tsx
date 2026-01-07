import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRevenueCat } from "@/src/hooks/useRevenuecat";
import { useMemo } from "react";

export default function PaywallScreen() {
  const router = useRouter();
  const { packages, isPurchasing, buyPackage } = useRevenueCat();

  // 1. On trie les paquets par prix croissant
  const sortedPackages = useMemo(() => {
    return [...packages].sort((a, b) => a.product.price - b.product.price);
  }, [packages]);

  // 2. Helper pour le style et les badges marketing
  const getBadgeInfo = (identifier: string) => {
    const id = identifier.toLowerCase();

    if (id.includes("50")) {
      return {
        label: "MEILLEURE VALEUR (-40%)",
        color: "bg-green-600",
        textColor: "text-white",
        borderColor: "border-green-500/50",
        containerStyle: "bg-surface",
      };
    }
    if (id.includes("20")) {
      return {
        label: "POPULAIRE",
        color: "bg-blue-600",
        textColor: "text-white",
        borderColor: "border-blue-500",
        containerStyle: "bg-blue-500/10",
      };
    }
    return {
      label: "DÉCOUVERTE",
      color: "bg-zinc-700",
      textColor: "text-zinc-300",
      borderColor: "border-zinc-800",
      containerStyle: "bg-surface",
    };
  };

  // 3. Helper pour calculer le nombre de crédits via l'ID
  const getCreditCount = (identifier: string) => {
    const id = identifier.toLowerCase();
    if (id.includes("50")) return 50;
    if (id.includes("20")) return 20;
    if (id.includes("5") || id.includes("05")) return 5;
    return 1; // Fallback
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-6 h-full">
        {/* Header avec bouton fermer */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-6 self-end p-2 bg-zinc-800 rounded-full"
        >
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>

        {/* Hero Section */}
        {/* Hero Section */}
        <View className="items-center mb-8 mt-2">
          <View className="w-20 h-20 bg-primary/20 rounded-full items-center justify-center mb-6 border border-primary/30 shadow-lg shadow-blue-500/20">
            <Ionicons name="flash" size={40} color="#3b82f6" />
          </View>
          <Text className="text-3xl font-bold text-white text-center mb-3">
            Besoin de recharger vos batteries ?
          </Text>
          <Text className="text-zinc-400 text-center px-4 leading-6">
            Investissez dans votre temps.
            {"\n"}
            <Text className="text-white font-bold">1 crédit = 1 rapport.</Text>
          </Text>
        </View>

        {/* Liste des offres */}
        <View className="gap-4 flex-1">
          {sortedPackages.length === 0 ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-zinc-500 text-center mt-4">
                Chargement des offres...
              </Text>
            </View>
          ) : (
            sortedPackages.map((pack) => {
              const badge = getBadgeInfo(pack.identifier);
              const creditCount = getCreditCount(pack.identifier);

              // Calcul du prix unitaire
              const unitPrice = pack.product.price / creditCount;
              // Formatage propre selon la devise du store (ex: 0,60 €)
              const formattedUnitPrice = new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: pack.product.currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(unitPrice);

              return (
                <TouchableOpacity
                  key={pack.identifier}
                  onPress={() => buyPackage(pack)}
                  disabled={isPurchasing}
                  className={`p-4 rounded-2xl border-2 flex-row items-center justify-between ${badge.containerStyle} ${badge.borderColor}`}
                >
                  <View className="flex-1 mr-4">
                    {/* Badge Marketing */}
                    <View
                      className={`${badge.color} px-2 py-1 rounded self-start mb-2`}
                    >
                      <Text
                        className={`${badge.textColor} text-[10px] font-bold uppercase tracking-wider`}
                      >
                        {badge.label}
                      </Text>
                    </View>

                    <Text className="text-white font-bold text-lg mb-1">
                      {pack.product.title}
                    </Text>
                    <Text className="text-zinc-400 text-xs leading-4">
                      {pack.product.description}
                    </Text>
                  </View>

                  <View className="items-end min-w-[90px]">
                    {/* Prix Total */}
                    <Text className="text-white font-bold text-xl">
                      {pack.product.priceString}
                    </Text>

                    {/* Prix unitaire (Nouveau !) */}
                    <Text className="text-zinc-400 text-xs mt-1 font-medium">
                      {formattedUnitPrice} / crédit
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Footer */}
        <View className="pb-4">
          <Text className="text-zinc-600 text-[10px] text-center">
            Paiement sécurisé via votre compte Store.
            {"\n"}Les crédits n'expirent jamais.
          </Text>
        </View>
      </View>

      {/* Loading Overlay */}
      {isPurchasing && (
        <View className="absolute inset-0 bg-black/90 justify-center items-center z-50">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-white mt-6 font-bold text-lg">
            Transaction sécurisée...
          </Text>
          <Text className="text-zinc-500 text-sm mt-2">
            Merci de ne pas quitter l'application
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
