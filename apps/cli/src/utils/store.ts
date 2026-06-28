import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { YAML } from "bun";
import { env } from "@/lib/env";

const TOKEN_FILE_PATH = join(env.CYRUS_HOME, "config.yml");
const file = Bun.file(TOKEN_FILE_PATH);

type Stored = { token: string };

export async function saveToken(token: string) {
	await mkdir(dirname(TOKEN_FILE_PATH), { recursive: true, mode: 0o700 });
	const content = YAML.stringify({ token } satisfies Stored);
	await writeFile(TOKEN_FILE_PATH, content, { mode: 0o600 });
}

export async function readToken() {
	const exists = await file.exists();
	if (!exists) {
		return null;
	}
	const content = await file.text();
	return (YAML.parse(content) as Stored | null)?.token ?? null;
}

export async function clearToken() {
	await file.delete();
}
