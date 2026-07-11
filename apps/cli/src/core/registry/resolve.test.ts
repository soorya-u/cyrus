import { describe, expect, test } from "bun:test";
import type { RegistryAgent } from "@/validators/registry";
import { resolveAgentSpawn } from "./resolve";

function agent(overrides: Partial<RegistryAgent> = {}): RegistryAgent {
	return {
		id: "test-agent",
		name: "Test Agent",
		distribution: {
			binary: {},
			npx: { package: "@scope/pkg", args: ["--acp"] },
		},
		...overrides,
	};
}

describe("resolveAgentSpawn", () => {
	test("resolves npx with scoped version pin unchanged", async () => {
		const result = await resolveAgentSpawn(
			agent({
				distribution: {
					binary: {},
					npx: {
						package: "@agentclientprotocol/claude-agent-acp@0.58.1",
						args: [],
					},
				},
			})
		);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value).toEqual({
				command: "npx",
				args: ["-y", "@agentclientprotocol/claude-agent-acp@0.58.1"],
			});
		}
	});

	test("resolves npx with @latest for unscoped packages", async () => {
		const result = await resolveAgentSpawn(
			agent({
				distribution: {
					binary: {},
					npx: { package: "some-agent", args: ["--flag"] },
				},
			})
		);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value).toEqual({
				command: "npx",
				args: ["-y", "some-agent@latest", "--flag"],
			});
		}
	});

	test("preserves unscoped version pins", async () => {
		const result = await resolveAgentSpawn(
			agent({
				distribution: {
					binary: {},
					npx: { package: "some-agent@1.0.0", args: [] },
				},
			})
		);

		expect(result.isOk()).toBe(true);
		if (result.isOk())
			expect(result.value).toEqual({
				command: "npx",
				args: ["-y", "some-agent@1.0.0"],
			});
	});

	test("resolves uvx distribution", async () => {
		const result = await resolveAgentSpawn(
			agent({
				distribution: {
					binary: {},
					uvx: { package: "my-agent", args: ["serve"] },
				},
			})
		);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value).toEqual({
				command: "uvx",
				args: ["my-agent", "serve"],
			});
		}
	});

	test("prefers npx over uvx and binary", async () => {
		const result = await resolveAgentSpawn(
			agent({
				distribution: {
					binary: {
						"linux-x86_64": {
							archive: "https://example.com/bin.tar.gz",
							cmd: "./bin",
							args: [],
						},
					},
					npx: { package: "preferred", args: [] },
					uvx: { package: "ignored", args: [] },
				},
			})
		);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value.command).toBe("npx");
		}
	});

	test("errors when binary-only agent lacks a build for this platform", async () => {
		const result = await resolveAgentSpawn(
			agent({
				distribution: {
					binary: {
						"darwin-aarch64": {
							archive: "https://example.com/bin.tar.gz",
							cmd: "./bin",
							args: [],
						},
					},
				},
			})
		);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error).toContain(
				'agent "test-agent" has no binary for platform'
			);
		}
	});

	test("errors when no distribution is available", async () => {
		const result = await resolveAgentSpawn(
			agent({ distribution: { binary: {} } })
		);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error).toBe(
				'agent "test-agent" has no supported distribution'
			);
		}
	});
});
