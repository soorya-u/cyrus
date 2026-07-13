import { describe, expect, test } from "bun:test";
import {
	notFound,
	persistFailed,
	RepositoryDatabaseError,
	RepositoryNotFoundError,
	RepositoryPersistFailedError,
} from "@cyrus/errors/repository";
import { DrizzleQueryError } from "drizzle-orm";
import { z } from "zod";
import {
	fromDrizzleFailure,
	fromRepoFailure,
	fromZodFailure,
	repo,
} from "./repo";

describe("fromRepoFailure", () => {
	test("passes through repository errors", () => {
		const error = notFound("thread", "abc");
		expect(fromRepoFailure(error)).toBe(error);
	});

	test("maps drizzle failures", () => {
		const mapped = fromRepoFailure(
			new DrizzleQueryError("SELECT 1", [], new Error("connection lost"))
		);
		expect(RepositoryDatabaseError.is(mapped)).toBe(true);
		if (!RepositoryDatabaseError.is(mapped)) return;
		expect(mapped.message).toBe("Database operation failed");
		expect(mapped.detail).toContain("connection lost");
	});

	test("maps zod failures", () => {
		const cause = z.object({ id: z.string().uuid() }).safeParse({ id: "bad" });
		if (cause.success) throw new Error("expected zod failure");
		const mapped = fromRepoFailure(cause.error);
		expect(RepositoryDatabaseError.is(mapped)).toBe(true);
		if (!RepositoryDatabaseError.is(mapped)) return;
		expect(mapped.message).toBe("Invalid data");
		expect(mapped.detail).toBeDefined();
	});
});

describe("fromDrizzleFailure", () => {
	test("uses query and cause in detail", () => {
		const mapped = fromDrizzleFailure(
			new DrizzleQueryError("SELECT 1", [], new Error("connection lost"))
		);
		expect(RepositoryDatabaseError.is(mapped)).toBe(true);
		if (!RepositoryDatabaseError.is(mapped)) return;
		expect(mapped.message).toBe("Database operation failed");
		expect(mapped.detail).toBe("SELECT 1 — connection lost");
	});
});

describe("fromZodFailure", () => {
	test("keeps validation detail separate from user message", () => {
		const cause = z.object({ id: z.string().uuid() }).safeParse({ id: "bad" });
		if (cause.success) throw new Error("expected zod failure");
		const mapped = fromZodFailure(cause.error);
		expect(RepositoryDatabaseError.is(mapped)).toBe(true);
		if (!RepositoryDatabaseError.is(mapped)) return;
		expect(mapped.message).toBe("Invalid data");
		expect(mapped.detail).toBe(cause.error.message);
	});
});

describe("repo", () => {
	test("passes through repository not found errors", async () => {
		const result = await repo(() => {
			throw notFound("thread", "abc");
		})();
		expect(result.isErr()).toBe(true);
		if (result.isOk()) return;
		expect(RepositoryNotFoundError.is(result.error)).toBe(true);
	});

	test("passes through persist failed errors", async () => {
		const result = await repo(() => {
			throw persistFailed("insert returned no row");
		})();
		expect(result.isErr()).toBe(true);
		if (result.isOk()) return;
		expect(RepositoryPersistFailedError.is(result.error)).toBe(true);
	});

	test("maps drizzle query errors from cause", async () => {
		const result = await repo(() => {
			throw new DrizzleQueryError("SELECT 1", [], new Error("connection lost"));
		})();
		expect(result.isErr()).toBe(true);
		if (result.isOk()) return;
		expect(RepositoryDatabaseError.is(result.error)).toBe(true);
		if (!RepositoryDatabaseError.is(result.error)) return;
		expect(result.error.message).toBe("Database operation failed");
		expect(result.error.detail).toContain("connection lost");
	});

	test("maps zod validation errors", async () => {
		const result = await repo(() =>
			Promise.resolve().then(() => {
				z.object({ id: z.string().uuid() }).parse({ id: "not-a-uuid" });
			})
		)();
		expect(result.isErr()).toBe(true);
		if (result.isOk()) return;
		expect(RepositoryDatabaseError.is(result.error)).toBe(true);
		expect(result.error.message).toBe("Invalid data");
	});
});
