import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import { getItem, setItem } from "expo-secure-store";
import { env } from "./env";

export const authClient = createAuthClient({
	baseURL: env.EXPO_PUBLIC_SERVER_URL,
	plugins: [
		expoClient({
			scheme: (Constants.expoConfig?.scheme as string) || "cyrus",
			storage: { getItem, setItem },
		}),
	],
});
