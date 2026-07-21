import { describe, expect, test } from "vitest";
import { formatElapsedTimer, formatElapsedTimerNow } from "./timer";

describe("timer helpers", () => {
	test("formats sub-minute durations in seconds", () => {
		expect(
			formatElapsedTimer("2026-07-12T10:00:00.000Z", "2026-07-12T10:00:05.000Z")
		).toBe("5s");
	});

	test("formats minute durations without trailing seconds", () => {
		expect(
			formatElapsedTimer("2026-07-12T10:00:00.000Z", "2026-07-12T10:02:00.000Z")
		).toBe("2m");
	});

	test("formats minute durations with remainder seconds", () => {
		expect(
			formatElapsedTimer("2026-07-12T10:00:00.000Z", "2026-07-12T10:02:30.000Z")
		).toBe("2m 30s");
	});

	test("returns null for invalid timestamps", () => {
		expect(
			formatElapsedTimer("invalid", "2026-07-12T10:00:00.000Z")
		).toBeNull();
	});

	test("formatElapsedTimerNow falls back to zero seconds", () => {
		expect(formatElapsedTimerNow("invalid")).toBe("0s");
	});
});
