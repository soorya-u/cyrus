import { join } from "node:path";
import { Result } from "better-result";
import { describe, expect, test } from "vitest";
import { connectE2eControllerRtc } from "../harness/controller";
import { E2E_SERVER_URL, isE2eEnabled, requireE2e } from "../harness/env";
import { connectE2eController } from "../harness/signaling";
import { runE2eScenario } from "../harness/stack";
import { wsTicketProtocols } from "../harness/ws-ticket";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const e2eDescribe = isE2eEnabled() ? describe : describe.skip;

e2eDescribe("catalog", () => {
	test("controller gets and sets a bound thread catalog", async () => {
		requireE2e();
		await runE2eScenario(async (stack) => {
			const connected = await connectE2eController({
				host: E2E_SERVER_URL,
				room: stack.auth.userId,
				role: "controller",
				id: "e2e-controller-catalog",
				name: "E2E Controller Catalog",
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
					name: "Catalog",
					cwd: REPO_ROOT,
				});
				const projectId = project.project.id;

				const started = await client.startThread({
					projectId,
					agentName,
					message: [{ type: "text", text: "catalog verify" }],
				});
				const threadId = started.threadId;
				expect(threadId).toBeTruthy();

				const models = await client.getModels({ threadId });
				const modes = await client.getModes({ threadId });
				const efforts = await client.getEfforts({ threadId });
				const personas = await client.getPersona({ threadId });

				expect(models.models.length).toBeGreaterThan(0);
				expect(modes.modes.length).toBeGreaterThan(0);
				expect(efforts.efforts.length).toBeGreaterThan(0);
				expect(Array.isArray(personas.personas)).toBe(true);

				const modelId = models.models[0]?.id;
				const modeId = modes.modes[0]?.id;
				const effortId = efforts.efforts[0]?.id;
				expect(modelId).toBeTruthy();
				expect(modeId).toBeTruthy();
				expect(effortId).toBeTruthy();
				if (!(modelId && modeId && effortId)) {
					throw new Error("catalog is missing required options");
				}

				const setModelResult = await Result.tryPromise(() =>
					client.setModel({
						threadId,
						projectId,
						agentName,
						modelId,
					})
				);
				// Some agents advertise models without implementing session/set_model.
				if (setModelResult.isOk()) {
					expect(setModelResult.value).toEqual({});
				}

				expect(
					await client.setMode({
						threadId,
						projectId,
						agentName,
						modeId,
					})
				).toEqual({});
				expect(
					await client.setEffort({
						threadId,
						projectId,
						agentName,
						effortId,
					})
				).toEqual({});

				const personaId = personas.personas[0]?.id;
				if (personaId) {
					expect(
						await client.setPersona({
							threadId,
							projectId,
							agentName,
							personaId,
						})
					).toEqual({});
				}
			} finally {
				rtc?.close();
				connected.session.close();
			}
		});
	}, 180_000);
});
