import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ActiveSession } from "./active-session";

const navigateMock = vi.fn();
const revokeSessionMock = vi.fn();

vi.mock("@better-auth-ui/react", () => ({
	useAuth: () => ({
		authClient: {},
		basePaths: { auth: "/auth" },
		viewPaths: { auth: { signOut: "sign-out" } },
		navigate: navigateMock,
		localization: {
			auth: { signOut: "Sign out" },
			settings: {
				currentSession: "Current session",
				revoke: "Revoke",
				revokeSession: "Revoke session",
				revokeSessionSuccess: "Session revoked",
			},
		},
	}),
	useSession: () => ({ data: { session: { token: "current-token" } } }),
	useRevokeSession: () => ({
		mutate: revokeSessionMock,
		isPending: false,
	}),
}));

describe("ActiveSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("revokes non-current sessions", async () => {
		const user = userEvent.setup();
		const session = {
			id: "session-2",
			token: "other-token",
			userAgent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			createdAt: new Date(Date.now() - 60_000),
		};

		render(<ActiveSession activeSession={session as never} />);
		await user.click(screen.getByRole("button", { name: "Revoke session" }));

		expect(revokeSessionMock).toHaveBeenCalledWith(session);
		expect(navigateMock).not.toHaveBeenCalled();
	});

	test("navigates to sign-out for current session", async () => {
		const user = userEvent.setup();
		render(
			<ActiveSession
				activeSession={
					{
						id: "session-1",
						token: "current-token",
						userAgent:
							"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
						createdAt: new Date(),
					} as never
				}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Sign out" }));
		expect(navigateMock).toHaveBeenCalledWith({ to: "/auth/sign-out" });
		expect(revokeSessionMock).not.toHaveBeenCalled();
	});
});
