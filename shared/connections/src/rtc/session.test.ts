import { describe, expect, test } from "bun:test";
import { normalizeHost } from "./session";

describe("normalizeHost", () => {
	test("parses https urls as wss", () => {
		expect(normalizeHost("https://cyrus.example.com")).toEqual({
			host: "cyrus.example.com",
			protocol: "wss",
		});
	});

	test("parses http urls as ws", () => {
		expect(normalizeHost("http://localhost:8787")).toEqual({
			host: "localhost:8787",
			protocol: "ws",
		});
	});

	test("defaults bare hosts to ws", () => {
		expect(normalizeHost("localhost:8787")).toEqual({
			host: "localhost:8787",
			protocol: "ws",
		});
	});

	test("parses wss urls as wss", () => {
		expect(normalizeHost("wss://cyrus.example.com")).toEqual({
			host: "cyrus.example.com",
			protocol: "wss",
		});
	});

	test("parses ws urls as ws", () => {
		expect(normalizeHost("ws://localhost:8787")).toEqual({
			host: "localhost:8787",
			protocol: "ws",
		});
	});
});
