import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ActiveSessions } from "./active-sessions";

const revokeSessionMock = vi.fn();
const WORKERS_HEADING = /Workers/;

let listSessionsData: unknown[] = [];

vi.mock("@better-auth-ui/react", () => ({
	useAuth: () => ({
		authClient: {},
		basePaths: { auth: "/auth" },
		viewPaths: { auth: { signOut: "sign-out" } },
		navigate: vi.fn(),
		localization: {
			auth: { signOut: "Sign out" },
			settings: {
				activeSessions: "Active sessions",
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
	useListSessions: () => ({ data: listSessionsData, isPending: false }),
}));

describe("ActiveSessions", () => {
	test("splits sessions into a Controllers section and a Workers section with a count", () => {
		listSessionsData = [
			{
				id: "session-1",
				token: "current-token",
				userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
				createdAt: new Date(),
				workerName: null,
			},
			{
				id: "session-2",
				token: "worker-token-1",
				userAgent: "",
				createdAt: new Date(),
				workerName: "sooryas-macbook",
			},
			{
				id: "session-3",
				token: "worker-token-2",
				userAgent: "",
				createdAt: new Date(),
				workerName: "office-desktop",
			},
		];

		render(<ActiveSessions />);

		expect(screen.getByText("Controllers")).toBeInTheDocument();
		expect(screen.getByText(WORKERS_HEADING)).toHaveTextContent("Workers (2)");
		expect(screen.getByText("sooryas-macbook")).toBeInTheDocument();
		expect(screen.getByText("office-desktop")).toBeInTheDocument();
	});

	test("omits the Workers section entirely when there are no worker sessions", () => {
		listSessionsData = [
			{
				id: "session-1",
				token: "current-token",
				userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
				createdAt: new Date(),
				workerName: null,
			},
		];

		render(<ActiveSessions />);

		expect(screen.getByText("Controllers")).toBeInTheDocument();
		expect(screen.queryByText(WORKERS_HEADING)).not.toBeInTheDocument();
	});
});
