import type { ReactNode } from "react";
import {
	Sidebar,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

const THREAD_SIDEBAR_WIDTH_STORAGE_KEY = "chat_thread_sidebar_width";
const THREAD_SIDEBAR_MIN_WIDTH = 13 * 16;
const THREAD_MAIN_CONTENT_MIN_WIDTH = 40 * 16;

function SidebarControl() {
	return (
		<div
			className="pointer-events-none fixed top-[var(--workspace-controls-top)] left-[var(--workspace-controls-left)] z-50 flex h-[var(--workspace-topbar-height)] items-center"
			data-sidebar-control=""
		>
			<Tooltip>
				<TooltipTrigger
					render={
						<SidebarTrigger
							aria-label="Toggle main sidebar"
							className="pointer-events-auto"
						/>
					}
				/>
				<TooltipPopup side="bottom">Toggle main sidebar</TooltipPopup>
			</Tooltip>
		</div>
	);
}

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
					storageKey: THREAD_SIDEBAR_WIDTH_STORAGE_KEY,
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
