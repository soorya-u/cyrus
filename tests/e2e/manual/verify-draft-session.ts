import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { YAML } from "bun";
import { seedCliAccessToken } from "../harness/auth";
import { connectE2eControllerRtc } from "../harness/controller";
import { E2E_SERVER_URL } from "../harness/env";
import { connectE2eController } from "../harness/signaling";
import { spawnCliWorker, stopAll } from "../harness/spawn";

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
		token: auth.token,
	});
	session = connected;

	rtc = await connectE2eControllerRtc(connected.session, "manual-worker-1");
	const client = rtc.client;

	console.log("1. listAgents");
	const agents = await client.listAgents();
	console.log("   agents:", agents.agents.map((a) => a.id).join(", "));

	const agentName = agents.agents[0]?.id;
	if (!agentName) throw new Error("no healthy agents");

	console.log("2. create project/thread");
	const project = await client.createProject({
		name: "Manual Draft",
		cwd: REPO_ROOT,
	});
	const thread = await client.createThread({ projectId: project.project.id });

	console.log("3. bindAgent");
	const bound = await client.bindAgent({
		threadId: thread.thread.id,
		projectId: project.project.id,
		agentName,
	});
	console.log("   sessionId:", bound.sessionId);
	console.log("   models:", bound.models.length);

	console.log("4. getModels");
	const models = await client.getModels({ threadId: thread.thread.id });
	console.log("   models:", models.models.length);

	console.log("5. chat (locks agent)");
	await client.chat({
		threadId: thread.thread.id,
		projectId: project.project.id,
		agentName,
		message: [{ type: "text", text: "ping" }],
	});

	let locked = false;
	for (let i = 0; i < 40; i++) {
		const listed = await client.listThreads({ projectId: project.project.id });
		const row = listed.threads.find((t) => t.id === thread.thread.id);
		if (row?.agentLocked) {
			locked = true;
			console.log("   agentLocked: true");
			break;
		}
		await Bun.sleep(500);
	}
	if (!locked) throw new Error("agent did not lock after first message");

	console.log("6. deleteThread");
	await client.deleteThread({ threadId: thread.thread.id });
	const afterDelete = await client.listThreads({
		projectId: project.project.id,
	});
	if (afterDelete.threads.some((t) => t.id === thread.thread.id)) {
		throw new Error("thread still exists after delete");
	}
	console.log("   thread deleted");

	await writeFile(
		join(import.meta.dir, "../web/state.json"),
		JSON.stringify({
			webUrl: E2E_SERVER_URL.replace("8787", "5173"),
			serverUrl: E2E_SERVER_URL,
			sessionCookie: auth.sessionCookie.split("=")[1] ?? "",
			workerName: "Manual Worker",
		}),
		"utf8"
	);

	rtc.close();
	session.session.close();
	rtc = undefined;
	session = undefined;

	console.log("OK: manual RPC verification passed");
	process.exit(0);
} finally {
	if (rtc) rtc.close();
	if (session) session.session.close();
	await stopAll(processes);
}
