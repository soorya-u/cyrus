import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { LinkedAccount } from "./linked-account";

const linkSocialMock = vi.fn();
const unlinkAccountMock = vi.fn();

vi.mock("@better-auth-ui/core", () => ({
	getProviderName: () => "GitHub",
}));

vi.mock("@better-auth-ui/react", () => ({
	providerIcons: {},
	useAccountInfo: () => ({ data: null, isPending: false }),
	useAuth: () => ({
		authClient: {},
		baseURL: "http://localhost:5173",
		localization: {
			settings: {
				link: "Link",
				linkProvider: "Link {{provider}}",
				unlinkProvider: "Unlink {{provider}}",
				accountUnlinked: "Account unlinked",
			},
		},
	}),
	useLinkSocial: () => ({
		mutate: linkSocialMock,
		isPending: false,
	}),
	useUnlinkAccount: () => ({
		mutate: unlinkAccountMock,
		isPending: false,
	}),
}));

describe("LinkedAccount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("calls unlink for linked providers", async () => {
		const user = userEvent.setup();
		render(
			<LinkedAccount
				account={
					{ id: "a1", providerId: "github", accountId: "acct-1" } as never
				}
				provider="github"
			/>
		);

		await user.click(screen.getByRole("button", { name: "Unlink GitHub" }));

		expect(unlinkAccountMock).toHaveBeenCalledWith({
			providerId: "github",
			accountId: "acct-1",
		});
	});

	test("calls link for unlinked providers", async () => {
		const user = userEvent.setup();
		render(<LinkedAccount provider="github" />);

		await user.click(screen.getByRole("button", { name: "Link GitHub" }));

		expect(linkSocialMock).toHaveBeenCalledWith({
			provider: "github",
			callbackURL: "http://localhost:5173/",
		});
	});
});
