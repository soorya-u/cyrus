import { describe, expect, test } from "bun:test";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import { createThreadEventBus } from "./bus";

function persistedChunk(seq: number, turnId = "turn-1"): ChatChunk {
	return {
		threadId: "thread-1",
		turnId,
		seq,
		event: { type: "message_completed", text: "done", messageId: "m1" },
	};
}

function tokenChunk(turnId = "turn-1"): ChatChunk {
	return {
		threadId: "thread-1",
		turnId,
		seq: 0,
		event: { type: "token", text: "hi", messageId: "m1" },
	};
}

function createReader(iterator: AsyncGenerator<ChatChunk>) {
	let pending = iterator.next();
	return {
		async next(): Promise<ChatChunk> {
			const result = await pending;
			pending = iterator.next();
			if (result.done) throw new Error("iterator ended unexpectedly");
			return result.value;
		},
	};
}

describe("thread event bus", () => {
	test("stamps ephemeral chunks with the last known persisted anchor and an increasing sub", async () => {
		const bus = createThreadEventBus();
		bus.watch("peer-1", "thread-1");
		const reader = createReader(bus.subscribe("peer-1"));

		bus.publish(persistedChunk(5));
		bus.publish(tokenChunk());
		bus.publish(tokenChunk());

		const first = await reader.next();
		expect(first.seq).toBe(5);
		expect(first.sub).toBeUndefined();

		expect(await reader.next()).toMatchObject({ seq: 5, sub: 1 });
		expect(await reader.next()).toMatchObject({ seq: 5, sub: 2 });
	});

	test("does not replay ephemeral chunks on reconnect, but does replay persisted ones", async () => {
		const bus = createThreadEventBus();
		bus.watch("peer-1", "thread-1");
		const first = createReader(bus.subscribe("peer-1"));

		bus.publish(persistedChunk(5));
		bus.publish(tokenChunk());
		await first.next();
		await first.next();

		// Simulate a reconnect: same peerId subscribes again.
		const second = createReader(bus.subscribe("peer-1"));
		const replayed = await second.next();
		expect(replayed.seq).toBe(5);
		expect(replayed.sub).toBeUndefined();

		bus.publish(tokenChunk());
		const live = await second.next();
		// The sub counter keeps advancing across a reconnect (it's per-anchor,
		// not per-connection) — the first ephemeral chunk before the reconnect
		// already claimed sub 1.
		expect(live).toMatchObject({ sub: 2 });
	});

	test("advances the anchor and resets sub once new content persists", async () => {
		const bus = createThreadEventBus();
		bus.watch("peer-1", "thread-1");
		const reader = createReader(bus.subscribe("peer-1"));

		bus.publish(persistedChunk(5));
		bus.publish(tokenChunk());
		bus.publish(persistedChunk(6));
		bus.publish(tokenChunk());

		const a = await reader.next();
		expect(a.seq).toBe(5);
		expect(a.sub).toBeUndefined();
		expect(await reader.next()).toMatchObject({ seq: 5, sub: 1 });

		const b = await reader.next();
		expect(b.seq).toBe(6);
		expect(b.sub).toBeUndefined();
		expect(await reader.next()).toMatchObject({ seq: 6, sub: 1 });
	});

	test("evicts the oldest persisted chunk once a turn's log exceeds its bound", async () => {
		const bus = createThreadEventBus({ maxChunksPerTurn: 3 });
		bus.watch("peer-1", "thread-1");
		const first = createReader(bus.subscribe("peer-1"));

		bus.publish(persistedChunk(1));
		bus.publish(persistedChunk(2));
		bus.publish(persistedChunk(3));
		bus.publish(persistedChunk(4));
		await first.next();
		await first.next();
		await first.next();
		await first.next();

		bus.watch("peer-2", "thread-1");
		const second = createReader(bus.subscribe("peer-2"));

		expect(await second.next()).toMatchObject({ seq: 2 });
		expect(await second.next()).toMatchObject({ seq: 3 });
		expect(await second.next()).toMatchObject({ seq: 4 });
	});
});
