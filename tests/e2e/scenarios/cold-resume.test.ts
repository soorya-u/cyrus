import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { connectE2eControllerRtc } from "../harness/controller";
import { E2E_SERVER_URL, isE2eEnabled, requireE2e } from "../harness/env";
import { connectE2eController } from "../harness/signaling";
import { runE2eScenario } from "../harness/stack";
import { wsTicketProtocols } from "../harness/ws-ticket";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const e2eDescribe = isE2eEnabled() ? describe : describe.skip;

e2eDescribe("cold session resume", () => {
	test("thread resumes with the same session after a worker restart", async () => {
		requireE2e();
		await runE2eScenario(async (stack) => {
			let connected = await connectE2eController({
				host: E2E_SERVER_URL,
				room: stack.auth.userId,
				role: "controller",
				id: "e2e-controller-cold-resume",
				name: "E2E Controller Cold Resume",
				protocols: wsTicketProtocols(stack.auth.token),
			});
			let controlLink:
				| Awaited<ReturnType<typeof connectE2eControllerRtc>>
				| undefined;

			try {
				controlLink = await connectE2eControllerRtc(
					connected.session,
					"e2e-worker-1"
				);
				const initialClient = controlLink.client;
				const agents = await initialClient.listAgents();
				const agentName = agents.agents[0]?.id;
				expect(agentName).toBeTruthy();
				if (!agentName) throw new Error("no healthy agents");

				const project = await initialClient.createProject({
					name: "Cold Resume",
					cwd: REPO_ROOT,
				});
				const projectId = project.project.id;
				const started = await initialClient.startThread({
					projectId,
					agentName,
					message: [{ type: "text", text: "cold resume ping" }],
				});

				const beforeRestart = await initialClient.listThreads({
					projectId,
				});
				const sessionId = beforeRestart.threads[0]?.sessionId;
				expect(sessionId).toBeTruthy();

				controlLink.close();
				controlLink = undefined;
				connected.session.close();
				await stack.restartWorker();

				connected = await connectE2eController({
					host: E2E_SERVER_URL,
					room: stack.auth.userId,
					role: "controller",
					id: "e2e-controller-cold-resume-reconnected",
					name: "E2E Controller Cold Resume Reconnected",
					protocols: wsTicketProtocols(stack.auth.token),
				});
				controlLink = await connectE2eControllerRtc(
					connected.session,
					"e2e-worker-1"
				);
				const resumedClient = controlLink.client;

				const resumed = await resumedClient.chat({
					projectId,
					threadId: started.threadId,
					agentName,
					message: [{ type: "text", text: "after restart" }],
				});
				expect(resumed.turnId).toBeTruthy();

				const afterRestart = await resumedClient.listThreads({
					projectId,
				});
				expect(afterRestart.threads[0]?.id).toBe(started.threadId);
				expect(afterRestart.threads[0]?.sessionId).toBe(sessionId);
			} finally {
				controlLink?.close();
				connected.session.close();
			}
		});
	}, 180_000);
});
