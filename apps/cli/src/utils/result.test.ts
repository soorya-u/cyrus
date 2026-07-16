import { describe, expect, test } from "bun:test";
import { coordinatorNotFound } from "@cyrus/errors/coordinator";
import { orpcOk } from "@cyrus/errors/orpc";
import { ORPCError } from "@orpc/server";
import { Result } from "better-result";

describe("orpcOk", () => {
	test("returns the ok value", () => {
		expect(orpcOk(Result.ok(42))).toBe(42);
	});

	test("throws ORPCError for tagged errors", () => {
		expect(() =>
			orpcOk(Result.err(coordinatorNotFound("thread", "t1")))
		).toThrow(ORPCError);
	});
});
