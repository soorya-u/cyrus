import {
	ArchiveIcon,
	BotIcon,
	GitBranchIcon,
	KeyboardIcon,
	Link2Icon,
	Settings2Icon,
} from "lucide-react";
import type { ComponentType } from "react";
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

export type SettingsSectionId =
	| "general"
	| "keybindings"
	| "providers"
	| "source-control"
	| "connections"
	| "archived";

export const SETTINGS_NAV_ITEMS: ReadonlyArray<{
	label: string;
	id: SettingsSectionId;
	icon: ComponentType<{ className?: string }>;
}> = [
	{ label: "General", id: "general", icon: Settings2Icon },
	{ label: "Keybindings", id: "keybindings", icon: KeyboardIcon },
	{ label: "Providers", id: "providers", icon: BotIcon },
	{ label: "Source Control", id: "source-control", icon: GitBranchIcon },
	{ label: "Connections", id: "connections", icon: Link2Icon },
	{ label: "Archive", id: "archived", icon: ArchiveIcon },
];

type SettingsNavMenuProps = {
	activeSection: SettingsSectionId;
	onSelect: (section: SettingsSectionId) => void;
};

export function SettingsNavMenu({
	activeSection,
	onSelect,
}: SettingsNavMenuProps) {
	return (
		<SidebarGroup className="px-2 py-3">
			<SidebarMenu>
				{SETTINGS_NAV_ITEMS.map((item) => {
					const Icon = item.icon;
					const isActive = activeSection === item.id;
					return (
						<SidebarMenuItem key={item.id}>
							<SidebarMenuButton
								className={
									isActive
										? "gap-2.5 px-2.5 py-2 text-left font-medium text-[13px] text-foreground"
										: "gap-2.5 px-2.5 py-2 text-left text-[13px] text-muted-foreground/70 hover:text-foreground/80"
								}
								isActive={isActive}
								onClick={() => onSelect(item.id)}
								size="sm"
							>
								<Icon
									className={
										isActive
											? "size-4 shrink-0 text-foreground"
											: "size-4 shrink-0 text-muted-foreground/60"
									}
								/>
								<span className="truncate">{item.label}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
