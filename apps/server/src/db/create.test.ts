import { describe, expect, test } from "bun:test";
import { resolveDbDriver } from "./create";

describe("createPostgresDb", () => {
	test("defaults to neon-http in production-like environments", () => {
		expect(resolveDbDriver(undefined)).toBe("neon-http");
		expect(resolveDbDriver("neon-http")).toBe("neon-http");
	});

	test("selects postgres-js for integration tests", () => {
		expect(resolveDbDriver("postgres-js")).toBe("postgres-js");
	});
});
