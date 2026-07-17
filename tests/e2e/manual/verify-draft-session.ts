/**
 * Verifies draft → startThread lifecycle: probe leaves no thread row,
 * startThread births exactly one locked thread.
 *
 * Usage:
 *   DATABASE_URL=... CYRUS_E2E=1 bun tests/e2e/manual/verify-draft-session.ts
 */
import { join } from "node:path";
import { YAML } from "bun";
import { seedCliAccessToken } from "../harness/auth";
import { connectE2eControllerRtc } from "../harness/controller";
import { E2E_SERVER_URL } from "../harness/env";
import { connectE2eController } from "../harness/signaling";
import { spawnCliWorker, stopAll } from "../harness/spawn";
import { wsTicketProtocols } from "../harness/ws-ticket";

const REPO_ROOT = join(import.meta.dir, "../../..");
const home = join("/tmp", `cyrus-manual-${crypto.randomUUID()}`);

async function writeHome(token: string) {
	await Bun.write(
		join(home, "config.yml"),
		YAML.stringify({
			token,
			id: "manual-worker-1",
			name: "Manual Worker",
		})
	);
	await Bun.write(
		join(home, "agents.yml"),
		YAML.stringify({
			"claude-acp": {
				registryId: "claude-acp",
				name: "Claude Agent",
				icon: "https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg",
			},
		})
	);
}

const auth = await seedCliAccessToken(E2E_SERVER_URL);
await writeHome(auth.token);

const cli = spawnCliWorker(home, {
	CYRUS_HOME: home,
	CLI_PUBLIC_SERVER_URL: E2E_SERVER_URL,
	CYRUS_DAEMON: "1",
});

const processes = [cli];
let rtc: Awaited<ReturnType<typeof connectE2eControllerRtc>> | undefined;
let session: Awaited<ReturnType<typeof connectE2eController>> | undefined;

try {
	const { waitForLogLine } = await import("../harness/wait");
	if (cli.proc.stdout && cli.proc.stderr) {
		await waitForLogLine(
			cli.proc.stdout,
			cli.proc.stderr,
			/connected.*waiting for message/i,
			120_000
		);
	}

	const connected = await connectE2eController({
		host: E2E_SERVER_URL,
		room: auth.userId,
		role: "controller",
		id: "manual-controller",
		name: "Manual Controller",
		protocols: wsTicketProtocols(auth.token),
	});
	session = connected;

	rtc = await connectE2eControllerRtc(connected.session, "manual-worker-1");
	const client = rtc.client;

	console.log("1. listAgents");
	const agents = await client.listAgents();
	console.log("   agents:", agents.agents.map((a) => a.id).join(", "));

	const agentName = agents.agents[0]?.id;
	if (!agentName) throw new Error("no healthy agents");

	console.log("2. create project");
	const project = await client.createProject({
		name: "Manual Draft",
		cwd: REPO_ROOT,
	});
	const projectId = project.project.id;

	console.log("3. listThreads before first message (must be empty)");
	const before = await client.listThreads({ projectId });
	if (before.threads.length !== 0) {
		throw new Error("expected empty thread list before first message");
	}

	console.log("4. getDraftCatalog probe (must leave no thread)");
	const catalog = await client.getDraftCatalog({ agentName, projectId });
	console.log("   models:", catalog.models.length);
	const afterProbe = await client.listThreads({ projectId });
	if (afterProbe.threads.length !== 0) {
		throw new Error("probe must not create a thread row");
	}

	console.log("5. startThread");
	const started = await client.startThread({
		projectId,
		agentName,
		message: [{ type: "text", text: "ping" }],
	});
	console.log("   threadId:", started.threadId);

	const listed = await client.listThreads({ projectId });
	if (listed.threads.length !== 1) {
		throw new Error(
			`expected exactly one thread, got ${listed.threads.length}`
		);
	}
	const row = listed.threads[0];
	if (!(row?.agentLocked && row.sessionId && row.agentName === agentName)) {
		throw new Error("started thread must be locked with a session");
	}
	console.log("   agentLocked: true");

	console.log("LIFECYCLE_OK");
} catch (error) {
	console.error("LIFECYCLE_FAIL", error);
	process.exitCode = 1;
} finally {
	rtc?.close();
	session?.session.close();
	await stopAll(processes);
}
