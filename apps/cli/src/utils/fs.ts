import { mkdir, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { DirListing } from "@cyrus/schemas/rtc/fs";
import { FileFinder } from "@ff-labs/fff-node";
import { env } from "@/lib/env";

const LIST_FILES_MAX_ENTRIES = 25_000;
const LIST_FILES_SCAN_TIMEOUT_MS = 15_000;
const SEARCH_QUERY_PREFIX_PATTERN = /^[@./]+/;

function expandHomeDirectory(cwd: string): string {
	if (cwd === "~") return os.homedir();
	if (cwd.startsWith("~/")) return path.join(os.homedir(), cwd.slice(2));

	return cwd;
}

export async function ensureDir(dir = env.CYRUS_HOME): Promise<void> {
	await mkdir(dir, { recursive: true, mode: 0o700 });
}

async function listChildDirectories(cwd: string): Promise<string[]> {
	const entries = await readdir(cwd, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort((a, b) => a.localeCompare(b));
}

export async function listDir(cwd: string, depth = 1): Promise<DirListing> {
	const resolved = path.resolve(expandHomeDirectory(cwd));
	const names = await listChildDirectories(resolved);

	if (depth <= 1) return names;

	const listing: DirListing = [];
	for (const name of names) {
		const children = await listDir(path.join(resolved, name), depth - 1);
		listing.push({ [name]: children });
	}
	return listing;
}

function withinDepth(relativePath: string, depth: number): boolean {
	const segments = relativePath.split("/").filter(Boolean).length;
	return segments > 0 && segments <= depth;
}

function createFinder(resolved: string) {
	const created = FileFinder.create({
		basePath: resolved,
		disableMmapCache: true,
		disableContentIndexing: true,
		disableWatch: true,
		aiMode: true,
		enableFsRootScanning: true,
		enableHomeDirScanning: true,
	});
	if (!created.ok) throw new Error(created.error);
	return created.value;
}

export async function listFiles(cwd: string, depth = 3): Promise<string[]> {
	const resolved = path.resolve(expandHomeDirectory(cwd));
	const finder = createFinder(resolved);
	try {
		const scanned = await finder.waitForScan(LIST_FILES_SCAN_TIMEOUT_MS);
		if (!scanned.ok) throw new Error(scanned.error);
		if (!scanned.value) {
			throw new Error(
				`workspace file scan timed out after ${LIST_FILES_SCAN_TIMEOUT_MS}ms`
			);
		}

		const result = finder.glob("**/*", {
			pageSize: LIST_FILES_MAX_ENTRIES,
		});
		if (!result.ok) throw new Error(result.error);

		return result.value.items
			.map((item) => item.relativePath.replaceAll("\\", "/"))
			.filter((relativePath) => withinDepth(relativePath, depth))
			.sort((a, b) => a.localeCompare(b));
	} finally {
		finder.destroy();
	}
}

export async function searchFiles(
	cwd: string,
	query: string,
	limit = 80
): Promise<{
	entries: Array<{ path: string; kind: "file" | "directory" }>;
	truncated: boolean;
}> {
	const resolved = path.resolve(expandHomeDirectory(cwd));
	const normalized = query.trim().replace(SEARCH_QUERY_PREFIX_PATTERN, "");
	if (!normalized) {
		return { entries: [], truncated: false };
	}

	const finder = createFinder(resolved);
	try {
		const scanned = await finder.waitForScan(LIST_FILES_SCAN_TIMEOUT_MS);
		if (!scanned.ok) throw new Error(scanned.error);
		if (!scanned.value) {
			throw new Error(
				`workspace file scan timed out after ${LIST_FILES_SCAN_TIMEOUT_MS}ms`
			);
		}

		const isPathPrefix = normalized.includes("/");
		if (isPathPrefix) {
			const result = finder.fileSearch(normalized, { pageSize: limit });
			if (!result.ok) throw new Error(result.error);
			const entries = result.value.items.map((item) => ({
				path: item.relativePath.replaceAll("\\", "/"),
				kind: "file" as const,
			}));
			return {
				entries,
				truncated: result.value.totalMatched > entries.length,
			};
		}

		const result = finder.mixedSearch(normalized, { pageSize: limit });
		if (!result.ok) throw new Error(result.error);
		const entries = result.value.items.map((item) => {
			if (item.type === "file") {
				return {
					path: item.item.relativePath.replaceAll("\\", "/"),
					kind: "file" as const,
				};
			}
			return {
				path: item.item.relativePath.replaceAll("\\", "/"),
				kind: "directory" as const,
			};
		});

		return {
			entries,
			truncated: result.value.totalMatched > entries.length,
		};
	} finally {
		finder.destroy();
	}
}
