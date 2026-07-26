import { describe, expect, test } from "vitest";
import {
	buildD1MigrateLocalArgs,
	requireWranglerPersistTo,
	WRANGLER_PERSIST_TO_ENV,
} from "./database";
import { WRANGLER_PACKAGE } from "./dev-servers";

const MISSING_PERSIST_TO = /WRANGLER_PERSIST_TO/;

describe("E2E D1 isolation", () => {
	test("migrate args pin --local and --persist-to for a run-scoped directory", () => {
		const persistTo = "/tmp/cyrus-e2e-wrangler-abc";
		expect(buildD1MigrateLocalArgs(persistTo)).toEqual([
			WRANGLER_PACKAGE,
			"d1",
			"migrations",
			"apply",
			"cyrus",
			"--local",
			"--persist-to",
			persistTo,
			"--config",
			"wrangler.json",
		]);
	});

	test("requireWranglerPersistTo reads the run-scoped env var", () => {
		const previous = process.env[WRANGLER_PERSIST_TO_ENV];
		process.env[WRANGLER_PERSIST_TO_ENV] = "/tmp/cyrus-e2e-wrangler-xyz";
		try {
			expect(requireWranglerPersistTo()).toBe("/tmp/cyrus-e2e-wrangler-xyz");
		} finally {
			if (previous === undefined) {
				delete process.env[WRANGLER_PERSIST_TO_ENV];
			} else {
				process.env[WRANGLER_PERSIST_TO_ENV] = previous;
			}
		}
	});

	test("requireWranglerPersistTo rejects a missing persist directory", () => {
		const previous = process.env[WRANGLER_PERSIST_TO_ENV];
		delete process.env[WRANGLER_PERSIST_TO_ENV];
		try {
			expect(() => requireWranglerPersistTo()).toThrow(MISSING_PERSIST_TO);
		} finally {
			if (previous === undefined) {
				delete process.env[WRANGLER_PERSIST_TO_ENV];
			} else {
				process.env[WRANGLER_PERSIST_TO_ENV] = previous;
			}
		}
	});
});
