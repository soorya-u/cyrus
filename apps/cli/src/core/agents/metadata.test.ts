import { describe, expect, mock, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import {
	commandsFromSession,
	SessionMetadataStore,
	usageFromSession,
} from "./metadata";

function createSession(overrides?: {
	commands?: Array<{ name: string; description: string }>;
	usage?: { used?: number; totalTokens?: number; size?: number };
	on?: RuntimeSession["on"];
}): RuntimeSession {
	return {
		sessionId: "session-1",
		transcript: {
			session: {
				commands: overrides?.commands ?? [
					{ name: "/help", description: "help" },
				],
				usage: overrides?.usage ?? { used: 10, size: 100 },
				configOptions: [],
			},
		},
		on: overrides?.on ?? (() => () => undefined),
	} as unknown as RuntimeSession;
}

describe("commandsFromSession / usageFromSession", () => {
	test("reads commands and usage from session transcript", () => {
		const session = createSession();
		expect(commandsFromSession(session)).toEqual([
			{ name: "/help", description: "help" },
		]);
		expect(usageFromSession(session)).toEqual({ used: 10, limit: 100 });
	});

	test("falls back to totalTokens when used is missing", () => {
		const session = createSession({ usage: { totalTokens: 42, size: 200 } });
		expect(usageFromSession(session)).toEqual({ used: 42, limit: 200 });
	});
});

describe("SessionMetadataStore", () => {
	test("attach seeds commands and usage from the session", () => {
		const store = new SessionMetadataStore();
		store.attach("thread-1", createSession());

		expect(store.getAvailableCommands("thread-1")).toEqual([
			{ name: "/help", description: "help" },
		]);
		expect(store.getContextUsage("thread-1")).toEqual({ used: 10, limit: 100 });
	});

	test("getContextUsage returns null when usage is empty", () => {
		const store = new SessionMetadataStore();
		store.attach("thread-1", createSession({ usage: {} }));
		expect(store.getContextUsage("thread-1")).toBeNull();
	});

	test("syncFromEvent updates commands and usage", () => {
		const store = new SessionMetadataStore();
		store.attach("thread-1", createSession());

		store.syncFromEvent("thread-1", {
			type: "session.commands.updated",
			commands: [{ name: "/status", description: "status" }],
		});
		expect(store.getAvailableCommands("thread-1")).toEqual([
			{ name: "/status", description: "status" },
		]);

		store.syncFromEvent("thread-1", {
			type: "session.usage.updated",
			used: 50,
			size: 200,
		});
		expect(store.getContextUsage("thread-1")).toEqual({ used: 50, limit: 200 });
	});

	test("detach clears metadata and unsubscribes", () => {
		const unsub = mock(() => undefined);
		const store = new SessionMetadataStore();
		store.attach(
			"thread-1",
			createSession({
				on: () => unsub,
			})
		);

		store.detach("thread-1");

		expect(unsub).toHaveBeenCalled();
		expect(store.getAvailableCommands("thread-1")).toEqual([]);
		expect(store.getContextUsage("thread-1")).toBeNull();
	});
});
