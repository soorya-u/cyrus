import type { DeviceState } from "@cyrus/schemas/signaling";
import { describe, expect, test } from "vitest";
import { checkPeerVersion as check } from "./signaling";

const minimums = { controller: "0.2.0", worker: "0.3.0" };
const checkPeerVersion = (state: DeviceState) => check(state, minimums);

describe("checkPeerVersion", () => {
	test("admits a peer at or above the minimum for its role", () => {
		expect(
			checkPeerVersion({ name: "w", role: "worker", version: "0.3.0" }).isOk()
		).toBe(true);
		expect(
			checkPeerVersion({
				name: "c",
				role: "controller",
				version: "1.0.0",
			}).isOk()
		).toBe(true);
	});

	test("applies the minimum of the declared role, not the other one", () => {
		expect(
			checkPeerVersion({
				name: "c",
				role: "controller",
				version: "0.2.5",
			}).isOk()
		).toBe(true);
		expect(
			checkPeerVersion({ name: "w", role: "worker", version: "0.2.5" }).isErr()
		).toBe(true);
	});

	test("reports who is outdated and what the minimum is", () => {
		const result = checkPeerVersion({
			name: "w",
			role: "worker",
			version: "0.2.9",
		});
		expect(result.isErr() && result.error).toMatchObject({
			_tag: "connection.upgrade_required",
			declared: "0.2.9",
			minimum: "0.3.0",
			role: "worker",
		});
	});

	test("admits a prerelease whose core version meets the minimum", () => {
		expect(
			checkPeerVersion({
				name: "w",
				role: "worker",
				version: "0.3.0-rc.1",
			}).isOk()
		).toBe(true);
	});
});
