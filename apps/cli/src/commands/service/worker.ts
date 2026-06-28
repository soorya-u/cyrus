import { connectSignaling } from "@cyrus/connections/rtc/session";
import { serveWorker } from "@cyrus/connections/rtc/worker";
import { authClient } from "@/lib/auth";
import { env } from "@/lib/env";
import { generateId, generateName } from "@/utils/identity";
import { get, getOrCreate } from "@/utils/store";
import { print } from "@/utils/style";

export async function worker(): Promise<void> {
	const token = await get("token");
	if (!token) {
		print.dim`Not logged in. Run \`cyrusd login\`.`;
		process.exit(1);
	}

	const { data: session, error } = await authClient.getSession();
	if (error || !session?.user) {
		print.error`Couldn't verify session. Run \`cyrusd login\` again.`;
		process.exit(1);
	}

	const id = await getOrCreate("id", generateId);
	const name = await getOrCreate("name", generateName);
	const room = session.user.id;

	print.dim`worker "${name}" joining hub`;

	const signalingSession = await connectSignaling({
		host: env.CLI_PUBLIC_SERVER_URL,
		room,
		id,
		name,
		role: "worker",
		headers: { Authorization: `Bearer ${token}` },
	});
	print.success`✓ connected — waiting for message…`;

	const device = serveWorker({
		signaling: signalingSession.signaling,
		events: signalingSession.events,
		onMessage: (peerId, message) => {
			print.line`← ${peerId}: ${message}`;
			print.dim`"  echoing back as a stream…"`;
		},
	});

	const shutdown = () => {
		device.close();
		signalingSession.close();
		process.exit(0);
	};
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
	process.on("SIGBREAK", shutdown); // Ctrl+Break on Windows
}
