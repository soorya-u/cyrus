import { describe, expect, test } from "bun:test";

function shouldShowModeSelector(modes: Array<{ id: string; name: string }>) {
	return modes.length > 0;
}

describe("composer mode selector", () => {
	test("hides mode selector when no modes are available", () => {
		expect(shouldShowModeSelector([])).toBe(false);
	});

	test("shows mode selector when modes exist", () => {
		expect(shouldShowModeSelector([{ id: "plan", name: "Plan" }])).toBe(true);
	});
});
