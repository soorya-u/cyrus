import {
	electrobunDesktop,
	keychainStorage,
} from "@soorya-u/better-auth-desktop/electrobun";
import { createAuthClient } from "better-auth/client";
import { env } from "./env";

export const authClient = createAuthClient({
	baseURL: env.ELECTROBUN_SERVER_URL,
	plugins: [
		electrobunDesktop({
			clientID: "cyrus-desktop",
			storage: await keychainStorage(),
		}),
	],
});

// Bun-side RPC the WebView calls; pass to `new BrowserWindow({ rpc })`.
export const authBunRpc = authClient.createBunRPC();
