import { describe, expect, test } from "bun:test";
import { generateName, randomId } from "./identity";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z]+-[a-z]+$/;

describe("identity helpers", () => {
	test("randomId returns a uuid", () => {
		const id = randomId();

		expect(id).toMatch(UUID_PATTERN);
	});

	test("generateName returns a two-word slug", () => {
		const name = generateName();

		expect(name).toMatch(SLUG_PATTERN);
	});
});
