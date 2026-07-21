import { describe, expect, test } from "vitest";
import { E2E_SERVER_URL, isE2eEnabled, requireE2e } from "../harness/env";
import { connectE2eController } from "../harness/signaling";
import { runE2eScenario } from "../harness/stack";
import { wsTicketProtocols } from "../harness/ws-ticket";

const e2eDescribe = isE2eEnabled() ? describe : describe.skip;

e2eDescribe("worker connects", () => {
	test("server accepts a logged-in CLI worker", async () => {
		requireE2e();
		await runE2eScenario(async (stack) => {
			const { peers } = await connectE2eController({
				host: E2E_SERVER_URL,
				room: stack.auth.userId,
				role: "controller",
				id: "e2e-controller",
				name: "E2E Controller",
				protocols: wsTicketProtocols(stack.auth.token),
			});

			expect(peers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						role: "worker",
						name: "E2E Worker",
					}),
				])
			);
		});
	}, 180_000);
});
