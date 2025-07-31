import { Expo } from "expo-server-sdk";

export const expo = new Expo({
  useFcmV1: true,
});

export const validateExpoPushTokens = (expoPushTokens: string[]) => {
  return expoPushTokens.every((expoPushToken) => {
    return Expo.isExpoPushToken(expoPushToken);
  });
};
