import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ContentBlock } from "@agentclientprotocol/sdk";
import type { PromptInputBlock } from "@cyrus/schemas/rtc/chat";

const HTTP_URI_PATTERN = /^https?:\/\//i;

export function mapPromptBlocksToAcp(
	blocks: PromptInputBlock[],
	threadCwd: string
): ContentBlock[] {
	return blocks.map((block) => mapPromptBlockToAcp(block, threadCwd));
}

function mapPromptBlockToAcp(
	block: PromptInputBlock,
	threadCwd: string
): ContentBlock {
	if (block.type === "text") {
		return { type: "text", text: block.text };
	}

	const uri = resolveResourceUri(block.uri, threadCwd);
	const name = block.name ?? uri.split("/").pop() ?? uri;

	return {
		type: "resource_link",
		uri,
		name,
	};
}

function resolveResourceUri(uri: string, threadCwd: string): string {
	if (HTTP_URI_PATTERN.test(uri) || uri.startsWith("file://")) {
		return uri;
	}

	const absolute = resolve(threadCwd, uri);
	return pathToFileURL(absolute).href;
}
