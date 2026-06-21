import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

export function createMobileAuthClient(config: {
	baseURL: string;
	scheme: string;
	storage: {
		setItem: (key: string, value: string) => unknown;
		getItem: (key: string) => string | null;
	};
}) {
	return createAuthClient({
		baseURL: config.baseURL,
		plugins: [
			expoClient({
				scheme: config.scheme,
				storagePrefix: config.scheme,
				storage: config.storage,
			}),
		],
	});
}
