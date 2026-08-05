import { describe, expect, test } from "vitest";
import {
	type CatalogOption,
	pickCatalogAgent,
	pickDisplayOption,
	pickExplicitOption,
} from "./selectors";

const AGENTS: CatalogOption[] = [
	{ id: "claude", name: "Claude" },
	{ id: "codex", name: "Codex" },
];

describe("pickExplicitOption", () => {
	test("returns empty string when no id is given", () => {
		expect(pickExplicitOption(undefined, AGENTS)).toBe("");
	});

	test("returns empty string when the id is not in the options", () => {
		expect(pickExplicitOption("missing", AGENTS)).toBe("");
	});

	test("returns the id when it matches an option", () => {
		expect(pickExplicitOption("codex", AGENTS)).toBe("codex");
	});
});

describe("pickDisplayOption", () => {
	test("falls back to the first option when no id is given", () => {
		expect(pickDisplayOption(undefined, AGENTS)).toBe("claude");
	});

	test("falls back to the first option when the id is not in the options", () => {
		expect(pickDisplayOption("missing", AGENTS)).toBe("claude");
	});

	test("returns the id when it matches an option", () => {
		expect(pickDisplayOption("codex", AGENTS)).toBe("codex");
	});
});

describe("pickCatalogAgent", () => {
	test("non-draft threads use the preferred agent, falling back to displayAgent", () => {
		expect(
			pickCatalogAgent({
				catalogArmed: false,
				displayAgent: "claude",
				isDraft: false,
				pendingAgent: undefined,
				preferredAgent: "codex",
			})
		).toBe("codex");

		expect(
			pickCatalogAgent({
				catalogArmed: false,
				displayAgent: "claude",
				isDraft: false,
				pendingAgent: undefined,
				preferredAgent: undefined,
			})
		).toBe("claude");
	});

	test("draft threads withhold the agent until the catalog is armed, even with a default pendingAgent", () => {
		expect(
			pickCatalogAgent({
				catalogArmed: false,
				displayAgent: "claude",
				isDraft: true,
				pendingAgent: "claude",
				preferredAgent: "claude",
			})
		).toBe("");
	});

	test("armed draft threads surface the pending agent so the probe can fire", () => {
		expect(
			pickCatalogAgent({
				catalogArmed: true,
				displayAgent: "claude",
				isDraft: true,
				pendingAgent: "claude",
				preferredAgent: "claude",
			})
		).toBe("claude");
	});

	test("armed draft threads with no pending agent yet stay empty", () => {
		expect(
			pickCatalogAgent({
				catalogArmed: true,
				displayAgent: "",
				isDraft: true,
				pendingAgent: undefined,
				preferredAgent: undefined,
			})
		).toBe("");
	});
});
