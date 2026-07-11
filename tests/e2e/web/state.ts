import { readFile } from "node:fs/promises";
import { join } from "node:path";

const STATE_PATH = join(import.meta.dirname, ".playwright-state.json");

export type PlaywrightState = {
	webUrl: string;
	serverUrl: string;
	sessionCookie: string;
	workerName: string;
};

export async function loadPlaywrightState(): Promise<PlaywrightState> {
	const raw = await readFile(STATE_PATH, "utf8");
	return JSON.parse(raw) as PlaywrightState;
}

export function playwrightStatePath(): string {
	return STATE_PATH;
}
