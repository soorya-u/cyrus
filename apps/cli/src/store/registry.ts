import { readFile, writeFile } from "node:fs/promises";
import { Result } from "better-result";
import {
	ACP_CACHE_DIR,
	REGISTRY_CACHE_INFO_PATH,
	REGISTRY_JSON_PATH,
} from "@/constants/paths";
import { REGISTRY_CACHE_TTL_MS, REGISTRY_URL } from "@/constants/registry";
import { ensureDir } from "@/utils/dir";
import { toMessage } from "@/utils/error";
import { type AcpRegistry, acpRegistrySchema } from "@/validators/registry";

type CacheInfo = {
	timestamp: number;
	version: string;
};

async function readCacheInfo(): Promise<Result<CacheInfo, string>> {
	return (
		await Result.tryPromise(async () => {
			const parsed = JSON.parse(
				await readFile(REGISTRY_CACHE_INFO_PATH, "utf8")
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

export async function fetchRegistry(options?: {
	force?: boolean;
}): Promise<Result<AcpRegistry, string>> {
	return (
		await Result.tryPromise(async () => {
			await ensureDir(ACP_CACHE_DIR);

			const cacheInfo = await readCacheInfo();
			const shouldFetch =
				options?.force === true ||
				cacheInfo.isErr() ||
				isCacheStale(cacheInfo.value);

			if (shouldFetch) {
				const response = await fetch(REGISTRY_URL);
				if (!response.ok)
					throw new Error(`failed to fetch ACP registry (${response.status})`);

				const body = await response.text();
				await writeFile(REGISTRY_JSON_PATH, body, { mode: 0o600 });
				const info: CacheInfo = {
					timestamp: Math.floor(Date.now() / 1000),
					version: "1.0.0",
				};
				await writeFile(REGISTRY_CACHE_INFO_PATH, JSON.stringify(info), {
					mode: 0o600,
				});
			}

			const raw = JSON.parse(await readFile(REGISTRY_JSON_PATH, "utf8"));
			return acpRegistrySchema.parse(raw);
		})
	).mapError(toMessage);
}

export async function readRegistryFile(): Promise<Result<AcpRegistry, string>> {
	return (
		await Result.tryPromise(async () => {
			await ensureDir(ACP_CACHE_DIR);
			const file = Bun.file(REGISTRY_JSON_PATH);
			if (!(await file.exists()))
				throw new Error(
					"registry cache not found — run `cyrusd agents registry sync`"
				);

			return acpRegistrySchema.parse(await file.json());
		})
	).mapError(toMessage);
}

export async function readCachedRegistry(): Promise<
	Result<AcpRegistry, string>
> {
	const cached = await readRegistryFile();
	if (cached.isOk()) {
		const cacheInfo = await readCacheInfo();
		if (cacheInfo.isOk() && !isCacheStale(cacheInfo.value)) return cached;
	}
	return fetchRegistry();
}
