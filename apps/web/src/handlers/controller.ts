import type { ControllerContract } from "@cyrus/connections/contracts/controller";
import { connectControllerWeb } from "@cyrus/connections/rtc/controller/web";
import type { RtcConnection } from "@cyrus/connections/rtc/dial";

export type ControllerConnection = RtcConnection<ControllerContract>;

export const connectController = connectControllerWeb;

const CONTROLLER_ID_KEY = "cyrus-controller-id";

// stable per browser, so a reconnecting controller keeps the same identity
// (uuidv4 — browsers have no native uuidv7; the worker uses v7 via Bun)
export function getControllerId(): string {
	let id = localStorage.getItem(CONTROLLER_ID_KEY);
	if (!id) {
		id = crypto.randomUUID();
		localStorage.setItem(CONTROLLER_ID_KEY, id);
	}
	return id;
}
