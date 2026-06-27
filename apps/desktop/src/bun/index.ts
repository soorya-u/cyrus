import { BrowserWindow, Updater } from "electrobun/bun";
import { initLogger, log } from "evlog";
import { env } from "../lib/env";

initLogger({ env: { service: "cyrus/desktop" } });

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			const signal = AbortSignal.timeout(3000);
			await fetch(env.ELECTROBUN_WEB_APP_URL, { method: "HEAD", signal });
			log.info(
				"desktop",
				`HMR: using web dev server at ${env.ELECTROBUN_WEB_APP_URL}`
			);
			return env.ELECTROBUN_WEB_APP_URL;
		} catch {
			log.warn(
				"desktop",
				`Web dev server unreachable at ${env.ELECTROBUN_WEB_APP_URL}, falling back to built assets.`
			);
		}
	}
	return "views://mainview/index.html";
}

const url = await getMainViewUrl();
log.info("desktop", `Opening BrowserWindow at ${url}`);

// Dynamic import defers the keychain init until after the URL check.
const { authClient, authBunRpc } = await import("../lib/auth");

new BrowserWindow({
	title: "Cyrus",
	url,
	rpc: authBunRpc,
	frame: { width: 1280, height: 820, x: 120, y: 120 },
});

authClient.setupMain().catch((err) => console.error("auth setup failed", err));

log.info("desktop", "Electrobun desktop shell started.");
