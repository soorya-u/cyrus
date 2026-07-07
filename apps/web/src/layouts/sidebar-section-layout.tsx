import type { ReactNode } from "react";
import { ChatSidebarFooterActions } from "@/components/sidebar/chat-sidebar-footer-actions";
import { ChatSidebarHeader } from "@/components/sidebar/chat-sidebar-header";
import {
	SidebarContent,
	SidebarFooter,
	SidebarMenu,
} from "@/components/ui/sidebar";

type SidebarSectionLayoutProps = {
	children: ReactNode;
	footerAction: ReactNode;
};

export function SidebarSectionLayout({
	children,
	footerAction,
}: SidebarSectionLayoutProps) {
	return (
		<>
			<ChatSidebarHeader />
			<SidebarContent className="overflow-x-hidden">{children}</SidebarContent>
			<SidebarFooter className="p-2">
				<SidebarMenu>
					<ChatSidebarFooterActions />
					{footerAction}
				</SidebarMenu>
			</SidebarFooter>
		</>
	);
}
