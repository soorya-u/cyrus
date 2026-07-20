import { describe, expect, test } from "vitest";
import { ListAgentsOutputSchema } from "./agents";

describe("ListAgentsOutputSchema", () => {
	test("parses enabled agents with icon urls", () => {
		expect(
			ListAgentsOutputSchema.parse({
				agents: [
					{
						id: "claude-acp",
						name: "Claude Agent",
						icon: "https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg",
					},
				],
			})
		).toEqual({
			agents: [
				{
					id: "claude-acp",
					name: "Claude Agent",
					icon: "https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg",
				},
			],
		});
	});

	test("rejects agents missing icon urls", () => {
		expect(() =>
			ListAgentsOutputSchema.parse({
				agents: [{ id: "claude-acp", name: "Claude Agent" }],
			})
		).toThrow();
	});
});
