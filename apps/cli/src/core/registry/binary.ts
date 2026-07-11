import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Result } from "better-result";
import { $ } from "bun";
import { ensureDir } from "@/utils/dir";
import { toMessage } from "@/utils/error";
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
				const response = await fetch(dist.archive);
				if (!response.ok)
					throw new Error(
						`failed to download binary for "${agent.id}" (${response.status})`
					);

				const data = Buffer.from(await response.arrayBuffer());
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
	return (
		await Result.tryPromise(async () => {
			const tmpDir = await mkdtemp(join(tmpdir(), "cyrus-acp-"));
			const archivePath = join(tmpDir, "archive.zip");
			await writeFile(archivePath, data);

			const tar = await $`tar -xf ${archivePath} -C ${dest}`.nothrow().quiet();
			if (tar.exitCode !== 0) {
				if (!Bun.which("unzip"))
					throw new Error(
						"failed to extract zip archive — install unzip or use tar"
					);

				const unzip = await $`unzip -q ${archivePath} -d ${dest}`
					.nothrow()
					.quiet();

				if (unzip.exitCode !== 0)
					throw new Error(
						`failed to extract zip archive (exit ${unzip.exitCode})`
					);
			}

			await removeQuietly(archivePath);
			await removeQuietly(tmpDir);
		})
	).mapError(toMessage);
}

async function removeQuietly(path: string): Promise<void> {
	await Bun.file(path)
		.delete()
		.catch(() => undefined);
}
