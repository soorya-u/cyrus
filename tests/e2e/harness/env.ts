import { randomUUID } from "node:crypto";
import { mkdtemp, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const E2E_SERVER_URL = "http://localhost:8787";
export const E2E_WEB_URL = "http://localhost:5173";

export function isE2eEnabled(): boolean {
	return process.env.CYRUS_E2E === "1";
}

export function requireE2e(): void {
	if (!isE2eEnabled()) {
		throw new Error("Set CYRUS_E2E=1 to run end-to-end tests.");
	}
}

export function resolveDatabaseUrl(): string {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error(
			"Set DATABASE_URL to a Neon branch connection string for E2E tests."
		);
	}
	return databaseUrl;
}

export function createTempCyrusHome(): Promise<string> {
	return mkdtemp(join(tmpdir(), "cyrus-e2e-home-"));
}

export function buildServerEnv(): Record<string, string> {
	return {
		DATABASE_URL: resolveDatabaseUrl(),
		BETTER_AUTH_SECRET: "e2e-test-secret-minimum-32-characters",
		BETTER_AUTH_URL: E2E_SERVER_URL,
		PRODUCTION_URL: E2E_SERVER_URL,
		WEB_APP_URL: E2E_WEB_URL,
		OAUTH_GITHUB_CLIENT_ID: "e2e-github-client-id",
		OAUTH_GITHUB_CLIENT_SECRET: "e2e-github-client-secret",
		OAUTH_PROXY_SECRET: "e2e-oauth-proxy-secret",
		ALLOWED_ORIGINS: `${E2E_WEB_URL},http://127.0.0.1:5173`,
		NODE_ENV: "testing",
		LOG_LEVEL: "warn",
	};
}

export function buildWebEnv(): Record<string, string> {
	return {
		VITE_SERVER_URL: E2E_SERVER_URL,
	};
}

export function buildCliEnv(home: string): Record<string, string> {
	return {
		...process.env,
		CYRUS_HOME: home,
		CLI_PUBLIC_SERVER_URL: E2E_SERVER_URL,
		CYRUS_DAEMON: "1",
	};
}

export async function writeWranglerEnvFile(
	env: Record<string, string>
): Promise<string> {
	const path = join(tmpdir(), `cyrus-e2e-wrangler-${randomUUID()}.dev.vars`);
	const contents = Object.entries(env)
		.filter(([, value]) => value !== undefined && value !== "")
		.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
		.join("\n");
	await writeFile(path, `${contents}\n`, { mode: 0o600 });
	return path;
}

export async function removeWranglerEnvFile(
	path: string | undefined
): Promise<void> {
	if (!path) {
		return;
	}
	await unlink(path).catch(() => undefined);
}
