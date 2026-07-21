import { isTurnInterruptedError, turnWaitFailed } from "@cyrus/errors/turn";
import { describe, expect, test } from "vitest";
import {
	rejectTurnWaiter,
	settleTurnWaiter,
	waitForTurnEnd,
} from "./turn-waiters";

describe("turn waiters", () => {
	test("resolves when a turn completes", async () => {
		const ended = waitForTurnEnd("thread-complete", "turn-1");

		settleTurnWaiter("thread-complete", "turn-1", {
			type: "turn_completed",
		});

		const result = await ended;
		expect(result.isOk()).toBe(true);
	});

	test("returns interrupted error when a turn is interrupted", async () => {
		const ended = waitForTurnEnd("thread-interrupt", "turn-1");

		settleTurnWaiter("thread-interrupt", "turn-1", {
			type: "turn_interrupted",
		});

		const result = await ended;
		expect(result.isErr()).toBe(true);
		if (result.isOk()) return;
		expect(isTurnInterruptedError(result.error)).toBe(true);
		expect(result.error.message).toBe("turn interrupted");
	});

	test("ignores non-terminal events", async () => {
		const ended = waitForTurnEnd("thread-token", "turn-1");

		settleTurnWaiter("thread-token", "turn-1", {
			type: "token",
			text: "hello",
		});
		settleTurnWaiter("thread-token", "turn-1", {
			type: "turn_completed",
		});

		const result = await ended;
		expect(result.isOk()).toBe(true);
	});

	test("rejects explicitly and removes the waiter", async () => {
		const ended = waitForTurnEnd("thread-error", "turn-1");

		rejectTurnWaiter("thread-error", "turn-1", turnWaitFailed("boom"));
		settleTurnWaiter("thread-error", "turn-1", {
			type: "turn_completed",
		});

		const result = await ended;
		expect(result.isErr()).toBe(true);
		if (result.isOk()) return;
		expect(result.error.message).toBe("boom");
	});

	test("returns aborted when the abort signal is already aborted", async () => {
		const controller = new AbortController();
		controller.abort();

		const result = await waitForTurnEnd(
			"thread-abort",
			"turn-1",
			controller.signal
		);
		expect(result.isErr()).toBe(true);
		if (result.isOk()) return;
		expect(result.error.message).toBe("turn aborted");
	});
});
