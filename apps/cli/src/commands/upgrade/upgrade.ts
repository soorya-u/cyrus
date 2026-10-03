import { rm } from "node:fs/promises";
import {
	type ReleasePlatform,
	releaseAssetName,
} from "@cyrus/constants/release";
import { RELEASE_VERSION } from "@cyrus/constants/version";
import {
	type UpgradeDownloadError,
	type UpgradeError,
	UpgradeIntegrityError,
	UpgradeUnmanagedInstallError,
	UpgradeWorkerRunningError,
} from "@cyrus/errors/upgrade";
import { Result } from "better-result";
import semver from "semver";
import { runningPid, withWorkerLock } from "@/utils/process";
import { unwrapOrExit } from "@/utils/result";
import { print } from "@/utils/style";
import {
	classifyInstall,
	installBinPath,
	makeExecutable,
	realExecPath,
	reinstallCommand,
	reportedVersion,
	swapBinary,
} from "./install";
import {
	detectPlatform,
	downloadVerified,
	type Fetch,
	fetchLatestVersion,
	fetchNewestVersion,
} from "./release";

export type UpgradeOptions = { rc?: boolean };

export type UpgradeOutcome =
	| { kind: "up-to-date"; version: string }
	| { kind: "upgraded"; from: string; to: string };

export type UpgradeDeps = {
	fetch: Fetch;
	execPath: string;
	installBin: string;
	currentVersion: string;
	platform: ReleasePlatform;
	runningPid: () => Promise<number | null>;
	withLock: <T>(fn: () => Promise<T>) => Promise<T>;
};

function newestVersion(
	options: UpgradeOptions,
	deps: UpgradeDeps
): Promise<Result<string, UpgradeDownloadError>> {
	return options.rc
		? fetchNewestVersion(deps.fetch)
		: fetchLatestVersion(deps.fetch);
}

async function install(
	target: string,
	deps: UpgradeDeps
): Promise<Result<void, UpgradeError>> {
	const staged = `${deps.installBin}.new`;
	const asset = releaseAssetName(deps.platform.os, deps.platform.arch);
	try {
		const downloaded = await downloadVerified({
			fetch: deps.fetch,
			version: target,
			asset,
			dest: staged,
		});
		if (downloaded.isErr()) return Result.err(downloaded.error);

		await makeExecutable(staged, deps.platform.os);
		const reported = await reportedVersion(staged);
		if (reported.isErr()) return Result.err(reported.error);
		if (reported.value !== target)
			return Result.err(
				new UpgradeIntegrityError({
					asset,
					detail: `it reports version ${reported.value}, not ${target}`,
				})
			);

		return await swapBinary(deps.installBin, staged, deps.platform.os);
	} finally {
		await rm(staged, { force: true });
	}
}

/**
 * Replace the installed binary with another release's. The worker must not be
 * running: the whole check-download-swap runs under the worker lock, so a
 * concurrent `cyrusd start` cannot launch a half-replaced binary.
 */
export async function performUpgrade(
	options: UpgradeOptions,
	deps: UpgradeDeps
): Promise<Result<UpgradeOutcome, UpgradeError>> {
	const kind = classifyInstall(deps.execPath, deps.installBin);
	if (kind !== "managed")
		return Result.err(
			new UpgradeUnmanagedInstallError({
				path: deps.execPath,
				channel: kind,
				reinstall: reinstallCommand(deps.platform.os),
			})
		);

	return await deps.withLock(async () => {
		const pid = await deps.runningPid();
		if (pid !== null) return Result.err(new UpgradeWorkerRunningError({ pid }));

		const target = await newestVersion(options, deps);
		if (target.isErr()) return Result.err(target.error);

		// upgrades only move forward: a newer local build is never replaced
		if (!semver.gt(target.value, deps.currentVersion))
			return Result.ok({ kind: "up-to-date", version: deps.currentVersion });

		const installed = await install(target.value, deps);
		if (installed.isErr()) return Result.err(installed.error);
		return Result.ok({
			kind: "upgraded",
			from: deps.currentVersion,
			to: target.value,
		});
	});
}

export async function upgrade(options: UpgradeOptions): Promise<void> {
	const platform = unwrapOrExit(detectPlatform(process.platform, process.arch));
	const installBin = installBinPath(platform.os);
	await rm(`${installBin}.old`, { force: true });

	const outcome = unwrapOrExit(
		await performUpgrade(options, {
			fetch,
			execPath: await realExecPath(),
			installBin,
			currentVersion: RELEASE_VERSION,
			platform,
			runningPid,
			withLock: withWorkerLock,
		})
	);

	if (outcome.kind === "up-to-date") {
		print.dim`Already on ${outcome.version} — nothing to do.`;
		return;
	}
	print.success`✓ upgraded ${outcome.from} → ${outcome.to}. Run \`cyrusd start --bg\` to use it.`;
}
