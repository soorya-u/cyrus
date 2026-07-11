import {
	type ConnectSignalingOptions,
	connectSignaling,
	type SignalingSession,
} from "@cyrus/connections/rtc/session";
import type { DeviceInfo } from "@cyrus/schemas/signaling";
import { Result } from "better-result";

async function closeSignalingSession(
	session: SignalingSession | undefined
): Promise<void> {
	if (!session) {
		return;
	}

	Result.try(() => session.close());
	await Bun.sleep(50);
}

export type E2eControllerSession = {
	session: SignalingSession;
	peers: DeviceInfo[];
};

export async function connectE2eController(
	options: ConnectSignalingOptions,
	timeoutMs = 30_000
): Promise<E2eControllerSession> {
	const deadline = Date.now() + timeoutMs;
	let attempt = 0;
	let lastError: unknown;

	while (Date.now() < deadline) {
		let session: SignalingSession | undefined;
		const result = await Result.tryPromise(async () => {
			session = await connectSignaling(options);
			const peers = await session.signaling.listPeers();
			return { session, peers };
		});

		if (result.isOk()) {
			return result.unwrap();
		}

		lastError = result.error;
		await closeSignalingSession(session);
		attempt += 1;
		await Bun.sleep(Math.min(1000, 250 * attempt));
	}

	throw (
		lastError ?? new Error("Timed out connecting E2E controller to signaling.")
	);
}
