import { createAuthClient } from "better-auth/react";

export function createWebAuthClient(config: { baseURL: string }) {
	return createAuthClient({
		baseURL: config.baseURL,
	});
}
