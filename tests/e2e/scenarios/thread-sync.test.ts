import { describe, expect, test } from "bun:test";
import { E2E_SERVER_URL, isE2eEnabled, requireE2e } from "../harness/env";
import { connectE2eController } from "../harness/signaling";
import { runE2eScenario } from "../harness/stack";

const e2eDescribe = isE2eEnabled() ? describe : describe.skip;

e2eDescribe("thread metadata sync", () => {
	test("controller sees worker metadata after hub join", async () => {
		requireE2e();
		await runE2eScenario(async (stack) => {
			const { peers } = await connectE2eController({
				host: E2E_SERVER_URL,
				room: stack.auth.userId,
				role: "controller",
				id: "e2e-controller-sync",
				name: "E2E Controller Sync",
				token: stack.auth.token,
			});

			expect(peers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: expect.any(String),
						name: "E2E Worker",
						role: "worker",
					}),
				])
			);
		});
	}, 180_000);
});
