import type { ReactNode } from "react";
import { SidebarControl } from "@/components/sidebar/sidebar-control";
import { Sidebar, SidebarProvider, SidebarRail } from "@/components/ui/sidebar";
import { SIDEBAR_WIDTH } from "@/constants/storage-keys";

const THREAD_SIDEBAR_MIN_WIDTH = 13 * 16;
const THREAD_MAIN_CONTENT_MIN_WIDTH = 40 * 16;

type ChatSidebarLayoutProps = {
	sidebar: ReactNode;
	children: ReactNode;
};

export function ChatSidebarLayout({
	sidebar,
	children,
}: ChatSidebarLayoutProps) {
	return (
		<SidebarProvider className="h-dvh! min-h-0!" defaultOpen>
			<Sidebar
				className="border-border border-r bg-card text-foreground"
				collapsible="offcanvas"
				resizable={{
					minWidth: THREAD_SIDEBAR_MIN_WIDTH,
					shouldAcceptWidth: ({ nextWidth, wrapper }) =>
						wrapper.clientWidth - nextWidth >= THREAD_MAIN_CONTENT_MIN_WIDTH,
					storageKey: SIDEBAR_WIDTH,
				}}
				side="left"
			>
				<SidebarRail />
				{sidebar}
			</Sidebar>
			{children}
			<SidebarControl />
		</SidebarProvider>
	);
}
