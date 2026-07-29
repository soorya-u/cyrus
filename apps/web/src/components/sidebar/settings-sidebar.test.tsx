import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { SettingsSidebar } from "@/components/sidebar/settings-sidebar";

vi.mock("@tanstack/react-router", () => ({
	Link: () => null,
	useNavigate: () => vi.fn(),
	useRouterState: () => "/settings",
}));

vi.mock("@/components/ui/sidebar", () => ({
	SidebarGroup: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	SidebarMenu: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
	SidebarMenuButton: ({ children }: { children: ReactNode }) => (
		<button type="button">{children}</button>
	),
	SidebarMenuItem: ({ children }: { children: ReactNode }) => (
		<li>{children}</li>
	),
	useSidebar: () => ({ isMobile: false, setOpenMobile: vi.fn() }),
}));

vi.mock("@/layouts/sidebar-section-layout", () => ({
	SidebarSectionLayout: ({ children }: { children: ReactNode }) => (
		<section>{children}</section>
	),
}));

vi.mock("@/stores/worker", () => ({
	useWorkerStore: () => undefined,
}));

describe("SettingsSidebar", () => {
	test("shows only enabled settings navigation items", () => {
		render(<SettingsSidebar />);

		expect(screen.getByText("General")).toBeInTheDocument();
		expect(screen.getByText("Accounts")).toBeInTheDocument();
		expect(screen.getByText("Connections")).toBeInTheDocument();

		expect(screen.queryByText("Providers")).not.toBeInTheDocument();
		expect(screen.queryByText("Source Control")).not.toBeInTheDocument();
		expect(screen.queryByText("Archive")).not.toBeInTheDocument();
		expect(screen.queryByText("Keybindings")).not.toBeInTheDocument();
	});
});
