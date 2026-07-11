import { Result } from "better-result";
import { ACP_CACHE_DIR } from "@/constants/paths";
import { readCachedRegistry } from "@/store/registry";
import type { RegistryAgent } from "@/validators/registry";
import { ensureBinary } from "./binary";
import { getAcpPlatform } from "./platform";

export type ResolvedSpawn = {
	command: string;
	args: string[];
};

function npxPackageArg(packageName: string): string {
	const atCount = (packageName.match(/@/g) ?? []).length;
	if (packageName.includes("@") && atCount > 1) return packageName;

	return `${packageName}@latest`;
}

export async function resolveAgentSpawn(
	agent: RegistryAgent,
	options?: { forceBinary?: boolean }
): Promise<Result<ResolvedSpawn, string>> {
	const { distribution } = agent;

	if (distribution.npx)
		return Result.ok({
			command: "npx",
			args: [
				"-y",
				npxPackageArg(distribution.npx.package),
				...distribution.npx.args,
			],
		});

	if (distribution.uvx)
		return Result.ok({
			command: "uvx",
			args: [distribution.uvx.package, ...distribution.uvx.args],
		});

	if (Object.keys(distribution.binary).length > 0) {
		const platform = getAcpPlatform();
		const binaryDist = distribution.binary[platform];
		if (!binaryDist)
			return Result.err(
				`agent "${agent.id}" has no binary for platform ${platform}`
			);

		const binaryPath = await ensureBinary(agent, binaryDist, ACP_CACHE_DIR, {
			force: options?.forceBinary,
		});
		if (binaryPath.isErr()) return Result.err(binaryPath.error);
		return Result.ok({
			command: binaryPath.value,
			args: [...binaryDist.args],
		});
	}

	return Result.err(`agent "${agent.id}" has no supported distribution`);
}

export async function resolveRegistryAgentSpawn(
	registryId: string,
	options?: { forceBinary?: boolean }
): Promise<Result<ResolvedSpawn, string>> {
	const registry = await readCachedRegistry();
	if (registry.isErr()) return Result.err(registry.error);

	const agent = registry.value.agents.find((entry) => entry.id === registryId);
	if (!agent)
		return Result.err(`agent "${registryId}" not found in ACP registry`);

	return resolveAgentSpawn(agent, options);
}
