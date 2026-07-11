import { describe, expect, test } from "bun:test";
import {
	isTurnInterruptedError,
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

		await expect(ended).resolves.toBeUndefined();
	});

	test("rejects with an interrupted error when a turn is interrupted", async () => {
		const ended = waitForTurnEnd("thread-interrupt", "turn-1");

		settleTurnWaiter("thread-interrupt", "turn-1", {
			type: "turn_interrupted",
		});

		await expect(ended).rejects.toThrow("turn interrupted");
		await ended.catch((error) =>
			expect(isTurnInterruptedError(error)).toBe(true)
		);
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

		await expect(ended).resolves.toBeUndefined();
	});

	test("rejects explicitly and removes the waiter", async () => {
		const ended = waitForTurnEnd("thread-error", "turn-1");

		rejectTurnWaiter("thread-error", "turn-1", new Error("boom"));
		settleTurnWaiter("thread-error", "turn-1", {
			type: "turn_completed",
		});

		await expect(ended).rejects.toThrow("boom");
	});

	test("rejects immediately when the abort signal is already aborted", async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			waitForTurnEnd("thread-abort", "turn-1", controller.signal)
		).rejects.toThrow("turn aborted");
	});
});
