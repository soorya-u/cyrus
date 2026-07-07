import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

export function SidebarControl() {
	return (
		<div
			className="pointer-events-none fixed top-(--workspace-controls-top) left-(--workspace-controls-left) z-50 flex h-(--workspace-topbar-height) items-center"
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
