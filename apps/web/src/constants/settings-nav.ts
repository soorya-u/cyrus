import {
	ArchiveIcon,
	BotIcon,
	GitBranchIcon,
	KeyboardIcon,
	Link2Icon,
	Settings2Icon,
} from "lucide-react";
import type { ComponentType } from "react";

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
	path: string;
}> = [
	{ label: "General", id: "general", icon: Settings2Icon, path: "/settings" },
	{
		label: "Keybindings",
		id: "keybindings",
		icon: KeyboardIcon,
		path: "/settings/keybindings",
	},
	{
		label: "Providers",
		id: "providers",
		icon: BotIcon,
		path: "/settings/providers",
	},
	{
		label: "Source Control",
		id: "source-control",
		icon: GitBranchIcon,
		path: "/settings/source-control",
	},
	{
		label: "Connections",
		id: "connections",
		icon: Link2Icon,
		path: "/settings/connections",
	},
	{
		label: "Archive",
		id: "archived",
		icon: ArchiveIcon,
		path: "/settings/archived",
	},
];
