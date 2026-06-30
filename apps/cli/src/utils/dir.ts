import { mkdir } from "node:fs/promises";
import { env } from "@/lib/env";

export async function ensureDir(): Promise<void> {
	await mkdir(env.CYRUS_HOME, { recursive: true, mode: 0o700 });
}
