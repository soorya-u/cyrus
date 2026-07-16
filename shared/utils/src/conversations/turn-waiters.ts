import type { TurnWaitError } from "@cyrus/errors/turn";
import { turnAborted, turnInterrupted } from "@cyrus/errors/turn";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import { Result } from "better-result";

type TurnWaiter = {
	settle: (result: Result<void, TurnWaitError>) => void;
};

const turnWaiters = new Map<string, TurnWaiter>();

function turnKey(threadId: string, turnId: string): string {
	return `${threadId}:${turnId}`;
}

function isTerminalEvent(
	event: ChatChunk["event"]
): event is Extract<
	ChatChunk["event"],
	{ type: "turn_completed" | "turn_interrupted" }
> {
	return event.type === "turn_completed" || event.type === "turn_interrupted";
}

export function settleTurnWaiter(
	threadId: string,
	turnId: string,
	event: ChatChunk["event"]
): void {
	if (!isTerminalEvent(event)) return;

	const key = turnKey(threadId, turnId);
	const waiter = turnWaiters.get(key);
	if (!waiter) return;

	turnWaiters.delete(key);
	if (event.type === "turn_completed") {
		waiter.settle(Result.ok(undefined));
		return;
	}
	waiter.settle(Result.err(turnInterrupted()));
}

export function rejectTurnWaiter(
	threadId: string,
	turnId: string,
	error: TurnWaitError
): void {
	const key = turnKey(threadId, turnId);
	const waiter = turnWaiters.get(key);
	if (!waiter) return;

	turnWaiters.delete(key);
	waiter.settle(Result.err(error));
}

export function waitForTurnEnd(
	threadId: string,
	turnId: string,
	signal?: AbortSignal
): Promise<Result<void, TurnWaitError>> {
	return new Promise((resolve) => {
		const key = turnKey(threadId, turnId);

		function cleanup() {
			signal?.removeEventListener("abort", onAbort);
			turnWaiters.delete(key);
		}

		function onAbort() {
			cleanup();
			resolve(Result.err(turnAborted()));
		}

		if (signal?.aborted) {
			onAbort();
			return;
		}

		signal?.addEventListener("abort", onAbort, { once: true });

		turnWaiters.set(key, {
			settle: (result) => {
				cleanup();
				resolve(result);
			},
		});
	});
}
