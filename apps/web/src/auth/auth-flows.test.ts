import { describe, expect, test } from "vitest";
import { shouldShowEmailAndPassword } from "@/components/auth/sign-in";
import { normalizeCallbackPath } from "./callback-url";
import { buildDeviceCallbackPath } from "./device-callback";
import { resolvePostSignInRedirect } from "./post-sign-in-redirect";

describe("auth route flow helpers", () => {
	test("hides email+password when VITE_IS_DEV_MODE is false", () => {
		expect(shouldShowEmailAndPassword(false, true)).toBe(false);
		expect(shouldShowEmailAndPassword(true, true)).toBe(true);
		expect(shouldShowEmailAndPassword(true, false)).toBe(false);
	});

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
		expect(normalizeCallbackPath("https://evil.example/path")).toBeNull();
	});
});
