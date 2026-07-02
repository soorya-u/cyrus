import { connectSignaling } from "@cyrus/connections/rtc/session";
import { serveWorker } from "@cyrus/connections/rtc/worker";
import { createWorkerRuntime } from "@/core";
import { createControllerRouter } from "@/handlers/controller";
import { workerRouter } from "@/handlers/worker";
import { authClient } from "@/lib/auth";
import { env } from "@/lib/env";
import { get, getOrCreate } from "@/store/config";
import { generateId, generateName } from "@/utils/identity";
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

	const runtime = createWorkerRuntime();

	print.dim`worker "${name}" joining hub`;

	const signalingSession = await connectSignaling({
		host: env.CLI_PUBLIC_SERVER_URL,
		room,
		role: "worker",
		id,
		name,
		token,
	});
	print.success`✓ connected — waiting for message…`;

	const device = serveWorker({
		signaling: signalingSession.signaling,
		events: signalingSession.events,
		routers: {
			controller: createControllerRouter(runtime),
			worker: workerRouter,
		},
	});

	const shutdown = () => {
		runtime.agentPool.shutdown();
		device.close();
		signalingSession.close();
		process.exit(0);
	};
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
	process.on("SIGBREAK", shutdown);
	process.on("unhandledRejection", (reason) => {
		print.error`[worker] unhandled rejection: ${String(reason)}`;
	});
}
