import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useUserStore } from "../../store/userStore";

export const CreditBadge = () => {
  const credits = useUserStore((state) => state.credits);
  const state = useUserStore((state) => state);
  const router = useRouter();
  const isLow = credits === 0;

  return (
    <Pressable
      onPress={() => router.push("/paywall")}
      className={`flex-row items-center px-3 py-1.5 rounded-full border ${
        isLow ? "bg-red-500/10 border-red-500/50" : "bg-surface border-zinc-800"
      }`}
    >
      <Text
        className={`font-bold text-sm mr-1 ${isLow ? "text-red-400" : "text-zinc-200"}`}
      >
        {credits}
      </Text>
      <Text className="text-xs">⚡</Text>
    </Pressable>
  );
};
