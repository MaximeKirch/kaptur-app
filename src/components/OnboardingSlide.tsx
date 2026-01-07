import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface OnboardingSlideProps {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export function OnboardingSlide({
  iconName,
  title,
  description,
}: OnboardingSlideProps) {
  return (
    <View className="flex-1 justify-center items-center px-8">
      {/* Icon Container */}
      <View className="w-32 h-32 rounded-full bg-primary/10 border-4 border-primary/20 justify-center items-center mb-12 shadow-lg shadow-blue-500/20">
        <Ionicons name={iconName} size={64} color="#3b82f6" />
      </View>

      {/* Title */}
      <Text className="text-3xl font-bold text-white text-center mb-4 tracking-tight">
        {title}
      </Text>

      {/* Description */}
      <Text className="text-lg text-zinc-400 text-center leading-7 px-4">
        {description}
      </Text>
    </View>
  );
}
