import { chmod, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Result } from "better-result";
import { YAML } from "bun";
import { env } from "@/lib/env";

const TOKEN_FILE_PATH = join(env.CYRUS_HOME, "config.yml");
const file = Bun.file(TOKEN_FILE_PATH);

type Stored = { token: string };

export async function saveToken(token: string) {
	await mkdir(dirname(TOKEN_FILE_PATH), { recursive: true });
	const content = YAML.stringify({ token } satisfies Stored);
	await file.write(content);
	await chmod(TOKEN_FILE_PATH, 0o600);
}

export async function readToken() {
	const exists = await file.exists();
	if (!exists) {
		return null;
	}

	const content = await Result.tryPromise(() => file.text());
	const storedValue = YAML.parse(content.unwrapOr("null")) as Stored | null;
	return storedValue?.token ?? null;
}

export async function clearToken() {
	await file.delete();
}
