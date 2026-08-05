import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";
import { describe, expect, test } from "vitest";
import {
	currentMaxPersistedSeq,
	isSnapshotBehindWatermark,
	mergeConversationEntries,
	sortConversationEntries,
} from "./entries";

function entry(
	id: string,
	seq: number,
	turnId: string,
	event: ConversationEntry["chunk"]["event"],
	options: { sub?: number; createdAt?: string } = {}
): ConversationEntry {
	const { sub, createdAt = "2026-01-01T00:00:00.000Z" } = options;
	return {
		id,
		threadId: "thread-1",
		seq,
		sub,
		chunk: { threadId: "thread-1", turnId, seq, sub, event },
		createdAt,
	};
}

describe("sortConversationEntries", () => {
	test("orders persisted entries by seq, with ephemeral deltas slotted after their anchor by sub", () => {
		const entries = [
			entry("delta", 1, "turn-1", { type: "token", text: "hi" }, { sub: 1 }),
			entry("completed", 2, "turn-1", { type: "turn_completed" }),
			entry("user", 1, "turn-1", { type: "user_message", content: "go" }),
		];

		const sorted = sortConversationEntries(entries);

		expect(sorted.map((e) => e.id)).toEqual(["user", "delta", "completed"]);
	});

	test("does not drop an ephemeral user message even once a persisted twin exists", () => {
		const entries = [
			entry(
				"ephemeral",
				0,
				"turn-1",
				{ type: "user_message", content: "hi" },
				{ sub: 0 }
			),
			entry("persisted", 1, "turn-1", {
				type: "user_message",
				content: "hi",
			}),
		];

		const sorted = sortConversationEntries(entries);

		expect(sorted.map((e) => e.id)).toEqual(["ephemeral", "persisted"]);
	});
});

describe("currentMaxPersistedSeq", () => {
	test("ignores ephemeral entries and returns the highest persisted seq", () => {
		const entries = [
			entry("persisted-1", 3, "turn-1", { type: "turn_completed" }),
			entry("delta", 3, "turn-1", { type: "token", text: "hi" }, { sub: 5 }),
			entry("persisted-2", 1, "turn-1", {
				type: "user_message",
				content: "go",
			}),
		];

		expect(currentMaxPersistedSeq(entries)).toBe(3);
	});

	test("returns 0 when nothing is persisted yet", () => {
		expect(currentMaxPersistedSeq([])).toBe(0);
	});
});

describe("mergeConversationEntries", () => {
	test("drops the ephemeral user message once a persisted twin arrives from the merge", () => {
		const cached: ConversationEntry[] = [
			entry(
				"ephemeral",
				0,
				"turn-1",
				{ type: "user_message", content: "hi" },
				{ sub: 0 }
			),
		];
		const fetched: ConversationEntry[] = [
			entry("persisted", 1, "turn-1", {
				type: "user_message",
				content: "hi",
			}),
		];

		const merged = mergeConversationEntries(cached, fetched);

		expect(merged.map((e) => e.id)).toEqual(["persisted"]);
	});

	test("keeps persisted entries from fetched over stale cached duplicates at the same seq", () => {
		const cached: ConversationEntry[] = [
			entry("stale", 1, "turn-1", { type: "user_message", content: "old" }),
		];
		const fetched: ConversationEntry[] = [
			entry("fresh", 1, "turn-1", { type: "user_message", content: "new" }),
		];

		const merged = mergeConversationEntries(cached, fetched);

		expect(merged.map((e) => e.id)).toEqual(["fresh"]);
	});

	test("never dedupes a real ephemeral delta by its shared anchor seq", () => {
		const cached: ConversationEntry[] = [
			entry("delta-1", 2, "turn-1", { type: "token", text: "a" }, { sub: 1 }),
		];
		const fetched: ConversationEntry[] = [
			entry("persisted", 2, "turn-1", { type: "turn_completed" }),
		];

		const merged = mergeConversationEntries(cached, fetched);

		expect(merged.map((e) => e.id).sort()).toEqual(["delta-1", "persisted"]);
	});
});

describe("isSnapshotBehindWatermark", () => {
	test("is true when the watermark is ahead of the cached snapshot's max persisted seq", () => {
		const cached: ConversationEntry[] = [
			entry("persisted", 2, "turn-1", { type: "turn_completed" }),
		];

		expect(isSnapshotBehindWatermark(cached, 5)).toBe(true);
	});

	test("is false once the cached snapshot already covers the watermark", () => {
		const cached: ConversationEntry[] = [
			entry("persisted", 5, "turn-1", { type: "turn_completed" }),
		];

		expect(isSnapshotBehindWatermark(cached, 5)).toBe(false);
	});

	test("is false for an empty snapshot with no durable watermark yet", () => {
		expect(isSnapshotBehindWatermark([], 0)).toBe(false);
	});
});
