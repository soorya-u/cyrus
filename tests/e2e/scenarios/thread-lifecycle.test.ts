import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { connectE2eControllerRtc } from "../harness/controller";
import { E2E_SERVER_URL, isE2eEnabled, requireE2e } from "../harness/env";
import { connectE2eController } from "../harness/signaling";
import { runE2eScenario } from "../harness/stack";
import { wsTicketProtocols } from "../harness/ws-ticket";

const REPO_ROOT = join(import.meta.dir, "../../..");
const e2eDescribe = isE2eEnabled() ? describe : describe.skip;

e2eDescribe("thread lifecycle", () => {
	test("drafts leave no worker state; startThread births exactly one thread", async () => {
		requireE2e();
		await runE2eScenario(async (stack) => {
			const connected = await connectE2eController({
				host: E2E_SERVER_URL,
				room: stack.auth.userId,
				role: "controller",
				id: "e2e-controller-lifecycle",
				name: "E2E Controller Lifecycle",
				protocols: wsTicketProtocols(stack.auth.token),
			});

			let rtc: Awaited<ReturnType<typeof connectE2eControllerRtc>> | undefined;

			try {
				rtc = await connectE2eControllerRtc(connected.session, "e2e-worker-1");
				const client = rtc.client;

				const agents = await client.listAgents();
				const agentName = agents.agents[0]?.id;
				expect(agentName).toBeTruthy();
				if (!agentName) throw new Error("no healthy agents");

				const project = await client.createProject({
					name: "Lifecycle",
					cwd: REPO_ROOT,
				});
				const projectId = project.project.id;

				const before = await client.listThreads({ projectId });
				expect(before.threads).toEqual([]);

				// Probe catalog for a draft — no thread row should appear afterward
				// (probe session is closed; controller-visible worker state stays empty).
				const catalog = await client.getDraftCatalog({
					agentName,
					projectId,
				});
				expect(catalog.models.length).toBeGreaterThan(0);

				const afterProbe = await client.listThreads({ projectId });
				expect(afterProbe.threads).toEqual([]);

				const started = await client.startThread({
					projectId,
					agentName,
					message: [{ type: "text", text: "hello lifecycle" }],
				});

				expect(started.threadId).toBeTruthy();

				const afterStart = await client.listThreads({ projectId });
				expect(afterStart.threads).toHaveLength(1);
				expect(afterStart.threads[0]?.id).toBe(started.threadId);
				expect(afterStart.threads[0]?.agentLocked).toBe(true);
				expect(afterStart.threads[0]?.agentName).toBe(agentName);
				expect(afterStart.threads[0]?.sessionId).toBeTruthy();
			} finally {
				rtc?.close();
				connected.session.close();
			}
		});
	}, 180_000);
});
