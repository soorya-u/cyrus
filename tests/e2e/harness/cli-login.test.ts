import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { parseCliLoginPrompt, readAccessTokenFromHome } from "./cli-login";

const temps: string[] = [];

afterEach(async () => {
	await Promise.all(
		temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
	);
});

describe("parseCliLoginPrompt", () => {
	test("extracts verification URL and user code from plain login output", () => {
		const output = `
To sign in, visit:

  http://localhost:5173/auth/device?user_code=ABCD-EFGH

and enter the code:  ABCD-EFGH

Waiting for approval…
`;

		expect(parseCliLoginPrompt(output)).toEqual({
			verificationUrl: "http://localhost:5173/auth/device?user_code=ABCD-EFGH",
			userCode: "ABCD-EFGH",
		});
	});

	test("accepts user codes without a hyphen", () => {
		const output = `
To sign in, visit:

  http://localhost:5173/auth/device?user_code=PRUT2NME

and enter the code:  PRUT2NME

Waiting for approval…
`;

		expect(parseCliLoginPrompt(output)).toEqual({
			verificationUrl: "http://localhost:5173/auth/device?user_code=PRUT2NME",
			userCode: "PRUT2NME",
		});
	});

	test("strips ANSI styling around the URL and code", () => {
		const output = [
			"To sign in, visit:",
			"",
			"  \x1b[4m\x1b[38;5;33mhttp://localhost:5173/auth/device?user_code=WXYZ-1234\x1b[39m\x1b[24m",
			"",
			"and enter the code:  \x1b[1m\x1b[38;5;51mWXYZ-1234\x1b[39m\x1b[22m",
			"",
		].join("\n");

		expect(parseCliLoginPrompt(output)).toEqual({
			verificationUrl: "http://localhost:5173/auth/device?user_code=WXYZ-1234",
			userCode: "WXYZ-1234",
		});
	});
});

describe("readAccessTokenFromHome", () => {
	test("reads the token written by cyrusd login", async () => {
		const home = await mkdtemp(join(tmpdir(), "cyrus-cli-login-"));
		temps.push(home);
		await writeFile(
			join(home, "config.yml"),
			['token: "cli-access-token-value"', 'name: "E2E Worker"', ""].join("\n"),
			{ mode: 0o600 }
		);

		await expect(readAccessTokenFromHome(home)).resolves.toBe(
			"cli-access-token-value"
		);
	});

	test("reads Bun YAML flow-style config written by the compiled binary", async () => {
		const home = await mkdtemp(join(tmpdir(), "cyrus-cli-login-"));
		temps.push(home);
		await writeFile(
			join(home, "config.yml"),
			"{token: bareAccessTokenValue,name: damaged-answer}\n",
			{ mode: 0o600 }
		);

		await expect(readAccessTokenFromHome(home)).resolves.toBe(
			"bareAccessTokenValue"
		);
	});
});
