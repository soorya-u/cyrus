import { describe, expect, test } from "vitest";
import { shouldShowEmailAndPassword } from "./sign-in";

describe("SignIn", () => {
	test("hides email+password when VITE_IS_DEV_MODE is false", () => {
		expect(shouldShowEmailAndPassword(false, true)).toBe(false);
		expect(shouldShowEmailAndPassword(true, true)).toBe(true);
		expect(shouldShowEmailAndPassword(true, false)).toBe(false);
	});
});
