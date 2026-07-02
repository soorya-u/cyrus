import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChatSidebarLayout } from "@/components/chat/chat-sidebar-layout";
import { WorkersSidebar } from "@/components/chat/sidebar/workers-sidebar";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { MockThreadsProvider } from "@/mocks/mock-threads-provider";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_workspace")({
	component: WorkspaceLayout,
});

function useIsSettingsRoute(): boolean {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	return pathname.startsWith("/settings");
}

function WorkspaceMainInset({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<SidebarInset
			className={cn(
				"h-svh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground md:h-dvh",
				className
			)}
		>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
		</SidebarInset>
	);
}

function WorkspaceLayout() {
	const isSettings = useIsSettingsRoute();

	return (
		<MockThreadsProvider>
			<ChatSidebarLayout
				sidebar={isSettings ? <SettingsSidebar /> : <WorkersSidebar />}
			>
				<WorkspaceMainInset>
					<Outlet />
				</WorkspaceMainInset>
			</ChatSidebarLayout>
		</MockThreadsProvider>
	);
}
