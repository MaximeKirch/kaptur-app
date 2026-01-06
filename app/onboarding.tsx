import React, { useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { OnboardingSlide } from "../src/components/OnboardingSlide";
import { useUserStore } from "../src/store/userStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    iconName: "mic" as const,
    title: "Dictez vos comptes rendus",
    description:
      "Plus besoin de rédiger pendant des heures. Enregistrez vos observations sur chantier en quelques minutes.",
  },
  {
    id: "2",
    iconName: "sparkles" as const,
    title: "L'IA structure pour vous",
    description:
      "Votre enregistrement est transformé en compte rendu professionnel, prêt à être partagé avec vos clients.",
  },
  {
    id: "3",
    iconName: "create-outline" as const,
    title: "Modifiez et partagez",
    description:
      "Relisez, ajustez si besoin, puis exportez en PDF ou partagez directement. Vous gardez le contrôle.",
  },
  {
    id: "4",
    iconName: "flash" as const,
    title: "1 crédit = 1 rapport",
    description:
      "Tarification simple et transparente. Maximum 15 minutes par enregistrement. Vous commencez avec 3 crédits offerts.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { markOnboardingComplete } = useUserStore();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await markOnboardingComplete();
    router.replace("/(tabs)");
  };

  const renderSlide = ({ item }: { item: (typeof SLIDES)[0] }) => (
    <View style={{ width: SCREEN_WIDTH }}>
      <OnboardingSlide
        iconName={item.iconName}
        title={item.title}
        description={item.description}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      {/* Skip Button */}
      <View className="absolute top-14 right-6 z-10">
        <TouchableOpacity onPress={handleSkip}>
          <Text className="text-zinc-400 text-base">Passer</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Bottom Section */}
      <View className="pb-12 px-6">
        {/* Pagination Dots */}
        <View className="flex-row justify-center items-center mb-8">
          {SLIDES.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full mx-1 ${
                index === currentIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-zinc-700"
              }`}
            />
          ))}
        </View>

        {/* Next/Start Button */}
        <TouchableOpacity
          onPress={handleNext}
          className="bg-primary py-4 rounded-xl shadow-lg shadow-blue-500/20"
        >
          <Text className="text-white text-center text-lg font-bold">
            {currentIndex === SLIDES.length - 1 ? "Commencer" : "Suivant"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
