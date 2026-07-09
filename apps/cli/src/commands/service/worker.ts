import { connectSignaling } from "@cyrus/connections/rtc/session";
import { serveWorker } from "@cyrus/connections/rtc/worker";
import { connection } from "@cyrus/database/connection";
import { generateName, randomId } from "@cyrus/utils/identity";
import { Result } from "better-result";
import { createWorkerRuntime } from "@/core";
import { createControllerRouter } from "@/handlers/controller";
import { workerRouter } from "@/handlers/worker";
import { authClient } from "@/lib/auth";
import { env } from "@/lib/env";
import { createThreadEventBus } from "@/queue/bus";
import { get, getOrCreate } from "@/store/config";
import { initDatabase } from "@/store/database";
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

	const id = await getOrCreate("id", randomId);
	const name = await getOrCreate("name", generateName);
	const room = session.user.id;

	const runtime = createWorkerRuntime();

	(await Result.tryPromise(() => initDatabase())).tapError((err) => {
		print.error`Failed to initialize database: ${String(err)}`;
		process.exit(1);
	});

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

	const eventBus = createThreadEventBus();

	const device = serveWorker({
		signaling: signalingSession.signaling,
		events: signalingSession.events,
		eventBus,
		routers: {
			controller: createControllerRouter(runtime),
			worker: workerRouter,
		},
	});

	const shutdown = async () => {
		await runtime.agentPool.shutdown();
		device.close();
		signalingSession.close();
		await connection.close();
		process.exit(0);
	};
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
	process.on("SIGBREAK", shutdown);
	process.on("unhandledRejection", (reason) => {
		print.error`[worker] unhandled rejection: ${String(reason)}`;
	});
}
