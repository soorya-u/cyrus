import { describe, expect, test } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { addAgent, listEnabledAgents } from "../../src/store/agents";
import { readRegistryFile } from "../../src/store/registry";
import { withIsolatedCyrusPaths } from "../helpers/cyrus-home";

describe("registry agents integration", () => {
	test("reads cached registry json from isolated home", async () => {
		await withIsolatedCyrusPaths(async (paths) => {
			await mkdir(paths.acpCacheDir, { recursive: true });
			await writeFile(
				paths.registryJsonPath,
				JSON.stringify({
					agents: [
						{
							id: "test-agent",
							name: "Test Agent",
							distribution: {
								npx: { package: "pkg", args: [] },
							},
						},
					],
				})
			);

			const result = await readRegistryFile({ paths });
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.agents[0]?.id).toBe("test-agent");
			}
		});
	});

	test("adds and lists enabled agents in agents.yml", async () => {
		await withIsolatedCyrusPaths(async (paths) => {
			const entry = {
				registryId: "claude-acp",
				name: "Claude Agent",
				icon: "https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg",
			};

			const added = await addAgent("claude-acp", entry, { paths });
			expect(added.isOk()).toBe(true);

			const agents = await listEnabledAgents({ paths });
			expect(agents).toEqual([
				{
					id: "claude-acp",
					name: "Claude Agent",
					icon: "https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg",
				},
			]);

			const agentsYaml = await readFile(paths.agentsPath, "utf8");
			expect(agentsYaml).toContain("claude-acp");
			expect(agentsYaml).toContain("Claude Agent");
		});
	});

	test("rejects duplicate agent enablement", async () => {
		await withIsolatedCyrusPaths(async (paths) => {
			const entry = {
				registryId: "claude-acp",
				name: "Claude Agent",
				icon: "https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg",
			};

			const first = await addAgent("claude-acp", entry, { paths });
			expect(first.isOk()).toBe(true);

			const second = await addAgent("claude-acp", entry, { paths });
			expect(second.isErr()).toBe(true);
			if (second.isErr()) {
				expect(second.error).toContain("already enabled");
			}
		});
	});
});
