import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Result } from "better-result";
import {
	clearHealthCache,
	listHealthyAgents,
	setHealthCacheForTest,
} from "./health";

mock.module("@/core/acp/ping", () => ({
	pingAcpAgent: mock(async (registryId: string) =>
		registryId === "healthy-agent" ? Result.ok({}) : Result.err("unhealthy")
	),
}));

mock.module("@/store/agents", () => ({
	listAgents: async () =>
		Result.ok({
			"healthy-agent": {
				registryId: "healthy-agent",
				name: "Healthy",
				icon: "https://example.com/healthy.png",
				command: "echo",
				args: [],
			},
			"sick-agent": {
				registryId: "sick-agent",
				name: "Sick",
				icon: "https://example.com/sick.png",
				command: "echo",
				args: [],
			},
		}),
}));

describe("agent health", () => {
	beforeEach(() => {
		clearHealthCache();
	});

	test("listHealthyAgents omits unhealthy agents", async () => {
		const agents = await listHealthyAgents();
		expect(agents).toEqual([
			{
				id: "healthy-agent",
				name: "Healthy",
				icon: "https://example.com/healthy.png",
			},
		]);
	});

	test("reuses cached health results within ttl", async () => {
		setHealthCacheForTest("sick-agent", true);
		const agents = await listHealthyAgents();
		expect(agents.map((agent) => agent.id).sort()).toEqual([
			"healthy-agent",
			"sick-agent",
		]);
	});
});
