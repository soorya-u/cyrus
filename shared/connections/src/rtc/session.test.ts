import { UPGRADE_REQUIRED_CODE } from "@cyrus/errors/connection";
import { ORPCError } from "@orpc/client";
import { describe, expect, test } from "vitest";
import { normalizeHost, signalingSubscribeError } from "./session";

describe("normalizeHost", () => {
	test("parses https urls as wss", () => {
		expect(normalizeHost("https://cyrus.example.com").unwrap()).toEqual({
			host: "cyrus.example.com",
			protocol: "wss",
		});
	});

	test("parses http urls as ws", () => {
		expect(normalizeHost("http://localhost:8787").unwrap()).toEqual({
			host: "localhost:8787",
			protocol: "ws",
		});
	});

	test("defaults bare hosts to ws", () => {
		expect(normalizeHost("localhost:8787").unwrap()).toEqual({
			host: "localhost:8787",
			protocol: "ws",
		});
	});

	test("parses wss urls as wss", () => {
		expect(normalizeHost("wss://cyrus.example.com").unwrap()).toEqual({
			host: "cyrus.example.com",
			protocol: "wss",
		});
	});

	test("parses ws urls as ws", () => {
		expect(normalizeHost("ws://localhost:8787").unwrap()).toEqual({
			host: "localhost:8787",
			protocol: "ws",
		});
	});

	test("returns invalid host for malformed urls", () => {
		const result = normalizeHost("://bad");
		expect(result.isErr()).toBe(true);
		if (result.isOk()) return;
		expect(result.error._tag).toBe("connection.invalid_host");
	});
});

describe("signalingSubscribeError", () => {
	test("maps the server's upgrade-required rejection to a typed error", () => {
		const error = signalingSubscribeError(
			new ORPCError(UPGRADE_REQUIRED_CODE, {
				status: 426,
				message: "too old",
				data: { declared: "0.1.0", minimum: "0.2.0", role: "worker" },
			})
		);

		expect(error).toMatchObject({
			_tag: "connection.upgrade_required",
			declared: "0.1.0",
			minimum: "0.2.0",
			role: "worker",
		});
	});

	test("treats an upgrade rejection without its details as a plain failure", () => {
		const error = signalingSubscribeError(
			new ORPCError(UPGRADE_REQUIRED_CODE, { status: 426, data: {} })
		);

		expect(error._tag).toBe("connection.signaling_failed");
	});

	test("maps any other failure to a signaling failure", () => {
		expect(signalingSubscribeError(new Error("boom"))._tag).toBe(
			"connection.signaling_failed"
		);
	});
});
