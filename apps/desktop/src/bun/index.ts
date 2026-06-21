import { BrowserWindow, Updater } from "electrobun/bun";
import { initLogger, log } from "evlog";

initLogger({ env: { service: "cyrus/desktop" } });

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			log.info(
				"desktop",
				`HMR enabled: Using web dev server at ${DEV_SERVER_URL}`
			);
			return DEV_SERVER_URL;
		} catch {
			log.warn(
				"desktop",
				'Web dev server not running. Run "bun run dev:hmr" for HMR support.'
			);
		}
	}
	return "views://mainview/index.html";
}

const url = await getMainViewUrl();

new BrowserWindow({
	title: "cyrus",
	url,
	frame: {
		width: 1280,
		height: 820,
		x: 120,
		y: 120,
	},
});

log.info("desktop", "Electrobun desktop shell started.");
