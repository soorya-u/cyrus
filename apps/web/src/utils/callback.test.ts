import { describe, expect, test } from "vitest";
import {
	buildDeviceCallbackPath,
	normalizeCallbackPath,
	resolvePostSignInRedirect,
} from "./callback";

describe("callback helpers", () => {
	test("resolves callbackUrl redirect on sign-in success", () => {
		expect(
			resolvePostSignInRedirect("?callbackUrl=%2Fworkers", "/fallback")
		).toBe("/workers");
		expect(
			resolvePostSignInRedirect(
				"?callbackUrl=https://evil.example/path",
				"/fallback"
			)
		).toBe("/fallback");
	});

	test("builds signed-out /auth/device callback with user code preserved", () => {
		expect(buildDeviceCallbackPath(undefined)).toBe("/auth/device");
		expect(buildDeviceCallbackPath("ab12-cd34")).toBe(
			"/auth/device?user_code=AB12CD34"
		);
	});

	test("accepts only internal callback paths", () => {
		expect(normalizeCallbackPath("/workers")).toBe("/workers");
		expect(normalizeCallbackPath("//evil.example")).toBeNull();
		expect(normalizeCallbackPath("/\\evil.example")).toBeNull();
		expect(normalizeCallbackPath("https://evil.example/path")).toBeNull();
	});
});
