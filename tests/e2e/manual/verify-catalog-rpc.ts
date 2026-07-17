/**
 * Verifies controller-side catalog get/set for model/mode/effort/persona
 * through the control-link RPC surface (the same path the web composer uses).
 *
 * Usage:
 *   DATABASE_URL=... CYRUS_E2E=1 bun tests/e2e/manual/verify-catalog-rpc.ts
 */
import { join } from "node:path";
import { connectE2eControllerRtc } from "../harness/controller";
import { E2E_SERVER_URL, requireE2e } from "../harness/env";
import { connectE2eController } from "../harness/signaling";
import { startE2eStack, stopE2eStack } from "../harness/stack";
import { wsTicketProtocols } from "../harness/ws-ticket";

requireE2e();

const REPO_ROOT = join(import.meta.dir, "../../..");
const KEEP_ALIVE = process.env.KEEP_ALIVE === "1";

const stack = await startE2eStack({ withWeb: KEEP_ALIVE });
let exitCode = 1;

try {
	const connected = await connectE2eController({
		host: E2E_SERVER_URL,
		room: stack.auth.userId,
		role: "controller",
		id: "catalog-controller",
		name: "Catalog Controller",
		protocols: wsTicketProtocols(stack.auth.token),
	});

	const rtc = await connectE2eControllerRtc(connected.session, "e2e-worker-1");
	const client = rtc.client;

	const agents = await client.listAgents();
	const agentName = agents.agents[0]?.id;
	if (!agentName) throw new Error("no healthy agents");
	console.log("agent:", agentName);

	const project = await client.createProject({
		name: "Catalog Verify",
		cwd: REPO_ROOT,
	});
	const projectId = project.project.id;

	const started = await client.startThread({
		projectId,
		agentName,
		message: [{ type: "text", text: "catalog verify" }],
	});
	const threadId = started.threadId;
	console.log("started thread:", threadId);

	const models = await client.getModels({ threadId });
	if (models.models.length === 0) throw new Error("getModels returned empty");
	console.log("getModels:", models.models.map((m) => m.id).join(", "));

	const modes = await client.getModes({ threadId });
	console.log("getModes:", modes.modes.map((m) => m.id).join(", ") || "(none)");

	const efforts = await client.getEfforts({ threadId });
	console.log(
		"getEfforts:",
		efforts.efforts.map((e) => e.id).join(", ") || "(none)"
	);

	const personas = await client.getPersona({ threadId });
	console.log(
		"getPersona:",
		personas.personas.map((p) => p.id).join(", ") || "(none)"
	);

	const modelId = models.models[0]?.id;
	if (!modelId) throw new Error("missing model id");

	const setResults: Record<string, string> = {};

	try {
		await client.setModel({ threadId, projectId, agentName, modelId });
		setResults.model = `ok:${modelId}`;
		console.log("setModel:", modelId);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		// Some agents expose models but do not implement session/set_model.
		setResults.model = `agent-rejected:${message.slice(0, 120)}`;
		console.log("setModel:", setResults.model);
	}

	if (modes.modes[0]?.id) {
		await client.setMode({
			threadId,
			projectId,
			agentName,
			modeId: modes.modes[0].id,
		});
		setResults.mode = `ok:${modes.modes[0].id}`;
		console.log("setMode:", modes.modes[0].id);
	} else {
		setResults.mode = "skipped:no-options";
		console.log("setMode: skipped (agent exposes no modes)");
	}

	if (efforts.efforts[0]?.id) {
		await client.setEffort({
			threadId,
			projectId,
			agentName,
			effortId: efforts.efforts[0].id,
		});
		setResults.effort = `ok:${efforts.efforts[0].id}`;
		console.log("setEffort:", efforts.efforts[0].id);
	} else {
		setResults.effort = "skipped:no-options";
		console.log("setEffort: skipped (agent exposes no efforts)");
	}

	if (personas.personas[0]?.id) {
		await client.setPersona({
			threadId,
			projectId,
			agentName,
			personaId: personas.personas[0].id,
		});
		setResults.persona = `ok:${personas.personas[0].id}`;
		console.log("setPersona:", personas.personas[0].id);
	} else {
		setResults.persona = "skipped:no-options";
		console.log("setPersona: skipped (agent exposes no personas)");
	}

	const requiredGetsOk =
		models.models.length > 0 &&
		modes.modes.length > 0 &&
		efforts.efforts.length > 0;
	const requiredSetsOk =
		setResults.mode.startsWith("ok:") && setResults.effort.startsWith("ok:");
	if (!(requiredGetsOk && requiredSetsOk)) {
		throw new Error(
			`catalog verification incomplete: ${JSON.stringify(setResults)}`
		);
	}

	console.log("CATALOG_RPC_OK");
	console.log(
		JSON.stringify({
			webUrl: "http://localhost:5173",
			workerId: "e2e-worker-1",
			projectId,
			threadId,
			sessionCookie: stack.auth.sessionCookie,
			agentName,
			modelId,
			modeId: modes.modes[0]?.id ?? null,
			effortId: efforts.efforts[0]?.id ?? null,
			personaId: personas.personas[0]?.id ?? null,
			setResults,
		})
	);
	exitCode = 0;

	if (KEEP_ALIVE) {
		console.log("KEEP_ALIVE=1 — stack running for playwright-cli");
		await new Promise(() => {
			// intentional
		});
	}

	connected.session.close();
	rtc.close();
} catch (error) {
	console.error("CATALOG_RPC_FAIL", error);
	exitCode = 1;
} finally {
	if (!KEEP_ALIVE) {
		await stopE2eStack(stack);
	}
	if (!KEEP_ALIVE) process.exit(exitCode);
}
