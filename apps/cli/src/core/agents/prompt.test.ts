import { describe, expect, test } from "bun:test";
import { mapPromptBlocksToAcp } from "@/core/agents/prompt";

describe("prompt-blocks", () => {
	test("maps text and resource blocks to ACP content", () => {
		const blocks = [
			{ type: "text" as const, text: "review this" },
			{ type: "resource" as const, uri: "src/index.ts", name: "index.ts" },
			{
				type: "resource" as const,
				uri: "https://example.com/docs",
				name: "docs",
			},
		];

		expect(mapPromptBlocksToAcp(blocks, "/tmp/project")).toEqual([
			{ type: "text", text: "review this" },
			{
				type: "resource_link",
				uri: "file:///tmp/project/src/index.ts",
				name: "index.ts",
			},
			{
				type: "resource_link",
				uri: "https://example.com/docs",
				name: "docs",
			},
		]);
	});
});
