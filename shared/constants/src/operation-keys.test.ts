import { describe, expect, test } from "bun:test";
import {
	AUTH_OPERATION_KEYS,
	RTC_OPERATION_KEYS,
	SIGNALING_OPERATION_KEYS,
} from "./operation-keys";

describe("operation keys", () => {
	test("builds stable signaling keys", () => {
		expect(SIGNALING_OPERATION_KEYS.connection("user-1")).toEqual([
			"signaling",
			"user-1",
		]);
		expect(SIGNALING_OPERATION_KEYS.listPeers).toEqual([
			"signaling",
			"list-peers",
		]);
	});

	test("builds stable RTC keys", () => {
		expect(RTC_OPERATION_KEYS.connection("worker-1")).toEqual([
			"controller",
			"worker-1",
		]);
		expect(RTC_OPERATION_KEYS.listThreads("project-1")).toEqual([
			"controller",
			"list-threads",
			"project-1",
		]);
		expect(RTC_OPERATION_KEYS.listDir("/tmp/cyrus", 2)).toEqual([
			"controller",
			"list-dir",
			"/tmp/cyrus",
			2,
		]);
	});

	test("keeps auth keys stable", () => {
		expect(AUTH_OPERATION_KEYS.deviceDecide).toEqual([
			"auth",
			"device",
			"decide",
		]);
	});
});
