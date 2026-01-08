// src/hooks/usePushNotifications.ts
import { useState, useEffect } from "react";
// import * as Device from "expo-device";
// import * as Notifications from "expo-notifications";
// import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "../services/api";

interface UsePushNotificationsOptions {
  enabled?: boolean;
}

export const usePushNotifications = (options: UsePushNotificationsOptions = {}) => {
  const { enabled = true } = options;
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();

  // COMMENTED OUT FOR DEBUGGING
  // Configuration du handler de notifications (seulement quand le hook est utilisé)
  // useEffect(() => {
  //   if (!enabled) return;

  //   Notifications.setNotificationHandler({
  //     handleNotification: async () => ({
  //       shouldShowAlert: true,
  //       shouldPlaySound: true,
  //       shouldSetBadge: false,
  //     }),
  //   });
  // }, [enabled]);

  // async function registerForPushNotificationsAsync() {
  //   let token;

  //   if (Platform.OS === "android") {
  //     await Notifications.setNotificationChannelAsync("default", {
  //       name: "default",
  //       importance: Notifications.AndroidImportance.MAX,
  //       vibrationPattern: [0, 250, 250, 250],
  //       lightColor: "#FF231F7C",
  //     });
  //   }

  //   if (Device.isDevice) {
  //     const { status: existingStatus } =
  //       await Notifications.getPermissionsAsync();
  //     let finalStatus = existingStatus;

  //     if (existingStatus !== "granted") {
  //       const { status } = await Notifications.requestPermissionsAsync();
  //       finalStatus = status;
  //     }

  //     if (finalStatus !== "granted") {
  //       console.log("Permission not granted!");
  //       return;
  //     }

  //     // Récupération du token (nécessite un Project ID si tu utilises EAS, sinon c'est auto)
  //     token = (
  //       await Notifications.getExpoPushTokenAsync({
  //         projectId: Constants.expoConfig?.extra?.eas?.projectId,
  //       })
  //     ).data;

  //     console.log("Push Token:", token);
  //   } else {
  //     console.log("Must use physical device for Push Notifications");
  //   }

  //   return token;
  // }

  // useEffect(() => {
  //   if (!enabled) return;

  //   registerForPushNotificationsAsync().then((token) => {
  //     setExpoPushToken(token);
  //     if (token) {
  //       // Envoi au backend
  //       api
  //         .post("/users/push-token", { token })
  //         .catch((err) => console.error("Failed to sync token", err));
  //     }
  //   }).catch((err) => {
  //     console.error("Failed to register for push notifications", err);
  //   });
  // }, [enabled]);

  return { expoPushToken };
};
