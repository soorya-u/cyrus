import { readFile, writeFile } from "node:fs/promises";
import { Result } from "better-result";
import {
	type CyrusPaths,
	type CyrusStoreOptions,
	defaultCyrusPaths,
} from "@/constants/paths";
import { REGISTRY_CACHE_TTL_MS, REGISTRY_URL } from "@/constants/registry";
import { ensureDir } from "@/utils/dir";
import { toMessage } from "@/utils/error";
import { type AcpRegistry, acpRegistrySchema } from "@/validators/registry";

type CacheInfo = {
	timestamp: number;
	version: string;
};

type RegistryStoreOptions = CyrusStoreOptions & {
	force?: boolean;
};

function resolvePaths(options?: CyrusStoreOptions): CyrusPaths {
	return options?.paths ?? defaultCyrusPaths();
}

async function readCacheInfo(
	paths: CyrusPaths
): Promise<Result<CacheInfo, string>> {
	return (
		await Result.tryPromise(async () => {
			const parsed = JSON.parse(
				await readFile(paths.registryCacheInfoPath, "utf8")
			) as CacheInfo;
			if (typeof parsed.timestamp !== "number") {
				throw new Error("invalid registry cache info");
			}
			return parsed;
		})
	).mapError(toMessage);
}

function isCacheStale(info: CacheInfo): boolean {
	return Date.now() - info.timestamp * 1000 > REGISTRY_CACHE_TTL_MS;
}

export async function fetchRegistry(
	options?: RegistryStoreOptions
): Promise<Result<AcpRegistry, string>> {
	const paths = resolvePaths(options);
	return (
		await Result.tryPromise(async () => {
			await ensureDir(paths.acpCacheDir);

			const cacheInfo = await readCacheInfo(paths);
			const shouldFetch =
				options?.force === true ||
				cacheInfo.isErr() ||
				isCacheStale(cacheInfo.value);

			if (shouldFetch) {
				const response = await fetch(REGISTRY_URL);
				if (!response.ok)
					throw new Error(`failed to fetch ACP registry (${response.status})`);

				const body = await response.text();
				await writeFile(paths.registryJsonPath, body, { mode: 0o600 });
				const info: CacheInfo = {
					timestamp: Math.floor(Date.now() / 1000),
					version: "1.0.0",
				};
				await writeFile(paths.registryCacheInfoPath, JSON.stringify(info), {
					mode: 0o600,
				});
			}

			const raw = JSON.parse(await readFile(paths.registryJsonPath, "utf8"));
			return acpRegistrySchema.parse(raw);
		})
	).mapError(toMessage);
}

export async function readRegistryFile(
	options?: CyrusStoreOptions
): Promise<Result<AcpRegistry, string>> {
	const paths = resolvePaths(options);
	return (
		await Result.tryPromise(async () => {
			await ensureDir(paths.acpCacheDir);
			const file = Bun.file(paths.registryJsonPath);
			if (!(await file.exists()))
				throw new Error(
					"registry cache not found — run `cyrusd agents registry sync`"
				);

			return acpRegistrySchema.parse(await file.json());
		})
	).mapError(toMessage);
}

export async function readCachedRegistry(
	options?: CyrusStoreOptions
): Promise<Result<AcpRegistry, string>> {
	const paths = resolvePaths(options);
	const cached = await readRegistryFile(options);
	if (cached.isOk()) {
		const cacheInfo = await readCacheInfo(paths);
		if (cacheInfo.isOk() && !isCacheStale(cacheInfo.value)) return cached;
	}
	return fetchRegistry(options);
}
