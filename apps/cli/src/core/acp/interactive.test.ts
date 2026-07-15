import { describe, expect, test } from "bun:test";
import { PermissionDecision } from "@acp-kit/core";
import { InteractivePendingRegistry } from "./interactive";

describe("InteractivePendingRegistry", () => {
	test("blocks permission until respondApproval resolves", async () => {
		const registry = new InteractivePendingRegistry();
		const events: unknown[] = [];
		registry.bindTurn({
			sessionId: "session-1",
			threadId: "thread-1",
			turnId: "turn-1",
			pushEvent: (event) => events.push(event),
		});

		const pending = registry.requestPermission({
			sessionId: "session-1",
			toolCallId: "tool-1",
			toolName: "edit",
			title: "Write file",
			input: {},
			options: [
				{ optionId: "allow-once", name: "Allow", kind: "allow_once" },
				{ optionId: "reject-once", name: "Reject", kind: "reject_once" },
			],
			raw: {
				sessionId: "session-1",
				toolCall: { toolCallId: "tool-1", title: "Write file" },
				options: [
					{ optionId: "allow-once", name: "Allow", kind: "allow_once" },
					{ optionId: "reject-once", name: "Reject", kind: "reject_once" },
				],
			} as never,
		});

		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({ type: "approval_request" });

		let settled = false;
		pending
			.then(() => {
				settled = true;
			})
			.catch(() => undefined);
		await Promise.resolve();
		expect(settled).toBe(false);

		expect(
			registry.respondApproval({
				threadId: "thread-1",
				toolCallId: "tool-1",
				optionId: "allow-once",
			})
		).toEqual({ turnId: "turn-1" });

		await expect(pending).resolves.toBe(PermissionDecision.AllowOnce);
	});

	test("cancel denies pending permissions and declines elicitations", async () => {
		const registry = new InteractivePendingRegistry();
		registry.bindTurn({
			sessionId: "session-1",
			threadId: "thread-1",
			turnId: "turn-1",
			pushEvent: () => undefined,
		});

		const permission = registry.requestPermission({
			sessionId: "session-1",
			toolCallId: "tool-1",
			toolName: "bash",
			title: "Run",
			input: {},
			options: [{ optionId: "allow-once", name: "Allow", kind: "allow_once" }],
			raw: {
				sessionId: "session-1",
				toolCall: { toolCallId: "tool-1", title: "Run" },
				options: [
					{ optionId: "allow-once", name: "Allow", kind: "allow_once" },
				],
			} as never,
		});

		const elicitation = registry.awaitElicitation({
			sessionId: "session-1",
			elicitationId: "elicit-1",
			event: {
				type: "elicitation_request",
				sessionId: "session-1",
				request: {
					mode: "form",
					elicitationId: "elicit-1",
					message: "Name?",
					requestedSchema: {
						type: "object",
						properties: { name: { type: "string" } },
					},
				},
			},
		});

		registry.clearThread("thread-1");

		await expect(permission).resolves.toBe(PermissionDecision.Deny);
		await expect(elicitation).resolves.toEqual({ action: "decline" });
	});

	test("elicitation blocks until respondElicitation", async () => {
		const registry = new InteractivePendingRegistry();
		registry.bindTurn({
			sessionId: "session-1",
			threadId: "thread-1",
			turnId: "turn-1",
			pushEvent: () => undefined,
		});

		const pending = registry.awaitElicitation({
			sessionId: "session-1",
			elicitationId: "elicit-1",
			event: {
				type: "elicitation_request",
				sessionId: "session-1",
				request: {
					mode: "url",
					elicitationId: "elicit-1",
					url: "https://example.com",
				},
			},
		});

		expect(
			registry.respondElicitation({
				threadId: "thread-1",
				elicitationId: "elicit-1",
				action: "decline",
			})
		).toEqual({ turnId: "turn-1" });

		await expect(pending).resolves.toEqual({ action: "decline" });
	});

	test("duplicate elicitation declines without orphaning the first wait", async () => {
		const registry = new InteractivePendingRegistry();
		registry.bindTurn({
			sessionId: "session-1",
			threadId: "thread-1",
			turnId: "turn-1",
			pushEvent: () => undefined,
		});

		const event = {
			type: "elicitation_request" as const,
			sessionId: "session-1",
			request: {
				mode: "url" as const,
				elicitationId: "elicit-1",
				url: "https://example.com",
			},
		};

		const first = registry.awaitElicitation({
			sessionId: "session-1",
			elicitationId: "elicit-1",
			event,
		});

		await expect(
			registry.awaitElicitation({
				sessionId: "session-1",
				elicitationId: "elicit-1",
				event,
			})
		).resolves.toEqual({ action: "decline" });

		expect(
			registry.respondElicitation({
				threadId: "thread-1",
				elicitationId: "elicit-1",
				action: "accept",
			})
		).toEqual({ turnId: "turn-1" });

		await expect(first).resolves.toEqual({ action: "accept" });
	});

	test("respondApproval rejects wrong thread", () => {
		const registry = new InteractivePendingRegistry();
		registry.bindTurn({
			sessionId: "session-1",
			threadId: "thread-1",
			turnId: "turn-1",
			pushEvent: () => undefined,
		});

		const pending = registry.requestPermission({
			sessionId: "session-1",
			toolCallId: "tool-1",
			toolName: "edit",
			title: "Write",
			input: {},
			options: [{ optionId: "allow-once", name: "Allow", kind: "allow_once" }],
			raw: {
				sessionId: "session-1",
				toolCall: { toolCallId: "tool-1", title: "Write" },
				options: [
					{ optionId: "allow-once", name: "Allow", kind: "allow_once" },
				],
			} as never,
		});
		pending.catch(() => undefined);

		expect(
			registry.respondApproval({
				threadId: "other-thread",
				toolCallId: "tool-1",
				optionId: "allow-once",
			})
		).toBeNull();

		expect(
			registry.respondApproval({
				threadId: "thread-1",
				toolCallId: "tool-1",
				optionId: "allow-once",
			})
		).toEqual({ turnId: "turn-1" });
	});
});
