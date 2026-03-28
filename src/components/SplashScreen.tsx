import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  autoHide?: boolean;
}

export function SplashScreen({
  onAnimationComplete,
  autoHide = false,
}: SplashScreenProps) {
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const spinnerRotation = useSharedValue(0);

  useEffect(() => {
    // Animation du logo (fade in + scale)
    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });

    logoScale.value = withSequence(
      withTiming(1.1, { duration: 400, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) })
    );

    // Animation du spinner (rotation infinie)
    spinnerRotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );

    // Si autoHide, déclencher l'animation de sortie après un délai
    if (autoHide && onAnimationComplete) {
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 2000);

      return () => {
        clearTimeout(timer);
        cancelAnimation(logoScale);
        cancelAnimation(logoOpacity);
        cancelAnimation(spinnerRotation);
      };
    }

    return () => {
      cancelAnimation(logoScale);
      cancelAnimation(logoOpacity);
      cancelAnimation(spinnerRotation);
    };
  }, [autoHide, onAnimationComplete]);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [{ scale: logoScale.value }],
    };
  });

  const spinnerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${spinnerRotation.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <View style={styles.iconCircle}>
          <Ionicons name="mic" size={48} color="#3b82f6" />
        </View>
        <Text style={styles.appName}>Relevo</Text>
      </Animated.View>

      {/* Spinner */}
      <Animated.View style={[styles.spinnerContainer, spinnerAnimatedStyle]}>
        <View style={styles.spinner} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(59, 130, 246, 0.2)",
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  spinnerContainer: {
    position: "absolute",
    bottom: 100,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "rgba(59, 130, 246, 0.2)",
    borderTopColor: "#3b82f6",
  },
});
