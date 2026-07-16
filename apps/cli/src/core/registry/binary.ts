import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Result } from "better-result";
import extract from "extract-zip";
import {
	BINARY_DOWNLOAD_TIMEOUT_MS,
	MAX_BINARY_BYTES,
} from "@/constants/registry";
import { toMessage } from "@/utils/error";
import { ensureDir } from "@/utils/fs";
import type { RegistryAgent } from "@/validators/registry";

type BinaryDist = RegistryAgent["distribution"]["binary"][string];
const REGEX = /^\.\//;

export async function ensureBinary(
	agent: RegistryAgent,
	dist: BinaryDist,
	cacheDir: string,
	options?: { force?: boolean }
): Promise<Result<string, string>> {
	return (
		await Result.tryPromise(async () => {
			const agentCacheDir = join(cacheDir, agent.id);
			await ensureDir(agentCacheDir);

			const cmdPath = dist.cmd.replace(REGEX, "");
			const binaryPath = join(agentCacheDir, cmdPath);
			const exists = await Bun.file(binaryPath).exists();

			if (!exists || options?.force) {
				const response = await fetch(dist.archive, {
					signal: AbortSignal.timeout(BINARY_DOWNLOAD_TIMEOUT_MS),
				});
				if (!response.ok)
					throw new Error(
						`failed to download binary for "${agent.id}" (${response.status})`
					);

				const contentLength = response.headers.get("content-length");
				if (
					contentLength &&
					Number.parseInt(contentLength, 10) > MAX_BINARY_BYTES
				) {
					throw new Error(
						`binary for "${agent.id}" exceeds ${MAX_BINARY_BYTES} bytes`
					);
				}

				const data = Buffer.from(await response.arrayBuffer());
				if (data.byteLength > MAX_BINARY_BYTES) {
					throw new Error(
						`binary for "${agent.id}" exceeds ${MAX_BINARY_BYTES} bytes`
					);
				}

				const extracted = await extractArchive(
					data,
					agentCacheDir,
					dist.archive,
					binaryPath
				);
				if (extracted.isErr()) throw new Error(extracted.error);
			}

			if (process.platform !== "win32") await chmod(binaryPath, 0o755);

			return binaryPath;
		})
	).mapError(toMessage);
}

async function extractArchive(
	data: Buffer,
	dest: string,
	archiveUrl: string,
	binaryPath: string
): Promise<Result<void, string>> {
	if (archiveUrl.endsWith(".zip")) return extractZip(data, dest);

	if (archiveUrl.endsWith(".tar.gz") || archiveUrl.endsWith(".tgz"))
		return extractTarGz(data, dest);

	return (
		await Result.tryPromise(async () => {
			await ensureDir(join(binaryPath, ".."));
			await writeFile(binaryPath, data);
		})
	).mapError(toMessage);
}

async function extractTarGz(
	data: Buffer,
	dest: string
): Promise<Result<void, string>> {
	return (
		await Result.tryPromise(async () => {
			const archive = new Bun.Archive(data);
			await archive.extract(dest);
		})
	).mapError(toMessage);
}

async function extractZip(
	data: Buffer,
	dest: string
): Promise<Result<void, string>> {
	const tmpDir = await mkdtemp(join(tmpdir(), "cyrus-acp-"));
	const archivePath = join(tmpDir, "archive.zip");

	return (
		await Result.tryPromise(async () => {
			try {
				await writeFile(archivePath, data);
				await extract(archivePath, { dir: dest });
			} finally {
				await removeQuietly(archivePath);
				await rm(tmpDir, { recursive: true, force: true }).catch(
					() => undefined
				);
			}
		})
	).mapError(toMessage);
}

async function removeQuietly(path: string): Promise<void> {
	await Bun.file(path)
		.delete()
		.catch(() => undefined);
}
