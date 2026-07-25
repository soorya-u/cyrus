import { describe, expect, test } from "vitest";
import { checkHealth } from "./health";

describe("checkHealth", () => {
	test("reports healthy when the D1 binding answers", async () => {
		expect(await checkHealth()).toBe(true);
	});
});
