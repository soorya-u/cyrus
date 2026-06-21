import { createMobileAuthClient } from "@cyrus/auth/client/mobile";
import { env } from "@cyrus/env/mobile";
import Constants from "expo-constants";
import { getItem, setItem } from "expo-secure-store";

export const authClient = createMobileAuthClient({
	baseURL: env.EXPO_PUBLIC_SERVER_URL,
	scheme: (Constants.expoConfig?.scheme as string) || "cyrus",
	storage: { getItem, setItem },
});
