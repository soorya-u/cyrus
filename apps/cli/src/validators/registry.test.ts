import { describe, expect, test } from "bun:test";
import { InvalidArgumentError } from "@commander-js/extra-typings";
import {
	acpRegistrySchema,
	registryIdArgParser,
	registryIdSchema,
} from "./registry";

describe("registryIdSchema", () => {
	test("accepts lowercase hyphenated ids", () => {
		expect(registryIdSchema.parse("claude-acp")).toBe("claude-acp");
	});

	test("rejects uppercase ids", () => {
		expect(() => registryIdSchema.parse("Claude-ACP")).toThrow();
	});

	test("rejects empty ids", () => {
		expect(() => registryIdSchema.parse("")).toThrow();
	});
});

describe("registryIdArgParser", () => {
	test("returns parsed ids", () => {
		expect(registryIdArgParser("codex-acp")).toBe("codex-acp");
	});

	test("throws InvalidArgumentError for invalid ids", () => {
		expect(() => registryIdArgParser("Bad Id")).toThrow(InvalidArgumentError);
	});
});

describe("acpRegistrySchema", () => {
	test("parses registry agents with distribution defaults", () => {
		expect(
			acpRegistrySchema.parse({
				version: "1.0.0",
				agents: [
					{
						id: "claude-acp",
						name: "Claude Agent",
						distribution: {
							npx: { package: "@scope/pkg@1.0.0" },
						},
					},
				],
			})
		).toEqual({
			version: "1.0.0",
			agents: [
				{
					id: "claude-acp",
					name: "Claude Agent",
					distribution: {
						binary: {},
						npx: { package: "@scope/pkg@1.0.0", args: [] },
					},
				},
			],
		});
	});

	test("rejects invalid agent ids", () => {
		expect(() =>
			acpRegistrySchema.parse({
				agents: [
					{
						id: "INVALID",
						name: "Bad",
						distribution: { binary: {} },
					},
				],
			})
		).toThrow();
	});
});
