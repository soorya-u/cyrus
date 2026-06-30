import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Result } from "better-result";
import { YAML } from "bun";
import { CONFIG_FILE } from "@/constants/file";
import { env } from "@/lib/env";
import { ensureDir } from "./dir";

const CONFIG_PATH = join(env.CYRUS_HOME, CONFIG_FILE);

export type Config = {
	token: string;
	id: string;
	name: string;
};

async function read(): Promise<Partial<Config>> {
	const file = Bun.file(CONFIG_PATH);
	const exists = await file.exists();
	if (!exists) {
		return {};
	}

	const res = await Result.tryPromise(async () => {
		const parsed = YAML.parse(await file.text());
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Partial<Config>;
		}
	});

	return res.match({ ok: (p) => p ?? {}, err: () => ({}) });
}

async function write(config: Partial<Config>): Promise<void> {
	await ensureDir();
	await writeFile(CONFIG_PATH, YAML.stringify(config), { mode: 0o600 });
}

export async function get<K extends keyof Config>(
	key: K
): Promise<Config[K] | null> {
	const config = await read();
	return config[key] ?? null;
}

export async function set<K extends keyof Config>(
	key: K,
	value: Config[K]
): Promise<void> {
	const config = await read();
	config[key] = value;
	await write(config);
}

export async function remove(key: keyof Config): Promise<void> {
	const config = await read();
	delete config[key];
	await write(config);
}

export async function getOrCreate<K extends keyof Config>(
	key: K,
	create: () => Config[K]
): Promise<Config[K]> {
	const existing = await get(key);
	if (existing !== null) {
		return existing;
	}
	const value = create();
	await set(key, value);
	return value;
}
