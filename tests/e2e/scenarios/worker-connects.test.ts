import { describe, expect, test } from "bun:test";
import { connectSignaling } from "@cyrus/connections/rtc/session";
import { isE2eEnabled, requireE2e } from "../harness/env";
import { startE2eStack, stopE2eStack } from "../harness/stack";

const e2eDescribe = isE2eEnabled() ? describe : describe.skip;

e2eDescribe("worker connects", () => {
	test("server accepts a logged-in CLI worker", async () => {
		requireE2e();
		const stack = await startE2eStack();

		try {
			const controller = await connectSignaling({
				host: "http://127.0.0.1:8787",
				room: stack.auth.userId,
				role: "controller",
				id: "e2e-controller",
				name: "E2E Controller",
				token: stack.auth.token,
			});

			const peers = await controller.signaling.listPeers();
			expect(peers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						role: "worker",
						name: "E2E Worker",
					}),
				])
			);

			controller.close();
		} finally {
			await stopE2eStack(stack);
		}
	}, 120_000);
});
