import { mkdir, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { DirListing } from "@cyrus/connections/schemas/dir";
import { env } from "@/lib/env";

function expandHomeDirectory(cwd: string): string {
	if (cwd === "~") return os.homedir();
	if (cwd.startsWith("~/")) return path.join(os.homedir(), cwd.slice(2));

	return cwd;
}

export async function ensureDir(): Promise<void> {
	await mkdir(env.CYRUS_HOME, { recursive: true, mode: 0o700 });
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
