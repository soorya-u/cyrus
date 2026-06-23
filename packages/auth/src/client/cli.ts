import { createAuthClient } from "better-auth/client";

import { cliClient } from "../plugins/cli";

export function createCliAuthClient(config: {
	baseURL: string;
	storage: {
		setItem: (key: string, value: string) => unknown;
		getItem: (key: string) => string | null;
	};
	storagePrefix?: string;
}) {
	return createAuthClient({
		baseURL: config.baseURL,
		plugins: [
			cliClient({
				storage: config.storage,
				storagePrefix: config.storagePrefix,
			}),
		],
	});
}
