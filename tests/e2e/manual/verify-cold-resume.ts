/**
 * Manual cold-resume check: startThread → stop worker → start worker → bind/prompt.
 *
 *   DATABASE_URL=... CYRUS_E2E=1 bun tests/e2e/manual/verify-cold-resume.ts
 */
/**
 * Manual cold-resume check: startThread → stop worker → start worker → bind/prompt.
 *
 *   DATABASE_URL=... CYRUS_E2E=1 bun tests/e2e/manual/verify-cold-resume.ts
 */
import { join } from "node:path";
import { YAML } from "bun";
import { seedCliAccessToken } from "../harness/auth";
import { connectE2eControllerRtc } from "../harness/controller";
import { E2E_SERVER_URL } from "../harness/env";
import { connectE2eController } from "../harness/signaling";
import { type ManagedProcess, spawnCliWorker, stopAll } from "../harness/spawn";
import { waitForLogLine } from "../harness/wait";
import { wsTicketProtocols } from "../harness/ws-ticket";

const REPO_ROOT = join(import.meta.dir, "../../..");
const home = join("/tmp", `cyrus-cold-${crypto.randomUUID()}`);
const CLI_CONNECTED_PATTERN = /connected.*waiting for message/i;

async function writeHome(token: string) {
	await Bun.write(
		join(home, "config.yml"),
		YAML.stringify({
			token,
			id: "cold-worker-1",
			name: "Cold Resume Worker",
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

async function waitConnected(cli: ManagedProcess) {
	if (!(cli.proc.stdout && cli.proc.stderr)) {
		throw new Error("CLI stdout/stderr must be piped");
	}
	await waitForLogLine(
		cli.proc.stdout,
		cli.proc.stderr,
		CLI_CONNECTED_PATTERN,
		120_000
	);
}

const auth = await seedCliAccessToken(E2E_SERVER_URL);
await writeHome(auth.token);

let cli = spawnCliWorker(home, {
	CYRUS_HOME: home,
	CLI_PUBLIC_SERVER_URL: E2E_SERVER_URL,
	CYRUS_DAEMON: "1",
});

let rtc: Awaited<ReturnType<typeof connectE2eControllerRtc>> | undefined;
let session: Awaited<ReturnType<typeof connectE2eController>> | undefined;

try {
	await waitConnected(cli);

	const connected = await connectE2eController({
		host: E2E_SERVER_URL,
		room: auth.userId,
		role: "controller",
		id: "cold-controller",
		name: "Cold Controller",
		protocols: wsTicketProtocols(auth.token),
	});
	session = connected;
	rtc = await connectE2eControllerRtc(connected.session, "cold-worker-1");
	const client = rtc.client;

	const agents = await client.listAgents();
	const agentName = agents.agents[0]?.id;
	if (!agentName) throw new Error("no healthy agents");

	const project = await client.createProject({
		name: "Cold Resume",
		cwd: REPO_ROOT,
	});
	const projectId = project.project.id;

	console.log("1. startThread");
	const started = await client.startThread({
		projectId,
		agentName,
		message: [{ type: "text", text: "cold resume ping" }],
	});
	console.log("   threadId:", started.threadId);

	const listed = await client.listThreads({ projectId });
	const row = listed.threads[0];
	if (!(row?.sessionId && row.agentLocked)) {
		throw new Error("expected locked thread with session");
	}
	const sessionId = row.sessionId;
	console.log("   sessionId:", sessionId);

	console.log("2. stop worker (session goes cold)");
	rtc.close();
	rtc = undefined;
	session.session.close();
	session = undefined;
	await stopAll([cli]);

	console.log("3. restart worker");
	cli = spawnCliWorker(home, {
		CYRUS_HOME: home,
		CLI_PUBLIC_SERVER_URL: E2E_SERVER_URL,
		CYRUS_DAEMON: "1",
	});
	await waitConnected(cli);

	const reconnected = await connectE2eController({
		host: E2E_SERVER_URL,
		room: auth.userId,
		role: "controller",
		id: "cold-controller-2",
		name: "Cold Controller 2",
		protocols: wsTicketProtocols(auth.token),
	});
	session = reconnected;
	rtc = await connectE2eControllerRtc(reconnected.session, "cold-worker-1");

	console.log("4. chat on existing thread (bind resumes cold session)");
	const chat = await rtc.client.chat({
		projectId,
		threadId: started.threadId,
		agentName,
		message: [{ type: "text", text: "after restart" }],
	});
	console.log("   turnId:", chat.turnId);

	const after = await rtc.client.listThreads({ projectId });
	if (after.threads[0]?.sessionId !== sessionId) {
		throw new Error("session id should persist across worker restart");
	}
	console.log("   sessionId unchanged:", after.threads[0]?.sessionId);

	console.log("COLD_RESUME_OK");
} catch (error) {
	console.error("COLD_RESUME_FAIL", error);
	process.exitCode = 1;
} finally {
	rtc?.close();
	session?.session.close();
	await stopAll([cli]);
}
