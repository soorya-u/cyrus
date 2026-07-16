import { connectSignaling } from "@cyrus/connections/rtc/session";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required for deploy smoke.`);

	return value;
}

const baseUrl = requireEnv("SMOKE_BASE_URL");

async function checkHealth(): Promise<void> {
	const response = await fetch(new URL("/health", baseUrl));
	if (!response.ok)
		throw new Error(`Health check failed with status ${response.status}.`);

	const body = (await response.json()) as { ok?: boolean };
	if (!body.ok) throw new Error("Health check returned ok=false.");
}

async function checkSignalingHub(): Promise<void> {
	const token = process.env.SMOKE_BEARER_TOKEN;
	const room = process.env.SMOKE_ROOM_ID;
	if (!(token && room)) return;

	const sessionResult = await connectSignaling({
		host: baseUrl,
		room,
		role: "controller",
		id: "deploy-smoke",
		name: "Deploy Smoke",
		protocols: async () => {
			const response = await fetch(new URL("/api/auth/ws-ticket", baseUrl), {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
				body: "{}",
			});
			if (!response.ok) {
				throw new Error(
					`ws-ticket mint failed with status ${response.status}.`
				);
			}
			const body = (await response.json()) as { protocols?: string[] };
			if (!body.protocols?.length) {
				throw new Error("ws-ticket response missing protocols.");
			}
			return body.protocols;
		},
	});
	if (sessionResult.isErr()) throw sessionResult.error;
	const session = sessionResult.value;

	try {
		await session.signaling.listPeers();
	} finally {
		session.close();
	}
}

await checkHealth();
await checkSignalingHub();
