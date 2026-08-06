import { describe, expect, test } from "vitest";
import {
	type CatalogOption,
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
