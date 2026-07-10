import type { ChatChunk } from "@cyrus/schemas/rtc/chat";

export class TurnInterruptedError extends Error {
	readonly name = "TurnInterruptedError";

	constructor() {
		super("turn interrupted");
	}
}

export function isTurnInterruptedError(error: unknown): boolean {
	return (
		error instanceof TurnInterruptedError ||
		(error instanceof Error && error.message === "turn interrupted")
	);
}

type TurnWaiter = {
	resolve: () => void;
	reject: (error: Error) => void;
	onAbort?: () => void;
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
		waiter.resolve();
		return;
	}
	waiter.reject(new TurnInterruptedError());
}

export function rejectTurnWaiter(
	threadId: string,
	turnId: string,
	error: Error
): void {
	const key = turnKey(threadId, turnId);
	const waiter = turnWaiters.get(key);
	if (!waiter) return;

	turnWaiters.delete(key);
	waiter.reject(error);
}

export function waitForTurnEnd(
	threadId: string,
	turnId: string,
	signal?: AbortSignal
): Promise<void> {
	return new Promise((resolve, reject) => {
		const key = turnKey(threadId, turnId);

		function cleanup() {
			signal?.removeEventListener("abort", onAbort);
			turnWaiters.delete(key);
		}

		function onAbort() {
			cleanup();
			reject(new Error("turn aborted"));
		}

		if (signal?.aborted) {
			onAbort();
			return;
		}

		signal?.addEventListener("abort", onAbort, { once: true });

		turnWaiters.set(key, {
			resolve: () => {
				cleanup();
				resolve();
			},
			reject: (error) => {
				cleanup();
				reject(error);
			},
			onAbort,
		});
	});
}
