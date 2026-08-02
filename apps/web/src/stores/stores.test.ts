import { describe, expect, test } from "vitest";
import { PATCH_DIFF_OPTIONS } from "@/components/chat/diff/patch-diff-options";
import { useChatUiStore } from "@/stores/chat-ui";
import { useProjectOrderStore } from "@/stores/project-order";
import { useTwoFactorMethodsStore } from "@/stores/two-factor-methods";

describe("chat ui store", () => {
	test("toggles diff panel state", () => {
		useChatUiStore.setState({ diffOpen: false });
		useChatUiStore.getState().toggleDiffOpen();
		expect(useChatUiStore.getState().diffOpen).toBe(true);
	});
});

describe("project order store", () => {
	test("replaces and sorts project order", () => {
		useProjectOrderStore.setState({ projectOrder: [] });
		useProjectOrderStore.getState().setProjectOrder(["b", "a"]);
		expect(useProjectOrderStore.getState().projectOrder).toEqual(["b", "a"]);
	});
});

describe("two-factor methods store", () => {
	test("stores, reads, and clears enabled methods", () => {
		const store = useTwoFactorMethodsStore.getState();
		store.clearMethods();
		expect(store.getMethods()).toEqual(["totp", "otp"]);

		store.setMethods(["totp"]);
		expect(useTwoFactorMethodsStore.getState().getMethods()).toEqual(["totp"]);

		useTwoFactorMethodsStore.getState().clearMethods();
		expect(useTwoFactorMethodsStore.getState().getMethods()).toEqual([
			"totp",
			"otp",
		]);
	});
});

describe("patch diff options", () => {
	test("uses unified dark diff defaults", () => {
		expect(PATCH_DIFF_OPTIONS).toEqual(
			expect.objectContaining({
				diffStyle: "unified",
				theme: "github-dark",
				stickyHeader: true,
			})
		);
	});
});
