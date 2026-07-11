import type { Result } from "better-result";
import { getAcpPlatform } from "@/core/registry/platform";
import {
	fetchRegistry,
	readRegistryFile as readAcpRegistryFile,
	readCachedRegistry as readCachedAcpRegistry,
} from "@/store/registry";
import { isCommandAvailable } from "@/utils/command";
import type { AcpRegistry, RegistryAgent } from "@/validators/registry";

export type PreflightResult =
	| {
			ok: true;
			warnings: string[];
	  }
	| {
			ok: false;
			error: string;
	  };

function defaultIconUrl(id: string): string {
	return `https://cdn.agentclientprotocol.com/registry/v1/latest/${id}.svg`;
}

export async function warmRegistryCache(): Promise<Result<void, string>> {
	return (await fetchRegistry()).map(() => undefined);
}

export async function syncRegistry(): Promise<Result<void, string>> {
	return (await fetchRegistry({ force: true })).map(() => undefined);
}

export function readRegistryFile(): Promise<Result<AcpRegistry, string>> {
	return readAcpRegistryFile();
}

export function readCachedRegistry(): Promise<Result<AcpRegistry, string>> {
	return readCachedAcpRegistry();
}

export async function findRegistryAgent(
	id: string
): Promise<RegistryAgent | null> {
	let registry = await readRegistryFile();
	if (registry.isErr()) {
		registry = await readCachedRegistry();
	}
	if (registry.isErr()) return null;
	return registry.value.agents.find((agent) => agent.id === id) ?? null;
}

export function preflightRegistryAgent(agent: RegistryAgent): PreflightResult {
	const { distribution } = agent;
	const warnings: string[] = [];
	const platform = getAcpPlatform();

	const hasNpx = Boolean(distribution.npx);
	const hasUvx = Boolean(distribution.uvx);
	const binaryKeys = Object.keys(distribution.binary);

	if (hasNpx && !isCommandAvailable("npx")) {
		warnings.push("npx not found — install Node.js before using this agent");
	}

	if (hasUvx && !isCommandAvailable("uvx")) {
		warnings.push("uvx not found — install uv before using this agent");
	}

	if (!(hasNpx || hasUvx)) {
		if (binaryKeys.length === 0) {
			return {
				ok: false,
				error: `agent "${agent.id}" has no supported distribution`,
			};
		}
		if (platform === "unknown" || !distribution.binary[platform]) {
			return {
				ok: false,
				error: `agent "${agent.id}" is not available on this platform (${platform})`,
			};
		}
	}

	return { ok: true, warnings };
}

export function registryAgentToEntry(agent: RegistryAgent) {
	return {
		registryId: agent.id,
		name: agent.name,
		icon: agent.icon ?? defaultIconUrl(agent.id),
	};
}
