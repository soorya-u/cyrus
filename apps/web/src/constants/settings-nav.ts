import {
	ArchiveIcon,
	BotIcon,
	GitBranchIcon,
	KeyboardIcon,
	Link2Icon,
	Settings2Icon,
	UserRoundIcon,
} from "lucide-react";
import type { ComponentType } from "react";

export type SettingsSectionId =
	| "general"
	| "accounts"
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
	enabled?: boolean;
}> = [
	{
		label: "General",
		id: "general",
		icon: Settings2Icon,
		path: "/settings",
	},
	{
		label: "Accounts",
		id: "accounts",
		icon: UserRoundIcon,
		path: "/settings/accounts",
	},
	{
		label: "Keybindings",
		id: "keybindings",
		icon: KeyboardIcon,
		path: "/settings/keybindings",
		enabled: false,
	},
	{
		label: "Providers",
		id: "providers",
		icon: BotIcon,
		path: "/settings/providers",
		enabled: false,
	},
	{
		label: "Source Control",
		id: "source-control",
		icon: GitBranchIcon,
		path: "/settings/source-control",
		enabled: false,
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
		enabled: false,
	},
];
