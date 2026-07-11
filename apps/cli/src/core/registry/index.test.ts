import { describe, expect, test } from "bun:test";
import type { RegistryAgent } from "@/validators/registry";
import { preflightRegistryAgent, registryAgentToEntry } from "./index";
import { getAcpPlatform } from "./platform";

describe("preflightRegistryAgent", () => {
	test("allows npx agents and warns when npx is missing", () => {
		const agent: RegistryAgent = {
			id: "npx-agent",
			name: "Npx Agent",
			distribution: {
				binary: {},
				npx: { package: "pkg", args: [] },
			},
		};

		const result = preflightRegistryAgent(agent);
		expect(result.ok).toBe(true);
		if (result.ok && !Bun.which("npx")) {
			expect(result.warnings).toContain(
				"npx not found — install Node.js before using this agent"
			);
		}
	});

	test("rejects agents with no distribution", () => {
		const result = preflightRegistryAgent({
			id: "empty-agent",
			name: "Empty",
			distribution: { binary: {} },
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe(
				'agent "empty-agent" has no supported distribution'
			);
		}
	});

	test("rejects binary-only agents missing the current platform", () => {
		const platform = getAcpPlatform();
		const result = preflightRegistryAgent({
			id: "binary-agent",
			name: "Binary",
			distribution: {
				binary:
					platform === "linux-x86_64"
						? {
								"darwin-aarch64": {
									archive: "https://x",
									cmd: "./a",
									args: [],
								},
							}
						: {
								"linux-x86_64": { archive: "https://x", cmd: "./a", args: [] },
							},
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('agent "binary-agent" is not available');
		}
	});
});

describe("registryAgentToEntry", () => {
	test("uses registry icon when present", () => {
		expect(
			registryAgentToEntry({
				id: "claude-acp",
				name: "Claude Agent",
				icon: "https://cdn.example.com/claude.svg",
				distribution: { binary: {}, npx: { package: "p", args: [] } },
			})
		).toEqual({
			registryId: "claude-acp",
			name: "Claude Agent",
			icon: "https://cdn.example.com/claude.svg",
		});
	});

	test("falls back to default icon url", () => {
		expect(
			registryAgentToEntry({
				id: "codex-acp",
				name: "Codex",
				distribution: { binary: {}, npx: { package: "p", args: [] } },
			})
		).toEqual({
			registryId: "codex-acp",
			name: "Codex",
			icon: "https://cdn.agentclientprotocol.com/registry/v1/latest/codex-acp.svg",
		});
	});
});
